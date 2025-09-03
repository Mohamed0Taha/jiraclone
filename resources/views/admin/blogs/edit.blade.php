<x-admin.layout title="Edit Blog Post" page-title="Edit: {{ $blog->title }}">
    <div class="container mx-auto px-4 py-6">
        <div class="flex items-center mb-6">
            <a href="{{ route('admin.blogs.index') }}" class="text-blue-600 hover:text-blue-800 mr-4">← Back to Blog Posts</a>
            <h1 class="text-2xl font-bold text-gray-800">Edit Blog Post</h1>
        </div>

        @if ($errors->any())
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <ul class="list-disc list-inside">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form action="{{ route('admin.blogs.update', $blog) }}" method="POST" enctype="multipart/form-data" class="bg-white rounded-lg shadow p-6">
            @csrf
            @method('PUT')
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main Content -->
                <div class="lg:col-span-2 space-y-6">
                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                        <input type="text" name="title" id="title" value="{{ old('title', $blog->title) }}" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               required>
                    </div>

                    <div>
                        <label for="slug" class="block text-sm font-medium text-gray-700 mb-2">URL Slug</label>
                        <input type="text" name="slug" id="slug" value="{{ old('slug', $blog->slug) }}" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               required>
                        @if($blog->is_published)
                            <p class="text-sm text-amber-600 mt-1">⚠️ Changing slug of published post will break existing links</p>
                        @endif
                    </div>

                    <div>
                        <label for="excerpt" class="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                        <textarea name="excerpt" id="excerpt" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">{{ old('excerpt', $blog->excerpt) }}</textarea>
                    </div>

                    <div>
                        <label for="content" class="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                        <textarea name="content" id="content" rows="20" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required>{{ old('content', $blog->content) }}</textarea>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">Publishing</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="flex items-center">
                                    <input type="checkbox" name="is_published" value="1" 
                                           {{ old('is_published', $blog->is_published) ? 'checked' : '' }}
                                           class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                    <span class="ml-2 text-sm text-gray-700">Published</span>
                                </label>
                            </div>

                            <div>
                                <label for="published_at" class="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                                <input type="datetime-local" name="published_at" id="published_at" 
                                       value="{{ old('published_at', $blog->published_at?->format('Y-m-d\TH:i')) }}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">SEO</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label for="meta_title" class="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                                <input type="text" name="meta_title" id="meta_title" value="{{ old('meta_title', $blog->meta_title) }}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>

                            <div>
                                <label for="meta_description" class="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                                <textarea name="meta_description" id="meta_description" rows="3" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">{{ old('meta_description', $blog->meta_description) }}</textarea>
                            </div>

                            <div>
                                <label for="featured_image_file" class="block text-sm font-medium text-gray-700 mb-2">Featured Image Upload</label>
                                <input type="file" name="featured_image_file" id="featured_image_file" accept="image/*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                                <p class="text-xs text-gray-500 mt-1">Upload JPG, PNG, GIF, or WebP (max 5MB)</p>
                                
                                <!-- Current Image Preview -->
                                @if($blog->featured_image)
                                    <div class="mt-3">
                                        <p class="text-sm text-gray-600 mb-2">Current featured image:</p>
                                        <img src="{{ $blog->featured_image }}" alt="Current featured image" class="max-w-xs max-h-48 rounded-lg border">
                                    </div>
                                @endif
                                
                                <!-- New Image Preview -->
                                <div id="image_preview" class="hidden mt-3">
                                    <p class="text-sm text-gray-600 mb-2">New image preview:</p>
                                    <img id="preview_img" src="" alt="Preview" class="max-w-xs max-h-48 rounded-lg border">
                                    <button type="button" onclick="clearImagePreview()" class="ml-2 text-red-600 hover:text-red-800 text-sm">Remove</button>
                                </div>
                            </div>

                            <div class="text-center text-gray-500 text-sm">
                                OR
                            </div>

                            <div>
                                <label for="featured_image" class="block text-sm font-medium text-gray-700 mb-2">Featured Image URL</label>
                                <input type="url" name="featured_image" id="featured_image" value="{{ old('featured_image', $blog->featured_image) }}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col space-y-3">
                        <button type="submit" 
                                class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
                            Update Blog Post
                        </button>
                        <a href="{{ route('admin.blogs.index') }}" 
                           class="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors text-center">
                            Cancel
                        </a>
                    </div>
                </div>
            </div>
        </form>
    </div>

    <script>
        // Image preview functionality
        document.getElementById('featured_image_file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('preview_img').src = e.target.result;
                    document.getElementById('image_preview').classList.remove('hidden');
                    
                    // Clear the URL field when file is selected
                    document.getElementById('featured_image').value = '';
                };
                reader.readAsDataURL(file);
            }
        });

        // Clear image preview
        function clearImagePreview() {
            document.getElementById('featured_image_file').value = '';
            document.getElementById('image_preview').classList.add('hidden');
            document.getElementById('preview_img').src = '';
        }

        // Featured image URL handling
        document.getElementById('featured_image').addEventListener('input', function(e) {
            if (e.target.value) {
                // Clear file upload when URL is entered
                document.getElementById('featured_image_file').value = '';
                clearImagePreview();
            }
        });
    </script>
</x-admin.layout>
