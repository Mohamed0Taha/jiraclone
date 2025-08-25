<?php

namespace App\Http\Controllers;

use App\Services\TwilioService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TwilioController extends Controller
{
    public function __construct(private TwilioService $twilioService) {}

    /**
     * Test SMS sending
     */
    public function testSMS(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string|max:1600',
        ]);

        try {
            $result = $this->twilioService->sendSMS(
                $request->phone,
                $request->message
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'SMS sent successfully!',
                    'sid' => $result['sid'],
                    'status' => $result['status'],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send SMS',
                    'error' => $result['error'],
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('SMS test failed: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while sending SMS',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test WhatsApp sending
     */
    public function testWhatsApp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string|max:1600',
        ]);

        try {
            $result = $this->twilioService->sendWhatsApp(
                $request->phone,
                $request->message
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'WhatsApp message sent successfully!',
                    'sid' => $result['sid'],
                    'status' => $result['status'],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send WhatsApp message',
                    'error' => $result['error'],
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('WhatsApp test failed: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while sending WhatsApp message',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check message status
     */
    public function checkMessageStatus(Request $request)
    {
        $request->validate([
            'message_sid' => 'required|string',
        ]);

        try {
            $status = $this->twilioService->checkMessageStatus($request->message_sid);

            return response()->json([
                'success' => true,
                'status' => $status,
            ]);
        } catch (\Exception $e) {
            Log::error('Message status check failed: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to check message status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
