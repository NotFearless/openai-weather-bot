const axios = require('axios');

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, location, knowledgeLevel } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Storm AI, a weather-only assistant. You answer weather-related questions with a ${knowledgeLevel} level of detail. Prioritize HRRR and NAM Nest models. Only use GFS when necessary and clearly state its lower reliability. Be clear and serious when there are threats.`
          },
          {
            role: 'user',
            content: `${message} (Location: ${location})`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.choices[0].message.content;
    res.status(200).json({ reply: result });
  } catch (error) {
    console.error('OpenAI API Error:', error?.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get response from OpenAI',
      details: error?.response?.data?.error?.message || 'Unknown error'
    });
  }
};