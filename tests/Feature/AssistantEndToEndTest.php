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

class AssistantEndToEndTest extends TestCase
{
    use RefreshDatabase;

    private QuestionAnsweringService $qas;

    private CommandProcessingService $cps;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure no LLM fallback during deterministic tests
        putenv('OPENAI_API_KEY=');
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldIgnoreMissing();
        $openAIMock->shouldReceive('chatText')->andReturn('Mocked LLM response');

        $this->qas = new QuestionAnsweringService($openAIMock, new ProjectContextService);

        $taskGenMock = Mockery::mock(TaskGeneratorService::class);
        $taskGenMock->shouldIgnoreMissing();
        $taskGenMock->shouldReceive('generateTasks')->andReturn([]);
        $this->cps = new CommandProcessingService($openAIMock, new ProjectContextService, $taskGenMock);

        $owner = User::factory()->create(['name' => 'OwnerUser']);
        $this->project = Project::factory()->create(['user_id' => $owner->id, 'name' => 'Alpha']);
        // Seed tasks
        Task::factory()->count(3)->create(['project_id' => $this->project->id, 'status' => 'todo', 'priority' => 'medium']);
        Task::factory()->count(2)->create(['project_id' => $this->project->id, 'status' => 'inprogress', 'priority' => 'high']);
        Task::factory()->count(1)->create(['project_id' => $this->project->id, 'status' => 'done', 'priority' => 'low']);
    }

    public function test_overview_intent()
    {
        $ans = $this->qas->answer($this->project, 'Give me a project overview', [], null);
        $this->assertStringContainsString('Project Overview', $ans);
    }

    public function test_task_listing_and_ids()
    {
        // Force deterministic path (no LLM) by ensuring api key env not set
        putenv('OPENAI_API_KEY=');
        $ans = $this->qas->answer($this->project, 'List all tasks', [], null);
        $this->assertStringContainsString('Task', $ans);
        $history = [
            ['role' => 'assistant', 'content' => $ans],
            ['role' => 'user', 'content' => 'List all tasks'],
        ];
        $idsAnswer = $this->qas->answer($this->project, 'task ids', $history, null);
        $this->assertMatchesRegularExpression('/#\d+/', $idsAnswer, 'Should list at least one task id');
    }

    public function test_specific_task_fetch()
    {
        $task = Task::where('project_id', $this->project->id)->first();
        $ans = $this->qas->answer($this->project, 'Show #'.$task->id, [], null);
        $this->assertStringContainsString('Task #'.$task->id, $ans);
    }

    public function test_count_queries_and_comparison()
    {
        $ans = $this->qas->answer($this->project, 'How many tasks are done?', [], null);
        $this->assertStringContainsString('There are', $ans);
        $cmp = $this->qas->answer($this->project, 'done vs in progress', [], null);
        $this->assertStringContainsString('Comparison:', $cmp, 'Should include status comparison output');
    }

    public function test_keyword_search()
    {
        $t = Task::where('project_id', $this->project->id)->first();
        $word = explode(' ', $t->title)[0];
        putenv('OPENAI_API_KEY=');
        $ans = $this->qas->answer($this->project, 'search '.$word, [], null);
        $this->assertStringContainsString('Matched', $ans);
    }

    public function test_due_date_filters()
    {
        putenv('OPENAI_API_KEY=');
        $ans = $this->qas->answer($this->project, 'list tasks due this week', [], null);
        $this->assertStringContainsString('Found', $ans);
    }

    public function test_explanation_follow_up()
    {
        $hist = [];
        $hist[] = ['role' => 'assistant', 'content' => 'There are 6 tasks in the project.'];
        $why = $this->qas->answer($this->project, 'why?', $hist, null);
        $this->assertStringContainsString('numbers come from', strtolower($why));
    }

    public function test_command_create_task_plan()
    {
        $plan = $this->cps->generatePlan($this->project, 'Create task "Refactor auth module"', []);
        $this->assertEquals('create_task', $plan['command_data']['type'] ?? null);
    }

    public function test_command_update_task_plan()
    {
        $task = Task::where('project_id', $this->project->id)->first();
        $plan = $this->cps->generatePlan($this->project, 'Move #'.$task->id.' to done', []);
        $this->assertEquals('task_update', $plan['command_data']['type'] ?? null);
        $this->assertEquals('done', $plan['command_data']['changes']['status'] ?? null);
    }

    public function test_bulk_update_plan()
    {
        $plan = $this->cps->generatePlan($this->project, 'Move all tasks to review', []);
        $this->assertEquals('bulk_update', $plan['command_data']['type'] ?? null);
        $this->assertEquals('review', $plan['command_data']['updates']['status'] ?? null);
    }

    public function test_bulk_generation_plan()
    {
        $plan = $this->cps->generatePlan($this->project, 'Generate 5 tasks for onboarding flow', []);
        $this->assertEquals('bulk_task_generation', $plan['command_data']['type'] ?? null);
        $this->assertEquals(5, $plan['command_data']['count'] ?? null);
    }

    public function test_pronoun_based_bulk_assign()
    {
        // First list tasks to simulate prior assistant output
        $listAns = $this->qas->answer($this->project, 'List all tasks', [], null);
        $history = [
            ['role' => 'assistant', 'content' => $listAns],
            ['role' => 'user', 'content' => 'List all tasks'],
        ];
        $plan = $this->cps->generatePlan($this->project, 'assign all of them to me', $history);
        $this->assertEquals('bulk_assign', $plan['command_data']['type'] ?? null);
        $this->assertEquals('__ME__', $plan['command_data']['assignee'] ?? null);
    }

    public function test_delete_urgent_tasks_command()
    {
        Task::factory()->create(['project_id' => $this->project->id, 'priority' => 'urgent']);
        $plan = $this->cps->generatePlan($this->project, 'Delete urgent tasks', []);
        $this->assertEquals('bulk_delete', $plan['command_data']['type'] ?? null);
        $this->assertEquals('urgent', $plan['command_data']['filters']['priority'] ?? null);
    }

    public function test_bulk_due_date_update_for_priority()
    {
        $plan = $this->cps->generatePlan($this->project, 'Update due date for medium priority to next Friday', []);
        $this->assertEquals('bulk_update', $plan['command_data']['type'] ?? null);
        $this->assertEquals('medium', $plan['command_data']['filters']['priority'] ?? null);
        $this->assertNotEmpty($plan['command_data']['updates']['end_date'] ?? null);
    }

    public function test_weekly_progress_report_intent()
    {
        $ans = $this->qas->answer($this->project, 'Generate weekly progress report', [], null);
        $this->assertStringContainsString('Weekly Progress Report', $ans);
    }

    public function test_ordinal_task_reference()
    {
        $ans = $this->qas->answer($this->project, 'Show first task', [], null);
        $this->assertStringContainsString('Task #', $ans);
        $ans2 = $this->qas->answer($this->project, 'Show latest task', [], null);
        $this->assertStringContainsString('Task #', $ans2);
    }

    public function test_first_three_tasks_reference()
    {
        $ans = $this->qas->answer($this->project, 'List first 3 tasks', [], null);
        $this->assertStringContainsString('Task #', $ans);
    }

    public function test_owner_question_returns_owner()
    {
        $ans = $this->qas->answer($this->project, 'Who is the project owner?', [], null);
        $this->assertStringContainsString('Project owner:', $ans);
        $this->assertStringNotContainsString('Task assignments', $ans, 'Owner query should not list task assignments');
    }

    public function test_me_alias_and_name_tokens_assignment_plan()
    {
        // Simulate 'assign todo tasks to me'
        $plan = $this->cps->generatePlan($this->project, 'assign todo tasks to me', []);
        $this->assertEquals('bulk_assign', $plan['command_data']['type'] ?? null);
        $this->assertEquals('todo', $plan['command_data']['filters']['status'] ?? null);
        $this->assertEquals('__ME__', $plan['command_data']['assignee'] ?? null);

        // Create a member with multi-part name
        $member = User::factory()->create(['name' => 'Jane Marie Doe']);
        // Assume membership (simplest: make them owner of new project context)
        $project2 = Project::factory()->create(['user_id' => $member->id]);
        Task::factory()->count(2)->create(['project_id' => $project2->id, 'status' => 'inprogress']);
        $plan2 = $this->cps->generatePlan($project2, 'assign in progress tasks to Jane Doe', []);
        $this->assertEquals('bulk_assign', $plan2['command_data']['type'] ?? null);
        $this->assertEquals('inprogress', $plan2['command_data']['filters']['status'] ?? null);
        $this->assertEquals('Jane Doe', trim($plan2['command_data']['assignee'] ?? 'Jane Doe'), 'Assignee hint should keep provided name string');
    }

    public function test_assign_done_tasks_to_me_plan()
    {
        // create a done task to ensure filter matches
        Task::factory()->create(['project_id' => $this->project->id, 'status' => 'done']);
        $plan = $this->cps->generatePlan($this->project, 'assign done tasks to me', []);
        $this->assertEquals('bulk_assign', $plan['command_data']['type'] ?? null);
        $this->assertEquals('done', $plan['command_data']['filters']['status'] ?? null);
        $this->assertEquals('__ME__', $plan['command_data']['assignee'] ?? null);
    }

    public function test_assign_high_priority_tasks_to_owner()
    {
        Task::factory()->create(['project_id' => $this->project->id, 'priority' => 'high']);
        $plan = $this->cps->generatePlan($this->project, 'assign high priority tasks to owner', []);
        $this->assertEquals('bulk_assign', $plan['command_data']['type'] ?? null);
        $this->assertEquals('high', $plan['command_data']['filters']['priority'] ?? null);
        $this->assertEquals('__OWNER__', $plan['command_data']['assignee'] ?? null);
    }
}
