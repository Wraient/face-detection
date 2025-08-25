#!/bin/bash

echo "🎥 Face Detection System Launcher"
echo "================================="
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found - Starting server on port 8000..."
    echo "📱 Open your browser and go to: http://localhost:8000"
    echo "🔒 Make sure to allow camera permissions when prompted"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python found - Starting server on port 8000..."
    echo "📱 Open your browser and go to: http://localhost:8000"
    echo "🔒 Make sure to allow camera permissions when prompted"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python -m SimpleHTTPServer 8000
else
    echo "❌ Python not found!"
    echo ""
    echo "Please install Python or use another method to serve the files:"
    echo ""
    echo "Alternative methods:"
    echo "1. Install Node.js and run: npx http-server"
    echo "2. Install PHP and run: php -S localhost:8000"
    echo "3. Use any other static file server"
    echo ""
    echo "Then open http://localhost:8000 in your browser"
fi
