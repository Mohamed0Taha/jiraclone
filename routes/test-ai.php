<?php

use App\Services\ProjectDocumentAnalysisService;
use Illuminate\Support\Facades\Route;

Route::get('/test-ai-service', function (ProjectDocumentAnalysisService $service) {
    // Create a simple test document content
    $testContent = 'PROJECT REQUIREMENTS DOCUMENT
    
Project Name: E-Commerce Mobile App
Project Type: Software Development
Domain: E-commerce
Timeline: 6 months starting September 2025
Budget: $150,000
Team Size: 8 people
Primary Stakeholder: John Smith
Objectives: Create mobile shopping app with payment integration';

    // Simulate what the service would return
    try {
        // We'll mock this since we don't want to call OpenAI for testing
        $mockResponse = [
            'name' => 'E-Commerce Mobile App',
            'description' => 'Mobile shopping application with payment integration',
            'project_type' => 'software',
            'domain' => 'e-commerce',
            'area' => 'mobile development',
            'location' => '',
            'team_size' => 8,
            'budget' => '$150,000',
            'primary_stakeholder' => 'John Smith',
            'objectives' => 'Create mobile shopping app with payment integration',
            'constraints' => '',
            'start_date' => '2025-09-01',
            'end_date' => '2026-03-01',
            'confidence' => 'high',
            'missing_info' => '',
        ];

        return response()->json([
            'success' => true,
            'data' => $mockResponse,
            'message' => 'Mock analysis complete',
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], 422);
    }
});
