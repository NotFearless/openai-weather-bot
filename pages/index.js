import Head from 'next/head';
import dynamic from 'next/dynamic';

// Import WeatherBot with no SSR to avoid hydration errors
const WeatherBot = dynamic(() => import('../components/Weatherbot'), {
  ssr: false,
  loading: () => (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading AI Weather Assistant...</p>
      </div>
    </div>
  )
});

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