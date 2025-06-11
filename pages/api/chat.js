import { generateWeatherResponse } from '../../lib/openai';
import { getCurrentWeather, getWeatherForecast } from '../../lib/weather';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, location, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Debug: Check if API keys are loaded
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('WEATHER_API_KEY exists:', !!process.env.WEATHER_API_KEY);

    // Get weather data if location is provided
    let weatherData = null;
    if (location?.lat && location?.lon) {
      const [currentWeather, forecast] = await Promise.all([
        getCurrentWeather(location.lat, location.lon),
        getWeatherForecast(location.lat, location.lon)
      ]);

      console.log('Weather API response:', { 
        currentSuccess: currentWeather.success, 
        forecastSuccess: forecast.success 
      });

      weatherData = {
        current: currentWeather.success ? currentWeather.data : null,
        forecast: forecast.success ? forecast.data : null,
        location: location
      };
    }

    // Generate AI response
    const aiResponse = await generateWeatherResponse(message, weatherData, conversationHistory);
    
    console.log('AI Response success:', aiResponse.success);

    if (!aiResponse.success) {
      console.error('AI Response error:', aiResponse.error);
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback || "I'm having trouble connecting to the AI service. Please try again.",
        debug: aiResponse.error
      });
    }

    return res.status(200).json({
      response: aiResponse.response,
      weatherData,
      usage: aiResponse.usage
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      fallback: "I'm experiencing technical difficulties. Please try again in a moment.",
      debug: error.message
    });
  }
}