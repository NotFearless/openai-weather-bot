import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWeatherResponse(userMessage, weatherData, conversationHistory = []) {
  const systemPrompt = `You are a helpful weather assistant. Provide clear, accurate weather information and forecasts based on the data provided.

Current weather context: ${JSON.stringify(weatherData, null, 2)}

Respond naturally and helpfully about weather conditions, forecasts, and safety.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-4),
    { role: 'user', content: userMessage }
  ];

  // Try multiple models in order of preference
  const modelsToTry = [
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo', 
    'gpt-4o-mini'
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}`);
      
      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      console.log(`Model ${model} successful`);
      return {
        success: true,
        response: completion.choices[0].message.content,
        usage: completion.usage,
        modelUsed: model
      };
    } catch (error) {
      console.error(`Model ${model} failed:`, error.message);
      
      // If this is the last model, return the error
      if (model === modelsToTry[modelsToTry.length - 1]) {
        return {
          success: false,
          error: error.message,
          fallback: "I'm having trouble connecting to the AI service. Please try again in a moment."
        };
      }
      // Otherwise, try the next model
      continue;
    }
  }
}

export default openai;