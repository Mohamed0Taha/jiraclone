<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;
use RuntimeException;
use Carbon\Carbon;

/**
 * Enhanced Task Generator Service (batched)
 *
 * Generates highly detailed, professional-grade tasks that are:
 * - Contextually relevant to the project domain (software, marketing, design, etc.)
 * - Granular and actionable with specific deliverables
 * - Include industry best practices and proper terminology
 * - Contain detailed acceptance criteria and dependencies
 * - Professionally scoped for 1–3 days of work per task
 *
 * Additional metadata includes: category, priority, estimated hours, dependencies, deliverables
 *
 * This version generates tasks in batches to guarantee the user-specified count.
 */
class TaskGeneratorService
{
    /** Maximum tasks to request from the LLM in a single API call. */
    protected int $maxTasksPerCall = 8;

    /** Number of retries per batch if the model returns fewer tasks than requested. */
    protected int $batchRetries = 2;

    /**
     * Generate detailed, professional-grade tasks for a project.
     *
     * @param  Project $project
     * @param  int     $num        Total number of tasks the caller wants
     * @param  string  $userPrompt Optional extra guidance from the user
     * @return array<int,array{title:string,description:string,start_date:?string,end_date:?string,category:string,priority:string,estimated_hours:int,complexity:string,dependencies:string,deliverables:string}>
     */
    public function generateTasks(Project $project, int $num, string $userPrompt = ''): array
    {
        // Inertia-friendly guard: let controller catch and redirect with an error flash
        $apiKey = config('openai.api_key') ?: env('OPENAI_API_KEY');
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new RuntimeException('AI is not configured on this server. Set OPENAI_API_KEY.');
        }

        // Clamp request size (hard cap to keep things safe)
        $num = max(1, min(50, $num));

        if ($num < 1) {
            return [];
        }

        $system = $this->systemPrompt();

        // Analyze project context to determine domain and complexity
        $projectContext = $this->analyzeProjectContext($project, $userPrompt);

        $allTasks   = [];
        $remaining  = $num;
        $startIndex = 1;

        // Generate tasks in batches until we reach $num.
        while ($remaining > 0) {
            $batchTarget = min($this->maxTasksPerCall, $remaining);

            // For large totals, shorten per-task description to avoid token limits.
            $longForm       = $num <= $this->maxTasksPerCall;
            $descWordRange  = $longForm ? '200-400' : '120-220';
            $indexEnd       = $startIndex + $batchTarget - 1;

            $batchPrompt = $this->buildBatchPrompt(
                project: $project,
                projectContext: $projectContext,
                userPrompt: $userPrompt,
                indexStart: $startIndex,
                indexEnd: $indexEnd,
                batchCount: $batchTarget,
                descWordRange: $descWordRange,
                totalRequested: $num,
                alreadyChosenTitles: array_map(static fn (array $t) => $t['title'], $allTasks)
            );

            $maxTokens = $this->computeMaxTokensForBatch($batchTarget, $longForm);

            $batchTasks = [];
            $attempt    = 0;

            // Try up to $batchRetries+1 times to fill this batch
            do {
                try {
                    $response = OpenAI::chat()->create([
                        'model'           => config('openai.model', 'gpt-4o'),
                        'temperature'     => 0.7,
                        'response_format' => ['type' => 'json_object'],
                        'max_tokens'      => $maxTokens,
                        'messages'        => [
                            ['role' => 'system', 'content' => $system],
                            ['role' => 'user',   'content' => $batchPrompt],
                        ],
                    ]);
                } catch (\Throwable $e) {
                    Log::error('OpenAI batch call failed', [
                        'project_id' => $project->id,
                        'attempt'    => $attempt,
                        'error'      => $e->getMessage(),
                    ]);
                    // Bubble a friendly error to the controller (Inertia-safe)
                    throw new RuntimeException('Failed to contact AI service. Please try again.');
                }

                $raw = (string)($response['choices'][0]['message']['content'] ?? '');
                $raw = preg_replace('/^```(?:json)?|```$/m', '', trim($raw));

                $decoded = null;
                try {
                    $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
                } catch (\Throwable $e) {
                    // Try to salvage by extracting the first outer JSON object (defensive)
                    if (preg_match('/\{.*\}/s', $raw, $m)) {
                        try {
                            $decoded = json_decode($m[0], true, flags: JSON_THROW_ON_ERROR);
                        } catch (\Throwable $e2) {
                            $decoded = null;
                        }
                    }
                }

                $receivedTasks = (is_array($decoded) && isset($decoded['tasks']) && is_array($decoded['tasks']))
                    ? $decoded['tasks']
                    : [];

                // Normalize & de-duplicate
                $normalized = $this->normalizeMapTasks($receivedTasks, $project);
                $normalized = $this->dedupeByTitle($normalized);
                $normalized = $this->removeTitlesAlreadyChosen($normalized, $allTasks);

                if (count($normalized) > $batchTarget) {
                    $normalized = array_slice($normalized, 0, $batchTarget);
                }

                $batchTasks = $normalized;

                // If not enough, retry with tighter prompt and lower token budget
                if (count($batchTasks) < $batchTarget && $attempt < $this->batchRetries) {
                    $descWordRange = '90-140';
                    $batchPrompt   = $this->buildBatchPrompt(
                        project: $project,
                        projectContext: $projectContext,
                        userPrompt: $userPrompt,
                        indexStart: $startIndex,
                        indexEnd: $indexEnd,
                        batchCount: $batchTarget,
                        descWordRange: $descWordRange,
                        totalRequested: $num,
                        alreadyChosenTitles: array_map(static fn (array $t) => $t['title'], $allTasks)
                    );
                    $maxTokens = $this->computeMaxTokensForBatch($batchTarget, false);
                }

                $attempt++;
            } while (count($batchTasks) < $batchTarget && $attempt <= $this->batchRetries);

            // Add what we got from this batch
            foreach ($batchTasks as $t) {
                $allTasks[] = $t;
            }

            $added = count($batchTasks);
            if ($added === 0) {
                // Prevent infinite looping
                break;
            }

            $remaining  -= $added;
            $startIndex += $added;
        }

        // Pad with compact tasks if still short
        if (count($allTasks) < $num) {
            $needed   = $num - count($allTasks);
            $padStart = $startIndex;
            $padEnd   = $padStart + $needed - 1;

            $fallback = $this->generateCompactFallback(
                project: $project,
                projectContext: $projectContext,
                userPrompt: $userPrompt,
                remaining: $needed,
                indexStart: $padStart,
                indexEnd: $padEnd,
                totalRequested: $num
            );

            $allTasks = array_merge($allTasks, $fallback);
        }

        if (count($allTasks) > $num) {
            $allTasks = array_slice($allTasks, 0, $num);
        }

        return array_values($allTasks);
    }

    /** Build the system prompt string. */
    protected function systemPrompt(): string
    {
        return 'You are an expert senior project manager with 15+ years of experience across software development, business operations, marketing, and technical implementation. You create highly detailed, actionable tasks that professionals would actually execute in real-world scenarios. Always return STRICT, VALID JSON that exactly matches the requested schema and task count. Do not include any prose outside JSON.';
    }

    /** Build a batch user prompt (indexing + already chosen titles to reduce dupes). */
    protected function buildBatchPrompt(
        Project $project,
        array $projectContext,
        string $userPrompt,
        int $indexStart,
        int $indexEnd,
        int $batchCount,
        string $descWordRange,
        int $totalRequested,
        array $alreadyChosenTitles
    ): string {
        $pStart = optional($project->start_date)->toDateString();
        $pEnd   = optional($project->end_date)->toDateString();

        $already = '';
        if (!empty($alreadyChosenTitles)) {
            $escaped = array_map(static fn ($t) => str_replace('"', '\"', $t), $alreadyChosenTitles);
            $already = "AVOID DUPLICATES WITH THESE EXISTING TITLES:\n- " . implode("\n- ", $escaped) . "\n\n";
        }

        $batchRangeLabel = "{$indexStart}-{$indexEnd}";

        return <<<PROMPT
🎯 PROJECT ANALYSIS:
Name: {$project->name}
Description: {$project->description}
Timeline: {$pStart} to {$pEnd}
Context Type: {$projectContext['type']}
Complexity Level: {$projectContext['complexity']}

📋 USER REQUIREMENTS:
{$userPrompt}

{$already}🚀 TASK GENERATION REQUIREMENTS (BATCH: {$batchRangeLabel} of {$totalRequested}):
Generate exactly {$batchCount} highly detailed, professional-grade tasks.

1) GRANULAR & ACTIONABLE: A team member should know exactly what to do.
2) CONTEXTUALLY RELEVANT: Align with project type, industry standards, and domain expertise.
3) PROFESSIONALLY STRUCTURED: Include deliverables, acceptance criteria, and dependencies.
4) REALISTICALLY SCOPED: Each task is 1–3 days of work for one person.
5) TECHNICALLY PRECISE: Use industry terminology and best practices.

📊 TASK CATEGORIES & COMPLEXITY GUIDANCE:
- Research & Analysis (market research, technical feasibility, competitive analysis) [8-40 hours]
- Planning & Strategy (roadmapping, architecture design, stakeholder alignment) [16-56 hours]
- Development & Implementation (coding, testing, deployment, configuration) [8-80 hours]
- Design & UX (wireframing, prototyping, user testing, design systems) [12-48 hours]
- Content & Documentation (technical docs, user guides, API documentation) [6-32 hours]
- Quality Assurance (testing strategies, automated testing, performance optimization) [12-64 hours]
- Marketing & Growth (campaign creation, SEO optimization, analytics setup) [8-40 hours]
- Operations & Infrastructure (CI/CD setup, monitoring, security implementation) [16-72 hours]
- Stakeholder Management (client meetings, status reporting, training sessions) [4-24 hours]

⏱️ TIME ESTIMATION RULES:
- Simple: 4–16 hours
- Medium: 16–40 hours
- Complex: 40–80 hours
- Consider {$projectContext['complexity']} project complexity level.
- Include research, implementation, testing, documentation, and coordination.

🎯 OUTPUT FORMAT (STRICT JSON ONLY):
{
  "tasks": [
    {
      "title": "Specific, action-oriented title (80-100 chars)",
      "description": "Detailed description including: objective, deliverables, acceptance criteria, tools/technologies needed, and expected outcome ({$descWordRange} words)",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "category": "Research|Planning|Development|Design|Content|QA|Marketing|Operations|Management",
      "priority": "High|Medium|Low",
      "estimated_hours": "Integer 4-80",
      "complexity": "Simple|Medium|Complex",
      "dependencies": "Brief description of what must be completed first",
      "deliverables": "Specific outputs/artifacts that will be produced"
    }
  ]
}

🔧 ADVANCED RULES:
- Tasks should follow logical dependencies and workflow sequences.
- Include both technical and business-focused tasks.
- Consider different roles: developers, designers, marketers, project managers.
- Each task should contribute meaningfully to project success.
- Use specific tools, frameworks, and methodologies relevant to the domain.
- Include risk mitigation and quality control tasks.
- Consider scalability, security, and performance implications.
- Plan for proper documentation and knowledge transfer.

CRITICAL:
- Return EXACTLY {$batchCount} tasks in the "tasks" array.
- DO NOT include any content outside the JSON object.
- Ensure each title is unique and not in the provided existing titles list.
PROMPT;
    }

    /** Compute a conservative max_tokens budget for a batch. */
    protected function computeMaxTokensForBatch(int $batchTarget, bool $longForm): int
    {
        $wordsPerTask   = $longForm ? 320 : 160;
        $tokensPerTask  = (int) round($wordsPerTask * 1.35) + 120; // JSON + field overhead
        $approx         = ($tokensPerTask * $batchTarget) + 600;   // margin
        return max(2000, min(7000, $approx));
    }

    /** Analyze project context to determine type and complexity. */
    protected function analyzeProjectContext(Project $project, string $userPrompt): array
    {
        $name        = strtolower($project->name ?? '');
        $description = strtolower($project->description ?? '');
        $prompt      = strtolower($userPrompt);
        $text        = $name . ' ' . $description . ' ' . $prompt;

        $type       = 'General';
        $complexity = 'Medium';

        if (preg_match('/\b(app|mobile|ios|android|react|vue|angular|frontend|backend|api|database|web|website|platform)\b/', $text)) {
            $type = 'Software Development'; $complexity = 'High';
        } elseif (preg_match('/\b(marketing|campaign|seo|social|content|brand|advertising|digital|growth)\b/', $text)) {
            $type = 'Marketing & Growth';   $complexity = 'Medium';
        } elseif (preg_match('/\b(design|ui|ux|prototype|wireframe|figma|sketch|brand|logo|visual)\b/', $text)) {
            $type = 'Design & UX';          $complexity = 'Medium';
        } elseif (preg_match('/\b(research|analysis|study|survey|market|user|data|analytics)\b/', $text)) {
            $type = 'Research & Analysis';  $complexity = 'Medium';
        } elseif (preg_match('/\b(infrastructure|devops|deployment|ci\/cd|cloud|aws|docker|kubernetes|security)\b/', $text)) {
            $type = 'Infrastructure & Operations'; $complexity = 'High';
        } elseif (preg_match('/\b(ecommerce|shop|store|payment|stripe|commerce|sales|product)\b/', $text)) {
            $type = 'E-commerce';           $complexity = 'High';
        }

        if (preg_match('/\b(enterprise|large|complex|advanced|sophisticated|scalable|distributed)\b/', $text)) {
            $complexity = 'High';
        } elseif (preg_match('/\b(simple|basic|small|minimal|prototype|mvp|proof)\b/', $text)) {
            $complexity = 'Low';
        }

        return ['type' => $type, 'complexity' => $complexity];
    }

    /** Calculate estimated hours based on task complexity and category. */
    protected function calculateEstimatedHours(string $complexity, string $category, $aiEstimate = null): int
    {
        $baseHours = is_numeric($aiEstimate) ? (int) $aiEstimate : null;

        if (!$baseHours) {
            $categoryBaseHours = [
                'Research'    => 16,
                'Planning'    => 24,
                'Development' => 32,
                'Design'      => 20,
                'Content'     => 12,
                'QA'          => 20,
                'Marketing'   => 16,
                'Operations'  => 28,
                'Management'  => 8,
            ];
            $baseHours = $categoryBaseHours[$category] ?? 16;
        }

        $complexityMultipliers = ['Simple' => 0.6, 'Medium' => 1.0, 'Complex' => 1.8];
        $multiplier            = $complexityMultipliers[$complexity] ?? 1.0;
        $calculatedHours       = (int) round($baseHours * $multiplier);

        return max(4, min(80, $calculatedHours));
    }

    protected function normalizeDate($value): ?string
    {
        if (empty($value)) return null;
        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Ensure dates are ordered and within project frame (when available). */
    protected function normalizeRange(?string $start, ?string $end, Project $project): array
    {
        $pStart = optional($project->start_date)->toDateString();
        $pEnd   = optional($project->end_date)->toDateString();

        if (!$start && $pStart) $start = $pStart;
        if (!$start && !$pStart) $start = now()->toDateString();
        if (!$end) $end = $start;

        if ($start > $end) [$start, $end] = [$end, $start];

        if ($pStart && $start < $pStart) $start = $pStart;
        if ($pEnd   && $end   > $pEnd)   $end   = $pEnd;
        if ($end < $start) $end = $start;

        return [$start, $end];
    }

    /** Normalize/map model output into your array shape. */
    protected function normalizeMapTasks(array $receivedTasks, Project $project): array
    {
        $out = [];
        foreach ($receivedTasks as $task) {
            [$s, $e] = $this->normalizeRange(
                $this->normalizeDate($task['start_date'] ?? null),
                $this->normalizeDate($task['end_date'] ?? null),
                $project
            );

            $estimatedHours = $this->calculateEstimatedHours(
                (string)($task['complexity'] ?? 'Medium'),
                (string)($task['category'] ?? 'Development'),
                $task['estimated_hours'] ?? null
            );

            $mapped = [
                'title'           => Str::limit((string)($task['title'] ?? ''), 100, ''),
                'description'     => (string)($task['description'] ?? ''),
                'start_date'      => $s,
                'end_date'        => $e,
                'category'        => (string)($task['category'] ?? 'Development'),
                'priority'        => (string)($task['priority'] ?? 'Medium'),
                'estimated_hours' => $estimatedHours,
                'complexity'      => (string)($task['complexity'] ?? 'Medium'),
                'dependencies'    => (string)($task['dependencies'] ?? ''),
                'deliverables'    => (string)($task['deliverables'] ?? ''),
            ];

            if ($mapped['title'] !== '') {
                $out[] = $mapped;
            }
        }
        return $out;
    }

    /** Remove duplicates within a list using case-insensitive titles. */
    protected function dedupeByTitle(array $tasks): array
    {
        $seen = [];
        $out  = [];
        foreach ($tasks as $t) {
            $key = mb_strtolower($t['title'] ?? '');
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $out[]      = $t;
        }
        return $out;
    }

    /** Remove tasks that duplicate titles already chosen in previous batches. */
    protected function removeTitlesAlreadyChosen(array $candidateTasks, array $chosenTasks): array
    {
        if (empty($chosenTasks)) return $candidateTasks;

        $chosen = [];
        foreach ($chosenTasks as $t) {
            $key = mb_strtolower($t['title'] ?? '');
            if ($key !== '') $chosen[$key] = true;
        }

        $out = [];
        foreach ($candidateTasks as $t) {
            $key = mb_strtolower($t['title'] ?? '');
            if ($key === '' || isset($chosen[$key])) continue;
            $out[] = $t;
        }
        return $out;
    }

    /**
     * As a last resort, fill remaining tasks with compact tasks to meet the exact requested count.
     */
    protected function generateCompactFallback(
        Project $project,
        array $projectContext,
        string $userPrompt,
        int $remaining,
        int $indexStart,
        int $indexEnd,
        int $totalRequested
    ): array {
        if ($remaining < 1) return [];

        $system     = $this->systemPrompt();
        $batchCount = $remaining;

        $compactPrompt = $this->buildBatchPrompt(
            project: $project,
            projectContext: $projectContext,
            userPrompt: $userPrompt,
            indexStart: $indexStart,
            indexEnd: $indexEnd,
            batchCount: $batchCount,
            descWordRange: '80-120',
            totalRequested: $totalRequested,
            alreadyChosenTitles: []
        );

        try {
            $response = OpenAI::chat()->create([
                'model'           => config('openai.model', 'gpt-4o'),
                'temperature'     => 0.5,
                'response_format' => ['type' => 'json_object'],
                'max_tokens'      => $this->computeMaxTokensForBatch($remaining, false),
                'messages'        => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user',   'content' => $compactPrompt],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('OpenAI compact fallback failed', [
                'project_id' => $project->id,
                'error'      => $e->getMessage(),
            ]);
            // If AI is unreachable even for fallback, just return empty; controller already has UX
            return [];
        }

        $raw = (string)($response['choices'][0]['message']['content'] ?? '');
        $raw = preg_replace('/^```(?:json)?|```$/m', '', trim($raw));

        try {
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            $decoded = null;
        }

        $result = [];
        if (is_array($decoded) && isset($decoded['tasks']) && is_array($decoded['tasks'])) {
            $result = $this->normalizeMapTasks($decoded['tasks'], $project);
        }

        if (count($result) > $remaining) {
            $result = array_slice($result, 0, $remaining);
        }

        return array_values($result);
    }
}
