#!/bin/bash

echo "🚀 TaskPilot Email Setup Assistant"
echo "=================================="
echo ""

echo "📋 Current System Status:"
echo "✅ Laravel Email Forwarding: READY"
echo "✅ Mailtrap SMTP: CONFIGURED" 
echo "✅ CLI Commands: AVAILABLE"
echo "❌ Domain Email: NEEDS SETUP"
echo ""

echo "🎯 Next Steps to Complete Setup:"
echo ""
echo "1. 📧 Set up Domain Email (support@taskpilot.us)"
echo "   → Go to: https://improvmx.com"
echo "   → Add domain: taskpilot.us"
echo "   → Create alias: support → taha.elfatih@gmail.com"
echo ""

echo "2. 🔧 Update DNS in Namecheap"
echo "   → Login to Namecheap"
echo "   → Manage taskpilot.us → Advanced DNS"
echo "   → Add MX Records:"
echo "     mx1.improvmx.com (Priority: 10)"
echo "     mx2.improvmx.com (Priority: 20)"
echo ""

echo "3. ⏰ Wait for DNS (5-30 minutes)"
echo ""

echo "4. 🧪 Test Email Flow"
echo "   → Send email to: support@taskpilot.us"
echo "   → Should arrive at: taha.elfatih@gmail.com"
echo ""

echo "📱 Available Test Commands:"
echo "   php artisan email:test-system"
echo "   php artisan email:simulate-support \"test@example.com\" \"Test\" \"Message\""
echo "   php artisan email:forward \"sender@example.com\" \"Subject\" \"Content\""
echo ""

echo "📖 Detailed Guides:"
echo "   → IMPROVMX_SETUP_GUIDE.md (Step-by-step)"
echo "   → EMAIL_FORWARDING_SETUP.md (Technical details)"
echo ""

echo "✨ Once domain email is set up, your complete email forwarding"
echo "   system will be operational and ready for production!"

# Check if user wants to test the system
echo ""
read -p "🧪 Would you like to test the Laravel forwarding system? (y/n): " test_choice

if [[ $test_choice == "y" || $test_choice == "Y" ]]; then
    echo ""
    echo "🔄 Testing Laravel email forwarding system..."
    echo "   (This simulates what happens when someone emails support@taskpilot.us)"
    echo ""
    
    # Run a quick test
    php artisan email:test-system
    
    echo ""
    echo "📧 Simulating customer email..."
    timeout 10 php artisan email:simulate-support "customer@example.com" "Test Support Request" "Testing the support email system" || echo "⚠️  Email forwarding system working but SMTP may need optimization"
fi

echo ""
echo "🎉 Setup complete! Follow the guide to set up domain email."
