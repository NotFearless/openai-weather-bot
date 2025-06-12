// pages/api/chat.js - Fixed with proper emoji encoding
import { generateWeatherResponse, generateEnhancedWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast, getNWSAlerts, getCompleteWeatherData, searchLocation, extractLocationFromMessage } from '../../lib/weather';
import { generateEducationalWeatherResponse } from '../../lib/weatherEducation';

// Set proper content type for UTF-8 encoding
export const config = {
  api: {
    responseLimit: false,
  },
}

// Safe emoji constants
const EMOJIS = {
  sunny: '☀️',
  rain: '🌧️',
  storm: '⛈️',
  snow: '❄️',
  warning: '⚠️',
  location: '📍',
  star: '⭐',
  books: '📚',
  radar: '📡',
  check: '✅',
  arrow: '➡️'
};

export default async function handler(req, res) {
  // Set proper headers for UTF-8 encoding
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, location, conversationHistory, includeImages = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Processing message:', message);

    // Initialize response data
    let weatherData = null;
    let locationData = null;
    let searchedLocation = null;
    let educationalResponse = null;

    // Step 1: Check if this is an educational weather query FIRST
    try {
      if (includeImages) {
        educationalResponse = await generateEducationalWeatherResponse(
          message, 
          null, // Pass null initially, will be filled later if needed
          conversationHistory, 
          location
        );
        console.log('Educational response:', educationalResponse?.isEducational);
      }
    } catch (error) {
      console.error('Educational response error:', error);
      // Continue processing even if educational fails
    }

    // Step 2: Check if user is asking about a specific location
    const locationFromMessage = extractLocationFromMessage(message);
    
    if (locationFromMessage) {
      console.log(`Extracted location from message: ${locationFromMessage}`);
      
      try {
        // Search for the mentioned location
        const searchResult = await searchLocation(locationFromMessage);
        if (searchResult.success && searchResult.data.length > 0) {
          locationData = searchResult.data[0]; // Use the best match
          searchedLocation = locationFromMessage;
          console.log(`Found location: ${locationData.displayName}`);
        } else {
          console.log(`Could not find location: ${locationFromMessage}`);
        }
      } catch (error) {
        console.error('Location search error:', error);
        // Continue with user's current location
      }
    }

    // Step 3: Use the found location or fallback to user's current location
    const targetLocation = locationData || location;

    // Step 4: Determine what weather data we need based on the query
    const needsWeatherData = /\b(weather|temperature|temp|rain|snow|wind|humidity|forecast|alert|warning|storm|cloudy|sunny|conditions)\b/i.test(message);
    
    if (needsWeatherData && targetLocation?.lat && targetLocation?.lon) {
      console.log('Fetching weather data for:', targetLocation);
      
      try {
        // Check what type of data the user is asking for
        const needsAlerts = /\b(watch|warning|alert|advisory|severe|storm|tornado|hurricane|flood|emergency)\b/i.test(message);
        const needsForecast = /\b(forecast|tomorrow|week|days|upcoming|future)\b/i.test(message);
        const needsCurrent = /\b(now|current|today|right now|currently)\b/i.test(message) || (!needsAlerts && !needsForecast);

        console.log(`Data needs - Alerts: ${needsAlerts}, Forecast: ${needsForecast}, Current: ${needsCurrent}`);

        // Fetch appropriate weather data
        if (needsAlerts) {
          console.log('Fetching weather data with alerts...');
          const completeData = await getCompleteWeatherData(targetLocation.lat, targetLocation.lon, true);
          if (completeData.success) {
            weatherData = {
              ...completeData.data,
              requestType: 'alerts',
              searchedLocation: searchedLocation,
              locationUsed: locationData ? locationData.displayName : 'current location'
            };
            console.log('Weather data with alerts fetched successfully');
          }
        } else if (needsForecast && needsCurrent) {
          console.log('Fetching current and forecast data...');
          const [currentWeather, forecast] = await Promise.all([
            getCurrentWeather(targetLocation.lat, targetLocation.lon),
            getWeatherForecast(targetLocation.lat, targetLocation.lon)
          ]);

          weatherData = {
            current: currentWeather.success ? currentWeather.data : null,
            forecast: forecast.success ? forecast.data : null,
            requestType: 'current+forecast',
            searchedLocation: searchedLocation,
            locationUsed: locationData ? locationData.displayName : 'current location'
          };
          console.log('Current and forecast data fetched successfully');
        } else if (needsForecast) {
          console.log('Fetching forecast data...');
          const forecast = await getWeatherForecast(targetLocation.lat, targetLocation.lon);
          weatherData = {
            forecast: forecast.success ? forecast.data : null,
            requestType: 'forecast',
            searchedLocation: searchedLocation,
            locationUsed: locationData ? locationData.displayName : 'current location'
          };
          console.log('Forecast data fetched successfully');
        } else {
          console.log('Fetching current weather data...');
          const currentWeather = await getCurrentWeather(targetLocation.lat, targetLocation.lon);
          weatherData = {
            current: currentWeather.success ? currentWeather.data : null,
            requestType: 'current',
            searchedLocation: searchedLocation,
            locationUsed: locationData ? locationData.displayName : 'current location'
          };
          console.log('Current weather data fetched successfully');
        }
      } catch (weatherError) {
        console.error('Weather API failed:', weatherError.message);
        weatherData = {
          error: 'Weather data temporarily unavailable',
          searchedLocation: searchedLocation,
          locationUsed: locationData ? locationData.displayName : 'current location'
        };
      }
    } else if (needsWeatherData && !targetLocation) {
      console.log('Weather requested but no location available');
      weatherData = {
        error: 'Location not available for weather data',
        needsLocation: true
      };
    }

    // Step 5: Build enhanced context for AI
    const enhancedContext = {
      ...weatherData,
      userMessage: message,
      hasLocationSwitch: !!locationData,
      originalLocation: location,
      targetLocation: targetLocation,
      // Add educational context
      isEducational: educationalResponse?.isEducational || false,
      educationalTopic: educationalResponse?.topic,
      hasEducationalImages: educationalResponse?.hasImages || false,
      // Add processing status
      dataFetched: !!weatherData,
      processingComplete: true
    };

    console.log('Sending to AI with context:', {
      hasWeatherData: !!weatherData,
      isEducational: enhancedContext.isEducational,
      locationUsed: enhancedContext.locationUsed,
      requestType: weatherData?.requestType
    });

    // Step 6: Generate AI response with all available data
    const aiResponse = await generateWeatherResponse(message, enhancedContext, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback || `I'm having trouble generating a response right now. ${EMOJIS.warning} Please try again in a moment.`
      });
    }

    // Step 7: Process the AI response for better formatting and emoji handling
    let processedResponse = processFriendlyResponse(aiResponse.response, enhancedContext);

    // Step 8: Handle images if requested
    let imageResults = { images: {}, hasImages: false };
    
    if (includeImages) {
      try {
        // Get regular weather images (DALL-E generated)
        const regularImages = await generateEnhancedWeatherResponse(
          message, 
          weatherData, 
          conversationHistory, 
          includeImages
        );

        // Combine with educational images
        const combinedImages = {
          ...regularImages.images,
          ...(educationalResponse?.images || {})
        };

        imageResults = {
          images: combinedImages,
          hasImages: Object.keys(combinedImages).length > 0,
          isEducational: educationalResponse?.isEducational || false,
          educationalTopic: educationalResponse?.topic
        };
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        // Continue without images
      }
    }

    console.log('Response ready, sending to client');

    // Ensure proper UTF-8 encoding in response
    const responseData = {
      response: processedResponse,
      weatherData: enhancedContext,
      images: imageResults.images,
      hasImages: imageResults.hasImages,
      isEducational: imageResults.isEducational,
      educationalTopic: imageResults.educationalTopic,
      locationFound: locationData,
      searchedFor: searchedLocation,
      usage: aiResponse.usage
    };

    // Convert to JSON with proper UTF-8 encoding
    const jsonResponse = JSON.stringify(responseData, null, 0);
    
    return res.status(200).send(jsonResponse);

  } catch (error) {
    console.error('Chat API Error:', error);
    const errorResponse = JSON.stringify({ 
      error: 'Internal server error',
      fallback: `Oops! I'm having some technical difficulties right now. ${EMOJIS.warning} Please try again in just a moment!`
    });
    return res.status(500).send(errorResponse);
  }
}

// Function to post-process AI responses for better readability and emoji handling
function processFriendlyResponse(response, context) {
  let processed = response;

  // Remove any asterisks that might have slipped through
  processed = processed.replace(/\*([^*]+)\*/g, '$1');
  processed = processed.replace(/\*\*/g, '');

  // Remove any "gathering information" type phrases that might have slipped through
  const gatheringPhrases = [
    /let me (?:check|gather|look up|find|get|fetch).*?information/gi,
    /i'll (?:check|gather|look up|find|get|fetch).*?for you/gi,
    /hold on while i.*?/gi,
    /checking.*?data.*?/gi,
    /gathering.*?information.*?/gi,
    /looking up.*?/gi,
    /fetching.*?data.*?/gi
  ];

  gatheringPhrases.forEach(phrase => {
    processed = processed.replace(phrase, '');
  });

  // Fix any broken emojis
  processed = fixBrokenEmojis(processed);

  // Add friendly closings based on context
  if (context.isEducational) {
    const educationalClosings = [
      `\n\n${EMOJIS.books} Keep exploring the fascinating world of weather! Feel free to ask more questions.`,
      `\n\n${EMOJIS.star} Weather science is amazing when you understand it! What else would you like to learn?`,
      `\n\n${EMOJIS.check} Great question! Understanding weather patterns helps you stay safe and informed.`,
      `\n\n${EMOJIS.books} Weather education is so important! Ask me anything else you're curious about.`
    ];
    const randomClosing = educationalClosings[Math.floor(Math.random() * educationalClosings.length)];
    processed += randomClosing;
  } else if (context.current || context.forecast) {
    const weatherClosings = [
      `\n\n${EMOJIS.star} Stay weather-aware and have a great day!`,
      `\n\n${EMOJIS.check} Hope this helps with your weather planning!`,
      `\n\n${EMOJIS.sunny} Anything else you'd like to know about the weather?`,
      `\n\n${EMOJIS.star} Stay safe out there!`
    ];
    const randomClosing = weatherClosings[Math.floor(Math.random() * weatherClosings.length)];
    processed += randomClosing;
  }

  // Add urgency indicators for severe weather
  if (context.alerts && context.alerts.alertCount > 0) {
    processed = `${EMOJIS.warning} WEATHER ALERT ${EMOJIS.warning}\n\n` + processed;
  }

  // Add location context if switched
  if (context.hasLocationSwitch && context.searchedLocation) {
    processed = `${EMOJIS.location} Showing weather for ${context.locationUsed}\n\n` + processed;
  }

  // Handle cases where no weather data was available
  if (context.needsLocation) {
    processed += `\n\n${EMOJIS.location} To get specific weather information, please allow location access or tell me which city you'd like weather for!`;
  }

  // Clean up formatting
  processed = processed.replace(/\n\n\n+/g, '\n\n');
  processed = processed.replace(/\.([A-Z])/g, '. $1');
  processed = processed.trim();

  // Ensure we don't have empty responses
  if (!processed || processed.length < 10) {
    processed = `${EMOJIS.sunny} I'm ready to help with weather information or answer your weather questions! What would you like to know?`;
  }

  return processed;
}

// Function to fix broken emojis (question marks -> proper emojis)
function fixBrokenEmojis(text) {
  const emojiMappings = {
    // Weather emojis
    '☀?': '☀️',  // Sun
    '⛅?': '⛅',  // Partly cloudy
    '☁?': '☁️',  // Cloudy
    '🌧?': '🌧️', // Rain
    '⛈?': '⛈️', // Storm
    '❄?': '❄️',  // Snow
    '🌫?': '🌫️', // Fog
    '💨?': '💨',  // Wind
    '🔥?': '🔥',  // Fire/hot
    '🧊?': '🧊',  // Ice/cold
    '☂?': '☂️',  // Umbrella
    '🌡?': '🌡️', // Thermometer
    
    // Educational emojis
    '📚?': '📚',  // Books
    '🔍?': '🔍',  // Magnifying glass
    '📡?': '📡',  // Radar
    '🛰?': '🛰️', // Satellite
    '🌪?': '🌪️', // Tornado
    '🌀?': '🌀',  // Hurricane
    '⚡?': '⚡',  // Lightning
    
    // Interface emojis
    '⚠?': '⚠️',  // Warning
    '📍?': '📍',  // Location
    '⭐?': '⭐',  // Star
    '✨?': '✨',  // Sparkles
    '✅?': '✅',  // Check
    '❌?': '❌',  // Cross
    '➡?': '➡️',  // Arrow
    
    // General weather
    '🌈?': '🌈',  // Rainbow
    '🌅?': '🌅',  // Sunrise
    '🌇?': '🌇',  // Sunset
    '🌙?': '🌙',  // Moon
    '🌟?': '🌟',  // Star
    
    // Common broken patterns
    '??': '☀️',   // Generic broken emoji -> sun
    '? ': '☀️ ',  // Broken emoji with space
    '?\n': '☀️\n', // Broken emoji with newline
  };

  let fixed = text;
  
  // Apply emoji fixes
  Object.entries(emojiMappings).forEach(([broken, correct]) => {
    const regex = new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\  // Clean up formatting
  processed = processed.replace(/\n\n\n+/g, '\n\n');
  processed = processed.replace(/\.([A-Z])/g, '. $1');'), 'g');
    fixed = fixed.replace(regex, correct);
  });

  // Handle generic question marks that might be broken emojis
  // Look for question marks in typical emoji positions (start of line, after space)
  fixed = fixed.replace(/(\s|^)\?(\s)/g, '$1☀️$2');
  
  return fixed;
}

// Helper function to add contextual emojis based on weather conditions
function addWeatherEmojis(text, weatherData) {
  if (!weatherData?.current) return text;

  const condition = weatherData.current.condition?.toLowerCase() || '';
  const description = weatherData.current.description?.toLowerCase() || '';
  const temp = weatherData.current.temperature || 70;

  let enhanced = text;

  // Add temperature-based emojis
  if (temp > 85) {
    enhanced = enhanced.replace(/\b(hot|warm|heat|toasty)\b/gi, `$1 ${EMOJIS.sunny}`);
  } else if (temp < 32) {
    enhanced = enhanced.replace(/\b(cold|freeze|freezing|ice|chilly)\b/gi, `$1 ❄️`);
  }

  // Add condition-based emojis
  if (condition.includes('rain') || description.includes('rain')) {
    enhanced = enhanced.replace(/\b(rain|shower|drizzle|precipitation)\b/gi, `$1 🌧️`);
  }
  if (condition.includes('snow') || description.includes('snow')) {
    enhanced = enhanced.replace(/\b(snow|blizzard|flurries)\b/gi, `$1 ❄️`);
  }
  if (condition.includes('thunder') || description.includes('thunder')) {
    enhanced = enhanced.replace(/\b(thunder|lightning|storm)\b/gi, `$1 ⛈️`);
  }
  if (condition.includes('wind') || description.includes('wind')) {
    enhanced = enhanced.replace(/\b(wind|windy|gusty|breezy)\b/gi, `$1 💨`);
  }
  if (condition.includes('clear') || description.includes('clear')) {
    enhanced = enhanced.replace(/\b(clear|sunny|sunshine)\b/gi, `$1 ☀️`);
  }
  if (condition.includes('cloud') || description.includes('cloud')) {
    enhanced = enhanced.replace(/\b(cloud|cloudy|overcast)\b/gi, `$1 ☁️`);
  }

  return enhanced;
}