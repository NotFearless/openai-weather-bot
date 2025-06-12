function getWeatherEmoji(condition) {
  const emojiMap = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '🌨️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️'
  };
  return emojiMap[condition] || '🌤️';
}

// Enhanced weather response with image options
export async function generateEnhancedWeatherResponse(userMessage, weatherData, conversationHistory, includeImages = true) {
  try {
    let imageResults = {};
    
    // Check if user is asking for visual content
    const requestsVisual = /\b(show|image|picture|visual|map|chart|forecast chart)\b/i.test(userMessage);
    const requestsForecast = /\b(forecast|week|days|tomorrow|future)\b/i.test(userMessage);
    
    if (includeImages && weatherData) {
      // Generate images based on user request
      if (requestsVisual) {
        const location = weatherData.location?.name || weatherData.current?.name || 'your area';
        
        if (requestsForecast && weatherData.forecast) {
          // Generate forecast chart
          imageResults.forecastChart = await generateForecastChart(weatherData.forecast);
        } else {
          // Generate current weather scene
          imageResults.weatherScene = await generateWeatherImage(weatherData, location);
        }
      }
    }

    return {
      success: true,
      images: imageResults,
      hasImages: Object.keys(imageResults).length > 0
    };
  } catch (error) {
    console.error('Enhanced weather response error:', error);
    return {
      success: false,
      error: error.message,
      images: {},
      hasImages: false
    };
  }
}