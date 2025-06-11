/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['openweathermap.org', 'www.spc.noaa.gov'],
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  },
}

module.exports = nextConfig