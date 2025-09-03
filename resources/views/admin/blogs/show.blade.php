<x-admin.layout title="View Blog Post" page-title="{{ $blog->title }}">
    <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center">
                <a href="{{ route('admin.blogs.index') }}" class="text-blue-600 hover:text-blue-800 mr-4">← Back to Blog Posts</a>
                <h1 class="text-2xl font-bold text-gray-800">{{ $blog->title }}</h1>
            </div>
            <div class="flex space-x-3">
                <a href="{{ route('admin.blogs.edit', $blog) }}" 
                   class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                    Edit
                </a>
                
                @if($blog->is_published)
                    <a href="{{ route('blog.show', $blog->slug) }}" target="_blank"
                       class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                        View Public
                    </a>
                    <form action="{{ route('admin.blogs.unpublish', $blog) }}" method="POST" class="inline">
                        @csrf
                        <button type="submit" 
                                class="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                                onclick="return confirm('Move this post to draft?')">
                            Unpublish
                        </button>
                    </form>
                @else
                    <form action="{{ route('admin.blogs.publish', $blog) }}" method="POST" class="inline">
                        @csrf
                        <button type="submit" 
                                class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                                onclick="return confirm('Publish this post now?')">
                            Publish Now
                        </button>
                    </form>
                @endif
            </div>
        </div>

        <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div><strong>Author:</strong> {{ $blog->author->name }}</div>
                    <div><strong>Status:</strong> 
                        @if($blog->is_published)
                            <span class="text-green-600">Published</span>
                        @else
                            <span class="text-yellow-600">Draft</span>
                        @endif
                    </div>
                    <div><strong>Created:</strong> {{ $blog->created_at->format('M j, Y g:i A') }}</div>
                    <div><strong>Published:</strong> {{ $blog->published_at ? $blog->published_at->format('M j, Y g:i A') : 'Not published' }}</div>
                    <div><strong>Slug:</strong> <code class="bg-gray-100 px-2 py-1 rounded">{{ $blog->slug }}</code></div>
                    <div><strong>URL:</strong> 
                        @if($blog->is_published)
                            <a href="{{ route('blog.show', $blog->slug) }}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                taskpilot.us/blog/{{ $blog->slug }}
                            </a>
                        @else
                            <span class="text-gray-400">taskpilot.us/blog/{{ $blog->slug }} (unpublished)</span>
                        @endif
                    </div>
                </div>
            </div>

            @if($blog->excerpt)
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">Excerpt</h3>
                    <p class="text-gray-700">{{ $blog->excerpt }}</p>
                </div>
            @endif

            @if($blog->featured_image)
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">Featured Image</h3>
                    <img src="{{ $blog->featured_image }}" alt="{{ $blog->title }}" class="max-w-md rounded-lg">
                </div>
            @endif

            <div class="px-6 py-4">
                <h3 class="font-medium text-gray-900 mb-4">Content</h3>
                <div class="prose max-w-none">
                    {!! $blog->formatted_content !!}
                </div>
            </div>

            @if($blog->meta_title || $blog->meta_description)
                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <h3 class="font-medium text-gray-900 mb-2">SEO Meta</h3>
                    @if($blog->meta_title)
                        <div class="mb-2">
                            <strong class="text-sm text-gray-600">Meta Title:</strong>
                            <span class="text-sm">{{ $blog->meta_title }}</span>
                        </div>
                    @endif
                    @if($blog->meta_description)
                        <div>
                            <strong class="text-sm text-gray-600">Meta Description:</strong>
                            <span class="text-sm">{{ $blog->meta_description }}</span>
                        </div>
                    @endif
                </div>
            @endif
        </div>
    </div>
</x-admin.layout>
