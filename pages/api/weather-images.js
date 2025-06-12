// pages/api/weather-images.js - API endpoint for fetching educational weather images
import { searchWeatherEducationImages } from '../../lib/weatherEducation';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, query, lat, lon } = req.query;

    if (!topic && !query) {
      return res.status(400).json({ error: 'Topic or query parameter is required' });
    }

    const location = (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null;

    const result = await searchWeatherEducationImages(
      topic || 'general',
      query || '',
      location
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        images: result.images,
        topic: result.topic,
        totalImages: result.totalImages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        fallback: 'Unable to fetch educational weather images at this time.'
      });
    }

  } catch (error) {
    console.error('Weather images API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      fallback: 'Unable to fetch educational weather images at this time.'
    });
  }
}

// Alternative endpoint for direct radar images
export async function getRadarImages(req, res) {
  const { lat, lon, station } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }

  try {
    // Get nearest radar station if not provided
    const radarStation = station || await getNearestRadarStation(parseFloat(lat), parseFloat(lon));
    
    if (!radarStation) {
      return res.status(404).json({ error: 'No radar station found for location' });
    }

    const radarImages = [
      {
        url: `https://radar.weather.gov/ridge/standard/${radarStation}_loop.gif`,
        type: 'radar_reflectivity_loop',
        description: `Current radar reflectivity animation for ${radarStation}`,
        source: 'NOAA Weather Radar',
        station: radarStation
      },
      {
        url: `https://radar.weather.gov/ridge/standard/${radarStation}_0.png`,
        type: 'radar_current',
        description: `Current radar reflectivity for ${radarStation}`,
        source: 'NOAA Weather Radar',
        station: radarStation
      }
    ];

    return res.status(200).json({
      success: true,
      images: radarImages,
      station: radarStation,
      location: { lat: parseFloat(lat), lon: parseFloat(lon) }
    });

  } catch (error) {
    console.error('Radar images error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Helper function to find nearest radar station
async function getNearestRadarStation(lat, lon) {
  // Comprehensive radar station database
  const radarStations = {
    // Southeast
    'KJAX': [30.4847, -81.7018], // Jacksonville, FL
    'KTLH': [30.3975, -84.3289], // Tallahassee, FL
    'KTBW': [27.7056, -82.4019], // Tampa, FL
    'KAMX': [25.6111, -80.4128], // Miami, FL
    'KMLB': [28.1133, -80.6542], // Melbourne, FL
    'KBYX': [24.5970, -81.7033], // Key West, FL
    'KEVX': [30.5644, -85.9214], // Eglin AFB, FL
    'KJGX': [32.6750, -83.3508], // Robins AFB, GA
    'KFFC': [33.3633, -84.5661], // Atlanta, GA
    
    // Texas
    'KFWS': [32.5728, -97.3031], // Dallas/Fort Worth, TX
    'KEWX': [29.7039, -98.0286], // San Antonio, TX
    'KCRP': [27.7842, -97.5111], // Corpus Christi, TX
    'KHGX': [29.4719, -95.0792], // Houston, TX
    'KBRO': [25.9159, -97.4189], // Brownsville, TX
    'KLBB': [33.6539, -101.8142], // Lubbock, TX
    'KAMA': [35.2333, -101.7089], // Amarillo, TX
    'KDYX': [32.5386, -99.2542], // Dyess AFB, TX
    
    // Oklahoma
    'KTLX': [35.3331, -97.2775], // Oklahoma City, OK
    'KOUN': [35.2369, -97.4619], // Norman, OK
    'KINX': [36.1750, -95.5644], // Tulsa, OK
    'KFDR': [34.3631, -98.9764], // Frederick, OK
    
    // Midwest
    'KILX': [40.1506, -89.3367], // Lincoln, IL
    'KLOT': [41.6044, -88.0847], // Chicago, IL
    'KDVN': [41.6117, -90.5808], // Davenport, IA
    'KDMX': [41.7311, -93.7231], // Des Moines, IA
    'KEAX': [38.8103, -94.2644], // Kansas City, MO
    'KSGF': [37.2350, -93.4006], // Springfield, MO
    'KLSX': [38.6986, -90.6828], // St. Louis, MO
    
    // Northeast
    'KOKX': [40.8656, -72.8639], // New York, NY
    'KDIX': [39.9469, -74.4108], // Philadelphia, PA
    'KCCX': [40.9233, -78.0039], // State College, PA
    'KBUF': [42.9489, -78.7369], // Buffalo, NY
    'KBGM': [42.1997, -75.9847], // Binghamton, NY
    'KENX': [42.5864, -74.0639], // Albany, NY
    'KBOX': [41.9556, -71.1375], // Boston, MA
    
    // West Coast
    'KHNX': [36.3142, -119.6317], // San Joaquin Valley, CA
    'KVTX': [34.4117, -119.1794], // Los Angeles, CA
    'KNKX': [32.9189, -117.0419], // San Diego, CA
    'KBHX': [40.4986, -124.2919], // Eureka, CA
    'KRTX': [45.7150, -122.9653], // Portland, OR
    'KATX': [48.1947, -122.4958], // Seattle, WA
    
    // Mountain West
    'KGJX': [39.0619, -108.2139], // Grand Junction, CO
    'KFTG': [39.7867, -104.5458], // Denver, CO
    'KPUX': [38.4595, -112.8633], // Pueblo, CO
    'KICX': [37.5908, -112.8619], // Cedar City, UT
    'KMTX': [41.2628, -112.4472], // Salt Lake City, UT
    'KSFX': [43.1056, -112.6861], // Pocatello, ID
    'KCBX': [43.4906, -116.2356], // Boise, ID
    'KMAX': [42.0808, -122.7175], // Medford, OR
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