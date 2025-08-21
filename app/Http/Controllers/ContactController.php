<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

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

        try {
            Mail::send('emails.contact-ticket', [
                'user' => $user,
                'topicLabel' => $topicLabel,
                'message' => $message,
                'submittedAt' => now()->format('F j, Y \a\t g:i A'),
            ], function ($mail) use ($user, $topicLabel) {
                $mail->from(config('mail.from.address'), config('mail.from.name'))
                     ->to('taha.elfatih@gmail.com')
                     ->subject("TaskPilot Support: {$topicLabel}")
                     ->replyTo($user->email, $user->name);
            });

            return back()->with('success', 'Your message has been sent successfully! We\'ll get back to you soon.');

        } catch (\Exception $e) {
            // Log the specific error for debugging
            Log::error('Contact form email failed: ' . $e->getMessage(), [
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
