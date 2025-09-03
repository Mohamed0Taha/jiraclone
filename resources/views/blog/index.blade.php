<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskPilot Blog - Project Management Tips & Insights</title>
    <meta name="description" content="Discover productivity tips, project management best practices, and insights to help your team work smarter with TaskPilot.">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
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
        <div class="text-center mb-12">
            <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">TaskPilot Blog</h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                Discover productivity tips, project management best practices, and insights to help your team work smarter.
            </p>
        </div>

        @if($blogs->count() > 0)
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                @foreach($blogs as $blog)
                    <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        @if($blog->featured_image)
                            <div class="aspect-video bg-gray-200">
                                <img src="{{ $blog->featured_image }}" alt="{{ $blog->title }}" 
                                     class="w-full h-full object-cover">
                            </div>
                        @endif
                        
                        <div class="p-6">
                            <div class="flex items-center text-sm text-gray-500 mb-3">
                                <span>{{ $blog->published_at->format('M j, Y') }}</span>
                                <span class="mx-2">•</span>
                                <span>By {{ $blog->author->name }}</span>
                            </div>
                            
                            <h2 class="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                                <a href="{{ route('blog.show', $blog->slug) }}" class="hover:text-blue-600 transition-colors">
                                    {{ $blog->title }}
                                </a>
                            </h2>
                            
                            @if($blog->excerpt)
                                <p class="text-gray-600 mb-4 line-clamp-3">{{ $blog->excerpt }}</p>
                            @endif
                            
                            <a href="{{ route('blog.show', $blog->slug) }}" 
                               class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                                Read more
                                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>
                        </div>
                    </article>
                @endforeach
            </div>

            {{ $blogs->links() }}
        @else
            <div class="text-center py-12">
                <div class="text-6xl text-gray-300 mb-4">📝</div>
                <h2 class="text-2xl font-semibold text-gray-900 mb-2">No blog posts yet</h2>
                <p class="text-gray-600">Check back soon for productivity tips and project management insights!</p>
            </div>
        @endif
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-8">
            <div class="text-center">
                <p class="text-gray-600">
                    © {{ date('Y') }} TaskPilot. All rights reserved. | 
                    <a href="{{ route('landing') }}" class="text-blue-600 hover:text-blue-800">Back to TaskPilot</a>
                </p>
            </div>
        </div>
    </footer>

    <style>
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    </style>
</body>
</html>
