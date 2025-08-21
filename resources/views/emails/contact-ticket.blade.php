<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskPilot Support Ticket</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .content {
            padding: 30px;
        }
        .info-section {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .label {
            font-weight: 600;
            color: #4b5563;
        }
        .value {
            color: #1f2937;
        }
        .message-section {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .message-section h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 18px;
        }
        .message-content {
            white-space: pre-line;
            line-height: 1.7;
            color: #374151;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .topic-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 TaskPilot Support Ticket</h1>
            <div class="topic-badge">{{ $topicLabel }}</div>
        </div>
        
        <div class="content">
            <div class="info-section">
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">User Information</h3>
                <div class="info-row">
                    <span class="label">Name:</span>
                    <span class="value">{{ $user->name }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Email:</span>
                    <span class="value">{{ $user->email }}</span>
                </div>
                <div class="info-row">
                    <span class="label">User ID:</span>
                    <span class="value">#{{ $user->id }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Submitted:</span>
                    <span class="value">{{ $submittedAt }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Topic:</span>
                    <span class="value">{{ $topicLabel }}</span>
                </div>
            </div>

            <div class="message-section">
                <h3>Message</h3>
                <div class="message-content">{{ $message }}</div>
            </div>
        </div>

        <div class="footer">
            <p>This ticket was submitted through the TaskPilot contact form.<br>
            You can reply directly to this email to respond to the user.</p>
        </div>
    </div>
</body>
</html>
