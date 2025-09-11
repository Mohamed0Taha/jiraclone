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

    public function test_template_type_determination()
    {
        $service = new ProjectViewsService(Mockery::mock(OpenAIService::class));
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('determineTemplateType');
        $method->setAccessible(true);
        
        // Test analytics requests
        $this->assertEquals('analytics', $method->invoke($service, 'Create a dashboard with charts and analytics'));
        $this->assertEquals('analytics', $method->invoke($service, 'Build a data visualization tool'));
        
        // Test expense tracking
        $this->assertEquals('expense_tracker', $method->invoke($service, 'Create an expense tracker for my budget'));
        $this->assertEquals('expense_tracker', $method->invoke($service, 'Build a financial management tool'));
        
        // Test contact management
        $this->assertEquals('contact_manager', $method->invoke($service, 'Create a team member directory'));
        $this->assertEquals('contact_manager', $method->invoke($service, 'Build a contact phonebook'));
        
        // Test project management
        $this->assertEquals('project_management', $method->invoke($service, 'Create a task management board'));
        $this->assertEquals('project_management', $method->invoke($service, 'Build a kanban workflow'));
        
        // Test default case
        $this->assertEquals('general_purpose', $method->invoke($service, 'Create something random'));
    }

    public function test_enhanced_fallback_html_structure()
    {
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create an analytics dashboard',
            'test-session',
            $this->user->id,
            'analytics-view'
        );

        // Verify enhanced HTML structure
        $this->assertEquals('spa_generated', $response['type']);
        $this->assertStringContainsString('(local template)', $response['message']);
        $this->assertTrue($response['success']);
        
        $html = $response['html'];
        
        // Check for enhanced structure elements
        $this->assertStringContainsString('app-header', $html);
        $this->assertStringContainsString('sidebar', $html);
        $this->assertStringContainsString('main-content', $html);
        $this->assertStringContainsString('modal', $html);
        
        // Check for professional CSS
        $this->assertStringContainsString('Inter', $html); // Professional font
        $this->assertStringContainsString('css custom properties', $html); // CSS variables
        $this->assertStringContainsString('responsive', $html); // Responsive design
        
        // Check for enhanced JavaScript
        $this->assertStringContainsString('ApplicationManager', $html);
        $this->assertStringContainsString('setupKeyboardShortcuts', $html);
        $this->assertStringContainsString('exportData', $html);
        
        // Check for template-specific content (analytics)
        $this->assertStringContainsString('Analytics Dashboard', $html);
        $this->assertStringContainsString('canvas', $html); // Charts
        $this->assertStringContainsString('insight', $html); // AI insights
    }

    public function test_expense_tracker_template_content()
    {
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create an expense tracker for project budget',
            'test-session',
            $this->user->id,
            'expense-view'
        );

        $html = $response['html'];
        
        // Check for expense tracker specific elements
        $this->assertStringContainsString('Expense Tracker', $html);
        $this->assertStringContainsString('Total Budget', $html);
        $this->assertStringContainsString('Total Spent', $html);
        $this->assertStringContainsString('Remaining', $html);
        $this->assertStringContainsString('expense-chart', $html);
        $this->assertStringContainsString('quick-expense-form', $html);
        $this->assertStringContainsString('category', $html);
        
        // Check for expense management JavaScript
        $this->assertStringContainsString('expenseManager', $html);
        $this->assertStringContainsString('addExpense', $html);
        $this->assertStringContainsString('updateExpenseSummary', $html);
    }

    public function test_contact_manager_template_with_project_members()
    {
        // Add members to the project
        $member1 = User::factory()->create(['name' => 'John Doe', 'email' => 'john@example.com']);
        $member2 = User::factory()->create(['name' => 'Jane Smith', 'email' => 'jane@example.com']);
        
        $this->project->members()->attach([$member1->id, $member2->id]);

        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create a team contact directory',
            'test-session',
            $this->user->id,
            'contact-view'
        );

        $html = $response['html'];
        
        // Check for contact manager specific elements
        $this->assertStringContainsString('Contact Manager', $html);
        $this->assertStringContainsString('contact-grid', $html);
        $this->assertStringContainsString('search-box', $html);
        $this->assertStringContainsString('filter-section', $html);
        $this->assertStringContainsString('contact-details', $html);
        
        // Check for contact management JavaScript
        $this->assertStringContainsString('contactManager', $html);
        $this->assertStringContainsString('loadContacts', $html);
        $this->assertStringContainsString('renderContactGrid', $html);
    }

    public function test_general_purpose_template_functionality()
    {
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create a flexible data manager',
            'test-session',
            $this->user->id,
            'general-view'
        );

        $html = $response['html'];
        
        // Check for general purpose elements
        $this->assertStringContainsString('Multi-Purpose Manager', $html);
        $this->assertStringContainsString('grid-view', $html);
        $this->assertStringContainsString('list-view', $html);
        $this->assertStringContainsString('kanban-view', $html);
        $this->assertStringContainsString('view-toggles', $html);
        $this->assertStringContainsString('global-search', $html);
        
        // Check for multi-view JavaScript functionality
        $this->assertStringContainsString('switchView', $html);
        $this->assertStringContainsString('renderGridView', $html);
        $this->assertStringContainsString('renderListView', $html);
        $this->assertStringContainsString('renderKanbanView', $html);
        $this->assertStringContainsString('setupDragAndDrop', $html);
    }

    public function test_enhanced_javascript_functionality()
    {
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create any application',
            'test-session',
            $this->user->id,
            'test-view'
        );

        $html = $response['html'];
        
        // Check for enhanced JavaScript features
        $this->assertStringContainsString('class ApplicationManager', $html);
        $this->assertStringContainsString('setupKeyboardShortcuts', $html);
        $this->assertStringContainsString('startAutoSave', $html);
        $this->assertStringContainsString('exportData', $html);
        $this->assertStringContainsString('showNotification', $html);
        $this->assertStringContainsString('toggleTheme', $html);
        $this->assertStringContainsString('debounce', $html);
        $this->assertStringContainsString('escapeHtml', $html);
        
        // Check for CRUD operations
        $this->assertStringContainsString('createItem', $html);
        $this->assertStringContainsString('editItem', $html);
        $this->assertStringContainsString('deleteItem', $html);
        $this->assertStringContainsString('updateItemStatus', $html);
        
        // Check for advanced features
        $this->assertStringContainsString('localStorage', $html);
        $this->assertStringContainsString('addEventListener', $html);
        $this->assertStringContainsString('querySelector', $html);
    }

    public function test_responsive_css_and_accessibility()
    {
        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create an accessible application',
            'test-session',
            $this->user->id,
            'accessible-view'
        );

        $html = $response['html'];
        
        // Check for CSS custom properties (theme support)
        $this->assertStringContainsString('--primary-500', $html);
        $this->assertStringContainsString('--bg-primary', $html);
        $this->assertStringContainsString('[data-theme="dark"]', $html);
        
        // Check for responsive breakpoints
        $this->assertStringContainsString('@media (max-width: 1024px)', $html);
        $this->assertStringContainsString('@media (max-width: 768px)', $html);
        
        // Check for accessibility features
        $this->assertStringContainsString('aria-live', $html);
        $this->assertStringContainsString('role=', $html);
        $this->assertStringContainsString('tabindex=', $html);
        $this->assertStringContainsString('@media (prefers-reduced-motion', $html);
        $this->assertStringContainsString('@media (prefers-contrast', $html);
        
        // Check for semantic HTML
        $this->assertStringContainsString('<main', $html);
        $this->assertStringContainsString('<nav', $html);
        $this->assertStringContainsString('<header', $html);
        $this->assertStringContainsString('<section', $html);
    }

    public function test_project_context_integration()
    {
        // Create tasks for the project
        $task1 = Task::factory()->create([
            'project_id' => $this->project->id,
            'title' => 'Test Task 1',
            'status' => 'todo',
            'priority' => 'high'
        ]);
        $task2 = Task::factory()->create([
            'project_id' => $this->project->id,
            'title' => 'Test Task 2', 
            'status' => 'done',
            'priority' => 'medium'
        ]);

        $openAIMock = Mockery::mock(OpenAIService::class);
        $openAIMock->shouldReceive('generateCustomView')
            ->once()
            ->andThrow(new \Exception('AI service unavailable'));

        $service = new ProjectViewsService($openAIMock);

        $response = $service->processCustomViewRequest(
            $this->project,
            'Create analytics dashboard',
            'test-session',
            $this->user->id,
            'context-view'
        );

        $html = $response['html'];
        
        // Check that project context is embedded
        $this->assertStringContainsString('PROJECT_CONTEXT', $html);
        $this->assertStringContainsString('tasks', $html);
        $this->assertStringContainsString('members', $html);
        $this->assertStringContainsString('project', $html);
        
        // Check that the context includes our test data
        $this->assertStringContainsString($this->project->name, $html);
        
        // Verify JavaScript uses project context
        $this->assertStringContainsString('window.PROJECT_CONTEXT', $html);
        $this->assertStringContainsString('this.projectData', $html);
        $this->assertStringContainsString('loadProjectData', $html);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}