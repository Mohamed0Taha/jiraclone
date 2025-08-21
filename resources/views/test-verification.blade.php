<!DOCTYPE html>
<html>
<head>
    <title>Email Verification Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .url { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; word-break: break-all; }
        .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #212529; }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>📧 Email Verification Test - TaskPilot</h1>
    
    <div class="section">
        <h2>🚀 Quick Development Solution</h2>
        <p><strong>Since SMTP is having issues, use these direct verification links:</strong></p>
        
        <a href="/dev-verify-user/10" class="btn btn-success">✅ Manually Verify User 10 (theaceitsme@yahoo.com)</a>
        <a href="/dev-verify-user/6" class="btn btn-success">✅ Manually Verify User 6 (taha.elfatih@gmail.com)</a>
        
        <p><em>These links work only in local development and will verify the user and log them in automatically.</em></p>
    </div>
    
    <div class="section">
        <h2>📨 Generated Verification URLs</h2>
        <p><strong>These URLs were successfully generated (but email sending is blocked by SMTP issues):</strong></p>
        
        <h3>User 10 - Latest Generated URL:</h3>
        <div class="url">
            <a href="http://localhost:8000/verify-email/10/d9acaf990c68b34df9b7d3bffb5ddc3f5eada2d0?expires=1755741227&signature=8db10136458b3182b1be19f07321f0375ae8658eb66ebe7470303a7d00517619">
                http://localhost:8000/verify-email/10/d9acaf990c68b34df9b7d3bffb5ddc3f5eada2d0?expires=1755741227&signature=8db10136458b3182b1be19f07321f0375ae8658eb66ebe7470303a7d00517619
            </a>
        </div>
        
        <a href="/dev-verify-user/10" class="btn btn-success">✅ Manually Verify User 10 (theaceitsme@yahoo.com)</a>
        
        <p><em>This URL should work with our signature validation fixes!</em></p>
    </div>
    
    <div class="section">
        <h2>🔧 Testing Tools</h2>
        <a href="/debug-email" class="btn">Debug Email URLs</a>
        <a href="/test-verify-url" class="btn">Generate New Verification Email</a>
        
        <h3>Artisan Commands:</h3>
        <div class="url">
            <code>php artisan test:email-verification 9</code> - Test URL generation<br>
            <code>php artisan test:send-email 9</code> - Test email sending
        </div>
    </div>
    
    <div class="section">
        <h2>🐛 SMTP Issue Diagnosis</h2>
        <p><strong>Current Issues Identified:</strong></p>
        <ul>
            <li>✅ Email templates generate correctly</li>
            <li>✅ Verification URLs are valid</li>
            <li>✅ Signature validation works</li>
            <li>❌ SMTP connection to Mailtrap is timing out</li>
        </ul>
        
        <h3>Possible Solutions:</h3>
        <ul>
            <li>Check firewall/network restrictions for SMTP port 2525</li>
            <li>Verify Mailtrap credentials in .env file</li>
            <li>Try different MAIL_ENCRYPTION settings (null, tls, ssl)</li>
            <li>Use log driver for development: <code>MAIL_MAILER=log</code></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>📊 Environment Info</h2>
        <p><strong>APP_URL:</strong> {{ config('app.url') }}</p>
        <p><strong>Environment:</strong> {{ app()->environment() }}</p>
        <p><strong>App Name:</strong> {{ config('app.name') }}</p>
        <p><strong>Mail Driver:</strong> {{ config('mail.default') }}</p>
        <p><strong>SMTP Host:</strong> {{ config('mail.mailers.smtp.host') }}</p>
        <p><strong>SMTP Port:</strong> {{ config('mail.mailers.smtp.port') }}</p>
    </div>
</body>
</html>
