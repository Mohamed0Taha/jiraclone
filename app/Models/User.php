<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\CustomVerifyEmail;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, Billable;

    protected $fillable = [
        'name', 'email', 'password', 'is_admin',
        'google_id', 'google_avatar', 'google_token', 'google_refresh_token',
        'trial_used', 'trial_plan', 'ai_tasks_used', 'usage_reset_date',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'trial_ends_at'     => 'datetime',
            'trial_used'        => 'boolean',
            'is_admin'          => 'boolean',
            'usage_reset_date'  => 'date',
        ];
    }

    /**
     * Send the custom email verification notification (relative-signed URL).
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new CustomVerifyEmail);
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function memberProjects()
    {
        return $this->belongsToMany(Project::class, 'project_members')
                    ->withPivot('role', 'joined_at')
                    ->withTimestamps();
    }

    public function invitations()
    {
        return $this->hasMany(ProjectInvitation::class, 'email', 'email');
    }

    public function pendingInvitations()
    {
        return $this->hasMany(ProjectInvitation::class, 'email', 'email')
                    ->where('status', 'pending');
    }

    public function onPro(): bool
    {
        return $this->subscribed('default') || $this->onTrial('default');
    }

    public function onTrial(string $subscription = 'default'): bool
    {
        $subscription = $this->subscription($subscription);
        return $subscription && $subscription->onTrial();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscribed('default') || $this->onTrial('default');
    }

    /**
     * Get the user's current plan name
     */
    public function getCurrentPlan(): string
    {
        $subscription = $this->subscription('default');
        
        if ($subscription) {
            return $this->getPlanFromPriceId($subscription->stripe_price);
        } elseif ($this->onTrial('default')) {
            return $this->trial_plan ?? 'basic';
        }

        return 'free';
    }

    /**
     * Check if user can access a feature
     */
    public function canAccessFeature(string $feature): bool
    {
        $plan = $this->getCurrentPlan();
        
        switch ($feature) {
            case 'ai_tasks':
                return true; // Everyone can access AI tasks (but with limits)
            case 'ai_chat':
                return true; // Everyone can access AI chat (but free users see overlay)
            case 'automation':
                return in_array($plan, ['basic', 'pro', 'business']);
            case 'members':
                return in_array($plan, ['basic', 'pro', 'business']);
            case 'reports':
                return in_array($plan, ['basic', 'pro', 'business']);
            case 'ai_assistant':
                return true; // Everyone can access (but free users see overlay)
            default:
                return true;
        }
    }

    /**
     * Check if overlay should be shown for a feature
     */
    public function shouldShowOverlay(string $feature): bool
    {
        // Show overlay for free users on premium features
        if (!$this->hasActiveSubscription()) {
            switch ($feature) {
                case 'ai_assistant':
                case 'ai_chat':
                    return true; // Free users see overlay for AI chat
                case 'automation':
                case 'members':
                case 'reports':
                    return true; // Free users see overlay for disabled features
                default:
                    return false;
            }
        }

        return false; // Paying users don't see overlays
    }

    /**
     * Get complete usage summary for frontend
     */
    public function getUsageSummary(): array
    {
        $this->resetUsageIfNeeded();

        return [
            'ai_tasks' => [
                'used' => $this->ai_tasks_used ?? 0,
                'limit' => $this->getAiTaskLimit(),
                'remaining' => $this->getRemainingAiTasks(),
            ],
            'ai_chat' => [
                'used' => $this->ai_chat_used ?? 0,
                'limit' => $this->getAiChatLimit(),
                'remaining' => $this->getRemainingAiChat(),
            ],
            'reports' => [
                'used' => $this->reports_generated ?? 0,
                'limit' => $this->getReportsLimit(),
                'remaining' => $this->getRemainingReports(),
            ],
            'automation' => [
                'used' => $this->getAutomationsCount(),
                'limit' => $this->getAutomationLimit(),
                'remaining' => max(0, $this->getAutomationLimit() - $this->getAutomationsCount()),
            ],
            'members' => [
                'limit' => $this->getMemberLimit(),
            ],
        ];
    }

    /**
     * Get automation limit for current plan
     */
    public function getAutomationLimit(): int
    {
        $plan = $this->getCurrentPlan();
        
        $limits = [
            'free' => 0,
            'basic' => 2,
            'pro' => 5,
            'business' => 10,
        ];

        return $limits[$plan] ?? 0;
    }

    /**
     * Get member limit for current plan
     */
    public function getMemberLimit(): int
    {
        $plan = $this->getCurrentPlan();
        
        $limits = [
            'free' => 1,
            'basic' => 2,
            'pro' => 5,
            'business' => 15,
        ];

        return $limits[$plan] ?? 1;
    }

    /**
     * Get count of active automations
     */
    public function getAutomationsCount(): int
    {
        return \App\Models\Automation::whereHas('project', function ($query) {
            $query->where('user_id', $this->id);
        })->where('is_active', true)->count();
    }

    /**
     * Get AI task generation limit for current plan
     */
    public function getAiTaskLimit(): int
    {
        $plan = $this->getCurrentPlan();
        
        $limits = [
            'free' => 5,
            'basic' => 25,
            'pro' => 50,
            'business' => 200,
        ];

        return $limits[$plan] ?? 5;
    }

    /**
     * Get AI chat limit for current plan
     */
    public function getAiChatLimit(): int
    {
        $plan = $this->getCurrentPlan();
        
        $limits = [
            'free' => 5,
            'basic' => 30,
            'pro' => 50,
            'business' => 100,
        ];

        return $limits[$plan] ?? 5;
    }

    /**
     * Get reports limit for current plan
     */
    public function getReportsLimit(): int
    {
        $plan = $this->getCurrentPlan();
        
        $limits = [
            'free' => 0,
            'basic' => 5,
            'pro' => 7,
            'business' => 10,
        ];

        return $limits[$plan] ?? 0;
    }

    /**
     * Get remaining AI task generation count
     */
    public function getRemainingAiTasks(): int
    {
        $this->resetUsageIfNeeded();
        
        $limit = $this->getAiTaskLimit();
        $used = $this->ai_tasks_used ?? 0;
        
        return max(0, $limit - $used);
    }

    /**
     * Increment AI task usage
     */
    public function incrementAiTaskUsage(int $count = 1): bool
    {
        $this->resetUsageIfNeeded();
        
        if ($this->getRemainingAiTasks() >= $count) {
            $this->increment('ai_tasks_used', $count);
            return true;
        }
        
        return false;
    }

    /**
     * Check if user can generate AI tasks
     */
    public function canGenerateAiTasks(int $count = 1): bool
    {
        return $this->getRemainingAiTasks() >= $count;
    }

    /**
     * Check if user can use AI chat
     */
    public function canUseAiChat(): bool
    {
        return $this->getRemainingAiChat() > 0;
    }

    /**
     * Check if user can use a feature (general usage limits)
     */
    public function canUseFeature(string $feature): bool
    {
        switch ($feature) {
            case 'ai_tasks':
                return $this->canGenerateAiTasks(1);
            case 'ai_chat':
                return $this->canUseAiChat();
            case 'reports':
                return $this->canGenerateReports();
            default:
                return $this->canAccessFeature($feature);
        }
    }

    /**
     * Check if user can generate reports
     */
    public function canGenerateReports(): bool
    {
        return $this->getRemainingReports() > 0;
    }

    /**
     * Get remaining AI chat count
     */
    public function getRemainingAiChat(): int
    {
        $this->resetUsageIfNeeded();
        
        $limit = $this->getAiChatLimit();
        $used = $this->ai_chat_used ?? 0;
        
        return max(0, $limit - $used);
    }

    /**
     * Get remaining reports count
     */
    public function getRemainingReports(): int
    {
        $this->resetUsageIfNeeded();
        
        $limit = $this->getReportsLimit();
        $used = $this->reports_generated ?? 0;
        
        return max(0, $limit - $used);
    }

    /**
     * Increment AI chat usage
     */
    public function incrementAiChatUsage(int $count = 1): bool
    {
        $this->resetUsageIfNeeded();
        
        if ($this->getRemainingAiChat() >= $count) {
            $this->increment('ai_chat_used', $count);
            return true;
        }
        
        return false;
    }

    /**
     * Increment reports usage
     */
    public function incrementReportsUsage(int $count = 1): bool
    {
        $this->resetUsageIfNeeded();
        
        if ($this->getRemainingReports() >= $count) {
            $this->increment('reports_generated', $count);
            return true;
        }
        
        return false;
    }

    /**
     * Reset usage tracking if needed (monthly reset)
     */
    private function resetUsageIfNeeded(): void
    {
        $resetDate = $this->usage_reset_date;
        $now = now()->startOfDay();
        
        // If no reset date set, set it to beginning of current month
        if (!$resetDate) {
            $this->update([
                'usage_reset_date' => $now->firstOfMonth(),
                'ai_tasks_used' => 0,
            ]);
            return;
        }
        
        // If we've passed into a new month, reset usage
        if ($now->firstOfMonth()->isAfter($resetDate)) {
            $this->update([
                'usage_reset_date' => $now->firstOfMonth(),
                'ai_tasks_used' => 0,
            ]);
        }
    }

    /**
     * Get plan name from Stripe price ID
     */
    private function getPlanFromPriceId(string $priceId): string
    {
        $plans = config('subscriptions.plans');
        
        foreach ($plans as $key => $plan) {
            if ($plan['price_id'] === $priceId) {
                return $key;
            }
        }

        return 'basic'; // fallback
    }
}
