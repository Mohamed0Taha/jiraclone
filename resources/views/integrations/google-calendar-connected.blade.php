<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Google Calendar Connected</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.35);
            border-radius: 16px;
            padding: 24px 28px;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 24px 48px rgba(2, 6, 23, 0.45);
        }
        h1 {
            font-size: 1.4rem;
            margin-bottom: 12px;
        }
        p {
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 18px;
        }
        button {
            background: linear-gradient(135deg, #60a5fa, #2563eb);
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 10px 26px;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover {
            opacity: 0.92;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Google Calendar Connected</h1>
        <p>Your Google Calendar is now linked. You can return to TaskPilot and run the sync again.</p>
        <button type="button" onclick="window.close();">Close Window</button>
    </div>
    <script>
        if (window.opener) {
            window.opener.postMessage({ type: 'google-calendar-connected' }, '*');
        }
        // Auto-close the popup shortly after notifying the opener.
        // Keep the Close button as a fallback in case browsers block self-close.
        setTimeout(() => {
            try { window.close(); } catch (e) {}
        }, 400);
    </script>
</body>
</html>

