<?php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\{Project,Task,User};
use App\Services\{OpenAIService,ProjectContextService,QuestionAnsweringService,CommandProcessingService,TaskGeneratorService};
use Mockery;

class AssistantBulkFiltersTest extends TestCase
{
    use RefreshDatabase;
    private QuestionAnsweringService $qas; private CommandProcessingService $cps; private Project $project;
    protected function setUp(): void
    { parent::setUp(); putenv('OPENAI_API_KEY='); $openAIMock=Mockery::mock(OpenAIService::class); $openAIMock->shouldIgnoreMissing(); $openAIMock->shouldReceive('chatText')->andReturn('Mocked'); $this->qas=new QuestionAnsweringService($openAIMock,new ProjectContextService()); $tg=Mockery::mock(TaskGeneratorService::class); $tg->shouldIgnoreMissing(); $tg->shouldReceive('generateTasks')->andReturn([]); $this->cps=new CommandProcessingService($openAIMock,new ProjectContextService(),$tg); $owner=User::factory()->create(); $this->project=Project::factory()->create(['user_id'=>$owner->id]); Task::factory()->count(15)->create(['project_id'=>$this->project->id]); }

    public function test_bulk_filter_status_priority_matrix()
    {
        $statuses=['todo','in progress','review']; $priorities=['low','medium','high']; $checked=0;
        foreach($statuses as $s){ foreach($priorities as $p){ $q="List $p priority $s tasks"; $ans=$this->qas->answer($this->project,$q,[],null); $this->assertIsString($ans); $checked++; if($checked>=20) break 2; }}
        $this->assertGreaterThan(0,$checked);
    }
}
