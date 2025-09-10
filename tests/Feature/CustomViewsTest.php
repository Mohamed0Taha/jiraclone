<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\CustomView;
use App\Services\OpenAIService;
use App\Services\ProjectViewsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class CustomViewsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->project = Project::factory()->create(['user_id' => $this->user->id]);
    }

    public function test_custom_view_can_be_created_and_retrieved(): void
    {
        $htmlContent = '<div>Test Custom View</div>';
        $metadata = ['prompt' => 'Create a test view'];

        $customView = CustomView::createOrUpdate(
            $this->project->id,
            $this->user->id,
            'default',
            $htmlContent,
            $metadata
        );

        $this->assertInstanceOf(CustomView::class, $customView);
        $this->assertEquals($htmlContent, $customView->html_content);
        $this->assertEquals($metadata, $customView->metadata);
        $this->assertTrue($customView->is_active);
    }

    public function test_get_custom_view_endpoint(): void
    {
        // Create a custom view
        CustomView::createOrUpdate(
            $this->project->id,
            $this->user->id,
            'default',
            '<div>Test Content</div>',
            ['test' => true]
        );

        $response = $this->actingAs($this->user)->get(
            "/projects/{$this->project->id}/custom-views/get?view_name=default"
        );

        $response->assertStatus(200);
        $response->assertJson([
            'type' => 'custom_view_loaded',
            'success' => true,
            'html' => '<div>Test Content</div>',
        ]);
    }

    public function test_delete_custom_view_endpoint(): void
    {
        // Create a custom view
        $customView = CustomView::createOrUpdate(
            $this->project->id,
            $this->user->id,
            'default',
            '<div>Test Content</div>'
        );

        $response = $this->actingAs($this->user)->delete(
            "/projects/{$this->project->id}/custom-views/delete?view_name=default"
        );

        $response->assertStatus(200);
        $response->assertJson([
            'type' => 'success',
            'success' => true,
        ]);

        // Verify the view was deleted
        $this->assertNull(CustomView::find($customView->id));
    }

    public function test_list_custom_views_endpoint(): void
    {
        // Create multiple custom views
        CustomView::createOrUpdate($this->project->id, $this->user->id, 'view1', '<div>View 1</div>');
        CustomView::createOrUpdate($this->project->id, $this->user->id, 'view2', '<div>View 2</div>');

        $response = $this->actingAs($this->user)->get(
            "/projects/{$this->project->id}/custom-views/list"
        );

        $response->assertStatus(200);
        $response->assertJson([
            'type' => 'success',
            'success' => true,
        ]);

        $data = $response->json();
        $this->assertCount(2, $data['custom_views']);
    }

    public function test_custom_view_update_preserves_uniqueness(): void
    {
        // Create initial custom view
        $initialView = CustomView::createOrUpdate(
            $this->project->id,
            $this->user->id,
            'default',
            '<div>Initial Content</div>'
        );

        // Update the same view
        $updatedView = CustomView::createOrUpdate(
            $this->project->id,
            $this->user->id,
            'default',
            '<div>Updated Content</div>'
        );

        // Should be the same record, not a new one
        $this->assertEquals($initialView->id, $updatedView->id);
        $this->assertEquals('<div>Updated Content</div>', $updatedView->html_content);
        
        // Should only have one record in database
        $this->assertEquals(1, CustomView::where('project_id', $this->project->id)
            ->where('user_id', $this->user->id)
            ->where('name', 'default')
            ->count());
    }

    public function test_custom_view_service_processes_request_with_persistence()
    {
        // Mock OpenAI service to return a sample HTML response
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andReturn('<div>Test SPA Application</div>');

        // Create service with mocked OpenAI
        $service = new ProjectViewsService($openAIMock);

        // Process a test request with persistence
        $response = $service->processCustomViewRequest(
            $this->project,
            'Create an expense tracker',
            'test-session',
            $this->user->id,
            'test-view'
        );

        // Assert response structure
        $this->assertEquals('spa_generated', $response['type']);
        $this->assertStringContainsString('Generated your custom application!', $response['message']);
        $this->assertStringContainsString('Test SPA Application', $response['html']);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('custom_view_id', $response);

        // Verify it was saved to database
        $savedView = CustomView::find($response['custom_view_id']);
        $this->assertNotNull($savedView);
        $this->assertEquals($this->project->id, $savedView->project_id);
        $this->assertEquals($this->user->id, $savedView->user_id);
    }

    public function test_custom_view_chat_endpoint_with_persistence()
    {
        // Mock the OpenAI service
        $this->instance(OpenAIService::class, Mockery::mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('generateCustomView')
                ->once()
                ->andReturn('<div><h1>Expense Tracker</h1><p>Track your expenses here!</p></div>');
        }));

        $response = $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/custom-views/chat", [
                'message' => 'Create an expense tracker for my team',
                'session_id' => 'test-session-123',
                'view_name' => 'expense-tracker'
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'type',
                'message',
                'html',
                'success',
                'custom_view_id'
            ])
            ->assertJson([
                'type' => 'spa_generated',
                'success' => true
            ]);

        $responseData = $response->json();
        $this->assertStringContainsString('Expense Tracker', $responseData['html']);
        
        // Verify it was saved to database
        $this->assertNotNull($responseData['custom_view_id']);
        $savedView = CustomView::find($responseData['custom_view_id']);
        $this->assertNotNull($savedView);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}