import axios from 'axios';

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Get current weather
export async function getCurrentWeather(lat, lon) {
  try {
    const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
      params: {
        lat,
        lon,
        appid: WEATHER_API_KEY,
        units: 'imperial'
      }
    });

    const data = response.data;
    return {
      success: true,
      data: {
        location: `${data.name}, ${data.sys.country}`,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed),
        windDirection: getWindDirection(data.wind.deg),
        visibility: data.visibility ? Math.round(data.visibility * 0.000621371) : null,
        description: data.weather[0].description,
        condition: data.weather[0].main,
        icon: data.weather[0].icon,
        timestamp: new Date(data.dt * 1000)
      }
    };
  } catch (error) {
    console.error('Weather API Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Get weather forecast
export async function getWeatherForecast(lat, lon) {
  try {
    const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
      params: {
        lat,
        lon,
        appid: WEATHER_API_KEY,
        units: 'imperial'
      }
    });

    const data = response.data;
    const forecast = data.list.slice(0, 8).map(item => ({
      time: new Date(item.dt * 1000),
      temperature: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      description: item.weather[0].description,
      condition: item.weather[0].main,
      windSpeed: Math.round(item.wind.speed),
      windDirection: getWindDirection(item.wind.deg),
      precipitationProbability: Math.round(item.pop * 100),
      icon: item.weather[0].icon
    }));

    return {
      success: true,
      data: {
        location: `${data.city.name}, ${data.city.country}`,
        forecast
      }
    };
  } catch (error) {
    console.error('Forecast API Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// NEW: Get weather alerts and warnings
export async function getWeatherAlerts(lat, lon) {
  try {
    const response = await axios.get(`${WEATHER_API_BASE}/onecall`, {
      params: {
        lat,
        lon,
        appid: WEATHER_API_KEY,
        exclude: 'minutely,hourly,daily',
        units: 'imperial'
      }
    });

    const data = response.data;
    const alerts = data.alerts || [];

    return {
      success: true,
      data: {
        location: `${lat}, ${lon}`,
        alertCount: alerts.length,
        alerts: alerts.map(alert => ({
          title: alert.event,
          description: alert.description,
          severity: alert.tags?.[0] || 'Unknown',
          start: new Date(alert.start * 1000),
          end: new Date(alert.end * 1000),
          sender: alert.sender_name,
          tags: alert.tags || []
        }))
      }
    };
  } catch (error) {
    console.error('Weather Alerts Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// NEW: Get comprehensive weather data including alerts
export async function getCompleteWeatherData(lat, lon) {
  try {
    const [currentWeather, forecast, alerts] = await Promise.allSettled([
      getCurrentWeather(lat, lon),
      getWeatherForecast(lat, lon),
      getWeatherAlerts(lat, lon)
    ]);

    return {
      success: true,
      data: {
        current: currentWeather.status === 'fulfilled' && currentWeather.value.success ? currentWeather.value.data : null,
        forecast: forecast.status === 'fulfilled' && forecast.value.success ? forecast.value.data : null,
        alerts: alerts.status === 'fulfilled' && alerts.value.success ? alerts.value.data : null,
        location: { lat, lon }
      }
    };
  } catch (error) {
    console.error('Complete Weather Data Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Search for locations
export async function searchLocation(query) {
  try {
    const response = await axios.get(`https://api.openweathermap.org/geo/1.0/direct`, {
      params: {
        q: query,
        limit: 5,
        appid: WEATHER_API_KEY
      }
    });

    return {
      success: true,
      data: response.data.map(location => ({
        name: location.name,
        state: location.state,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        displayName: `${location.name}${location.state ? `, ${location.state}` : ''}, ${location.country}`
      }))
    };
  } catch (error) {
    console.error('Location Search Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Helper functions
function getWindDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function calculateHeatIndex(temp, humidity) {
  if (temp < 80) return temp;
  
  const T = temp;
  const H = humidity;
  
  let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (H * 0.094));
  
  if (HI >= 80) {
    const c1 = -42.379;
    const c2 = 2.04901523;
    const c3 = 10.14333127;
    const c4 = -0.22475541;
    const c5 = -0.00683783;
    const c6 = -0.05481717;
    const c7 = 0.00122874;
    const c8 = 0.00085282;
    const c9 = -0.00000199;
    
    HI = c1 + (c2 * T) + (c3 * H) + (c4 * T * H) + (c5 * T * T) + (c6 * H * H) + 
         (c7 * T * T * H) + (c8 * T * H * H) + (c9 * T * T * H * H);
  }
  
  return Math.round(HI);
}