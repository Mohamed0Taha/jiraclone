#!/bin/bash

# TaskPilot Email Forwarding Script
# Usage: ./forward-email.sh "from@example.com" "Subject" "Email content"

FROM_EMAIL="$1"
SUBJECT="$2"
CONTENT="$3"
TO_EMAIL="taha.elfatih@gmail.com"
MAILTRAP_TOKEN="e640f58a598e3813abfbc2ee3f567728"

# Create the email payload
EMAIL_DATA=$(cat <<EOF
{
  "from": {
    "email": "support@taskpilot.us",
    "name": "TaskPilot Support"
  },
  "to": [
    {
      "email": "$TO_EMAIL",
      "name": "Taha Elfatih"
    }
  ],
  "subject": "[FORWARDED] $SUBJECT",
  "text": "FORWARDED EMAIL\n\nOriginal Subject: $SUBJECT\nOriginal From: $FROM_EMAIL\nForwarded: $(date)\n\n---\n\n$CONTENT",
  "headers": {
    "X-Original-From": "$FROM_EMAIL",
    "X-Forwarded-By": "TaskPilot Email Forwarder"
  }
}
EOF
)

echo "🚀 Forwarding email via Mailtrap API..."
echo "From: $FROM_EMAIL"
echo "Subject: $SUBJECT"
echo "To: $TO_EMAIL"
echo ""

# Send via Mailtrap API
RESPONSE=$(curl -s -X POST \
  "https://send.api.mailtrap.io/api/send" \
  -H "Authorization: Bearer $MAILTRAP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$EMAIL_DATA")

echo "API Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Email forwarded successfully!"
    echo "Check your Gmail inbox at $TO_EMAIL"
else
    echo ""
    echo "❌ Failed to forward email"
    echo "Response: $RESPONSE"
fi
