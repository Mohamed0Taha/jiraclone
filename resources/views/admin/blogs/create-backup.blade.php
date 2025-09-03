<x-admin.layout title="Create Blog Post" page-title="Create New Blog Post">
    <div class="container mx-auto px-4 py-6">
        <div class="flex items-center mb-6">
            <a href="{{ route('admin.blogs.index') }}" class="text-blue-600 hover:text-blue-800 mr-4">← Back to Blog Posts</a>
            <h1 class="text-2xl font-bold text-gray-800">Create New Blog Post</h1>
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

        <form action="{{ route('admin.blogs.store') }}" method="POST" class="bg-white rounded-lg shadow p-6">
            @csrf
            
            <!-- AI Generation Section -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    AI Blog Post Generator
                </h3>
                <p class="text-gray-600 mb-4">Generate SEO-optimized blog content that converts visitors to TaskPilot users</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="ai_topic" class="block text-sm font-medium text-gray-700 mb-2">Blog Topic</label>
                        <input type="text" id="ai_topic" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="e.g., 'project management best practices'">
                    </div>
                    <div>
                        <label for="ai_audience" class="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                        <select id="ai_audience" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="project managers and teams">Project Managers & Teams</option>
                            <option value="startup founders">Startup Founders</option>
                            <option value="team leads and supervisors">Team Leads & Supervisors</option>
                            <option value="business owners">Business Owners</option>
                            <option value="remote work managers">Remote Work Managers</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button type="button" onclick="generateBlogPost()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                        Generate Complete Post
                    </button>
                    <button type="button" onclick="generateIdeas()" 
                            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                        Get Topic Ideas
                    </button>
                    <button type="button" onclick="optimizeContent()" 
                            class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                        Optimize Existing Content
                    </button>
                </div>
                
                <div id="ai_loading" class="hidden mt-4">
                    <div class="flex items-center text-blue-600">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating AI content...
                    </div>
                </div>
                
                <div id="ai_ideas" class="hidden mt-4">
                    <h4 class="font-medium text-gray-900 mb-2">Generated Ideas:</h4>
                    <div id="ideas_list" class="space-y-2"></div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main Content -->
                <div class="lg:col-span-2 space-y-6">
                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                        <input type="text" name="title" id="title" value="{{ old('title') }}" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               required>
                    </div>

                    <div>
                        <label for="slug" class="block text-sm font-medium text-gray-700 mb-2">URL Slug (auto-generated if empty)</label>
                        <input type="text" name="slug" id="slug" value="{{ old('slug') }}" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="my-awesome-blog-post">
                    </div>

                    <div>
                        <label for="excerpt" class="block text-sm font-medium text-gray-700 mb-2">Excerpt (SEO Description)</label>
                        <textarea name="excerpt" id="excerpt" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Brief description for search engines and previews">{{ old('excerpt') }}</textarea>
                    </div>

                    <div>
                        <label for="content" class="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                        <textarea name="content" id="content" rows="20" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required>{{ old('content') }}</textarea>
                        <p class="text-sm text-gray-500 mt-1">Supports HTML and Markdown</p>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">Publishing</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="flex items-center">
                                    <input type="checkbox" name="is_published" value="1" {{ old('is_published') ? 'checked' : '' }}
                                           class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                    <span class="ml-2 text-sm text-gray-700">Publish immediately</span>
                                </label>
                            </div>

                            <div>
                                <label for="published_at" class="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                                <input type="datetime-local" name="published_at" id="published_at" 
                                       value="{{ old('published_at') }}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">SEO</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label for="meta_title" class="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                                <input type="text" name="meta_title" id="meta_title" value="{{ old('meta_title') }}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="Leave empty to use post title">
                            </div>

                            <div>
                                <label for="meta_description" class="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                                <textarea name="meta_description" id="meta_description" rows="3" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Leave empty to use excerpt">{{ old('meta_description') }}</textarea>
                            </div>

                            <div>
                                <label for="featured_image" class="block text-sm font-medium text-gray-700 mb-2">Featured Image URL</label>
                                <input type="url" name="featured_image" id="featured_image" value="{{ old('featured_image') }}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="https://example.com/image.jpg">
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col space-y-3">
                        <button type="submit" 
                                class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
                            Create Blog Post
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
    <script>
        // AI Generation Functions
        async function generateBlogPost() {
            const topic = document.getElementById('ai_topic').value;
            const audience = document.getElementById('ai_audience').value;
            
            if (!topic) {
                alert('Please enter a blog topic first');
                return;
            }
            
            showLoading(true);
            
            try {
                const response = await fetch('{{ route("admin.blogs.generate") }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({
                        topic: topic,
                        target_audience: audience
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Fill form fields with generated content
                    document.getElementById('title').value = data.blog.title;
                    document.getElementById('slug').value = data.blog.slug;
                    document.getElementById('excerpt').value = data.blog.excerpt;
                    document.getElementById('content').value = data.blog.content;
                    document.getElementById('meta_title').value = data.blog.meta_title;
                    document.getElementById('meta_description').value = data.blog.meta_description;
                    
                    // Set as published by default
                    document.getElementById('is_published').checked = true;
                    
                    // Set publish date to now
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    document.getElementById('published_at').value = now.toISOString().slice(0, 16);
                    
                    alert('Blog post generated successfully! Review and publish when ready.');
                } else {
                    alert('Error generating blog post: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Error generating blog post: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
        
        async function generateIdeas() {
            const topic = document.getElementById('ai_topic').value;
            
            if (!topic) {
                alert('Please enter a topic or keywords first');
                return;
            }
            
            showLoading(true);
            
            try {
                const response = await fetch('{{ route("admin.blogs.ideas") }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({
                        keywords: topic
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.ideas) {
                    showIdeas(data.ideas);
                } else {
                    alert('Error generating ideas: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Error generating ideas: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
        
        async function optimizeContent() {
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;
            
            if (!title || !content) {
                alert('Please enter a title and content first');
                return;
            }
            
            showLoading(true);
            
            try {
                const response = await fetch('{{ route("admin.blogs.optimize") }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({
                        title: title,
                        content: content
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Update form with optimized content
                    if (data.optimized.optimized_title) {
                        document.getElementById('title').value = data.optimized.optimized_title;
                        document.getElementById('slug').value = slugify(data.optimized.optimized_title);
                    }
                    if (data.optimized.meta_description) {
                        document.getElementById('meta_description').value = data.optimized.meta_description;
                    }
                    if (data.optimized.optimized_content) {
                        document.getElementById('content').value = data.optimized.optimized_content;
                    }
                    
                    alert('Content optimized for SEO!');
                } else {
                    alert('Error optimizing content: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Error optimizing content: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
        
        function showLoading(show) {
            document.getElementById('ai_loading').classList.toggle('hidden', !show);
        }
        
        function showIdeas(ideas) {
            const container = document.getElementById('ideas_list');
            const section = document.getElementById('ai_ideas');
            
            container.innerHTML = '';
            
            ideas.forEach(idea => {
                const ideaDiv = document.createElement('div');
                ideaDiv.className = 'p-3 bg-white border border-gray-200 rounded cursor-pointer hover:bg-gray-50';
                ideaDiv.onclick = () => useIdea(idea);
                ideaDiv.innerHTML = `
                    <h5 class="font-medium text-gray-900">${idea.title}</h5>
                    <p class="text-sm text-gray-600 mt-1">${idea.excerpt}</p>
                    <div class="text-xs text-blue-600 mt-2">Keywords: ${idea.target_keywords?.join(', ') || 'N/A'}</div>
                `;
                container.appendChild(ideaDiv);
            });
            
            section.classList.remove('hidden');
        }
        
        function useIdea(idea) {
            document.getElementById('ai_topic').value = idea.title;
            document.getElementById('title').value = idea.title;
            document.getElementById('excerpt').value = idea.excerpt;
            document.getElementById('slug').value = slugify(idea.title);
            
            if (confirm('Generate full blog post for this idea?')) {
                generateBlogPost();
            }
        }
        
        function slugify(text) {
            return text
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
        }

        // Auto-generate slug from title
        document.getElementById('title').addEventListener('input', function(e) {
            const slugField = document.getElementById('slug');
            if (!slugField.value) {
                slugField.value = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
            }
        });
    </script>
</x-admin.layout>
