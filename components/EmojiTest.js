// components/EmojiTest.js - Test component to verify emoji support
import React from 'react';

const EmojiTest = () => {
  const testEmojis = {
    weather: {
      '☀️': 'Sunny',
      '⛅': 'Partly Cloudy', 
      '☁️': 'Cloudy',
      '🌧️': 'Rain',
      '⛈️': 'Storm',
      '❄️': 'Snow',
      '🌫️': 'Fog',
      '💨': 'Wind',
      '🔥': 'Hot',
      '🧊': 'Cold'
    },
    educational: {
      '📚': 'Books/Education',
      '🔍': 'Magnifying Glass',
      '📡': 'Radar',
      '🛰️': 'Satellite',
      '🌪️': 'Tornado',
      '🌀': 'Hurricane',
      '⚡': 'Lightning'
    },
    interface: {
      '⚠️': 'Warning',
      '📍': 'Location',
      '⭐': 'Star',
      '✨': 'Sparkles',
      '✅': 'Check',
      '❌': 'Cross',
      '➡️': 'Arrow'
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f9fafb', 
      borderRadius: '8px',
      margin: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#111827' }}>
        ✨ Emoji Support Test
      </h2>
      
      <p style={{ marginBottom: '20px', color: '#6b7280' }}>
        If you see question marks (?) instead of emojis below, there's an encoding issue that needs to be fixed.
      </p>

      {Object.entries(testEmojis).map(([category, emojis]) => (
        <div key={category} style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#374151',
            marginBottom: '12px',
            textTransform: 'capitalize'
          }}>
            {category} Emojis:
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {Object.entries(emojis).map(([emoji, description]) => (
              <div 
                key={emoji}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={{ fontSize: '20px' }}>{emoji}</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {description}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ 
        marginTop: '24px', 
        padding: '16px',
        backgroundColor: '#eff6ff',
        borderRadius: '6px',
        border: '1px solid #bfdbfe'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>
          🧪 Test Results:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151' }}>
          <li>✅ If all emojis display correctly, your system supports UTF-8 emojis!</li>
          <li>❌ If you see question marks (?), try the UTF-8 fixes below.</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '16px', 
        padding: '16px',
        backgroundColor: '#fef3c7',
        borderRadius: '6px',
        border: '1px solid #fbbf24'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>
          🔧 Quick Fixes if Emojis Don't Work:
        </h4>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#78350f', fontSize: '14px' }}>
          <li>Add the next.config.js file to your project root</li>
          <li>Update your API files with the UTF-8 fixes</li>
          <li>Restart your development server</li>
          <li>Clear your browser cache</li>
        </ol>
      </div>
    </div>
  );
};

export default EmojiTest;