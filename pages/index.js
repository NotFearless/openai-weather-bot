import Head from 'next/head';
import WeatherBot from '../components/Weatherbot';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Head>
        <title>AI Weather Assistant | GPT-4 Powered Weather Bot</title>
        <meta name="description" content="Professional weather forecasts and education powered by GPT-4 and real-time weather data" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI Weather Assistant
          </h1>
          <p className="text-lg text-gray-600">
            Professional weather forecasts and education powered by GPT-4
          </p>
        </div>
        
        <WeatherBot />
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by OpenAI GPT-4 • Real-time weather data • 
            Built with Next.js and deployed on Vercel
          </p>
        </div>
      </main>
    </div>
  );
}