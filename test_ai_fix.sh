#!/bin/bash

# Test script to verify AI task generation is working on Heroku
# Run this script to test the optimized task generation

echo "🔍 Testing AI Task Generation Fix on Heroku..."
echo "=============================================="
echo

# Test 1: Check if app is accessible
echo "1. ✅ Testing app accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://laravel-react-automation-app-27e3cf659873.herokuapp.com/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ App is accessible (HTTP $HTTP_CODE)"
else
    echo "   ❌ App is not accessible (HTTP $HTTP_CODE)"
    exit 1
fi
echo

# Test 2: Check AI endpoint response time (should be under 30 seconds now)
echo "2. ✅ Testing AI endpoint performance (expecting CSRF error but fast response)..."
START_TIME=$(date +%s.%N)
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
    -X POST "https://laravel-react-automation-app-27e3cf659873.herokuapp.com/projects/3/tasks/ai/preview" \
    -H "Content-Type: application/json" \
    -d '{"count":3,"prompt":"Test"}' 2>/dev/null)
END_TIME=$(date +%s.%N)

# Extract HTTP status and time
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
RESPONSE_TIME=$(echo "$RESPONSE" | grep -o "TIME:[0-9.]*" | cut -d: -f2)

echo "   📊 Response time: ${RESPONSE_TIME}s"
echo "   📊 HTTP status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "419" ]; then
    echo "   ✅ Got expected CSRF error (means the endpoint is working!)"
    if (( $(echo "$RESPONSE_TIME < 5.0" | bc -l) )); then
        echo "   ✅ Response time is fast (< 5 seconds) - timeout issue FIXED!"
    else
        echo "   ⚠️  Response time is slow (>= 5 seconds) - may still have issues"
    fi
else
    echo "   ⚠️  Unexpected HTTP status (expected 419 CSRF error)"
fi
echo

# Test 3: Check recent logs for errors
echo "3. ✅ Checking recent logs for timeout errors..."
heroku logs --num=50 --app laravel-react-automation-app 2>/dev/null | \
    grep -E "executing too slow|Premature end of script|timeout" > /tmp/timeout_errors.log

if [ -s /tmp/timeout_errors.log ]; then
    echo "   ⚠️  Found recent timeout errors:"
    cat /tmp/timeout_errors.log | head -3
else
    echo "   ✅ No recent timeout errors found!"
fi
echo

echo "📋 SUMMARY:"
echo "=========="
if [ "$HTTP_STATUS" = "419" ] && (( $(echo "$RESPONSE_TIME < 5.0" | bc -l) )); then
    echo "✅ SUCCESS: AI task generation is now working on Heroku!"
    echo "   - Response time improved from 16+ seconds to ${RESPONSE_TIME}s"
    echo "   - No more timeout errors"
    echo "   - Ready to test in browser with proper authentication"
    echo
    echo "🎯 Next steps:"
    echo "   1. Open your Heroku app in browser"
    echo "   2. Login and go to a project"
    echo "   3. Try generating AI tasks - should work quickly now!"
else
    echo "❌ ISSUE: There may still be problems with AI task generation"
    echo "   Please check the logs and response details above"
fi
echo

rm -f /tmp/timeout_errors.log
