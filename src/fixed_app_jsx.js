import React, { useState } from 'react';

export default function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Welcome to Storm AI! Ask me about the weather in your area.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          location: "unknown",  // can be replaced with real location
          knowledgeLevel: "beginner" // can be updated later
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const botReply = { sender: 'bot', text: data.reply || "Sorry, I couldn't get a response." };
      setMessages(prev => [...prev, botReply]);
    } catch (err) {
      console.error('API Error:', err);
      const errorReply = { sender: 'bot', text: "Error: Failed to connect to Storm AI backend. Please check your connection and try again." };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }

    setInput('');
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h1>Storm AI</h1>
      <div style={{ border: '1px solid #ccc', padding: '1rem', minHeight: '200px', marginBottom: '1rem' }}>
        {messages.map((msg, i) => (
          <p key={i}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
        {loading && <p><em>Storm AI is thinking...</em></p>}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
        placeholder="Type your weather question..."
        style={{ width: '80%', marginRight: '1rem' }}
        disabled={loading}
      />
      <button onClick={handleSend} disabled={loading || !input.trim()}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}