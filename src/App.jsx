import React, { useState } from 'react';

export default function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Welcome to Storm AI! Ask me about the weather in your area.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: 'user', text: input }];

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

      const data = await res.json();
      const botReply = { sender: 'bot', text: data.reply || "Sorry, I couldn't get a response." };
      setMessages([...newMessages, botReply]);
    } catch (err) {
      const errorReply = { sender: 'bot', text: "Error: Failed to connect to Storm AI backend." };
      setMessages([...newMessages, errorReply]);
    }

    setInput('');
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h1>Storm AI</h1>
      <div style={{ border: '1px solid #ccc', padding: '1rem', minHeight: '200px' }}>
        {messages.map((msg, i) => (
          <p key={i}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type your question..."
        style={{ width: '80%', marginRight: '1rem' }}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
