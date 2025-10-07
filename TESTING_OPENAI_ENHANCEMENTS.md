# Testing OpenAI Enhancements - Step by Step Guide

## 🚀 Pre-Deployment Testing

### **Step 1: Deploy New Services**
```bash
# Add and commit new files
git add app/Services/OpenAIAssistantService.php
git add OPENAI_ENHANCEMENTS_GUIDE.md
git add TESTING_OPENAI_ENHANCEMENTS.md
git commit -m "Add OpenAI Assistants API and enhanced capabilities"

# Deploy to Heroku
git push heroku main

# Wait for deployment to complete
```

### **Step 2: Verify Database Permissions Still Work**
```bash
heroku run "php artisan tinker --execute='
echo \"Testing database INSERT permissions:\n\";
try { 
    DB::table(\"openai_requests\")->insert([
        \"user_id\" => 1, 
        \"request_type\" => \"test\", 
        \"tokens_used\" => 0, 
        \"cost\" => 0, 
        \"model\" => \"test\", 
        \"successful\" => 1, 
        \"created_at\" => now(), 
        \"updated_at\" => now()
    ]); 
    echo \"✅ Database INSERT: WORKS\n\"; 
} catch(Exception \$e) { 
    echo \"❌ Database INSERT: FAILED\n\"; 
}
'" -a laravel-react-automation-app
```

## 🧪 Testing Each Enhancement

### **Test 1: Enhanced OpenAIService Functions**

#### **A. Test Function Calling**
```bash
heroku run "php artisan tinker --execute='
\$openAI = new App\Services\OpenAIService();

// Test function calling capability
\$messages = [
    [\"role\" => \"user\", \"content\" => \"What functions are available?\"]
];

\$functions = [
    [
        \"name\" => \"test_function\",
        \"description\" => \"A test function\",
        \"parameters\" => [
            \"type\" => \"object\",
            \"properties\" => [
                \"message\" => [\"type\" => \"string\"]
            ]
        ]
    ]
];

try {
    \$response = \$openAI->chatWithFunctions(\$messages, \$functions);
    echo \"✅ Function calling: WORKS\n\";
    echo \"Response: \" . json_encode(\$response) . \"\n\";
} catch(Exception \$e) {
    echo \"❌ Function calling: \" . \$e->getMessage() . \"\n\";
}
'" -a laravel-react-automation-app
```

#### **B. Test Embeddings Generation**
```bash
heroku run "php artisan tinker --execute='
\$openAI = new App\Services\OpenAIService();

try {
    \$result = \$openAI->generateEmbeddings([\"test task for embeddings\", \"another test task\"]);
    echo \"✅ Embeddings: WORKS\n\";
    echo \"Generated \" . count(\$result[\"embeddings\"]) . \" embeddings\n\";
    echo \"Embedding dimensions: \" . count(\$result[\"embeddings\"][0]) . \"\n\";
} catch(Exception \$e) {
    echo \"❌ Embeddings: \" . \$e->getMessage() . \"\n\";
}
'" -a laravel-react-automation-app
```

#### **C. Test Speech Generation (Text-to-Speech)**
```bash
heroku run "php artisan tinker --execute='
\$openAI = new App\Services\OpenAIService();

try {
    \$audio = \$openAI->generateSpeech(\"Hello from TaskPilot AI assistant\");
    echo \"✅ Text-to-Speech: WORKS\n\";
    echo \"Audio size: \" . strlen(\$audio) . \" bytes\n\";
} catch(Exception \$e) {
    echo \"❌ Text-to-Speech: \" . \$e->getMessage() . \"\n\";
}
'" -a laravel-react-automation-app
```

### **Test 2: Assistants API**

#### **A. Test Assistant Creation**
```bash
heroku run "php artisan tinker --execute='
// Get first project
\$project = App\Models\Project::first();
if (!\$project) {
    echo \"❌ No projects found. Create a project first.\n\";
    exit;
}

echo \"Testing with project: \" . \$project->name . \"\n\";

// Test assistant service
\$openAI = new App\Services\OpenAIService();
\$assistantService = new App\Services\OpenAIAssistantService(\$openAI);

try {
    \$assistant = \$assistantService->createProjectAssistant(\$project);
    echo \"✅ Assistant creation: WORKS\n\";
    echo \"Assistant ID: \" . \$assistant[\"id\"] . \"\n\";
    echo \"Assistant name: \" . \$assistant[\"name\"] . \"\n\";
} catch(Exception \$e) {
    echo \"❌ Assistant creation: \" . \$e->getMessage() . \"\n\";
}
'" -a laravel-react-automation-app
```

#### **B. Test Thread Creation**
```bash
heroku run "php artisan tinker --execute='
\$openAI = new App\Services\OpenAIService();
\$assistantService = new App\Services\OpenAIAssistantService(\$openAI);

try {
    \$thread = \$assistantService->createThread();
    echo \"✅ Thread creation: WORKS\n\";
    echo \"Thread ID: \" . \$thread[\"id\"] . \"\n\";
} catch(Exception \$e) {
    echo \"❌ Thread creation: \" . \$e->getMessage() . \"\n\";
}
'" -a laravel-react-automation-app
```

#### **C. Test Full Assistant Conversation**
```bash
heroku run "php artisan tinker --execute='
// Get project with assistant
\$project = App\Models\Project::whereJsonContains(\"metadata->openai_assistant_id\", \"asst_\")->first();
if (!\$project) {
    echo \"❌ No project with assistant found. Create assistant first.\n\";
    exit;
}

\$assistantId = \$project->metadata[\"openai_assistant_id\"];
echo \"Using assistant: \" . \$assistantId . \"\n\";

\$openAI = new App\Services\OpenAIService();
\$assistantService = new App\Services\OpenAIAssistantService(\$openAI);

try {
    // Create thread
    \$thread = \$assistantService->createThread();
    \$threadId = \$thread[\"id\"];
    
    // Chat with assistant
    \$response = \$assistantService->chatWithAssistant(
        \$threadId, 
        \$assistantId, 
        \"Hello! Can you help me with this project?\"
    );
    
    echo \"✅ Assistant conversation: WORKS\n\";
    echo \"Response: \" . substr(\$response[\"response\"], 0, 200) . \"...\n\";
} catch(Exception \$e) {
    echo \"❌ Assistant conversation: \" . \$e->getMessage() . \"\n\";
}
'" -a laravel-react-automation-app
```

## 🔍 Verify Cost Tracking

### **Test OpenAI Request Logging**
```bash
heroku run "php artisan tinker --execute='
echo \"Recent OpenAI requests:\n\";
\$requests = DB::table(\"openai_requests\")
    ->orderBy(\"created_at\", \"desc\")
    ->take(5)
    ->get();

foreach (\$requests as \$req) {
    echo \"- \" . \$req->request_type . \" (\" . \$req->model . \") - \" . \$req->tokens_used . \" tokens - $\" . \$req->cost . \"\n\";
}

echo \"\nTotal cost today: $\" . DB::table(\"openai_requests\")
    ->whereDate(\"created_at\", today())
    ->sum(\"cost\") . \"\n\";
'" -a laravel-react-automation-app
```

## 🌐 Frontend Testing

### **Test 1: Create Simple Assistant Chat Interface**
Create a test route to interact with assistants:

```bash
# Add test route
heroku run "php artisan route:list | grep -i openai" -a laravel-react-automation-app
```

### **Test 2: Browser Testing**
1. **Visit TaskPilot**: https://taskpilot.us
2. **Navigate to a project**
3. **Open browser console** and test basic functionality
4. **Check for any JavaScript errors**

## 🐛 Troubleshooting

### **Common Issues & Fixes**

#### **Issue: "OpenAI API key missing"**
```bash
# Check API key configuration
heroku config:get OPENAI_API_KEY -a laravel-react-automation-app

# If missing, add it:
heroku config:set OPENAI_API_KEY=your-key-here -a laravel-react-automation-app
```

#### **Issue: "Assistant creation failed"**
```bash
# Check OpenAI service status
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models

# Check logs for detailed errors
heroku logs --tail -a laravel-react-automation-app
```

#### **Issue: "Database permission errors"**
```bash
# Re-test database permissions
heroku run "php artisan tinker --execute='DB::table(\"openai_requests\")->insert([\"user_id\" => 1, \"request_type\" => \"test\", \"tokens_used\" => 0, \"cost\" => 0, \"model\" => \"test\", \"successful\" => 1, \"created_at\" => now(), \"updated_at\" => now()]);'" -a laravel-react-automation-app
```

## 📊 Success Criteria

### **✅ All Tests Should Pass:**
- [ ] Function calling works
- [ ] Embeddings generation works  
- [ ] Text-to-speech works
- [ ] Assistant creation works
- [ ] Thread creation works
- [ ] Assistant conversations work
- [ ] Cost tracking logs all requests
- [ ] No database permission errors

### **📈 Expected Results:**
- **Response times**: < 5 seconds for most operations
- **Cost tracking**: All requests logged with accurate costs
- **Error handling**: Graceful failures with proper logging
- **Database**: No INSERT permission issues

### **🎯 Performance Benchmarks:**
- **Embeddings**: ~500ms for 2-3 texts
- **Function calling**: ~2-3 seconds  
- **Assistant creation**: ~3-5 seconds
- **Assistant chat**: ~5-10 seconds (depending on complexity)

## 📝 Test Results Template

Copy this template to track your test results:

```
## Test Results - [DATE]

### Basic Functionality
- [ ] Database INSERT permissions: ✅/❌
- [ ] OpenAI API key: ✅/❌
- [ ] Function calling: ✅/❌
- [ ] Embeddings: ✅/❌
- [ ] Text-to-speech: ✅/❌

### Assistants API
- [ ] Assistant creation: ✅/❌
- [ ] Thread creation: ✅/❌  
- [ ] Assistant conversation: ✅/❌
- [ ] Function execution: ✅/❌

### Cost Tracking
- [ ] Request logging: ✅/❌
- [ ] Cost calculation: ✅/❌
- [ ] Usage reporting: ✅/❌

### Notes:
[Add any issues or observations here]

### Next Steps:
[What to implement/fix next]
```
