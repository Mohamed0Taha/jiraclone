#!/bin/bash

# Email Forwarding Script for TaskPilot
# Usage: ./forward-email.sh "sender@example.com" "Subject" "Content"

FROM_EMAIL="$1"
SUBJECT="$2"
CONTENT="$3"
TO_EMAIL="taha.elfatih@gmail.com"

if [ -z "$FROM_EMAIL" ] || [ -z "$SUBJECT" ] || [ -z "$CONTENT" ]; then
    echo "Usage: $0 <from_email> <subject> <content>"
    echo "Example: $0 'user@example.com' 'Help Request' 'I need help with...'"
    exit 1
fi

echo "🔄 Forwarding email from: $FROM_EMAIL"
echo "📧 Subject: $SUBJECT"
echo "📬 To: $TO_EMAIL"

# Use Laravel Artisan command
php artisan email:forward "$FROM_EMAIL" "$SUBJECT" "$CONTENT" --to="$TO_EMAIL"

if [ $? -eq 0 ]; then
    echo "✅ Email forwarded successfully!"
else
    echo "❌ Failed to forward email"
    exit 1
fi
