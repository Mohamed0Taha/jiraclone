<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\LeadMessage;
use App\Models\LeadMessageBatch;
use App\Services\LinkedInSalesNavigatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Http;

class SalesNavigatorController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $leads = Lead::where('user_id', $user->id)->latest()->limit(100)->get();
        $batches = LeadMessageBatch::where('user_id', $user->id)->with('messages')->latest()->limit(10)->get();
        
        // Check LinkedIn authentication status
        $linkedInService = new LinkedInSalesNavigatorService();
        $linkedInAuthConfigured = $linkedInService->hasValidAuth();
        $authInstructions = LinkedInSalesNavigatorService::getAuthSetupInstructions();

        if ($request->boolean('partial')) {
            return response()->json([
                'leads' => $leads,
                'batches' => $batches,
                'linkedin_auth_configured' => $linkedInAuthConfigured
            ]);
        }

        return view('admin.sales_navigator', compact('leads', 'batches', 'linkedInAuthConfigured', 'authInstructions'));
    }

    /**
     * Accept a pasted Sales Navigator URL and extract search parameters.
     * This is a placeholder implementation that simulates lead extraction.
     * In a real implementation, you would need to handle LinkedIn's authentication
     * and use their approved APIs or browser automation (with proper rate limiting).
     */
    public function ingest(Request $request)
    {
        $data = $request->validate([
            'url' => 'required|string|min:10',
            'count' => 'nullable|integer|min:1|max:100'
        ]);

        $count = $data['count'] ?? 25;
        $url = $data['url'];
        
        // Use the LinkedIn Sales Navigator service
        $linkedInService = new LinkedInSalesNavigatorService();
        $result = $linkedInService->extractLeadsFromUrl($url, $count);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'leads' => []
            ]);
        }
        
        // Create hash for this search
        $hash = substr(hash('sha256', $url), 0, 32);
        
        // Save leads to database
        $inserted = 0;
        foreach ($result['leads'] as $leadData) {
            $lead = Lead::firstOrCreate([
                'user_id' => $request->user()->id,
                'linkedin_profile_url' => $leadData['linkedin_profile_url'],
            ], array_merge($leadData, [
                'status' => 'new',
                'search_hash' => $hash,
            ]));
            
            if ($lead->wasRecentlyCreated) {
                $inserted++;
            }
        }
        
        Log::info('LinkedIn leads extracted', [
            'url' => $url,
            'total_leads' => count($result['leads']),
            'new_leads' => $inserted,
            'search_params' => $result['search_params'] ?? null
        ]);
        
        return response()->json([
            'success' => true, 
            'hash' => $hash, 
            'inserted' => $inserted,
            'total_processed' => count($result['leads']),
            'search_params' => $result['search_params'] ?? null
        ]);
    }

    /**
     * Test LinkedIn authentication
     */
    public function testLinkedInAuth(Request $request)
    {
        try {
            $linkedInService = new LinkedInSalesNavigatorService();
            
            // Check if we have manual cookies first
            if (!empty(env('LINKEDIN_LI_AT')) || !empty(env('LINKEDIN_SESSION_COOKIE'))) {
                // Test existing cookies
                $loginResult = $linkedInService->loginToLinkedIn();
                
                if ($loginResult) {
                    return response()->json([
                        'success' => true,
                        'message' => 'LinkedIn session cookies are valid and working!',
                        'method' => 'manual_cookies'
                    ]);
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'LinkedIn session cookies appear to be expired. Please update them.',
                        'instructions' => 'Please follow the manual cookie extraction steps shown above.',
                        'method' => 'manual_cookies_expired'
                    ]);
                }
            }
            
            // Try automated login (likely to fail due to LinkedIn's protections)
            $loginResult = $linkedInService->loginToLinkedIn();
            
            if ($loginResult) {
                return response()->json([
                    'success' => true,
                    'message' => 'LinkedIn automated login successful!',
                    'method' => 'automated_login'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Automated LinkedIn login failed. LinkedIn blocks automated logins for security.',
                    'instructions' => 'Please manually extract your LinkedIn session cookies using the instructions above.',
                    'method' => 'automated_login_blocked',
                    'next_steps' => [
                        '1. Open LinkedIn Sales Navigator in your browser',
                        '2. Log in to your account',
                        '3. Open Developer Tools (F12)',
                        '4. Go to Application/Storage → Cookies → linkedin.com',
                        '5. Copy the li_at cookie value',
                        '6. Add LINKEDIN_LI_AT=your_cookie_value to your .env file'
                    ]
                ]);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error testing LinkedIn auth: ' . $e->getMessage(),
                'method' => 'error'
            ]);
        }
    }

    /**
     * Parse LinkedIn Sales Navigator URL to extract search parameters
     */
    private function parseLinkedInSearchUrl($url)
    {
        $params = [];
        
        // Extract query parameters from URL
        if (preg_match('/query=([^&]+)/', $url, $matches)) {
            $queryString = urldecode($matches[1]);
            
            // Parse common search parameters
            if (preg_match('/keywords%3A([^%,)]+)/', $queryString, $keywordMatches)) {
                $params['keywords'] = str_replace('%2520', ' ', $keywordMatches[1]);
            }
            
            if (preg_match('/title%3A([^%,)]+)/', $queryString, $titleMatches)) {
                $params['title'] = str_replace('%2520', ' ', $titleMatches[1]);
            }
            
            if (preg_match('/company%3A([^%,)]+)/', $queryString, $companyMatches)) {
                $params['company'] = str_replace('%2520', ' ', $companyMatches[1]);
            }
            
            if (preg_match('/location%3A([^%,)]+)/', $queryString, $locationMatches)) {
                $params['location'] = str_replace('%2520', ' ', $locationMatches[1]);
            }
        }
        
        return $params;
    }

    /**
     * Generate realistic sample leads based on search parameters
     */
    private function generateSampleLeads($searchParams, $count)
    {
        $keywords = $searchParams['keywords'] ?? 'professional';
        $title = $searchParams['title'] ?? 'Manager';
        $company = $searchParams['company'] ?? '';
        $location = $searchParams['location'] ?? 'United States';
        
        $sampleFirstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'Rowan', 'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Gray', 'Harley', 'Jamie', 'Kai', 'Lane'];
        $sampleLastNames = ['Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris', 'Johnson', 'Kim', 'Lee', 'Martinez', 'Nelson', 'O\'Connor', 'Patel', 'Rodriguez', 'Smith', 'Taylor', 'Wilson', 'Zhang'];
        
        $titleVariations = [
            'project manager' => ['Project Manager', 'Senior Project Manager', 'Lead Project Manager', 'Principal Project Manager', 'Project Management Lead'],
            'manager' => ['Manager', 'Senior Manager', 'Lead Manager', 'Operations Manager', 'Team Manager'],
            'director' => ['Director', 'Senior Director', 'Executive Director', 'Managing Director'],
            'engineer' => ['Software Engineer', 'Senior Engineer', 'Lead Engineer', 'Principal Engineer'],
            'analyst' => ['Business Analyst', 'Data Analyst', 'Senior Analyst', 'Lead Analyst'],
        ];
        
        $companyTypes = ['Tech', 'Corp', 'Inc', 'LLC', 'Solutions', 'Systems', 'Innovations', 'Technologies', 'Enterprises', 'Group'];
        
        $leads = [];
        
        for ($i = 0; $i < $count; $i++) {
            $firstName = $sampleFirstNames[array_rand($sampleFirstNames)];
            $lastName = $sampleLastNames[array_rand($sampleLastNames)];
            $fullName = $firstName . ' ' . $lastName;
            
            // Generate title based on search keywords
            $generatedTitle = $title;
            foreach ($titleVariations as $keyword => $variations) {
                if (stripos($keywords, $keyword) !== false || stripos($title, $keyword) !== false) {
                    $generatedTitle = $variations[array_rand($variations)];
                    break;
                }
            }
            
            // Generate company name
            $generatedCompany = $company ?: (ucfirst($keywords) . ' ' . $companyTypes[array_rand($companyTypes)]);
            
            $leads[] = [
                'full_name' => $fullName,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'title' => $generatedTitle,
                'company' => $generatedCompany,
                'location' => $location,
                'linkedin_profile_url' => 'https://linkedin.com/in/' . strtolower($firstName . '-' . $lastName . '-' . rand(100, 999)),
                'meta' => [
                    'source' => 'sales_navigator',
                    'search_keywords' => $keywords,
                    'extracted_at' => now()->toISOString(),
                ]
            ];
        }
        
        return $leads;
    }

    /** Create message batch for selected leads */
    public function createBatch(Request $request)
    {
        $payload = $request->validate([
            'lead_ids' => 'required|array|min:1',
            'lead_ids.*' => 'integer',
            'template' => 'required|string|min:5',
            'batch_name' => 'nullable|string|max:255',
        ]);
        
        $userId = $request->user()->id;
        $templateHash = substr(hash('sha256', $payload['template']), 0, 16);
        
        $batch = LeadMessageBatch::create([
            'user_id' => $userId,
            'name' => $payload['batch_name'] ?? 'Batch ' . now()->format('M j, Y g:i A'),
            'template_hash' => $templateHash,
            'template_raw' => $payload['template'],
            'total' => count($payload['lead_ids']),
            'status' => 'draft',
        ]);
        
        $leads = Lead::where('user_id', $userId)->whereIn('id', $payload['lead_ids'])->get();
        
        foreach ($leads as $lead) {
            $render = $this->renderTemplate($payload['template'], $lead);
            LeadMessage::create([
                'lead_id' => $lead->id,
                'batch_id' => $batch->id,
                'user_id' => $userId,
                'rendered_message' => $render,
                'status' => 'pending',
            ]);
        }
        
        return response()->json([
            'success' => true, 
            'batch_id' => $batch->id,
            'total_messages' => $leads->count()
        ]);
    }

    /**
     * Delete a lead
     */
    public function deleteLead(Lead $lead)
    {
        // Ensure the lead belongs to the authenticated user
        if ($lead->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $lead->delete();
        
        return response()->json(['success' => true]);
    }

    /**
     * Export leads to CSV
     */
    public function exportLeads(Request $request)
    {
        $user = $request->user();
        $leads = Lead::where('user_id', $user->id)->get();
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="leads_export_' . now()->format('Y-m-d_H-i-s') . '.csv"',
        ];
        
        $callback = function() use ($leads) {
            $file = fopen('php://output', 'w');
            
            // CSV Headers
            fputcsv($file, ['Full Name', 'First Name', 'Last Name', 'Title', 'Company', 'Location', 'LinkedIn URL', 'Status', 'Created At']);
            
            foreach ($leads as $lead) {
                fputcsv($file, [
                    $lead->full_name,
                    $lead->first_name,
                    $lead->last_name,
                    $lead->title,
                    $lead->company,
                    $lead->location,
                    $lead->linkedin_profile_url,
                    $lead->status,
                    $lead->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }

    /**
     * Render message template with lead data
     */
    private function renderTemplate(string $tpl, Lead $lead): string
    {
        $replacements = [
            '{{full_name}}' => $lead->full_name,
            '{{first_name}}' => $lead->first_name ?: ($lead->full_name ? explode(' ', $lead->full_name)[0] : ''),
            '{{last_name}}' => $lead->last_name ?: '',
            '{{company}}' => $lead->company,
            '{{title}}' => $lead->title,
            '{{location}}' => $lead->location,
        ];
        
        return str_replace(array_keys($replacements), array_values($replacements), $tpl);
    }
}
