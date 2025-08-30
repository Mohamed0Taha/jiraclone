<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TaskPilot Certification</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .certificate {
            background: white;
            padding: 60px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 800px;
            margin: 0 auto;
            border: 8px solid #4F46E5;
        }
        .header {
            margin-bottom: 30px;
        }
        .logo {
            font-size: 36px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .recipient {
            font-size: 24px;
            color: #4F46E5;
            margin: 20px 0;
            font-weight: 600;
        }
        .description {
            font-size: 16px;
            line-height: 1.6;
            margin: 30px 0;
            color: #555;
        }
        .details {
            margin: 40px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .serial {
            font-size: 14px;
            color: #666;
            font-family: 'Courier New', monospace;
        }
        .date {
            font-size: 14px;
            color: #666;
            margin-top: 10px;
        }
        .signature {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .badge {
            width: 80px;
            height: 80px;
            background: linear-gradient(45deg, #4F46E5, #7C3AED);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="logo">TaskPilot</div>
            <div class="badge">✓</div>
        </div>
        
        <div class="title">Certificate of Completion</div>
        
        <div style="margin: 40px 0;">
            <div style="font-size: 18px; color: #666;">This certifies that</div>
            <div class="recipient">{{ $user->name }}</div>
            <div style="font-size: 18px; color: #666;">has successfully completed the</div>
        </div>
        
        <div style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 20px 0;">
            TaskPilot Product Certification Program
        </div>
        
        <div class="description">
            This certification demonstrates proficiency in project management, task automation, 
            team collaboration, and advanced features of the TaskPilot platform. The holder 
            has successfully completed all required modules including project creation, task 
            generation, workflow management, AI assistant utilization, and team administration.
        </div>
        
        <div class="details">
            <div class="serial">Certificate Serial: {{ $attempt->serial }}</div>
            <div class="date">Date Issued: {{ $issued_date }}</div>
        </div>
        
        <div class="signature">
            <div style="font-size: 14px; color: #888;">
                Verified by TaskPilot Certification Authority
            </div>
            <div style="font-size: 12px; color: #aaa; margin-top: 10px;">
                This certificate can be verified at taskpilot.us/verify/{{ $attempt->serial }}
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
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
        
        <script>
        function shareOnLinkedIn() {
            const certificationTitle = 'TaskPilot Product Certification Program';
            const issuer = 'TaskPilot';
            const shareText = encodeURIComponent(`🎉 Excited to share that I've earned my ${certificationTitle} certification! I've demonstrated proficiency in project management, task automation, team collaboration, and advanced TaskPilot platform features.`);
            const shareUrl = encodeURIComponent(window.location.origin + '/certification/certificate');
            
            const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}&summary=${shareText}`;
            window.open(linkedInShareUrl, '_blank', 'width=600,height=600');
        }
        </script>
    </div>
</body>
</html>
