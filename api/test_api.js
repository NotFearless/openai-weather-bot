module.exports = function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Test API called:', req.method, req.body);

  if (req.method === 'POST') {
    return res.status(200).json({ 
      reply: "Test API is working! Your backend connection is successful.",
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({ 
    message: "Test API is running",
    method: req.method,
    timestamp: new Date().toISOString()
  });
};