<?php

namespace App\Jobs;

use App\Models\Blog;
use App\Services\BlogAIService;
use App\Services\ImageKitService;
use App\Services\OpenAIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateBlogFeaturedImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;

    public $timeout = 60; // seconds

    public function __construct(public int $blogId) {}

    public function handle(OpenAIService $openAI, ImageKitService $imageKit, BlogAIService $blogAI)
    {
        $blog = Blog::find($this->blogId);
        if (! $blog) {
            Log::warning('GenerateBlogFeaturedImage: blog missing', ['blog_id' => $this->blogId]);

            return;
        }
        if ($blog->featured_image) {
            Log::info('GenerateBlogFeaturedImage: image already present', ['blog_id' => $blog->id]);

            return;
        }
        try {
            $url = $blogAI->generateFeaturedImage($blog->title, $blog->excerpt ?? '', $blog->title);
            if ($url) {
                $blog->update(['featured_image' => $url]);
                Log::info('GenerateBlogFeaturedImage: stored image', ['blog_id' => $blog->id]);
            }
        } catch (\Throwable $e) {
            Log::error('GenerateBlogFeaturedImage failed', [
                'blog_id' => $blog->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
