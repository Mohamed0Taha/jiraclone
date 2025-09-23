<x-admin.layout title="Blog Management" page-title="Blog Posts">
    <div class="container mx-auto px-4 py-6">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold text-gray-800">Blog Posts</h1>
            <a href="{{ route('admin.blogs.create') }}" 
               class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                Create New Post
            </a>
        </div>

        @if(session('success'))
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {{ session('success') }}
            </div>
        @endif

        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @forelse($blogs as $blog)
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                @if($blog->featured_image)
                                    <img src="{{ $blog->featured_image }}" alt="{{ $blog->title }}" 
                                         class="w-16 h-12 object-cover rounded">
                                @else
                                    <div class="w-16 h-12 bg-gray-100 rounded flex items-center justify-center">
                                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                    </div>
                                @endif
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">{{ $blog->title }}</div>
                                <div class="text-sm text-gray-500">{{ $blog->slug }}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ $blog->author->name }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    @if($blog->views >= 1000000)
                                        {{ number_format($blog->views / 1000000, 1) }}M
                                    @elseif($blog->views >= 1000)
                                        {{ number_format($blog->views / 1000, 1) }}K
                                    @else
                                        {{ number_format($blog->views) }}
                                    @endif
                                    views
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                @if($blog->is_published)
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Published
                                    </span>
                                @else
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        Draft
                                    </span>
                                @endif
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ $blog->published_at ? $blog->published_at->format('M j, Y') : '-' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <a href="{{ route('admin.blogs.show', $blog) }}" class="text-indigo-600 hover:text-indigo-900 mr-3">View</a>
                                <a href="{{ route('admin.blogs.edit', $blog) }}" class="text-blue-600 hover:text-blue-900 mr-3">Edit</a>
                                
                                @if($blog->is_published)
                                    <a href="{{ route('blog.show', $blog->slug) }}" target="_blank" class="text-green-600 hover:text-green-900 mr-3">Public</a>
                                    <form action="{{ route('admin.blogs.unpublish', $blog) }}" method="POST" class="inline mr-3">
                                        @csrf
                                        <button type="submit" class="text-orange-600 hover:text-orange-900" 
                                                onclick="return confirm('Move this post to draft?')">
                                            Unpublish
                                        </button>
                                    </form>
                                @else
                                    <form action="{{ route('admin.blogs.publish', $blog) }}" method="POST" class="inline mr-3">
                                        @csrf
                                        <button type="submit" class="text-green-600 hover:text-green-900" 
                                                onclick="return confirm('Publish this post now?')">
                                            Publish
                                        </button>
                                    </form>
                                @endif
                                
                                <form action="{{ route('admin.blogs.destroy', $blog) }}" method="POST" class="inline" 
                                      onsubmit="return confirm('Are you sure you want to delete this blog post?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="text-red-600 hover:text-red-900">Delete</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                                No blog posts found. <a href="{{ route('admin.blogs.create') }}" class="text-blue-600 hover:text-blue-800">Create your first post</a>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if($blogs->hasPages())
            <div class="mt-6">
                {{ $blogs->links() }}
            </div>
        @endif
    </div>
</x-admin.layout>
