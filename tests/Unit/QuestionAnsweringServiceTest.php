<?php

namespace Tests\Unit;

use App\Models\Project;
use App\Models\Task;
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
        // Mock OpenAI so tests don't hit external API
        $openAI = Mockery::mock(OpenAIService::class);
        $openAI->shouldIgnoreMissing();
        // Never call external network in unit tests
        $openAI->shouldReceive('chatText')->andReturn('Mocked LLM answer with tasks listed.');

        return new QuestionAnsweringService($openAI, new ProjectContextService());
    }

    public function test_lists_task_ids()
    {
        $service = $this->makeService();
        $project = Project::factory()->create();
        Task::factory()->count(3)->create(['project_id' => $project->id, 'status' => 'todo']);

        $answer = $service->answer($project, 'What are the task ids?', [], null);

        $this->assertStringContainsString('Task', $answer);
        $this->assertStringContainsString('#', $answer, 'Should include task id markers.');
    }

    public function test_specific_task_query()
    {
        $service = $this->makeService();
        $project = Project::factory()->create();
        $task = Task::factory()->create(['project_id' => $project->id, 'status' => 'inprogress']);

        $answer = $service->answer($project, 'Show #'.$task->id, [], null);

        $this->assertStringContainsString('Task #'.$task->id, $answer);
        $this->assertStringContainsString('Status', $answer);
    }

    public function test_overview_intent()
    {
        $service = $this->makeService();
        $project = Project::factory()->create();
        Task::factory()->count(2)->create(['project_id' => $project->id, 'status' => 'todo']);
        Task::factory()->count(1)->create(['project_id' => $project->id, 'status' => 'done']);

        $answer = $service->answer($project, 'project overview', [], null);
        $this->assertStringContainsString('Project Overview', $answer);
        $this->assertStringContainsString('Total Tasks', $answer);
    }

    public function test_ambiguous_follow_up_prompts_for_clarification()
    {
        $service = $this->makeService();
        $project = Project::factory()->create();
        Task::factory()->count(2)->create(['project_id' => $project->id]);

        $history = [
            ['role' => 'user', 'content' => 'List tasks'],
            ['role' => 'assistant', 'content' => 'Found tasks #1, #2'],
        ];

        $answer = $service->answer($project, 'and them?', $history, null);
        $this->assertStringContainsString('specify', strtolower($answer));
    }
}
