import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, location = 'unknown', knowledgeLevel = 'beginner' } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY');
    return res.status(500).json({ error: 'OpenAI API key not set' });
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
    console.error('OpenAI API error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to connect to OpenAI API' });
  }
}
