<?php

namespace App\Http\Controllers;

use App\Models\EmailLog;
use App\Models\OpenAiRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Cashier\Subscription;

class AdminController extends Controller
{
    public function dashboard()
    {
        try {
            // Basic stats
            $totalUsers = User::count();
            $totalProjects = Project::count();
            $totalTasks = Task::count();

            // Subscription analytics
            $subscriptionStats = $this->getSubscriptionStats();

            // Recent email logs (if table exists)
            $recentEmails = $this->getRecentEmails();

            // OpenAI usage stats (if table exists)
            $openaiStats = $this->getOpenAiStats();

            // Revenue analytics
            $revenueStats = $this->getRevenueStats();

            return view('admin.dashboard', compact(
                'totalUsers',
                'totalProjects',
                'totalTasks',
                'subscriptionStats',
                'recentEmails',
                'openaiStats',
                'revenueStats'
            ));
        } catch (\Exception $e) {
            // If any analytics fail, return with basic stats only
            return view('admin.dashboard', [
                'totalUsers' => User::count(),
                'totalProjects' => Project::count(),
                'totalTasks' => Task::count(),
                'subscriptionStats' => ['total_active' => 0, 'total_cancelled' => 0, 'total_on_trial' => 0, 'by_plan' => collect()],
                'recentEmails' => collect(),
                'openaiStats' => ['total_requests' => 0, 'requests_today' => 0, 'requests_this_month' => 0, 'total_tokens' => 0, 'total_cost' => 0, 'average_tokens_per_request' => 0, 'top_users' => collect(), 'by_type' => collect()],
                'revenueStats' => ['monthly_revenue' => 0, 'annual_revenue' => 0],
                'error' => 'Some analytics data could not be loaded: '.$e->getMessage(),
            ]);
        }
    }

    public function users(Request $request)
    {
        $query = User::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->withCount(['projects', 'tasks'])
            ->with('subscriptions')
            ->paginate(20);

        return view('admin.users', compact('users'));
    }

    public function emailLogs(Request $request)
    {
        $query = EmailLog::with('user');

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        if ($request->has('success') && $request->success !== '') {
            $query->where('sent_successfully', $request->success);
        }

        $emails = $query->latest()->paginate(25);
        $emailTypes = EmailLog::distinct('type')->pluck('type');

        return view('admin.email-logs', compact('emails', 'emailTypes'));
    }

    public function openaiRequests(Request $request)
    {
        $query = OpenAiRequest::with('user');

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('type') && $request->type) {
            $query->where('request_type', $request->type);
        }

        $requests = $query->latest()->paginate(25);

        // Get users who have made requests for filter
        $users = User::whereHas('openaiRequests')->get(['id', 'name', 'email']);
        $requestTypes = OpenAiRequest::distinct('request_type')->pluck('request_type');

        return view('admin.openai-requests', compact('requests', 'users', 'requestTypes'));
    }

    public function billing()
    {
        $subscriptions = Subscription::with('user')->get();
        $revenueStats = $this->getRevenueStats();
        $subscriptionStats = $this->getSubscriptionStats();

        return view('admin.billing', compact('subscriptions', 'revenueStats', 'subscriptionStats'));
    }

    public function makeAdmin(Request $request, User $user)
    {
        $user->update(['is_admin' => true]);

        return redirect()->back()->with('success', $user->name.' has been made an admin.');
    }

    private function getRecentEmails()
    {
        try {
            return EmailLog::with('user')
                ->latest()
                ->take(10)
                ->get();
        } catch (\Exception $e) {
            return collect();
        }
    }

    private function getSubscriptionStats()
    {
        try {
            return [
                'total_active' => Subscription::query()->active()->count(),
                'total_cancelled' => Subscription::query()->cancelled()->count(),
                'total_on_trial' => Subscription::query()->onTrial()->count(),
                'by_plan' => Subscription::query()->active()
                    ->select('stripe_price', DB::raw('count(*) as count'))
                    ->groupBy('stripe_price')
                    ->get()
                    ->mapWithKeys(function ($item) {
                        $planName = $this->getPlanName($item->stripe_price);

                        return [$planName => $item->count];
                    }),
            ];
        } catch (\Exception $e) {
            return [
                'total_active' => 0,
                'total_cancelled' => 0,
                'total_on_trial' => 0,
                'by_plan' => collect(),
            ];
        }
    }

    private function getOpenAiStats()
    {
        try {
            $today = now()->startOfDay();
            $thisMonth = now()->startOfMonth();

            return [
                'total_requests' => OpenAiRequest::count(),
                'requests_today' => OpenAiRequest::where('created_at', '>=', $today)->count(),
                'requests_this_month' => OpenAiRequest::where('created_at', '>=', $thisMonth)->count(),
                'total_tokens' => OpenAiRequest::sum('tokens_used'),
                'total_cost' => OpenAiRequest::sum('cost'),
                'average_tokens_per_request' => OpenAiRequest::avg('tokens_used') ?: 0,
                'top_users' => OpenAiRequest::select('user_id', DB::raw('count(*) as request_count'), DB::raw('sum(tokens_used) as total_tokens'))
                    ->with('user:id,name,email')
                    ->groupBy('user_id')
                    ->orderByDesc('request_count')
                    ->take(5)
                    ->get(),
                'by_type' => OpenAiRequest::select('request_type', DB::raw('count(*) as count'))
                    ->groupBy('request_type')
                    ->orderByDesc('count')
                    ->get(),
            ];
        } catch (\Exception $e) {
            return [
                'total_requests' => 0,
                'requests_today' => 0,
                'requests_this_month' => 0,
                'total_tokens' => 0,
                'total_cost' => 0,
                'average_tokens_per_request' => 0,
                'top_users' => collect(),
                'by_type' => collect(),
            ];
        }
    }

    private function getRevenueStats()
    {
        try {
            $subscriptions = Subscription::query()->active()->get();
            $monthlyRevenue = 0;

            foreach ($subscriptions as $subscription) {
                $monthlyRevenue += $this->getPlanPrice($subscription->stripe_price);
            }

            return [
                'monthly_recurring_revenue' => $monthlyRevenue,
                'annual_projected_revenue' => $monthlyRevenue * 12,
                'average_revenue_per_user' => $subscriptions->count() > 0 ? $monthlyRevenue / $subscriptions->count() : 0,
            ];
        } catch (\Exception $e) {
            return [
                'monthly_recurring_revenue' => 0,
                'annual_projected_revenue' => 0,
                'average_revenue_per_user' => 0,
            ];
        }
    }

    private function getPlanName($stripePriceId)
    {
        $plans = [
            'price_1RycMQKX2zcFuvyCqXjA6pCA' => 'Basic',
            'price_1RycMrKX2zcFuvyCUEJZVhbr' => 'Pro',
            'price_1RycNJKX2zcFuvyC1XJMddx3' => 'Business',
        ];

        return $plans[$stripePriceId] ?? 'Unknown';
    }

    private function getPlanPrice($stripePriceId)
    {
        $prices = [
            'price_1RycMQKX2zcFuvyCqXjA6pCA' => 29.99, // Basic
            'price_1RycMrKX2zcFuvyCUEJZVhbr' => 59.99, // Pro
            'price_1RycNJKX2zcFuvyC1XJMddx3' => 99.99,  // Business
        ];

        return $prices[$stripePriceId] ?? 0;
    }
}
