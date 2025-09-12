#!/bin/bash

# Test the streaming endpoint with a real HTTP request
# This script tests both streaming and JSON fallback modes

echo "Testing Custom Views Streaming HTTP Endpoint"
echo "==========================================="

# Get CSRF token
echo "1. Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c /tmp/cookies.txt "http://127.0.0.1:8000/health" | jq -r '.ok // empty')
if [ $? -eq 0 ]; then
    echo "✓ Health endpoint accessible"
else
    echo "✗ Health endpoint failed"
    exit 1
fi

# Test payload
PAYLOAD='{
    "view_name": "test",
    "message": "Create a simple task counter component",
    "conversation_history": [],
    "project_context": null,
    "current_component_code": null
}'

echo "2. Testing streaming endpoint (text/plain)..."

# Test streaming mode
curl -s -b /tmp/cookies.txt \
    -H "Content-Type: application/json" \
    -H "Accept: text/plain" \
    -H "X-Requested-With: XMLHttpRequest" \
    -d "$PAYLOAD" \
    "http://127.0.0.1:8000/projects/1/custom-views/chat" \
    > /tmp/stream_response.txt 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Streaming request completed"
    echo "Response preview:"
    head -10 /tmp/stream_response.txt | sed 's/^/  /'
    
    # Check for expected SSE format
    if grep -q "data: " /tmp/stream_response.txt; then
        echo "✓ Response contains SSE data lines"
    else
        echo "✗ No SSE data lines found"
    fi
    
    if grep -q "\[DONE\]" /tmp/stream_response.txt; then
        echo "✓ Response contains [DONE] marker"
    else
        echo "✗ No [DONE] marker found"
    fi
else
    echo "✗ Streaming request failed"
fi

echo ""
echo "3. Testing JSON fallback mode..."

# Test JSON mode
curl -s -b /tmp/cookies.txt \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "X-Requested-With: XMLHttpRequest" \
    -d "$PAYLOAD" \
    "http://127.0.0.1:8000/projects/1/custom-views/chat" \
    > /tmp/json_response.txt 2>&1

if [ $? -eq 0 ]; then
    echo "✓ JSON request completed"
    echo "Response preview:"
    head -5 /tmp/json_response.txt | sed 's/^/  /'
    
    # Check for JSON format
    if jq . /tmp/json_response.txt > /dev/null 2>&1; then
        echo "✓ Response is valid JSON"
        
        TYPE=$(jq -r '.type // empty' /tmp/json_response.txt)
        if [ "$TYPE" = "spa_generated" ]; then
            echo "✓ Response type is spa_generated"
        else
            echo "✗ Unexpected response type: $TYPE"
        fi
    else
        echo "✗ Response is not valid JSON"
    fi
else
    echo "✗ JSON request failed"
fi

echo ""
echo "4. Response comparison:"
echo "Streaming response size: $(wc -c < /tmp/stream_response.txt) bytes"
echo "JSON response size: $(wc -c < /tmp/json_response.txt) bytes"

echo ""
echo "Testing completed!"
echo "Full responses saved to /tmp/stream_response.txt and /tmp/json_response.txt"