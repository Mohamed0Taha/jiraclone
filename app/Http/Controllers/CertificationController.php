<?php

namespace App\Http\Controllers;

use App\Models\CertificationAttempt;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CertificationController extends Controller
{
    public function index(Request $request)
    {
        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['current_step' => 1]
        );

        return Inertia::render('Certification/Index', [
            'attempt' => [
                'id' => $attempt->id,
                'current_step' => $attempt->current_step,
                'serial' => $attempt->serial,
                'completed_at' => $attempt->completed_at,
            ],
        ]);
    }

    public function progress(Request $request)
    {
        $request->validate([
            'step' => 'required|integer|min:1|max:6',
        ]);

        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['current_step' => 1]
        );

        // Only allow forward progress
        if ($request->step > $attempt->current_step) {
            $attempt->current_step = $request->step;
            $attempt->save();
        }

        return back();
    }

    public function complete(Request $request)
    {
        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['current_step' => 1]
        );

        if (!$attempt->completed_at) {
            $attempt->current_step = 6; // mark as done
            $attempt->completed_at = now();
            $attempt->serial = $attempt->serial ?: strtoupper(bin2hex(random_bytes(6)));
            $attempt->save();
        }

        return back();
    }

    public function certificate(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->whereNotNull('completed_at')
            ->first();

        if (!$attempt) {
            return redirect()->route('certification.index')
                ->with('error', 'Complete certification first to download certificate.');
        }

        $user = $request->user();
        
        // Return HTML view instead of PDF for now (can add PDF generation later)
        return view('certificates.template', [
            'user' => $user,
            'attempt' => $attempt,
            'issued_date' => $attempt->completed_at->format('F j, Y'),
        ]);
    }
}
