<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * GoogleImageService - Fetches design inspiration images from Google Images
 * Used to enhance GenerativeUIService with visual design references
 */
class GoogleImageService
{
    /**
     * Search for images using Google Custom Search API
     * Falls back to placeholder if API is not available
     */
    public function searchImages(string $query, int $limit = 3): array
    {
        try {
            // First try Google Custom Search API if configured
            $apiKey = config('services.google.search_api_key');
            $searchEngineId = config('services.google.search_engine_id');
            
            if ($apiKey && $searchEngineId) {
                return $this->searchWithGoogleApi($query, $limit, $apiKey, $searchEngineId);
            }
            
            // Fallback to generating placeholder URLs for development
            Log::info('GoogleImageService: Using placeholder images (no API key configured)', [
                'query' => $query,
                'limit' => $limit
            ]);
            
            return $this->generatePlaceholderImages($query, $limit);
            
        } catch (Exception $e) {
            Log::error('GoogleImageService: Image search failed', [
                'query' => $query,
                'error' => $e->getMessage()
            ]);
            
            // Return placeholder images as fallback
            return $this->generatePlaceholderImages($query, $limit);
        }
    }
    
    /**
     * Search images using Google Custom Search API
     */
    private function searchWithGoogleApi(string $query, int $limit, string $apiKey, string $searchEngineId): array
    {
        $response = Http::timeout(30)->get('https://www.googleapis.com/customsearch/v1', [
            'key' => $apiKey,
            'cx' => $searchEngineId,
            'q' => $query,
            'searchType' => 'image',
            'num' => min($limit, 10), // Max 10 per request
            'safe' => 'active',
            'imgSize' => 'large',
            'imgType' => 'photo'
        ]);
        
        if (!$response->successful()) {
            throw new Exception('Google Custom Search API request failed: ' . $response->status());
        }
        
        $data = $response->json();
        $images = [];
        
        if (isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $item) {
                if (count($images) >= $limit) break;
                
                $images[] = [
                    'url' => $item['link'] ?? '',
                    'thumbnail' => $item['image']['thumbnailLink'] ?? '',
                    'title' => $item['title'] ?? '',
                    'width' => $item['image']['width'] ?? 0,
                    'height' => $item['image']['height'] ?? 0,
                    'source' => 'google_custom_search'
                ];
            }
        }
        
        Log::info('GoogleImageService: Found images via API', [
            'query' => $query,
            'count' => count($images)
        ]);
        
        return $images;
    }
    
    /**
     * Generate placeholder images for development/fallback
     */
    private function generatePlaceholderImages(string $query, int $limit): array
    {
        $images = [];
        $baseUrl = 'https://picsum.photos';
        $seed = abs(crc32($query));
        
        // Common design-focused dimensions
        $dimensions = [
            ['width' => 800, 'height' => 600],
            ['width' => 1200, 'height' => 800],
            ['width' => 900, 'height' => 700]
        ];
        
        for ($i = 0; $i < $limit; $i++) {
            $dim = $dimensions[$i % count($dimensions)];
            $uniqueSeed = $seed + $i;
            
            $images[] = [
                'url' => "{$baseUrl}/{$dim['width']}/{$dim['height']}?random={$uniqueSeed}",
                'thumbnail' => "{$baseUrl}/300/200?random={$uniqueSeed}",
                'title' => "Design inspiration for: {$query}",
                'width' => $dim['width'],
                'height' => $dim['height'],
                'source' => 'placeholder'
            ];
        }
        
        return $images;
    }
    
    /**
     * Get the best image from search results based on size and quality
     */
    public function getBestImage(array $images): ?array
    {
        if (empty($images)) {
            return null;
        }
        
        // Score images based on size and aspect ratio
        $scored = array_map(function ($image) {
            $width = $image['width'] ?? 800;
            $height = $image['height'] ?? 600;
            $aspectRatio = $width / $height;
            
            // Prefer landscape images with good aspect ratios for UI design
            $aspectScore = (abs($aspectRatio - 1.33) < 0.5) ? 10 : 5; // 4:3 ratio preferred
            $sizeScore = min(($width * $height) / 10000, 10); // Size score up to 10
            
            return [
                'image' => $image,
                'score' => $aspectScore + $sizeScore
            ];
        }, $images);
        
        // Sort by score descending
        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        
        return $scored[0]['image'] ?? null;
    }
}