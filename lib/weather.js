import axios from 'axios';

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const NWS_API_BASE = 'https://api.weather.gov';

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
        timestamp: new Date(data.dt * 1000),
        coordinates: { lat, lon }
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
        forecast,
        coordinates: { lat, lon }
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

// Get weather alerts from National Weather Service (US only)
export async function getNWSAlerts(lat, lon) {
  try {
    // First get the NWS point data to get the zone/county info
    const pointResponse = await axios.get(`${NWS_API_BASE}/points/${lat},${lon}`, {
      headers: {
        'User-Agent': 'WeatherApp (contact@yourapp.com)'
      }
    });

    const pointData = pointResponse.data.properties;
    
    // Get alerts for this location
    const alertsResponse = await axios.get(`${NWS_API_BASE}/alerts/active`, {
      params: {
        point: `${lat},${lon}`
      },
      headers: {
        'User-Agent': 'WeatherApp (contact@yourapp.com)'
      }
    });

    const alerts = alertsResponse.data.features || [];

    return {
      success: true,
      data: {
        location: `${pointData.relativeLocation?.properties?.city || 'Unknown'}, ${pointData.relativeLocation?.properties?.state || 'Unknown'}`,
        alertCount: alerts.length,
        coordinates: { lat, lon },
        alerts: alerts.map(alert => ({
          id: alert.id,
          title: alert.properties.event,
          headline: alert.properties.headline,
          description: alert.properties.description,
          instruction: alert.properties.instruction,
          severity: alert.properties.severity,
          urgency: alert.properties.urgency,
          certainty: alert.properties.certainty,
          category: alert.properties.category,
          start: new Date(alert.properties.onset),
          end: new Date(alert.properties.ends),
          expires: new Date(alert.properties.expires),
          sender: alert.properties.senderName,
          status: alert.properties.status,
          messageType: alert.properties.messageType,
          areas: alert.properties.areaDesc
        }))
      }
    };
  } catch (error) {
    console.error('NWS Alerts Error:', error.response?.data || error.message);
    
    // If coordinates are outside US, return empty alerts
    if (error.response?.status === 404) {
      return {
        success: true,
        data: {
          location: 'Outside US Coverage',
          alertCount: 0,
          alerts: [],
          coordinates: { lat, lon },
          note: 'NWS alerts only available for US locations'
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Enhanced location search with better parsing
export async function searchLocation(query) {
  try {
    // Clean and prepare the query
    const cleanQuery = query.trim().replace(/\b(weather|forecast|alerts?|warnings?|in|for|at|near)\b/gi, '').trim();
    
    if (!cleanQuery || cleanQuery.length < 2) {
      return { success: false, error: 'Invalid location query' };
    }

    const response = await axios.get(`https://api.openweathermap.org/geo/1.0/direct`, {
      params: {
        q: cleanQuery,
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

// Get complete weather data including alerts
export async function getCompleteWeatherData(lat, lon, includeAlerts = true) {
  try {
    const promises = [
      getCurrentWeather(lat, lon),
      getWeatherForecast(lat, lon)
    ];

    // Add alerts if requested
    if (includeAlerts) {
      promises.push(getNWSAlerts(lat, lon));
    }

    const results = await Promise.allSettled(promises);

    return {
      success: true,
      data: {
        current: results[0].status === 'fulfilled' && results[0].value.success ? results[0].value.data : null,
        forecast: results[1].status === 'fulfilled' && results[1].value.success ? results[1].value.data : null,
        alerts: includeAlerts && results[2] && results[2].status === 'fulfilled' && results[2].value.success ? results[2].value.data : null,
        coordinates: { lat, lon }
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

// Smart location extraction from user messages
export function extractLocationFromMessage(message) {
  // Remove common weather-related words and clean the message
  const cleanMessage = message.toLowerCase();
  
  // Patterns to extract locations
  const patterns = [
    // "weather in [location]", "forecast for [location]"
    /(?:weather|forecast|alerts?|warnings?)\s+(?:in|for|at|near)\s+([a-z\s,.-]+?)(?:\s|$|[?.!;])/i,
    // "in [location]", "for [location]"
    /(?:^|\s)(?:in|for|at|near)\s+([a-z\s,.-]+?)(?:\s+(?:weather|forecast|alerts?|warnings?)|$|[?.!;])/i,
    // "[location] weather", "[location] forecast"
    /^([a-z\s,.-]+?)\s+(?:weather|forecast|alerts?|warnings?)/i,
    // "how is [location]"
    /how\s+(?:is|are)\s+(?:the\s+)?(?:weather\s+(?:in|at|for)\s+)?([a-z\s,.-]+?)(?:\s|$|[?.!;])/i,
    // "does [location] have"
    /does\s+([a-z\s,.-]+?)\s+have/i,
    // "any [alerts] in [location]"
    /(?:any|are there)\s+(?:alerts?|warnings?|watches?)\s+(?:in|for|at|near)\s+([a-z\s,.-]+?)(?:\s|$|[?.!;])/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let location = match[1].trim();
      
      // Clean up the extracted location
      location = location.replace(/\b(the|this|that|current|today|tomorrow|now|right now)\b/gi, '').trim();
      location = location.replace(/[?.!;]+$/, '').trim();
      
      // Filter out if it's too short or contains non-location words
      const excludeWords = ['area', 'here', 'there', 'good', 'bad', 'like', 'going', 'doing'];
      if (location.length > 2 && !excludeWords.some(word => location.toLowerCase().includes(word))) {
        return location;
      }
    }
  }

  return null;
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