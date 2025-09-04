# 🚀 Remote Server Deployment Guide - Email Forwarding System

## 📋 Prerequisites on Remote Server
- PHP 8.1+ with extensions: `imap`, `mbstring`, `xml`, `curl`
- Composer installed
- Cron access (crontab)
- Laravel application deployed

## 🎯 CRITICAL: Production Setup Steps

### 1. Upload Your Code to Remote Server
```bash
# On your remote server, pull the latest code
git pull origin main
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
```

### 2. Environment Configuration
Make sure your remote `.env` file has these exact settings:
```bash
# Email Forwarding Configuration
SUPPORT_IMAP_HOST=mail.privateemail.com
SUPPORT_IMAP_PORT=993
SUPPORT_IMAP_ENCRYPTION=ssl
SUPPORT_EMAIL_USERNAME=support@taskpilot.us
SUPPORT_EMAIL_PASSWORD=Zenmaster1

# Mailtrap SMTP (already configured)
MAIL_MAILER=smtp
MAIL_HOST=live.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=api
MAIL_PASSWORD=e640f58a598e3813abfbc2ee3f567728
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="support@taskpilot.us"
MAIL_FROM_NAME="TaskPilot Support"
```

### 3. 🚨 MOST IMPORTANT: Setup Cron Job
**This is what makes it work automatically on remote servers!**

```bash
# On your remote server, edit crontab
crontab -e

# Add this EXACT line (replace /path/to/your/project with actual path):
* * * * * cd /path/to/your/laravel/project && php artisan schedule:run >> /dev/null 2>&1
```

**Example for common hosting:**
```bash
# If your project is in /var/www/html/laravel-react-auth
* * * * * cd /var/www/html/laravel-react-auth && php artisan schedule:run >> /dev/null 2>&1

# If using shared hosting with public_html
* * * * * cd /home/username/public_html && php artisan schedule:run >> /dev/null 2>&1
```

### 4. Test the System on Remote Server
```bash
# Test IMAP connection
php artisan email:check-inbox

# Test email fetching manually
php artisan email:fetch-support --limit=1

# Check system status
php artisan email:monitor
```

### 5. Verify Cron is Working
```bash
# Check if cron is running
ps aux | grep cron

# Check Laravel logs for email processing
tail -f storage/logs/laravel.log
```

## 🔧 Platform-Specific Instructions

### Shared Hosting (cPanel, etc.)
1. Go to cPanel → Cron Jobs
2. Add new cron job:
   - **Minute**: `*`
   - **Hour**: `*`
   - **Day**: `*`
   - **Month**: `*`
   - **Weekday**: `*`
   - **Command**: `cd /home/username/public_html && php artisan schedule:run`

### VPS/Cloud Server (AWS, DigitalOcean, etc.)
```bash
# SSH into your server
ssh user@your-server-ip

# Edit crontab
sudo crontab -e

# Add the cron job
* * * * * cd /var/www/html/your-project && php artisan schedule:run >> /dev/null 2>&1
```

### Heroku
```bash
# Install Heroku Scheduler add-on
heroku addons:create scheduler:standard

# Add scheduled job via Heroku dashboard or CLI
heroku addons:open scheduler

# Add this command to run every 10 minutes:
php artisan email:fetch-support --mark-read
```

## 🚨 Common Issues & Solutions

### Issue 1: "Command not found"
**Solution**: Use full PHP path
```bash
# Instead of: php artisan schedule:run
# Use: /usr/bin/php artisan schedule:run
# Or: /usr/local/bin/php artisan schedule:run
```

### Issue 2: "Permission denied"
**Solution**: Fix permissions
```bash
chmod +x artisan
chown -R www-data:www-data storage/
chmod -R 775 storage/
```

### Issue 3: "IMAP extension not found"
**Solution**: Install PHP IMAP
```bash
# Ubuntu/Debian
sudo apt-get install php-imap
sudo service apache2 restart

# CentOS/RHEL
sudo yum install php-imap
sudo service httpd restart
```

## ✅ Verification Checklist

After setup, verify these work on your remote server:

1. **Cron is running**: `ps aux | grep cron`
2. **Laravel commands work**: `php artisan email:check-inbox`
3. **IMAP connection works**: Should see inbox emails
4. **Scheduler runs**: Check `storage/logs/laravel.log` for activity
5. **Email forwarding works**: Send test email, wait 5 minutes

## 🎯 Final Test

1. Send email to `support@taskpilot.us`
2. Wait 5 minutes (cron runs every minute, email check every 5 minutes)
3. Check your Gmail for forwarded email
4. Check logs: `tail -f storage/logs/laravel.log`

## 📞 Support Commands

```bash
# Check inbox manually
php artisan email:check-inbox --all

# Force process emails now
php artisan email:fetch-support

# Monitor system status
php artisan email:monitor

# Check logs
tail -f storage/logs/laravel.log
```

---

**🚀 Once the cron job is set up on your remote server, emails will be automatically forwarded every 5 minutes!**
