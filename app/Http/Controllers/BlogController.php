<?php

namespace App\Http\Controllers;

use App\Models\Blog;

class BlogController extends Controller
{
    public function index()
    {
        $blogs = Blog::published()
            ->with('author')
            ->orderBy('published_at', 'desc')
            ->paginate(12);

        return view('blog.index', compact('blogs'));
    }

    public function show(Blog $blog)
    {
        if (!$blog->is_published || ($blog->published_at && $blog->published_at->isFuture())) {
            abort(404);
        }
        // Ensure required relations are loaded (avoid lazy-loading exception in prod)
        $blog->loadMissing('author');

        // Related posts (eager load author for potential future use)
        $relatedPosts = Blog::published()
            ->where('id', '!=', $blog->id)
            ->with('author')
            ->inRandomOrder()
            ->limit(3)
            ->get();

        return view('blog.show', compact('blog', 'relatedPosts'));
    }
}
