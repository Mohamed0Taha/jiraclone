<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\ProjectAssistantService;
use Illuminate\Console\Command;

class TestAssistant extends Command
{
    protected $signature = 'assistant:test {project_id?}';
    protected $description = 'Test the project assistant functionality';

    public function handle(ProjectAssistantService $assistantService)
    {
        $this->info('🤖 Testing Project Assistant...');
        
        // Check OpenAI configuration
        $apiKey = config('openai.api_key');
        if (empty($apiKey)) {
            $this->error('❌ OPENAI_API_KEY is not configured');
            return 1;
        }
        $this->info('✅ OpenAI API Key is configured');
        
        // Get project
        $projectId = $this->argument('project_id');
        if ($projectId) {
            $project = Project::find($projectId);
        } else {
            $project = Project::first();
        }
        
        if (!$project) {
            $this->error('❌ No project found');
            return 1;
        }
        
        $this->info("✅ Testing with project: {$project->name} (ID: {$project->id})");
        
        // Test simple messages
        $testMessages = [
            "Hello",
            "What is this project about?",
            "Show me the current tasks",
            "What's the project status?",
        ];
        
        foreach ($testMessages as $message) {
            $this->info("\n📤 Testing message: '{$message}'");
            
            try {
                $response = $assistantService->processMessage($project, $message);
                $this->info("📥 Response: {$response}");
                $this->info("✅ Success!");
            } catch (\Exception $e) {
                $this->error("❌ Error: {$e->getMessage()}");
            }
        }
        
        return 0;
    }
}
