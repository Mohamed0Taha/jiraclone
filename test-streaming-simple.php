<?php
/**
 * Simple test script for streaming custom views endpoint
 * Tests both CSRF handling and streaming response
 */

require_once __DIR__ . '/vendor/autoload.php';

use GuzzleHttp\Client;

$baseUrl = 'http://127.0.0.1:8000';
$projectId = 1;

echo "🧪 Testing Custom View Streaming Endpoint\n";
echo "==========================================\n\n";

try {
    $client = new Client([
        'cookies' => true,
        'verify' => false,
        'timeout' => 30
    ]);

    // Step 1: Get CSRF token by visiting a form page
    echo "📋 Step 1: Getting CSRF token...\n";
    $response = $client->get($baseUrl . '/login');
    $html = $response->getBody()->getContents();
    
    // Extract CSRF token from meta tag
    if (preg_match('/<meta name="csrf-token" content="([^"]+)"/', $html, $matches)) {
        $csrfToken = $matches[1];
        echo "✅ CSRF token obtained: " . substr($csrfToken, 0, 20) . "...\n\n";
    } else {
        throw new Exception("Could not extract CSRF token");
    }

    // Step 2: Test streaming endpoint
    echo "🌊 Step 2: Testing streaming endpoint...\n";
    $response = $client->post($baseUrl . "/projects/{$projectId}/custom-views/chat", [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'text/plain',
            'X-CSRF-TOKEN' => $csrfToken,
            'X-Requested-With' => 'XMLHttpRequest'
        ],
        'json' => [
            'view_name' => 'test_streaming',
            'message' => 'Create a simple test component with a button',
            'conversation_history' => [],
            'project_context' => null
        ],
        'stream' => true
    ]);

    echo "📊 Response Status: " . $response->getStatusCode() . "\n";
    echo "📋 Content-Type: " . $response->getHeaderLine('Content-Type') . "\n\n";

    if ($response->getStatusCode() === 200) {
        echo "📄 Streaming Response:\n";
        echo "----------------------\n";
        
        $body = $response->getBody();
        $buffer = '';
        $eventCount = 0;
        
        while (!$body->eof()) {
            $chunk = $body->read(1024);
            $buffer .= $chunk;
            
            // Process complete SSE events
            while (($pos = strpos($buffer, "\n\n")) !== false) {
                $event = substr($buffer, 0, $pos);
                $buffer = substr($buffer, $pos + 2);
                
                if (trim($event)) {
                    $eventCount++;
                    echo "Event #{$eventCount}:\n";
                    echo $event . "\n";
                    echo "---\n";
                }
            }
        }
        
        // Process any remaining buffer
        if (trim($buffer)) {
            $eventCount++;
            echo "Final Event #{$eventCount}:\n";
            echo $buffer . "\n";
        }
        
        echo "\n✅ Streaming test completed successfully!\n";
        echo "📊 Total events received: {$eventCount}\n";
        
    } else {
        echo "❌ Unexpected status code: " . $response->getStatusCode() . "\n";
        echo "Response: " . $response->getBody()->getContents() . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    
    if (method_exists($e, 'getResponse') && $e->getResponse()) {
        echo "Response status: " . $e->getResponse()->getStatusCode() . "\n";
        echo "Response body: " . $e->getResponse()->getBody()->getContents() . "\n";
    }
}

echo "\n🎯 Test completed!\n";