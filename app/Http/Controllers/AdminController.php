<?php

namespace App\Http\Controllers;

use App\Models\EmailLog;
use App\Models\OpenAiRequest;
use App\Models\Project;
use App\Models\RefundLog;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

        // Count total admin users
        $adminCount = User::where('is_admin', true)->count();

        return view('admin.users', compact('users', 'adminCount'));
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
            'subscription_plan' => ['nullable', 'in:none,basic,pro,business'],
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
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'is_admin' => ['boolean'],
            'subscription_plan' => ['nullable', 'in:none,basic,pro,business,cancel'],
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

        try {
            DB::transaction(function () use ($user) {
                // 1. Cancel and delete all Stripe subscriptions
                foreach ($user->subscriptions as $subscription) {
                    try {
                        if ($subscription->stripe_status === 'active' && ! str_contains($subscription->stripe_id, 'manual')) {
                            // Cancel real Stripe subscription
                            $subscription->cancelNow();
                        }
                        // Delete the subscription record
                        $subscription->delete();
                    } catch (\Exception $e) {
                        // Log error but continue with deletion
                        Log::warning("Error canceling subscription for user {$user->id}: ".$e->getMessage());
                    }
                }

                // 2. Delete user's owned projects (cascade will handle tasks, comments, automations, etc.)
                foreach ($user->projects as $project) {
                    $project->delete();
                }

                // 3. Remove user from project memberships
                $user->memberProjects()->detach();

                // 4. Delete pending invitations for this user
                \App\Models\ProjectInvitation::where('email', $user->email)->delete();

                // 5. Delete user's individual tasks (not in projects)
                $user->tasks()->delete();
                $user->assignedTasks()->update(['assignee_id' => null]);

                // 6. Delete user's comments (not in projects - project deletion will handle project comments)
                \App\Models\Comment::where('user_id', $user->id)
                    ->whereNotIn('task_id', function ($query) {
                        $query->select('id')->from('tasks')->whereNotNull('project_id');
                    })
                    ->delete();

                // 7. Delete email logs
                $user->emailLogs()->delete();

                // 8. Delete OpenAI requests
                $user->openaiRequests()->delete();

                // 9. Delete refund logs (or keep for audit trail - mark as deleted user)
                \App\Models\RefundLog::where('user_id', $user->id)
                    ->update(['notes' => 'User account deleted: '.$user->email]);

                // 10. Automations will be deleted automatically when projects are deleted (cascade)
                // No need to delete automations explicitly since they belong to projects

                // 11. Try to delete Stripe customer if exists
                if ($user->stripe_id && ! str_contains($user->stripe_id, 'manual')) {
                    try {
                        \Stripe\Customer::retrieve($user->stripe_id)->delete();
                    } catch (\Exception $e) {
                        Log::warning("Error deleting Stripe customer for user {$user->id}: ".$e->getMessage());
                    }
                }

                // 12. Finally delete the user
                $user->delete();
            });

            return redirect()->route('admin.users')->with('success', 'User and all associated data deleted successfully!');

        } catch (\Exception $e) {
            Log::error("Error deleting user {$user->id}: ".$e->getMessage());

            return redirect()->route('admin.users')->with('error', 'Error deleting user: '.$e->getMessage());
        }
    }

    private function createManualSubscription(User $user, string $plan)
    {
        // Create a manual subscription without Stripe
        $stripePriceId = match ($plan) {
            'basic' => 'price_manual_basic',
            'pro' => 'price_manual_pro',
            'business' => 'price_manual_business',
            default => 'price_manual_basic'
        };

        // Create fake Stripe customer ID for manual subscriptions
        $user->update(['stripe_id' => 'cus_manual_'.$user->id]);

        // Create subscription record manually
        $subscription = $user->subscriptions()->create([
            'name' => 'default',
            'stripe_id' => 'sub_manual_'.$user->id.'_'.time(),
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
            case 'business':
                if ($currentSub) {
                    // Update existing subscription
                    $stripePriceId = match ($action) {
                        'basic' => 'price_manual_basic',
                        'pro' => 'price_manual_pro',
                        'business' => 'price_manual_business',
                        default => 'price_manual_basic'
                    };
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

    public function refunds()
    {
        // Ensure Stripe API key is set for direct \Stripe\* static calls (Cashier doesn't always set globally)
        if (empty(config('cashier.secret'))) {
            // Abort gracefully with message instead of fatal error on remote
            return view('admin.refunds', [
                'stats' => [
                    'total_refunds' => 0,
                    'total_amount' => 0,
                    'month_refunds' => 0,
                    'month_amount' => 0,
                ],
                'users' => collect(),
                'refundLogs' => collect(),
                'refunds' => collect(),
            ])->with('error', 'Stripe secret key (CASHIER_SECRET / STRIPE_SECRET) is not configured on this environment.');
        }
        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret'));
        } catch (\Exception $e) {
            return view('admin.refunds', [
                'stats' => [
                    'total_refunds' => 0,
                    'total_amount' => 0,
                    'month_refunds' => 0,
                    'month_amount' => 0,
                ],
                'users' => collect(),
                'refundLogs' => collect(),
                'refunds' => collect(),
            ])->with('error', 'Failed to initialize Stripe: '.$e->getMessage());
        }
        // Get all refund logs with related data
        $refunds = RefundLog::with(['user', 'processedBy'])
            ->latest('processed_at')
            ->paginate(20);

        // Get refund statistics
        $stats = [
            'total_refunds' => RefundLog::count(),
            'total_amount' => RefundLog::sum('amount'),
            'month_refunds' => RefundLog::whereYear('processed_at', date('Y'))
                ->whereMonth('processed_at', date('m'))
                ->count(),
            'month_amount' => RefundLog::whereYear('processed_at', date('Y'))
                ->whereMonth('processed_at', date('m'))
                ->sum('amount'),
        ];

        // Get all users (customers) with their subscription info and Stripe payment data
        $users = User::with(['subscriptions' => function ($query) {
            $query->latest();
        }])
            ->whereNotNull('stripe_id') // Only users with Stripe customer IDs
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                // Get the user's active subscription
                $subscription = $user->subscriptions()->first();

                // Get Stripe customer and payment info
                $stripeData = [
                    'customer' => null,
                    'payments' => [],
                    'invoices' => [],
                ];

                if ($user->stripe_id) {
                    try {
                        // Get Stripe customer
                        $stripeData['customer'] = $user->asStripeCustomer();

                        // Get payment intents for this customer
                        $paymentIntents = \Stripe\PaymentIntent::all([
                            'customer' => $user->stripe_id,
                            'limit' => 10, // Get last 10 payments
                        ]);

                        foreach ($paymentIntents->data as $intent) {
                            if ($intent->status === 'succeeded') {
                                $stripeData['payments'][] = [
                                    'id' => $intent->id,
                                    'amount' => $intent->amount / 100, // Convert from cents
                                    'currency' => strtoupper($intent->currency),
                                    'created' => date('M d, Y', $intent->created),
                                    'description' => $intent->description ?? 'Payment',
                                    'charges' => $intent->charges->data ?? [],
                                ];
                            }
                        }

                        // Get invoices if user has subscription
                        if ($subscription) {
                            try {
                                $invoices = $user->invoices();
                                foreach ($invoices as $invoice) {
                                    if ($invoice->paid && $invoice->payment_intent) {
                                        $stripeData['invoices'][] = [
                                            'id' => $invoice->id,
                                            'payment_intent' => $invoice->payment_intent,
                                            'amount' => $invoice->total / 100,
                                            'date' => date('M d, Y', $invoice->created),
                                            'description' => 'Subscription Invoice',
                                        ];
                                    }
                                }
                            } catch (\Exception $e) {
                                // Handle invoice fetch errors
                            }
                        }

                    } catch (\Exception $e) {
                        // Handle Stripe API errors gracefully
                        $stripeData['error'] = $e->getMessage();
                    }
                }

                return [
                    'user' => $user,
                    'subscription' => $subscription,
                    'stripe_data' => $stripeData,
                    'has_payment_methods' => $user->hasPaymentMethod(),
                ];
            });

        // Provide both 'refundLogs' (legacy) and 'refunds' (expected by Blade) to avoid undefined variable
        return view('admin.refunds', compact('stats', 'users'))
            ->with([
                'refundLogs' => $refunds,
                'refunds' => $refunds,
            ]);
    }

    public function processRefund(Request $request)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'refund_type' => ['required', 'in:subscription,payment,manual'],
            'refund_amount' => ['required_if:refund_type,manual', 'nullable', 'numeric', 'min:0.01'],
            'payment_intent_id' => ['required_if:refund_type,payment', 'nullable', 'string'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $user = User::findOrFail($request->user_id);

        try {
            $refundResult = null;
            $amount = 0;
            $subscription = null;

            switch ($request->refund_type) {
                case 'subscription':
                    // Refund the latest subscription
                    $subscription = $user->subscription('default');
                    if (! $subscription) {
                        return redirect()->route('admin.refunds')
                            ->with('error', 'User has no active subscription to refund.');
                    }

                    // Get the latest invoice to refund
                    $invoices = $user->invoices();
                    if (empty($invoices)) {
                        return redirect()->route('admin.refunds')
                            ->with('error', 'No invoices found for this subscription.');
                    }

                    $latestInvoice = $invoices[0];
                    $refundResult = \Stripe\Refund::create([
                        'payment_intent' => $latestInvoice->payment_intent,
                        'reason' => 'requested_by_customer',
                        'metadata' => [
                            'admin_user_id' => Auth::id(),
                            'reason' => $request->reason,
                        ],
                    ]);

                    $amount = $refundResult->amount / 100; // Convert from cents
                    break;

                case 'payment':
                    // Refund a specific payment intent
                    if (! $request->payment_intent_id) {
                        return redirect()->route('admin.refunds')
                            ->with('error', 'Payment Intent ID is required for payment refunds.');
                    }

                    $refundResult = \Stripe\Refund::create([
                        'payment_intent' => $request->payment_intent_id,
                        'reason' => 'requested_by_customer',
                        'metadata' => [
                            'admin_user_id' => Auth::id(),
                            'reason' => $request->reason,
                        ],
                    ]);

                    $amount = $refundResult->amount / 100; // Convert from cents
                    break;

                case 'manual':
                    // Manual refund (for record keeping only)
                    $amount = $request->refund_amount;
                    $subscription = $user->subscription('default');
                    break;
            }

            // Create refund record
            $this->createRefundRecord(
                $user,
                $subscription,
                $amount,
                $request->reason,
                $request->refund_type,
                $request->notes,
                $refundResult ? $refundResult->id : null
            );

            $message = $request->refund_type === 'manual'
                ? 'Manual refund record created successfully'
                : 'Stripe refund of $'.number_format($amount, 2).' processed successfully';

            return redirect()->route('admin.refunds')
                ->with('success', $message.' for '.$user->name);

        } catch (\Stripe\Exception\ApiErrorException $e) {
            return redirect()->route('admin.refunds')
                ->with('error', 'Stripe error: '.$e->getMessage());
        } catch (\Exception $e) {
            return redirect()->route('admin.refunds')
                ->with('error', 'Error processing refund: '.$e->getMessage());
        }
    }

    public function quickRefund(Request $request)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'payment_intent_id' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $user = User::findOrFail($request->user_id);

            // Process the refund through Stripe
            $refundResult = \Stripe\Refund::create([
                'payment_intent' => $request->payment_intent_id,
                'amount' => $request->amount * 100, // Convert to cents
                'reason' => 'requested_by_customer',
                'metadata' => [
                    'admin_user_id' => Auth::id(),
                    'reason' => $request->reason,
                    'quick_refund' => 'true',
                ],
            ]);

            // Create refund record
            $this->createRefundRecord(
                $user,
                $user->subscription('default'),
                $request->amount,
                $request->reason,
                $refundResult->id ?? null
            );

            return redirect()->route('admin.refunds')
                ->with('success', 'Quick refund of $'.number_format($request->amount, 2)." processed successfully for {$user->name}.");

        } catch (\Stripe\Exception\ApiErrorException $e) {
            return redirect()->route('admin.refunds')
                ->with('error', 'Stripe error: '.$e->getMessage());
        } catch (\Exception $e) {
            return redirect()->route('admin.refunds')
                ->with('error', 'Error processing quick refund: '.$e->getMessage());
        }
    }

    public function getCustomerPayments(Request $request, User $user)
    {
        try {
            if (! $user->stripe_id) {
                return response()->json(['error' => 'User has no Stripe customer ID'], 404);
            }

            // Get payment intents for this customer
            $paymentIntents = \Stripe\PaymentIntent::all([
                'customer' => $user->stripe_id,
                'limit' => 20,
            ]);

            $payments = [];
            foreach ($paymentIntents->data as $intent) {
                if ($intent->status === 'succeeded') {
                    $payments[] = [
                        'id' => $intent->id,
                        'amount' => $intent->amount / 100, // Convert from cents
                        'currency' => strtoupper($intent->currency),
                        'created' => date('M d, Y H:i', $intent->created),
                        'description' => $intent->description ?? 'Payment',
                    ];
                }
            }

            return response()->json(['payments' => $payments]);

        } catch (\Stripe\Exception\ApiErrorException $e) {
            return response()->json(['error' => 'Stripe error: '.$e->getMessage()], 500);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error fetching payments: '.$e->getMessage()], 500);
        }
    }

    private function createRefundRecord(User $user, $subscription, float $amount, string $reason, string $type, ?string $notes = null, ?string $stripeRefundId = null)
    {
        // Create a refund log using the RefundLog model
        RefundLog::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription ? $subscription->id : null,
            'amount' => $amount,
            'reason' => $reason,
            'type' => $type,
            'status' => $stripeRefundId ? 'completed' : 'manual',
            'stripe_refund_id' => $stripeRefundId,
            'processed_by' => Auth::id(),
            'processed_at' => now(),
            'notes' => $notes,
        ]);
    }

    private function processManualRefund($subscription, string $type)
    {
        if ($type === 'full') {
            // Cancel subscription for full refund
            $subscription->update([
                'stripe_status' => 'canceled',
                'ends_at' => now(),
            ]);
        }
        // For partial refunds, we might keep the subscription active
        // but log the refund amount
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
        // Only get subscriptions that have associated users
        $subscriptions = Subscription::with('user')
            ->whereHas('user') // Only include subscriptions that have an associated user
            ->get();

        $revenueStats = $this->getRevenueStats();
        $subscriptionStats = $this->getSubscriptionStats();

        return view('admin.billing', compact('subscriptions', 'revenueStats', 'subscriptionStats'));
    }

    public function makeAdmin(Request $request, User $user)
    {
        $user->update(['is_admin' => true]);

        return redirect()->back()->with('success', $user->name.' has been made an admin.');
    }

    public function demoteAdmin(Request $request, User $user)
    {
        // Check if this would leave no admins
        if (User::where('is_admin', true)->count() <= 1) {
            return redirect()->back()->with('error', 'Cannot demote the last admin user!');
        }

        $user->update(['is_admin' => false]);

        return redirect()->back()->with('success', $user->name.' admin privileges have been removed.');
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

    /* =============================
     * Broadcast Email (Admin)
     * ============================= */
    public function broadcastEmailForm()
    {
        return view('admin.broadcast-email');
    }

    public function sendBroadcastEmail(Request $request)
    {
        $request->validate([
            'segments' => ['required', 'array', 'min:1'],
            'segments.*' => ['in:free,basic,pro,business'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $segments = $request->segments;

        // Build user query based on segments
        $usersQuery = User::query();

        // Segment mapping: free = no active subscription, plan detection based on stripe_price contains token
        $usersQuery->where(function ($q) use ($segments) {
            if (in_array('free', $segments)) {
                $q->orWhereDoesntHave('subscriptions', function ($s) {
                    $s->where('stripe_status', 'active');
                });
            }
            $planMap = ['basic' => 'basic', 'pro' => 'pro', 'business' => 'business'];
            foreach ($planMap as $seg => $needle) {
                if (in_array($seg, $segments)) {
                    $q->orWhereHas('subscriptions', function ($s) use ($needle) {
                        $s->where('stripe_status', 'active')->where('stripe_price', 'like', '%'.$needle.'%');
                    });
                }
            }
        });

        $users = $usersQuery->get(['id', 'name', 'email']);
        $count = $users->count();

        if ($count === 0) {
            return back()->with('error', 'No users match the selected segments.');
        }

        $fromAddress = 'people@taskpilot.us';

        foreach ($users as $user) {
            try {
                \Mail::to($user->email)->send(new \App\Mail\BroadcastEmailMailable(
                    $request->subject,
                    $request->message,
                    $user
                ));
            } catch (\Exception $e) {
                // Continue sending to others – optionally log
            }
        }

        return redirect()->route('admin.broadcast-email.form')
            ->with('success', "Broadcast sent to {$count} users.");
    }
}
