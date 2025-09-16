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
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=your_cluster

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_HOST="${PUSHER_HOST}"
VITE_PUSHER_PORT="${PUSHER_PORT}"
VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

BROADCAST_DRIVER=pusher
```

## 4. Test Real-time Features

Once configured, your collaborative components will support real-time updates when users on the same component make changes.

## Current Status

✅ App deployed successfully  
✅ Broadcasting infrastructure ready  
⏳ Waiting for Pusher credentials to enable real-time features