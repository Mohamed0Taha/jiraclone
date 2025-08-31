<?php

namespace Database\Seeders;

use App\Models\PMQuestion;
use Illuminate\Database\Seeder;

class GeneralPMQuestionBankSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing general project management questions to avoid duplicates
        PMQuestion::where('category', 'project_management')->delete();

        // Mid-level difficulty: mix conceptual + light scenario + calculation interpretation
        $mcQuestions = [
            ['question' => 'Primary purpose of a Project Charter is to:', 'options' => ['A' => 'Detail every task', 'B' => 'Authorize the project and assign PM authority', 'C' => 'Replace business case benefits', 'D' => 'Lock the final schedule'], 'correct' => 'B', 'exp' => 'Charter formally authorizes and grants authority.'],
            ['question' => 'Progressive elaboration differs from scope creep because it:', 'options' => ['A' => 'Changes approved scope unilaterally', 'B' => 'Refines detail within approved baseline', 'C' => 'Reduces requirements intentionally', 'D' => 'Always increases budget'], 'correct' => 'B', 'exp' => 'Detail refinement vs unapproved addition.'],
            ['question' => 'A CPI of 0.92 and SPI of 1.03 indicate the project is:', 'options' => ['A' => 'Over budget efficiency, slightly ahead of schedule', 'B' => 'Under budget and ahead of schedule', 'C' => 'Over budget and behind schedule', 'D' => 'On budget and on schedule'], 'correct' => 'A', 'exp' => 'CPI<1 cost efficiency issue; SPI>1 schedule ahead.'],
            ['question' => 'Which artifact best supports clear role accountability?', 'options' => ['A' => 'RACI matrix', 'B' => 'Issue log', 'C' => 'Risk register', 'D' => 'Change log'], 'correct' => 'A', 'exp' => 'RACI clarifies responsibility & authority.'],
            ['question' => 'A high power / low interest stakeholder should be:', 'options' => ['A' => 'Managed closely daily', 'B' => 'Kept satisfied with targeted information', 'C' => 'Ignored until escalation', 'D' => 'Given all raw data streams'], 'correct' => 'B', 'exp' => 'Keep satisfied strategy.'],
            ['question' => 'Rolling wave planning is MOST useful when:', 'options' => ['A' => 'All requirements frozen early', 'B' => 'Near-term work is clear; distant work uncertain', 'C' => 'Team capacity fixed for 2 years', 'D' => 'No stakeholder risk exists'], 'correct' => 'B', 'exp' => 'Detail near term, high-level future.'],
            ['question' => 'Earned Value (EV) represents:', 'options' => ['A' => 'Actual cost of work performed', 'B' => 'Planned value of all work', 'C' => 'Budgeted value of work completed', 'D' => 'Forecast to complete remaining work'], 'correct' => 'C', 'exp' => 'EV = % complete * BAC segment.'],
            ['question' => 'Fast tracking a schedule MOST likely:', 'options' => ['A' => 'Increases risk of rework', 'B' => 'Reduces risk significantly', 'C' => 'Improves quality automatically', 'D' => 'Guarantees cost savings'], 'correct' => 'A', 'exp' => 'Parallel work elevates rework risk.'],
            ['question' => 'A probability / impact matrix is used during:', 'options' => ['A' => 'Qualitative risk analysis', 'B' => 'Quantitative risk simulation', 'C' => 'Procurement negotiation', 'D' => 'Closing phase only'], 'correct' => 'A', 'exp' => 'Qualitative prioritization tool.'],
            ['question' => 'Critical path activities share this property:', 'options' => ['A' => 'Zero or minimal total float', 'B' => 'Highest cost always', 'C' => 'Performed by same resource', 'D' => 'All must be crashed'], 'correct' => 'A', 'exp' => 'Critical path drives finish date.'],
            ['question' => 'A spike in escaped defects suggests MOST likely a gap in:', 'options' => ['A' => 'Preventive quality practices', 'B' => 'Project Charter signatures', 'C' => 'Issue escalations', 'D' => 'Budget variance tracking'], 'correct' => 'A', 'exp' => 'Prevention reduces escapes.'],
            ['question' => 'Integrated change control ensures approved changes are:', 'options' => ['A' => 'Ignored until closing', 'B' => 'Evaluated for impact before implementation', 'C' => 'Implemented immediately', 'D' => 'Owned only by vendor'], 'correct' => 'B', 'exp' => 'Impact analysis gating.'],
            ['question' => 'Primary purpose of a lessons learned register DURING execution:', 'options' => ['A' => 'Archive only at closure', 'B' => 'Enable immediate process adjustments', 'C' => 'Track financial depreciation', 'D' => 'Replace risk log'], 'correct' => 'B', 'exp' => 'Supports continuous improvement.'],
            ['question' => 'Stakeholder engagement drifting from Supportive to Neutral first requires:', 'options' => ['A' => 'Removing them from reports', 'B' => 'Targeted expectation / information needs discussion', 'C' => 'Escalation to sponsor immediately', 'D' => 'Formal contract amendment'], 'correct' => 'B', 'exp' => 'Reassess needs & adapt plan.'],
            ['question' => 'Definition of Done primarily helps by:', 'options' => ['A' => 'Extending scope', 'B' => 'Setting consistent completion quality criteria', 'C' => 'Reducing team communication', 'D' => 'Approving vendor contracts'], 'correct' => 'B', 'exp' => 'Shared completion clarity.'],
            ['question' => 'A RAID log typically tracks Risks, Actions, Issues and:', 'options' => ['A' => 'Dependencies', 'B' => 'Deliverables', 'C' => 'Design patterns', 'D' => 'Detailed test cases'], 'correct' => 'A', 'exp' => 'Dependencies included.'],
            ['question' => 'Which schedule compression method adds resources to shorten duration?', 'options' => ['A' => 'Crashing', 'B' => 'Fast tracking', 'C' => 'Leveling', 'D' => 'Decomposition'], 'correct' => 'A', 'exp' => 'Crashing = add cost for time.'],
            ['question' => 'A risk response creating a secondary risk requires:', 'options' => ['A' => 'No action', 'B' => 'Secondary risk analysis & response planning', 'C' => 'Scope elimination', 'D' => 'Budget freeze'], 'correct' => 'B', 'exp' => 'Manage secondary explicitly.'],
            ['question' => 'Management reserve differs from contingency because it:', 'options' => ['A' => 'Is for unknown-unknowns', 'B' => 'Is embedded in each activity', 'C' => 'Represents overtime hours', 'D' => 'Cannot be released'], 'correct' => 'A', 'exp' => 'Unknown-unknown fund.'],
            ['question' => 'Primary value of a stakeholder register is to:', 'options' => ['A' => 'Track only job titles', 'B' => 'Document interests, influence, engagement strategy', 'C' => 'Replace communications plan', 'D' => 'Show Gantt dependencies'], 'correct' => 'B', 'exp' => 'Foundation for engagement planning.'],
        ];

        $freeFormQuestions = [
            'Explain (2–3 sentences) how progressive elaboration supports planning without causing scope creep.',
            'List three data points you would capture in a stakeholder register and why each matters.',
            'CPI is 0.9 and SPI is 1.05. What two corrective focus areas do you consider and why?',
            'Provide two preventive quality techniques and how they reduce rework later.',
            'Describe a quick approach to prioritize 15 identified risks in a workshop.',
            'Give two benefits of keeping a living lessons learned register mid-project.',
            'Outline the difference between fast tracking and crashing with one risk of each.',
            'List three components of an effective communication plan and their purpose.',
            'Describe a strategy to re-engage a stakeholder sliding from Supportive to Neutral.',
            'Explain why a clear Definition of Done improves forecasting accuracy.',
        ];

        $records = [];
        // Difficulty distribution: majority medium (2), some easy (1), few hard (3) for balance
        $difficultyPattern = [2, 2, 1, 2, 2, 1, 2, 3, 2, 2, 1, 2, 2, 2, 1, 2, 3, 2, 1, 2];
        $pointsMap = [1 => 5, 2 => 7, 3 => 9];

        foreach ($mcQuestions as $i => $mc) {
            $diff = $difficultyPattern[$i % count($difficultyPattern)];
            $records[] = [
                'category' => 'project_management',
                'difficulty' => $diff,
                'points' => $pointsMap[$diff],
                'type' => 'multiple_choice',
                'question' => $mc['question'],
                'options' => $mc['options'],
                'correct_answer' => [$mc['correct']],
                'explanation' => $mc['exp'] ?? 'Concept clarification.',
                'meta' => null,
                'is_active' => true,
            ];
        }

        foreach ($freeFormQuestions as $q) {
            $records[] = [
                'category' => 'project_management',
                'difficulty' => 2,
                'points' => 7,
                'type' => 'free_form',
                'question' => $q,
                'options' => null,
                'correct_answer' => [],
                'explanation' => 'Short analytical response expected.',
                'meta' => null,
                'is_active' => true,
            ];
        }

        foreach ($records as $data) {
            PMQuestion::create($data);
        }
    }
}
