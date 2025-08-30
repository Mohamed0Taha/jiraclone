<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $attempt->user->name }} - Project Management Certificate</title>
    
    <!-- Open Graph metadata -->
        <meta property="og:title" content="Project Management Professional Certificate - {{ $attempt->user->name }}">
        <meta property="og:description" content="Verified certification in Project Management with score {{ number_format($percentage ?? ($attempt->percentage ?? 0), 1) }}% - Completed on {{ optional($attempt->completed_at)->format('F j, Y') }}">
        <meta property="og:image" content="{{ $ogImageUrl ?? url('/certificates/' . $attempt->serial . '/download/og-image') }}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
        <meta property="og:url" content="{{ url('/certificates/' . $attempt->serial) }}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Project Management Professional Certificate - {{ $attempt->user->name }}">
        <meta name="twitter:description" content="Verified certification in Project Management with score {{ number_format($percentage ?? ($attempt->percentage ?? 0), 1) }}% - Completed on {{ optional($attempt->completed_at)->format('F j, Y') }}">
        <meta name="twitter:image" content="{{ $ogImageUrl ?? url('/certificates/' . $attempt->serial . '/download/og-image') }}">

    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Libre+Baskerville:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Libre Baskerville', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .certificate-container {
            max-width: 1000px;
            width: 100%;
            margin: 0 auto;
        }
        
        .certificate {
            background: #ffffff;
            border: 20px solid #2c3e50;
            border-image: linear-gradient(45deg, #c9b037, #b8860b, #daa520) 1;
            padding: 60px;
            text-align: center;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
            position: relative;
            background-image: 
                radial-gradient(circle at 50% 50%, rgba(201, 176, 55, 0.05) 0%, transparent 50%),
                url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f8f9fa' fill-opacity='0.03'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        
        .certificate::before,
        .certificate::after {
            content: '';
            position: absolute;
            width: 80px;
            height: 80px;
            background: linear-gradient(45deg, #c9b037, #daa520);
            border-radius: 50%;
            border: 5px solid #2c3e50;
        }
        
        .certificate::before {
            top: -10px;
            left: -10px;
        }
        
        .certificate::after {
            bottom: -10px;
            right: -10px;
        }
        
        .header {
            margin-bottom: 40px;
        }
        
        .title {
            font-family: 'Playfair Display', serif;
            font-size: 48px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .subtitle {
            font-size: 24px;
            color: #7f8c8d;
            font-weight: 400;
            letter-spacing: 1px;
        }
        
        .recipient-section {
            margin: 50px 0;
        }
        
        .recipient-label {
            font-size: 18px;
            color: #7f8c8d;
            margin-bottom: 15px;
        }
        
        .recipient-name {
            font-family: 'Playfair Display', serif;
            font-size: 42px;
            font-weight: 700;
            color: #2c3e50;
            border-bottom: 3px solid #c9b037;
            display: inline-block;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        .achievement-text {
            font-size: 20px;
            color: #34495e;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .score-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border: 2px solid #c9b037;
        }
        
        .score-label {
            font-size: 16px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .score-value {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            font-weight: 700;
            color: #28a745;
            margin-bottom: 10px;
        }
        
        .score-grade {
            font-size: 18px;
            color: #495057;
            font-weight: 600;
        }
        
        .details-section {
            display: flex;
            justify-content: space-between;
            margin: 40px 0;
            flex-wrap: wrap;
        }
        
        .detail-item {
            flex: 1;
            min-width: 200px;
            margin: 10px;
        }
        
        .detail-label {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .detail-value {
            font-size: 16px;
            color: #2c3e50;
            font-weight: 600;
        }
        
        .qr-section {
            margin: 40px 0;
        }
        
        .qr-label {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .verification-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border-left: 5px solid #c9b037;
        }
        
        .verification-url {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #495057;
            word-break: break-all;
            background: white;
            padding: 10px;
            border-radius: 5px;
            margin: 5px 0;
        }
        
        .actions {
            margin-top: 40px;
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(201, 176, 55, 0.05);
            font-weight: 900;
            pointer-events: none;
            z-index: 0;
        }
        
        .content {
            position: relative;
            z-index: 1;
        }
        
        @media (max-width: 768px) {
            .certificate {
                padding: 40px 30px;
                border-width: 15px;
            }
            
            .title {
                font-size: 36px;
            }
            
            .subtitle {
                font-size: 20px;
            }
            
            .recipient-name {
                font-size: 32px;
            }
            
            .achievement-text {
                font-size: 18px;
            }
            
            .details-section {
                flex-direction: column;
            }
            
            .actions {
                flex-direction: column;
                align-items: center;
            }
            
            .btn {
                width: 100%;
                max-width: 300px;
                justify-content: center;
            }
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .actions {
                display: none;
            }
            
            .certificate {
                box-shadow: none;
                border: 10px solid #2c3e50;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="certificate" id="certificate">
            <div class="watermark">CERTIFIED</div>
            <div class="content">
                <div class="header">
                    <h1 class="title">CERTIFICATE</h1>
                    <p class="subtitle">of Professional Achievement</p>
                </div>
                
                <div class="recipient-section">
                    <p class="recipient-label">This certifies that</p>
                    <h2 class="recipient-name">{{ $attempt->user->name }}</h2>
                    <p class="achievement-text">
                        has successfully completed the <strong>Project Management Professional Certification</strong>
                        and has demonstrated exceptional competency in project management principles,
                        methodologies, and best practices.
                    </p>
                </div>
                
                <div class="score-section">
                    <div class="score-label">Final Score</div>
                    <div class="score-value">{{ number_format($percentage ?? ($attempt->percentage ?? 0), 1) }}%</div>
                    <div class="score-grade">
                        @php
                            $__score = $percentage ?? ($attempt->percentage ?? 0);
                        @endphp
                        @if($__score >= 90)
                            Outstanding Performance
                        @elseif($__score >= 80)
                            Excellent Performance
                        @elseif($__score >= 70)
                            Good Performance
                        @else
                            Satisfactory Performance
                        @endif
                    </div>
                </div>
                
                <div class="details-section">
                    <div class="detail-item">
                        <div class="detail-label">Date Completed</div>
                        <div class="detail-value">{{ optional($attempt->completed_at)->format('F j, Y') }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Certificate ID</div>
                            <div class="detail-value">{{ $attempt->serial }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Validation</div>
                        <div class="detail-value">Blockchain Verified</div>
                    </div>
                </div>
                
                <div class="qr-section">
                    <p class="qr-label">Scan to verify authenticity</p>
                    <div style="display: flex; justify-content: center; margin: 20px 0;">
                        @php
                            $qrRender = null; $qrError = null; $certUrl = url('/certificates/' . $attempt->serial);
                            try {
                                if (class_exists('SimpleSoftwareIO\\QrCode\\Facades\\QrCode')) {
                                    $qrRender = SimpleSoftwareIO\QrCode\Facades\QrCode::size(120)->generate($certUrl);
                                }
                            } catch (\Throwable $e) { $qrError = $e->getMessage(); }
                        @endphp
                        @if($qrRender)
                            {!! $qrRender !!}
                        @else
                            <div style="text-align:center;">
                                <div style="font-size:12px;color:#6c757d;margin-bottom:6px;">QR unavailable</div>
                                <div style="font-family:monospace;font-size:11px;word-break:break-all;max-width:240px;">{{ $certUrl }}</div>
                                @if($qrError)
                                    <div style="color:#dc3545;font-size:11px;margin-top:4px;">{{ mb_substr($qrError,0,80) }}</div>
                                @endif
                            </div>
                        @endif
                    </div>
                </div>
                
                <div class="verification-info">
                    <strong>Online Verification:</strong>
                    <div class="verification-url">{{ url('/certificates/' . $attempt->serial) }}</div>
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button onclick="viewBadge()" class="btn btn-primary">
                🏆 View Badge
            </button>
            <button onclick="downloadCertificate()" class="btn btn-primary">📥 Download Certificate</button>
            <button onclick="shareCertificate()" class="btn btn-success">
                🔗 Share on LinkedIn
            </button>
            <button onclick="window.print()" class="btn btn-secondary">
                🖨️ Print Certificate
            </button>
        </div>
    </div>

    <script>
        function viewBadge() {
            window.location.href = '{{ url('/certificates/' . $attempt->serial . '/badge') }}';
        }
        function downloadCertificate() {
            const link = document.createElement('a');
            link.href = '{{ url("/certificates/" . $attempt->serial . "/download.jpg") }}';
            link.download = 'certificate-{{ $attempt->serial }}.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        function shareCertificate() {
            const url = '{{ url('/certificates/' . $attempt->serial) }}'; // absolute
            const scoreText = '{{ number_format($percentage ?? ($attempt->percentage ?? 0), 1) }}%';
            const title = 'Project Management Professional Certificate';
            const summary = `I just earned my Project Management Certificate with a score of ${scoreText}! Verify here:`;
            const source = '{{ parse_url(url('/'), PHP_URL_HOST) }}';
            // Legacy shareArticle endpoint still supports pre-filled fields for many users
            const shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}&source=${encodeURIComponent(source)}`;

            // Localhost caveat: LinkedIn cannot scrape localhost -> warn & copy link
            if (location.hostname === 'localhost' || /127\.0\.0\.1/.test(location.hostname)) {
                try {
                    navigator.clipboard.writeText(`${summary} ${url}`);
                } catch (e) {
                    console.log('Clipboard copy failed', e);
                }
                alert('LinkedIn cannot generate a preview for localhost. The share window will open; paste if fields are empty. (Link copied to clipboard)');
            }
            window.open(shareUrl, '_blank', 'width=800,height=600');
        }
    </script>
</body>
</html>