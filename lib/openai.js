// lib/openai.js - Fixed with text-based friendly formatting
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

  const systemPrompt = `You are a friendly, enthusiastic weather assistant and meteorology educator!

${contextInfo}

Weather Data Context: ${JSON.stringify(weatherData, null, 2)}

RESPONSE STYLE REQUIREMENTS:
- Be conversational, friendly, and enthusiastic about weather
- Write in short, digestible paragraphs (2-3 sentences max per paragraph)
- NEVER use asterisks (*) for emphasis - use descriptive language instead
- Use bullet points or numbered lists when explaining multiple concepts
- Sound like you're talking to a friend, not writing a textbook
- Make complex topics feel approachable and exciting
- Use simple symbols and text formatting instead of special characters

FORMATTING GUIDELINES:
- Start responses with enthusiasm and friendliness
- Break long explanations into short paragraphs
- Use clear headers like ">> RADAR BASICS:" for sections
- End with encouragement or next steps
- Replace technical jargon with friendly explanations
- Use simple text symbols: >> << -- === *** for visual breaks

EDUCATIONAL INSTRUCTIONS:
- If this is an educational query, act as an excited weather teacher
- Break down complex concepts into bite-sized, easy chunks
- If educational images are available, specifically mention them with enthusiasm
- Tell users exactly what to look for in weather imagery
- Use analogies and real-world comparisons to make concepts stick
- Focus on practical, useful knowledge they can apply

WEATHER REPORTING INSTRUCTIONS:
- If reporting current weather, be descriptive and paint a picture
- If there are weather alerts, lead with safety first (use clear warnings)
- If user asked about a specific location, acknowledge it clearly
- If location was switched, briefly mention the change

Examples of friendly formatting:
BAD: "The temperature is 75°F with humidity at 60% and wind speeds of 15 mph."
GOOD: "It's a lovely 75°F out there! The humidity is sitting at a comfortable 60%, and there's a nice 15 mph breeze to keep things fresh. Perfect weather for being outside!"

BAD: "*Radar reflectivity shows precipitation intensity*"
GOOD: ">> RADAR COLORS EXPLAINED: Let me break down radar reflectivity for you! This colorful display shows how heavy the precipitation is..."

Remember: Weather should be exciting and approachable, not intimidating! Use clear, simple language that anyone can understand.`;

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
        max_tokens: 1000, // Increased for more detailed friendly responses
        temperature: 0.8, // Slightly higher for more personality
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
          fallback: "I'm having trouble connecting to the AI service right now! Please try again in a moment."
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
      guidance: "Make this exciting! Focus on the detective work of tornado spotting. Break down radar signatures into simple, visual terms. Compare patterns to everyday objects they'd recognize."
    },
    hurricane: {
      patterns: [
        /hurricane.*structure/i,
        /eye.*wall/i,
        /satellite.*image/i,
        /spiral.*band/i
      ],
      guidance: "Hurricane structure is like nature's architecture! Compare parts to familiar things (eye = calm center of a sports stadium, eyewall = walls of the stadium with the loudest fans). Make it visual and memorable."
    },
    radar_reading: {
      patterns: [
        /how.*read.*radar/i,
        /radar.*color/i,
        /reflectivity/i,
        /velocity/i
      ],
      guidance: "Radar is like weather vision! Relate colors to everyday intensity levels (green = light sprinkle, yellow = steady rain you'd need an umbrella for, red = stay inside weather). Make it practical and relatable."
    },
    thunderstorm: {
      patterns: [
        /supercell/i,
        /storm.*structure/i,
        /updraft/i,
        /downdraft/i
      ],
      guidance: "Storms are like atmospheric skyscrapers! Compare updrafts/downdrafts to elevators. Make storm types sound like different personalities or characters."
    },
    winter_weather: {
      patterns: [
        /snow.*radar/i,
        /ice.*storm/i,
        /winter.*weather/i
      ],
      guidance: "Winter weather is nature's art! Explain how different temperatures create different 'flavors' of winter precipitation. Make temperature profiles relatable to cooking or baking analogies."
    }
  };

  if (!topic || !guidance[topic]) return null;

  const topicGuidance = guidance[topic];
  const matchesPattern = topicGuidance.patterns.some(pattern => pattern.test(userMessage));
  
  return matchesPattern ? topicGuidance.guidance : null;
}

export default openai;