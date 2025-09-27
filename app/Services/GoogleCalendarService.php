<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    private const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
    private const CALENDAR_ID = 'primary';

    private function calendarScopes(): array
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

    private function allowsWriteOperations(): bool
    {
        $scopes = $this->calendarScopes();

        $writeScopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];

        foreach ($writeScopes as $scope) {
            if (in_array($scope, $scopes, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Synchronise local events with Google Calendar. Returns an array containing
     * the merged event list or instructions to authorise Google access.
     */
    public function sync(User $user, array $localEvents): array
    {
        if (! $this->hasCalendarConnection($user)) {
            return [
                'success' => false,
                'requires_auth' => true,
                'authorize_url' => route('google.calendar.connect'),
                'message' => 'Connect your Google account to sync calendar events.',
            ];
        }

        $normalizedLocal = collect($localEvents)->map(function ($event) {
            try {
                $start = isset($event['start']) ? Carbon::parse($event['start']) : Carbon::now();
            } catch (\Throwable $e) {
                $start = Carbon::now();
            }

            try {
                $end = isset($event['end']) ? Carbon::parse($event['end']) : (clone $start)->addHour();
            } catch (\Throwable $e) {
                $end = (clone $start)->addHour();
            }

            return [
                'id' => $event['id'] ?? null,
                'title' => $event['title'] ?? 'Untitled event',
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
                'allDay' => (bool) ($event['allDay'] ?? false),
                'source' => $event['source'] ?? 'local',
                'google_event_id' => $event['google_event_id'] ?? null,
                'description' => $event['description'] ?? $event['desc'] ?? null,
                'desc' => $event['desc'] ?? $event['description'] ?? null,
            ];
        });

        $createdEvents = collect();

        if ($this->allowsWriteOperations()) {
            $unsynced = $normalizedLocal->filter(fn ($event) => empty($event['google_event_id']));

            foreach ($unsynced as $event) {
                $payload = $this->formatGoogleEventPayload($event);
                $response = $this->makeRequest($user, 'POST', self::GOOGLE_CALENDAR_BASE.'/calendars/'.self::CALENDAR_ID.'/events', [
                    'body' => $payload,
                ]);

                if (! $response || ! $response->successful()) {
                    Log::warning('[GoogleCalendarService] Failed to push event to Google', [
                        'user_id' => $user->id,
                        'status' => optional($response)->status(),
                        'body' => optional($response)->json(),
                    ]);
                    continue;
                }

                $createdEvents->push($response->json());
            }

            if ($createdEvents->isNotEmpty()) {
                $normalizedLocal = $normalizedLocal->map(function ($event) use ($createdEvents) {
                    $match = $createdEvents->first(function ($created) use ($event) {
                        return (string) Arr::get($created, 'extendedProperties.private.local_id') === (string) ($event['id'] ?? '');
                    });

                    return $match ? $this->mapGoogleEvent($match) : $event;
                });
            }
        }

        // Fetch remote events
        $remoteResponse = $this->makeRequest($user, 'GET', self::GOOGLE_CALENDAR_BASE.'/calendars/'.self::CALENDAR_ID.'/events', [
            'query' => [
                'singleEvents' => true,
                'orderBy' => 'startTime',
                'timeMin' => Carbon::now()->subMonths(6)->toRfc3339String(),
                'timeMax' => Carbon::now()->addMonths(12)->toRfc3339String(),
            ],
        ]);

        if (! $remoteResponse || ! $remoteResponse->successful()) {
            Log::error('[GoogleCalendarService] Failed to fetch Google Calendar events', [
                'user_id' => $user->id,
                'status' => optional($remoteResponse)->status(),
                'body' => optional($remoteResponse)->json(),
            ]);

            if ($remoteResponse && $remoteResponse->status() === 403) {
                return [
                    'success' => false,
                    'requires_auth' => true,
                    'authorize_url' => route('google.calendar.connect'),
                    'message' => 'Google rejected the request. Please reconnect your Google Calendar.',
                ];
            }

            return [
                'success' => false,
                'message' => 'Unable to fetch Google Calendar events.',
            ];
        }

        $remoteEvents = collect($remoteResponse->json('items') ?? [])
            ->merge($createdEvents)
            ->map(fn ($item) => $this->mapGoogleEvent($item))
            ->filter()
            ->unique('google_event_id')
            ->values();

        $merged = $this->mergeEvents($normalizedLocal, $remoteEvents);

        return [
            'success' => true,
            'events' => $merged->values()->all(),
            'message' => 'Google Calendar synced.',
            'last_synced_at' => Carbon::now()->toIso8601String(),
        ];
    }

    public function hasCalendarConnection(User $user): bool
    {
        return ! empty($user->google_refresh_token);
    }

    private function makeRequest(User $user, string $method, string $url, array $options = [])
    {
        $accessToken = $this->retrieveAccessToken($user);

        if (! $accessToken) {
            return null;
        }

        $pending = Http::withToken($accessToken)->acceptJson();

        $response = $this->dispatchHttpRequest($pending, $method, $url, $options);

        if ($response && $response->status() === 401 && $user->google_refresh_token) {
            $accessToken = $this->refreshAccessToken($user);
            if (! $accessToken) {
                return $response;
            }
            $pending = Http::withToken($accessToken)->acceptJson();
            $response = $this->dispatchHttpRequest($pending, $method, $url, $options);
        }

        return $response;
    }

    private function dispatchHttpRequest($pendingRequest, string $method, string $url, array $options)
    {
        $query = $options['query'] ?? [];
        $body = $options['body'] ?? [];

        return match (strtoupper($method)) {
            'GET' => $pendingRequest->get($url, $query),
            'POST' => $pendingRequest->post($url, $body),
            'PATCH' => $pendingRequest->patch($url, $body),
            'PUT' => $pendingRequest->put($url, $body),
            'DELETE' => $pendingRequest->delete($url, $query),
            default => $pendingRequest->get($url, $query),
        };
    }

    private function retrieveAccessToken(User $user): ?string
    {
        if (! empty($user->google_token)) {
            return $user->google_token;
        }

        return $this->refreshAccessToken($user);
    }

    private function refreshAccessToken(User $user): ?string
    {
        if (! $user->google_refresh_token) {
            return null;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $user->google_refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if (! $response->successful()) {
            Log::error('[GoogleCalendarService] Failed to refresh Google access token', [
                'user_id' => $user->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return null;
        }

        $accessToken = $response->json('access_token');

        if ($accessToken) {
            $user->forceFill(['google_token' => $accessToken])->save();
        }

        return $accessToken;
    }

    private function formatGoogleEventPayload(array $event): array
    {
        $start = Carbon::parse($event['start']);
        $end = Carbon::parse($event['end']);
        $allDay = (bool) ($event['allDay'] ?? false);

        $payload = [
            'summary' => $event['title'] ?? 'Untitled event',
            'description' => $event['description'] ?? null,
            'start' => $this->formatDateForGoogle($start, $allDay),
            'end' => $this->formatDateForGoogle($end, $allDay),
        ];

        if (! empty($event['id'])) {
            $payload['extendedProperties'] = [
                'private' => [
                    'local_id' => (string) $event['id'],
                ],
            ];
        }

        return array_filter($payload, fn ($value) => $value !== null);
    }

    private function formatDateForGoogle(Carbon $date, bool $allDay): array
    {
        if ($allDay) {
            return ['date' => $date->toDateString()];
        }

        return [
            'dateTime' => $date->toIso8601String(),
            'timeZone' => config('app.timezone', 'UTC'),
        ];
    }

    private function mapGoogleEvent(array $googleEvent): ?array
    {
        $startData = $googleEvent['start'] ?? [];
        $endData = $googleEvent['end'] ?? $startData;

        try {
            $isAllDay = isset($startData['date']) && ! isset($startData['dateTime']);
            $start = isset($startData['dateTime'])
                ? Carbon::parse($startData['dateTime'])
                : Carbon::parse($startData['date'] ?? Carbon::now()->toDateString());

            $end = isset($endData['dateTime'])
                ? Carbon::parse($endData['dateTime'])
                : Carbon::parse($endData['date'] ?? $start->copy()->addDay()->toDateString());

            return [
                'id' => $googleEvent['id'] ?? null,
                'title' => $googleEvent['summary'] ?? 'Untitled event',
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
                'allDay' => $isAllDay,
                'source' => 'google',
                'google_event_id' => $googleEvent['id'] ?? null,
                'description' => $googleEvent['description'] ?? null,
                'desc' => $googleEvent['description'] ?? null,
                'synced_at' => Carbon::now()->toIso8601String(),
                'local_id' => Arr::get($googleEvent, 'extendedProperties.private.local_id'),
                'htmlLink' => $googleEvent['htmlLink'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning('[GoogleCalendarService] Failed to map Google event', [
                'event' => $googleEvent,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function mergeEvents(Collection $local, Collection $remote): Collection
    {
        $remoteById = $remote->filter(fn ($event) => ! empty($event['google_event_id']))->keyBy('google_event_id');
        $merged = collect($remoteById->values()->all());

        $local->each(function ($event) use (&$merged, $remoteById) {
            $googleId = $event['google_event_id'] ?? null;
            if ($googleId && $remoteById->has($googleId)) {
                return;
            }

            $merged->push($event);
        });

        return $merged->unique(function ($event) {
            return $event['google_event_id'] ?? $event['id'];
        })->values();
    }
}
