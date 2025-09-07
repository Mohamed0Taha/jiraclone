<?php

namespace Tests\Feature;

use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;
use Mockery;

class AssistantModelSelectionTest extends TestCase
{
    public function test_assistant_model_override_flag_passed()
    {
        // Simulate env config
        putenv('OPENAI_ASSISTANT_MODEL=test-assistant-model');
        config(['openai.assistant_model' => 'test-assistant-model']);

        // Partial mock to intercept HTTP would normally be used; here we just assert the service
    $svc = new OpenAIService();
    $ref = new \ReflectionClass($svc);
    $assistantModel = $ref->getMethod('assistantModel');
    $assistantModel->setAccessible(true);
    $modelMethod = $ref->getMethod('model');
    $modelMethod->setAccessible(true);
    $this->assertEquals('test-assistant-model', $assistantModel->invoke($svc));
    $resolved = $modelMethod->invoke($svc, 'gpt-4o-mini', 'test-assistant-model');
        $this->assertEquals('test-assistant-model', $resolved);
    }
}
