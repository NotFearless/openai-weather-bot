import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWeatherResponse(userMessage, weatherData, conversationHistory = []) {
  const systemPrompt = `You are a professional meteorologist and weather assistant with access to real-time weather data. You provide accurate forecasts, severe weather analysis, and weather education.

Key capabilities:
- Current conditions analysis using real weather data
- Multi-model forecast interpretation (NAM, HRRR, GFS)
- Severe weather outlook and SPC analysis
- Weather education and explanations
- Safety recommendations

Current weather context: ${JSON.stringify(weatherData, null, 2)}

Guidelines:
- Always prioritize safety in severe weather situations
- Explain complex weather concepts in accessible terms
- Provide actionable information and recommendations
- Reference specific data when making forecasts
- Admit uncertainty when forecasts are less reliable
- Focus on the user's location and immediate needs`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: userMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // This is the current available model
      messages: messages,
      max_tokens: 800,
      temperature: 0.3,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    return {
      success: true,
      response: completion.choices[0].message.content,
      usage: completion.usage
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return {
      success: false,
      error: error.message,
      fallback: "I'm experiencing technical difficulties. Please try asking about weather conditions again in a moment."
    };
  }
}

export default openai;