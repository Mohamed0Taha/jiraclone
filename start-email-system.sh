#!/bin/bash

echo "🚀 TaskPilot Email Forwarding - Production Setup"
echo "================================================"
echo ""

echo "📋 Current Status:"

# Check if scheduler is running
SCHEDULER_COUNT=$(ps aux | grep 'schedule:work' | grep -v grep | wc -l)
if [ $SCHEDULER_COUNT -gt 0 ]; then
    echo "✅ Laravel Scheduler: RUNNING ($SCHEDULER_COUNT processes)"
else
    echo "❌ Laravel Scheduler: NOT RUNNING"
    echo ""
    echo "🔄 Starting Laravel Scheduler..."
    nohup php artisan schedule:work > storage/logs/scheduler.log 2>&1 &
    sleep 2
    echo "✅ Scheduler started in background"
fi

echo ""
echo "🧪 Testing Email System..."

# Test PrivateEmail connection
php artisan email:test-privateemail > /tmp/email_test.log 2>&1
if grep -q "Connection successful" /tmp/email_test.log; then
    echo "✅ PrivateEmail Connection: WORKING"
else
    echo "❌ PrivateEmail Connection: FAILED"
    echo "   Check logs: cat /tmp/email_test.log"
fi

# Check inbox
INBOX_OUTPUT=$(php artisan email:check-inbox 2>/dev/null)
UNREAD_COUNT=$(echo "$INBOX_OUTPUT" | grep "Unread messages:" | awk '{print $3}')
if [ ! -z "$UNREAD_COUNT" ]; then
    echo "✅ Inbox Access: WORKING"
    echo "📬 Unread emails: $UNREAD_COUNT"
else
    echo "❌ Inbox Access: CHECK NEEDED"
fi

echo ""
echo "⚙️ System Configuration:"
echo "📧 Email Source: support@taskpilot.us (PrivateEmail.com)"
echo "📨 Email Target: taha.elfatih@gmail.com"
echo "🔄 Check Frequency: Every 5 minutes automatically"
echo "📁 Logs Location: storage/logs/laravel.log"

echo ""
echo "🎯 AUTO-FORWARDING STATUS:"

SCHEDULER_ACTIVE=$(ps aux | grep 'schedule:work' | grep -v grep | wc -l)
if [ $SCHEDULER_ACTIVE -gt 0 ]; then
    echo "✅ FULLY OPERATIONAL!"
    echo ""
    echo "📧 What happens now:"
    echo "   1. Customer emails support@taskpilot.us"
    echo "   2. System checks inbox every 5 minutes"
    echo "   3. New emails automatically forwarded to Gmail"
    echo "   4. You receive them with full context"
    echo ""
    echo "🔄 Monitoring:"
    echo "   • Watch system: php artisan email:monitor --watch"
    echo "   • Check status: php artisan email:monitor"
    echo "   • Manual check: php artisan email:fetch-support"
    echo ""
    echo "🎉 Your email forwarding system is LIVE and ready!"
else
    echo "❌ SCHEDULER NOT RUNNING"
    echo "   Run: nohup php artisan schedule:work > storage/logs/scheduler.log 2>&1 &"
fi

echo ""
echo "📋 Quick Commands:"
echo "   php artisan email:monitor           # Check system status"
echo "   php artisan email:check-inbox       # Check for new emails"
echo "   php artisan email:fetch-support     # Manual process emails"
echo "   tail -f storage/logs/laravel.log    # Watch logs"

echo ""
echo "🎉 Setup complete! System is monitoring support@taskpilot.us"
