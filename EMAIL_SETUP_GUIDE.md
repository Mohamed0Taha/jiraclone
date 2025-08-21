# TaskPilot Email Setup Guide

## Current Configuration Status

✅ SMTP Driver: Enabled  
✅ Configuration: Gmail SMTP  
✅ From Address: noreply@taskpilot.us  
✅ From Name: TaskPilot

## Next Steps to Get Emails Working

### Option A: Gmail SMTP (Production-like, Recommended)

1. **Set up Gmail App Password:**
    - Go to your Gmail account settings
    - Enable 2-Factor Authentication if not already enabled
    - Go to "App passwords" in security settings
    - Generate a new app password for "Mail"
    - Copy the 16-character password

2. **Update .env file:**
   Replace `your_gmail_app_password_here` in your .env file with the actual app password:

    ```
    MAIL_PASSWORD=abcd efgh ijkl mnop
    ```

3. **Important**: Make sure `noreply@taskpilot.us` is either:
    - Your actual Gmail address, OR
    - An alias/send-as address configured in your Gmail

### Option B: Mailtrap (Easy Testing)

1. **Sign up at mailtrap.io** (free)
2. **Get SMTP credentials** from your inbox
3. **Update .env file:**
    ```
    MAIL_HOST=live.smtp.mailtrap.io
    MAIL_PORT=587
    MAIL_USERNAME=api
    MAIL_PASSWORD=your_mailtrap_api_key
    MAIL_ENCRYPTION=tls
    MAIL_FROM_ADDRESS=noreply@taskpilot.us
    ```

### Option C: SendGrid (Professional)

1. **Sign up at sendgrid.com**
2. **Create API key**
3. **Update .env file:**
    ```
    MAIL_HOST=smtp.sendgrid.net
    MAIL_PORT=587
    MAIL_USERNAME=apikey
    MAIL_PASSWORD=your_sendgrid_api_key
    MAIL_ENCRYPTION=tls
    ```

## Testing Your Setup

After updating your credentials, run:

```bash
php artisan config:clear
```

Then visit these test URLs:

- http://localhost:8000/test-email-production
- http://localhost:8000/test-verification-email

## Troubleshooting

### Gmail "Less secure app access"

- Gmail requires App Passwords (16-character codes)
- Regular passwords won't work for SMTP

### "Authentication failed" errors

- Double-check your username/password
- Ensure 2FA is enabled for Gmail
- Make sure you're using an App Password, not your regular password

### "Connection refused" errors

- Check your firewall settings
- Verify SMTP host and port are correct
- Try using port 465 with ssl encryption instead of 587 with tls

## Current Mail Configuration

You can check your current config anytime with:

```bash
php artisan tinker --execute="dump(config('mail.mailers.smtp'));"
```
