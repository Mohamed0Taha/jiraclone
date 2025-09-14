<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Models\CustomView;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomViewsSharingTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_member_can_list_and_load_owner_custom_view(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $owner->id]);

        // Attach member to project
        $project->members()->attach($member->id, [
            'role' => 'member',
            'joined_at' => now(),
        ]);

        // Owner creates a shared custom view
        $viewName = 'Team Dashboard';
        CustomView::createOrUpdate($project->id, $owner->id, $viewName, '<div>Shared View</div>');

        // Member can list views
        $list = $this->actingAs($member)->get("/projects/{$project->id}/custom-views/list");
        $list->assertStatus(200);
        $payload = $list->json();
        $this->assertTrue($payload['success']);
        $this->assertNotEmpty($payload['custom_views']);
        $this->assertEquals($viewName, $payload['custom_views'][0]['name']);

        // Member can load the view content
        $get = $this->actingAs($member)->get("/projects/{$project->id}/custom-views/get?view_name=" . urlencode($viewName));
        $get->assertStatus(200)
            ->assertJson([
                'type' => 'custom_view_loaded',
                'success' => true,
                'html' => '<div>Shared View</div>',
            ]);
    }
}

