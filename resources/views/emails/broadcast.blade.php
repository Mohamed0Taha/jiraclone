@php($plain = strip_tags($bodyMessage))
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $subject }}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif; background:#f8fafc; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <tr>
            <td style="padding:32px;">
                <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">Hello {{ $user->name }},</h1>
                <div style="font-size:14px; line-height:1.6; color:#374151;">
                    {!! nl2br(e($bodyMessage)) !!}
                </div>
                <p style="margin-top:32px; font-size:12px; color:#6b7280;">— The TaskPilot Team</p>
            </td>
        </tr>
    </table>
</body>
</html>
