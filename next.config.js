// next.config.js - Add this to your project root for proper emoji support
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Ensure proper UTF-8 encoding for emojis
  experimental: {
    esmExternals: true,
  },
  
  // API configuration for proper encoding
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  
  // Headers for proper UTF-8 support
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for proper emoji handling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ensure proper UTF-8 handling in webpack
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { 
              targets: { 
                browsers: ['last 2 versions'] 
              }
            }],
            '@babel/preset-react'
          ],
        },
      },
    });

    return config;
  },
};

module.exports = nextConfig;