<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Str;
use OpenAI\Laravel\Facades\OpenAI;

/**
 * Enhanced Suggestion Chip Service
 * 
 * Generates highly sophisticated, contextually relevant suggestion chips that guide users
 * toward creating professional-grade tasks. These chips are:
 * - Domain-specific and industry-aware
 * - Actionable and concrete (not generic)
 * - Based on project context, timeline, and complexity
 * - Professionally relevant to different roles and stakeholders
 * - Include technical terminology and best practices
 */
class SuggestionChipService
{
    /**
     * Build up to $max suggestion chips that are contextually relevant and actionable
     * 
     * @return array<int,string>
     */
    public function fromProject(Project $project, int $max = 8): array
    {
        $max = max(3, min(10, $max));

        // Analyze project context for intelligent suggestions
        $projectContext = $this->analyzeProjectContext($project);
        
        // Get recent tasks for context
        $recentTaskTitles = $project->tasks()
            ->latest('id')
            ->limit(30)
            ->pluck('title')
            ->filter()
            ->values()
            ->all();

        // Try advanced AI-generated suggestions first
        $suggestions = $this->generateAdvancedSuggestions($project, $projectContext, $recentTaskTitles, $max);

        if (count($suggestions) >= $max) {
            return array_slice($suggestions, 0, $max);
        }

        // If AI fails or returns insufficient suggestions, use enhanced fallback
        $fallbackSuggestions = $this->generateContextualFallback($project, $projectContext, $max - count($suggestions));
        
        return array_slice(
            array_unique(array_merge($suggestions, $fallbackSuggestions)), 
            0, 
            $max
        );
    }

    /**
     * Generate advanced, contextually-aware suggestions using enhanced AI prompting
     */
    protected function generateAdvancedSuggestions(Project $project, array $context, array $recentTasks, int $max): array
    {
        $system = 'You are a principal product & delivery strategist. Generate concise, goal-oriented, viability-focused project description components (NOT generic tasks) that help refine and articulate the project scope and direction.';

        $recentTasksText = empty($recentTasks) ? 'None' : implode(', ', array_slice($recentTasks, 0, 10));

        $prompt = <<<PROMPT
        PROJECT SNAPSHOT
        Name: {$project->name}
        Description: {$project->description}
        Type: {$context['type']}
        Complexity: {$context['complexity']}
        Industry: {$context['industry']}
        Timeline: {$context['timeline']}
        Team Size: {$context['team_size']}
        Recent Executed Items: {$recentTasksText}

        INSTRUCTION
        Produce EXACTLY {$max} suggestion strings (each 4–14 words) that describe DISTINCT, VIABLE, GOAL-ORIENTED project definition elements. These are not micro-tasks; they are strategic or structural "project shaping" components a professional would add to a project description / charter / planning canvas.

        EACH SUGGESTION MUST:
        - Be specific, outcome-focused, and testable for success later
        - Represent a meaningful dimension of the project (objective, deliverable, constraint, risk theme, success metric, architectural pillar, operating principle, integration requirement, compliance consideration, user/market insight, governance mechanism, rollout strategy)
        - Use concrete nouns + strong verbs + measurable or directional qualifiers where possible
        - Avoid vague fluff (no: "improve quality", "better UX", "add features")
        - Avoid simple imperative task phrasing (like "Create wireframes")—instead elevate to descriptive project component (e.g. "Foundational UX interaction model for onboarding flow")
        - Be self-contained (no trailing ellipsis, no quotes)

        REPRESENT DIVERSITY
        Include a balanced mix across categories such as (only if contextually pertinent):
        - Objective: business or user value target
        - Key Deliverable: tangible artifact or subsystem
        - Success Metric: measurable performance outcome
        - Architectural Pillar: structural or technical foundation
        - Constraint / Compliance: boundary or regulation
        - Risk / Mitigation Theme: framed proactively
        - Integration / Dependency: external system or platform linkage
        - Analytics / Insight Instrumentation
        - Operational Capability (scalability, resilience, security posture)
        - User / Persona Insight Anchor
        - Rollout / Change Management Strategy

        STYLE & FORMAT RULES
        - No numbering, no bullets, no category labels in output (just the phrase itself)
        - No sentence-ending period unless abbreviation required
        - 4–14 words, concise but information-dense
        - Use domain vocabulary aligned to: {$context['type']} / {$context['industry']}

        EXCELLENT EXAMPLES
        - Core onboarding funnel conversion objective (40% target in 90 days)
        - Event-driven microservice architecture baseline for transactional integrity
        - WCAG 2.2 AA accessibility compliance commitment for primary user flows
        - Resilient payment reconciliation process (daily automated variance detection)
        - Privacy-first customer data minimization & encryption strategy
        - Referential product catalog normalization (eliminating attribute redundancy)
        - Real-time operational metrics dashboard (latency, error rate, retention)
        - Progressive rollout strategy with staged feature flags & rollback guardrails
        - Persona-aligned journey narrative for first-purchase path

        UNACCEPTABLE / REJECT
        - Improve system
        - Better performance
        - Add features
        - Fix bugs
        - Update UI

        OUTPUT FORMAT (STRICT JSON):
        {"suggestions":["Suggestion 1","Suggestion 2", "Suggestion 3"]}
        PROMPT;

        try {
            $response = OpenAI::chat()->create([
                'model'           => config('openai.model', 'gpt-4o'),
                'temperature'     => 0.55,
                'response_format' => ['type' => 'json_object'],
                'max_tokens'      => 1800,
                'messages'        => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user',   'content' => $prompt],
                ],
            ]);

            $raw = $response['choices'][0]['message']['content'] ?? '';
            $raw = preg_replace('/^```(?:json)?|```$/m', '', trim($raw));
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);

            if (is_array($decoded) && isset($decoded['suggestions']) && is_array($decoded['suggestions'])) {
                $suggestions = [];
                foreach ($decoded['suggestions'] as $suggestion) {
                    $cleaned = $this->sanitizeChip((string)$suggestion);
                    if ($cleaned && !in_array($cleaned, $suggestions, true)) {
                        $suggestions[] = $cleaned;
                    }
                }
                return $suggestions;
            }
        } catch (\Throwable $e) {
            // swallow and fallback
        }

        return [];
    }

    /**
     * Analyze project context to determine domain, complexity, and relevant characteristics
     */
    protected function analyzeProjectContext(Project $project): array
    {
        $name = strtolower($project->name ?? '');
        $description = strtolower($project->description ?? '');
        $text = $name . ' ' . $description;

        // Determine project type and characteristics
        $type = 'General Business';
        $industry = 'General';
        $complexity = 'Medium';
        $team_size = 'Small';

        // Software Development Detection
        if (preg_match('/\b(app|mobile|ios|android|react|vue|angular|frontend|backend|api|database|web|website|platform|software|code|development|programming)\b/', $text)) {
            $type = 'Software Development';
            $industry = 'Technology';
            $complexity = 'High';
        }
        // E-commerce Detection
        elseif (preg_match('/\b(ecommerce|shop|store|payment|stripe|commerce|sales|product|retail|marketplace)\b/', $text)) {
            $type = 'E-commerce Platform';
            $industry = 'Retail/Commerce';
            $complexity = 'High';
        }
        // Marketing Detection
        elseif (preg_match('/\b(marketing|campaign|seo|social|content|brand|advertising|digital|growth|promotion)\b/', $text)) {
            $type = 'Marketing Campaign';
            $industry = 'Marketing/Advertising';
            $complexity = 'Medium';
        }
        // Design Detection
        elseif (preg_match('/\b(design|ui|ux|prototype|wireframe|figma|sketch|brand|logo|visual|graphics)\b/', $text)) {
            $type = 'Design Project';
            $industry = 'Design/Creative';
            $complexity = 'Medium';
        }
        // Research Detection
        elseif (preg_match('/\b(research|analysis|study|survey|market|user|data|analytics|insights)\b/', $text)) {
            $type = 'Research Study';
            $industry = 'Research/Analytics';
            $complexity = 'Medium';
        }
        // Infrastructure Detection
        elseif (preg_match('/\b(infrastructure|devops|deployment|ci\/cd|cloud|aws|docker|kubernetes|security|server)\b/', $text)) {
            $type = 'Infrastructure Project';
            $industry = 'Technology/Operations';
            $complexity = 'High';
        }
        // Content/Education Detection
        elseif (preg_match('/\b(content|education|training|course|documentation|knowledge|learning)\b/', $text)) {
            $type = 'Content/Education';
            $industry = 'Education/Content';
            $complexity = 'Medium';
        }

        // Adjust complexity based on scope indicators
        if (preg_match('/\b(enterprise|large|complex|advanced|sophisticated|scalable|distributed|multi)\b/', $text)) {
            $complexity = 'High';
            $team_size = 'Large';
        } elseif (preg_match('/\b(simple|basic|small|minimal|prototype|mvp|proof|quick)\b/', $text)) {
            $complexity = 'Low';
            $team_size = 'Small';
        } elseif (preg_match('/\b(medium|standard|typical|normal|regular)\b/', $text)) {
            $team_size = 'Medium';
        }

        // Determine timeline context
        $timeline = 'Unknown';
        if ($project->start_date && $project->end_date) {
            $days = $project->start_date->diffInDays($project->end_date);
            if ($days <= 30) $timeline = 'Short-term (≤1 month)';
            elseif ($days <= 90) $timeline = 'Medium-term (1-3 months)';
            else $timeline = 'Long-term (>3 months)';
        }

        return [
            'type' => $type,
            'industry' => $industry,
            'complexity' => $complexity,
            'team_size' => $team_size,
            'timeline' => $timeline,
        ];
    }

    /**
     * Generate contextual fallback suggestions based on project analysis
     */
    protected function generateContextualFallback(Project $project, array $context, int $needed): array
    {
        if ($needed <= 0) return [];

        $base = [];

        // Core baselines applicable to most projects
        $base[] = 'Clear primary user value proposition articulation';
        $base[] = 'Foundational success metrics framework (activation, retention, quality)';
        $base[] = 'Risk register with top systemic mitigation themes';
        $base[] = 'Operational monitoring & alerting baseline (SLOs defined)';
        $base[] = 'Data governance & privacy compliance posture statement';
        $base[] = 'Stakeholder communication & escalation cadence';
        $base[] = 'Incremental rollout / feature flag governance strategy';
        $base[] = 'Defined scope boundaries & explicit out-of-scope exclusions';

        switch ($context['type']) {
            case 'Software Development':
                $base = array_merge($base, [
                    'Modular service architecture principle set (latency & resilience)',
                    'Secure authentication & authorization model (principle of least privilege)',
                    'Automated quality pipeline (test coverage, static analysis targets)',
                    'API versioning & backward compatibility contract',
                    'Performance budget targets for critical user journeys',
                ]);
                break;
            case 'E-commerce Platform':
                $base = array_merge($base, [
                    'Checkout funnel optimization objective (reduce abandonment)',
                    'Product taxonomy & attribute normalization standard',
                    'Fraud detection & payment reconciliation guideline',
                    'Customer trust & retention KPI alignment (LTV, churn)',
                ]);
                break;
            case 'Marketing Campaign':
                $base = array_merge($base, [
                    'Audience segmentation & messaging differentiation matrix',
                    'Attribution & conversion tracking instrumentation plan',
                    'Content velocity & editorial workflow governance',
                    'Channel performance benchmark targets (CTR, CPL)',
                ]);
                break;
            case 'Design Project':
                $base = array_merge($base, [
                    'Design system foundational tokens & accessibility baseline',
                    'Cross-platform interaction consistency guidelines',
                    'Persona-backed journey narrative & emotion map',
                    'UX research evidence repository & synthesis cadence',
                ]);
                break;
            case 'Infrastructure Project':
                $base = array_merge($base, [
                    'High-availability deployment topology & failover strategy',
                    'Capacity planning & horizontal scaling thresholds',
                    'Security hardening & secrets management model',
                    'Disaster recovery RTO/RPO target definition',
                ]);
                break;
        }

        if ($context['complexity'] === 'High') {
            $base = array_merge($base, [
                'Cross-team integration dependency mapping & SLA alignment',
                'Architecture decision record (ADR) governance process',
                'Formal change control & rollback validation workflow',
            ]);
        }

        if (str_contains($context['timeline'], 'Short-term')) {
            $base[] = 'Rapid validation milestone sequencing (evidence-driven)';
            $base[] = 'Early risk spike prioritization (unknowns reduction)';
        } elseif (str_contains($context['timeline'], 'Long-term')) {
            $base[] = 'Sustainable roadmap horizon planning (quarterly thematic goals)';
            $base[] = 'Progressive scalability & cost efficiency trajectory';
        }

        // Ensure uniqueness & cap
        $base = array_values(array_unique($base));
        shuffle($base);

        return array_slice($base, 0, $needed);
    }

    /**
     * Clean and sanitize a suggestion chip
     */
    protected function sanitizeChip(string $chip): string
    {
        $chip = preg_replace('/[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]|[\x{1F1E0}-\x{1F1FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]/u', '', $chip);
        $chip = trim($chip);
        // Remove enclosing quotes if any
        $chip = preg_replace('/^["\'\`]+|["\'\`]+$/', '', $chip);
        // Collapse whitespace
        $chip = preg_replace('/\s+/', ' ', $chip);
        // Enforce length boundaries (4–14 words); if too short or too long, we keep but trim long
        $words = explode(' ', $chip);
        if (count($words) > 14) {
            $chip = implode(' ', array_slice($words, 0, 14));
        }
        // Remove trailing punctuation that adds no value
        $chip = rtrim($chip, '.;,:');
        return $chip;
    }
}
