#!/bin/bash

echo "🍪 Cookie Header Diagnostic Tool"
echo "==============================="

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl to use this diagnostic tool."
    exit 1
fi

# Get the URL from command line argument or use default
URL=${1:-"https://your-app.herokuapp.com"}

echo "🌐 Testing: $URL"
echo ""

# Make a request and capture headers
echo "📊 Making test request..."
RESPONSE=$(curl -I -s -w "HTTPCODE:%{http_code}\nSIZE:%{size_header}\nTIME:%{time_total}\n" "$URL" 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTPCODE:" | cut -d: -f2)
HEADER_SIZE=$(echo "$RESPONSE" | grep "SIZE:" | cut -d: -f2)
TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)

echo "✅ HTTP Status: $HTTP_CODE"
echo "📏 Header Size: ${HEADER_SIZE} bytes"
echo "⏱️  Response Time: ${TIME}s"
echo ""

# Check for cookie-related headers in response
echo "🍪 Cookie-related headers:"
echo "$RESPONSE" | grep -i "cookie\|set-cookie\|x-debug" || echo "   (None found)"
echo ""

# Check for specific error indicators
if [ "$HTTP_CODE" = "400" ]; then
    echo "🚨 400 Bad Request detected - likely header size issue!"
    echo "💡 Try running: window.emergencyClearCookies() in browser console"
    echo "💡 Or clear browser cookies manually"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Request successful"
else
    echo "ℹ️  HTTP $HTTP_CODE response"
fi

echo ""
echo "🔧 If you're getting 400 errors:"
echo "   1. Open browser dev tools (F12)"
echo "   2. Go to Console tab"
echo "   3. Run: window.emergencyClearCookies()"
echo "   4. Or manually clear cookies in Application tab"
