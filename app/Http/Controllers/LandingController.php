<?php

namespace App\Http\Controllers;

use App\Services\TaskGeneratorService;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LandingController extends Controller
{
    /**
     * Public, lightweight task generation for the landing page prompt.
     * Uses the existing TaskGeneratorService against an in‑memory Project model
     * so we don’t persist anything for unauthenticated visitors.
     */
    public function generatePreview(Request $request, TaskGeneratorService $generator)
    {
        $val = $request->validate([
            'description' => ['required', 'string', 'max:2000'],
            'count' => ['nullable', 'integer', 'min:3', 'max:10'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $count = (int) ($val['count'] ?? 8);

        // Build an unsaved Project instance to feed the generator
        $project = new Project([
            'name' => $val['name'] ?? 'Landing Preview Project',
            'description' => $val['description'],
        ]);

        try {
            $tasks = $generator->generateTasks($project, $count, $val['description']);
        } catch (\Throwable $e) {
            // Fall back to a simple local stub so the UI still works if AI is unavailable
            Log::warning('Landing generatePreview fallback used', ['error' => $e->getMessage()]);
            $tasks = collect(range(1, $count))->map(function ($i) use ($val) {
                return [
                    'title' => "Task #{$i}: First step toward ‘".mb_strimwidth($val['description'], 0, 40, '…')."’",
                    'description' => 'Sample task generated locally because AI is unavailable. Define deliverables, acceptance criteria, owner, and due date.',
                    'priority' => ['low','medium','high','urgent'][($i - 1) % 4],
                    'category' => 'Planning',
                ];
            })->all();
        }

        // Ensure a minimal, predictable shape for the client
        $statusCycle = ['todo', 'inprogress', 'review', 'done'];
        $normalized = collect($tasks)->map(function ($t, $idx) use ($statusCycle) {
            $status = $t['status'] ?? $statusCycle[$idx % count($statusCycle)];
            return [
                'id' => $idx + 1,
                'title' => (string) ($t['title'] ?? 'Untitled task'),
                'description' => (string) ($t['description'] ?? ''),
                'priority' => (string) ($t['priority'] ?? 'medium'),
                'category' => (string) ($t['category'] ?? 'General'),
                'status' => $status,
            ];
        })->values();

        return response()->json([
            'ok' => true,
            'tasks' => $normalized,
        ]);
    }
}
