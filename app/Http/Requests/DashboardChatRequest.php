<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DashboardChatRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return \Illuminate\Support\Facades\Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'prompt' => [
                'required',
                'string',
                'min:3',
                'max:1000'
            ],
            'project_id' => [
                'nullable',
                'integer',
                'exists:projects,id'
            ],
            'context' => [
                'nullable',
                'array'
            ],
            'context.include_data' => [
                'nullable',
                'boolean'
            ],
            'context.dashboard_type' => [
                'nullable',
                'string',
                'in:overview,analytics,reports,custom'
            ],
            'context.preferred_charts' => [
                'nullable',
                'array'
            ],
            'context.preferred_charts.*' => [
                'string',
                'in:bar,line,pie,doughnut,scatter,area,radar'
            ]
        ];
    }

    /**
     * Get custom error messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'prompt.required' => 'A prompt is required to generate the dashboard.',
            'prompt.min' => 'The prompt must be at least 3 characters long.',
            'prompt.max' => 'The prompt cannot exceed 1000 characters.',
            'project_id.exists' => 'The specified project does not exist.',
            'context.dashboard_type.in' => 'Dashboard type must be one of: overview, analytics, reports, custom.',
            'context.preferred_charts.*.in' => 'Chart types must be one of: bar, line, pie, doughnut, scatter, area, radar.'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'prompt' => 'dashboard prompt',
            'project_id' => 'project ID',
            'context.include_data' => 'include project data flag',
            'context.dashboard_type' => 'dashboard type',
            'context.preferred_charts' => 'preferred chart types'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Clean up the prompt
        if ($this->has('prompt')) {
            $this->merge([
                'prompt' => trim($this->input('prompt'))
            ]);
        }

        // Set default context values
        if (!$this->has('context')) {
            $this->merge([
                'context' => []
            ]);
        }

        $context = $this->input('context', []);
        
        // Set default include_data to true if not specified
        if (!isset($context['include_data'])) {
            $context['include_data'] = true;
        }

        // Set default dashboard_type if not specified
        if (!isset($context['dashboard_type'])) {
            $context['dashboard_type'] = 'overview';
        }

        $this->merge(['context' => $context]);
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Additional validation logic can go here
            
            // Check if user has access to the specified project
            if ($this->has('project_id') && $this->input('project_id')) {
                $project = \App\Models\Project::find($this->input('project_id'));
                
                if ($project && !$this->userCanAccessProject(\Illuminate\Support\Facades\Auth::user(), $project)) {
                    $validator->errors()->add('project_id', 'You do not have access to this project.');
                }
            }

            // Validate prompt content (basic content filtering)
            $prompt = $this->input('prompt', '');
            if ($this->containsInappropriateContent($prompt)) {
                $validator->errors()->add('prompt', 'The prompt contains inappropriate content.');
            }
        });
    }

    /**
     * Check if user can access the specified project
     */
    private function userCanAccessProject($user, $project): bool
    {
        if (!$user || !$project) {
            return false;
        }

        return $user->id === $project->user_id || 
               $project->team_members()->where('user_id', $user->id)->exists();
    }

    /**
     * Basic content filtering for prompts
     */
    private function containsInappropriateContent(string $content): bool
    {
        // Basic keyword filtering - you can expand this as needed
        $inappropriateKeywords = [
            'hack', 'exploit', 'password', 'secret', 'token', 'private'
        ];

        $lowercaseContent = strtolower($content);
        
        foreach ($inappropriateKeywords as $keyword) {
            if (strpos($lowercaseContent, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the sanitized and validated prompt
     */
    public function getPrompt(): string
    {
        return $this->validated()['prompt'];
    }

    /**
     * Get the project ID if provided
     */
    public function getProjectId(): ?int
    {
        return $this->validated()['project_id'] ?? null;
    }

    /**
     * Get the context array
     */
    public function getContext(): array
    {
        return $this->validated()['context'] ?? [];
    }

    /**
     * Check if project data should be included
     */
    public function shouldIncludeProjectData(): bool
    {
        return $this->getContext()['include_data'] ?? true;
    }

    /**
     * Get the preferred dashboard type
     */
    public function getDashboardType(): string
    {
        return $this->getContext()['dashboard_type'] ?? 'overview';
    }

    /**
     * Get preferred chart types
     */
    public function getPreferredCharts(): array
    {
        return $this->getContext()['preferred_charts'] ?? [];
    }
}
