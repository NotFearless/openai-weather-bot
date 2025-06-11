import { generateWeatherResponse } from '../../lib/openai';
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

    // Try to get weather data, but don't fail if it doesn't work
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
        // Continue without weather data
      }
    }

    // Generate AI response (this should work now)
    const aiResponse = await generateWeatherResponse(message, weatherData, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: 'AI service unavailable',
        fallback: aiResponse.fallback 
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
      fallback: "I'm experiencing technical difficulties. Please try again in a moment."
    });
  }
}