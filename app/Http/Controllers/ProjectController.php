<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use App\Services\ProjectReportService;

class ProjectController extends Controller
{
    use AuthorizesRequests;

    protected function statuses(): array
    {
        return Task::STATUSES; // ['todo','inprogress','review','done']
    }

    protected function projectTypeOptions(): array
    {
        return [
            'Construction','Marketing','Sales','HR','Finance','Legal','Operations',
            'Event','Research','Education','Manufacturing','Design','Product',
            'Healthcare','Hospitality','Nonprofit','Software','IT Migration',
        ];
    }

    protected function domainOptions(): array
    {
        return [
            'Healthcare','Education','Finance','Retail','E-commerce','SaaS',
            'Government','Nonprofit','Manufacturing','Logistics','Hospitality',
            'Real Estate','Energy','Telecom','Media','Travel','Agriculture',
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        
        // Get projects owned by the user
        $ownedProjects = $user->projects()
            ->with(['tasks:id,project_id,title,status'])
            ->get();
            
        // Get projects where the user is a member
        $memberProjects = $user->memberProjects()
            ->with(['tasks:id,project_id,title,status'])
            ->get();
            
        // Combine both collections
        $allProjects = $ownedProjects->merge($memberProjects)->unique('id');
        
        $projects = $allProjects->map(function (Project $p) use ($user) {
                $grouped = $p->tasks->groupBy('status');

                $tasks = [];
                foreach ($this->statuses() as $status) {
                    $tasks[$status] = ($grouped->get($status, collect()))
                        ->values()
                        ->map(fn ($t) => [
                            'id'    => $t->id,
                            'title' => $t->title,
                        ])
                        ->all();
                }

                // Determine user's role in this project
                $role = 'owner';
                if ($p->user_id !== $user->id) {
                    $membership = $p->members()->where('user_id', $user->id)->first();
                    $role = $membership ? $membership->pivot->role : 'member';
                }

                return [
                    'id'          => $p->id,
                    'name'        => $p->name,
                    'key'         => $p->key,
                    'description' => $p->description,
                    'meta'        => $p->meta,
                    'start_date'  => optional($p->start_date)->toDateString(),
                    'end_date'    => optional($p->end_date)->toDateString(),
                    'tasks'       => $tasks,
                    'user_role'   => $role,
                    'is_owner'    => $p->user_id === $user->id,
                ];
            });

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    public function create()
    {
        return Inertia::render('Projects/Create', [
            'projectTypes' => $this->projectTypeOptions(),
            'domains'      => $this->domainOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'                      => 'required|string|max:255',
            'key'                       => 'nullable|string|max:12|regex:/^[A-Z0-9]+$/',
            'description'               => 'nullable|string',
            'start_date'                => 'nullable|date',
            'end_date'                  => 'nullable|date|after_or_equal:start_date',
            'meta'                      => 'nullable|array',
            'meta.project_type'         => 'nullable|string|max:120',
            'meta.domain'               => 'nullable|string|max:120',
            'meta.area'                 => 'nullable|string|max:120',
            'meta.location'             => 'nullable|string|max:180',
            'meta.team_size'            => 'nullable|integer|min:1|max:10000',
            'meta.budget'               => 'nullable|string|max:120',
            'meta.primary_stakeholder'  => 'nullable|string|max:180',
            'meta.objectives'           => 'nullable|string|max:2000',
            'meta.constraints'          => 'nullable|string|max:2000',
        ]);

        $meta = $this->sanitizeMeta($validated['meta'] ?? []);

        $lines = $this->buildContextLines($validated, $meta);

        $augmented = trim((string)($validated['description'] ?? ''));
        if (!empty($lines)) {
            $augmented = trim($augmented . "\n\nContext Summary:\n- " . implode("\n- ", $lines));
        }

        $project = $request->user()->projects()->create([
            'name'        => $validated['name'],
            'key'         => $validated['key']         ?: null,
            'description' => $augmented,
            'meta'        => !empty($meta) ? $meta : null,
            'start_date'  => $validated['start_date']  ?? null,
            'end_date'    => $validated['end_date']    ?? null,
        ]);

        return redirect()->route('projects.show', $project);
    }

    public function show(Project $project)
    {
        $this->authorize('view', $project);

        $raw = $project->tasks()
            ->with(['creator', 'assignee'])
            ->orderBy('created_at')
            ->get()
            ->groupBy('status');

        $tasks = [];
        foreach ($this->statuses() as $status) {
            $tasks[$status] = $raw->get($status, collect())->values();
        }

        return Inertia::render('Tasks/Board', [
            'project' => [
                'id'          => $project->id,
                'name'        => $project->name,
                'key'         => $project->key,
                'description' => $project->description,
                'meta'        => $project->meta,
                'start_date'  => optional($project->start_date)->toDateString(),
                'end_date'    => optional($project->end_date)->toDateString(),
            ],
            'tasks'   => $tasks,
        ]);
    }

    public function edit(Project $project)
    {
        $this->authorize('update', $project);

        return Inertia::render('Projects/Edit', [
            'project' => [
                'id'          => $project->id,
                'name'        => $project->name,
                'key'         => $project->key,
                'description' => $this->stripContextSummary((string) $project->description),
                'meta'        => $project->meta,
                'start_date'  => optional($project->start_date)->toDateString(),
                'end_date'    => optional($project->end_date)->toDateString(),
            ],
            'projectTypes' => $this->projectTypeOptions(),
            'domains'      => $this->domainOptions(),
        ]);
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name'                      => 'required|string|max:255',
            'key'                       => 'nullable|string|max:12|regex:/^[A-Z0-9]+$/',
            'description'               => 'nullable|string',
            'start_date'                => 'nullable|date',
            'end_date'                  => 'nullable|date|after_or_equal:start_date',
            'meta'                      => 'nullable|array',
            'meta.project_type'         => 'nullable|string|max:120',
            'meta.domain'               => 'nullable|string|max:120',
            'meta.area'                 => 'nullable|string|max:120',
            'meta.location'             => 'nullable|string|max:180',
            'meta.team_size'            => 'nullable|integer|min:1|max:10000',
            'meta.budget'               => 'nullable|string|max:120',
            'meta.primary_stakeholder'  => 'nullable|string|max:180',
            'meta.objectives'           => 'nullable|string|max:2000',
            'meta.constraints'          => 'nullable|string|max:2000',
        ]);

        $meta  = $this->sanitizeMeta($validated['meta'] ?? []);
        $lines = $this->buildContextLines($validated, $meta);

        $base = $this->stripContextSummary((string)($validated['description'] ?? ''));
        $augmented = trim($base);
        if (!empty($lines)) {
            $augmented = trim($augmented . "\n\nContext Summary:\n- " . implode("\n- ", $lines));
        }

        $project->update([
            'name'        => $validated['name'],
            'key'         => $validated['key']         ?: null,
            'description' => $augmented,
            'meta'        => !empty($meta) ? $meta : null,
            'start_date'  => $validated['start_date']  ?? null,
            'end_date'    => $validated['end_date']    ?? null,
        ]);

        return redirect()->route('projects.show', $project)->with('success', 'Project updated.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()
            ->route('dashboard')
            ->with('flash', 'Project deleted successfully.');
    }

    // ✅ TIMELINE / GANTT
    public function timeline(Project $project)
    {
        $this->authorize('view', $project);

        $taskRows = $project->tasks()
            ->with(['creator:id,name', 'assignee:id,name'])
            ->orderBy('created_at')
            ->get();

        $tasks = $taskRows->map(function ($t) {
            return [
                'id'         => $t->id,
                'title'      => $t->title,
                'status'     => $t->status,
                'start_date' => optional($t->start_date)->toDateString(),
                'end_date'   => optional($t->end_date)->toDateString(),
                'milestone'  => (bool) ($t->milestone ?? false),
                'parent_id'  => $t->parent_id ?? null,
                'progress'   => is_null($t->progress ?? null) ? null : (float) $t->progress,
                'assignee'   => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                'creator'    => $t->creator ? ['id' => $t->creator->id, 'name' => $t->creator->name] : null,
            ];
        })->values();

        $userIds = collect([$project->user_id])
            ->merge($taskRows->pluck('creator_id'))
            ->merge($taskRows->pluck('assignee_id'))
            ->filter()
            ->unique()
            ->values();

        $users = User::select('id', 'name')
            ->whereIn('id', $userIds)
            ->get();

        // 🔁 Corrected Inertia component path
        return Inertia::render('Timeline/Timeline', [
            'project' => [
                'id'          => $project->id,
                'name'        => $project->name,
                'key'         => $project->key,
                'description' => $project->description,
                'meta'        => $project->meta,
                'start_date'  => optional($project->start_date)->toDateString(),
                'end_date'    => optional($project->end_date)->toDateString(),
            ],
            'tasks' => $tasks,
            'users' => $users,
        ]);
    }

    protected function sanitizeMeta(array $meta): array
    {
        $allowed = [
            'project_type', 'domain', 'area', 'location',
            'team_size', 'budget', 'primary_stakeholder',
            'objectives', 'constraints',
        ];
        $out = [];
        foreach ($allowed as $k) {
            if (array_key_exists($k, $meta)) {
                $val = $meta[$k];
                if ($k === 'team_size' && $val !== null && $val !== '') {
                    $val = (int) $val;
                }
                $out[$k] = $val === '' ? null : $val;
            }
        }
        return array_filter($out, fn ($v) => !is_null($v) && $v !== '');
    }

    protected function buildContextLines(array $validated, array $meta): array
    {
        $lines = [];
        if (!empty($meta['project_type']))        $lines[] = 'Type: ' . $meta['project_type'];
        if (!empty($meta['domain']))              $lines[] = 'Domain: ' . $meta['domain'];
        if (!empty($meta['area']))                $lines[] = 'Area: ' . $meta['area'];
        if (!empty($meta['location']))            $lines[] = 'Location: ' . $meta['location'];
        if (!empty($meta['team_size']))           $lines[] = 'Team size: ' . $meta['team_size'];
        if (!empty($validated['start_date']))     $lines[] = 'Start: ' . $validated['start_date'];
        if (!empty($validated['end_date']))       $lines[] = 'End: ' . $validated['end_date'];
        if (!empty($meta['budget']))              $lines[] = 'Budget: ' . $meta['budget'];
        if (!empty($meta['primary_stakeholder'])) $lines[] = 'Primary stakeholder: ' . $meta['primary_stakeholder'];
        if (!empty($meta['objectives']))          $lines[] = 'Objectives: ' . $meta['objectives'];
        if (!empty($meta['constraints']))         $lines[] = 'Constraints: ' . $meta['constraints'];
        return $lines;
    }

    protected function stripContextSummary(string $text): string
    {
        $pattern = "/(?:\\n\\n|\\n)?Context Summary:\\n(?:- .*\\n?)+/mi";
        $cleaned = preg_replace($pattern, '', $text);
        return trim((string) $cleaned);
    }

    // ✅ AI PDF generator endpoint
    public function generateReport(Project $project, ProjectReportService $reports)
    {
        $this->authorize('view', $project);
        $result = $reports->generate($project);

        return response()->json([
            'download_url' => $result['download_url'],
            'path'         => $result['path'],
            'summary'      => $result['json']['summary'] ?? null,
        ]);
    }
}
