<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Str;
use OpenAI\Laravel\Facades\OpenAI;
use RuntimeException;

class TaskGeneratorService
{
    /**
     * Generate tasks with OpenAI.
     *
     * @return array<int,array{title:string,description:string,execution_date:?string}>
     *
     * @throws \JsonException|\RuntimeException
     */
    public function generateTasks(Project $project, int $num, string $userPrompt = ''): array
    {
        /* -----------------------------------------------------------------
         |  Build prompt
         |------------------------------------------------------------------*/
        $system = 'You are a meticulous senior project manager. '
                . 'Return ONLY valid JSON.';

        $prompt = <<<PROMPT
        Project name: {$project->name}

        Project description:
        {$project->description}

        Extra user instructions:
        {$userPrompt}

        ===
        Generate exactly {$num} granular, actionable tasks for the project.
        Respond with a JSON object that has a single property "tasks":
          "tasks": [ { title, description, execution_date }, ... ]
        Each task object must contain:
          title          (string ≤ 100 chars),
          description    (string),
          execution_date (YYYY-MM-DD or null).
        PROMPT;

        /* -----------------------------------------------------------------
         |  Call OpenAI
         |------------------------------------------------------------------*/
        $response = OpenAI::chat()->create([
            'model'           => 'gpt-4o-mini',
            'temperature'     => 0.7,
            'response_format' => ['type' => 'json_object'], // forces JSON object
            'messages'        => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user',   'content' => $prompt],
            ],
        ]);

        $raw = $response['choices'][0]['message']['content'] ?? '';

        /* -----------------------------------------------------------------
         |  Strip ```json fences (safety)
         |------------------------------------------------------------------*/
        $raw = preg_replace('/^```(?:json)?|```$/m', '', trim($raw));

        $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);

        if (! is_array($decoded) || ! isset($decoded['tasks']) || ! is_array($decoded['tasks'])) {
            throw new RuntimeException(
                'OpenAI response missing "tasks" array: ' . substr($raw, 0, 120)
            );
        }

        /* -----------------------------------------------------------------
         |  Normalise
         |------------------------------------------------------------------*/
        return array_values(array_map(static function (array $task): array {
            return [
                'title'          => Str::limit($task['title'] ?? '', 100, ''),
                'description'    => $task['description']     ?? '',
                'execution_date' => $task['execution_date']  ?? null,
            ];
        }, $decoded['tasks']));
    }
}
