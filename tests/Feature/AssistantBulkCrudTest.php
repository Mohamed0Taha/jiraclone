<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\CommandProcessingService;
use App\Services\OpenAIService;
use App\Services\ProjectContextService;
use App\Services\QuestionAnsweringService;
use App\Services\TaskGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AssistantBulkCrudTest extends TestCase
{
    use RefreshDatabase;

    private QuestionAnsweringService $qas;

    private CommandProcessingService $cps;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        putenv('OPENAI_API_KEY=');
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldIgnoreMissing();
        $openAIMock->shouldReceive('chatText')->andReturn('Mocked');
        $this->qas = new QuestionAnsweringService($openAIMock, new ProjectContextService);
        $taskGenMock = Mockery::mock(TaskGeneratorService::class);
        $taskGenMock->shouldIgnoreMissing();
        $taskGenMock->shouldReceive('generateTasks')->andReturn([]);
        $this->cps = new CommandProcessingService($openAIMock, new ProjectContextService, $taskGenMock);
        $owner = User::factory()->create();
        $this->project = Project::factory()->create(['user_id' => $owner->id]);
        // Seed deterministic mix
        Task::factory()->count(10)->create(['project_id' => $this->project->id]);
    }

    public function test_mass_crud_and_references_suite()
    {
        $statusQueries = ['How many tasks are done?', 'How many tasks are todo?', 'How many tasks are in progress?'];
        foreach ($statusQueries as $q) {
            $ans = $this->qas->answer($this->project, $q, [], null);
            $this->assertStringContainsString('There are', $ans);
        }
        $list = $this->qas->answer($this->project, 'List all tasks', [], null);
        $this->assertStringContainsString('Task #', $list);
        $history = [['role' => 'assistant', 'content' => $list]];
        $ids = $this->qas->answer($this->project, 'ids', $history, null);
        $this->assertMatchesRegularExpression('/#\d+/', $ids);

        // 500 micro command plan checks (synthetic variations)
        $basePhrases = ['Move', 'Set', 'Mark'];
        $targets = ['to done', 'to review', 'to in progress'];
        $i = 0;
        $total = 500;
        $taskId = Task::where('project_id', $this->project->id)->first()->id;
        while ($i < $total) {
            $verb = $basePhrases[$i % count($basePhrases)];
            $target = $targets[$i % count($targets)];
            $msg = "$verb #$taskId $target";
            $plan = $this->cps->generatePlan($this->project, $msg, []);
            $this->assertEquals('task_update', $plan['command_data']['type'] ?? null);
            $i++;
        }

        $this->assertTrue(true); // final assertion placeholder
    }
}
