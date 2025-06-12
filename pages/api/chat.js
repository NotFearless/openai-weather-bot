// pages/api/chat.js - Enhanced with friendly response processing
import { generateWeatherResponse, generateEnhancedWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast, getNWSAlerts, getCompleteWeatherData, searchLocation, extractLocationFromMessage } from '../../lib/weather';
import { generateEducationalWeatherResponse } from '../../lib/weatherEducation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, location, conversationHistory, includeImages = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let weatherData = null;
    let locationData = null;
    let searchedLocation = null;
    let educationalResponse = null;

    // Step 1: Check if this is an educational weather query
    if (includeImages) {
      educationalResponse = await generateEducationalWeatherResponse(
        message, 
        weatherData, 
        conversationHistory, 
        location
      );
    }

    // Step 2: Check if user is asking about a specific location
    const locationFromMessage = extractLocationFromMessage(message);
    
    if (locationFromMessage) {
      console.log(`Extracted location from message: ${locationFromMessage}`);
      
      // Search for the mentioned location
      const searchResult = await searchLocation(locationFromMessage);
      if (searchResult.success && searchResult.data.length > 0) {
        locationData = searchResult.data[0]; // Use the best match
        searchedLocation = locationFromMessage;
        console.log(`Found location: ${locationData.displayName}`);
      } else {
        console.log(`Could not find location: ${locationFromMessage}`);
      }
    }

    // Step 3: Use the found location or fallback to user's current location
    const targetLocation = locationData || location;

    if (targetLocation?.lat && targetLocation?.lon) {
      try {
        // Step 4: Check what type of data the user is asking for
        const needsAlerts = /\b(watch|warning|alert|advisory|severe|storm|tornado|hurricane|flood|emergency)\b/i.test(message);
        const needsForecast = /\b(forecast|tomorrow|week|days|upcoming|future)\b/i.test(message);
        const needsCurrent = /\b(now|current|today|right now|currently)\b/i.test(message) || (!needsAlerts && !needsForecast);

        console.log(`Data needs - Alerts: ${needsAlerts}, Forecast: ${needsForecast}, Current: ${needsCurrent}`);

        if (needsAlerts) {
          // Get complete weather data including alerts
          const completeData = await getCompleteWeatherData(targetLocation.lat, targetLocation.lon, true);
          if (completeData.success) {
            weatherData = {
              ...completeData.data,
              requestType: 'alerts',
              searchedLocation: searchedLocation,
              locationUsed: locationData ? locationData.displayName : 'current location'
            };
          }
        } else if (needsForecast && needsCurrent) {
          // Get both current and forecast
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
        } else if (needsForecast) {
          // Get forecast only
          const forecast = await getWeatherForecast(targetLocation.lat, targetLocation.lon);
          weatherData = {
            forecast: forecast.success ? forecast.data : null,
            requestType: 'forecast',
            searchedLocation: searchedLocation,
            locationUsed: locationData ? locationData.displayName : 'current location'
          };
        } else {
          // Get current weather only
          const currentWeather = await getCurrentWeather(targetLocation.lat, targetLocation.lon);
          weatherData = {
            current: currentWeather.success ? currentWeather.data : null,
            requestType: 'current',
            searchedLocation: searchedLocation,
            locationUsed: locationData ? locationData.displayName : 'current location'
          };
        }
      } catch (weatherError) {
        console.log('Weather API failed:', weatherError.message);
        weatherData = {
          error: 'Weather data unavailable',
          searchedLocation: searchedLocation,
          locationUsed: locationData ? locationData.displayName : 'current location'
        };
      }
    } else {
      console.log('No valid coordinates found');
      if (searchedLocation) {
        weatherData = {
          error: `Could not find coordinates for "${searchedLocation}"`,
          searchedLocation: searchedLocation
        };
      }
    }

    // Step 5: Generate AI response with context
    const enhancedContext = {
      ...weatherData,
      userMessage: message,
      hasLocationSwitch: !!locationData,
      originalLocation: location,
      targetLocation: targetLocation,
      // Add educational context
      isEducational: educationalResponse?.isEducational || false,
      educationalTopic: educationalResponse?.topic,
      hasEducationalImages: educationalResponse?.hasImages || false
    };

    console.log('Sending to AI:', {
      message,
      contextKeys: Object.keys(enhancedContext),
      locationUsed: enhancedContext.locationUsed,
      isEducational: enhancedContext.isEducational
    });

    const aiResponse = await generateWeatherResponse(message, enhancedContext, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback 
      });
    }

    // Step 6: Process the AI response to make it even more friendly
    let processedResponse = processFriendlyResponse(aiResponse.response, enhancedContext);

    // Step 7: Combine regular weather images with educational images
    let imageResults = { images: {}, hasImages: false };
    
    if (includeImages) {
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
    }

    return res.status(200).json({
      response: processedResponse,
      weatherData: enhancedContext,
      images: imageResults.images,
      hasImages: imageResults.hasImages,
      isEducational: imageResults.isEducational,
      educationalTopic: imageResults.educationalTopic,
      locationFound: locationData,
      searchedFor: searchedLocation,
      usage: aiResponse.usage
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      fallback: "Oops! I'm having some technical difficulties right now. 😅 Please try again in just a moment!"
    });
  }
}

// Function to post-process AI responses for better readability
function processFriendlyResponse(response, context) {
  let processed = response;

  // Remove any asterisks that might have slipped through
  processed = processed.replace(/\*([^*]+)\*/g, '$1');
  processed = processed.replace(/\*\*/g, '');

  // Add spacing around emojis for better readability
  processed = processed.replace(/([^\s])([🌀🌤️🌦️🌧️⛈️🌨️🌩️🌪️🌈☀️⭐🌟💫🔥❄️🧊💧💨🌊⚡🌙🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔])/g, '$1 $2');
  processed = processed.replace(/([🌀🌤️🌦️🌧️⛈️🌨️🌩️🌪️🌈☀️⭐🌟💫🔥❄️🧊💧💨🌊⚡🌙🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔])([^\s])/g, '$1 $2');

  // Add weather-specific closing encouragements based on context
  if (context.isEducational) {
    const educationalClosings = [
      "\n\n🎓 Keep exploring the fascinating world of weather! Feel free to ask more questions.",
      "\n\n📚 Weather science is amazing when you understand it! What else would you like to learn?",
      "\n\n🔍 Great question! Understanding weather patterns helps you stay safe and informed.",
      "\n\n⚡ Weather education is so important! Ask me anything else you're curious about."
    ];
    const randomClosing = educationalClosings[Math.floor(Math.random() * educationalClosings.length)];
    processed += randomClosing;
  } else if (context.current || context.forecast) {
    const weatherClosings = [
      "\n\n🌟 Stay weather-aware and have a great day!",
      "\n\n☀️ Hope this helps with your weather planning!",
      "\n\n🌤️ Anything else you'd like to know about the weather?",
      "\n\n⭐ Stay safe out there!"
    ];
    const randomClosing = weatherClosings[Math.floor(Math.random() * weatherClosings.length)];
    processed += randomClosing;
  }

  // Add urgency indicators for severe weather
  if (context.alerts && context.alerts.alertCount > 0) {
    processed = "⚠️ **WEATHER ALERT** ⚠️\n\n" + processed;
  }

  // Add location context if switched
  if (context.hasLocationSwitch && context.searchedLocation) {
    processed = `📍 Showing weather for ${context.locationUsed}\n\n` + processed;
  }

  // Clean up any double line breaks
  processed = processed.replace(/\n\n\n+/g, '\n\n');
  
  // Ensure proper spacing after periods
  processed = processed.replace(/\.([A-Z])/g, '. $1');

  return processed.trim();
}

// Helper function to add contextual emojis based on weather conditions
function addContextualEmojis(text, weatherData) {
  if (!weatherData?.current) return text;

  const condition = weatherData.current.condition?.toLowerCase() || '';
  const temp = weatherData.current.temperature || 70;

  // Add temperature context
  if (temp > 85) {
    text = text.replace(/hot|warm|heat/gi, match => `${match} 🔥`);
  } else if (temp < 32) {
    text = text.replace(/cold|freeze|freezing|ice/gi, match => `${match} 🧊`);
  }

  // Add condition-specific emojis
  if (condition.includes('rain')) {
    text = text.replace(/rain|shower|drizzle/gi, match => `${match} 🌧️`);
  }
  if (condition.includes('snow')) {
    text = text.replace(/snow|blizzard/gi, match => `${match} ❄️`);
  }
  if (condition.includes('thunder')) {
    text = text.replace(/thunder|lightning/gi, match => `${match} ⚡`);
  }
  if (condition.includes('wind')) {
    text = text.replace(/wind|windy|gusty/gi, match => `${match} 💨`);
  }

  return text;
}