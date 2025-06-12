// lib/openai.js - Fixed with proper emoji encoding
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Safe emoji constants that work across all systems
const WEATHER_EMOJIS = {
  sunny: '☀️',
  partlyCloudy: '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  storm: '⛈️',
  snow: '❄️',
  fog: '🌫️',
  wind: '💨',
  hot: '🔥',
  cold: '🧊',
  umbrella: '☂️',
  thermometer: '🌡️',
  
  // Educational emojis
  books: '📚',
  magnify: '🔍',
  radar: '📡',
  satellite: '🛰️',
  tornado: '🌪️',
  hurricane: '🌀',
  lightning: '⚡',
  
  // Interface emojis
  warning: '⚠️',
  location: '📍',
  star: '⭐',
  sparkles: '✨',
  check: '✅',
  cross: '❌',
  arrow: '➡️',
  
  // General weather
  rainbow: '🌈',
  sunrise: '🌅',
  sunset: '🌇',
  moon: '🌙',
  stars: '🌟'
};

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

  const systemPrompt = `You are a friendly, enthusiastic weather assistant and meteorology educator! ${WEATHER_EMOJIS.sunny}

${contextInfo}

Weather Data Context: ${JSON.stringify(weatherData, null, 2)}

CRITICAL RESPONSE RULES:
${WEATHER_EMOJIS.warning} NEVER say you will "gather information" or "look up data" or "check the weather" ${WEATHER_EMOJIS.warning}
${WEATHER_EMOJIS.warning} NEVER end responses with promises to do something later ${WEATHER_EMOJIS.warning}
${WEATHER_EMOJIS.check} ALWAYS provide a complete, helpful response immediately ${WEATHER_EMOJIS.check}
${WEATHER_EMOJIS.check} The weather data has ALREADY been gathered for you - use it! ${WEATHER_EMOJIS.check}

EMOJI USAGE GUIDELINES:
- Use weather emojis strategically to enhance readability
- Place emojis at the start of paragraphs or sections for visual breaks
- Use ${WEATHER_EMOJIS.sunny} for sunny/clear weather
- Use ${WEATHER_EMOJIS.rain} for rain/precipitation  
- Use ${WEATHER_EMOJIS.storm} for thunderstorms
- Use ${WEATHER_EMOJIS.snow} for snow/winter weather
- Use ${WEATHER_EMOJIS.wind} for windy conditions
- Use ${WEATHER_EMOJIS.books} for educational content
- Use ${WEATHER_EMOJIS.radar} for radar explanations
- Use ${WEATHER_EMOJIS.tornado} for tornado topics
- Use ${WEATHER_EMOJIS.warning} for alerts/warnings
- Use ${WEATHER_EMOJIS.location} for location references
- Use ${WEATHER_EMOJIS.star} for encouragement/closing

RESPONSE STYLE REQUIREMENTS:
- Be conversational, friendly, and enthusiastic about weather
- Write in short, digestible paragraphs (2-3 sentences max per paragraph)
- Use emojis strategically to break up text and add visual interest
- Use bullet points or numbered lists when explaining multiple concepts
- Sound like you're talking to a friend, not writing a textbook
- Make complex topics feel approachable and exciting

FORMATTING GUIDELINES:
- Start responses with enthusiasm and relevant emoji
- Break long explanations into short paragraphs
- Use emojis as section headers: "${WEATHER_EMOJIS.books} RADAR BASICS:"
- End with encouragement and emoji
- Replace technical jargon with friendly explanations
- Use simple text symbols with emojis: "${WEATHER_EMOJIS.arrow} Key Point:"

EDUCATIONAL INSTRUCTIONS:
- If this is an educational query, act as an excited weather teacher ${WEATHER_EMOJIS.books}
- Break down complex concepts into bite-sized, easy chunks
- If educational images are available, specifically mention them with enthusiasm
- Tell users exactly what to look for in weather imagery
- Use analogies and real-world comparisons to make concepts stick
- Focus on practical, useful knowledge they can apply

WEATHER REPORTING INSTRUCTIONS:
- If reporting current weather, be descriptive and paint a picture using the provided data
- If there are weather alerts, lead with safety first (use ${WEATHER_EMOJIS.warning})
- If user asked about a specific location, acknowledge it clearly with ${WEATHER_EMOJIS.location}
- If location was switched, briefly mention the change
- If weather data is missing, explain what you can't provide and offer alternatives

RESPONSE COMPLETION REQUIREMENTS:
- Every response must be complete and actionable
- If asked about weather, provide the weather information immediately
- If asked educational questions, provide the education immediately
- Never leave the user hanging or requiring a follow-up just to get basic information
- If you don't have specific data, say so clearly and explain what you do know

Examples of what TO do:
${WEATHER_EMOJIS.check} "${WEATHER_EMOJIS.sunny} Based on the current conditions in your area..."
${WEATHER_EMOJIS.check} "${WEATHER_EMOJIS.rain} Here's what the weather looks like right now..."
${WEATHER_EMOJIS.check} "${WEATHER_EMOJIS.books} Great question about radar! Let me explain how this works..."

Remember: The user expects a complete answer NOW, not a promise of information later! ${WEATHER_EMOJIS.star}`;

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
        max_tokens: 1200,
        temperature: 0.8,
      });

      console.log(`Model ${model} successful`);
      
      // Post-process response to ensure emojis are properly handled
      let response = completion.choices[0].message.content;
      response = ensureProperEmojiEncoding(response);
      
      return {
        success: true,
        response: response,
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
          fallback: `I'm having trouble connecting to the AI service right now! ${WEATHER_EMOJIS.cross} Please try again in a moment.`
        };
      }
      // Otherwise, try the next model
      continue;
    }
  }
}

// Function to ensure proper emoji encoding
function ensureProperEmojiEncoding(text) {
  // Replace common emoji question mark issues
  const emojiReplacements = {
    '?️': '☀️',  // Sunny
    '?️': '⛅',  // Partly cloudy  
    '?️': '☁️',  // Cloudy
    '?️': '🌧️', // Rain
    '?️': '⛈️', // Storm
    '?️': '❄️',  // Snow
    '?️': '🌫️', // Fog
    '?': '💨',   // Wind
    '?': '🔥',   // Hot
    '?': '🧊',   // Cold
    '?️': '☂️',  // Umbrella
    '?️': '🌡️', // Thermometer
    '?': '📚',   // Books
    '?': '🔍',   // Magnify
    '?': '📡',   // Radar
    '?️': '🛰️', // Satellite
    '?️': '🌪️', // Tornado
    '?': '🌀',   // Hurricane
    '?': '⚡',   // Lightning
    '?️': '⚠️',  // Warning
    '?': '📍',   // Location
    '?': '⭐',   // Star
    '?': '✨',   // Sparkles
    '?': '✅',   // Check
    '?': '❌',   // Cross
    '?️': '➡️',  // Arrow
    '?': '🌈',   // Rainbow
    '?': '🌅',   // Sunrise
    '?': '🌇',   // Sunset
    '?': '🌙',   // Moon
    '?': '🌟'    // Stars
  };

  let processed = text;
  
  // Replace question mark emojis with proper ones
  Object.entries(emojiReplacements).forEach(([broken, fixed]) => {
    processed = processed.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixed);
  });

  return processed;
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
      guidance: `Make this exciting! Focus on the detective work of tornado spotting. Use ${WEATHER_EMOJIS.tornado} and ${WEATHER_EMOJIS.radar} emojis. Break down radar signatures into simple, visual terms. Compare patterns to everyday objects they'd recognize. Provide complete explanations immediately.`
    },
    hurricane: {
      patterns: [
        /hurricane.*structure/i,
        /eye.*wall/i,
        /satellite.*image/i,
        /spiral.*band/i
      ],
      guidance: `Hurricane structure is like nature's architecture! Use ${WEATHER_EMOJIS.hurricane} and ${WEATHER_EMOJIS.satellite} emojis. Compare parts to familiar things (eye = calm center of a sports stadium, eyewall = walls of the stadium with the loudest fans). Make it visual and memorable. Give complete information immediately.`
    },
    radar_reading: {
      patterns: [
        /how.*read.*radar/i,
        /radar.*color/i,
        /reflectivity/i,
        /velocity/i
      ],
      guidance: `Radar is like weather vision! Use ${WEATHER_EMOJIS.radar} and ${WEATHER_EMOJIS.magnify} emojis. Relate colors to everyday intensity levels (green = light sprinkle, yellow = steady rain you'd need an umbrella for, red = stay inside weather). Make it practical and relatable. Provide full explanation immediately.`
    },
    thunderstorm: {
      patterns: [
        /supercell/i,
        /storm.*structure/i,
        /updraft/i,
        /downdraft/i
      ],
      guidance: `Storms are like atmospheric skyscrapers! Use ${WEATHER_EMOJIS.storm} and ${WEATHER_EMOJIS.lightning} emojis. Compare updrafts/downdrafts to elevators. Make storm types sound like different personalities or characters. Give complete details immediately.`
    },
    winter_weather: {
      patterns: [
        /snow.*radar/i,
        /ice.*storm/i,
        /winter.*weather/i
      ],
      guidance: `Winter weather is nature's art! Use ${WEATHER_EMOJIS.snow} and ${WEATHER_EMOJIS.cold} emojis. Explain how different temperatures create different 'flavors' of winter precipitation. Make temperature profiles relatable to cooking or baking analogies. Provide full information immediately.`
    }
  };

  if (!topic || !guidance[topic]) return null;

  const topicGuidance = guidance[topic];
  const matchesPattern = topicGuidance.patterns.some(pattern => pattern.test(userMessage));
  
  return matchesPattern ? topicGuidance.guidance : null;
}

export default openai;