<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\OpenAIService;
use App\Services\ProjectContextService;
use App\Services\QuestionAnsweringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class QuestionAnsweringServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeService(): QuestionAnsweringService
    {
        // Mock OpenAIService to avoid real API calls
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldIgnoreMissing();
        // Force chatText to return deterministic response when invoked
        $openAIMock->shouldReceive('chatText')->andReturn('MOCK_LLM_RESPONSE');

        $context = app(ProjectContextService::class);

        return new QuestionAnsweringService($openAIMock, $context);
    }

    public function test_provides_task_ids_and_details()
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create(['name' => 'Demo']);
        Task::factory()->for($project)->create(['title' => 'First', 'priority' => 'high']);
        Task::factory()->for($project)->create(['title' => 'Second', 'priority' => 'low']);

        $svc = $this->makeService();
        $answer = $svc->answer($project, 'list task ids', [], null);

        $this->assertStringContainsString('Task #', $answer);
    }

    public function test_specific_task_query_returns_details()
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $task = Task::factory()->for($project)->create(['title' => 'Pay invoices', 'priority' => 'medium']);

        $svc = $this->makeService();
        $answer = $svc->answer($project, 'Show #'.$task->id, [], null);

        $this->assertStringContainsString('Task #'.$task->id, $answer);
        $this->assertStringContainsString('Pay invoices', $answer);
    }

    public function test_ambiguous_query_prompts_for_clarification()
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->for($project)->create(['title' => 'Check logs']);

        $svc = $this->makeService();
        $history = [ ['role' => 'user', 'content' => 'List tasks'] ];
        $answer = $svc->answer($project, 'What about them?', $history, null);

        $this->assertStringContainsString('specify which task', strtolower($answer));
    }

    public function test_overview_intent()
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->for($project)->count(3)->create();

        $svc = $this->makeService();
        $answer = $svc->answer($project, 'project overview', [], null);

        $this->assertStringContainsString('Project Overview', $answer);
    }
}
