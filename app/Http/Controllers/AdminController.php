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
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Laravel\Cashier\Subscription;

class AdminController extends Controller
{
    public function dashboard()
    {
        try {
            $totalUsers = User::count();
            $totalProjects = Project::count();
            $totalTasks = Task::count();

            $subscriptionStats = $this->getSubscriptionStats();
            $recentEmails = $this->getRecentEmails();
            $openaiStats = $this->getOpenAiStats();
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
        $errorMessages = [];

        // Stripe setup (optional on remote)
        if (empty(config('cashier.secret'))) {
            $errorMessages[] = 'Stripe key not configured; showing local data only.';
        } else {
            try { \Stripe\Stripe::setApiKey(config('cashier.secret')); } catch (\Exception $e) {
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
                $refunds = RefundLog::with(['user','processedBy'])->latest('processed_at')->paginate(20);
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
            $users = User::with(['subscriptions' => function ($q) { $q->latest(); }])
                ->whereNotNull('stripe_id')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    $subscription = $user->subscriptions()->first();
                    $stripeData = ['customer' => null,'payments' => [],'invoices' => []];
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
                                } catch (\Exception $e) { /* ignore per-user invoice errors */ }
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

        $view = view('admin.refunds', compact('stats','users'))
            ->with(['refundLogs' => $refunds, 'refunds' => $refunds]);
        if (!empty($errorMessages)) {
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
            if (!config('cashier.secret')) {
                $stripeError = 'Stripe secret not configured';
            } else {
                try {
                    \Stripe\Stripe::setApiKey(config('cashier.secret'));
                    foreach ($configPlans as $slug => $planConfig) {
                        $priceId = $planConfig['price_id'] ?? null;
                        if (!$priceId) continue;
                        try {
                            $price = \Stripe\Price::retrieve(['id' => $priceId, 'expand' => ['product']]);
                            $productName = $price->product->name ?? $price->nickname ?? 'Unknown';
                            $stripePlans->push([
                                'name' => $productName,
                                'price_id' => $price->id,
                                'plan_key' => $slug,
                                'amount' => ($price->unit_amount ?? 0)/100,
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
        if (!config('cashier.secret')) {
            return redirect()->route('admin.plans')->with('error','Stripe secret key not configured.');
        }
        $configPlans = config('plans.plans', []);
        $priceIds = collect($configPlans)->pluck('price_id')->filter()->unique()->values();
        $fresh = [];
        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret'));
            foreach ($configPlans as $slug => $planConfig) {
                $priceId = $planConfig['price_id'] ?? null;
                if (!$priceId) continue;
                try {
                    $price = \Stripe\Price::retrieve(['id' => $priceId, 'expand' => ['product']]);
                    $fresh[] = [
                        'name' => $price->product->name ?? $price->nickname ?? 'Unknown',
                        'price_id' => $price->id,
                        'plan_key' => $slug,
                        'amount' => ($price->unit_amount ?? 0)/100,
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
            return redirect()->route('admin.plans')->with('success','Stripe data refreshed. Showing live Stripe values only.');
        } catch (\Throwable $e) {
            return redirect()->route('admin.plans')->with('error','Stripe sync failed: '.$e->getMessage());
        }
    }

    public function updateStripePrice(Request $request)
    {
        $data = $request->validate([
            'price_id' => ['required','string'],
            'amount' => ['required','numeric','min:0.5'], // minimal half unit
        ]);
        if (!config('cashier.secret')) {
            return redirect()->route('admin.plans')->with('error','Stripe secret not configured.');
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
            $debugInfo = "Config plans: " . json_encode($configPlans) . " | Looking for price_id: " . $data['price_id'];
            return redirect()->route('admin.plans')->with('error','Could not determine plan key for price ID: ' . $data['price_id'] . ' | DEBUG: ' . $debugInfo);
        }
        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret'));
            $old = \Stripe\Price::retrieve(['id' => $data['price_id'], 'expand' => ['product']]);
            $productId = is_object($old->product) ? $old->product->id : $old->product; // expanded or not
            $newAmount = (int) round($data['amount'] * 100);
            $newPrice = \Stripe\Price::create([
                'unit_amount' => $newAmount,
                'currency' => $old->currency,
                'recurring' => [ 'interval' => $old->recurring->interval ],
                'product' => $productId,
                'metadata' => [ 'replaces_price' => $old->id ],
            ]);

            // Update session stripePlans to reflect new price (flag that env needs updating)
            $plans = collect(session('stripePlans', []));
            $plans = $plans->map(function($row) use ($newPrice, $old, $data) {
                if (($row['price_id'] ?? null) === $old->id) {
                    return [
                        'name' => $row['name'],
                        'price_id' => $newPrice->id,
                        'plan_key' => $data['plan_key'],
                        'amount' => ($newPrice->unit_amount ?? 0)/100,
                        'currency' => strtoupper($newPrice->currency ?? 'USD'),
                        'interval' => $newPrice->recurring->interval ?? 'month',
                        'previous_price_id' => $old->id,
                        'env_update_required' => true,
                    ];
                }
                return $row;
            });
            session(['stripePlans' => $plans->all()]);
            // Use the provided plan_key to determine env variable
            $envKey = 'STRIPE_PRICE_'.strtoupper($data['plan_key']);

            $envUpdateMsg = 'New Stripe price created: '.$newPrice->id.'. ';
            
            if ($envKey) {
                $envUpdateMsg .= $this->updateEnvironmentVariable($envKey, $newPrice->id);
            } else {
                $envUpdateMsg .= 'Update your environment configuration to reference this new price ID.';
            }

            return redirect()->route('admin.plans')->with('success',$envUpdateMsg);
        } catch (\Throwable $e) {
            return redirect()->route('admin.plans')->with('error','Price update failed: '.$e->getMessage());
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
        if (! $stripePriceId) return 'Unknown';
        try {
            // Check configured env price IDs mapping
            $configPlans = config('plans.plans', []);
            foreach ($configPlans as $slug => $cfg) {
                if (!empty($cfg['price_id']) && $cfg['price_id'] === $stripePriceId) {
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
        if (! $stripePriceId) return 0;
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
        return view('admin.broadcast-email');
    }

    public function sendBroadcastEmail(Request $request)
    {
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

        $segmentUsers = $segments ? $usersQuery->get(['id', 'name', 'email']) : collect();

        // Build collection of direct recipient user models (ensure they exist or create lightweight temp objects)
        $directUserModels = User::whereIn('email', $directEmails)->get(['id','name','email']);
        // For any direct emails not in database, create transient user-like objects
        $existingEmails = $directUserModels->pluck('email')->all();
        $missing = $directEmails->reject(fn($e) => in_array($e, $existingEmails));
        $missingModels = $missing->map(function($email){
            $u = new User();
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
        foreach ($allRecipients as $user) {
            try {
                Mail::to($user->email)->send(new \App\Mail\BroadcastEmailMailable(
                    $request->subject,
                    $request->message,
                    $user
                ));
                $sent++;
            } catch (\Exception $e) {
                // Optionally log: Log::warning('Broadcast email failed: '.$e->getMessage());
            }
        }

        return redirect()->route('admin.broadcast-email.form')
            ->with('success', "Broadcast sent to {$sent} recipient(s).");
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
        // Check if running on Heroku
        if (getenv('DYNO') || getenv('HEROKU_APP_NAME')) {
            return 'heroku';
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
            
            if (!File::exists($envPath) || !is_writable($envPath)) {
                return "❌ .env file not found or not writable. Please update {$key}={$value} manually.";
            }
            
            $content = File::get($envPath);
            $pattern = '/^'.preg_quote($key,'/').'=.*/m';
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
                $appName = env('HEROKU_APP_NAME', 'your-app-name');
                return "⚠️ Auto-update failed. Run manually: heroku config:set {$key}={$value} -a {$appName}";
            }
            
        } catch (\Throwable $e) {
            $appName = env('HEROKU_APP_NAME', 'your-app-name');
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
        $instructions .= "• CI/CD: Update your deployment pipeline configuration";
        
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
            
            if (!$herokuApiToken) {
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
                    'Authorization: Bearer ' . $herokuApiToken,
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
            \Illuminate\Support\Facades\Log::error('Failed to update Heroku config var: ' . $e->getMessage());
            return false;
        }
    }
}
