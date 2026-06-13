#!/bin/bash

# LastSats Deployment Script
# This script ensures the project builds correctly before deployment

echo "🚀 Starting LastSats deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the lastsats_frontend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run the build with webpack (avoiding Turbopack issues)
echo "🔨 Building application with webpack..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Ready for deployment."
    echo "💡 Mock mode is active by default - perfect for testing."
    echo "🔧 To deploy with real contract, set NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS environment variable."
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi