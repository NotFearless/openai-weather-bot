// api/chat.js
import axios from 'axios';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log incoming request for debugging
    console.log('Received request:', { method: req.method, body: req.body });

    const { message, location, knowledgeLevel } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    // Check if API key is configured
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        reply: 'Sorry, the weather service is not properly configured. Please contact the administrator.'
      });
    }

    // Validate required fields
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        reply: 'Please provide a weather question.'
      });
    }

    console.log('Making request to OpenAI API...');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Storm AI, a weather-only assistant. You answer weather-related questions with a ${knowledgeLevel || 'beginner'} level of detail. Prioritize HRRR and NAM Nest models. Only use GFS when necessary and clearly state its lower reliability. Be clear and serious when there are threats.`
          },
          {
            role: 'user',
            content: `${message} (Location: ${location || 'unknown'})`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.choices[0].message.content;
    console.log('OpenAI response received successfully');
    
    res.status(200).json({ reply: result });

  } catch (error) {
    console.error('API Error:', error?.response?.data || error.message);
    
    if (error.response) {
      // OpenAI API error
      return res.status(500).json({ 
        error: 'OpenAI API Error',
        reply: `Sorry, I'm having trouble accessing weather data right now. Error: ${error.response.data?.error?.message || 'Unknown API error'}`,
        details: error.response.data
      });
    } else if (error.request) {
      // Network error
      return res.status(500).json({ 
        error: 'Network Error',
        reply: 'Sorry, I cannot connect to the weather service right now. Please try again later.'
      });
    } else {
      // Other error
      return res.status(500).json({ 
        error: 'Server Error',
        reply: 'Sorry, something went wrong on my end. Please try again.',
        details: error.message
      });
    }
  }
}