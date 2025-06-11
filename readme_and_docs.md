# AI Weather Bot 🌤️🤖

A professional AI-powered weather assistant built with GPT-4, real-time weather data, and deployed on Vercel. Get intelligent weather forecasts, severe weather analysis, and comprehensive weather education.

## 🚀 Features

- **GPT-4 Powered**: Intelligent weather analysis and explanations
- **Real-time Data**: Live weather conditions from OpenWeatherMap API
- **Location Search**: Find weather for any city worldwide
- **Educational**: Learn about weather phenomena and meteorology
- **Responsive Design**: Works on desktop and mobile devices
- **Professional Forecasts**: Detailed analysis with confidence levels

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **AI**: OpenAI GPT-4 API
- **Weather Data**: OpenWeatherMap API
- **Deployment**: Vercel
- **Icons**: Lucide React

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Git installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- OpenWeatherMap API key ([Get one here](https://openweathermap.org/api))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-weather-bot.git
cd ai-weather-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
OPENAI_API_KEY=sk-your-openai-key-here
WEATHER_API_KEY=your-openweathermap-key-here
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app!

## 🌐 Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `WEATHER_API_KEY`: Your OpenWeatherMap API key

### 3. Configure Vercel Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the required variables for all environments (Production, Preview, Development)

## 📁 Project Structure

```
ai-weather-bot/
├── README.md                 # This file
├── package.json             # Dependencies and scripts
├── vercel.json              # Vercel configuration
├── .env.example             # Environment variables template
├── .env.local               # Your environment variables (not in git)
├── .gitignore               # Git ignore rules
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── pages/
│   ├── index.js            # Home page
│   └── api/
│       ├── chat.js         # GPT-4 chat endpoint
│       └── weather.js      # Weather data endpoint
├── components/
│   └── WeatherBot.js       # Main chat component
├── lib/
│   ├── openai.js          # OpenAI integration
│   └── weather.js         # Weather API integration
└── styles/
    └── globals.css        # Global styles
```

## 🔧 API Endpoints

### `/api/chat` (POST)
Main chat endpoint for GPT-4 interactions.

**Request:**
```json
{
  "message": "What's the weather like?",
  "location": {
    "lat": 32.7767,
    "lon": -96.7970,
    "name": "Dallas, TX"
  },
  "conversationHistory": []
}
```

**Response:**
```json
{
  "response": "Current weather in Dallas...",
  "weatherData": {...},
  "usage": {...}
}
```

### `/api/weather` (GET)
Weather data endpoint.

**Parameters:**
- `type`: `current`, `forecast`, or `search`
- `lat`, `lon`: Coordinates (for current/forecast)
- `q`: Search query (for search)

## 🤖 AI Capabilities

The bot can help with:

- **Current Conditions**: Real-time weather analysis
- **Forecasts**: Multi-day weather predictions
- **Severe Weather**: Storm analysis and safety advice
- **Education**: Weather phenomena explanations
- **Location-based**: Weather for any global location

## 🎯 Example Queries

- "What's the current weather in New York?"
- "Will it rain tomorrow in Los Angeles?"
- "Explain how tornadoes form"
- "What's the heat index and why is it important?"
- "Show me the forecast for this weekend"
- "Is there any severe weather expected?"

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for GPT-4 | Yes |
| `WEATHER_API_KEY` | Your OpenWeatherMap API key | Yes |
| `NEXTAUTH_URL` | Your application URL | Yes |

## 📱 Features in Detail

### Real-time Weather Data
- Current conditions with temperature, humidity, wind
- 5-day/3-hour forecasts
- Location search and autocomplete
- Weather alerts and warnings

### AI Intelligence
- Context-aware conversations
- Educational explanations
- Safety recommendations
- Professional meteorological analysis

### User Experience
- Clean, modern interface
- Mobile-responsive design
- Location detection
- Typing indicators
- Real-time updates

## 🛠️ Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**API Key Errors:**
- Ensure your API keys are correctly set in environment variables
- Check that your OpenAI account has sufficient credits
- Verify your OpenWeatherMap API key is active

**Build Errors:**
- Make sure you're using Node.js 18+
- Clear cache: `rm -rf .next node_modules && npm install`
- Check for syntax errors in your code

**Deployment Issues:**
- Verify environment variables are set in Vercel dashboard
- Check build logs in Vercel for specific errors
- Ensure all dependencies are properly listed in package.json

### Getting Help

- Check the [Issues](https://github.com/yourusername/ai-weather-bot/issues) page
- Review Next.js [documentation](https://nextjs.org/docs)
- Check OpenAI [API documentation](https://platform.openai.com/docs)
- Review OpenWeatherMap [API documentation](https://openweathermap.org/api)

## 🙏 Acknowledgments

- OpenAI for the powerful GPT-4 API
- OpenWeatherMap for comprehensive weather data
- Vercel for seamless deployment
- Next.js team for the excellent framework
- Tailwind CSS for the utility-first CSS framework

---

**Made with ❤️ and ☁️**

For more information, visit the [project repository](https://github.com/yourusername/ai-weather-bot).