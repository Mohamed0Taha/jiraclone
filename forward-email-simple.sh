#!/bin/bash

# TaskPilot Email Forwarding Script
# Usage: ./forward-email-simple.sh "from@example.com" "Subject" "Content"

FROM_EMAIL="$1"
SUBJECT="$2"
CONTENT="$3"
TO_EMAIL="taha.elfatih@gmail.com"

if [ -z "$FROM_EMAIL" ] || [ -z "$SUBJECT" ] || [ -z "$CONTENT" ]; then
    echo "Usage: $0 \"from@example.com\" \"Subject\" \"Content\""
    exit 1
fi

echo "📧 Forwarding email to $TO_EMAIL"
echo "From: $FROM_EMAIL"
echo "Subject: $SUBJECT"
echo ""

# Create temporary email content
TEMP_FILE="/tmp/email_forward_$$"
cat > "$TEMP_FILE" << EOF
From: TaskPilot Support <support@taskpilot.us>
To: $TO_EMAIL
Subject: [FORWARDED] $SUBJECT
Content-Type: text/plain; charset=UTF-8

--- FORWARDED EMAIL ---

Original From: $FROM_EMAIL
Original Subject: $SUBJECT
Forwarded At: $(date)

--- ORIGINAL MESSAGE ---

$CONTENT

--- END OF FORWARDED EMAIL ---

This email was automatically forwarded from support@taskpilot.us
EOF

# Send using curl and Mailtrap SMTP
echo "Sending via SMTP..."
curl -s --url "smtps://live.smtp.mailtrap.io:587" \
     --ssl-reqd \
     --mail-from "support@taskpilot.us" \
     --mail-rcpt "$TO_EMAIL" \
     --user "api:e640f58a598e3813abfbc2ee3f567728" \
     --upload-file "$TEMP_FILE"

CURL_EXIT_CODE=$?

# Clean up
rm -f "$TEMP_FILE"

if [ $CURL_EXIT_CODE -eq 0 ]; then
    echo "✅ Email forwarded successfully!"
    exit 0
else
    echo "❌ Failed to forward email (exit code: $CURL_EXIT_CODE)"
    exit 1
fi
