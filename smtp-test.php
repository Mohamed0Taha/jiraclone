<?php

// Simple SMTP test using PHPMailer-like approach
function sendTestEmail() {
    $host = 'live.smtp.mailtrap.io';
    $port = 587;
    $username = 'api';
    $password = 'e640f58a598e3813abfbc2ee3f567728';
    $from = 'hello@taskpilot.us';
    $to = 'taha.elfatih@gmail.com';
    
    echo "Testing SMTP connection...\n";
    echo "Host: $host\n";
    echo "Port: $port\n";
    echo "Username: $username\n";
    echo "From: $from\n";
    echo "To: $to\n\n";
    
    $socket = fsockopen($host, $port, $errno, $errstr, 30);
    
    if (!$socket) {
        echo "❌ Failed to connect to SMTP server: $errstr ($errno)\n";
        return false;
    }
    
    echo "✅ Connected to SMTP server\n";
    
    // Read initial response
    $response = fgets($socket, 256);
    echo "Server: $response";
    
    // EHLO
    fwrite($socket, "EHLO taskpilot.us\r\n");
    $response = fgets($socket, 256);
    echo "EHLO: $response";
    
    // Read additional EHLO responses
    while (substr($response, 3, 1) == '-') {
        $response = fgets($socket, 256);
        echo "EHLO: $response";
    }
    
    // STARTTLS
    fwrite($socket, "STARTTLS\r\n");
    $response = fgets($socket, 256);
    echo "STARTTLS: $response";
    
    if (substr($response, 0, 3) == '220') {
        echo "✅ TLS negotiation successful\n";
        
        // Enable crypto
        if (stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            echo "✅ TLS encryption enabled\n";
            
            // EHLO again after TLS
            fwrite($socket, "EHLO taskpilot.us\r\n");
            $response = fgets($socket, 256);
            echo "EHLO (TLS): $response";
            
            // Read additional EHLO responses
            while (substr($response, 3, 1) == '-') {
                $response = fgets($socket, 256);
                echo "EHLO (TLS): $response";
            }
            
            // AUTH LOGIN
            fwrite($socket, "AUTH LOGIN\r\n");
            $response = fgets($socket, 256);
            echo "AUTH: $response";
            
            if (substr($response, 0, 3) == '334') {
                // Send username
                fwrite($socket, base64_encode($username) . "\r\n");
                $response = fgets($socket, 256);
                echo "Username: $response";
                
                // Send password
                fwrite($socket, base64_encode($password) . "\r\n");
                $response = fgets($socket, 256);
                echo "Password: $response";
                
                if (substr($response, 0, 3) == '235') {
                    echo "✅ Authentication successful\n";
                    
                    // Send email
                    fwrite($socket, "MAIL FROM: <$from>\r\n");
                    $response = fgets($socket, 256);
                    echo "MAIL FROM: $response";
                    
                    fwrite($socket, "RCPT TO: <$to>\r\n");
                    $response = fgets($socket, 256);
                    echo "RCPT TO: $response";
                    
                    fwrite($socket, "DATA\r\n");
                    $response = fgets($socket, 256);
                    echo "DATA: $response";
                    
                    if (substr($response, 0, 3) == '354') {
                        $email_data = "From: TaskPilot <$from>\r\n";
                        $email_data .= "To: $to\r\n";
                        $email_data .= "Subject: TaskPilot Email Forwarding Test\r\n";
                        $email_data .= "Content-Type: text/plain\r\n";
                        $email_data .= "\r\n";
                        $email_data .= "This is a test email from TaskPilot email forwarding system.\r\n";
                        $email_data .= "If you receive this, the SMTP configuration is working correctly.\r\n";
                        $email_data .= "\r\n.\r\n";
                        
                        fwrite($socket, $email_data);
                        $response = fgets($socket, 256);
                        echo "Send: $response";
                        
                        if (substr($response, 0, 3) == '250') {
                            echo "✅ Email sent successfully!\n";
                        } else {
                            echo "❌ Failed to send email\n";
                        }
                    }
                } else {
                    echo "❌ Authentication failed\n";
                }
            }
        } else {
            echo "❌ Failed to enable TLS\n";
        }
    } else {
        echo "❌ STARTTLS failed\n";
    }
    
    // QUIT
    fwrite($socket, "QUIT\r\n");
    $response = fgets($socket, 256);
    echo "QUIT: $response";
    
    fclose($socket);
}

sendTestEmail();

?>
