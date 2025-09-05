<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\LeadMessage;
use App\Models\LeadMessageBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SalesNavigatorController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $leads = Lead::where('user_id', $user->id)->latest()->limit(100)->get();
        $batches = LeadMessageBatch::where('user_id', $user->id)->latest()->limit(10)->get();
        return Inertia::render('Admin/SalesNavigator', [
            'leads' => $leads,
            'batches' => $batches,
        ]);
    }

    /**
     * Accept a pasted Sales Navigator URL and (placeholder) parse search hash.
     * Real scraping of LinkedIn content is NOT implemented here (ToS sensitive).
     */
    public function ingest(Request $request)
    {
        $data = $request->validate([
            'url' => 'required|string|min:10',
        ]);
        $hash = substr(hash('sha256', $data['url']), 0, 32);
        // Placeholder: simulate a few leads (avoid scraping)
        $sample = [
            ['full_name' => 'Sample Lead One', 'title' => 'Engineering Manager', 'company' => 'ExampleCorp'],
            ['full_name' => 'Sample Lead Two', 'title' => 'Product Director', 'company' => 'DemoSoft'],
            ['full_name' => 'Sample Lead Three', 'title' => 'CTO', 'company' => 'TechNova'],
        ];
        foreach ($sample as $row) {
            Lead::firstOrCreate([
                'user_id' => $request->user()->id,
                'full_name' => $row['full_name'],
                'search_hash' => $hash,
            ], array_merge($row, [
                'status' => 'new',
            ]));
        }
        return response()->json(['ok' => true, 'hash' => $hash, 'inserted' => count($sample)]);
    }

    /** Create message batch for selected leads */
    public function createBatch(Request $request)
    {
        $payload = $request->validate([
            'lead_ids' => 'required|array|min:1',
            'lead_ids.*' => 'integer',
            'template' => 'required|string|min:5',
        ]);
        $userId = $request->user()->id;
        $templateHash = substr(hash('sha256', $payload['template']), 0, 16);
        $batch = LeadMessageBatch::create([
            'user_id' => $userId,
            'template_hash' => $templateHash,
            'template_raw' => $payload['template'],
            'total' => count($payload['lead_ids']),
        ]);
        $leads = Lead::where('user_id', $userId)->whereIn('id', $payload['lead_ids'])->get();
        foreach ($leads as $lead) {
            $render = $this->renderTemplate($payload['template'], $lead);
            LeadMessage::create([
                'lead_id' => $lead->id,
                'batch_id' => $batch->id,
                'user_id' => $userId,
                'rendered_message' => $render,
            ]);
        }
        return response()->json(['ok' => true, 'batch_id' => $batch->id]);
    }

    private function renderTemplate(string $tpl, Lead $lead): string
    {
        $replacements = [
            '{{full_name}}' => $lead->full_name,
            '{{first_name}}' => $lead->first_name ?: ($lead->full_name ? explode(' ', $lead->full_name)[0] : ''),
            '{{company}}' => $lead->company,
            '{{title}}' => $lead->title,
        ];
        return str_replace(array_keys($replacements), array_values($replacements), $tpl);
    }
}
