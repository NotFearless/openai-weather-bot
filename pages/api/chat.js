import { generateWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast } from '../../lib/weather';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, location, conversationHistory, includeImages = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try to get weather data
    let weatherData = null;
    if (location?.lat && location?.lon) {
      try {
        const [currentWeather, forecast] = await Promise.all([
          getCurrentWeather(location.lat, location.lon),
          getWeatherForecast(location.lat, location.lon)
        ]);

        if (currentWeather.success || forecast.success) {
          weatherData = {
            current: currentWeather.success ? currentWeather.data : null,
            forecast: forecast.success ? forecast.data : null,
            location: location
          };
        }
      } catch (weatherError) {
        console.log('Weather API failed, continuing without weather data:', weatherError.message);
      }
    }

    // Generate AI response
    const aiResponse = await generateWeatherResponse(message, weatherData, conversationHistory);

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
      weatherData,
      images: imageResults.images,
      hasImages: imageResults.hasImages,
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