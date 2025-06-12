import { generateWeatherResponse, generateEnhancedWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast, getNWSAlerts, getCompleteWeatherData, searchLocation, extractLocationFromMessage } from '../../lib/weather';

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

    // Step 1: Check if user is asking about a specific location
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

    // Step 2: Use the found location or fallback to user's current location
    const targetLocation = locationData || location;

    if (targetLocation?.lat && targetLocation?.lon) {
      try {
        // Step 3: Check what type of data the user is asking for
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

    // Step 4: Generate AI response with context
    const enhancedContext = {
      ...weatherData,
      userMessage: message,
      hasLocationSwitch: !!locationData,
      originalLocation: location,
      targetLocation: targetLocation
    };

    console.log('Sending to AI:', {
      message,
      contextKeys: Object.keys(enhancedContext),
      locationUsed: enhancedContext.locationUsed
    });

    const aiResponse = await generateWeatherResponse(message, enhancedContext, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback 
      });
    }

    // Step 5: Generate enhanced response with images
    let imageResults = { images: {}, hasImages: false };
    
    if (weatherData && includeImages) {
      imageResults = await generateEnhancedWeatherResponse(
        message, 
        weatherData, 
        conversationHistory, 
        includeImages
      );
    }

    return res.status(200).json({
      response: aiResponse.response,
      weatherData: enhancedContext,
      images: imageResults.images,
      hasImages: imageResults.hasImages,
      locationFound: locationData,
      searchedFor: searchedLocation,
      usage: aiResponse.usage
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      fallback: "I'm experiencing technical difficulties. Please try again in a moment."
    });
  }
}