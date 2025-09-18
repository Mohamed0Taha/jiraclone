<?php

namespace App\Services\Generative;

use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;

class DesignAnalysisService
{
    private OpenAIService $openAI;
    private BlueprintRegistry $registry;

    public function __construct(OpenAIService $openAI, BlueprintRegistry $registry)
    {
        $this->openAI = $openAI;
        $this->registry = $registry;
    }

    public function getUIElementsAndKeywords(string $userRequest): array
    {
        $prompt = "What are the most standard UI expectations for {$userRequest} and which design cues should I reference before building the UI?\n\nAnalyze the user request and provide:\n1. Essential UI elements (controls, displays, supporting panels)\n2. Layout structure recommendations that reflect common/expected patterns\n3. Functional requirements that real users expect this component to support\n4. Accessibility considerations or interaction notes that prevent usability gaps\n5. Design validation checklist items that the final component must satisfy before coding\n6. Keywords for finding relevant design inspiration images\n\nReturn as JSON with this structure:\n{\n  \"ui_elements\": [\"list of essential UI components\"],\n  \"layout_suggestions\": [\"layout recommendations\"],\n  \"functional_requirements\": [\"list of behaviours users expect\"],\n  \"design_checklist\": [\"specific checks to confirm the UI feels standard\"],\n  \"accessibility_notes\": [\"key accessibility considerations\"],\n  \"keywords\": [\"keyword1\", \"keyword2\", \"keyword3\"],\n  \"design_style\": \"recommended design style\"\n}\n\nFocus on practical, implementable guidance that mirrors proven, industry-standard implementations.";

        $response = $this->openAI->chatJson([
            ['role' => 'system', 'content' => 'You are a UI/UX expert who analyzes application requirements and provides structured recommendations for UI elements and design research keywords.'],
            ['role' => 'user', 'content' => $prompt]
        ], 0.3);

        Log::info('UI Analysis completed (refactored)', [
            'user_request' => $userRequest,
            'ui_elements_count' => count($response['ui_elements'] ?? []),
            'keywords_count' => count($response['keywords'] ?? [])
        ]);

        return [
            'ui_elements' => $response['ui_elements'] ?? ['primary display area', 'supporting controls', 'activity history'],
            'layout_suggestions' => $response['layout_suggestions'] ?? ['two-column responsive layout'],
            'functional_requirements' => $response['functional_requirements'] ?? ['provide core task execution end-to-end'],
            'design_checklist' => $response['design_checklist'] ?? ['final UI must align with industry-standard layout for this component type'],
            'accessibility_notes' => $response['accessibility_notes'] ?? ['ensure keyboard navigation and screen reader support'],
            'keywords' => $response['keywords'] ?? [str_replace(' ', '+', $userRequest)],
            'design_style' => $response['design_style'] ?? 'modern enterprise'
        ];
    }

    public function mergeWithBlueprint(array $analysis, ?array $blueprint): array
    {
        if (!$blueprint) return $analysis;
        $analysis['ui_elements'] = $this->mergeDistinct($analysis['ui_elements'] ?? [], $blueprint['ui_elements'] ?? []);
        $analysis['layout_suggestions'] = $this->mergeDistinct($analysis['layout_suggestions'] ?? [], $blueprint['layout_suggestions'] ?? []);
        $analysis['functional_requirements'] = $this->mergeDistinct($analysis['functional_requirements'] ?? [], $blueprint['functional_requirements'] ?? []);
        $analysis['design_checklist'] = $this->mergeDistinct($analysis['design_checklist'] ?? [], $blueprint['design_checklist'] ?? []);
        $analysis['accessibility_notes'] = $this->mergeDistinct($analysis['accessibility_notes'] ?? [], $blueprint['accessibility_notes'] ?? []);
        $analysis['keywords'] = $this->mergeDistinct($analysis['keywords'] ?? [], $blueprint['keywords'] ?? []);
        $analysis['structure_outline'] = $this->mergeDistinct($analysis['structure_outline'] ?? [], $blueprint['structure_outline'] ?? []);
        if (!empty($blueprint['replication_instructions'])) {
            $analysis['replication_instructions'] = $this->mergeDistinct($analysis['replication_instructions'] ?? [], $blueprint['replication_instructions']);
        }
        if (!empty($blueprint['preferred_queries'])) {
            $analysis['keywords'] = array_values(array_unique(array_merge($blueprint['preferred_queries'], $analysis['keywords'])));
        }
        if (empty($analysis['design_style']) && !empty($blueprint['design_style'])) {
            $analysis['design_style'] = $blueprint['design_style'];
        }
        $analysis['blueprint_source'] = $blueprint['slug'] ?? 'curated-default';
        if (!empty($blueprint['canonical_reference'])) {
            $analysis['canonical_reference'] = $blueprint['canonical_reference'];
        }
        return $analysis;
    }

    public function ensureChecklistCompleteness(array $analysis, ?array $blueprint = null): array
    {
        if (empty($analysis['design_checklist']) || count(array_filter($analysis['design_checklist'])) < 3) {
            if ($blueprint && !empty($blueprint['design_checklist'])) {
                $analysis['design_checklist'] = $this->mergeDistinct($analysis['design_checklist'] ?? [], $blueprint['design_checklist']);
            } else {
                $auto = [];
                foreach (($analysis['ui_elements'] ?? []) as $el) $auto[] = "UI must prominently include: {$el}";
                foreach (array_slice($analysis['functional_requirements'] ?? [], 0, 2) as $req) $auto[] = "Feature must support: {$req}";
                $analysis['design_checklist'] = $this->mergeDistinct($analysis['design_checklist'] ?? [], $auto);
            }
        }
        return $analysis;
    }

    public function buildDesignGuidanceSection(string $userRequest, array $analysis, ?array $blueprint = null): string
    {
        $lines = [];
        if ($blueprint) $lines[] = "REFERENCE BLUEPRINT: " . ($blueprint['slug'] ?? 'curated') . " (derived from standard implementations).";
        if (!empty($analysis['canonical_reference'])) $lines[] = "CANONICAL PRODUCT TO MIRROR: {$analysis['canonical_reference']} - match its layout, affordances, and styling cues.";
        if (!empty($analysis['replication_instructions'])) {
            $lines[] = "CANONICAL LAYOUT ELEMENTS TO REPLICATE:";
            foreach ($analysis['replication_instructions'] as $i) $lines[] = '- ' . $i;
        }
        if (!empty($analysis['structure_outline'])) {
            $lines[] = "STRUCTURE OUTLINE TO IMPLEMENT:";
            foreach ($analysis['structure_outline'] as $o) $lines[] = '- ' . $o;
        }
        if (!empty($analysis['design_checklist'])) {
            $lines[] = "DESIGN VALIDATION CHECKLIST:";
            foreach ($analysis['design_checklist'] as $i) $lines[] = '- ' . $i;
        }
        if (!empty($analysis['functional_requirements'])) {
            $lines[] = "FUNCTIONAL REQUIREMENTS TO VERIFY:";
            foreach ($analysis['functional_requirements'] as $r) $lines[] = '- ' . $r;
        }
        if (!empty($analysis['accessibility_notes'])) {
            $lines[] = "ACCESSIBILITY EXPECTATIONS:";
            foreach ($analysis['accessibility_notes'] as $n) $lines[] = '- ' . $n;
        }
        $lines[] = 'REPLICATION REQUIREMENT: Mirror the layout, interaction patterns, and visual hierarchy demonstrated in the reference designs—do not improvise alternate structures.';
        if (empty($lines)) $lines[] = "Ensure the generated experience mirrors standard implementations for {$userRequest}.";
        return implode("\n", $lines);
    }

    public function log(string $userRequest, array $analysis, ?array $blueprint = null): void
    {
        Log::info('GenerativeUI/DesignAnalysis prepared', [
            'user_request' => $userRequest,
            'blueprint' => $blueprint['slug'] ?? null,
            'ui_elements_count' => count($analysis['ui_elements'] ?? []),
            'design_checklist_count' => count($analysis['design_checklist'] ?? []),
            'functional_requirements_count' => count($analysis['functional_requirements'] ?? []),
            'accessibility_notes_count' => count($analysis['accessibility_notes'] ?? []),
        ]);
    }

    private function mergeDistinct(array $a, array $b): array
    {
        $m = array_filter(array_map('trim', array_merge($a, $b)));
        return array_values(array_unique($m));
    }
}

