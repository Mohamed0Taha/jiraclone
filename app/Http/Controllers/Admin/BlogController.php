<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Blog;
use App\Services\BlogAIService;
use App\Services\ImageKitService;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Jobs\GenerateBlogFeaturedImage;

class BlogController extends Controller
{
    public function index()
    {
        $blogs = Blog::with('author')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return view('admin.blogs.index', compact('blogs'));
    }

    public function create()
    {
        return view('admin.blogs.create');
    }

    public function store(Request $request, ImageKitService $imageKit)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            // We'll enforce uniqueness manually to permit auto-suffixing
            'slug' => 'nullable|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'content' => 'required|string',
            'featured_image_file' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp|max:5120',
            'featured_image' => 'nullable|url',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
        ]);

        // Generate desired slug (could be empty or duplicates)
        $baseSlug = Str::slug($validated['slug'] ?: $validated['title']);
        if ($baseSlug === '') {
            $baseSlug = 'blog-'.Str::random(6);
        }
        $slug = $baseSlug;
        $counter = 1;
        while (\App\Models\Blog::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$counter;
            $counter++;
            if ($counter > 100) { // safety break
                $slug = $baseSlug.'-'.Str::lower(Str::random(6));
                break;
            }
        }
        $validated['slug'] = $slug;

        // Handle publication status safely
        // All new blog posts are created as unpublished by default
        $validated['is_published'] = false;
        $validated['published_at'] = null;

        // Handle image upload
        if ($request->hasFile('featured_image_file')) {
            try {
                $upload = $imageKit->upload($request->file('featured_image_file'), 'blog-featured');
                $validated['featured_image'] = $upload['url'] ?? null;
            } catch (\Exception $e) {
                return back()->withErrors(['featured_image_file' => 'Image upload failed: ' . $e->getMessage()]);
            }
        }

        $validated['author_id'] = Auth::id();

        Blog::create($validated);

        return redirect()
            ->route('admin.blogs.index')
            ->with('success', 'Blog post created as draft! You can publish it when ready.');
    }

    public function show(Blog $blog)
    {
        return view('admin.blogs.show', compact('blog'));
    }

    public function edit(Blog $blog)
    {
        return view('admin.blogs.edit', compact('blog'));
    }

    public function update(Request $request, Blog $blog, ImageKitService $imageKit)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            // Custom uniqueness handling below
            'slug' => ['nullable', 'string', 'max:255'],
            'excerpt' => 'nullable|string|max:500',
            'content' => 'required|string',
            'featured_image_file' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp|max:5120',
            'featured_image' => 'nullable|url',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
            'is_published' => 'nullable|boolean',
            'published_at' => 'nullable|date',
        ]);

        $incomingSlug = Str::slug($validated['slug'] ?: $validated['title']);
        if ($incomingSlug === '') {
            $incomingSlug = 'blog-'.Str::random(6);
        }
        if ($incomingSlug !== $blog->slug) {
            $baseSlug = $incomingSlug;
            $uniqueSlug = $baseSlug;
            $counter = 1;
            while (\App\Models\Blog::where('slug', $uniqueSlug)->where('id', '!=', $blog->id)->exists()) {
                $uniqueSlug = $baseSlug.'-'.$counter;
                $counter++;
                if ($counter > 100) {
                    $uniqueSlug = $baseSlug.'-'.Str::lower(Str::random(6));
                    break;
                }
            }
            $validated['slug'] = $uniqueSlug;
        } else {
            $validated['slug'] = $blog->slug; // unchanged
        }

        // Handle publication status safely
        $isPublished = $request->boolean('is_published', false);
        if ($isPublished && empty($validated['published_at']) && !$blog->is_published) {
            $validated['published_at'] = now();
        }
        $validated['is_published'] = $isPublished;

        // Handle image upload
        if ($request->hasFile('featured_image_file')) {
            try {
                $upload = $imageKit->upload($request->file('featured_image_file'), 'blog-featured');
                $validated['featured_image'] = $upload['url'] ?? null;
            } catch (\Exception $e) {
                return back()->withErrors(['featured_image_file' => 'Image upload failed: ' . $e->getMessage()]);
            }
        }

        $blog->update($validated);

        return redirect()
            ->route('admin.blogs.index')
            ->with('success', 'Blog post updated successfully!');
    }

    public function destroy(Blog $blog)
    {
        $blog->delete();

        return redirect()
            ->route('admin.blogs.index')
            ->with('success', 'Blog post deleted successfully!');
    }

    /**
     * Generate AI blog post
     */
    public function generate(Request $request, OpenAIService $openAI, ImageKitService $imageKit)
    {
        $request->validate([
            'topic' => 'required|string|max:255',
            'target_audience' => 'nullable|string|max:255',
        ]);

        try {
            $blogAI = new BlogAIService($openAI, $imageKit);

            $blogData = $blogAI->generateBlogPost(
                $request->topic,
                $request->target_audience ?? 'project managers and teams'
            );

            // Do NOT persist here to avoid duplicate drafts. User will save via the create form.
            // Provide a suggested slug so front-end can show it.
            $suggestedSlug = Str::slug($blogData['title'] ?? 'untitled-blog-post');
            if ($suggestedSlug === '') {
                $suggestedSlug = 'blog-'.Str::lower(Str::random(6));
            }

            return response()->json([
                'success' => true,
                'blog' => array_merge($blogData, [
                    'id' => null,
                    'slug' => $suggestedSlug,
                ]),
                'draft_saved' => false,
                'image_job_dispatched' => false,
                'note' => 'Content generated only; not yet saved.'
            ]);
        } catch (\Exception $e) {
            Log::error('Blog generation failed', [
                'error' => $e->getMessage(),
                'topic' => $request->topic,
                'target_audience' => $request->target_audience,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate blog post: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate blog ideas
     */
    public function ideas(Request $request)
    {
        $request->validate([
            'keywords' => 'required|string|max:255',
        ]);

        try {
            // Create services with proper dependency injection
            $openAIService = new \App\Services\OpenAIService();
            $imageKitService = new \App\Services\ImageKitService();
            $blogAI = new \App\Services\BlogAIService($openAIService, $imageKitService);
            
            $ideas = $blogAI->generateBlogIdeas($request->keywords);

            return response()->json([
                'success' => true,
                'ideas' => $ideas
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate ideas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Optimize blog content for SEO
     */
    public function optimize(Request $request, OpenAIService $openAI, ImageKitService $imageKit)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        try {
            $blogAI = new BlogAIService($openAI, $imageKit);
            $optimized = $blogAI->optimizeForSEO(
                $request->title,
                $request->content
            );

            return response()->json([
                'success' => true,
                'optimized' => $optimized
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to optimize content: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate featured image for blog post
     */
    public function generateImage(Request $request, OpenAIService $openAI, ImageKitService $imageKit)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'topic' => 'nullable|string|max:255',
        ]);

        try {
            $blogAI = new BlogAIService($openAI, $imageKit);
            
            $imageData = $blogAI->generateFeaturedImage(
                $request->title,
                $request->excerpt ?? '',
                $request->topic ?? ''
            );

            if ($imageData['success']) {
                return response()->json([
                    'success' => true,
                    'image_url' => $imageData['url'],
                    'file_id' => $imageData['file_id'] ?? null,
                    'thumbnail_url' => $imageData['thumbnail_url'] ?? null,
                    'message' => 'Featured image generated and saved to ImageKit successfully!'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => $imageData['error']
                ], 422);
            }
        } catch (\Exception $e) {
            Log::error('Blog image generation failed', [
                'error' => $e->getMessage(),
                'title' => $request->title,
                'excerpt' => $request->excerpt,
                'topic' => $request->topic,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate image: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Publish a draft blog post
     */
    public function publish(Blog $blog)
    {
        if ($blog->is_published) {
            return redirect()
                ->route('admin.blogs.index')
                ->with('error', 'Blog post is already published.');
        }
        
        $blog->update([
            'is_published' => true,
            'published_at' => now(),
        ]);
        
        return redirect()
            ->route('admin.blogs.index')
            ->with('success', 'Blog post published successfully!');
    }
    
    /**
     * Unpublish a published blog post (move to draft)
     */
    public function unpublish(Blog $blog)
    {
        if (!$blog->is_published) {
            return redirect()
                ->route('admin.blogs.index')
                ->with('error', 'Blog post is already a draft.');
        }
        
        $blog->update([
            'is_published' => false,
            'published_at' => null,
        ]);
        
        return redirect()
            ->route('admin.blogs.index')
            ->with('success', 'Blog post moved to draft successfully!');
    }

    /**
     * Lightweight status endpoint for polling featured image availability
     */
    public function status(Blog $blog)
    {
        return response()->json([
            'success' => true,
            'blog_id' => $blog->id,
            'featured_image' => $blog->featured_image,
            'image_pending' => empty($blog->featured_image),
        ]);
    }
}
