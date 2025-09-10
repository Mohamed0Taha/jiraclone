<?php

namespace App\Http\Controllers;

use App\Models\AppSumoCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AppSumoController extends Controller
{
    /**
     * Show the redemption page
     */
    public function redeemPage(Request $request, $code = null)
    {
        return Inertia::render('AppSumo/Redeem', [
            'prefilledCode' => $code, // Pre-fill the code if provided in URL
        ]);
    }

    /**
     * Process the redemption
     */
    public function processRedemption(Request $request)
    {
        // Dynamic validation based on email type
        $validationRules = [
            'code' => 'required|string|max:200',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
        ];

        $isGmailAccount = str_contains(strtolower($request->email), '@gmail.com');

        // Require password for non-Gmail accounts
        if (! $isGmailAccount) {
            $validationRules['password'] = 'required|string|min:8|confirmed';
            $validationRules['password_confirmation'] = 'required|string|min:8';
        }

        $request->validate($validationRules);

        $code = AppSumoCode::where('code', $request->code)->first();

        if (! $code) {
            throw ValidationException::withMessages([
                'code' => 'Invalid redemption code. Please check your code and try again.',
            ]);
        }

        if ($code->status !== 'active') {
            throw ValidationException::withMessages([
                'code' => 'This code has already been redeemed or has expired.',
            ]);
        }

        DB::beginTransaction();

        try {
            // Check if user already exists
            $existingUser = User::where('email', $request->email)->first();

            if ($existingUser) {
                // Upgrade existing user to lifetime access
                $this->createAppSumoSubscription($existingUser);
                $user = $existingUser;
                $isNewUser = false;
            } else {
                // Create new user account
                $fullName = trim($request->first_name.' '.$request->last_name);

                // Determine password based on account type
                $password = $isGmailAccount
                    ? Hash::make(str()->random(32)) // Random password for Gmail users (they'll use OAuth)
                    : Hash::make($request->password); // Use provided password for non-Gmail users

                $user = User::create([
                    'name' => $fullName,
                    'email' => $request->email,
                    'password' => $password,
                    'email_verified_at' => now(), // Auto-verify AppSumo users
                ]);

                // Create AppSumo lifetime subscription
                $this->createAppSumoSubscription($user);

                $isNewUser = true;
            }

            // Mark the code as redeemed
            $code->markAsRedeemed($user, [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'redeemed_via' => 'appsumo',
                'account_type' => $isGmailAccount ? 'gmail' : 'standard',
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip(),
                'is_new_user' => $isNewUser,
            ]);

            // Log the user in
            Auth::login($user);

            DB::commit();

            $welcomeMessage = $isNewUser
                ? '🎉 Welcome to TaskPilot! Your lifetime subscription is now active. Thank you for your AppSumo purchase!'
                : '🎉 Your account has been upgraded to lifetime access! Thank you for your AppSumo purchase!';

            return redirect()->route('dashboard')
                ->with('appsumo_welcome', true)
                ->with('message', $welcomeMessage);

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors([
                'email' => 'An error occurred while processing your redemption. Please try again.',
            ]);
        }
    }

    /**
     * Show the success page after redemption
     */
    public function successPage()
    {
        if (! Auth::check()) {
            return redirect()->route('appsumo.redeem')
                ->with('error', 'Please complete the redemption process first.');
        }

        $user = Auth::user();

        return Inertia::render('AppSumo/Success', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Dynamic redirect - can be configured for AppSumo dashboard
     */
    public function dynamicRedirect()
    {
        // This can be configured to redirect to different URLs
        // For now, redirect to the redemption page
        return redirect()->route('appsumo.redeem');
    }

    /**
     * Admin dashboard for managing codes
     */
    public function adminDashboard()
    {
        $codes = AppSumoCode::with('redeemedByUser')
            ->orderBy('created_at', 'desc')
            ->paginate(100);

        $stats = [
            'total' => AppSumoCode::count(),
            'active' => AppSumoCode::where('status', 'active')->count(),
            'redeemed' => AppSumoCode::where('status', 'redeemed')->count(),
            'expired' => AppSumoCode::where('status', 'expired')->count(),
        ];

        return Inertia::render('Admin/AppSumo/Dashboard', [
            'codes' => $codes->items(),
            'stats' => $stats,
        ]);
    }

    /**
     * Generate new codes
     */
    public function generateCodes(Request $request)
    {
        $request->validate([
            'count' => 'required|integer|min:1|max:10000',
        ]);

        $codes = [];

        for ($i = 0; $i < $request->count; $i++) {
            $codes[] = [
                'code' => AppSumoCode::generateUniqueCode(),
                'status' => 'active',
                'campaign' => 'appsumo_2025',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        AppSumoCode::insert($codes);

        return back()->with('message', "Successfully generated {$request->count} new codes.");
    }

    /**
     * Export codes as CSV
     */
    public function exportCodes()
    {
        $codes = AppSumoCode::with('redeemedByUser')->get();

        $csv = "Code,Status,Redeemed By,Email,Redeemed At,Created At\n";

        foreach ($codes as $code) {
            $redeemedBy = $code->redeemedByUser ? $code->redeemedByUser->name : '';
            $email = $code->redeemedByUser ? $code->redeemedByUser->email : '';
            $redeemedAt = $code->redeemed_at ? $code->redeemed_at->format('Y-m-d H:i:s') : '';

            $csv .= sprintf(
                "%s,%s,%s,%s,%s,%s\n",
                $code->code,
                $code->status,
                $redeemedBy,
                $email,
                $redeemedAt,
                $code->created_at->format('Y-m-d H:i:s')
            );
        }

        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="appsumo-codes-'.date('Y-m-d').'.csv"',
        ]);
    }

    /**
     * Create AppSumo lifetime subscription for user
     */
    private function createAppSumoSubscription(User $user)
    {
        // Cancel any existing subscriptions first
        foreach ($user->subscriptions as $subscription) {
            if ($subscription->stripe_status === 'active') {
                $subscription->update(['stripe_status' => 'canceled', 'ends_at' => now()]);
            }
        }

        // Get Pro plan price ID from config (AppSumo users get Pro features)
        $plans = config('subscriptions.plans');
        $stripePriceId = $plans['pro']['price_id'] ?? 'price_manual_appsumo_pro';

        // Create fake Stripe customer ID for AppSumo users if user doesn't have one
        if (! $user->stripe_id) {
            $user->update(['stripe_id' => 'cus_appsumo_'.$user->id]);
        }

        // Create AppSumo lifetime subscription record
        $subscription = $user->subscriptions()->create([
            'type' => 'default',
            'stripe_id' => 'sub_appsumo_'.$user->id.'_'.time(),
            'stripe_status' => 'active',
            'stripe_price' => $stripePriceId,
            'quantity' => 1,
            'trial_ends_at' => null,
            'ends_at' => null, // Never expires - lifetime access
        ]);

        return $subscription;
    }
}
