#!/bin/bash

# Assistant Chat Debug Script
# This script tests the project assistant functionality

echo "🤖 Testing Project Assistant Chat..."
echo "======================================"

# Test if the app is accessible
echo "1. Testing app accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://laravel-react-automation-app-27e3cf659873.herokuapp.com/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ App is accessible (HTTP $HTTP_CODE)"
else
    echo "❌ App is not accessible (HTTP $HTTP_CODE)"
    exit 1
fi

# Test OpenAI configuration
echo ""
echo "2. Checking OpenAI configuration..."
echo "Run this command in your Laravel app:"
echo "php artisan tinker"
echo "Then run: config('openai.api_key')"
echo "Make sure it returns your API key (not null)"

# Test project assistant
echo ""
echo "3. Testing assistant with a project..."
echo "You can test the assistant by visiting:"
echo "https://laravel-react-automation-app-27e3cf659873.herokuapp.com/projects/{PROJECT_ID}/assistant/test"
echo ""
echo "Or run this in tinker:"
echo "\$project = App\\Models\\Project::first();"
echo "\$service = app(App\\Services\\ProjectAssistantService::class);"
echo "\$result = \$service->testAssistant(\$project);"
echo "dd(\$result);"

echo ""
echo "4. Common issues to check:"
echo "- OPENAI_API_KEY environment variable is set"
echo "- OpenAI API key has sufficient credits"
echo "- Project has some tasks or data to discuss"
echo "- Check application logs for detailed error messages"

echo ""
echo "5. View logs:"
echo "heroku logs --tail --app laravel-react-automation-app"

echo ""
echo "6. Test simple chat message:"
echo "Try asking: 'What is this project about?' or 'Show me the current tasks'"
