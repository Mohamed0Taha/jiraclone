# Setting up Pusher for Real-time Updates

## 1. Get Pusher Credentials

1. Go to [pusher.com](https://pusher.com) and sign up/login
2. Create a new app
3. Copy your credentials from the "App Keys" tab

## 2. Update Heroku Environment Variables

Replace the placeholder values with your actual Pusher credentials:

```bash
heroku config:set \
  PUSHER_APP_ID=your_actual_app_id \
  PUSHER_APP_KEY=your_actual_app_key \
  PUSHER_APP_SECRET=your_actual_app_secret \
  PUSHER_APP_CLUSTER=your_cluster \
  BROADCAST_DRIVER=pusher \
  --app laravel-react-automation-app
```

## 3. Update Local Environment

Update your `.env` file with the same credentials:

```env
PUSHER_APP_ID=your_actual_app_id
PUSHER_APP_KEY=your_actual_app_key
PUSHER_APP_SECRET=your_actual_app_secret
PUSHER_APP_CLUSTER=your_cluster
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https

# Client-side (Vite) vars
VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

# Optional: explicitly set the WebSocket host if needed
# IMPORTANT: Use the websocket host, not the REST host.
# For hosted Pusher, use: ws-<cluster>.pusher.com (e.g. ws-eu.pusher.com)
VITE_PUSHER_WS_HOST=ws-eu.pusher.com

BROADCAST_DRIVER=pusher
```

Notes

- Do not set `VITE_PUSHER_HOST` to `api.pusherapp.com` on the client. That is the REST API host used by the server, not the WebSocket host. If you need to override the WS endpoint, use `VITE_PUSHER_WS_HOST` and point it to `ws-<cluster>.pusher.com`.

## 4. Test Real-time Features

Once configured, your collaborative components will support real-time updates when users on the same component make changes.

## Current Status

✅ App deployed successfully  
✅ Broadcasting infrastructure ready  
⏳ Waiting for Pusher credentials to enable real-time features
