<?php

namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;

class SubscriptionPlanService
{
    private ?StripeClient $stripe = null;

    public function __construct()
    {
        $secret = config('cashier.secret');
        if ($secret) {
            $this->stripe = new StripeClient($secret);
        }
    }

    /**
     * Return all configured plans enriched with live pricing when available.
     */
    public function allWithPricing(): array
    {
        return collect(config('subscriptions.plans', []))
            ->map(fn (array $plan, string $key) => $this->formatPlan($plan, $key))
            ->values()
            ->all();
    }

    /**
     * Find a plan by the configured Stripe price ID.
     */
    public function findByPriceId(string $priceId): ?array
    {
        foreach ($this->allWithPricing() as $plan) {
            if (($plan['price_id'] ?? null) === $priceId) {
                return $plan;
            }
        }

        return null;
    }

    private function formatPlan(array $plan, string $key): array
    {
        $pricing = $this->fetchStripePriceData($plan['price_id'] ?? null);

        return [
            'key' => $key,
            'name' => Arr::get($plan, 'name', ucfirst($key)),
            'price_id' => Arr::get($plan, 'price_id'),
            'price' => $pricing['price'],
            'currency' => $pricing['currency'],
            'interval' => $pricing['interval'],
            'trial_days' => Arr::get($plan, 'trial_days', 0),
            'features' => Arr::get($plan, 'features', []),
            'description' => Arr::get($plan, 'description'),
            'ai_credits' => Arr::get($plan, 'ai_credits'),
            'highlight' => (bool) Arr::get($plan, 'highlight', false),
        ];
    }

    private function fetchStripePriceData(?string $priceId): array
    {
        $defaults = ['price' => 0, 'currency' => 'USD', 'interval' => 'month'];

        if (! $priceId || ! $this->stripe) {
            return $defaults;
        }

        try {
            $price = $this->stripe->prices->retrieve($priceId, []);

            return [
                'price' => $price->unit_amount ? $price->unit_amount / 100 : 0,
                'currency' => strtoupper($price->currency ?? 'USD'),
                'interval' => $price->recurring->interval ?? 'month',
            ];
        } catch (\Throwable $e) {
            Log::warning('[SubscriptionPlanService] Failed to fetch Stripe price', [
                'price_id' => $priceId,
                'error' => $e->getMessage(),
            ]);

            return $defaults;
        }
    }
}
