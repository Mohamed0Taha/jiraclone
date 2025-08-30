<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TaskPilot Project Management Certification Badge - {{ $user->name }}</title>
    
    <!-- Open Graph metadata for social sharing -->
    <meta property="og:title" content="TaskPilot Project Management Badge - {{ $user->name }}" />
    <meta property="og:description" content="Digital badge for Professional Project Management Certification ({{ $percentage }}% score)" />
    <meta property="og:image" content="{{ $ogImageUrl ?? '' }}" />
    <meta property="og:image:width" content="630" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="{{ $site ?? '' }}/certificates/{{ $attempt->serial }}/badge" />
    <meta property="og:type" content="website" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="TaskPilot Project Management Badge - {{ $user->name }}" />
    <meta name="twitter:description" content="Digital badge for Professional Project Management Certification ({{ $percentage }}% score)" />
    <meta name="twitter:image" content="{{ $ogImageUrl ?? '' }}" />

    <!-- LinkedIn specific -->
    <meta property="article:author" content="{{ $user->name }}" />
    
    <style>
        body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141414;font-family:'Segoe UI',Arial,sans-serif;padding:24px}
        .badge{--gold1:#d4af37;--gold2:#b88a1a;--gold3:#f2e6b0;--goldShadow:#5c4510;width:360px;height:360px;border-radius:50%;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#3a2b08;font-weight:600;letter-spacing:.5px;background:radial-gradient(circle at 30% 30%,#fff8e3,#f0d890 55%,#d4af37 72%,#b3861a 90%);box-shadow:0 18px 42px -12px rgba(0,0,0,.55),inset 4px 4px 8px rgba(255,250,210,.6),inset -8px -10px 18px rgba(92,69,16,.55);overflow:hidden;border:10px solid #c9a23a}
        .badge:before,.badge:after{content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none}
        .badge:before{background:repeating-conic-gradient(from 0deg,var(--gold1) 0deg,var(--gold2) 6deg,var(--gold1) 12deg);mix-blend-mode:overlay;opacity:.18;animation:spin 22s linear infinite}
        .badge:after{inset:12px;background:radial-gradient(circle at 30% 30%,#fff8ef,#f6e7c2 60%,#e8c971 78%,#d1a63d 92%);box-shadow:0 0 0 6px rgba(255,255,255,.25) inset,0 0 0 9px rgba(0,0,0,.08) inset}
        @keyframes spin{to{transform:rotate(360deg)}}
        .rings{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#0000 64%,rgba(255,255,255,.32) 66%,#0000 69%),radial-gradient(circle,#0000 74%,rgba(0,0,0,.25) 76%,#0000 79%)}
        .crest{position:relative;z-index:2;font-family:'Playfair Display',serif;font-size:64px;font-weight:800;text-shadow:0 2px 4px rgba(255,255,255,.5),0 -3px 6px rgba(120,80,10,.45)}
        .crest small{display:block;font-size:13px;letter-spacing:3px;margin-top:2px;font-weight:700}
        .title{position:relative;z-index:2;margin-top:10px;font-size:17px;line-height:1.3;text-transform:uppercase;max-width:240px;font-weight:700;letter-spacing:1px;text-shadow:0 1px 0 #fff8,0 -1px 0 #a07412}
        .recipient{position:relative;z-index:2;font-size:18px;margin-top:18px;font-weight:600;max-width:240px;line-height:1.2}
        .score{position:relative;z-index:2;font-size:32px;margin-top:16px;font-weight:800;color:#215e27;text-shadow:0 1px 2px #fff6,0 -1px 2px #2d4e12}
        .date{position:relative;z-index:2;font-size:11px;margin-top:10px;color:#5d4a12;font-weight:600;letter-spacing:1px}
        .verification {
            background: white;
            padding: 20px;
            margin-top: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 300px;
        }
        .verification h3 {
            margin: 0 0 10px 0;
            color: #1f2937;
            font-size: 16px;
        }
        .verification p {
            margin: 5px 0;
            color: #6B7280;
            font-size: 12px;
        }
        .print-instructions {
            margin-top: 20px;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            color: white;
            font-size: 12px;
            text-align: center;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .print-instructions {
                display: none;
            }
        }
    </style>
</head>
<body data-base-url="{{ rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/') }}">
    <div>
        <div class="badge" id="badgeCapture">
            <div class="rings"></div>
            <div class="crest">TP<small>CERT</small></div>
            <div class="title">Project Management Certification</div>
            <div class="recipient">{{ $user->name }}</div>
            <div class="score">{{ $percentage }}%</div>
            <div class="date">{{ $issued_date }}</div>
        </div>
        
        <div class="verification">
            <h3>Digital Badge Verification</h3>
            <p><strong>Certificate ID:</strong> {{ $attempt->id }}-{{ str_pad($user->id, 6, '0', STR_PAD_LEFT) }}</p>
            <p><strong>Issued By:</strong> TaskPilot</p>
            <p><strong>Issue Date:</strong> {{ $issued_date }}</p>
            <p><strong>Score:</strong> {{ $percentage }}% ({{ $attempt->total_score }}/{{ $attempt->max_possible_score }} points)</p>
            <p><strong>Verification URL:</strong><br>{{ (config('app.url') ?: request()->getSchemeAndHttpHost()) }}/certificates/{{ $attempt->serial }}</p>
            
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="viewCertificate()" style="
                    background: #28a745; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 6px; 
                    font-size: 16px; 
                    cursor: pointer; 
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(40,167,69,0.3);
                    transition: all 0.3s;
                    margin-right: 10px;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                    🎓 View Certificate
                </button>
                <button onclick="shareOnLinkedIn()" style="
                    background: #0077b5; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 6px; 
                    font-size: 16px; 
                    cursor: pointer; 
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,119,181,0.3);
                    transition: all 0.3s;
                " onmouseover="this.style.background='#005885'" onmouseout="this.style.background='#0077b5'">
                    📱 Share on LinkedIn
                </button>
            </div>
        </div>
        
        <div class="print-instructions">
            <strong>Instructions:</strong><br>
            • Right-click and "Save Image As" to save the badge<br>
            • Print this page to get a physical copy<br>
            • Use Ctrl/Cmd+P to print or save as PDF<br>
            • Share on LinkedIn using the button above
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" integrity="sha256-6H5VB5QyLldKH9oMFUmjxw2uWpPZETQXpCkBaDjquMs=" crossorigin="anonymous"></script>
        <script>
        function viewCertificate() {
            window.location.href = '{{ url("/certificates/" . $attempt->serial) }}';
        }
        
        let badgeDataUrl=null;
        async function captureBadge(){
            if(badgeDataUrl) return badgeDataUrl;
            const el=document.querySelector('.badge');
            const canvas=await html2canvas(el,{backgroundColor:'#ffffff',scale:3});
            badgeDataUrl=canvas.toDataURL('image/png');
            return badgeDataUrl;
        }
        async function shareOnLinkedIn() {
            await captureBadge();
            const base = document.body.getAttribute('data-base-url');
            const publicCert=`${base}/certificates/{{ $attempt->serial }}`;
            const text=`Earned the TaskPilot Project Management Certification (Score: {{ $percentage }}%). ${publicCert} #TaskPilot #ProjectManagement #Certification`;
            
            // Create download link for badge
            const a = document.createElement('a');
            a.href = badgeDataUrl;
            a.download = 'taskpilot-badge-{{ $attempt->serial }}.png';
            a.click();
            
            try { await navigator.clipboard.writeText(text); } catch(e) {}
            
            setTimeout(() => {
                const shareUrl=encodeURIComponent(publicCert);
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,'_blank','width=640,height=640');
                alert('Badge image downloaded! Upload it manually to your LinkedIn post. Share text copied to clipboard.');
            }, 500);
        }
        </script>
    </div>
</body>
</html>
