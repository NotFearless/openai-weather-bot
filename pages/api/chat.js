import { generateWeatherResponse, generateEnhancedWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast, getWeatherAlerts, getCompleteWeatherData, searchLocation } from '../../lib/weather';

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

    // Check if user is asking about a specific location
    const locationMatch = extractLocationFromMessage(message);
    
    if (locationMatch) {
      // Search for the mentioned location
      const searchResult = await searchLocation(locationMatch);
      if (searchResult.success && searchResult.data.length > 0) {
        locationData = searchResult.data[0];
      }
    }

    // Use the found location or fallback to user's current location
    const targetLocation = locationData || location;

    if (targetLocation?.lat && targetLocation?.lon) {
      try {
        // Check if user is asking about alerts/warnings specifically
        const needsAlerts = /\b(watch|warning|alert|advisory|severe|storm|tornado|hurricane|flood)\b/i.test(message);
        
        if (needsAlerts) {
          // Get complete weather data including alerts
          const completeData = await getCompleteWeatherData(targetLocation.lat, targetLocation.lon);
          if (completeData.success) {
            weatherData = completeData.data;
          }
        } else {
          // Get basic weather data
          const [currentWeather, forecast] = await Promise.all([
            getCurrentWeather(targetLocation.lat, targetLocation.lon),
            getWeatherForecast(targetLocation.lat, targetLocation.lon)
          ]);

          if (currentWeather.success || forecast.success) {
            weatherData = {
              current: currentWeather.success ? currentWeather.data : null,
              forecast: forecast.success ? forecast.data : null,
              location: targetLocation
            };
          }
        }
      } catch (weatherError) {
        console.log('Weather API failed, continuing without weather data:', weatherError.message);
      }
    }

    // Generate AI response with enhanced context
    const enhancedContext = {
      ...weatherData,
      requestedLocation: locationData?.displayName || null,
      searchedFor: locationMatch || null
    };

    const aiResponse = await generateWeatherResponse(message, enhancedContext, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback 
      });
    }

    // Generate enhanced response with images
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

// Helper function to extract location from user message
function extractLocationFromMessage(message) {
  // Look for location patterns
  const patterns = [
    /(?:in|for|at|near)\s+([A-Za-z\s,]+?)(?:\s|$|[?.!])/i,
    /([A-Za-z\s,]+?)\s+(?:weather|forecast|alerts?|warnings?)/i,
    /weather\s+(?:in|for|at|near)\s+([A-Za-z\s,]+?)(?:\s|$|[?.!])/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      // Filter out common words that aren't locations
      const excludeWords = ['the', 'this', 'that', 'current', 'today', 'tomorrow', 'now'];
      if (!excludeWords.includes(location.toLowerCase()) && location.length > 2) {
        return location;
      }
    }
  }

  return null;
}