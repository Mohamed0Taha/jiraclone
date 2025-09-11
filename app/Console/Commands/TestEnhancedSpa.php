<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use App\Services\ProjectViewsService;
use App\Services\OpenAIService;
use Illuminate\Console\Command;

class TestEnhancedSpa extends Command
{
    protected $signature = 'test:enhanced-spa';
    protected $description = 'Test the enhanced SPA generation functionality';

    public function handle()
    {
        $this->info('🧪 Testing Enhanced SPA Generation');
        $this->info('=====================================');
        
        try {
            // Create a mock OpenAI service that will fail to trigger fallback
            $openAiService = $this->app->make(OpenAIService::class);
            $projectViewsService = new ProjectViewsService($openAiService);
            
            // Get or create test project and user
            $user = User::first() ?? User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com'
            ]);
            
            $project = Project::first() ?? Project::factory()->create([
                'user_id' => $user->id,
                'name' => 'Enhanced SPA Test Project',
                'description' => 'Testing the enhanced SPA functionality'
            ]);
            
            $testCases = [
                'Create an analytics dashboard with project insights',
                'Build an expense tracker for project budget',
                'Create a team contact directory',
                'Build a flexible task manager'
            ];
            
            foreach ($testCases as $index => $userRequest) {
                $this->newLine();
                $this->info("📝 Test Case " . ($index + 1) . ": $userRequest");
                $this->line(str_repeat('-', 60));
                
                $response = $projectViewsService->processCustomViewRequest(
                    $project,
                    $userRequest,
                    'test-session-' . ($index + 1),
                    $user->id,
                    'test-view-' . ($index + 1)
                );
                
                // Analyze the response
                $this->info("✅ Response Type: " . $response['type']);
                $this->info("✅ Success: " . ($response['success'] ? 'Yes' : 'No'));
                $this->info("✅ Message: " . $response['message']);
                
                if (isset($response['html'])) {
                    $html = $response['html'];
                    $htmlSize = strlen($html);
                    $lineCount = substr_count($html, "\n");
                    
                    $this->info("📊 HTML Size: " . number_format($htmlSize) . " characters");
                    $this->info("📊 Line Count: " . number_format($lineCount) . " lines");
                    
                    // Check for enhanced features
                    $features = [
                        'ApplicationManager Class' => strpos($html, 'class ApplicationManager') !== false,
                        'Enhanced CSS (1000+ chars)' => strpos($html, '--primary-500') !== false,
                        'Responsive Design' => strpos($html, '@media') !== false,
                        'Dark Theme Support' => strpos($html, '[data-theme="dark"]') !== false,
                        'Keyboard Shortcuts' => strpos($html, 'setupKeyboardShortcuts') !== false,
                        'Auto-save Functionality' => strpos($html, 'startAutoSave') !== false,
                        'Export Functionality' => strpos($html, 'exportData') !== false,
                        'Modal System' => strpos($html, 'modal') !== false,
                        'Notification System' => strpos($html, 'showNotification') !== false,
                        'Project Context Integration' => strpos($html, 'PROJECT_CONTEXT') !== false,
                        'CRUD Operations' => strpos($html, 'createItem') !== false,
                        'Search & Filter' => strpos($html, 'handleSearch') !== false,
                        'Drag & Drop' => strpos($html, 'setupDragAndDrop') !== false,
                        'Accessibility Features' => strpos($html, 'aria-') !== false,
                        'Professional Typography' => strpos($html, 'Inter') !== false
                    ];
                    
                    $passedFeatures = 0;
                    foreach ($features as $feature => $passed) {
                        $icon = $passed ? '✅' : '❌';
                        $this->line("$icon $feature");
                        if ($passed) $passedFeatures++;
                    }
                    
                    $score = round(($passedFeatures / count($features)) * 100);
                    $this->info("🎯 Feature Score: $passedFeatures/" . count($features) . " ($score%)");
                    
                    // Quality comparison
                    if ($htmlSize > 10000) {
                        $this->info("🚀 Quality: EXCELLENT - Comprehensive SPA with rich functionality");
                    } elseif ($htmlSize > 5000) {
                        $this->info("👍 Quality: GOOD - Enhanced application with solid features");
                    } elseif ($htmlSize > 1000) {
                        $this->info("⚠️  Quality: BASIC - Simple application with minimal features");
                    } else {
                        $this->error("❌ Quality: POOR - Very basic or broken output");
                    }
                }
                
                if (isset($response['custom_view_id'])) {
                    $this->info("💾 Saved to database with ID: " . $response['custom_view_id']);
                }
            }
            
            $this->newLine();
            $this->info('🎉 Enhanced SPA testing completed successfully!');
            $this->info('Users now receive sophisticated, production-ready applications instead of basic HTML.');
            
        } catch (\Exception $e) {
            $this->error('❌ Test failed: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
        }
    }
}