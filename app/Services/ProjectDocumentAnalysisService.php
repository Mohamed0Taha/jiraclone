<?php

namespace App\Services;

use App\Models\OpenAiRequest;
use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * ProjectDocumentAnalysisService
 *
 * Analyzes uploaded project requirement documents and extracts structured project data
 * using AI. Supports various document formats and returns parsed project information
 * that can be used to populate the project creation form.
 */
class ProjectDocumentAnalysisService
{
    protected OpenAIService $openAIService;

    /** Supported file types for document upload */
    protected array $supportedMimeTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
    ];

    /** Maximum file size in bytes (5MB) */
    protected int $maxFileSize = 5 * 1024 * 1024;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    /**
     * Analyze uploaded document and extract project data
     *
     * @param UploadedFile $file The uploaded project requirements document
     * @return array Extracted project data structure
     * @throws Exception If document cannot be processed
     */
    public function analyzeDocument(UploadedFile $file): array
    {
        $this->validateFile($file);

        try {
            // Extract text from document
            $documentText = $this->extractTextFromFile($file);
            
            if (empty(trim($documentText))) {
                throw new Exception('Could not extract text from the uploaded document.');
            }

            Log::info('ProjectDocumentAnalysisService: Document text extracted', [
                'file_name' => $file->getClientOriginalName(),
                'text_length' => strlen($documentText),
                'user_id' => Auth::id(),
            ]);

            // Use AI to analyze and structure the document
            return $this->extractProjectDataWithAI($documentText);

        } catch (Exception $e) {
            Log::error('ProjectDocumentAnalysisService: Document analysis failed', [
                'file_name' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);
            throw $e;
        }
    }

    /**
     * Validate uploaded file
     */
    protected function validateFile(UploadedFile $file): void
    {
        if (!$file->isValid()) {
            throw new Exception('The uploaded file is invalid.');
        }

        if ($file->getSize() > $this->maxFileSize) {
            throw new Exception('File size exceeds 5MB limit.');
        }

        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, $this->supportedMimeTypes)) {
            throw new Exception('Unsupported file type. Please upload a text, PDF, or Word document.');
        }
    }

    /**
     * Extract text content from various file types
     */
    protected function extractTextFromFile(UploadedFile $file): string
    {
        $mimeType = $file->getMimeType();

        switch ($mimeType) {
            case 'text/plain':
                return file_get_contents($file->getRealPath());

            case 'application/pdf':
                return $this->extractFromPDF($file);

            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return $this->extractFromWord($file);

            case 'application/rtf':
                return $this->extractFromRTF($file);

            default:
                throw new Exception('Unsupported file type for text extraction.');
        }
    }

    /**
     * Extract text from PDF using basic text extraction
     */
    protected function extractFromPDF(UploadedFile $file): string
    {
        // For now, we'll use a simple approach that works with most PDFs
        // In production, you might want to use a library like smalot/pdfparser
        try {
            $content = file_get_contents($file->getRealPath());
            
            // Simple PDF text extraction - this is basic and may not work with all PDFs
            if (preg_match_all('/\((.*?)\)/', $content, $matches)) {
                return implode(' ', $matches[1]);
            }
            
            // Fallback: try to extract readable text
            $text = preg_replace('/[^\x20-\x7E\s]/', '', $content);
            return trim($text);
            
        } catch (Exception $e) {
            throw new Exception('Could not extract text from PDF. Please try a different format or ensure the PDF contains selectable text.');
        }
    }

    /**
     * Extract text from Word documents
     */
    protected function extractFromWord(UploadedFile $file): string
    {
        // For Word documents, we'll use a simple approach
        // In production, consider using PhpOffice/PhpWord
        try {
            $content = file_get_contents($file->getRealPath());
            
            // Try to extract readable text from Word format
            $text = preg_replace('/[^\x20-\x7E\s]/', ' ', $content);
            $text = preg_replace('/\s+/', ' ', $text);
            return trim($text);
            
        } catch (Exception $e) {
            throw new Exception('Could not extract text from Word document. Please try saving as a text file or PDF.');
        }
    }

    /**
     * Extract text from RTF documents
     */
    protected function extractFromRTF(UploadedFile $file): string
    {
        try {
            $content = file_get_contents($file->getRealPath());
            
            // Strip RTF formatting
            $text = preg_replace('/\{[^}]*\}/', '', $content);
            $text = preg_replace('/\\\\[a-z]+\d*/', '', $text);
            $text = preg_replace('/\s+/', ' ', $text);
            
            return trim($text);
            
        } catch (Exception $e) {
            throw new Exception('Could not extract text from RTF document.');
        }
    }

    /**
     * Use AI to analyze document text and extract structured project data
     */
    protected function extractProjectDataWithAI(string $documentText): array
    {
        $systemPrompt = $this->getSystemPrompt();
        $userPrompt = $this->buildUserPrompt($documentText);

        try {
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ];

            $response = $this->openAIService->chatJson($messages, 0.3);

            Log::info('ProjectDocumentAnalysisService: AI extraction successful', [
                'response_keys' => array_keys($response),
                'user_id' => Auth::id(),
            ]);

            return $this->validateAndNormalizeResponse($response);

        } catch (Exception $e) {
            Log::error('ProjectDocumentAnalysisService: AI extraction failed', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);
            throw new Exception('Failed to analyze document with AI: ' . $e->getMessage());
        }
    }

    /**
     * Get the system prompt for AI analysis
     */
    protected function getSystemPrompt(): string
    {
        return "You are an expert project manager and business analyst. Your task is to analyze project requirement documents and extract structured project information.

You must return a JSON object with the following structure:
{
  \"name\": \"Project name (required)\",
  \"description\": \"Brief project description (required)\",
  \"project_type\": \"software|marketing|design|research|construction|consulting|other\",
  \"domain\": \"Domain/industry (e.g., healthcare, finance, education)\",
  \"area\": \"Specific area within domain\",
  \"location\": \"Project location if mentioned\",
  \"team_size\": \"Estimated team size (number)\",
  \"budget\": \"Budget information if mentioned\",
  \"primary_stakeholder\": \"Main stakeholder or client\",
  \"objectives\": \"Main project objectives and goals\",
  \"constraints\": \"Project constraints, limitations, or requirements\",
  \"start_date\": \"Start date if mentioned (YYYY-MM-DD format)\",
  \"end_date\": \"End date or deadline if mentioned (YYYY-MM-DD format)\",
  \"confidence\": \"High|Medium|Low - confidence in extracted data\",
  \"missing_info\": \"List of important information that's missing from the document\"
}

Extract information accurately from the document. If information is not available, use null or appropriate default values. Be conservative and accurate rather than making assumptions.";
    }

    /**
     * Build the user prompt for AI analysis
     */
    protected function buildUserPrompt(string $documentText): string
    {
        // Truncate very long documents to stay within token limits
        $maxLength = 8000; // Conservative limit for token management
        if (strlen($documentText) > $maxLength) {
            $documentText = substr($documentText, 0, $maxLength) . '... [Document truncated]';
        }

        return "Please analyze the following project requirements document and extract structured project information:

DOCUMENT CONTENT:
{$documentText}

Extract the project information and return it in the specified JSON format. Pay special attention to:
1. Project name and core description
2. Project type and domain
3. Timeline and budget information
4. Key stakeholders and objectives
5. Technical or business constraints

Be accurate and conservative in your extraction. If information is unclear or missing, indicate this appropriately.";
    }

    /**
     * Validate and normalize the AI response
     */
    protected function validateAndNormalizeResponse(array $response): array
    {
        $defaults = [
            'name' => '',
            'description' => '',
            'project_type' => 'other',
            'domain' => '',
            'area' => '',
            'location' => '',
            'team_size' => 3,
            'budget' => '',
            'primary_stakeholder' => '',
            'objectives' => '',
            'constraints' => '',
            'start_date' => '',
            'end_date' => '',
            'confidence' => 'medium',
            'missing_info' => '',
        ];

        // Merge with defaults and ensure required fields
        $normalized = array_merge($defaults, $response);

        // Validate and clean specific fields
        $normalized['team_size'] = is_numeric($normalized['team_size']) ? (int) $normalized['team_size'] : 3;
        $normalized['team_size'] = max(1, min(50, $normalized['team_size'])); // Reasonable bounds

        // Ensure project_type is valid
        $validTypes = ['software', 'marketing', 'design', 'research', 'construction', 'consulting', 'other'];
        if (!in_array($normalized['project_type'], $validTypes)) {
            $normalized['project_type'] = 'other';
        }

        // Clean up date formats
        $normalized['start_date'] = $this->validateDate($normalized['start_date']);
        $normalized['end_date'] = $this->validateDate($normalized['end_date']);

        return $normalized;
    }

    /**
     * Validate and format date strings
     */
    protected function validateDate(?string $date): string
    {
        if (empty($date)) {
            return '';
        }

        try {
            $parsed = \Carbon\Carbon::parse($date);
            return $parsed->format('Y-m-d');
        } catch (Exception $e) {
            return '';
        }
    }

    /**
     * Get supported file types for frontend validation
     */
    public function getSupportedFileTypes(): array
    {
        return [
            'text/plain' => '.txt',
            'application/pdf' => '.pdf',
            'application/msword' => '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => '.docx',
            'application/rtf' => '.rtf',
        ];
    }

    /**
     * Get maximum file size in MB
     */
    public function getMaxFileSizeMB(): int
    {
        return $this->maxFileSize / (1024 * 1024);
    }
}
