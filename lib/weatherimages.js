import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate weather scene image using DALL-E
export async function generateWeatherImage(weatherData, location) {
  try {
    const { current } = weatherData;
    const condition = current?.weather?.[0]?.description || 'clear sky';
    const temp = Math.round(current?.main?.temp || 70);
    const timeOfDay = new Date().getHours() < 18 ? 'daytime' : 'evening';
    
    const prompt = `A beautiful, realistic ${timeOfDay} weather scene showing ${condition} in ${location || 'a city'}. Temperature feels like ${temp}°F. Professional weather photography style, high quality, cinematic lighting. No text or overlays.`;

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
      error: error.message
    };
  }
}

// Generate forecast chart image
export async function generateForecastChart(forecastData) {
  try {
    if (!forecastData?.list) {
      throw new Error('No forecast data available');
    }

    const dailyData = forecastData.list
      .filter((item, index) => index % 8 === 0)
      .slice(0, 5)
      .map(item => ({
        day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
        temp: Math.round(item.main.temp),
        condition: item.weather[0].description
      }));

    const tempRange = `${Math.min(...dailyData.map(d => d.temp))}°F to ${Math.max(...dailyData.map(d => d.temp))}°F`;
    const conditions = dailyData.map(d => d.condition).join(', ');

    const prompt = `A clean, modern weather forecast infographic showing 5 days of weather. Temperature range: ${tempRange}. Conditions: ${conditions}. Minimalist design with weather icons and temperature numbers.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
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
      error: error.message
    };
  }
}

// Main function to generate enhanced weather response
export async function generateEnhancedWeatherResponse(userMessage, weatherData, conversationHistory, includeImages = true) {
  try {
    let imageResults = {};
    
    // Check if user is asking for visual content
    const requestsVisual = /\b(show|image|picture|visual|scene)\b/i.test(userMessage);
    const requestsForecast = /\b(forecast|chart|week|days)\b/i.test(userMessage);
    
    if (includeImages && weatherData && requestsVisual) {
      const location = weatherData.current?.name || 'your area';
      
      if (requestsForecast && weatherData.forecast) {
        imageResults.forecastChart = await generateForecastChart(weatherData.forecast);
      } else {
        imageResults.weatherScene = await generateWeatherImage(weatherData, location);
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