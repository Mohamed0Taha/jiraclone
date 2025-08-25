#!/bin/bash

# Clear cookies emergency script - run this on Heroku if you get header size errors

echo "🍪 Emergency Cookie Cleanup Script"
echo "This will help resolve 'request header field exceeds server limit' errors"

# Check if we're on Heroku
if [ -n "$DYNO" ]; then
    echo "Running on Heroku dyno: $DYNO"
else
    echo "Running locally"
fi

# Clear Laravel sessions from storage
echo "Clearing Laravel sessions..."
php artisan session:table 2>/dev/null && php artisan db:seed --class=ClearSessionsSeeder 2>/dev/null
php artisan cache:clear
php artisan view:clear
php artisan config:clear

echo "✅ Server-side cleanup complete"
echo ""
echo "🌐 Client-side instructions:"
echo "1. Open browser developer tools (F12)"
echo "2. Go to Application/Storage tab"
echo "3. Click 'Clear site data' or manually clear cookies for your domain"
echo "4. Refresh the page"
echo ""
echo "🔧 If error persists, the server may need header size limit increase:"
echo "   - Apache: LimitRequestFieldSize 16384"
echo "   - Nginx: large_client_header_buffers 4 16k"
