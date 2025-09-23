# TaskPilot – Realtime Setup (Pusher)

This project uses Pusher Channels for realtime collaboration in custom views and micro‑apps.

## Prerequisites

- PHP/Laravel app running (local or server)
- Vite dev server (for local dev) or built assets
- Valid Pusher Channels credentials

## Server configuration (.env)

Set your broadcasting driver and Pusher credentials:

```env
# Broadcasting
BROADCAST_CONNECTION=pusher
# or
BROADCAST_DRIVER=pusher

# Pusher credentials
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=eu
PUSHER_SCHEME=https
PUSHER_PORT=443
# Optional REST override (usually not required)
# PUSHER_HOST=api-eu.pusher.com
```

## Client configuration (.env)

Expose the necessary Pusher vars to the browser (Vite):

```env
VITE_PUSHER_APP_KEY=${PUSHER_APP_KEY}
VITE_PUSHER_APP_CLUSTER=${PUSHER_APP_CLUSTER}
# Optional: override WS host (use the websocket host, not REST)
# VITE_PUSHER_WS_HOST=ws-eu.pusher.com
```

After editing .env:

- php artisan config:clear
- npm run dev (or restart Vite) to reload VITE_ vars

## What the app listens to

- Channel: `private-custom-view.{projectId}.{viewName}`
- Event alias: `custom-view-data-updated`
- Server event: `App\Events\CustomViewDataUpdated`
- Channel authorization: `routes/channels.php` allows users who can `view` the project.

Relevant files:

- Client subscription (Custom View page):
  - `resources/js/Pages/Tasks/CustomView.jsx`
- Shared data hook for micro‑apps:
  - `resources/js/microapps/useSharedViewData.js`
- Pusher singleton:
  - `resources/js/services/PusherService.js`
- Axios interceptor attaches `X-Socket-Id` so backend can `->toOthers()`:
  - `resources/js/bootstrap.js`
- Backend event & payload:
  - `app/Events/CustomViewDataUpdated.php`

## Quick E2E test

1) Open the Custom View page so the client subscribes:

- URL pattern: `/projects/{project}/custom-views/{name}`
- This renders `CustomView.jsx`, which subscribes to `private-custom-view.{projectId}.{viewName}` and binds `custom-view-data-updated`.

2) In another tab (same auth user), call the temporary test route:

- GET `/projects/{project}/custom-views/test-realtime?view_name={name}`
- Example: `/projects/1/custom-views/test-realtime?view_name=default`

Expected result:

- You should see a small progress update toast (analysis – completed) in the subscribed Custom View tab.
- The test route responds with JSON confirming the broadcast.

Notes:

- The test route is temporary and lives in `routes/web.php` under the authenticated project prefix: `custom-views.test-realtime`.
- Remove it when you’re done testing.

## Behavior of own-echo vs others

- We use `broadcast(...)->toOthers()` for component saves/deletes and shared data updates. Your own tab won’t receive echoes of your request.
- Workflow progress events are intentionally NOT `toOthers()` so the generating user sees step updates.
- The client includes `X-Socket-Id` on every request (axios and fetch wrapper) to make `toOthers()` work correctly.

## Troubleshooting

- 403 on `/broadcasting/auth`:
  - Ensure you are authenticated and authorized to `view` the project (see `routes/channels.php`).
  - Confirm `Broadcast::routes()` is inside the `auth` group (see `routes/web.php`).

- No events received:
  - Check `.env` server and client vars; ensure `BROADCAST_CONNECTION=pusher`.
  - Verify Pusher app key/cluster are correct.
  - Open browser devtools > Network > `broadcasting/auth` should be 200.
  - See console logs from `[PusherService]` and ensure a socket ID is assigned.

- Wrong host configured:
  - Do not set REST hosts (like `api.pusherapp.com`) as WS hosts. If you need to override, use `VITE_PUSHER_WS_HOST=ws-<cluster>.pusher.com`.

## Additional docs

- `setup-pusher.md` (deeper guide and Heroku notes)
