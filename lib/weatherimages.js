import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate weather scene image using DALL-E
export async function generateWeatherImage(weatherData, location) {
  try {
    const { current, forecast } = weatherData;
    const condition = current?.weather?.[0]?.description || 'clear sky';
    const temp = Math.round(current?.main?.temp || 70);
    const timeOfDay = new Date().getHours() < 18 ? 'daytime' : 'evening';
    
    // Create a detailed prompt for weather visualization
    const prompt = `A beautiful, realistic ${timeOfDay} weather scene showing ${condition} in ${location || 'a city'}. Temperature feels like ${temp}°F. Professional weather photography style, high quality, cinematic lighting, 16:9 aspect ratio. No text or overlays.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });

    return {
      success: true,
      imageUrl: response.data[0].url,
      prompt: prompt
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return {
      success: false,
      error: error.message,
      fallbackIcon: getWeatherEmoji(weatherData.current?.weather?.[0]?.main)
    };
  }
}

// Generate forecast chart image
export async function generateForecastChart(forecastData) {
  try {
    if (!forecastData?.list) {
      throw new Error('No forecast data available');
    }

    // Extract next 5 days of data
    const dailyData = forecastData.list
      .filter((item, index) => index % 8 === 0) // Every 8th item (24hrs apart)
      .slice(0, 5)
      .map(item => ({
        day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
        temp: Math.round(item.main.temp),
        condition: item.weather[0].description,
        icon: item.weather[0].main
      }));

    const tempRange = `${Math.min(...dailyData.map(d => d.temp))}°F to ${Math.max(...dailyData.map(d => d.temp))}°F`;
    const conditions = dailyData.map(d => d.condition).join(', ');

    const prompt = `A clean, modern weather forecast infographic showing 5 days of weather. Temperature range: ${tempRange}. Conditions include: ${conditions}. Minimalist design with weather icons, temperature numbers, and day labels. Professional weather app style, clean typography, soft gradients, no complex backgrounds.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024", // Wide format for forecast
      quality: "standard",
      style: "natural"
    });

    return {
      success: true,
      imageUrl: response.data[0].url,
      prompt: prompt,
      forecastData: dailyData
    };
  } catch (error) {
    console.error('Forecast chart generation error:', error);
    return {
      success: false,
      error: error.message,
      fallbackChart: generateTextChart(forecastData)
    };
  }
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

// Fallback text-based chart when image generation fails
function generateTextChart(forecastData) {
  if (!forecastData?.list) return null;
  
  const dailyData = forecastData.list
    .filter((item, index) => index % 8 === 0)
    .slice(0, 5)
    .map(item => ({
      day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      temp: Math.round(item.main.temp),
      condition: item.weather[0].description,
      emoji: getWeatherEmoji(item.weather[0].main)
    }));

  return dailyData.map(day => 
    `${day.emoji} ${day.day}: ${day.temp}°F - ${day.condition}`
  ).join('\n');
}

// Get appropriate emoji for weather condition
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