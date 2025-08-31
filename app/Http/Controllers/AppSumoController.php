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
    public function redeemPage()
    {
        return Inertia::render('AppSumo/Redeem');
    }

    /**
     * Process the redemption
     */
    public function processRedemption(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:200',
        ]);

        $code = AppSumoCode::where('code', $request->code)->first();

        if (!$code) {
            throw ValidationException::withMessages([
                'code' => 'Invalid redemption code. Please check your code and try again.',
            ]);
        }

        if ($code->status !== 'active') {
            throw ValidationException::withMessages([
                'code' => 'This code has already been redeemed or has expired.',
            ]);
        }

        // If just validating the code (step 1), return success
        if (!$request->has('name') && !$request->has('email')) {
            return back()->with([
                'codeValid' => true,
                'message' => 'Code is valid! Please enter your account details.',
            ]);
        }

        // Step 2: Create account and redeem
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
        ]);

        DB::beginTransaction();

        try {
            // Create the user account
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make(str()->random(32)), // Random password
                'email_verified_at' => now(), // Auto-verify AppSumo users
                'subscription_plan' => 'lifetime', // Lifetime access
                'subscription_status' => 'active',
                'subscription_ends_at' => null, // Never expires
                'trial_ends_at' => null,
                'is_trial' => false,
            ]);

            // Mark the code as redeemed
            $code->markAsRedeemed($user, [
                'name' => $request->name,
                'email' => $request->email,
                'redeemed_via' => 'appsumo',
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip(),
            ]);

            // Log the user in
            Auth::login($user);

            DB::commit();

            return redirect()->route('appsumo.success');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return back()->withErrors([
                'email' => 'An error occurred while creating your account. Please try again.',
            ]);
        }
    }

    /**
     * Show the success page after redemption
     */
    public function successPage()
    {
        if (!Auth::check()) {
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
            'Content-Disposition' => 'attachment; filename="appsumo-codes-' . date('Y-m-d') . '.csv"',
        ]);
    }
}
