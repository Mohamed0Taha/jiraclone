<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🧪 Testing OpenAI Enhancements\n";
echo "================================\n\n";

// Test 1: Basic OpenAI Service
echo "1. Testing Basic OpenAI Service:\n";
try {
    $openAI = new App\Services\OpenAIService();
    
    // Test simple chat
    $messages = [
        ['role' => 'user', 'content' => 'Say "Hello from TaskPilot"']
    ];
    
    $response = $openAI->chatText($messages, 0.1);
    echo "✅ Basic chat: WORKS\n";
    echo "   Response: " . substr($response, 0, 50) . "...\n";
} catch (Exception $e) {
    echo "❌ Basic chat: " . $e->getMessage() . "\n";
}

// Test 2: Embeddings
echo "\n2. Testing Embeddings:\n";
try {
    $result = $openAI->generateEmbeddings(['test task', 'another task']);
    echo "✅ Embeddings: WORKS\n";
    echo "   Generated: " . count($result['embeddings']) . " embeddings\n";
    echo "   Dimensions: " . count($result['embeddings'][0]) . "\n";
} catch (Exception $e) {
    echo "❌ Embeddings: " . $e->getMessage() . "\n";
}

// Test 3: Text-to-Speech  
echo "\n3. Testing Text-to-Speech:\n";
try {
    $audio = $openAI->generateSpeech("Hello TaskPilot");
    echo "✅ TTS: WORKS\n";
    echo "   Audio size: " . strlen($audio) . " bytes\n";
} catch (Exception $e) {
    echo "❌ TTS: " . $e->getMessage() . "\n";
}

// Test 4: Function Calling (with proper schema)
echo "\n4. Testing Function Calling:\n";
try {
    $messages = [
        ['role' => 'user', 'content' => 'What is 5+3?']
    ];
    
    $functions = [
        [
            'name' => 'calculate',
            'description' => 'Perform a calculation',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'operation' => ['type' => 'string'],
                    'numbers' => ['type' => 'array', 'items' => ['type' => 'number']]
                ],
                'required' => ['operation', 'numbers']
            ]
        ]
    ];
    
    $response = $openAI->chatWithFunctions($messages, $functions);
    echo "✅ Function calling: WORKS\n";
    echo "   Function calls: " . count($response['function_calls']) . "\n";
} catch (Exception $e) {
    echo "❌ Function calling: " . $e->getMessage() . "\n";
}

// Test 5: Assistant Creation
echo "\n5. Testing Assistant Creation:\n";
try {
    $project = App\Models\Project::first();
    if (!$project) {
        echo "❌ No projects found\n";
    } else {
        $assistantService = new App\Services\OpenAIAssistantService($openAI);
        $assistant = $assistantService->createProjectAssistant($project);
        echo "✅ Assistant creation: WORKS\n";
        echo "   Assistant ID: " . $assistant['id'] . "\n";
        echo "   Project: " . $project->name . "\n";
    }
} catch (Exception $e) {
    echo "❌ Assistant creation: " . $e->getMessage() . "\n";
}

// Test 6: Cost tracking
echo "\n6. Testing Cost Tracking:\n";
$todayCost = DB::table('openai_requests')
    ->whereDate('created_at', today())
    ->sum('cost');

$requestCount = DB::table('openai_requests')
    ->whereDate('created_at', today())
    ->count();

echo "✅ Cost tracking active\n";
echo "   Today's requests: " . $requestCount . "\n";
echo "   Today's cost: $" . number_format($todayCost, 4) . "\n";

echo "\n================================\n";
echo "🎉 Testing Complete!\n";
