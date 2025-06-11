import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, CloudRain, Sun, AlertTriangle, Bell, BellOff, MapPin, 
  Thermometer, Wind, Eye, Droplets, Zap, Brain, Search, Send 
} from 'lucide-react';

const WeatherBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your AI Weather Assistant powered by GPT-4 and real-time weather data. I can provide professional forecasts, severe weather analysis, and weather education. What would you like to know about the weather?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef(null);

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      scrollToBottom();
    }
  }, [messages, isClient]);

  useEffect(() => {
    if (isClient) {
      // Try to get user's location on component mount
      getUserLocation();
    }
  }, [isClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getUserLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            name: "Your Location"
          });
        },
        (error) => {
          console.log("Location access denied or unavailable");
        }
      );
    }
  };

  const searchLocations = async (query) => {
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/weather?type=search&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setLocationResults(data.data);
      }
    } catch (error) {
      console.error('Location search error:', error);
    }
  };

  const selectLocation = (location) => {
    setUserLocation({
      lat: location.lat,
      lon: location.lon,
      name: location.displayName
    });
    setShowLocationSearch(false);
    setLocationSearch('');
    setLocationResults([]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsThinking(true);

    try {
      // Prepare conversation history
      const conversationHistory = messages.slice(-4).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          location: userLocation,
          conversationHistory
        }),
      });

      const data = await response.json();
      setIsThinking(false);
      setIsTyping(true);

      // Simulate typing delay
      setTimeout(() => {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.response || data.fallback || "I'm having trouble processing your request. Please try again.",
          timestamp: new Date(),
          weatherData: data.weatherData
        };

        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      setIsThinking(false);
      setIsTyping(false);
      console.error('Chat error:', error);
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm experiencing technical difficulties. Please check your connection and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const formatTime = (date) => {
    if (!isClient) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const WeatherCard = ({ weatherData }) => {
    if (!weatherData?.current) return null;

    const { current } = weatherData;
    
    return (
      <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-blue-900">Current Conditions</h4>
          <span className="text-xs text-blue-600">{current.location}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Thermometer className="w-4 h-4 text-red-500" />
            <span>{current.temperature}°F (feels like {current.feelsLike}°F)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Wind className="w-4 h-4 text-blue-500" />
            <span>{current.windSpeed} mph {current.windDirection}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>{current.humidity}% humidity</span>
          </div>
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span>{current.visibility || 'N/A'} mi visibility</span>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-blue-800 capitalize">
          {current.description}
        </div>
      </div>
    );
  };

  // Don't render anything until client-side
  if (!isClient) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Weather Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <Cloud className="w-6 h-6 mr-1" />
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold">AI Weather Assistant</h1>
            <span className="bg-white/20 text-xs px-2 py-1 rounded">GPT-4 Powered</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowLocationSearch(!showLocationSearch)}
              className="flex items-center space-x-1 text-sm hover:bg-white/10 px-2 py-1 rounded"
            >
              <MapPin className="w-4 h-4" />
              <span>{userLocation?.name || 'Set Location'}</span>
            </button>
            <div className="text-xs">
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Real-time Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Search */}
        {showLocationSearch && (
          <div className="mt-3 relative">
            <div className="flex space-x-2">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  searchLocations(e.target.value);
                }}
                placeholder="Search for a city or location..."
                className="flex-1 px-3 py-2 text-gray-800 rounded border"
              />
              <button
                onClick={() => setShowLocationSearch(false)}
                className="px-3 py-2 bg-white/20 rounded hover:bg-white/30"
              >
                Cancel
              </button>
            </div>
            
            {locationResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white text-gray-800 rounded shadow-lg border max-h-40 overflow-y-auto z-10">
                {locationResults.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => selectLocation(location)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                  >
                    {location.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="whitespace-pre-line text-sm">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {formatTime(message.timestamp)}
              </div>
              
              {message.weatherData && (
                <WeatherCard weatherData={message.weatherData} />
              )}
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 animate-pulse" />
                <span className="text-sm">AI analyzing weather data...</span>
              </div>
            </div>
          </div>
        )}
        
        {isTyping && !isThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about weather, forecasts, or weather education..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTyping || isThinking}
          />
          <button
            onClick={handleSendMessage}
            disabled={isTyping || isThinking || !input.trim()}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          AI-powered weather analysis • Real-time data • GPT-4 intelligence
        </div>
      </div>
    </div>
  );
};

export default WeatherBot;