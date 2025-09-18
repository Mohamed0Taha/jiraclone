<?php

namespace App\Services\Generative;

use App\Services\GoogleImageService;

class ImageResearchService
{
    private GoogleImageService $google;

    public function __construct(GoogleImageService $google)
    {
        $this->google = $google;
    }

    public function collect(array $keywords, int $requiredImageCount, ?string $fallbackQuery = null): array
    {
        $images = [];
        $added = [];

        foreach ($keywords as $keyword) {
            if (count($images) >= $requiredImageCount) break;
            $needed = max(3, $requiredImageCount - count($images));
            $batch = $this->google->searchImages($keyword, min(10, $needed));
            foreach ($batch as $img) {
                $key = $img['url'] ?? ($img['link'] ?? null);
                if (!$key || isset($added[$key])) continue;
                $images[] = $img; $added[$key] = true;
                if (count($images) >= $requiredImageCount) break;
            }
        }

        if (count($images) < $requiredImageCount && $fallbackQuery) {
            $needed = $requiredImageCount - count($images);
            foreach ($this->google->searchImages($fallbackQuery, min(10, $needed)) as $img) {
                $key = $img['url'] ?? ($img['link'] ?? null);
                if (!$key || isset($added[$key])) continue;
                $images[] = $img; $added[$key] = true;
                if (count($images) >= $requiredImageCount) break;
            }
        }

        return array_slice($images, 0, $requiredImageCount);
    }

    public function getBest(array $images): ?array
    {
        return $this->google->getBestImage($images);
    }

    public function formatReferences(array $images): string
    {
        if (empty($images)) {
            return '- No external references found. Default to modern Material UI patterns for this experience while preserving standard layout expectations.';
        }
        $lines = [];
        foreach ($images as $i => $img) {
            $label = $img['title'] ?? ('Reference ' . ($i + 1));
            $source = $img['source'] ?? ($img['displayLink'] ?? 'unknown source');
            $url = $img['url'] ?? ($img['link'] ?? '');
            $lines[] = sprintf('%d. %s (%s): %s', $i + 1, $label, $source, $url);
        }
        return implode("\n", $lines);
    }
}

