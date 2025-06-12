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

    return (
      <div style={{ 
        marginTop: '12px', 
        padding: '16px', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>🌤️</div>
          <div>
            <div style={{ fontWeight: '600', color: '#111827' }}>{locationName}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>{temp}°F</div>
            <div style={{ color: '#6b7280', textTransform: 'capitalize' }}>{description}</div>
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

          {/* Chat history */}
          <div style={{ flex: 1, padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
              Previous conversations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                Today's weather forecast
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                Weekend plans check
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                padding: '8px', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                Storm warning alerts
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
                    AI Weather Assistant
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
                      
                      {message.weatherData && (
                        <WeatherCard weatherData={message.weatherData} />
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
                      <span style={{ marginLeft: '8px' }}>WeatherGPT is thinking...</span>
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
              <form onSubmit={sendMessage}>
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
                        sendMessage(e);
                      }
                    }}
                    placeholder="Ask about weather conditions, forecasts, or anything weather-related..."
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
              
              {/* Suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {[
                  "What's the weather like today?",
                  "Will it rain tomorrow?",
                  "Should I bring an umbrella?",
                  "Weekend forecast"
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
                WeatherGPT can make mistakes. Verify important weather information with official sources.
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