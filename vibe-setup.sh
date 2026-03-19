#!/bin/bash

# Vibe Sessions Karaoke — One-Click Mac Installer
# This script installs dependencies, builds the app, and starts the server.

echo "🚀 Starting Vibe Sessions Installation..."

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js not found. Please install Node.js from https://nodejs.org/"
    exit
fi

echo "📦 Installing Backend Dependencies..."
npm install

echo "📦 Installing Frontend Dependencies..."
cd client && npm install

echo "🏗️ Building Frontend Production Bundle..."
npm run build

echo "✅ Build Complete!"

echo "🌟 Starting Vibe Sessions Server..."
cd ..
nohup node server.js > /tmp/vibe-server.log 2>&1 &

echo "-------------------------------------------------------"
echo "🎉 SUCCESS! Vibe Sessions is now running."
echo "📺 STAGE (TV/Projector): http://localhost:3001/stage"
echo "📱 KIOSK (Tablet/Phone): http://localhost:3001/kiosk"
echo "-------------------------------------------------------"
echo "Note: You can edit settings.json to change the branding."
