import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWeatherResponse(userMessage, weatherData, conversationHistory = []) {
  const systemPrompt = `You are a helpful weather assistant. Provide clear, accurate weather information and forecasts based on the data provided.

Weather Context: ${JSON.stringify(weatherData, null, 2)}

Special Instructions:
- If the user asks about alerts, warnings, watches, or severe weather, prioritize that information
- If weather alerts are present, mention them prominently and explain their significance
- If no alerts are found but user asks about them, clearly state "No current weather alerts or warnings"
- For location-specific queries, acknowledge the location you're providing data for
- Provide safety advice for severe weather conditions
- Be conversational but informative

Respond naturally and helpfully about weather conditions, forecasts, alerts, and safety.`;

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
        max_tokens: 600, // Increased for alert descriptions
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

// Generate weather scene image using DALL-E
export async function generateWeatherImage(weatherData, location) {
  try {
    const { current } = weatherData;
    const condition = current?.weather?.[0]?.description || 'clear sky';
    const temp = Math.round(current?.main?.temp || 70);
    const timeOfDay = new Date().getHours() < 18 ? 'daytime' : 'evening';
    
    const prompt = `A beautiful, realistic ${timeOfDay} weather scene showing ${condition} in ${location || 'a city'}. Temperature feels like ${temp}°F. Professional weather photography style, high quality, cinematic lighting. No text or overlays.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });

    return {
      success: true,
      imageUrl: response.data[0].url,
      prompt: prompt
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function to generate enhanced weather response
export async function generateEnhancedWeatherResponse(userMessage, weatherData, conversationHistory, includeImages = true) {
  try {
    let imageResults = {};
    
    // Check if user is asking for visual content
    const requestsVisual = /\b(show|image|picture|visual|scene)\b/i.test(userMessage);
    const requestsForecast = /\b(forecast|chart|week|days)\b/i.test(userMessage);
    
    if (includeImages && weatherData && requestsVisual) {
      const location = weatherData.current?.location || weatherData.requestedLocation || 'your area';
      
      if (requestsVisual && !requestsForecast) {
        imageResults.weatherScene = await generateWeatherImage(weatherData, location);
      }
    }

    return {
      success: true,
      images: imageResults,
      hasImages: Object.keys(imageResults).length > 0
    };
  } catch (error) {
    console.error('Enhanced weather response error:', error);
    return {
      success: false,
      error: error.message,
      images: {},
      hasImages: false
    };
  }
}

export default openai;