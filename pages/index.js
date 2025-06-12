import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI weather assistant. Ask me about current conditions, forecasts, or any weather-related questions!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationError('');
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError('Location access denied. Weather data may be limited.');
        }
      );
    } else {
      setLocationError('Geolocation not supported by this browser.');
    }
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          location: location,
          conversationHistory: messages.slice(-6).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          weatherData: data.weatherData
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const WeatherCard = ({ weatherData }) => {
    if (!weatherData?.current) return null;

    const temp = Math.round(weatherData.current.main?.temp || 0);
    const description = weatherData.current.weather?.[0]?.description || '';
    const locationName = weatherData.current.name || '';
    const humidity = weatherData.current.main?.humidity || 0;
    const windSpeed = Math.round(weatherData.current.wind?.speed || 0);

    return (
      <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🌤️</div>
            <div>
              <div className="font-semibold text-gray-900">{locationName}</div>
              <div className="text-2xl font-bold text-gray-900">{temp}°F</div>
              <div className="text-gray-600 capitalize">{description}</div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Humidity: {humidity}%</div>
            <div>Wind: {windSpeed} mph</div>
          </div>
        </div>
      </div>
    );
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI weather assistant. Ask me about current conditions, forecasts, or any weather-related questions!',
      timestamp: new Date()
    }]);
  };

  return (
    <>
      <Head>
        <title>WeatherGPT</title>
        <meta name="description" content="AI-powered weather assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={clearChat}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          {/* Chat history placeholder */}
          <div className="flex-1 p-4">
            <div className="text-xs text-gray-400 mb-2">Previous conversations</div>
            <div className="space-y-2">
              <div className="text-sm text-gray-300 p-2 rounded hover:bg-gray-800 cursor-pointer">Today's weather forecast</div>
              <div className="text-sm text-gray-300 p-2 rounded hover:bg-gray-800 cursor-pointer">Weekend plans check</div>
              <div className="text-sm text-gray-300 p-2 rounded hover:bg-gray-800 cursor-pointer">Storm warning alerts</div>
            </div>
          </div>

          {/* User info */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">U</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Weather User</div>
                <div className="text-xs text-gray-400">
                  {location ? '📍 Location detected' : 'Getting location...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">WeatherGPT</h1>
                  <p className="text-sm text-gray-500">AI Weather Assistant</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-500">
                  {location ? '📍 Location enabled' : locationError}
                </div>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {messages.map((message, index) => (
                <div key={index} className={`mb-6 flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-green-600'
                  }`}>
                    {message.role === 'user' ? (
                      <span className="text-white text-sm font-medium">U</span>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 max-w-none">
                    <div className={`prose prose-slate max-w-none ${
                      message.isError ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                      
                      {message.weatherData && (
                        <WeatherCard weatherData={message.weatherData} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="mb-6 flex gap-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-gray-500">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      <span className="ml-2">WeatherGPT is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={sendMessage} className="relative">
                <div className="flex items-end gap-3 p-3 border border-gray-300 rounded-lg bg-white focus-within:border-gray-400 transition-colors">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Ask about weather conditions, forecasts, or anything weather-related..."
                    className="flex-1 resize-none border-none outline-none bg-transparent min-h-[24px] max-h-32"
                    rows={1}
                    disabled={isLoading}
                    style={{
                      height: 'auto',
                      minHeight: '24px'
                    }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="p-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
              
              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  "What's the weather like today?",
                  "Will it rain tomorrow?",
                  "Should I bring an umbrella?",
                  "Weekend forecast"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(suggestion)}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-200"
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-3 text-center">
                WeatherGPT can make mistakes. Verify important weather information with official sources.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}