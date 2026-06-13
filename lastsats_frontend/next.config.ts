import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure Turbopack for development but prefer webpack for production
  turbopack: {
    // Basic Turbopack config to avoid conflicts
  },
  
  // Handle workspace root warning from Vercel
  outputFileTracingRoot: require('path').join(__dirname, '../'),
  
  // Webpack configuration for production builds
  webpack: (config, { isServer }) => {
    // Fix for modules that don't work well with SSR
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Handle potential SSR issues
  experimental: {
    // Keep minimal experimental config
  },
};

export default nextConfig;
