<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectDataApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_tasks_api_returns_data_for_authenticated_user()
    {
        // Create a user and project
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        
        // Create some test tasks
        Task::factory()->count(3)->create([
            'project_id' => $project->id,
            'status' => 'todo'
        ]);
        
        Task::factory()->count(2)->create([
            'project_id' => $project->id,
            'status' => 'done'
        ]);

        // Act as the authenticated user and call the API
        $response = $this->actingAs($user, 'sanctum')
                         ->getJson("/api/project/{$project->id}/tasks");

        // Assert the response
        $response->assertStatus(200);
        
        $responseData = $response->json();
        
        // Check the response structure
        $this->assertArrayHasKey('project', $responseData);
        $this->assertArrayHasKey('tasks', $responseData);
        $this->assertArrayHasKey('meta', $responseData);
        
        // Check project data
        $this->assertEquals($project->id, $responseData['project']['id']);
        $this->assertEquals($project->name, $responseData['project']['name']);
        
        // Check tasks data
        $this->assertCount(5, $responseData['tasks']); // 3 todo + 2 done
        
        // Check meta data
        $this->assertEquals(5, $responseData['meta']['total_tasks']);
        $this->assertEquals(3, $responseData['meta']['by_status']['todo']);
        $this->assertEquals(2, $responseData['meta']['by_status']['done']);
        $this->assertStringContains("/api/project/{$project->id}/tasks", $responseData['meta']['endpoint']);
    }

    public function test_project_tasks_api_denies_access_to_unauthorized_user()
    {
        // Create two users and a project owned by the first user
        $owner = User::factory()->create();
        $unauthorizedUser = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $owner->id]);

        // Try to access the API as the unauthorized user
        $response = $this->actingAs($unauthorizedUser, 'sanctum')
                         ->getJson("/api/project/{$project->id}/tasks");

        // Assert access is denied
        $response->assertStatus(403);
        $response->assertJson(['error' => 'Unauthorized access to project']);
    }

    public function test_project_dashboard_data_api_returns_statistics()
    {
        // Create a user and project
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        
        // Create tasks with different priorities
        Task::factory()->create(['project_id' => $project->id, 'priority' => 'high', 'status' => 'done']);
        Task::factory()->create(['project_id' => $project->id, 'priority' => 'medium', 'status' => 'todo']);
        Task::factory()->create(['project_id' => $project->id, 'priority' => 'low', 'status' => 'inprogress']);

        // Act as the authenticated user and call the API
        $response = $this->actingAs($user, 'sanctum')
                         ->getJson("/api/project/{$project->id}/dashboard-data");

        // Assert the response
        $response->assertStatus(200);
        
        $responseData = $response->json();
        
        // Check the response structure
        $this->assertArrayHasKey('project', $responseData);
        $this->assertArrayHasKey('statistics', $responseData);
        $this->assertArrayHasKey('recent_activity', $responseData);
        $this->assertArrayHasKey('endpoints', $responseData);
        
        // Check statistics
        $stats = $responseData['statistics'];
        $this->assertEquals(3, $stats['total_tasks']);
        $this->assertEquals(1, $stats['completed_tasks']);
        $this->assertEquals(33.33, $stats['progress_percentage']); // 1/3 * 100 rounded
        
        // Check priority statistics
        $this->assertEquals(1, $stats['tasks_by_priority']['high']);
        $this->assertEquals(1, $stats['tasks_by_priority']['medium']);
        $this->assertEquals(1, $stats['tasks_by_priority']['low']);
        
        // Check endpoints are included
        $this->assertStringContains("/api/project/{$project->id}/tasks", $responseData['endpoints']['tasks']);
        $this->assertStringContains("/api/project/{$project->id}/dashboard-data", $responseData['endpoints']['dashboard']);
    }

    public function test_api_requires_authentication()
    {
        $project = Project::factory()->create();

        // Try to access without authentication
        $response = $this->getJson("/api/project/{$project->id}/tasks");
        
        // Should return 401 Unauthorized
        $response->assertStatus(401);
    }
}