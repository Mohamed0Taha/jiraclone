<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use App\Mail\ContactFormMail;
use App\Notifications\ContactFormNotification;

class ContactController extends Controller
{
    public function show(Request $request)
    {
        return Inertia::render('ContactUs');
    }

    public function send(Request $request)
    {
        $request->validate([
            'topic' => 'required|string|in:billing,bug,feature,technical,account,general,feedback,other',
            'message' => 'required|string|min:10|max:2000',
        ]);

        $user = $request->user();
        $topic = $request->input('topic');
        $message = $request->input('message');

        // Map topic values to readable labels
        $topicLabels = [
            'billing' => 'Billing Issue',
            'bug' => 'Bug Report',
            'feature' => 'Feature Request',
            'technical' => 'Technical Support',
            'account' => 'Account Issue',
            'general' => 'General Inquiry',
            'feedback' => 'Feedback',
            'other' => 'Other',
        ];

        $topicLabel = $topicLabels[$topic] ?? 'Unknown';

        // Log the attempt
        Log::info('Contact form submission attempt', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'topic' => $topic,
            'topic_label' => $topicLabel,
            'message_length' => strlen($message),
            'mail_config' => [
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'from' => config('mail.from.address'),
            ]
        ]);

        try {
            // Use Notification approach (same as signup emails)
            $adminEmail = 'taha.elfatih@gmail.com';
            
            Notification::route('mail', $adminEmail)
                ->notify(new ContactFormNotification($user, $topicLabel, $message, now()->format('F j, Y \a\t g:i A')));

            Log::info('Contact form email sent successfully via Notification', [
                'user_id' => $user->id,
                'topic' => $topicLabel,
                'to' => $adminEmail
            ]);

            return back()->with('success', 'Your message has been sent successfully! We\'ll get back to you soon.');

        } catch (\Exception $e) {
            // Log the specific error for debugging
            Log::error('Contact form notification failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'topic' => $topic,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->with('error', 'Failed to send message. Please try again or contact us directly at taha.elfatih@gmail.com.');
        }
    }
}
