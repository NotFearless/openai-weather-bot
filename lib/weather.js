// lib/weather.js - Complete full file with improved location search and temperature accuracy
import axios from 'axios';

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const NWS_API_BASE = 'https://api.weather.gov';

// Add detailed logging
const log = (message, data = '') => {
  console.log(`[Weather API] ${message}`, data);
};

const logError = (message, error) => {
  console.error(`[Weather API Error] ${message}`, error?.response?.data || error?.message || error);
};

// Validate API key on startup
if (!WEATHER_API_KEY) {
  console.error('❌ WEATHER_API_KEY not found in environment variables!');
  console.log('💡 Add WEATHER_API_KEY to your .env.local file');
} else {
  log('✅ Weather API Key found');
}

// Get current weather with improved accuracy and debugging
export async function getCurrentWeather(lat, lon) {
  try {
    // Validate coordinates with more precision
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid coordinates: lat and lon must be valid numbers');
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
    }

    // Round coordinates to reasonable precision (6 decimal places = ~0.1m accuracy)
    const roundedLat = Math.round(lat * 1000000) / 1000000;
    const roundedLon = Math.round(lon * 1000000) / 1000000;

    log(`🌡️ Fetching current weather for: ${roundedLat}, ${roundedLon}`);

    // CRITICAL: Make sure we're using imperial units explicitly
    const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
      params: {
        lat: roundedLat,
        lon: roundedLon,
        appid: WEATHER_API_KEY,
        units: 'imperial' // Explicitly request Fahrenheit
      },
      timeout: 10000 // 10 second timeout
    });

    log('✅ Current weather data received successfully');

    const data = response.data;
    
    // Log raw temperature data for debugging
    console.log('🌡️ RAW TEMPERATURE DATA:');
    console.log('- API returned temp:', data.main.temp);
    console.log('- API returned feels_like:', data.main.feels_like);
    console.log('- Units requested: imperial (Fahrenheit)');
    console.log('- Data timestamp:', new Date(data.dt * 1000));
    console.log('- Location returned:', data.name, data.sys.country);
    console.log('- Coordinates returned:', data.coord);
    
    // Check if coordinates match what we requested
    const coordDiff = {
      lat: Math.abs(roundedLat - data.coord.lat),
      lon: Math.abs(roundedLon - data.coord.lon)
    };
    
    if (coordDiff.lat > 0.1 || coordDiff.lon > 0.1) {
      console.log('⚠️ WARNING: Significant coordinate difference!');
      console.log('Requested:', roundedLat, roundedLon);
      console.log('Returned:', data.coord.lat, data.coord.lon);
      console.log('This could cause temperature inaccuracy!');
    }

    // DON'T round the temperature - use exact API value
    const exactTemp = data.main.temp;
    const exactFeelsLike = data.main.feels_like;
    
    console.log('🎯 EXACT TEMPERATURES:');
    console.log('- Exact temp from API:', exactTemp);
    console.log('- Rounded temp (what we show):', Math.round(exactTemp));
    console.log('- Difference from rounding:', Math.abs(exactTemp - Math.round(exactTemp)));

    return {
      success: true,
      data: {
        location: `${data.name}, ${data.sys.country}`,
        temperature: exactTemp, // Use exact temperature, don't round here
        temperatureRounded: Math.round(exactTemp), // Provide rounded version separately
        feelsLike: exactFeelsLike,
        feelsLikeRounded: Math.round(exactFeelsLike),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind?.speed ? Math.round(data.wind.speed * 10) / 10 : 0, // Round to 1 decimal
        windDirection: getWindDirection(data.wind?.deg || 0),
        visibility: data.visibility ? Math.round(data.visibility * 0.000621371) : null, // Convert to miles
        description: data.weather[0].description,
        condition: data.weather[0].main,
        icon: data.weather[0].icon,
        timestamp: new Date(data.dt * 1000),
        coordinates: { 
          lat: data.coord.lat, // Use coordinates that API actually used
          lon: data.coord.lon 
        },
        rawApiData: {
          temp: data.main.temp,
          feels_like: data.main.feels_like,
          pressure: data.main.pressure,
          humidity: data.main.humidity,
          dt: data.dt,
          coord: data.coord
        }
      }
    };
  } catch (error) {
    logError('Failed to fetch current weather', error);
    
    // Provide specific error messages
    let errorMessage = 'Unknown weather API error';
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network connection failed - check internet connection';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Weather API request timed out';
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid API key - check WEATHER_API_KEY in environment';
    } else if (error.response?.status === 429) {
      errorMessage = 'API rate limit exceeded - too many requests';
    } else if (error.response?.status === 404) {
      errorMessage = 'Location not found in weather database';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    return {
      success: false,
      error: errorMessage,
      debugInfo: {
        status: error.response?.status,
        message: error.message,
        code: error.code
      }
    };
  }
}

// Get weather forecast with improved accuracy
export async function getWeatherForecast(lat, lon) {
  try {
    // Validate coordinates
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid coordinates: lat and lon must be valid numbers');
    }

    // Round coordinates to reasonable precision
    const roundedLat = Math.round(lat * 1000000) / 1000000;
    const roundedLon = Math.round(lon * 1000000) / 1000000;

    log(`📈 Fetching forecast for: ${roundedLat}, ${roundedLon}`);

    const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
      params: {
        lat: roundedLat,
        lon: roundedLon,
        appid: WEATHER_API_KEY,
        units: 'imperial' // Explicitly request Fahrenheit
      },
      timeout: 10000 // 10 second timeout
    });

    log('✅ Forecast data received successfully');

    const data = response.data;
    
    // Process forecast data with exact temperatures
    const forecast = data.list.slice(0, 8).map(item => ({
      time: new Date(item.dt * 1000),
      temperature: item.main.temp, // Exact temperature
      temperatureRounded: Math.round(item.main.temp),
      feelsLike: item.main.feels_like,
      feelsLikeRounded: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      description: item.weather[0].description,
      condition: item.weather[0].main,
      windSpeed: item.wind?.speed ? Math.round(item.wind.speed * 10) / 10 : 0,
      windDirection: getWindDirection(item.wind?.deg || 0),
      precipitationProbability: Math.round((item.pop || 0) * 100),
      icon: item.weather[0].icon
    }));

    return {
      success: true,
      data: {
        location: `${data.city.name}, ${data.city.country}`,
        forecast,
        coordinates: { lat: data.city.coord.lat, lon: data.city.coord.lon }
      }
    };
  } catch (error) {
    logError('Failed to fetch forecast', error);
    
    let errorMessage = 'Failed to fetch weather forecast';
    
    if (error.response?.status === 401) {
      errorMessage = 'Invalid API key for forecast data';
    } else if (error.response?.status === 429) {
      errorMessage = 'Forecast API rate limit exceeded';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

// Debug function to test temperature accuracy
export async function debugWeatherAccuracy(lat, lon) {
  console.log('\n🔍 WEATHER DATA ACCURACY DEBUG');
  console.log('=====================================');
  
  try {
    const roundedLat = Math.round(lat * 1000000) / 1000000;
    const roundedLon = Math.round(lon * 1000000) / 1000000;
    
    // Test OpenWeatherMap API directly with different unit systems
    console.log('📡 Testing OpenWeatherMap API with different units...');
    
    const [imperialResponse, metricResponse, kelvinResponse] = await Promise.all([
      axios.get(`${WEATHER_API_BASE}/weather?lat=${roundedLat}&lon=${roundedLon}&appid=${WEATHER_API_KEY}&units=imperial`),
      axios.get(`${WEATHER_API_BASE}/weather?lat=${roundedLat}&lon=${roundedLon}&appid=${WEATHER_API_KEY}&units=metric`),
      axios.get(`${WEATHER_API_BASE}/weather?lat=${roundedLat}&lon=${roundedLon}&appid=${WEATHER_API_KEY}`)
    ]);
    
    const imperialData = imperialResponse.data;
    const metricData = metricResponse.data;
    const kelvinData = kelvinResponse.data;
    
    console.log('\n📊 TEMPERATURE COMPARISON:');
    console.log('Imperial (°F):', imperialData.main.temp);
    console.log('Metric (°C):', metricData.main.temp);
    console.log('Kelvin (K):', kelvinData.main.temp);
    
    // Manual conversions
    const celsiusToFahr = (metricData.main.temp * 9/5) + 32;
    const kelvinToFahr = (kelvinData.main.temp - 273.15) * 9/5 + 32;
    
    console.log('\n🧮 MANUAL CONVERSIONS:');
    console.log('C->F conversion:', celsiusToFahr.toFixed(2));
    console.log('K->F conversion:', kelvinToFahr.toFixed(2));
    console.log('Direct F from API:', imperialData.main.temp);
    
    console.log('\n📍 COORDINATE VERIFICATION:');
    console.log('Requested:', roundedLat, roundedLon);
    console.log('API returned:', imperialData.coord.lat, imperialData.coord.lon);
    
    console.log('\n⏰ DATA FRESHNESS:');
    const dataAge = (Date.now() / 1000) - imperialData.dt;
    console.log('Data age (minutes):', (dataAge / 60).toFixed(1));
    console.log('Data timestamp:', new Date(imperialData.dt * 1000));
    
    return {
      success: true,
      temperatures: {
        fahrenheit: imperialData.main.temp,
        celsius: metricData.main.temp,
        kelvin: kelvinData.main.temp,
        conversions: {
          celsiusToFahrenheit: celsiusToFahr,
          kelvinToFahrenheit: kelvinToFahr
        }
      },
      coordinates: {
        requested: { lat: roundedLat, lon: roundedLon },
        returned: imperialData.coord
      },
      dataAge: dataAge,
      location: `${imperialData.name}, ${imperialData.sys.country}`
    };
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get weather alerts with improved error handling
export async function getNWSAlerts(lat, lon) {
  try {
    log(`Fetching NWS alerts for coordinates: ${lat}, ${lon}`);

    // First get the NWS point data to get the zone/county info
    const pointResponse = await axios.get(`${NWS_API_BASE}/points/${lat},${lon}`, {
      headers: {
        'User-Agent': 'WeatherApp (contact@yourapp.com)'
      },
      timeout: 8000 // 8 second timeout for NWS
    });

    const pointData = pointResponse.data.properties;
    
    // Get alerts for this location
    const alertsResponse = await axios.get(`${NWS_API_BASE}/alerts/active`, {
      params: {
        point: `${lat},${lon}`
      },
      headers: {
        'User-Agent': 'WeatherApp (contact@yourapp.com)'
      },
      timeout: 8000
    });

    const alerts = alertsResponse.data.features || [];
    log(`✅ Found ${alerts.length} active alerts`);

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
    logError('NWS Alerts Error', error);
    
    // If coordinates are outside US, return empty alerts
    if (error.response?.status === 404) {
      log('Location outside US coverage area');
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
      error: 'Failed to fetch weather alerts',
      debugInfo: {
        status: error.response?.status,
        message: error.message
      }
    };
  }
}

// ENHANCED LOCATION SEARCH - MUCH MORE COMPREHENSIVE
export async function searchLocation(query) {
  try {
    // Clean and prepare the query - MORE FLEXIBLE CLEANING
    let cleanQuery = query.trim();
    
    // Remove weather-related words but keep location words
    cleanQuery = cleanQuery.replace(/\b(weather|forecast|alerts?|warnings?|conditions?|temperature|temp)\b/gi, '').trim();
    cleanQuery = cleanQuery.replace(/\b(in|for|at|near|show|me|the|what's|how's|tell|give)\b/gi, '').trim();
    cleanQuery = cleanQuery.replace(/[?.!]+$/, '').trim();
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim(); // Normalize spaces
    
    if (!cleanQuery || cleanQuery.length < 1) { // Reduced minimum length
      return { 
        success: false, 
        error: 'Search query too short - please provide a city name' 
      };
    }

    log(`🔍 Searching for location: "${cleanQuery}" (from original: "${query}")`);

    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Exact query
      { query: cleanQuery, limit: 10 },
      // Strategy 2: Add common suffixes if not present
      ...(cleanQuery.includes(',') ? [] : [
        { query: `${cleanQuery}, US`, limit: 5 },
        { query: `${cleanQuery}, USA`, limit: 5 },
        { query: `${cleanQuery}, United States`, limit: 5 }
      ]),
      // Strategy 3: Try without special characters
      { query: cleanQuery.replace(/[^\w\s,]/g, ''), limit: 5 }
    ];

    let allResults = [];
    let bestResults = [];

    for (const strategy of searchStrategies) {
      if (!strategy.query || strategy.query.length < 1) continue;
      
      try {
        console.log(`🔍 Trying search strategy: "${strategy.query}"`);
        
        const response = await axios.get(`https://api.openweathermap.org/geo/1.0/direct`, {
          params: {
            q: strategy.query,
            limit: strategy.limit,
            appid: WEATHER_API_KEY
          },
          timeout: 8000
        });

        if (response.data && response.data.length > 0) {
          console.log(`✅ Found ${response.data.length} results for "${strategy.query}"`);
          allResults.push(...response.data);
          
          // If this is our first strategy and we got good results, prioritize them
          if (bestResults.length === 0) {
            bestResults = response.data;
          }
        }
      } catch (strategyError) {
        console.log(`❌ Strategy "${strategy.query}" failed:`, strategyError.message);
        continue;
      }
    }

    // Remove duplicates based on coordinates (same location, different names)
    const uniqueResults = [];
    const seen = new Set();

    for (const location of allResults) {
      const key = `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(location);
      }
    }

    // Sort by relevance (prioritize exact matches, then by country preference)
    uniqueResults.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const queryLower = cleanQuery.toLowerCase();
      
      // Exact name matches first
      const aExact = aName === queryLower;
      const bExact = bName === queryLower;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      
      // Starts with query second
      const aStarts = aName.startsWith(queryLower);
      const bStarts = bName.startsWith(queryLower);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      // Prefer US locations if query doesn't specify country
      if (!cleanQuery.includes(',')) {
        const aUS = a.country === 'US';
        const bUS = b.country === 'US';
        if (aUS && !bUS) return -1;
        if (bUS && !aUS) return 1;
      }
      
      // Then by name alphabetically
      return aName.localeCompare(bName);
    });

    // Limit final results but be generous
    const finalResults = uniqueResults.slice(0, 8);

    log(`✅ Final results: ${finalResults.length} unique locations found`);

    // Enhanced result mapping with better display names
    const mappedResults = finalResults.map(location => {
      let displayName = location.name;
      
      // Add state/province if available and not already included
      if (location.state && !displayName.includes(location.state)) {
        displayName += `, ${location.state}`;
      }
      
      // Add country, with special handling for US
      if (location.country === 'US') {
        if (!displayName.includes('US') && !displayName.includes('USA')) {
          displayName += ', USA';
        }
      } else {
        displayName += `, ${location.country}`;
      }
      
      return {
        name: location.name,
        state: location.state,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        displayName: displayName,
        // Add relevance score for debugging
        relevance: calculateRelevance(location.name, cleanQuery)
      };
    });

    return {
      success: true,
      data: mappedResults,
      searchQuery: cleanQuery,
      originalQuery: query,
      totalFound: uniqueResults.length
    };

  } catch (error) {
    logError('Location Search Error', error);
    
    let errorMessage = 'Failed to search for location';
    
    if (error.response?.status === 401) {
      errorMessage = 'Invalid API key for location search';
    } else if (error.response?.status === 429) {
      errorMessage = 'Location search rate limit exceeded - please wait a moment';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network connection failed - check internet connection';
    }
    
    return {
      success: false,
      error: errorMessage,
      searchQuery: query
    };
  }
}

// Helper function to calculate relevance score
function calculateRelevance(locationName, query) {
  const name = locationName.toLowerCase();
  const q = query.toLowerCase();
  
  if (name === q) return 100; // Exact match
  if (name.startsWith(q)) return 90; // Starts with
  if (name.includes(q)) return 80; // Contains
  
  // Fuzzy matching score
  let score = 0;
  const words = q.split(' ');
  for (const word of words) {
    if (name.includes(word)) {
      score += 20;
    }
  }
  
  return score;
}

// Get complete weather data with retry logic
export async function getCompleteWeatherData(lat, lon, includeAlerts = true, retries = 2) {
  try {
    log(`Fetching complete weather data (retry attempts: ${retries})`);

    const promises = [
      getCurrentWeather(lat, lon),
      getWeatherForecast(lat, lon)
    ];

    // Add alerts if requested
    if (includeAlerts) {
      promises.push(getNWSAlerts(lat, lon));
    }

    const results = await Promise.allSettled(promises);

    // Check if at least current weather succeeded
    const currentWeatherResult = results[0];
    if (currentWeatherResult.status === 'rejected') {
      throw new Error('Failed to fetch current weather data');
    }

    const weatherData = {
      current: currentWeatherResult.value.success ? currentWeatherResult.value.data : null,
      forecast: results[1].status === 'fulfilled' && results[1].value.success ? results[1].value.data : null,
      alerts: includeAlerts && results[2] && results[2].status === 'fulfilled' && results[2].value.success ? results[2].value.data : null,
      coordinates: { lat, lon }
    };

    // If current weather failed but we have retries left, try again
    if (!weatherData.current && retries > 0) {
      log(`Retrying complete weather data fetch (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return getCompleteWeatherData(lat, lon, includeAlerts, retries - 1);
    }

    log('✅ Complete weather data fetch completed');
    return {
      success: true,
      data: weatherData
    };
  } catch (error) {
    logError('Complete Weather Data Error', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch weather data'
    };
  }
}

// Enhanced location extraction with better patterns
export function extractLocationFromMessage(message) {
  const cleanMessage = message.toLowerCase().trim();
  
  console.log('🔍 Analyzing message for location:', message);
  
  // Even more comprehensive patterns
  const patterns = [
    // Direct location queries - HIGHEST PRIORITY
    /^(?:weather|forecast|temperature|temp|conditions?|alerts?|warnings?)\s+(?:in|for|at|near)\s+([a-zA-Z\s,.-]+?)(?:\s*[?.!]?\s*$)/i,
    
    // "Show me weather in [location]" style
    /(?:show|give|tell)\s+me\s+(?:the\s+)?(?:weather|forecast|conditions?)\s+(?:in|for|at|near)\s+([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // "What's the weather in [location]" style  
    /(?:what'?s|how'?s)\s+(?:the\s+)?(?:weather|forecast|conditions?)\s+(?:like\s+)?(?:in|for|at|near)\s+([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // "Weather for [location]" style
    /(?:weather|forecast|conditions?|temperature|temp)\s+(?:for|in|at|near)\s+([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // "[Location] weather" style
    /^([a-zA-Z\s,.-]+?)\s+(?:weather|forecast|conditions?|temperature|temp)(?:\s|$|[?.!;])/i,
    
    // "In [location]" at start of message
    /^(?:in|at|for|near)\s+([a-zA-Z\s,.-]+?)(?:\s*[,]?\s*(?:weather|forecast|how|what|is|are|show|tell))/i,
    
    // "How is [location]" style
    /how\s+(?:is|are)\s+(?:the\s+)?(?:weather\s+(?:in|at|for)\s+)?([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // "Does [location] have" style
    /does\s+([a-zA-Z\s,.-]+?)\s+have\s+(?:any\s+)?(?:weather|storms?|rain|snow)/i,
    
    // "Any alerts in [location]" style
    /(?:any|are\s+there)\s+(?:alerts?|warnings?|watches?)\s+(?:in|for|at|near)\s+([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // Switch patterns - "Now check [location]" or "Switch to [location]"
    /(?:now\s+(?:check|show)|switch\s+to|change\s+to)\s+([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // Update patterns - "Update for [location]" 
    /update\s+(?:for|in|at)\s+([a-zA-Z\s,.-]+?)(?:\s|$|[?.!;])/i,
    
    // Simple city names (be more generous)
    /^([a-zA-Z\s,.-]{3,}?)(?:\s*[?.!]?\s*$)/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = cleanMessage.match(pattern);
    
    if (match && match[1]) {
      let location = match[1].trim();
      
      console.log(`🎯 Pattern ${i + 1} matched: "${location}"`);
      
      // Clean up the extracted location - LESS AGGRESSIVE CLEANING
      location = location.replace(/\b(the|this|that|please|also|too)\b/gi, '').trim();
      location = location.replace(/[?.!;]+$/, '').trim();
      location = location.replace(/^[,\s]+|[,\s]+$/g, '').trim();
      
      // Be less restrictive with exclusions
      const excludeWords = [
        'here', 'there', 'good', 'bad', 'like', 'going', 'doing', 'fine', 'nice', 
        'great', 'awful', 'terrible', 'outside', 'inside', 'home', 'work', 'office'
      ];
      
      const hasExcludedWords = excludeWords.some(word => 
        location.toLowerCase() === word
      );
      
      // Be more generous with minimum length
      if (location.length > 1 && !hasExcludedWords) {
        console.log(`✅ Valid location extracted: "${location}"`);
        return location;
      } else {
        console.log(`❌ Invalid location filtered out: "${location}" (too short or excluded word)`);
      }
    }
  }

  console.log('❌ No location found in message');
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

// Test function to verify location extraction (for debugging)
export function testLocationExtraction() {
  const testCases = [
    "Weather in New York",
    "What's the weather like in Paris?", 
    "Show me weather for Tokyo",
    "London weather",
    "How is Chicago today?",
    "Switch to Miami",
    "Now check Los Angeles",
    "Any alerts in Denver?",
    "Weather for San Francisco please",
    "Tell me about Berlin weather",
    "Update for Boston",
    "In Seattle, how's the weather?"
  ];
  
  console.log('🧪 Testing location extraction:');
  testCases.forEach(test => {
    const result = extractLocationFromMessage(test);
    console.log(`"${test}" → ${result || 'No location found'}`);
  });
}

// Test function for location search
export async function testLocationSearch() {
  const testQueries = [
    'New York',
    'Paris',
    'Tokyo',
    'London',
    'Los Angeles',
    'Chicago',
    'Miami',
    'Boston',
    'Seattle',
    'Denver',
    'San Francisco',
    'Atlanta',
    'Phoenix',
    'Dallas',
    'Houston',
    'Philadelphia',
    'Madrid',
    'Berlin',
    'Sydney',
    'Toronto'
  ];
  
  console.log('🧪 Testing location search with various cities:');
  
  for (const query of testQueries) {
    try {
      const result = await searchLocation(query);
      if (result.success) {
        console.log(`✅ "${query}" → ${result.data.length} results (best: ${result.data[0]?.displayName})`);
      } else {
        console.log(`❌ "${query}" → Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ "${query}" → Error: ${error.message}`);
    }
  }
}

// Helper function to validate coordinates
function validateCoordinates(lat, lon) {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Helper function to clean location names
function cleanLocationName(location) {
  if (!location) return location;
  
  // Remove common prefixes/suffixes that might interfere
  return location
    .replace(/^(the\s+|city\s+of\s+|town\s+of\s+)/i, '')
    .replace(/\s+(city|town|county|state|country)$/i, '')
    .trim();
}