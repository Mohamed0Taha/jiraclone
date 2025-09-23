<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class Blog extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'featured_image',
        'meta_title',
        'meta_description',
        'is_published',
        'published_at',
        'author_id',
        'views',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    protected $attributes = [
        'is_published' => false,
        'views' => 0,
    ];

    /**
     * Increment the view count for this blog post
     */
    public function incrementViews()
    {
        $this->increment('views');
        return $this;
    }

    /**
     * Get formatted view count (e.g., 1.2K, 5M)
     */
    public function getFormattedViewsAttribute()
    {
        $views = $this->views;
        
        if ($views >= 1000000) {
            return round($views / 1000000, 1) . 'M';
        } elseif ($views >= 1000) {
            return round($views / 1000, 1) . 'K';
        }
        
        return number_format($views);
    }

    /**
     * Scope to order by most viewed
     */
    public function scopeMostViewed($query)
    {
        return $query->orderBy('views', 'desc');
    }

    /**
     * Get SEO-optimized title
     */
    public function getSeoTitle()
    {
        return $this->meta_title ?: $this->title;
    }

    /**
     * Get SEO-optimized description
     */
    public function getSeoDescription()
    {
        return $this->meta_description ?: Str::limit(strip_tags($this->excerpt), 160);
    }

    /**
     * Get canonical URL
     */
    public function getCanonicalUrl()
    {
        return url('/blog/'.$this->slug);
    }

    /**
     * Get structured data for SEO
     */
    public function getStructuredData()
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BlogPosting',
            'headline' => $this->getSeoTitle(),
            'description' => $this->getSeoDescription(),
            'author' => [
                '@type' => 'Organization',
                'name' => 'TaskPilot Team',
                'url' => 'https://taskpilot.us',
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name' => 'TaskPilot',
                'url' => 'https://taskpilot.us',
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => 'https://taskpilot.us/logo.png',
                ],
            ],
            'mainEntityOfPage' => [
                '@type' => 'WebPage',
                '@id' => $this->getCanonicalUrl(),
            ],
            'datePublished' => $this->published_at?->toISOString(),
            'dateModified' => $this->updated_at->toISOString(),
            'image' => $this->featured_image ? [
                '@type' => 'ImageObject',
                'url' => $this->featured_image,
            ] : null,
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($blog) {
            if (empty($blog->slug)) {
                $baseSlug = Str::slug($blog->title ?: 'blog-'.Str::random(6));
                $slug = $baseSlug;

                // Ensure unique slug with incremental suffix
                $counter = 1;
                while (static::where('slug', $slug)->exists()) {
                    $slug = $baseSlug.'-'.$counter;
                    $counter++;
                    // Safety break after 100 attempts
                    if ($counter > 100) {
                        $slug = $baseSlug.'-'.Str::lower(Str::random(6));
                        break;
                    }
                }

                $blog->slug = $slug;
            }
            if (empty($blog->author_id) && Auth::check()) {
                $blog->author_id = Auth::id();
            }
        });

        static::updating(function ($blog) {
            if ($blog->isDirty('title') && empty($blog->getOriginal('slug'))) {
                $blog->slug = Str::slug($blog->title);
            }
        });
    }

    /**
     * Get formatted content for display (with HTML formatting)
     */
    public function getFormattedContentAttribute()
    {
        try {
            $blogAIService = app(\App\Services\BlogAIService::class);

            return $blogAIService->formatBlogContent($this->content);
        } catch (\Throwable $e) {
            \Log::warning('Blog formatted content fallback due to service error', [
                'error' => $e->getMessage(),
                'blog_id' => $this->id ?? null,
            ]);

            // Fallback: return raw content so page still renders
            return $this->content;
        }
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function getRouteKeyName()
    {
        return 'slug';
    }

    public function getExcerptAttribute($value)
    {
        return $value ?: Str::limit(strip_tags($this->content), 160);
    }

    /**
     * Get blog analytics data
     */
    public static function getAnalytics()
    {
        return [
            'total_blogs' => static::count(),
            'published_blogs' => static::published()->count(),
            'total_views' => static::sum('views'),
            'most_viewed' => static::mostViewed()->first(),
            'average_views' => static::avg('views'),
        ];
    }
}
