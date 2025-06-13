// pages/api/chat.js - Fixed with proper educational/forecast separation
import { generateWeatherResponse, generateEnhancedWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast, getNWSAlerts, getCompleteWeatherData, searchLocation, extractLocationFromMessage } from '../../lib/weather';
import { generateEducationalWeatherResponse } from '../../lib/weatherEducation';

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
  arrow: '➡️',
  sparkles: '✨',
  tornado: '🌪️',
  hurricane: '🌀',
  lightning: '⚡',
  satellite: '🛰️',
  magnify: '🔍'
};

// SEPARATE EDUCATIONAL PATHWAY - Complete isolation from weather forecasting
async function isEducationalWeatherQuestion(message) {
  const educationalPatterns = [
    // Direct educational questions
    /^(?:explain|what|how|why|describe|tell me about|define|help me understand)\s+/i,
    
    // Question patterns
    /\b(?:is|are|means?|definition|explanation|simple terms|eli5|basics?)\b/i,
    
    // Educational topics
    /\b(?:causes?|effects?|happens?|works?|forms?|develops?|occurs?)\b/i,
    
    // Weather phenomena (educational context)
    /\b(?:el ni[ñn]o|la ni[ñn]a|hurricane|tornado|cyclone|typhoon|monsoon|blizzard)\b/i,
    
    // Weather concepts
    /\b(?:barometric pressure|humidity|dewpoint|heat index|wind chill|jet stream|front|system)\b/i,
    
    // Climate topics
    /\b(?:climate change|global warming|greenhouse effect|ozone|atmosphere|weather patterns)\b/i,
    
    // Educational keywords
    /\b(?:difference between|types? of|kinds? of|examples? of|classification|categories)\b/i,
    
    // Science explanations
    /\b(?:science|physics|meteorology|atmospheric|phenomenon|process|cycle)\b/i
  ];
  
  const isEducational = educationalPatterns.some(pattern => pattern.test(message.toLowerCase()));
  
  // Also check if it's asking about weather concepts without location
  const hasWeatherConcepts = /\b(?:weather|climate|storm|rain|snow|wind|temperature|pressure|humidity)\b/i.test(message);
  const hasLocationIndicators = /\b(?:in|at|for|near)\s+[A-Za-z]/i.test(message);
  const hasCurrentTimeIndicators = /\b(?:now|today|tonight|tomorrow|currently|right now|this week)\b/i.test(message);
  
  // If it has weather concepts but no location/time indicators, it's likely educational
  if (hasWeatherConcepts && !hasLocationIndicators && !hasCurrentTimeIndicators && isEducational) {
    return true;
  }
  
  return isEducational;
}

// Handle educational queries completely separately
async function handleEducationalQuery(message, conversationHistory, includeImages, res) {
  console.log('🎓 Processing educational query:', message);
  
  try {
    // Generate educational response
    let educationalResponse = null;
    let imageResults = { images: {}, hasImages: false };
    
    if (includeImages) {
      try {
        educationalResponse = await generateEducationalWeatherResponse(
          message,
          null, // No weather data needed for educational
          conversationHistory,
          null // No location needed
        );
        
        if (educationalResponse && educationalResponse.images) {
          imageResults = {
            images: educationalResponse.images,
            hasImages: Object.keys(educationalResponse.images).length > 0,
            isEducational: true,
            educationalTopic: educationalResponse.topic
          };
        }
      } catch (imageError) {
        console.error('❌ Educational image generation failed:', imageError);
        // Continue without images
      }
    }
    
    // Generate AI response for educational content
    const educationalContext = {
      userMessage: message,
      isEducational: true,
      educationalTopic: educationalResponse?.topic || 'weather-education',
      hasEducationalImages: imageResults.hasImages,
      requestType: 'educational',
      processingComplete: true,
      timestamp: new Date().toISOString()
    };
    
    const aiResponse = await generateWeatherResponse(message, educationalContext, conversationHistory);
    
    if (!aiResponse.success) {
      return res.status(200).json({
        response: `I'd be happy to explain that weather concept! However, I'm having some technical difficulties generating a detailed explanation right now. ${EMOJIS.warning} Could you try asking again in a moment?`,
        weatherData: null,
        images: imageResults.images,
        hasImages: imageResults.hasImages,
        isEducational: true,
        educationalTopic: educationalResponse?.topic,
        locationFound: null,
        searchedFor: null,
        usage: null
      });
    }
    
    // Process educational response
    let processedResponse = processFriendlyResponse(aiResponse.response, educationalContext);
    
    console.log('✅ Educational response ready');
    
    return res.status(200).json({
      response: processedResponse,
      weatherData: educationalContext,
      images: imageResults.images,
      hasImages: imageResults.hasImages,
      isEducational: true,
      educationalTopic: imageResults.educationalTopic,
      locationFound: null,
      searchedFor: null,
      usage: aiResponse.usage,
      metadata: {
        processingType: 'educational',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Educational processing error:', error);
    return res.status(200).json({
      response: `I'd love to help explain weather concepts! Unfortunately, I'm having some technical difficulties right now. ${EMOJIS.warning} Please try your question again in a moment.`,
      weatherData: null,
      images: {},
      hasImages: false,
      isEducational: true,
      educationalTopic: null,
      locationFound: null,
      searchedFor: null,
      usage: null,
      error: 'Educational processing failed'
    });
  }
}

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

    console.log('🔄 Processing message:', message);
    console.log('📍 User location:', location ? `${location.lat}, ${location.lon}` : 'Not available');

    // STEP 1: FIRST PRIORITY - Determine if this is an educational question
    const isEducationalQuery = await isEducationalWeatherQuestion(message);
    
    if (isEducationalQuery) {
      console.log('🎓 EDUCATIONAL PATHWAY - Processing educational weather question');
      return await handleEducationalQuery(message, conversationHistory, includeImages, res);
    }

    console.log('🌤️ WEATHER FORECAST PATHWAY - Processing weather/location request');

    // Initialize response data - CLEAR PREVIOUS STATE COMPLETELY
    let weatherData = null;
    let locationData = null;
    let searchedLocation = null;
    let usedUserLocation = false;

    // Step 2: SMART location detection - Only for weather-related queries
    const locationFromMessage = extractLocationFromMessage(message);
    
    if (locationFromMessage) {
      console.log('🎯 Location extracted from message:', locationFromMessage);
      
      try {
        // Search for the mentioned location - FORCE FRESH SEARCH
        const searchResult = await searchLocation(locationFromMessage);
        if (searchResult.success && searchResult.data.length > 0) {
          locationData = searchResult.data[0]; // Use the best match
          searchedLocation = locationFromMessage;
          console.log('✅ Found specific location:', locationData.displayName);
          console.log('📐 Coordinates:', `${locationData.lat}, ${locationData.lon}`);
        } else {
          console.log('❌ Could not find location:', locationFromMessage);
          // Return helpful error for invalid location search
          return res.status(200).json({
            response: `I couldn't find a location called "${locationFromMessage}". Could you try a different city name or be more specific? For example: "New York, NY" or "London, UK".`,
            weatherData: { 
              error: `Location "${locationFromMessage}" not found`,
              searchedLocation: locationFromMessage,
              needsLocation: true
            },
            images: {},
            hasImages: false,
            isEducational: false,
            educationalTopic: null,
            locationFound: null,
            searchedFor: locationFromMessage,
            usage: null
          });
        }
      } catch (error) {
        console.error('❌ Location search error:', error);
        return res.status(200).json({
          response: `I had trouble searching for "${locationFromMessage}". Please try again or check the spelling. You can also try being more specific, like "Paris, France" instead of just "Paris".`,
          weatherData: { 
            error: 'Location search failed',
            searchedLocation: locationFromMessage,
            debugInfo: error.message
          },
          images: {},
          hasImages: false,
          isEducational: false,
          educationalTopic: null,
          locationFound: null,
          searchedFor: locationFromMessage,
          usage: null
        });
      }
    }

    // Step 3: Handle different message types appropriately
    if (!locationFromMessage) {
      // No location in message, use user's current location if available
      if (location?.lat && location?.lon) {
        usedUserLocation = true;
        console.log('📍 Using user current location:', `${location.lat}, ${location.lon}`);
      } else {
        console.log('❌ No location available (message or GPS)');
      }
    }

    // Step 4: Determine final target location - CLEAR PRIORITY SYSTEM
    const targetLocation = locationData || location;
    const locationSource = locationData ? 'searched' : (usedUserLocation ? 'gps' : 'none');
    
    console.log('🎯 Final target location:', targetLocation ? `${targetLocation.lat}, ${targetLocation.lon}` : 'None');
    console.log('📂 Location source:', locationSource);

    // Step 5: Determine what weather data we need based on the query
    const needsWeatherData = /\b(weather|temperature|temp|rain|snow|wind|humidity|forecast|alert|warning|storm|cloudy|sunny|conditions|hot|cold|warm|cool)\b/i.test(message);
    
    if (needsWeatherData && targetLocation?.lat && targetLocation?.lon) {
      console.log('🌤️ Weather data requested, fetching for:', targetLocation);
      
      try {
        // Check what type of data the user is asking for
        const needsAlerts = /\b(watch|warning|alert|advisory|severe|storm|tornado|hurricane|flood|emergency)\b/i.test(message);
        const needsForecast = /\b(forecast|tomorrow|week|days|upcoming|future|tonight|morning)\b/i.test(message);
        const needsCurrent = /\b(now|current|today|right now|currently|this moment)\b/i.test(message) || (!needsAlerts && !needsForecast);

        console.log(`📊 Data needs - Alerts: ${needsAlerts}, Forecast: ${needsForecast}, Current: ${needsCurrent}`);

        // FRESH FETCH - Don't use any cached data from previous requests
        if (needsAlerts) {
          console.log('🚨 Fetching weather data with alerts...');
          const completeData = await getCompleteWeatherData(targetLocation.lat, targetLocation.lon, true);
          if (completeData.success) {
            weatherData = {
              ...completeData.data,
              requestType: 'alerts',
              searchedLocation: searchedLocation,
              locationUsed: locationData ? locationData.displayName : 'your current location',
              coordinates: { lat: targetLocation.lat, lon: targetLocation.lon },
              locationSource: locationSource
            };
            console.log('✅ Weather data with alerts fetched successfully');
          } else {
            throw new Error(completeData.error || 'Failed to fetch weather with alerts');
          }
        } else if (needsForecast && needsCurrent) {
          console.log('📈 Fetching current and forecast data...');
          const [currentWeather, forecast] = await Promise.allSettled([
            getCurrentWeather(targetLocation.lat, targetLocation.lon),
            getWeatherForecast(targetLocation.lat, targetLocation.lon)
          ]);

          weatherData = {
            current: currentWeather.status === 'fulfilled' && currentWeather.value.success ? currentWeather.value.data : null,
            forecast: forecast.status === 'fulfilled' && forecast.value.success ? forecast.value.data : null,
            requestType: 'current+forecast',
            searchedLocation: searchedLocation,
            locationUsed: locationData ? locationData.displayName : 'your current location',
            coordinates: { lat: targetLocation.lat, lon: targetLocation.lon },
            locationSource: locationSource
          };
          console.log('✅ Current and forecast data fetched');
        } else if (needsForecast) {
          console.log('📈 Fetching forecast data...');
          const forecast = await getWeatherForecast(targetLocation.lat, targetLocation.lon);
          if (forecast.success) {
            weatherData = {
              forecast: forecast.data,
              requestType: 'forecast',
              searchedLocation: searchedLocation,
              locationUsed: locationData ? locationData.displayName : 'your current location',
              coordinates: { lat: targetLocation.lat, lon: targetLocation.lon },
              locationSource: locationSource
            };
            console.log('✅ Forecast data fetched successfully');
          } else {
            throw new Error(forecast.error || 'Failed to fetch forecast');
          }
        } else {
          console.log('🌡️ Fetching current weather data...');
          const currentWeather = await getCurrentWeather(targetLocation.lat, targetLocation.lon);
          if (currentWeather.success) {
            weatherData = {
              current: currentWeather.data,
              requestType: 'current',
              searchedLocation: searchedLocation,
              locationUsed: locationData ? locationData.displayName : 'your current location',
              coordinates: { lat: targetLocation.lat, lon: targetLocation.lon },
              locationSource: locationSource
            };
            console.log('✅ Current weather data fetched successfully');
          } else {
            throw new Error(currentWeather.error || 'Failed to fetch current weather');
          }
        }
      } catch (weatherError) {
        console.error('❌ Weather API failed:', weatherError.message);
        weatherData = {
          error: 'Weather data temporarily unavailable - please try again in a moment',
          searchedLocation: searchedLocation,
          locationUsed: locationData ? locationData.displayName : 'your current location',
          coordinates: targetLocation ? { lat: targetLocation.lat, lon: targetLocation.lon } : null,
          debugInfo: weatherError.message,
          locationSource: locationSource
        };
      }
    } else if (needsWeatherData && !targetLocation) {
      console.log('❌ Weather requested but no location available');
      weatherData = {
        error: 'Location not available for weather data',
        needsLocation: true,
        message: 'Please allow location access or specify a city name to get weather information.'
      };
    }

    // Step 6: Build enhanced context for AI - COMPLETE CONTEXT
    const enhancedContext = {
      ...weatherData,
      userMessage: message,
      hasLocationSwitch: !!locationData, // True if user specified a different location
      originalLocation: location,
      targetLocation: targetLocation,
      locationSource: locationSource,
      // Add processing status
      dataFetched: !!weatherData,
      processingComplete: true,
      timestamp: new Date().toISOString(),
      isEducational: false // This is the weather forecast pathway
    };

    console.log('🤖 Sending to AI with context:', {
      hasWeatherData: !!weatherData,
      locationUsed: enhancedContext.locationUsed,
      hasLocationSwitch: enhancedContext.hasLocationSwitch,
      requestType: weatherData?.requestType,
      coordinates: weatherData?.coordinates,
      isEducational: enhancedContext.isEducational
    });

    // Step 7: Generate AI response with all available data
    const aiResponse = await generateWeatherResponse(message, enhancedContext, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback || `I'm having trouble generating a response right now. ${EMOJIS.warning} Please try again in a moment.`
      });
    }

    // Step 8: Process the AI response for better formatting and emoji handling
    let processedResponse = processFriendlyResponse(aiResponse.response, enhancedContext);

    // Step 9: Handle images if requested - FULL FEATURED
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

        imageResults = {
          images: regularImages.images,
          hasImages: Object.keys(regularImages.images).length > 0,
          isEducational: false,
          educationalTopic: null
        };
      } catch (imageError) {
        console.error('❌ Image processing error:', imageError);
        // Continue without images
      }
    }

    console.log('✅ Response ready, sending to client');

    // Step 10: Prepare final response with all data
    const responseData = {
      response: processedResponse,
      weatherData: enhancedContext,
      images: imageResults.images,
      hasImages: imageResults.hasImages,
      isEducational: imageResults.isEducational,
      educationalTopic: imageResults.educationalTopic,
      locationFound: locationData,
      searchedFor: searchedLocation,
      usage: aiResponse.usage,
      metadata: {
        locationSource: locationSource,
        timestamp: new Date().toISOString(),
        hasLocationSwitch: !!locationData
      }
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('💥 Chat API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      fallback: `Oops! I'm having some technical difficulties right now. ${EMOJIS.warning} Please try again in just a moment!`,
      debugInfo: {
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
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
    /fetching.*?data.*?/gi,
    /please wait while.*?/gi,
    /one moment while.*?/gi
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

  // Add location context if switched - IMPORTANT FOR LOCATION SWITCHING
  if (context.hasLocationSwitch && context.searchedLocation) {
    processed = `${EMOJIS.location} Showing weather for ${context.locationUsed}\n\n` + processed;
  }

  // Handle cases where no weather data was available
  if (context.needsLocation) {
    processed += `\n\n${EMOJIS.location} To get specific weather information, please allow location access or tell me which city you'd like weather for!`;
  }

  // Handle API errors gracefully
  if (context.error && context.error.includes('temporarily unavailable')) {
    processed += `\n\n${EMOJIS.warning} Weather data is temporarily unavailable. Please try again in a few moments.`;
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
    // Weather emojis - Fixed patterns
    '☀?': '☀️',
    '⛅?': '⛅',
    '☁?': '☁️',
    '🌧?': '🌧️',
    '⛈?': '⛈️',
    '❄?': '❄️',
    '🌫?': '🌫️',
    '💨?': '💨',
    '🔥?': '🔥',
    '🧊?': '🧊',
    '☂?': '☂️',
    '🌡?': '🌡️',
    
    // Educational emojis
    '📚?': '📚',
    '🔍?': '🔍',
    '📡?': '📡',
    '🛰?': '🛰️',
    '🌪?': '🌪️',
    '🌀?': '🌀',
    '⚡?': '⚡',
    
    // Interface emojis
    '⚠?': '⚠️',
    '📍?': '📍',
    '⭐?': '⭐',
    '✨?': '✨',
    '✅?': '✅',
    '❌?': '❌',
    '➡?': '➡️',
    
    // Common broken patterns
    '??': EMOJIS.sunny,
    '? ': EMOJIS.sunny + ' ',
    '?\n': EMOJIS.sunny + '\n',
    '?\t': EMOJIS.sunny + '\t'
  };

  let fixed = text;
  
  // Apply emoji fixes safely
  Object.entries(emojiMappings).forEach(([broken, correct]) => {
    try {
      const escapedBroken = broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedBroken, 'g');
      fixed = fixed.replace(regex, correct);
    } catch (error) {
      console.warn('Emoji replacement error for pattern:', broken);
    }
  });

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
    enhanced = enhanced.replace(/\b(cold|freeze|freezing|ice|chilly)\b/gi, `$1 ${EMOJIS.snow}`);
  }

  // Add condition-based emojis
  if (condition.includes('rain') || description.includes('rain')) {
    enhanced = enhanced.replace(/\b(rain|shower|drizzle|precipitation)\b/gi, `$1 ${EMOJIS.rain}`);
  }
  if (condition.includes('snow') || description.includes('snow')) {
    enhanced = enhanced.replace(/\b(snow|blizzard|flurries)\b/gi, `$1 ${EMOJIS.snow}`);
  }
  if (condition.includes('thunder') || description.includes('thunder')) {
    enhanced = enhanced.replace(/\b(thunder|lightning|storm)\b/gi, `$1 ${EMOJIS.storm}`);
  }
  if (condition.includes('clear') || description.includes('clear')) {
    enhanced = enhanced.replace(/\b(clear|sunny|sunshine)\b/gi, `$1 ${EMOJIS.sunny}`);
  }
  if (condition.includes('cloud') || description.includes('cloud')) {
    enhanced = enhanced.replace(/\b(cloud|cloudy|overcast)\b/gi, `$1 ${EMOJIS.sunny}`);
  }

  return enhanced;
}

// Helper function to validate coordinates
function validateCoordinates(lat, lon) {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Helper function to clean location names
function cleanLocationName(location) {
  if (!location) return location;
  
  // Remove common prefixes/suffixes that might interfere
  return location
    .replace(/^(the\s+|city\s+of\s+|town\s+of\s+)/i, '')
    .replace(/\s+(city|town|county|state|country)$/i, '')
    .trim();
}