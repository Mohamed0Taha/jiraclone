<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $blog->meta_title ?: $blog->title }} - TaskPilot Blog</title>
    <meta name="description" content="{{ $blog->meta_description ?: $blog->excerpt }}">
    <meta property="og:title" content="{{ $blog->meta_title ?: $blog->title }}">
    <meta property="og:description" content="{{ $blog->meta_description ?: $blog->excerpt }}">
    @if($blog->featured_image)
        <meta property="og:image" content="{{ $blog->featured_image }}">
    @endif
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="{{ $blog->published_at->toISOString() }}">
    <meta property="article:author" content="{{ $blog->author->name }}">
    
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .prose { max-width: none; }
        .prose h1 { font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1rem; }
        .prose h2 { font-size: 1.5rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem; margin-top: 2rem; }
        .prose h3 { font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .prose p { color: #374151; margin-bottom: 1rem; line-height: 1.625; }
        .prose ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .prose ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
        .prose li { margin-bottom: 0.25rem; color: #374151; }
        .prose blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; font-style: italic; color: #4b5563; margin: 1rem 0; }
        .prose code { background-color: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; }
        .prose pre { background-color: #111827; color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
        .prose a { color: #2563eb; text-decoration: underline; }
        .prose a:hover { color: #1e40af; }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-8">
                    <a href="{{ route('landing') }}" class="text-2xl font-bold text-blue-600">TaskPilot</a>
                    <nav class="hidden md:flex space-x-6">
                        <a href="{{ route('landing') }}" class="text-gray-600 hover:text-gray-900 transition-colors">Home</a>
                        <a href="{{ route('blog.index') }}" class="text-blue-600 font-medium">Blog</a>
                    </nav>
                </div>
                <div class="flex items-center space-x-4">
                    @auth
                        <a href="{{ route('dashboard') }}" class="text-gray-600 hover:text-gray-900">Dashboard</a>
                    @else
                        <a href="{{ route('login') }}" class="text-gray-600 hover:text-gray-900">Login</a>
                        <a href="{{ route('register') }}" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Get Started</a>
                    @endauth
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-12">
        <div class="max-w-4xl mx-auto">
            <!-- Breadcrumb -->
            <nav class="text-sm text-gray-500 mb-8">
                <a href="{{ route('landing') }}" class="hover:text-gray-700">Home</a>
                <span class="mx-2">/</span>
                <a href="{{ route('blog.index') }}" class="hover:text-gray-700">Blog</a>
                <span class="mx-2">/</span>
                <span class="text-gray-900">{{ $blog->title }}</span>
            </nav>

            <!-- Article Header -->
            <header class="mb-8">
                <div class="flex items-center text-sm text-gray-500 mb-4">
                    <time datetime="{{ $blog->published_at->toISOString() }}">
                        {{ $blog->published_at->format('F j, Y') }}
                    </time>
                    <span class="mx-2">•</span>
                    <span>By {{ $blog->author->name }}</span>
                </div>
                
                <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                    {{ $blog->title }}
                </h1>
                
                @if($blog->excerpt)
                    <p class="text-xl text-gray-600 leading-relaxed">{{ $blog->excerpt }}</p>
                @endif
            </header>

            @if($blog->featured_image)
                <div class="mb-8">
                    <img src="{{ $blog->featured_image }}" alt="{{ $blog->title }}" 
                         class="w-full rounded-lg shadow-lg">
                </div>
            @endif

            <!-- Article Content -->
            <article class="prose prose-lg max-w-none">
                                {!! $blog->formatted_content !!}
            </article>

            <!-- Author Bio -->
            <div class="mt-12 p-6 bg-white rounded-lg shadow-sm border">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg">
                        {{ substr($blog->author->name, 0, 1) }}
                    </div>
                    <div class="ml-4">
                        <h3 class="font-semibold text-gray-900">{{ $blog->author->name }}</h3>
                        <p class="text-gray-600">Author at TaskPilot</p>
                    </div>
                </div>
            </div>

            <!-- Related Posts -->
            @if($relatedPosts->count() > 0)
                <section class="mt-16">
                    <h2 class="text-2xl font-bold text-gray-900 mb-8">Related Posts</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @foreach($relatedPosts as $related)
                            <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                @if($related->featured_image)
                                    <div class="aspect-video bg-gray-200">
                                        <img src="{{ $related->featured_image }}" alt="{{ $related->title }}" 
                                             class="w-full h-full object-cover">
                                    </div>
                                @endif
                                
                                <div class="p-4">
                                    <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">
                                        <a href="{{ route('blog.show', $related->slug) }}" class="hover:text-blue-600 transition-colors">
                                            {{ $related->title }}
                                        </a>
                                    </h3>
                                    
                                    @if($related->excerpt)
                                        <p class="text-gray-600 text-sm line-clamp-3 mb-3">{{ $related->excerpt }}</p>
                                    @endif
                                    
                                    <div class="text-xs text-gray-500">
                                        {{ $related->published_at->format('M j, Y') }}
                                    </div>
                                </div>
                            </article>
                        @endforeach
                    </div>
                </section>
            @endif

            <!-- CTA Section -->
            <section class="mt-16 text-center">
                <div class="bg-blue-600 text-white rounded-lg p-8">
                    <h2 class="text-2xl font-bold mb-4">Ready to boost your team's productivity?</h2>
                    <p class="text-blue-100 mb-6">Join thousands of teams already using TaskPilot to manage their projects efficiently.</p>
                    <a href="{{ route('register') }}" 
                       class="bg-white text-blue-600 px-6 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors">
                        Get Started Free
                    </a>
                </div>
            </section>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-8">
            <div class="text-center">
                <p class="text-gray-600">
                    © {{ date('Y') }} TaskPilot. All rights reserved. | 
                    <a href="{{ route('blog.index') }}" class="text-blue-600 hover:text-blue-800">Blog</a> |
                    <a href="{{ route('landing') }}" class="text-blue-600 hover:text-blue-800">Home</a>
                </p>
            </div>
        </div>
    </footer>

    <style>
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    </style>
</body>
</html>
