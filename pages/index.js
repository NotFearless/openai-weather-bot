import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI weather assistant. Ask me about current conditions, forecasts, or request visual weather images!',
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

  const sendMessage = async (messageText = null, includeImages = true) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          location: location,
          conversationHistory: messages.slice(-6).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          includeImages: includeImages
        })
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          weatherData: data.weatherData,
          images: data.images,
          hasImages: data.hasImages
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  // Helper function for weather emojis
  const getWeatherEmoji = (condition) => {
    const emojiMap = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '🌨️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️'
    };
    return emojiMap[condition] || '🌤️';
  };

  // Enhanced Weather Card Component
  const EnhancedWeatherCard = ({ weatherData, images }) => {
    if (!weatherData?.current) return null;

    const temp = Math.round(weatherData.current.main?.temp || 0);
    const description = weatherData.current.weather?.[0]?.description || '';
    const locationName = weatherData.current.name || '';
    const humidity = weatherData.current.main?.humidity || 0;
    const windSpeed = Math.round(weatherData.current.wind?.speed || 0);
    const feelsLike = Math.round(weatherData.current.main?.feels_like || 0);

    return (
      <div style={{ 
        marginTop: '16px', 
        border: '1px solid #e5e7eb', 
        borderRadius: '12px', 
        backgroundColor: 'white',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Weather Scene Image */}
        {images?.weatherScene?.success && (
          <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
            <img 
              src={images.weatherScene.imageUrl}
              alt={`Weather scene showing ${description}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.1))'
            }} />
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{temp}°F</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Feels like {feelsLike}°F</div>
            </div>
          </div>
        )}

        {/* Weather Details */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {locationName}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', textTransform: 'capitalize' }}>
                {description}
              </div>
            </div>
            {!images?.weatherScene?.success && (
              <div style={{ fontSize: '48px' }}>
                {getWeatherEmoji(weatherData.current.weather?.[0]?.main)}
              </div>
            )}
          </div>

          {/* Weather Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Humidity</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{humidity}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Wind</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{windSpeed} mph</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Feels Like</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{feelsLike}°F</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Forecast Chart Component
  const ForecastChart = ({ images, forecastData }) => {
    if (!images?.forecastChart?.success && !forecastData) return null;

    return (
      <div style={{ 
        marginTop: '16px', 
        border: '1px solid #e5e7eb', 
        borderRadius: '12px', 
        backgroundColor: 'white',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            5-Day Forecast
          </h3>
        </div>

        {images?.forecastChart?.success ? (
          <div style={{ padding: '16px' }}>
            <img 
              src={images.forecastChart.imageUrl}
              alt="5-day weather forecast chart"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px'
              }}
            />
          </div>
        ) : (
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {images?.forecastChart?.fallbackChart || 'Forecast data not available'}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Weather Image Request Buttons
  const WeatherImageButtons = ({ onImageRequest }) => {
    const buttons = [
      { id: 'scene', label: '📸 Show Current Scene', prompt: 'Show me a visual of the current weather' },
      { id: 'forecast', label: '📊 Forecast Chart', prompt: 'Create a visual forecast chart for the week' },
      { id: 'map', label: '🗺️ Weather Map', prompt: 'Show me a weather map of my area' }
    ];

    return (
      <div style={{ 
        marginTop: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {buttons.map(button => (
          <button
            key={button.id}
            onClick={() => onImageRequest(button.prompt)}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '20px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
    );
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI weather assistant. Ask me about current conditions, forecasts, or request visual weather images!',
      timestamp: new Date()
    }]);
  };

  return (
    <>
      <Head>
        <title>WeatherGPT</title>
        <meta name="description" content="AI-powered weather assistant with image generation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
        {/* Sidebar */}
        <div style={{ 
          width: '260px', 
          backgroundColor: '#111827', 
          color: 'white', 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
            <button
              onClick={clearChat}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '16px' }}>+</span>
              New chat
            </button>
          </div>

          {/* Features List */}
          <div style={{ flex: 1, padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
              AI Weather Features
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px' 
              }}>
                📸 Weather Scene Images
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px' 
              }}>
                📊 Visual Forecasts
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px' 
              }}>
                🗺️ Weather Maps
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px' 
              }}>
                💬 Smart Weather Chat
              </div>
            </div>
          </div>

          {/* User info */}
          <div style={{ padding: '16px', borderTop: '1px solid #374151' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: '#3b82f6', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>U</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>Weather User</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {location ? '📍 Location detected' : 'Getting location...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ 
            backgroundColor: 'white', 
            borderBottom: '1px solid #e5e7eb', 
            padding: '16px 24px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#10b981', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <span style={{ color: 'white', fontSize: '16px' }}>⚡</span>
                </div>
                <div>
                  <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    WeatherGPT
                  </h1>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    AI Weather Assistant with Visual Generation
                  </p>
                </div>
              </div>
              
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {location ? '📍 Location enabled' : locationError}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px' }}>
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  style={{ 
                    marginBottom: '24px', 
                    display: 'flex', 
                    gap: '16px',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  {/* Avatar */}
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0,
                    backgroundColor: message.role === 'user' ? '#3b82f6' : '#10b981'
                  }}>
                    {message.role === 'user' ? (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>U</span>
                    ) : (
                      <span style={{ color: 'white', fontSize: '14px' }}>⚡</span>
                    )}
                  </div>

                  {/* Message content */}
                  <div style={{ flex: 1, maxWidth: 'none' }}>
                    <div style={{ 
                      color: message.isError ? '#dc2626' : '#111827',
                      lineHeight: '1.6'
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                      
                      {/* Enhanced Weather Card */}
                      {message.weatherData && (
                        <EnhancedWeatherCard 
                          weatherData={message.weatherData} 
                          images={message.images || {}} 
                        />
                      )}

                      {/* Forecast Chart */}
                      {message.images?.forecastChart && (
                        <ForecastChart 
                          images={message.images} 
                          forecastData={message.weatherData?.forecast}
                        />
                      )}

                      {/* Weather Image Request Buttons */}
                      {message.role === 'assistant' && location && !message.isError && (
                        <WeatherImageButtons onImageRequest={sendMessage} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    backgroundColor: '#10b981', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <span style={{ color: 'white', fontSize: '14px' }}>⚡</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: '#9ca3af', 
                        borderRadius: '50%', 
                        animation: 'pulse 1.5s ease-in-out infinite' 
                      }}></div>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: '#9ca3af', 
                        borderRadius: '50%', 
                        animation: 'pulse 1.5s ease-in-out infinite',
                        animationDelay: '0.2s'
                      }}></div>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: '#9ca3af', 
                        borderRadius: '50%', 
                        animation: 'pulse 1.5s ease-in-out infinite',
                        animationDelay: '0.4s'
                      }}></div>
                      <span style={{ marginLeft: '8px' }}>WeatherGPT is generating your response...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div style={{ 
            backgroundColor: 'white', 
            borderTop: '1px solid #e5e7eb', 
            padding: '16px 24px' 
          }}>
            <div style={{ maxWidth: '768px', margin: '0 auto' }}>
              <form onSubmit={handleFormSubmit}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'end', 
                  gap: '12px', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  backgroundColor: 'white' 
                }}>
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFormSubmit(e);
                      }
                    }}
                    placeholder="Ask about weather conditions, forecasts, or request visual weather images..."
                    style={{
                      flex: 1,
                      resize: 'none',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      minHeight: '24px',
                      maxHeight: '128px',
                      fontFamily: 'inherit',
                      fontSize: '14px'
                    }}
                    rows={1}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    style={{
                      padding: '8px',
                      backgroundColor: '#111827',
                      color: 'white',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                      opacity: isLoading || !inputMessage.trim() ? 0.5 : 1
                    }}
                  >
                    {isLoading ? (
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid white', 
                        borderTop: '2px solid transparent', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                      }}></div>
                    ) : (
                      <span>→</span>
                    )}
                  </button>
                </div>
              </form>
              
              {/* Enhanced Suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {[
                  "What's the weather like today?",
                  "📸 Show me current weather scene",
                  "📊 Create forecast chart",
                  "🗺️ Weather map view"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(suggestion)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.5 : 1
                    }}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              <p style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                marginTop: '12px', 
                textAlign: 'center', 
                margin: '12px 0 0 0' 
              }}>
                WeatherGPT can generate AI images and make mistakes. Verify important weather information with official sources.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}