<?php

namespace App\Http\Controllers;

use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleCalendarController extends Controller
{
    public function __construct(private GoogleCalendarService $calendarService)
    {
        $this->middleware('auth');
    }
    public function sync(Request $request)
    {
        $user = $request->user();
        $events = $request->input('events', []);

        // Add a header check to prevent automatic sync calls
        if (!$request->hasHeader('X-User-Initiated') || $request->header('X-User-Initiated') !== 'true') {
            \Log::warning('[GoogleCalendarController] Automatic sync attempt blocked', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sync must be initiated by user action.',
            ], 422);
        }

        try {
            $result = $this->calendarService->sync($user, is_array($events) ? $events : []);
        } catch (\Throwable $e) {
            Log::error('Google Calendar sync failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync with Google Calendar.',
            ], 500);
        }

        if (($result['requires_auth'] ?? false) === true) {
            return response()->json($result, 401);
        }

        if (! ($result['success'] ?? false)) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    protected function calendarRedirectUrl(Request $request): string
    {
        $relative = route('google.calendar.callback', [], false);

        return $request->getSchemeAndHttpHost().$relative;
    }

    protected function calendarScopes(): array
    {
        $configured = config('services.google.calendar_scopes');

        if (empty($configured)) {
            return ['https://www.googleapis.com/auth/calendar'];
        }

        if (is_array($configured)) {
            return array_values(array_filter(array_map('trim', $configured)));
        }

        return array_values(array_filter(array_map('trim', explode(',', $configured))));
    }

    public function connect(Request $request)
    {
        $redirectUrl = $this->calendarRedirectUrl($request);
        $scopes = $this->calendarScopes();

        return Socialite::driver('google')
            ->stateless()
            ->scopes($scopes)
            ->with([
                'access_type' => 'offline',
                'prompt' => 'consent',
                'include_granted_scopes' => 'true',
            ])
            ->redirectUrl($redirectUrl)
            ->redirect();
    }

    public function callback(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login')->with('error', 'Please log in to connect Google Calendar.');
        }

        $redirectUrl = $this->calendarRedirectUrl($request);
        $scopes = $this->calendarScopes();

        $googleUser = Socialite::driver('google')
            ->stateless()
            ->scopes($scopes)
            ->redirectUrl($redirectUrl)
            ->with([
                'access_type' => 'offline',
                'prompt' => 'consent',
                'include_granted_scopes' => 'true',
            ])
            ->user();

        $user->forceFill([
            'google_id' => $googleUser->getId() ?: $user->google_id,
            'google_avatar' => $googleUser->getAvatar() ?: $user->google_avatar,
            'google_token' => $googleUser->token,
            'google_refresh_token' => $googleUser->refreshToken ?: $user->google_refresh_token,
        ])->save();

        return response()->view('integrations.google-calendar-connected');
    }

    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'connected' => $this->calendarService->hasCalendarConnection($user),
            'authorize_url' => route('google.calendar.connect'),
        ]);
    }
}
