<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Certificate Verification</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f3f4f6; margin:0; padding:40px; }
        .card { max-width:760px; margin:0 auto; background:white; padding:40px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.08); }
        h1 { margin-top:0; font-size:28px; color:#111827; }
        .not-found { color:#b91c1c; background:#fee2e2; padding:16px; border-radius:8px; }
        .success { color:#065f46; background:#d1fae5; padding:16px; border-radius:8px; }
        .meta { margin-top:24px; display:grid; grid-template-columns: 1fr 1fr; gap:18px; }
        .meta div { background:#f9fafb; padding:16px; border-radius:10px; }
        .label { font-size:12px; letter-spacing:0.05em; text-transform:uppercase; color:#6b7280; }
        .value { font-size:16px; font-weight:600; color:#111827; margin-top:4px; word-break:break-all; }
        .actions { margin-top:32px; display:flex; gap:16px; flex-wrap:wrap; }
        a.button { text-decoration:none; background:#4f46e5; color:white; padding:12px 20px; border-radius:8px; font-weight:600; transition:background .2s; }
        a.button:hover { background:#4338ca; }
        a.secondary { background:#e5e7eb; color:#111827; }
        a.secondary:hover { background:#d1d5db; }
        .share { margin-top:32px; }
        .share button { background:#0077b5; color:white; border:none; padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:600; }
        .share button:hover { background:#065e85; }
        .footer { margin-top:40px; font-size:12px; color:#6b7280; text-align:center; }
        @media(max-width:640px){ .meta { grid-template-columns:1fr; } }
    </style>
</head>
<body>
    <div class="card">
        <h1>TaskPilot Certification Verification</h1>
        @if(!$found)
            <div class="not-found">Certificate with ID <strong>{{ $serial }}</strong> was not found. Please check the ID and try again.</div>
        @else
            <div class="success">Certificate ID <strong>{{ $serial }}</strong> is valid and was issued to <strong>{{ $user->name }}</strong>.</div>
            <div class="meta">
                <div>
                    <div class="label">Participant</div>
                    <div class="value">{{ $user->name }}<br><span style="font-weight:400; font-size:13px; color:#6b7280;">{{ $user->email }}</span></div>
                </div>
                <div>
                    <div class="label">Issued Date</div>
                    <div class="value">{{ $issued_date }}</div>
                </div>
                <div>
                    <div class="label">Score</div>
                    <div class="value">{{ $attempt->total_score }} / {{ $attempt->max_possible_score }} ({{ round($attempt->percentage,2) }}%)</div>
                </div>
                <div>
                    <div class="label">Status</div>
                    <div class="value">{{ $attempt->passed ? 'Passed' : 'Did Not Pass' }}</div>
                </div>
            </div>
            <div class="actions">
                <a class="button" href="/certification/certificate" target="_blank">View Certificate</a>
                <a class="button" href="/certification/badge" target="_blank">View Badge</a>
                <a class="button secondary" href="/certification">Certification Home</a>
            </div>
            <div class="share">
                <button onclick="shareLinkedIn()">Share on LinkedIn</button>
            </div>
        @endif
        <div class="footer">TaskPilot Certification Authority &middot; Generated {{ now()->format('Y-m-d H:i') }} UTC</div>
    </div>
    <script>
    function shareLinkedIn(){
        const url = encodeURIComponent(window.location.href);
        const summary = encodeURIComponent('Proud to have earned my TaskPilot Project Management Certification! Verified credential: ' + window.location.href);
        window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url + '&summary=' + summary,'_blank','width=600,height=600');
    }
    </script>
</body>
</html>
