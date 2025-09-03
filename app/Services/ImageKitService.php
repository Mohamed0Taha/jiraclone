<?php

namespace App\Services;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use ImageKit\ImageKit;

/**
 * ImageKit service using the official SDK
 * Docs: https://imagekit.io/docs/integration/php
 */
class ImageKitService
{
    protected $imageKit;

    public function __construct()
    {
        $this->requireConfig();

        $this->imageKit = new ImageKit(
            config('services.imagekit.public_key'),
            config('services.imagekit.private_key'),
            config('services.imagekit.url_endpoint')
        );
    }

    protected function requireConfig(): void
    {
        foreach (['services.imagekit.public_key', 'services.imagekit.private_key', 'services.imagekit.url_endpoint'] as $key) {
            if (empty(config($key))) {
                throw new Exception("Missing configuration: {$key}");
            }
        }
    }

    public function upload(UploadedFile $file, ?string $folder = null): array
    {
        $folder = $folder ?: config('services.imagekit.default_folder', 'tasks');
        $allowed = (array) config('services.imagekit.allowed_mime', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
        $max = (int) config('services.imagekit.max_size_bytes', 5 * 1024 * 1024);

        if (! in_array($file->getMimeType(), $allowed)) {
            throw new Exception('Unsupported image type: '.$file->getMimeType());
        }
        if ($file->getSize() > $max) {
            throw new Exception('File too large (max '.round($max / 1024 / 1024, 1).'MB)');
        }

        $raw = file_get_contents($file->getRealPath());
        if ($raw === false) {
            throw new Exception('Unable to read uploaded file');
        }

        $name = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $ext = $file->getClientOriginalExtension();
        $finalName = $name.'-'.uniqid().'.'.$ext;

        try {
            $uploadResult = $this->imageKit->uploadFile([
                'file' => base64_encode($raw),
                'fileName' => $finalName,
                'folder' => '/'.$folder,
                'useUniqueFileName' => false,
            ]);
        } catch (\Throwable $e) {
            Log::error('ImageKit upload failed', [
                'error' => $e->getMessage(),
                'file' => $finalName,
            ]);
            throw new Exception('Image upload failed: '.$e->getMessage());
        }

        if (! empty($uploadResult->error)) {
            Log::error('ImageKit upload API error', [
                'error' => $uploadResult->error,
                'file' => $finalName,
            ]);
            throw new Exception('Image upload failed: '.$uploadResult->error->message ?? 'Unknown error');
        }

        $result = $uploadResult->result;

        return [
            'file_id' => $result->fileId ?? null,
            'url' => $result->url ?? null,
            'thumbnail_url' => $result->thumbnailUrl ?? null,
            'width' => $result->width ?? null,
            'height' => $result->height ?? null,
        ];
    }

    /**
     * Upload image from URL (useful for AI-generated images)
     */
    public function uploadFromUrl(string $imageUrl, ?string $folder = null, ?string $fileName = null): array
    {
        $folder = $folder ?: config('services.imagekit.default_folder', 'tasks');
        $fileName = $fileName ?: 'ai-generated-' . time() . '.png';

        try {
            // Download the image from the URL
            $imageContent = file_get_contents($imageUrl);
            if ($imageContent === false) {
                throw new Exception('Failed to download image from URL');
            }

            // Create a temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'imagekit_upload');
            file_put_contents($tempFile, $imageContent);

            // Upload to ImageKit
            $uploadResult = $this->imageKit->upload([
                'file' => fopen($tempFile, 'r'),
                'fileName' => $fileName,
                'folder' => $folder,
            ]);

            // Clean up temp file
            unlink($tempFile);

            if (!empty($uploadResult->error)) {
                Log::error('ImageKit upload from URL failed', [
                    'error' => $uploadResult->error,
                    'url' => $imageUrl,
                ]);
                throw new Exception('ImageKit upload failed: ' . json_encode($uploadResult->error));
            }

            $result = $uploadResult->result ?? $uploadResult;

            return [
                'file_id' => $result->fileId ?? null,
                'url' => $result->url ?? null,
                'thumbnail_url' => $result->thumbnailUrl ?? null,
                'width' => $result->width ?? null,
                'height' => $result->height ?? null,
            ];

        } catch (\Throwable $e) {
            Log::error('ImageKit upload from URL exception', [
                'error' => $e->getMessage(),
                'url' => $imageUrl,
            ]);
            throw $e;
        }
    }

    public function delete(string $fileId): bool
    {
        try {
            $deleteResult = $this->imageKit->deleteFile($fileId);

            if (! empty($deleteResult->error)) {
                Log::error('ImageKit delete failed', [
                    'error' => $deleteResult->error,
                    'fileId' => $fileId,
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('ImageKit delete exception', [
                'error' => $e->getMessage(),
                'fileId' => $fileId,
            ]);

            return false;
        }
    }
}
