<?php

namespace App\Http\Controllers;

use App\Models\EmailLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EmailStatsController extends Controller
{
    public function getStats(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Get email statistics
            $totalEmails = EmailLog::count();
            $successfulEmails = EmailLog::where('sent_successfully', true)->count();
            $failedEmails = EmailLog::where('sent_successfully', false)->count();
            $successRate = $totalEmails > 0 ? round(($successfulEmails / $totalEmails) * 100, 1) : 0;
            
            // Get recent emails (last 24 hours)
            $recentEmails = EmailLog::where('created_at', '>=', now()->subDay())
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(['id', 'to_email', 'subject', 'type', 'sent_successfully', 'created_at']);
            
            // Get email types breakdown
            $emailTypes = EmailLog::selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->orderBy('count', 'desc')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [ucfirst($item->type) => $item->count];
                });
            
            // Get daily email count for the last 7 days
            $dailyStats = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i)->startOfDay();
                $count = EmailLog::whereDate('created_at', $date->toDateString())->count();
                $dailyStats[] = [
                    'date' => $date->format('M j'),
                    'count' => $count
                ];
            }
            
            return response()->json([
                'success' => true,
                'stats' => [
                    'total_emails' => $totalEmails,
                    'successful_emails' => $successfulEmails,
                    'failed_emails' => $failedEmails,
                    'success_rate' => $successRate,
                    'recent_emails' => $recentEmails,
                    'email_types' => $emailTypes,
                    'daily_stats' => $dailyStats,
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch email statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function getRecentLogs(Request $request)
    {
        try {
            $limit = $request->get('limit', 10);
            
            $emails = EmailLog::with('user:id,name,email')
                ->orderBy('created_at', 'desc')
                ->take($limit)
                ->get();
                
            return response()->json([
                'success' => true,
                'emails' => $emails
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent email logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
