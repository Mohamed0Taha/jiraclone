<?php

namespace App\Agents\Tools;

use App\Agents\Contracts\AgentTool;
use App\Agents\Runtime\AgentContext;
use App\Agents\Runtime\AgentResult;
use App\Services\QuestionAnsweringService;

class QuestionAnswerTool implements AgentTool
{
    public function __construct(private QuestionAnsweringService $qaService)
    {
    }

    public function name(): string
    {
        return 'question-answering';
    }

    public function supports(AgentContext $context): bool
    {
        $intent = $context->getState('intent', []);

        return ($intent['kind'] ?? null) === 'question' && ! $context->hasResult();
    }

    public function invoke(AgentContext $context): void
    {
        $intent = $context->getState('intent', []);
        $question = $intent['question'] ?? null;

        $answer = $this->qaService->answer(
            $context->project(),
            $context->message(),
            $context->history(),
            $question
        );

        $context->setResult(AgentResult::information(
            $answer,
            [],
            [
                'intent' => 'question',
                'tool' => $this->name(),
                'rephrased' => $question,
            ]
        ));
    }
}
