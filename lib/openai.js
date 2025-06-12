import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWeatherResponse(userMessage, weatherData, conversationHistory = []) {
  // Build context-aware system prompt
  let contextInfo = '';
  
  if (weatherData?.searchedLocation) {
    contextInfo += `\nUser asked about: "${weatherData.searchedLocation}"`;
  }
  
  if (weatherData?.locationUsed) {
    contextInfo += `\nProviding data for: ${weatherData.locationUsed}`;
  }
  
  if (weatherData?.hasLocationSwitch) {
    contextInfo += `\nNote: User switched from their current location to search for a specific place.`;
  }

  if (weatherData?.alerts?.alertCount > 0) {
    contextInfo += `\nIMPORTANT: There are ${weatherData.alerts.alertCount} active weather alerts for this location!`;
  } else if (weatherData?.requestType === 'alerts') {
    contextInfo += `\nNote: User asked about alerts/warnings, but none are currently active.`;
  }

  // Enhanced educational context
  if (weatherData?.isEducational) {
    contextInfo += `\nEDUCATIONAL QUERY: This is a weather education question about ${weatherData.educationalTopic}.`;
    
    if (weatherData?.hasEducationalImages) {
      contextInfo += `\nEDUCATIONAL IMAGES: Real weather images and diagrams are available to illustrate your explanation.`;
      contextInfo += `\nIMPORTANT: Reference the educational images when explaining concepts. Tell the user to examine the images shown.`;
    }
    
    // Add specific educational guidance based on topic
    const educationalGuidance = getEducationalGuidance(weatherData.educationalTopic, userMessage);
    if (educationalGuidance) {
      contextInfo += `\nEDUCATIONAL GUIDANCE: ${educationalGuidance}`;
    }
  }

  const systemPrompt = `You are a helpful weather assistant and meteorology educator. Provide clear, accurate weather information and educational content based on the data provided.

${contextInfo}

Weather Data Context: ${JSON.stringify(weatherData, null, 2)}

Instructions:
- If user asked about a specific location, acknowledge you're providing data for that location
- If there are weather alerts, prioritize them and explain their significance clearly
- If user asked about alerts but none exist, clearly state "No current weather alerts or warnings for [location]"
- For location switches, briefly acknowledge the new location
- Provide safety advice for severe weather conditions
- Be conversational but informative
- If weather data is missing or incomplete, acknowledge what you can't provide

EDUCATIONAL INSTRUCTIONS:
- If this is an educational query, act as a meteorology instructor
- Explain weather concepts clearly with step-by-step reasoning
- Use analogies and real-world examples to make complex concepts understandable
- If educational images are available, specifically reference them in your explanation
- Break down complex phenomena into understandable parts
- Include practical applications and safety information
- Encourage the user to examine any radar, satellite, or educational images provided
- Explain what to look for in weather imagery and how to interpret patterns

Respond naturally and helpfully about weather conditions, forecasts, alerts, safety, and weather education.`;

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
        max_tokens: 900, // Increased for educational content
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
    const current = weatherData.current;
    if (!current) {
      throw new Error('No current weather data available for image generation');
    }

    const condition = current.description || 'clear sky';
    const temp = current.temperature || 70;
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
    const hasValidWeatherData = weatherData?.current || weatherData?.forecast;
    
    if (includeImages && hasValidWeatherData && requestsVisual) {
      const location = weatherData.locationUsed || weatherData.current?.location || 'your area';
      
      // Generate weather scene image
      imageResults.weatherScene = await generateWeatherImage(weatherData, location);
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

// Helper function to provide educational guidance based on topic
function getEducationalGuidance(topic, userMessage) {
  const guidance = {
    tornado: {
      patterns: [
        /how.*read.*radar/i,
        /radar.*tornado/i,
        /hook.*echo/i,
        /velocity.*couplet/i
      ],
      guidance: "Focus on explaining radar signatures like hook echoes, velocity couplets, and debris balls. Describe what meteorologists look for when identifying tornado potential on radar."
    },
    hurricane: {
      patterns: [
        /hurricane.*structure/i,
        /eye.*wall/i,
        /satellite.*image/i,
        /spiral.*band/i
      ],
      guidance: "Explain hurricane anatomy including the eye, eyewall, and spiral rainbands. Describe how satellite imagery shows these features and what they mean for intensity."
    },
    radar_reading: {
      patterns: [
        /how.*read.*radar/i,
        /radar.*color/i,
        /reflectivity/i,
        /velocity/i
      ],
      guidance: "Break down radar products step by step. Explain reflectivity colors, velocity displays, and how to interpret different radar modes. Focus on practical interpretation skills."
    },
    thunderstorm: {
      patterns: [
        /supercell/i,
        /storm.*structure/i,
        /updraft/i,
        /downdraft/i
      ],
      guidance: "Describe thunderstorm types and their radar characteristics. Explain concepts like updrafts, downdrafts, and storm-relative motion."
    },
    winter_weather: {
      patterns: [
        /snow.*radar/i,
        /ice.*storm/i,
        /winter.*weather/i
      ],
      guidance: "Explain how winter precipitation appears on radar and satellite. Discuss temperature profiles and precipitation types."
    }
  };

  if (!topic || !guidance[topic]) return null;

  const topicGuidance = guidance[topic];
  const matchesPattern = topicGuidance.patterns.some(pattern => pattern.test(userMessage));
  
  return matchesPattern ? topicGuidance.guidance : null;
}

export default openai;