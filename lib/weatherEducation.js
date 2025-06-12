import axios from 'axios';

// Weather education image sources and APIs
const WEATHER_IMAGE_SOURCES = {
  radar: {
    nws: 'https://radar.weather.gov/ridge/standard/',
    noaa: 'https://www.spc.noaa.gov/misc/radar/',
    base: 'https://radar.weather.gov/ridge/standard/'
  },
  satellite: {
    goes: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/',
    noaa: 'https://www.nhc.noaa.gov/satellite.php'
  },
  educational: {
    nws: 'https://www.weather.gov/images/',
    noaa: 'https://www.noaa.gov/sites/default/files/',
    spc: 'https://www.spc.noaa.gov/misc/'
  }
};

// Educational topics with associated image searches
const WEATHER_EDUCATION_TOPICS = {
  tornado: {
    keywords: ['tornado', 'funnel cloud', 'supercell', 'wall cloud', 'mesocyclone'],
    imageTypes: ['radar', 'satellite', 'field_photos'],
    radarPatterns: ['hook_echo', 'velocity_couplet', 'debris_ball'],
    educationalImages: [
      'https://www.spc.noaa.gov/misc/radar/hookecho.gif',
      'https://www.spc.noaa.gov/misc/radar/velocity.gif'
    ]
  },
  hurricane: {
    keywords: ['hurricane', 'tropical storm', 'eye wall', 'spiral bands'],
    imageTypes: ['satellite', 'radar', 'storm_structure'],
    radarPatterns: ['eye', 'eyewall', 'rainbands'],
    educationalImages: [
      'https://www.nhc.noaa.gov/gifs/hurricane_structure.jpg'
    ]
  },
  radar_reading: {
    keywords: ['radar', 'reflectivity', 'velocity', 'storm relative'],
    imageTypes: ['radar_examples', 'educational_diagrams'],
    radarPatterns: ['reflectivity', 'velocity', 'correlation_coefficient'],
    educationalImages: [
      'https://www.weather.gov/images/jetstream/doppler/doppler_intro.jpg',
      'https://www.weather.gov/images/jetstream/doppler/velocity.jpg'
    ]
  },
  thunderstorm: {
    keywords: ['thunderstorm', 'supercell', 'multicell', 'squall line'],
    imageTypes: ['radar', 'satellite', 'field_photos'],
    radarPatterns: ['bow_echo', 'supercell', 'squall_line'],
    educationalImages: [
      'https://www.spc.noaa.gov/misc/radar/bowecho.gif'
    ]
  },
  winter_weather: {
    keywords: ['snow', 'ice storm', 'blizzard', 'freezing rain'],
    imageTypes: ['radar', 'satellite', 'surface_maps'],
    radarPatterns: ['snow', 'ice_pellets', 'freezing_rain'],
    educationalImages: []
  }
};

// Function to identify weather education topic from user message
export function identifyEducationTopic(message) {
  const lowerMessage = message.toLowerCase();
  
  for (const [topic, config] of Object.entries(WEATHER_EDUCATION_TOPICS)) {
    if (config.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        topic,
        config,
        isEducational: true,
        needsImages: true
      };
    }
  }
  
  // Check for general educational queries
  const educationalPatterns = [
    /how do(?:es)? .+ work/i,
    /what (?:is|are) .+/i,
    /explain .+/i,
    /show me .+/i,
    /how to (?:read|identify|spot) .+/i,
    /difference between .+/i,
    /types of .+/i
  ];
  
  const isEducational = educationalPatterns.some(pattern => pattern.test(message));
  
  return {
    topic: 'general',
    isEducational,
    needsImages: isEducational && /\b(show|image|picture|visual|example)\b/i.test(message)
  };
}

// Function to search for educational weather images
export async function searchWeatherEducationImages(topic, query, location = null) {
  try {
    const results = {
      educational: [],
      radar: [],
      satellite: [],
      fieldPhotos: [],
      diagrams: []
    };

    // Get educational images for the topic
    if (WEATHER_EDUCATION_TOPICS[topic]) {
      const topicConfig = WEATHER_EDUCATION_TOPICS[topic];
      
      // Add predefined educational images
      results.educational = topicConfig.educationalImages.map(url => ({
        url,
        type: 'educational',
        description: `Educational diagram for ${topic}`,
        source: 'NOAA/NWS'
      }));
    }

    // Search for current radar imagery if location is provided
    if (location && (topic === 'radar_reading' || topic === 'tornado' || topic === 'thunderstorm')) {
      const radarImages = await getCurrentRadarImages(location.lat, location.lon);
      results.radar = radarImages;
    }

    // Search for satellite imagery
    if (topic === 'hurricane' || topic === 'satellite') {
      const satelliteImages = await getCurrentSatelliteImages();
      results.satellite = satelliteImages;
    }

    // Use web search to find additional educational images
    const webImages = await searchWebForWeatherImages(query, topic);
    results.fieldPhotos = webImages;

    return {
      success: true,
      images: results,
      topic,
      totalImages: Object.values(results).flat().length
    };

  } catch (error) {
    console.error('Weather education image search error:', error);
    return {
      success: false,
      error: error.message,
      images: {},
      totalImages: 0
    };
  }
}

// Function to get current radar images for a location
async function getCurrentRadarImages(lat, lon) {
  try {
    // Get nearest radar station
    const radarStation = await getNearestRadarStation(lat, lon);
    
    if (!radarStation) {
      return [];
    }

    const radarImages = [
      {
        url: `https://radar.weather.gov/ridge/standard/${radarStation}_loop.gif`,
        type: 'radar_reflectivity',
        description: 'Current radar reflectivity loop',
        source: 'NOAA Weather Radar',
        station: radarStation
      },
      {
        url: `https://radar.weather.gov/ridge/standard/${radarStation}_0.png`,
        type: 'radar_current',
        description: 'Current radar reflectivity',
        source: 'NOAA Weather Radar',
        station: radarStation
      }
    ];

    return radarImages;
  } catch (error) {
    console.error('Radar image error:', error);
    return [];
  }
}

// Function to get current satellite images
async function getCurrentSatelliteImages() {
  try {
    const satelliteImages = [
      {
        url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/678x678.jpg',
        type: 'satellite_visible',
        description: 'Current GOES-16 satellite visible imagery',
        source: 'NOAA GOES-16'
      },
      {
        url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/13/678x678.jpg',
        type: 'satellite_infrared',
        description: 'Current GOES-16 infrared imagery',
        source: 'NOAA GOES-16'
      }
    ];

    return satelliteImages;
  } catch (error) {
    console.error('Satellite image error:', error);
    return [];
  }
}

// Function to search web for weather education images
async function searchWebForWeatherImages(query, topic) {
  try {
    // This would typically use a web search API or scrape educational weather sites
    // For now, return some example educational images based on topic
    
    const educationalSites = [
      'weather.gov',
      'spc.noaa.gov',
      'nhc.noaa.gov',
      'nssl.noaa.gov'
    ];

    // In a real implementation, you'd search these sites for relevant images
    // For demonstration, return topic-specific example images
    
    const exampleImages = {
      tornado: [
        {
          url: 'https://www.spc.noaa.gov/misc/radar/hookecho.gif',
          type: 'educational',
          description: 'Hook echo on radar indicating possible tornado',
          source: 'NOAA Storm Prediction Center'
        }
      ],
      radar_reading: [
        {
          url: 'https://www.weather.gov/images/jetstream/doppler/doppler_intro.jpg',
          type: 'educational',
          description: 'How to read Doppler radar basics',
          source: 'NOAA JetStream'
        }
      ],
      hurricane: [
        {
          url: 'https://www.nhc.noaa.gov/gifs/hurricane_structure.jpg',
          type: 'educational',
          description: 'Hurricane structure diagram',
          source: 'NOAA National Hurricane Center'
        }
      ]
    };

    return exampleImages[topic] || [];
  } catch (error) {
    console.error('Web image search error:', error);
    return [];
  }
}

// Function to get nearest radar station
async function getNearestRadarStation(lat, lon) {
  // Simplified radar station lookup
  // In reality, you'd have a comprehensive database of radar stations
  const radarStations = {
    // Format: [lat, lon, station_id]
    'KJAX': [30.4847, -81.7018], // Jacksonville, FL
    'KTLH': [30.3975, -84.3289], // Tallahassee, FL
    'KTBW': [27.7056, -82.4019], // Tampa, FL
    'KAMX': [25.6111, -80.4128], // Miami, FL
    'KMLB': [28.1133, -80.6542], // Melbourne, FL
    'KTLX': [35.3331, -97.2775], // Oklahoma City, OK
    'KOUN': [35.2369, -97.4619], // Norman, OK
    'KFWS': [32.5728, -97.3031], // Dallas/Fort Worth, TX
    'KEWX': [29.7039, -98.0286], // San Antonio, TX
    'KCRP': [27.7842, -97.5111], // Corpus Christi, TX
  };

  let nearestStation = null;
  let minDistance = Infinity;

  for (const [station, [stationLat, stationLon]] of Object.entries(radarStations)) {
    const distance = Math.sqrt(
      Math.pow(lat - stationLat, 2) + Math.pow(lon - stationLon, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station;
    }
  }

  return nearestStation;
}

// Function to generate enhanced educational response
export async function generateEducationalWeatherResponse(userMessage, weatherData, conversationHistory, location) {
  try {
    // Identify if this is an educational query
    const educationContext = identifyEducationTopic(userMessage);
    
    if (!educationContext.isEducational) {
      return {
        success: false,
        isEducational: false
      };
    }

    // Search for relevant educational images
    let educationalImages = {};
    if (educationContext.needsImages) {
      const imageResults = await searchWeatherEducationImages(
        educationContext.topic,
        userMessage,
        location
      );
      
      if (imageResults.success) {
        educationalImages = imageResults.images;
      }
    }

    return {
      success: true,
      isEducational: true,
      topic: educationContext.topic,
      images: educationalImages,
      hasImages: Object.values(educationalImages).flat().length > 0,
      context: educationContext
    };

  } catch (error) {
    console.error('Educational response error:', error);
    return {
      success: false,
      error: error.message,
      isEducational: false
    };
  }
}

export default {
  identifyEducationTopic,
  searchWeatherEducationImages,
  generateEducationalWeatherResponse
};