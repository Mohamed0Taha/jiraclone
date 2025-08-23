<?php

namespace App\Services;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

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
        'text/markdown',
        'text/x-markdown',
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
     * @param  UploadedFile  $file  The uploaded project requirements document
     * @return array Extracted project data structure
     *
     * @throws Exception If document cannot be processed
     */
    public function analyzeDocument(UploadedFile $file): array
    {
        $this->validateFile($file);

        try {
            Log::info('ProjectDocumentAnalysisService: Starting document analysis', [
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'user_id' => Auth::id(),
            ]);

            // Use OpenAI to analyze the document directly
            return $this->analyzeDocumentWithOpenAI($file);

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
        if (! $file->isValid()) {
            throw new Exception('The uploaded file is invalid.');
        }

        if ($file->getSize() > $this->maxFileSize) {
            throw new Exception('File size exceeds 5MB limit.');
        }

        $mimeType = $file->getMimeType();
        $original = strtolower($file->getClientOriginalName());
        $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));

        $allowedExtensions = ['txt', 'pdf', 'doc', 'docx', 'rtf', 'md', 'markdown', 'csv', 'xls', 'xlsx'];

        $mimeAllowed = in_array($mimeType, $this->supportedMimeTypes);
        $extAllowed = in_array($ext, $allowedExtensions, true);

        if (! $mimeAllowed && ! $extAllowed) {
            throw new Exception('Unsupported file type. Allowed: TXT, PDF, DOC, DOCX, RTF, MD, CSV, XLS, XLSX.');
        }
    }

    /**
     * Extract text content from various file types
     */
    protected function extractTextFromFile(UploadedFile $file): string
    {
        $mimeType = $file->getMimeType();
        $originalName = strtolower($file->getClientOriginalName());

        switch ($mimeType) {
            case 'text/plain':
                return file_get_contents($file->getRealPath());

            case 'text/markdown':
                return $this->extractFromMarkdown($file);

            case 'text/csv':
                return $this->extractFromCsv($file);

            case 'application/pdf':
                return $this->extractFromPDF($file);

            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return $this->extractFromWord($file);

            case 'application/rtf':
                return $this->extractFromRTF($file);

            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return $this->extractFromSpreadsheet($file);

            default:
                // Fallback by extension if mime misreported
                if (str_ends_with($originalName, '.md')) {
                    return $this->extractFromMarkdown($file);
                }
                if (str_ends_with($originalName, '.csv')) {
                    return $this->extractFromCsv($file);
                }
                if (preg_match('/\.xlsx?$/', $originalName)) {
                    return $this->extractFromSpreadsheet($file);
                }
                throw new Exception('Unsupported file type for text extraction ('.$mimeType.').');
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
        try {
            $path = $file->getRealPath();
            // Use PhpWord for .docx if available
            $phpWordFactory = 'PhpOffice\\PhpWord\\IOFactory';
            if (class_exists($phpWordFactory)) {
                try {
                    $phpWord = $phpWordFactory::load($path);
                    $text = '';
                    foreach ($phpWord->getSections() as $section) {
                        foreach ($section->getElements() as $elem) {
                            if (method_exists($elem, 'getText')) {
                                $text .= $elem->getText()."\n";
                            }
                        }
                    }
                    $text = trim($text);
                    if ($text !== '') {
                        return $this->cleanExtractedText($text);
                    }
                } catch (Exception $inner) {
                    // Fallback below
                }
            }
            // Fallback: raw content (may be binary) -> strip non-printables
            $content = file_get_contents($path);
            $text = preg_replace('/[^\x20-\x7E\s]/', ' ', $content);

            return $this->cleanExtractedText($text);
        } catch (Exception $e) {
            throw new Exception('Could not extract text from Word document.');
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
     * Extract from Markdown (strip code fences, keep headings as sentences)
     */
    protected function extractFromMarkdown(UploadedFile $file): string
    {
        $raw = file_get_contents($file->getRealPath());
        // Remove fenced code blocks
        $raw = preg_replace('/```[\s\S]*?```/', ' ', $raw);
        // Convert headings to sentences
        $raw = preg_replace('/^#+\s*/m', '', $raw);

        return $this->cleanExtractedText($raw);
    }

    /**
     * Extract text from CSV by concatenating cells row-wise
     */
    protected function extractFromCsv(UploadedFile $file): string
    {
        $fh = fopen($file->getRealPath(), 'r');
        if (! $fh) {
            throw new Exception('Unable to read CSV');
        }
        $rows = [];
        $lineCount = 0;
        while (($row = fgetcsv($fh)) !== false && $lineCount < 500) { // cap rows
            $rows[] = implode(' | ', array_map('trim', $row));
            $lineCount++;
        }
        fclose($fh);

        return $this->cleanExtractedText(implode("\n", $rows));
    }

    /**
     * Extract from spreadsheet (first few sheets & rows)
     */
    protected function extractFromSpreadsheet(UploadedFile $file): string
    {
        $sheetFactory = 'PhpOffice\\PhpSpreadsheet\\IOFactory';
        if (! class_exists($sheetFactory)) {
            throw new Exception('Spreadsheet support library missing');
        }
        $path = $file->getRealPath();
        $reader = $sheetFactory::createReaderForFile($path);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($path);
        $text = [];
        $sheetLimit = 3;
        $rowLimit = 300;
        $sheetCount = 0;
        foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
            if ($sheetCount++ >= $sheetLimit) {
                break;
            }
            $rows = $sheet->toArray(null, true, true, true);
            $r = 0;
            foreach ($rows as $row) {
                if ($r++ >= $rowLimit) {
                    break;
                }
                $text[] = implode(' | ', array_map(fn ($v) => trim((string) $v), $row));
            }
        }

        return $this->cleanExtractedText(implode("\n", $text));
    }

    /** Clean and normalize extracted text */
    protected function cleanExtractedText(string $text): string
    {
        $text = mb_convert_encoding($text, 'UTF-8', 'auto');
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', ' ', $text);
        $text = preg_replace('/\r\n|\r/', "\n", $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        $text = preg_replace('/[ \t]{2,}/', ' ', $text);

        return trim($text);
    }

    /**
     * Analyze document directly with OpenAI using file upload
     */
    protected function analyzeDocumentWithOpenAI(UploadedFile $file): array
    {
        try {
            $fileName = $file->getClientOriginalName();
            $mimeType = $file->getMimeType();

            Log::info('ProjectDocumentAnalysisService: Processing file with OpenAI', [
                'file_name' => $fileName,
                'mime_type' => $mimeType,
                'user_id' => Auth::id(),
            ]);

            // For now, let's use text-based processing for all documents
            // Vision API requires more complex integration that we can add later
            return $this->analyzeDocumentAsText($file, $fileName, $mimeType);

        } catch (Exception $e) {
            Log::error('ProjectDocumentAnalysisService: OpenAI file analysis failed', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);
            throw new Exception('Failed to analyze document with AI: '.$e->getMessage());
        }
    }

    /**
     * Analyze document as image using OpenAI Vision
     */
    protected function analyzeDocumentAsImage(UploadedFile $file, string $fileName, string $mimeType): array
    {
        try {
            // Convert file to base64
            $fileContent = file_get_contents($file->getRealPath());
            $base64File = base64_encode($fileContent);

            $systemPrompt = $this->getSystemPrompt();
            $userPrompt = $this->getDocumentAnalysisPrompt($fileName, $mimeType);

            // For vision models, we need to use a different approach
            // Let's use the regular chat completion with a text-based approach for now
            // and fall back to text extraction if needed

            // Try vision approach with a simpler message structure
            $analysisPrompt = $userPrompt."\n\nI have uploaded a document image. Please analyze this document image and extract all the project information you can see. The document contains project requirements and I need you to extract structured data from it.";

            // Use regular chat completion for now - vision requires special handling
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $analysisPrompt."\n\n[Note: Document image will be processed separately - please provide the expected JSON structure for project data extraction]"],
            ];

            // For now, let's fall back to text extraction for PDFs
            // The vision API requires more complex integration
            return $this->analyzeDocumentAsTextFallback($file, $fileName, $mimeType);

        } catch (Exception $e) {
            throw new Exception('Failed to analyze document as image: '.$e->getMessage());
        }
    }

    /**
     * Fallback method to analyze document as text when vision fails
     */
    protected function analyzeDocumentAsTextFallback(UploadedFile $file, string $fileName, string $mimeType): array
    {
        try {
            // Extract text safely with proper encoding
            $documentText = $this->safeExtractTextFromFile($file);

            if (empty(trim($documentText))) {
                // If we can't extract text, provide a basic structure for manual entry
                throw new Exception('Could not extract text from the document. Please try uploading a text-based document or manually enter the project information.');
            }

            return $this->extractProjectDataFromText($documentText, $fileName, $mimeType);

        } catch (Exception $e) {
            throw new Exception('Failed to process document: '.$e->getMessage());
        }
    }

    /**
     * Analyze document as text
     */
    protected function analyzeDocumentAsText(UploadedFile $file, string $fileName, string $mimeType): array
    {
        try {
            Log::info('ProjectDocumentAnalysisService: Starting text extraction', [
                'file_name' => $fileName,
                'mime_type' => $mimeType,
                'user_id' => Auth::id(),
            ]);

            // Extract text safely with proper encoding
            $documentText = $this->safeExtractTextFromFile($file);

            Log::info('ProjectDocumentAnalysisService: Text extraction result', [
                'text_length' => strlen($documentText),
                'text_preview' => substr($documentText, 0, 200).'...',
                'user_id' => Auth::id(),
            ]);

            if (empty(trim($documentText))) {
                throw new Exception('Could not extract readable text from the uploaded document. Please ensure the document contains selectable text or try uploading a text-based document (.txt, .docx) instead.');
            }

            return $this->extractProjectDataFromText($documentText, $fileName, $mimeType);

        } catch (Exception $e) {
            Log::error('ProjectDocumentAnalysisService: Text analysis failed', [
                'error' => $e->getMessage(),
                'file_name' => $fileName,
                'user_id' => Auth::id(),
            ]);
            throw new Exception('Failed to analyze document text: '.$e->getMessage());
        }
    }

    /**
     * Extract project data from text content
     */
    protected function extractProjectDataFromText(string $documentText, string $fileName, string $mimeType): array
    {
        $systemPrompt = $this->getSystemPrompt();
        $userPrompt = $this->getDocumentAnalysisPrompt($fileName, $mimeType);
        $fullPrompt = $userPrompt."\n\nDOCUMENT CONTENT:\n".$documentText;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $fullPrompt],
        ];

        $response = $this->openAIService->chatJson($messages, 0.3);

        Log::info('ProjectDocumentAnalysisService: AI text extraction successful', [
            'response_keys' => array_keys($response),
            'user_id' => Auth::id(),
        ]);

        $normalized = $this->validateAndNormalizeResponse($response);

        // Heuristic fallbacks when critical fields are empty
        $lines = preg_split('/\r?\n+/', $documentText);
        $cleanLines = [];
        foreach ($lines as $l) {
            $t = trim(preg_replace('/\s+/', ' ', $l));
            if ($t !== '' && ! preg_match('/^[\-_*#]+$/', $t)) {
                $cleanLines[] = $t;
            }
            if (count($cleanLines) > 25) {
                break;
            } // limit work
        }

        $originalNormalized = $normalized; // copy for diff logging

        if (empty($normalized['name'])) {
            // Choose first line with >= 3 words, <= 12 words
            foreach ($cleanLines as $l) {
                $wc = str_word_count($l);
                if ($wc >= 3) {
                    $normalized['name'] = substr($l, 0, 80);
                    break;
                }
            }
        }
        if (empty($normalized['description'])) {
            // Take first 2-3 lines / sentences
            $desc = '';
            $count = 0;
            foreach ($cleanLines as $l) {
                $desc .= ($desc ? ' ' : '').$l;
                $count++;
                if ($count >= 3 || strlen($desc) > 400) {
                    break;
                }
            }
            if ($desc) {
                $normalized['description'] = substr($desc, 0, 800);
            }
        }
        if (empty($normalized['objectives'])) {
            // Attempt to extract bullet-like lines containing verbs
            $objectiveLines = [];
            foreach ($cleanLines as $l) {
                if (preg_match('/\b(increase|reduce|improve|build|develop|launch|implement|migrate|optimi[sz]e|create)\b/i', $l)) {
                    $objectiveLines[] = $l;
                }
                if (count($objectiveLines) >= 5) {
                    break;
                }
            }
            if ($objectiveLines) {
                $normalized['objectives'] = implode("\n", $objectiveLines);
            }
        }

        // Adjust reasonable team_size if missing but description hints
        if (empty($normalized['team_size']) || ! is_numeric($normalized['team_size'])) {
            if (preg_match('/\bteam of (\d{1,2})/i', $documentText, $m)) {
                $normalized['team_size'] = (int) $m[1];
            }
        }

        if ($normalized['team_size'] < 1) {
            $normalized['team_size'] = 3;
        }

        // Log diff if fallbacks changed data
        if ($originalNormalized['name'] !== $normalized['name'] || $originalNormalized['description'] !== $normalized['description']) {
            Log::info('ProjectDocumentAnalysisService: Applied heuristic fallbacks', [
                'name_before' => $originalNormalized['name'],
                'name_after' => $normalized['name'],
                'description_was_empty' => empty($originalNormalized['description']),
                'description_length' => strlen($normalized['description']),
                'user_id' => Auth::id(),
            ]);
        }

        return $normalized;
    }

    /**
     * Extract project data from binary files (PDF, Word, etc.)
     */
    protected function extractProjectDataFromBinaryFile(string $systemPrompt, string $userPrompt, UploadedFile $file): array
    {
        try {
            // For binary files, we'll do a safer text extraction
            $documentText = $this->safeExtractTextFromFile($file);

            if (empty(trim($documentText))) {
                throw new Exception('Could not extract readable text from the uploaded document. Please ensure the document contains selectable text or try a different format.');
            }

            $fileName = $file->getClientOriginalName();
            $mimeType = $file->getMimeType();

            return $this->extractProjectDataFromText($documentText, $fileName, $mimeType);

        } catch (Exception $e) {
            throw new Exception('Failed to process document: '.$e->getMessage());
        }
    }

    /**
     * Safe text extraction with proper UTF-8 handling
     */
    protected function safeExtractTextFromFile(UploadedFile $file): string
    {
        $mimeType = $file->getMimeType();
        $originalName = strtolower($file->getClientOriginalName());

        try {
            switch ($mimeType) {
                case 'application/pdf':
                    return $this->safeExtractFromPDF($file);

                case 'application/msword':
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    return $this->safeExtractFromWord($file);

                case 'application/rtf':
                    return $this->safeExtractFromRTF($file);

                case 'text/plain':
                    return $this->cleanExtractedText(file_get_contents($file->getRealPath()) ?: '');

                case 'text/markdown':
                case 'text/x-markdown':
                    return $this->extractFromMarkdown($file);

                case 'text/csv':
                case 'application/csv':
                    return $this->extractFromCsv($file);

                case 'application/vnd.ms-excel':
                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                    return $this->extractFromSpreadsheet($file);

                default:
                    // Extension-based fallbacks
                    if (str_ends_with($originalName, '.csv')) {
                        return $this->extractFromCsv($file);
                    }
                    if (preg_match('/\.xlsx?$/', $originalName)) {
                        return $this->extractFromSpreadsheet($file);
                    }
                    if (preg_match('/\.(md|markdown)$/', $originalName)) {
                        return $this->extractFromMarkdown($file);
                    }
                    // Generic fallback
                    $content = file_get_contents($file->getRealPath()) ?: '';
                    $text = mb_convert_encoding($content, 'UTF-8', 'auto');
                    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);

                    return trim($text);
            }
        } catch (Exception $e) {
            throw new Exception('Could not extract text from document: '.$e->getMessage());
        }
    }

    /**
     * Safe PDF text extraction with proper encoding
     */
    protected function safeExtractFromPDF(UploadedFile $file): string
    {
        try {
            // Prefer robust parser
            // Use external PDF parser when available (guard keeps static analysers calm)
            $parserClass = 'Smalot\\PdfParser\\Parser';
            if (class_exists($parserClass)) {
                $parser = new $parserClass;
                $pdf = $parser->parseFile($file->getRealPath());
                $text = is_object($pdf) && method_exists($pdf, 'getText') ? $pdf->getText() : '';
            }
            if (empty($text)) {
                $text = file_get_contents($file->getRealPath());
            }

            if (! $text) {
                throw new Exception('Empty PDF text');
            }

            // Remove binary remnants / control chars
            $text = mb_convert_encoding($text, 'UTF-8', 'auto');
            $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', ' ', $text);

            // Normalize broken spacing/hyphenation
            $text = preg_replace('/-\s+\n/', '', $text); // hyphen line breaks
            $text = preg_replace('/\r\n|\r/', "\n", $text);
            $text = preg_replace('/\n{2,}/', "\n\n", $text);

            // Remove sequences of gibberish (very high symbol density)
            $lines = explode("\n", $text);
            $clean = [];
            foreach ($lines as $l) {
                $ratio = strlen(preg_replace('/[A-Za-z0-9\s]/', '', $l)) / (strlen($l) ?: 1);
                if ($ratio > 0.6 && strlen($l) > 12) { // mostly symbols
                    continue;
                }
                $clean[] = trim($l);
            }
            $text = trim(implode("\n", array_filter($clean)));

            // Collapse excessive spaces
            $text = preg_replace('/\t+/', ' ', $text);
            $text = preg_replace('/ {2,}/', ' ', $text);

            return $text;
        } catch (Exception $e) {
            throw new Exception('Could not extract text from PDF (parser failure: '.$e->getMessage().'). Try uploading a text-based or Word document.');
        }
    }

    /**
     * Safe Word document text extraction
     */
    protected function safeExtractFromWord(UploadedFile $file): string
    {
        try {
            $path = $file->getRealPath();
            $raw = file_get_contents($path);
            if ($raw === false) {
                throw new Exception('Empty file');
            }

            // Strategy 1: PhpWord (best fidelity)
            $phpWordFactory = 'PhpOffice\\PhpWord\\IOFactory';
            if (class_exists($phpWordFactory)) {
                try {
                    $doc = $phpWordFactory::load($path);
                    $txt = '';
                    foreach ($doc->getSections() as $section) {
                        foreach ($section->getElements() as $el) {
                            if (method_exists($el, 'getText')) {
                                $t = $el->getText();
                                if ($t !== '') {
                                    $txt .= $t."\n";
                                }
                            }
                        }
                    }
                    $clean = trim($txt);
                    if ($clean !== '') {
                        return $this->cleanExtractedText($clean);
                    }
                } catch (Exception $e) {
                    // fall through
                }
            }

            $isDocx = str_starts_with($raw, 'PK');

            // Strategy 2: direct docx XML parse
            if ($isDocx && class_exists('ZipArchive')) {
                $zip = new \ZipArchive;
                if ($zip->open($path) === true) {
                    $parts = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml'];
                    $xmlText = '';
                    foreach ($parts as $p) {
                        $idx = $zip->locateName($p, \ZipArchive::FL_NOCASE | \ZipArchive::FL_NODIR);
                        if ($idx !== false) {
                            $xml = $zip->getFromIndex($idx);
                            if ($xml) {
                                // Remove tags but keep paragraph breaks
                                $segment = preg_replace('/<w:tab[^>]*>/i', "\t", $xml);
                                $segment = preg_replace('/<w:br[^>]*>/i', "\n", $segment);
                                $segment = preg_replace('/<w:p[^>]*>/i', "\n", $segment);
                                if (preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/si', $segment, $m)) {
                                    $xmlText .= ' '.implode(' ', $m[1]);
                                }
                            }
                        }
                    }
                    $zip->close();
                    $xmlText = trim($xmlText);
                    if ($xmlText !== '') {
                        return $this->cleanExtractedText($xmlText);
                    }
                }
            }

            // Strategy 3: legacy .doc binary heuristic extraction
            // Extract readable ASCII/UTF-8 sequences > 20 chars
            $text = '';
            if (! $isDocx) {
                // Match sequences of readable characters including punctuation
                if (preg_match_all('/[A-Za-z0-9\s\.,;:()"\'\-]{20,}/u', $raw, $m)) {
                    $text = implode(" \n", $m[0]);
                }
            }

            $text = $text ?: $raw; // fallback to raw if nothing
            $text = $this->cleanExtractedText($text);
            if ($text === '') {
                throw new Exception('no textual content');
            }

            return $text;

        } catch (Exception $e) {
            throw new Exception('Could not extract text from Word document: '.$e->getMessage());
        }
    }

    /**
     * Safe RTF text extraction
     */
    protected function safeExtractFromRTF(UploadedFile $file): string
    {
        try {
            $content = file_get_contents($file->getRealPath());

            // Strip RTF formatting codes
            $text = preg_replace('/\{[^}]*\}/', '', $content);
            $text = preg_replace('/\\\\[a-z]+\d*\s?/', '', $text);

            // Clean and encode
            $text = mb_convert_encoding($text, 'UTF-8', 'auto');
            $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', ' ', $text);
            $text = preg_replace('/\s+/', ' ', $text);

            return trim($text);

        } catch (Exception $e) {
            throw new Exception('Could not extract text from RTF document.');
        }
    }

    /**
     * Get document analysis prompt
     */
    protected function getDocumentAnalysisPrompt(string $fileName, string $mimeType): string
    {
        return "You are extracting structured project metadata from a document.

DOCUMENT INFO:
- File Name: {$fileName}
- File Type: {$mimeType}

MANDATORY FIELDS (never omit keys) & ENFORCED DEFAULTS:
- name (string) — The official project title. Prefer the first prominent heading or a line containing words like 'Project', 'Initiative', 'Program', 'Proposal'. If multiple candidates, choose the most specific, not generic like 'Project Overview'.
- description (string) — 2–5 concise sentences summarizing scope, purpose, value. Do NOT just repeat the name.
- objectives (string) — Bullet-style or newline separated list of concrete goals (action verbs: increase, reduce, launch, implement, migrate, build, improve, deliver, optimize). If none explicit, list null.
- start_date (YYYY-MM-DD) — MUST always return a value. If none in document, use TODAY's date (assume user's local timezone) and note 'start date assumed today' in missing_info.
- end_date (YYYY-MM-DD) — MUST always return a value. If absent, infer a reasonable duration from project_type heuristics: software (90d), marketing (60d), design (45d), research (120d), construction (240d), consulting (90d), other (60d). Add note 'end date estimated +<days> days'. If a duration is explicitly mentioned, compute based on start and mention approximation.
- project_type — coarse category (software|marketing|design|research|construction|consulting|other) MUST NOT be empty. If unclear, infer from dominant terminology (code, feature, sprint ⇒ software; campaign, brand ⇒ marketing; layout, UX ⇒ design; study, hypothesis ⇒ research; site, build ⇒ construction; audit, advisory ⇒ consulting; else other).
- domain — industry (healthcare, finance, education, retail, ecommerce, construction, marketing, design, research, consulting, software, logistics, hospitality, energy, government, nonprofit). MUST NOT be empty. If missing, infer from keywords; if still uncertain use project_type or 'general'.
- area — narrower functional/business area (e.g. claims processing, patient onboarding, fraud analytics, onboarding, payments, analytics, infrastructure, marketing automation, supply chain optimization). MUST NOT be empty. If missing, synthesize 2-4 word functional area phrase (e.g. 'core platform operations') derived from context or project_type.
- location — geographic or site info if any
- team_size — integer (estimate). If a range (e.g. 5-7) use midpoint or lower bound and note range in missing_info.
- budget — If explicit, keep original formatting. If missing, ESTIMATE a plausible range based on project_type using USD: software 50K-150K, marketing 10K-40K, design 8K-30K, research 40K-120K, construction 250K-2M, consulting 20K-80K, other 15K-60K. Return a single representative midpoint value (e.g. USD 80K). Mark 'budget estimated' in missing_info.
- primary_stakeholder — key client, sponsor or department. If not present, leave temporarily blank; backend will fallback to current user full name.
- constraints — technical, regulatory, resource or timeline constraints
- confidence — High|Medium|Low (overall extraction confidence)
- missing_info — brief comma-separated notes about important absent or approximated items

RULES (STRICT):
1. Return ONLY a single JSON object, no markdown, no commentary.
2. Do NOT hallucinate. If a field truly absent, use null (or empty string for textual) and explain in missing_info.
3. Trim whitespace. Avoid leading bullet characters in field values except objectives which may contain newlines.
4. Keep dates strictly YYYY-MM-DD; if partial (month/year only) approximate to first day and mention approximation.
5. Do not duplicate objectives inside description.
6. NEVER return empty start_date, end_date, project_type, domain, or area.
7. If estimating budget, dates, domain, or area, clearly add notes in missing_info.

Proceed to extract now.";
    }

    /**
     * Get the system prompt for AI analysis
     */
    protected function getSystemPrompt(): string
    {
        return "You are an expert project analyst converting unstructured project documents into a strict JSON record.

CRITICAL FIELDS: name, description, objectives, start_date, end_date.

OUTPUT POLICY (STRICT ENFORCEMENT):
- Output ONLY raw JSON (no code fences, no preamble).
- Every key must appear even if value is null or empty.
- Prefer faithful extraction over invention; if uncertain leave empty and explain succinctly in missing_info.
- Keep description concise (max ~600 chars) and not a verbatim copy of objectives.
- objectives: newline separated list (no numbering punctuation, just lines) each starting with an action verb.
- Normalize dates to YYYY-MM-DD. If only month/year, use first day and note approximation in missing_info. If missing entirely assign today (start_date) & heuristic end_date (duration by project_type) and note in missing_info.
- team_size: integer only.
- budget: keep currency and magnitude as seen; do not convert units.
- constraints: combine regulatory, technical, resource, timing constraints; separate phrases with semicolons if multiple.
- confidence: High if >80% core fields found, Medium if partial, Low if most critical fields missing.
- missing_info: short phrases (comma separated) of absent or approximated fields (e.g. 'no explicit end date', 'approx start month', 'budget missing').

Return the JSON object only.";
    }

    /**
     * Build the user prompt for AI analysis
     */
    protected function buildUserPrompt(string $documentText): string
    {
        // Truncate very long documents to stay within token limits
        $maxLength = 8000; // Conservative limit for token management
        if (strlen($documentText) > $maxLength) {
            $documentText = substr($documentText, 0, $maxLength).'... [Document truncated]';
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
            'risks' => '',
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
        if (! in_array($normalized['project_type'], $validTypes)) {
            $normalized['project_type'] = 'other';
        }

        // Clean up date formats
        $normalized['start_date'] = $this->validateDate($normalized['start_date']);
        $normalized['end_date'] = $this->validateDate($normalized['end_date']);

        // Enforce mandatory start/end dates with heuristics if still empty
        $today = now()->format('Y-m-d');
        $durationMap = [
            'software' => 90,
            'marketing' => 60,
            'design' => 45,
            'research' => 120,
            'construction' => 240,
            'consulting' => 90,
            'other' => 60,
        ];
        $missingNotes = [];
        // Ensure project_type non-empty (already validated earlier but double-check)
        if ($normalized['project_type'] === '' || $normalized['project_type'] === null) {
            $normalized['project_type'] = 'other';
            $missingNotes[] = 'project_type defaulted';
        }
        // Domain heuristics if empty
        if ($normalized['domain'] === '' || $normalized['domain'] === null) {
            $keywordMap = [
                'health' => 'healthcare',
                'patient' => 'healthcare',
                'clinic' => 'healthcare',
                'fintech' => 'finance',
                'bank' => 'finance',
                'ledger' => 'finance',
                'edu' => 'education',
                'student' => 'education',
                'retail' => 'retail',
                'ecommerce' => 'e-commerce',
                'supply chain' => 'logistics',
                'logistics' => 'logistics',
                'warehouse' => 'logistics',
                'payment' => 'finance',
                'claim' => 'insurance',
                'insurance' => 'insurance',
                'construction' => 'construction',
                'marketing' => 'marketing',
                'campaign' => 'marketing',
                'analytics' => 'software',
                'platform' => 'software',
                'api' => 'software',
                'sprint' => 'software',
                'ux' => 'design',
                'design' => 'design',
                'research' => 'research',
                'consult' => 'consulting',
            ];
            $docSnippet = strtolower(substr(($normalized['description'] ?? '').' '.$normalized['objectives'], 0, 800));
            $foundDomain = '';
            foreach ($keywordMap as $needle => $domainGuess) {
                if (str_contains($docSnippet, $needle)) {
                    $foundDomain = $domainGuess;
                    break;
                }
            }
            $normalized['domain'] = $foundDomain !== '' ? $foundDomain : ($normalized['project_type'] ?: 'general');
            $missingNotes[] = 'domain inferred';
        }
        // Area heuristics if empty
        if ($normalized['area'] === '' || $normalized['area'] === null) {
            $areaMap = [
                'software' => 'core platform development',
                'marketing' => 'campaign management',
                'design' => 'user experience design',
                'research' => 'experimental analysis',
                'construction' => 'site development',
                'consulting' => 'advisory services',
                'other' => 'general operations',
            ];
            $normalized['area'] = $areaMap[$normalized['project_type']] ?? 'general operations';
            $missingNotes[] = 'area inferred';
        }
        if ($normalized['start_date'] === '') {
            $normalized['start_date'] = $today;
            $missingNotes[] = 'start date assumed today';
        }
        if ($normalized['end_date'] === '') {
            $days = $durationMap[$normalized['project_type']] ?? 60;
            $end = \Carbon\Carbon::parse($normalized['start_date'])->addDays($days)->format('Y-m-d');
            $normalized['end_date'] = $end;
            $missingNotes[] = 'end date estimated +'.$days.' days';
        }

        // Budget estimation if empty
        if ($normalized['budget'] === '') {
            $budgetHeuristics = [
                'software' => 'USD 80K',
                'marketing' => 'USD 25K',
                'design' => 'USD 18K',
                'research' => 'USD 80K',
                'construction' => 'USD 750K',
                'consulting' => 'USD 45K',
                'other' => 'USD 35K',
            ];
            $normalized['budget'] = $budgetHeuristics[$normalized['project_type']] ?? 'USD 35K';
            $missingNotes[] = 'budget estimated';
        }

        // Primary stakeholder fallback to current authenticated user
        if ($normalized['primary_stakeholder'] === '' && Auth::check()) {
            $normalized['primary_stakeholder'] = Auth::user()->name;
            $missingNotes[] = 'stakeholder defaulted to user';
        }

        // Location fallback via IP (best effort)
        if ($normalized['location'] === '') {
            try {
                // Placeholder for IP based inference (disabled due to static analysis constraints)
            } catch (\Throwable $e) {
                // swallow
            }
        }

        // Merge missing_info notes
        $existingMissing = trim((string) $normalized['missing_info']);
        if (! empty($missingNotes)) {
            $merged = array_filter(array_map('trim', array_merge(
                $existingMissing !== '' ? preg_split('/\s*,\s*/', $existingMissing) : [],
                $missingNotes
            )));
            $normalized['missing_info'] = implode(', ', array_unique($merged));
        }

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
