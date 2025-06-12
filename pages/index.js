// pages/index.js - Fixed version without empty stats box
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { EducationalImageGallery, RadarImageDisplay } from '../components/EducationalWeatherImages';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI weather assistant. Ask me about current conditions, forecasts, or request visual weather images! I can also help you learn about weather patterns with real radar and satellite imagery.',
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

  // Clear chat function
  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI weather assistant. Ask me about current conditions, forecasts, or request visual weather images! I can also help you learn about weather patterns with real radar and satellite imagery.',
      timestamp: new Date()
    }]);
  };

  // Send message function
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
          hasImages: data.hasImages,
          isEducational: data.isEducational,
          educationalTopic: data.educationalTopic
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

  // Updated Weather Image Request Buttons with Educational Options
  const WeatherImageButtons = ({ onImageRequest }) => {
    const buttons = [
      { id: 'scene', label: '📸 Current Scene', prompt: 'Show me a visual of the current weather' },
      { id: 'radar', label: '📡 Live Radar', prompt: 'Show me the current radar for my area' },
      { id: 'forecast', label: '📊 Forecast Chart', prompt: 'Create a visual forecast chart for the week' },
      { id: 'education', label: '📚 Weather Education', prompt: 'How do I read weather radar?' },
      { id: 'tornado', label: '🌪️ Tornado Radar', prompt: 'Show me how to identify tornadoes on radar' },
      { id: 'satellite', label: '🛰️ Satellite View', prompt: 'Show me satellite imagery of my area' }
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

  // Updated message rendering to include educational context
  const renderMessage = (message, index) => (
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
          <span style={{ color: 'white', fontSize: '14px' }}>
            {message.isEducational ? '📚' : '⚡'}
          </span>
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
          
          {/* Simple Image Display Only - NO STATS BOX */}
          {message.images && Object.keys(message.images).length > 0 && (
            <div style={{ marginTop: '16px' }}>
              {/* Weather Scene Image */}
              {message.images.weatherScene?.success && (
                <div style={{ 
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <img 
                    src={message.images.weatherScene.imageUrl}
                    alt="AI generated weather scene"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}

              {/* Educational Images */}
              {message.isEducational && (
                <EducationalImageGallery 
                  images={message.images}
                  topic={message.educationalTopic}
                  isEducational={true}
                />
              )}

              {/* Radar Images */}
              {message.images.radar && message.images.radar.length > 0 && (
                <RadarImageDisplay 
                  radarImages={message.images.radar} 
                  location={location}
                />
              )}
            </div>
          )}

          {/* Standalone Educational Images (when no weather data) */}
          {message.isEducational && message.images && !message.weatherData && (
            <EducationalImageGallery 
              images={message.images}
              topic={message.educationalTopic}
              isEducational={true}
            />
          )}

          {/* Weather Image Request Buttons */}
          {message.role === 'assistant' && location && !message.isError && (
            <WeatherImageButtons onImageRequest={sendMessage} />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>WeatherGPT - AI Weather Assistant with Education</title>
        <meta name="description" content="AI-powered weather assistant with educational radar and satellite imagery" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
        {/* Sidebar with Enhanced Features */}
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

          {/* Features List - Enhanced */}
          <div style={{ flex: 1, padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
              AI Weather Features
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '14px', color: '#d1d5db', padding: '8px', borderRadius: '4px' }}>
                📡 Live Radar & Satellite
              </div>
              <div style={{ fontSize: '14px', color: '#d1d5db', padding: '8px', borderRadius: '4px' }}>
                📚 Weather Education
              </div>
              <div style={{ fontSize: '14px', color: '#d1d5db', padding: '8px', borderRadius: '4px' }}>
                🌪️ Tornado Detection
              </div>
              <div style={{ fontSize: '14px', color: '#d1d5db', padding: '8px', borderRadius: '4px' }}>
                📸 Weather Scene Images
              </div>
              <div style={{ fontSize: '14px', color: '#d1d5db', padding: '8px', borderRadius: '4px' }}>
                📊 Visual Forecasts
              </div>
              <div style={{ fontSize: '14px', color: '#d1d5db', padding: '8px', borderRadius: '4px' }}>
                💬 Smart Weather Chat
              </div>
            </div>

            {/* Educational Quick Access */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                Quick Learning
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { label: 'Radar Basics', prompt: 'How do I read weather radar?' },
                  { label: 'Tornado Signs', prompt: 'Show me tornado radar signatures' },
                  { label: 'Hurricane Structure', prompt: 'Explain hurricane anatomy with images' },
                  { label: 'Storm Types', prompt: 'What are different types of thunderstorms?' }
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(item.prompt)}
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {item.label}
                  </button>
                ))}
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
                <div style={{ fontSize: '14px', fontWeight: '500' }}>Weather Student</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {location ? '📍 Location detected' : 'Getting location...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar - Enhanced */}
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
                    WeatherGPT Educational
                  </h1>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    AI Weather Assistant with Real Radar & Educational Images
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {location ? '📍 Location enabled' : locationError}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#059669',
                  backgroundColor: '#d1fae5',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: '500'
                }}>
                  📚 Education Mode
                </div>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px' }}>
              {messages.map((message, index) => renderMessage(message, index))}
              
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
                      <span style={{ marginLeft: '8px' }}>
                        WeatherGPT is analyzing weather data and finding educational images...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area - Enhanced */}
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
                    placeholder="Ask about weather, request radar images, or learn about weather patterns..."
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
              
              {/* Enhanced Suggestions with Educational Options */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {[
                  "What's the weather like today?",
                  "📡 Show me current radar",
                  "📚 How do I read radar for tornadoes?",
                  "🌪️ Explain tornado radar signatures",
                  "🛰️ Show satellite imagery",
                  "📊 Create forecast chart"
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
                WeatherGPT Educational • Real radar & satellite imagery • AI-powered weather learning
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