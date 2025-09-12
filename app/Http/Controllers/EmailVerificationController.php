<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;

class EmailVerificationController extends Controller
{
    public function notice()
    {
        return Inertia::render('Auth/VerifyEmail', ['status' => session('status')]);
    }

    public function verify(Request $request, $id, $hash)
    {
        $ignored = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        $isValid = false;

        try {
            $isValid = URL::hasValidSignature($request, false, $ignored);
        } catch (\Exception $_) {}

        if (! $isValid) {
            try { $isValid = URL::hasValidSignature($request, true, $ignored); } catch (\Exception $_) {}
        }

        if (! $isValid && app()->environment(['local', 'testing'])) {
            try {
                $url = $request->url();
                $queryString = $request->getQueryString();
                if ($queryString) {
                    parse_str($queryString, $params);
                    $signature = $params['signature'] ?? null;
                    if ($signature) {
                        unset($params['signature']);
                        $baseUrl = $url . '?' . http_build_query($params);
                        $expectedSignature = hash_hmac('sha256', $baseUrl, config('app.key'));
                        $isValid = hash_equals($expectedSignature, $signature);
                    }
                }
            } catch (\Exception $_) {}
        }

        if (! $isValid) {
            abort(403, 'Invalid signature. Please request a new verification email.');
        }

        $user = User::findOrFail($id);
        if (! hash_equals(sha1($user->getEmailForVerification()), (string) $hash)) {
            abort(403, 'Invalid verification hash.');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        Auth::login($user);

        return redirect()->intended('/dashboard')->with('verified', true);
    }

    public function resend(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended('/dashboard');
        }
        $request->user()->sendEmailVerificationNotification();
        return back()->with('status', 'verification-link-sent');
    }
}

