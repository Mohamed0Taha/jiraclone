<?php

namespace App\Http\Controllers;

use App\Models\AppSumoCode;
use App\Models\EmailLog;
use App\Models\OpenAiRequest;
use App\Models\Project;
use App\Models\RefundLog;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Laravel\Cashier\Subscription;

class AdminController extends Controller
{
    public function dashboard()
    {
        try {
            $totalUsers = User::count();
            $totalProjects = Project::count();
            $totalTasks = Task::count();
            $totalCancellations = User::whereNotNull('cancellation_reason')->count();

            $subscriptionStats = $this->getSubscriptionStats();
            $recentEmails = $this->getRecentEmails();
            $openaiStats = $this->getOpenAiStats();
            $revenueStats = $this->getRevenueStats();

            return view('admin.dashboard', compact(
                'totalUsers',
                'totalProjects',
                'totalTasks',
                'totalCancellations',
                'subscriptionStats',
                'recentEmails',
                'openaiStats',
                'revenueStats'
            ));
        } catch (\Exception $e) {
            return view('admin.dashboard', [
                'totalUsers' => User::count(),
                'totalProjects' => Project::count(),
                'totalTasks' => Task::count(),
                'totalCancellations' => User::whereNotNull('cancellation_reason')->count(),
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
            ->with(['subscriptions', 'appSumoCode'])
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

    public function upgradeUser(Request $request, User $user)
    {
        $request->validate([
            'plan' => ['required', 'in:basic,pro,business'],
        ]);

        $targetPlan = $request->plan;
        $currentPlan = $user->getCurrentPlan();

        try {
            // Update the user's subscription to the new plan
            $this->updateUserSubscription($user, $targetPlan);

            $message = "User {$user->name} upgraded from {$currentPlan} to {$targetPlan} plan successfully!";

            return redirect()->route('admin.users')->with('success', $message);

        } catch (\Exception $e) {
            Log::error("Error upgrading user {$user->id} to {$targetPlan}: ".$e->getMessage());

            return redirect()->route('admin.users')->with('error', 'Error upgrading user: '.$e->getMessage());
        }
    }

    private function createManualSubscription(User $user, string $plan)
    {
        // Get the real Stripe price ID from config first
        $plans = config('subscriptions.plans');
        $stripePriceId = $plans[$plan]['price_id'] ?? null;

        // Fallback to manual price ID if config price ID not available
        if (! $stripePriceId) {
            $stripePriceId = match ($plan) {
                'basic' => 'price_manual_basic',
                'pro' => 'price_manual_pro',
                'business' => 'price_manual_business',
                default => 'price_manual_basic'
            };
        }

        // Create fake Stripe customer ID for manual subscriptions if user doesn't have one
        if (! $user->stripe_id) {
            $user->update(['stripe_id' => 'cus_manual_'.$user->id]);
        }

        // Create subscription record
        $subscription = $user->subscriptions()->create([
            'type' => 'default',  // Use 'type' instead of 'name'
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
                // Get the real Stripe price ID from config
                $plans = config('subscriptions.plans');
                $stripePriceId = $plans[$action]['price_id'] ?? null;

                // Fallback to manual price ID if config price ID not available
                if (! $stripePriceId) {
                    $stripePriceId = match ($action) {
                        'basic' => 'price_manual_basic',
                        'pro' => 'price_manual_pro',
                        'business' => 'price_manual_business',
                        default => 'price_manual_basic'
                    };
                }

                if ($currentSub) {
                    // Update existing subscription
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
        $errorMessages = [];

        // Stripe setup (optional on remote)
        if (empty(config('cashier.secret'))) {
            $errorMessages[] = 'Stripe key not configured; showing local data only.';
        } else {
            try {
                \Stripe\Stripe::setApiKey(config('cashier.secret'));
            } catch (\Exception $e) {
                $errorMessages[] = 'Failed to init Stripe: '.$e->getMessage();
            }
        }

        // Refund logs & stats
        if (! Schema::hasTable('refund_logs')) {
            $refunds = collect();
            $stats = [
                'total_refunds' => 0,
                'total_amount' => 0,
                'month_refunds' => 0,
                'month_amount' => 0,
            ];
            $errorMessages[] = 'refund_logs table missing (run migrations).';
        } else {
            try {
                $refunds = RefundLog::with(['user', 'processedBy'])->latest('processed_at')->paginate(20);
                $stats = [
                    'total_refunds' => RefundLog::count(),
                    'total_amount' => RefundLog::sum('amount'),
                    'month_refunds' => RefundLog::whereYear('processed_at', date('Y'))->whereMonth('processed_at', date('m'))->count(),
                    'month_amount' => RefundLog::whereYear('processed_at', date('Y'))->whereMonth('processed_at', date('m'))->sum('amount'),
                ];
            } catch (\Exception $e) {
                $refunds = collect();
                $stats = [
                    'total_refunds' => 0,
                    'total_amount' => 0,
                    'month_refunds' => 0,
                    'month_amount' => 0,
                ];
                $errorMessages[] = 'Error loading refunds: '.$e->getMessage();
            }
        }

        // Users + Stripe data (for context when issuing refunds)
        try {
            $users = User::with(['subscriptions' => function ($q) {
                $q->latest();
            }])
                ->whereNotNull('stripe_id')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    $subscription = $user->subscriptions()->first();
                    $stripeData = ['customer' => null, 'payments' => [], 'invoices' => []];
                    if ($user->stripe_id && config('cashier.secret')) {
                        try {
                            $stripeData['customer'] = $user->asStripeCustomer();
                            $paymentIntents = \Stripe\PaymentIntent::all(['customer' => $user->stripe_id, 'limit' => 10]);
                            foreach ($paymentIntents->data as $intent) {
                                if ($intent->status === 'succeeded') {
                                    $stripeData['payments'][] = [
                                        'id' => $intent->id,
                                        'amount' => $intent->amount / 100,
                                        'currency' => strtoupper($intent->currency),
                                        'created' => date('M d, Y', $intent->created),
                                        'description' => $intent->description ?? 'Payment',
                                        'charges' => $intent->charges->data ?? [],
                                    ];
                                }
                            }
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
                                } catch (\Exception $e) { /* ignore per-user invoice errors */
                                }
                            }
                        } catch (\Exception $e) {
                            $stripeData['error'] = $e->getMessage();
                        }
                    }

                    return [
                        'user' => $user,
                        'subscription' => $subscription,
                        'stripe_data' => $stripeData,
                        'has_payment_methods' => method_exists($user, 'hasPaymentMethod') ? $user->hasPaymentMethod() : false,
                    ];
                });
        } catch (\Exception $e) {
            $users = collect();
            $errorMessages[] = 'Error loading users: '.$e->getMessage();
        }

        $view = view('admin.refunds', compact('stats', 'users'))
            ->with(['refundLogs' => $refunds, 'refunds' => $refunds]);
        if (! empty($errorMessages)) {
            $view->with('error', implode(' | ', $errorMessages));
        }

        return $view;
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

    public function emailLogDetail(Request $request, EmailLog $emailLog)
    {
        return view('admin.email-log-detail', compact('emailLog'));
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

    public function cancellations(Request $request)
    {
        // Get users with cancellation reasons
        $query = User::whereNotNull('cancellation_reason');

        // Apply filters
        if ($request->has('reason') && $request->reason !== '') {
            $query->where('cancellation_reason', $request->reason);
        }

        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $cancellations = $query->latest('cancelled_at')->paginate(25);

        // Get cancellation statistics for the chart
        $cancellationStats = User::whereNotNull('cancellation_reason')
            ->selectRaw('cancellation_reason, COUNT(*) as count')
            ->groupBy('cancellation_reason')
            ->orderBy('count', 'desc')
            ->get();

        // Transform for chart data
        $chartData = $cancellationStats->map(function ($stat) {
            $user = new User;
            $user->cancellation_reason = $stat->cancellation_reason;

            return [
                'reason' => $user->getCancellationReasonLabel(),
                'count' => $stat->count,
                'value' => $stat->cancellation_reason,
            ];
        });

        // Get all unique reasons for filter dropdown
        $allReasons = User::whereNotNull('cancellation_reason')
            ->distinct('cancellation_reason')
            ->pluck('cancellation_reason')
            ->map(function ($reason) {
                $user = new User;
                $user->cancellation_reason = $reason;

                return [
                    'value' => $reason,
                    'label' => $user->getCancellationReasonLabel(),
                ];
            });

        return view('admin.cancellations', compact('cancellations', 'chartData', 'allReasons'));
    }

    /* =============================
     * Plan Management
     * ============================= */
    public function plans()
    {
        $stripeError = null;
        $stripePlans = collect();
        $configPlans = config('plans.plans', []);
        $priceIds = collect($configPlans)->pluck('price_id')->filter()->unique()->values();

        // If a sync just happened, prefer session-cached fresh data
        if (session()->has('stripePlans')) {
            $stripePlans = collect(session('stripePlans'));
        } else {
            if (! config('cashier.secret')) {
                $stripeError = 'Stripe secret not configured';
            } else {
                try {
                    \Stripe\Stripe::setApiKey(config('cashier.secret'));
                    foreach ($configPlans as $slug => $planConfig) {
                        $priceId = $planConfig['price_id'] ?? null;
                        if (! $priceId) {
                            continue;
                        }
                        try {
                            $price = \Stripe\Price::retrieve(['id' => $priceId, 'expand' => ['product']]);
                            $productName = $price->product->name ?? $price->nickname ?? 'Unknown';
                            $stripePlans->push([
                                'name' => $productName,
                                'price_id' => $price->id,
                                'plan_key' => $slug,
                                'amount' => ($price->unit_amount ?? 0) / 100,
                                'currency' => strtoupper($price->currency ?? 'USD'),
                                'interval' => $price->recurring->interval ?? 'month',
                            ]);
                        } catch (\Exception $e) {
                            $stripePlans->push([
                                'name' => 'Error fetching '.$priceId,
                                'price_id' => $priceId,
                                'plan_key' => $slug,
                                'amount' => 0,
                                'currency' => 'N/A',
                                'interval' => '-',
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                } catch (\Exception $e) {
                    $stripeError = $e->getMessage();
                }
            }
        }

        return view('admin.plans', [
            'stripePlans' => $stripePlans,
            'stripeError' => $stripeError,
        ]);
    }

    public function syncPlansFromStripe(Request $request)
    {
        if (! config('cashier.secret')) {
            return redirect()->route('admin.plans')->with('error', 'Stripe secret key not configured.');
        }
        $configPlans = config('plans.plans', []);
        $priceIds = collect($configPlans)->pluck('price_id')->filter()->unique()->values();
        $fresh = [];
        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret'));
            foreach ($configPlans as $slug => $planConfig) {
                $priceId = $planConfig['price_id'] ?? null;
                if (! $priceId) {
                    continue;
                }
                try {
                    $price = \Stripe\Price::retrieve(['id' => $priceId, 'expand' => ['product']]);
                    $fresh[] = [
                        'name' => $price->product->name ?? $price->nickname ?? 'Unknown',
                        'price_id' => $price->id,
                        'plan_key' => $slug,
                        'amount' => ($price->unit_amount ?? 0) / 100,
                        'currency' => strtoupper($price->currency ?? 'USD'),
                        'interval' => $price->recurring->interval ?? 'month',
                    ];
                } catch (\Exception $e) {
                    $fresh[] = [
                        'name' => 'Error fetching '.$priceId,
                        'price_id' => $priceId,
                        'plan_key' => $slug,
                        'amount' => 0,
                        'currency' => 'N/A',
                        'interval' => '-',
                        'error' => $e->getMessage(),
                    ];
                }
            }
            session(['stripePlans' => $fresh]);

            return redirect()->route('admin.plans')->with('success', 'Stripe data refreshed. Showing live Stripe values only.');
        } catch (\Throwable $e) {
            return redirect()->route('admin.plans')->with('error', 'Stripe sync failed: '.$e->getMessage());
        }
    }

    public function updateStripePrice(Request $request)
    {
        $data = $request->validate([
            'price_id' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.5'], // minimal half unit
        ]);
        if (! config('cashier.secret')) {
            return redirect()->route('admin.plans')->with('error', 'Stripe secret not configured.');
        }

        // Debug: Log what we received
        \Illuminate\Support\Facades\Log::info('updateStripePrice received:', $data);

        // If plan_key is missing, try to find it by price_id
        if (empty($data['plan_key']) || $data['plan_key'] === 'debug-missing') {
            $configPlans = config('plans.plans', []);
            \Illuminate\Support\Facades\Log::info('Config plans:', $configPlans);

            foreach ($configPlans as $slug => $planConfig) {
                $configPriceId = $planConfig['price_id'] ?? null;
                \Illuminate\Support\Facades\Log::info("Comparing {$data['price_id']} with {$configPriceId} for plan {$slug}");
                if ($configPriceId === $data['price_id']) {
                    $data['plan_key'] = $slug;
                    \Illuminate\Support\Facades\Log::info("Found matching plan: {$slug}");
                    break;
                }
            }
        }

        if (empty($data['plan_key'])) {
            $configPlans = config('plans.plans', []);
            $debugInfo = 'Config plans: '.json_encode($configPlans).' | Looking for price_id: '.$data['price_id'];

            return redirect()->route('admin.plans')->with('error', 'Could not determine plan key for price ID: '.$data['price_id'].' | DEBUG: '.$debugInfo);
        }
        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret'));
            $old = \Stripe\Price::retrieve(['id' => $data['price_id'], 'expand' => ['product']]);
            $productId = is_object($old->product) ? $old->product->id : $old->product; // expanded or not
            $newAmount = (int) round($data['amount'] * 100);
            $newPrice = \Stripe\Price::create([
                'unit_amount' => $newAmount,
                'currency' => $old->currency,
                'recurring' => ['interval' => $old->recurring->interval],
                'product' => $productId,
                'metadata' => [
                    'replaces_price' => $old->id,
                    'plan_key' => $data['plan_key'], // Add plan key for better plan identification
                ],
            ]);

            // Update session stripePlans to reflect new price
            $plans = collect(session('stripePlans', []));
            $plans = $plans->map(function ($row) use ($newPrice, $old, $data) {
                if (($row['price_id'] ?? null) === $old->id) {
                    return [
                        'name' => $row['name'],
                        'price_id' => $newPrice->id,
                        'plan_key' => $data['plan_key'],
                        'amount' => ($newPrice->unit_amount ?? 0) / 100,
                        'currency' => strtoupper($newPrice->currency ?? 'USD'),
                        'interval' => $newPrice->recurring->interval ?? 'month',
                    ];
                }

                return $row;
            });

            // Refresh the plans list in session to show updated data immediately
            session(['stripePlans' => $plans->all()]);

            // Use the provided plan_key to determine env variable
            $envKey = 'STRIPE_PRICE_'.strtoupper($data['plan_key']);

            // Build comprehensive status message
            $statusMsg = "✅ New Stripe price created: {$newPrice->id}";
            $statusMsg .= "<br>💰 Updated {$data['plan_key']} plan to \${$data['amount']}/month";

            if ($envKey) {
                $envResult = $this->updateEnvironmentVariable($envKey, $newPrice->id);
                $statusMsg .= '<br>🔧 Environment Update: '.$envResult;
            } else {
                $statusMsg .= '<br>⚠️ Please update your environment configuration to reference this new price ID.';
            }

            $statusMsg .= '<br>🔄 Plans list refreshed with latest data from Stripe.';

            return redirect()->route('admin.plans')->with('success', $statusMsg);
        } catch (\Throwable $e) {
            return redirect()->route('admin.plans')->with('error', 'Price update failed: '.$e->getMessage());
        }
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

    public function verifyUser(Request $request, User $user)
    {
        if ($user->hasVerifiedEmail()) {
            return redirect()->back()->with('info', $user->name.' is already verified.');
        }

        $user->markEmailAsVerified();
        event(new \Illuminate\Auth\Events\Verified($user));

        return redirect()->back()->with('success', $user->name.' has been manually verified.');
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
                $priceId = $subscription->stripe_price;
                if ($priceId) {
                    $monthlyRevenue += $this->getPlanPrice($priceId);
                }
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
        if (! $stripePriceId) {
            return 'Unknown';
        }
        try {
            // Check configured env price IDs mapping
            $configPlans = config('plans.plans', []);
            foreach ($configPlans as $slug => $cfg) {
                if (! empty($cfg['price_id']) && $cfg['price_id'] === $stripePriceId) {
                    return $cfg['name'];
                }
            }
        } catch (\Throwable $e) {
            // ignore and fallback
        }

        return 'Unknown';
    }

    private function getPlanPrice($stripePriceId)
    {
        if (! $stripePriceId) {
            return 0;
        }
        try {
            // Get price directly from Stripe
            if (config('cashier.secret')) {
                \Stripe\Stripe::setApiKey(config('cashier.secret'));
                $price = \Stripe\Price::retrieve($stripePriceId);

                return ($price->unit_amount ?? 0) / 100; // Convert from cents
            }
        } catch (\Throwable $e) {
            // ignore and fallback
        }

        return 0;
    }

    /* =============================
     * Broadcast Email (Admin)
     * ============================= */
    public function broadcastEmailForm()
    {
        // Get user counts per segment for better admin visibility
        $allUsers = User::all();
        $segmentCounts = [];

        foreach (['free', 'basic', 'pro', 'business'] as $segment) {
            $count = $allUsers->filter(function ($user) use ($segment) {
                return $user->getCurrentPlan() === $segment;
            })->count();
            $segmentCounts[$segment] = $count;
        }

        return view('admin.broadcast-email', compact('segmentCounts'));
    }

    public function sendBroadcastEmail(Request $request)
    {
        // Basic mail configuration check
        if (! config('mail.from.address')) {
            return back()->withInput()->with('error', 'Email system not configured. Please check mail settings.');
        }

        $request->validate([
            'segments' => ['nullable', 'array'],
            'segments.*' => ['in:free,basic,pro,business'],
            'direct_emails' => ['nullable', 'array'],
            'direct_emails.*' => ['email'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $segments = $request->segments ?? [];
        $directEmails = collect($request->direct_emails ?? [])->filter();

        if (empty($segments) && $directEmails->isEmpty()) {
            return back()->withInput()->with('error', 'Select at least one segment or add at least one direct recipient email.');
        }

        // Build user collection based on segments using proper plan detection
        $segmentUsers = collect();

        if (! empty($segments)) {
            // Get all users and filter by their current plan using the getCurrentPlan() method
            $allUsers = User::all(['id', 'name', 'email']);

            foreach ($allUsers as $user) {
                $currentPlan = $user->getCurrentPlan();
                if (in_array($currentPlan, $segments)) {
                    $segmentUsers->push($user);
                }
            }
        }

        // Build collection of direct recipient user models (ensure they exist or create lightweight temp objects)
        $directUserModels = User::whereIn('email', $directEmails)->get(['id', 'name', 'email']);
        // For any direct emails not in database, create transient user-like objects
        $existingEmails = $directUserModels->pluck('email')->all();
        $missing = $directEmails->reject(fn ($e) => in_array($e, $existingEmails));
        $missingModels = $missing->map(function ($email) {
            $u = new User;
            $u->id = 0; // sentinel
            $u->name = $email; // fallback to email as name
            $u->email = $email;

            return $u;
        });

        $allRecipients = $segmentUsers->concat($directUserModels)->concat($missingModels)
            ->unique('email')
            ->values();

        if ($allRecipients->isEmpty()) {
            return back()->withInput()->with('error', 'No recipients resolved from segments or direct emails.');
        }

        $sent = 0;
        $failed = 0;
        $errors = [];

        foreach ($allRecipients as $user) {
            try {
                // Send email immediately (not queued) for more reliable delivery
                Mail::to($user->email)->send(new \App\Mail\BroadcastEmailMailable(
                    $request->subject,
                    $request->message,
                    $user
                ));

                // Log the email like contact form does
                \App\Models\EmailLog::logEmail(
                    toEmail: $user->email,
                    subject: $request->subject,
                    type: 'broadcast',
                    toName: $user->name,
                    content: substr($request->message, 0, 500),
                    userId: $user->id,
                    success: true
                );

                $sent++;
                Log::info('Broadcast email sent successfully', [
                    'recipient' => $user->email,
                    'subject' => $request->subject,
                ]);
            } catch (\Exception $e) {
                $failed++;
                $errors[] = $user->email.': '.$e->getMessage();

                // Log failed email
                \App\Models\EmailLog::logEmail(
                    toEmail: $user->email,
                    subject: $request->subject,
                    type: 'broadcast',
                    toName: $user->name,
                    content: substr($request->message, 0, 500),
                    userId: $user->id,
                    success: false,
                    error: $e->getMessage()
                );

                Log::warning('Broadcast email failed: '.$e->getMessage(), [
                    'user_email' => $user->email,
                    'subject' => $request->subject,
                ]);
            }
        }

        $message = "Broadcast sent to {$sent} recipient(s).";
        if ($failed > 0) {
            $message .= " {$failed} email(s) failed to send.";
            // Log detailed errors for debugging
            Log::warning('Broadcast email detailed errors', ['errors' => $errors]);
        }

        return redirect()->route('admin.broadcast-email.form')
            ->with('success', $message);
    }

    /**
     * Update environment variable based on current environment
     */
    private function updateEnvironmentVariable($key, $value)
    {
        $environment = $this->detectEnvironment();

        switch ($environment) {
            case 'local':
                return $this->updateLocalEnvFile($key, $value);

            case 'heroku':
                return $this->updateHerokuConfigVars($key, $value);

            case 'production':
                return $this->handleProductionEnvironment($key, $value);

            default:
                return "Please update your environment variable manually: {$key}={$value}";
        }
    }

    /**
     * Detect the current environment type
     */
    private function detectEnvironment()
    {
        // Check if running on Heroku - multiple indicators for reliable detection
        $herokuAppName = getenv('HEROKU_APP_NAME');
        $herokuDyno = getenv('DYNO');
        $herokuSlug = getenv('HEROKU_SLUG_COMMIT');

        if ($herokuDyno || $herokuAppName || $herokuSlug) {
            // Verify it's our specific app for better detection
            if ($herokuAppName === 'laravel-react-automation-app' || $herokuDyno || $herokuSlug) {
                return 'heroku';
            }
        }

        // Check if local development environment
        if (app()->environment(['local', 'development'])) {
            return 'local';
        }

        // Check other production indicators
        if (app()->environment('production')) {
            return 'production';
        }

        return 'unknown';
    }

    /**
     * Update local .env file
     */
    private function updateLocalEnvFile($key, $value)
    {
        try {
            $envPath = base_path('.env');

            if (! File::exists($envPath) || ! is_writable($envPath)) {
                return "❌ .env file not found or not writable. Please update {$key}={$value} manually.";
            }

            $content = File::get($envPath);
            $pattern = '/^'.preg_quote($key, '/').'=.*/m';
            $replacement = $key.'='.$value;

            if (preg_match($pattern, $content)) {
                $content = preg_replace($pattern, $replacement, $content, 1);
            } else {
                $content .= PHP_EOL.$replacement.PHP_EOL;
            }

            File::put($envPath, $content);

            // Clear config cache so next request picks up new value
            try {
                Artisan::call('config:clear');
            } catch (\Throwable $e) {
                // Ignore cache clear errors
            }

            return "✅ Updated {$key} in .env file automatically.";

        } catch (\Throwable $e) {
            return "❌ Failed to auto-update .env: {$e->getMessage()}. Please update {$key}={$value} manually.";
        }
    }

    /**
     * Update Heroku config variables
     */
    private function updateHerokuConfigVars($key, $value)
    {
        try {
            $updated = $this->updateHerokuConfigVar($key, $value);

            if ($updated) {
                return "✅ Automatically updated {$key} in Heroku config vars.";
            } else {
                $appName = env('HEROKU_APP_NAME', 'laravel-react-automation-app');

                return "⚠️ Auto-update failed. Run manually: heroku config:set {$key}={$value} -a {$appName}";
            }

        } catch (\Throwable $e) {
            $appName = env('HEROKU_APP_NAME', 'laravel-react-automation-app');

            return "⚠️ Auto-update failed: {$e->getMessage()}. Run manually: heroku config:set {$key}={$value} -a {$appName}";
        }
    }

    /**
     * Handle production environment (non-Heroku)
     */
    private function handleProductionEnvironment($key, $value)
    {
        // For production environments, provide instructions based on common deployment methods
        $instructions = "Please update your environment variable: {$key}={$value}\n\n";
        $instructions .= "Common methods:\n";
        $instructions .= "• Docker: Update your environment file or docker-compose.yml\n";
        $instructions .= "• Server: Update your web server environment variables\n";
        $instructions .= '• CI/CD: Update your deployment pipeline configuration';

        return $instructions;
    }

    /**
     * Update Heroku config variable via Platform API
     */
    private function updateHerokuConfigVar($key, $value)
    {
        try {
            // Get required Heroku details
            $herokuApiToken = env('HEROKU_API_TOKEN');
            $herokuAppName = env('HEROKU_APP_NAME', 'laravel-react-automation-app');

            if (! $herokuApiToken) {
                \Illuminate\Support\Facades\Log::info('HEROKU_API_TOKEN not set, cannot auto-update config vars');

                return false;
            }

            // Make API request to Heroku Platform API
            $url = "https://api.heroku.com/apps/{$herokuAppName}/config-vars";

            $data = json_encode([$key => $value]);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => 'PATCH',
                CURLOPT_POSTFIELDS => $data,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/vnd.heroku+json; version=3',
                    'Authorization: Bearer '.$herokuApiToken,
                ],
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 30,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                \Illuminate\Support\Facades\Log::info("Successfully updated Heroku config var: {$key}={$value}");

                return true;
            } else {
                \Illuminate\Support\Facades\Log::error("Heroku API error: HTTP {$httpCode}, Response: {$response}");

                return false;
            }

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to update Heroku config var: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Show Twilio testing page
     */
    public function twilioTest()
    {
        return view('admin.twilio-test');
    }

    /**
     * Show SMS messages dashboard
     */
    public function smsMessages(Request $request)
    {
        $query = \App\Models\SmsMessage::with(['user', 'automation'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $messages = $query->paginate(50);

        // Get statistics
        $stats = [
            'total_messages' => \App\Models\SmsMessage::count(),
            'delivered' => \App\Models\SmsMessage::where('status', 'delivered')->count(),
            'failed' => \App\Models\SmsMessage::whereIn('status', ['failed', 'undelivered'])->count(),
            'pending' => \App\Models\SmsMessage::whereIn('status', ['queued', 'sent'])->count(),
            'total_cost' => \App\Models\SmsMessage::sum('price'),
            'monthly_cost' => \App\Models\SmsMessage::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('price'),
        ];

        // Get recent activity (last 30 days)
        $recentActivity = \App\Models\SmsMessage::selectRaw('DATE(created_at) as date, COUNT(*) as count, SUM(price) as daily_cost')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->get();

        return view('admin.sms-messages', compact('messages', 'stats', 'recentActivity'));
    }

    /**
     * Show SMS message details
     */
    public function smsMessageShow($id)
    {
        $smsMessage = \App\Models\SmsMessage::with(['user', 'automation'])->findOrFail($id);

        // Sync status from Twilio if message is still pending
        if (in_array($smsMessage->status, ['queued', 'sent', 'accepted']) && $smsMessage->twilio_sid) {
            try {
                $twilioService = app(\App\Services\TwilioService::class);
                $twilioService->syncMessageStatus($smsMessage);
                // Refresh the model to get updated data
                $smsMessage = $smsMessage->fresh();
            } catch (\Exception $e) {
                Log::warning('Failed to sync SMS status in detail view', [
                    'sms_id' => $id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return view('admin.sms-message-show', compact('smsMessage'));
    }

    /**
     * Get SMS statistics for API
     */
    public function smsStats(Request $request)
    {
        // Overall statistics
        $totalMessages = \App\Models\SmsMessage::count();

        $stats = [
            'total_messages' => $totalMessages,
            'delivery_rate' => $totalMessages > 0
                ? (\App\Models\SmsMessage::where('status', 'delivered')->count() / $totalMessages) * 100
                : 0,
            'total_cost' => \App\Models\SmsMessage::sum('price') ?? 0,
            'avg_cost' => $totalMessages > 0
                ? (\App\Models\SmsMessage::sum('price') / $totalMessages)
                : 0,
            'status_counts' => [
                'delivered' => \App\Models\SmsMessage::where('status', 'delivered')->count(),
                'sent' => \App\Models\SmsMessage::where('status', 'sent')->count(),
                'failed' => \App\Models\SmsMessage::where('status', 'failed')->count(),
                'undelivered' => \App\Models\SmsMessage::where('status', 'undelivered')->count(),
                'queued' => \App\Models\SmsMessage::where('status', 'queued')->count(),
            ],
            'daily_volume' => \App\Models\SmsMessage::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->where('created_at', '>=', now()->subDays(7))
                ->groupBy('date')
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'date' => \Carbon\Carbon::parse($item->date)->format('M j'),
                        'count' => $item->count,
                    ];
                }),
            'max_daily' => \App\Models\SmsMessage::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->where('created_at', '>=', now()->subDays(7))
                ->groupBy('date')
                ->max('count') ?? 1,
            'cost_this_month' => \App\Models\SmsMessage::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('price') ?? 0,
            'cost_last_month' => \App\Models\SmsMessage::whereMonth('created_at', now()->subMonth()->month)
                ->whereYear('created_at', now()->subMonth()->year)
                ->sum('price') ?? 0,
            'cost_change' => 0, // Will calculate below
            'top_users' => \App\Models\SmsMessage::selectRaw('user_id, COUNT(*) as total_messages, SUM(price) as total_cost, AVG(price) as avg_cost')
                ->whereNotNull('user_id')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->groupBy('user_id')
                ->orderBy('total_messages', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($item) {
                    $user = \App\Models\User::find($item->user_id);
                    $delivered = \App\Models\SmsMessage::where('user_id', $item->user_id)
                        ->whereMonth('created_at', now()->month)
                        ->whereYear('created_at', now()->year)
                        ->where('status', 'delivered')
                        ->count();

                    return [
                        'name' => $user->name ?? 'Unknown',
                        'email' => $user->email ?? 'N/A',
                        'total_messages' => $item->total_messages,
                        'total_cost' => $item->total_cost ?? 0,
                        'avg_cost' => $item->avg_cost ?? 0,
                        'success_rate' => $item->total_messages > 0
                            ? ($delivered / $item->total_messages) * 100
                            : 0,
                    ];
                }),
        ];

        // Calculate cost change percentage
        if ($stats['cost_last_month'] > 0) {
            $stats['cost_change'] = (($stats['cost_this_month'] - $stats['cost_last_month']) / $stats['cost_last_month']) * 100;
        } elseif ($stats['cost_this_month'] > 0) {
            $stats['cost_change'] = 100; // 100% increase from 0
        }

        // Return JSON for API requests, view for web requests
        if ($request->expectsJson()) {
            return response()->json($stats);
        }

        return view('admin.sms-stats', compact('stats'));
    }

    /**
     * Sync SMS message statuses from Twilio
     */
    public function syncSmsStatuses(Request $request)
    {
        try {
            $twilioService = app(\App\Services\TwilioService::class);
            $results = $twilioService->syncAllPendingMessages();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => "Synced {$results['synced']} messages successfully.",
                    'results' => $results,
                ]);
            }

            return redirect()->back()->with('success',
                "SMS Status Sync Complete: {$results['synced']} messages updated, {$results['failed']} failed."
            );
        } catch (\Exception $e) {
            Log::error('Failed to sync SMS statuses via admin panel', [
                'error' => $e->getMessage(),
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to sync SMS statuses: '.$e->getMessage(),
                ], 500);
            }

            return redirect()->back()->with('error', 'Failed to sync SMS statuses: '.$e->getMessage());
        }
    }

    /**
     * AppSumo dashboard - show codes and stats
     */
    public function appSumoDashboard()
    {
        $codes = AppSumoCode::with('redeemedByUser')
            ->orderBy('created_at', 'desc')
            ->get();

        $stats = [
            'total' => $codes->count(),
            'active' => $codes->where('status', 'active')->count(),
            'redeemed' => $codes->where('status', 'redeemed')->count(),
            'expired' => $codes->where('status', 'expired')->count(),
        ];

        return view('admin.appsumo.dashboard', compact('codes', 'stats'));
    }

    /**
     * Generate bulk AppSumo codes
     */
    public function generateAppSumoCodes(Request $request)
    {
        $request->validate([
            'count' => 'required|integer|min:1|max:10000',
        ]);

        $count = $request->input('count');
        $codes = [];

        try {
            for ($i = 0; $i < $count; $i++) {
                $code = $this->generateUniqueAppSumoCode();
                
                $codeRecord = AppSumoCode::create([
                    'code' => $code,
                    'status' => 'active',
                    'campaign' => 'appsumo_2025',
                ]);

                $codes[] = $codeRecord;
            }

            return redirect()
                ->route('admin.appsumo.dashboard')
                ->with('message', "Successfully generated {$count} new AppSumo codes!");

        } catch (\Exception $e) {
            return redirect()
                ->route('admin.appsumo.dashboard')
                ->with('error', 'Failed to generate codes: ' . $e->getMessage());
        }
    }

    /**
     * Export AppSumo codes as CSV - AppSumo format (codes only, no headers)
     */
    public function exportAppSumoCodes()
    {
        $codes = AppSumoCode::where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->get();

        $filename = 'appsumo_codes_' . date('Y_m_d_H_i_s') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($codes) {
            $file = fopen('php://output', 'w');
            
            // NO HEADERS - AppSumo requirement
            // Only output the codes, one per row, no additional information
            foreach ($codes as $code) {
                fputcsv($file, [$code->code]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Generate a unique AppSumo code
     */
    private function generateUniqueAppSumoCode()
    {
        do {
            // Generate format: AS + 8 random alphanumeric characters (uppercase)
            $code = 'AS' . strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8));
        } while (AppSumoCode::where('code', $code)->exists());

        return $code;
    }
}
