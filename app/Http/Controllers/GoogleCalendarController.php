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
            return response()->json($result, 403);
        }

        if (! ($result['success'] ?? false)) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function connect()
    {
        return Socialite::driver('google')
            ->stateless()
            ->scopes(['https://www.googleapis.com/auth/calendar'])
            ->with([
                'access_type' => 'offline',
                'prompt' => 'consent',
            ])
            ->redirectUrl(route('google.calendar.callback'))
            ->redirect();
    }

    public function callback(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login')->with('error', 'Please log in to connect Google Calendar.');
        }

        $googleUser = Socialite::driver('google')
            ->stateless()
            ->scopes(['https://www.googleapis.com/auth/calendar'])
            ->redirectUrl(route('google.calendar.callback'))
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
