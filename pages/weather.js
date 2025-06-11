import { getCurrentWeather, getWeatherForecast, searchLocation } from '../../lib/weather';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, lat, lon, q } = req.query;

  try {
    switch (type) {
      case 'current':
        if (!lat || !lon) {
          return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        const currentWeather = await getCurrentWeather(parseFloat(lat), parseFloat(lon));
        return res.status(200).json(currentWeather);

      case 'forecast':
        if (!lat || !lon) {
          return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        const forecast = await getWeatherForecast(parseFloat(lat), parseFloat(lon));
        return res.status(200).json(forecast);

      case 'search':
        if (!q) {
          return res.status(400).json({ error: 'Search query required' });
        }
        const locations = await searchLocation(q);
        return res.status(200).json(locations);

      default:
        return res.status(400).json({ error: 'Invalid type parameter' });
    }
  } catch (error) {
    console.error('Weather API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
