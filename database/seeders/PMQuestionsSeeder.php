<?php

namespace Database\Seeders;

use App\Models\PMQuestion;
use Illuminate\Database\Seeder;

class PMQuestionsSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing questions
        PMQuestion::truncate();
        
        $questions = [
            // ============= FUNDAMENTALS (25 questions) =============
            [
                'category' => 'fundamentals',
                'difficulty' => 1,
                'points' => 5,
                'type' => 'multiple_choice',
                'question' => 'What is the primary purpose of a project charter?',
                'options' => [
                    'A' => 'To define the project budget',
                    'B' => 'To formally authorize the project and define its objectives',
                    'C' => 'To assign team members to tasks',
                    'D' => 'To create a detailed timeline',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'A project charter formally authorizes the project and defines its high-level objectives, scope, and stakeholders.',
            ],
            [
                'category' => 'fundamentals',
                'difficulty' => 2,
                'points' => 7,
                'type' => 'multiple_choice',
                'question' => 'Which of the following is NOT one of the five process groups in project management?',
                'options' => [
                    'A' => 'Initiating',
                    'B' => 'Planning',
                    'C' => 'Implementing',
                    'D' => 'Monitoring and Controlling',
                ],
                'correct_answer' => ['C'],
                'explanation' => 'The five process groups are: Initiating, Planning, Executing, Monitoring and Controlling, and Closing. "Implementing" is not a standard process group.',
            ],
            [
                'category' => 'fundamentals',
                'difficulty' => 1,
                'points' => 5,
                'type' => 'multiple_choice',
                'question' => 'What does SMART stand for in goal setting?',
                'options' => [
                    'A' => 'Simple, Manageable, Achievable, Realistic, Timely',
                    'B' => 'Specific, Measurable, Achievable, Relevant, Time-bound',
                    'C' => 'Strategic, Meaningful, Actionable, Results-oriented, Trackable',
                    'D' => 'Structured, Monitored, Aligned, Resourced, Targeted',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound.',
            ],
            [
                'category' => 'fundamentals',
                'difficulty' => 3,
                'points' => 10,
                'type' => 'scenario',
                'question' => 'You are managing a software development project. The client requests a major feature change that would require 40% more budget and extend the timeline by 3 months. What is your FIRST action?',
                'options' => [
                    'A' => 'Immediately implement the change to satisfy the client',
                    'B' => 'Reject the change request to stay on schedule',
                    'C' => 'Assess the impact on scope, time, cost, and quality triangle',
                    'D' => 'Ask the team to work overtime to accommodate the change',
                ],
                'correct_answer' => ['C'],
                'explanation' => 'Any scope change must first be properly assessed for its impact on the project constraints (scope, time, cost, quality) before making decisions.',
            ],
            [
                'category' => 'fundamentals',
                'difficulty' => 2,
                'points' => 7,
                'type' => 'ordering',
                'question' => 'Order these project documents from most general to most specific:',
                'options' => [
                    '1' => 'Project Charter',
                    '2' => 'Work Breakdown Structure (WBS)',
                    '3' => 'Project Management Plan',
                    '4' => 'Task Assignment',
                ],
                'correct_answer' => ['1', '3', '2', '4'],
                'explanation' => 'Project Charter (highest level) → Project Management Plan (detailed planning) → WBS (work decomposition) → Task Assignment (most specific).',
            ],

            // PLANNING (20 questions, varying points) - Total: 140 points
            [
                'category' => 'planning',
                'difficulty' => 2,
                'points' => 7,
                'type' => 'multiple_choice',
                'question' => 'What is the critical path in project scheduling?',
                'options' => [
                    'A' => 'The path with the most resources assigned',
                    'B' => 'The longest sequence of activities that determines project duration',
                    'C' => 'The path with the highest risk activities',
                    'D' => 'The most expensive sequence of activities',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'The critical path is the longest sequence of activities that determines the minimum project duration.',
            ],
            [
                'category' => 'planning',
                'difficulty' => 3,
                'points' => 10,
                'type' => 'scenario',
                'question' => 'Your project has the following activities with dependencies: A(5 days) → B(3 days) → D(4 days), and A → C(6 days) → D. What is the critical path duration?',
                'options' => [
                    'A' => '12 days (A→B→D)',
                    'B' => '15 days (A→C→D)',
                    'C' => '18 days',
                    'D' => '10 days',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'Path A→B→D = 5+3+4 = 12 days. Path A→C→D = 5+6+4 = 15 days. The critical path is 15 days.',
            ],
            [
                'category' => 'planning',
                'difficulty' => 2,
                'points' => 7,
                'type' => 'multiple_choice',
                'question' => 'What is the primary purpose of a Work Breakdown Structure (WBS)?',
                'options' => [
                    'A' => 'To assign team members to tasks',
                    'B' => 'To decompose project work into manageable components',
                    'C' => 'To create the project schedule',
                    'D' => 'To estimate project costs',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'WBS decomposes the project scope into smaller, manageable work packages for better planning and control.',
            ],

            // EXECUTION (15 questions) - Total: 120 points
            [
                'category' => 'execution',
                'difficulty' => 3,
                'points' => 10,
                'type' => 'scenario',
                'question' => 'A key team member calls in sick during a critical project phase. Two important deliverables are at risk. What is your best response?',
                'options' => [
                    'A' => 'Delay the deliverables until the team member returns',
                    'B' => 'Immediately hire a contractor to replace them',
                    'C' => 'Assess available resources and redistribute work based on skills and capacity',
                    'D' => 'Ask the client for a deadline extension',
                ],
                'correct_answer' => ['C'],
                'explanation' => 'A good PM quickly assesses available resources and redistributes work to minimize impact while maintaining quality.',
            ],
            [
                'category' => 'execution',
                'difficulty' => 2,
                'points' => 7,
                'type' => 'multiple_choice',
                'question' => 'What is the most effective way to handle scope creep?',
                'options' => [
                    'A' => 'Always reject additional requests',
                    'B' => 'Accept all client requests to maintain relationship',
                    'C' => 'Follow formal change control process',
                    'D' => 'Handle requests informally to save time',
                ],
                'correct_answer' => ['C'],
                'explanation' => 'Formal change control process ensures proper evaluation and approval of scope changes.',
            ],

            // AI INTEGRATION (10 questions) - Total: 90 points
            [
                'category' => 'ai_integration',
                'difficulty' => 3,
                'points' => 12,
                'type' => 'scenario',
                'question' => 'You want to use AI to optimize task assignments. What data should the AI system primarily analyze?',
                'options' => [
                    'A' => 'Team member preferences only',
                    'B' => 'Historical performance, skills, current workload, and task complexity',
                    'C' => 'Random assignment to ensure fairness',
                    'D' => 'Alphabetical order of team members',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'AI optimization requires comprehensive data including performance history, skills, workload, and task complexity.',
            ],
            [
                'category' => 'ai_integration',
                'difficulty' => 2,
                'points' => 8,
                'type' => 'multiple_choice',
                'question' => 'What is the primary benefit of AI-powered risk prediction in project management?',
                'options' => [
                    'A' => 'Eliminating all project risks',
                    'B' => 'Early identification and mitigation planning',
                    'C' => 'Reducing project costs to zero',
                    'D' => 'Automating all PM decisions',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'AI helps identify potential risks early, allowing proactive mitigation planning.',
            ],

            // PRACTICAL SCENARIO QUESTIONS (10 questions) - Total: 150 points
            [
                'category' => 'practical',
                'difficulty' => 3,
                'points' => 15,
                'type' => 'scenario',
                'question' => 'Virtual Project Scenario: You are managing a mobile app development project for a retail client. The project has 6 team members, $80k budget, and 4-month timeline. Week 6: The designer reports that the client wants to completely change the UI theme, which affects 60% of completed work. The lead developer mentions the chosen payment gateway has security issues. A junior developer just quit. How do you prioritize addressing these issues?',
                'options' => [
                    'A' => 'UI change → Developer replacement → Payment gateway',
                    'B' => 'Payment gateway → Developer replacement → UI change',
                    'C' => 'Developer replacement → Payment gateway → UI change',
                    'D' => 'Handle all simultaneously',
                ],
                'correct_answer' => ['B'],
                'explanation' => 'Security issues pose the highest risk and must be addressed first. Critical resource gaps come second. Scope changes are evaluated last after ensuring project viability.',
            ],
        ];

        foreach ($questions as $question) {
            PMQuestion::create($question);
        }
    }
}
