<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Clearing Cookies - Please Wait</title>
    <style>
        body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
            margin: 1rem;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .details {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            font-size: 0.9rem;
            color: #666;
        }
        .countdown {
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>🍪 Clearing Oversized Cookies</h1>
        <p>Your browser cookies were too large and caused a server error.</p>
        <p>We're clearing them now to fix the issue.</p>
        
        <div class="details">
            <strong>Header Size:</strong> {{ $headerSize }} bytes<br>
            <strong>Server Limit:</strong> ~4KB<br>
            <strong>Status:</strong> Clearing cookies and refreshing...
        </div>
        
        <p class="countdown">Redirecting in <span id="countdown">3</span> seconds...</p>
        <p><small>If this page doesn't redirect automatically, <a href="{{ $redirectUrl }}" id="manual-link">click here</a>.</small></p>
    </div>

    <script>
        // Clear all cookies on the client side too
        function clearAllCookies() {
            const cookies = document.cookie.split(';');
            const domain = window.location.hostname;
            
            cookies.forEach(cookie => {
                const [name] = cookie.trim().split('=');
                if (name) {
                    // Clear with all possible domain/path combinations
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
                }
            });
        }
        
        // Clear cookies immediately
        clearAllCookies();
        
        // Countdown and redirect
        let countdown = 3;
        const countdownElement = document.getElementById('countdown');
        const redirectUrl = '{{ $redirectUrl }}';
        
        const timer = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                // Clear cookies one more time before redirect
                clearAllCookies();
                window.location.href = redirectUrl;
            }
        }, 1000);
        
        // Also set up manual link
        document.getElementById('manual-link').onclick = function(e) {
            e.preventDefault();
            clearAllCookies();
            window.location.href = redirectUrl;
        };
    </script>
</body>
</html>
