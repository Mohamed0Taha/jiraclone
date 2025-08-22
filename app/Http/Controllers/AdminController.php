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
            ->latest()
            ->paginate(20);

        return view('admin.users', compact('users'));
    }

    public function createUser()
    {
        return view('admin.create-user');
    }

    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'is_admin' => ['boolean'],
            'subscription_plan' => ['nullable', 'in:none,basic,pro'],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'email_verified_at' => now(), // Auto-verify admin-created users
            'is_admin' => $request->boolean('is_admin', false),
        ]);

        // Handle subscription if requested
        if ($request->subscription_plan && $request->subscription_plan !== 'none') {
            $this->createManualSubscription($user, $request->subscription_plan);
        }

        return redirect()->route('admin.users')->with('success', 'User created successfully!');
    }

    public function editUser(User $user)
    {
        return view('admin.edit-user', compact('user'));
    }

    public function updateUser(Request $request, User $user)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'is_admin' => ['boolean'],
            'subscription_plan' => ['nullable', 'in:none,basic,pro,cancel'],
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'is_admin' => $request->boolean('is_admin', false),
        ]);

        // Handle subscription changes
        if ($request->has('subscription_plan')) {
            $this->updateUserSubscription($user, $request->subscription_plan);
        }

        return redirect()->route('admin.users')->with('success', 'User updated successfully!');
    }

    public function deleteUser(User $user)
    {
        if ($user->is_admin && User::where('is_admin', true)->count() <= 1) {
            return redirect()->route('admin.users')->with('error', 'Cannot delete the last admin user!');
        }

        // Cancel any active subscriptions
        if ($user->subscribed('default')) {
            $user->subscription('default')->cancelNow();
        }

        $user->delete();

        return redirect()->route('admin.users')->with('success', 'User deleted successfully!');
    }

    private function createManualSubscription(User $user, string $plan)
    {
        // Create a manual subscription without Stripe
        $stripePriceId = $plan === 'basic' ? 'price_manual_basic' : 'price_manual_pro';
        
        // Create fake Stripe customer ID for manual subscriptions
        $user->update(['stripe_id' => 'cus_manual_' . $user->id]);

        // Create subscription record manually
        $subscription = $user->subscriptions()->create([
            'name' => 'default',
            'stripe_id' => 'sub_manual_' . $user->id . '_' . time(),
            'stripe_status' => 'active',
            'stripe_price' => $stripePriceId,
            'quantity' => 1,
            'trial_ends_at' => null,
            'ends_at' => null,
        ]);

        return $subscription;
    }

    private function updateUserSubscription(User $user, string $action)
    {
        $currentSub = $user->subscription('default');

        switch ($action) {
            case 'cancel':
                if ($currentSub) {
                    $currentSub->update(['stripe_status' => 'canceled', 'ends_at' => now()]);
                }
                break;
            
            case 'basic':
            case 'pro':
                if ($currentSub) {
                    // Update existing subscription
                    $stripePriceId = $action === 'basic' ? 'price_manual_basic' : 'price_manual_pro';
                    $currentSub->update([
                        'stripe_price' => $stripePriceId,
                        'stripe_status' => 'active',
                        'ends_at' => null,
                    ]);
                } else {
                    // Create new subscription
                    $this->createManualSubscription($user, $action);
                }
                break;
            
            case 'none':
                if ($currentSub) {
                    $currentSub->delete();
                }
                break;
        }
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
                'total_active' => Subscription::where('stripe_status', 'active')->count(),
                'total_cancelled' => Subscription::whereIn('stripe_status', ['canceled', 'cancelled'])->count(),
                'total_on_trial' => Subscription::where('stripe_status', 'trialing')->count(),
                'total_incomplete' => Subscription::where('stripe_status', 'incomplete')->count(),
                'total_past_due' => Subscription::where('stripe_status', 'past_due')->count(),
                'by_plan' => Subscription::where('stripe_status', 'active')
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
                'total_incomplete' => 0,
                'total_past_due' => 0,
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
