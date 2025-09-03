<x-admin.layout title="Create Blog Post" page-title="Create New Blog Post">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
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

        <!-- AI Generation Section -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">🤖 AI Blog Post Generator</h3>
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
                    🚀 Generate Complete Post
                </button>
                <button type="button" onclick="generateIdeas()" 
                        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                    💡 Get Topic Ideas
                </button>
            </div>
            
            <div id="ai_loading" class="hidden mt-4">
                <div class="flex items-center text-blue-600">
                    <svg class="animate-spin mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating AI content...
                </div>
            </div>
            
            <div id="ai_ideas" class="hidden mt-4">
                <h4 class="font-medium text-gray-900 mb-2">Generated Ideas (click to use):</h4>
                <div id="ideas_list" class="space-y-2"></div>
            </div>
        </div>

        <form action="{{ route('admin.blogs.store') }}" method="POST" class="bg-white rounded-lg shadow p-6">
            @csrf
            
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
                        <label for="slug" class="block text-sm font-medium text-gray-700 mb-2">URL Slug</label>
                        <input type="text" name="slug" id="slug" value="{{ old('slug') }}" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="auto-generated-from-title">
                        <p class="text-sm text-gray-500 mt-1">Leave empty to auto-generate from title</p>
                    </div>

                    <div>
                        <label for="excerpt" class="block text-sm font-medium text-gray-700 mb-2">Excerpt (SEO Description)</label>
                        <textarea name="excerpt" id="excerpt" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Brief description for search engines and social media">{{ old('excerpt') }}</textarea>
                        <p class="text-sm text-gray-500 mt-1">150-160 characters for optimal SEO</p>
                    </div>

                    <div>
                        <label for="content" class="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                        <textarea name="content" id="content" rows="20" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required>{{ old('content') }}</textarea>
                        <p class="text-sm text-gray-500 mt-1">Supports HTML. Focus on value and conversion to TaskPilot.</p>
                    </div>
                </div>

                <!-- Sidebar Settings -->
                <div class="space-y-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">Publishing</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="flex items-center">
                                    <input type="checkbox" name="is_published" id="is_published" value="1" 
                                           {{ old('is_published') ? 'checked' : '' }}
                                           class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                    <span class="ml-2 text-sm text-gray-700">Publish immediately</span>
                                </label>
                            </div>
                            
                            <div>
                                <label for="published_at" class="block text-sm font-medium text-gray-700 mb-2">Publish Date & Time</label>
                                <input type="datetime-local" name="published_at" id="published_at" 
                                       value="{{ old('published_at') }}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">SEO & Marketing</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label for="meta_title" class="block text-sm font-medium text-gray-700 mb-2">SEO Title</label>
                                <input type="text" name="meta_title" id="meta_title" value="{{ old('meta_title') }}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="Leave empty to use post title">
                                <p class="text-sm text-gray-500 mt-1">60 characters max for optimal SEO</p>
                            </div>
                            
                            <div>
                                <label for="meta_description" class="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                                <textarea name="meta_description" id="meta_description" rows="3" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="SEO description for search engines">{{ old('meta_description') }}</textarea>
                                <p class="text-sm text-gray-500 mt-1">150-160 characters for optimal SEO</p>
                            </div>

                            <div>
                                <label for="featured_image" class="block text-sm font-medium text-gray-700 mb-2">Featured Image URL</label>
                                <input type="url" name="featured_image" id="featured_image" value="{{ old('featured_image') }}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="https://example.com/image.jpg">
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-900 mb-4">💡 AI Tips</h3>
                        <ul class="text-sm text-gray-600 space-y-2">
                            <li>• Use AI generator for conversion-focused content</li>
                            <li>• Every post should tie back to TaskPilot benefits</li>
                            <li>• Include actionable tips and real examples</li>
                            <li>• Target 1500-2000 words for SEO</li>
                            <li>• End with strong call-to-action</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="flex justify-end space-x-4 pt-6 border-t">
                <a href="{{ route('admin.blogs.index') }}" 
                   class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                </a>
                <button type="submit" 
                        class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Create Blog Post
                </button>
            </div>
        </form>
    </div>

    <script>
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

        // Confirmation Dialog Function
        function showConfirmDialog(message, type = 'info') {
            return new Promise((resolve) => {
                // Create modal overlay
                const overlay = document.createElement('div');
                overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
                
                // Create modal content
                const modal = document.createElement('div');
                modal.className = 'bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl';
                
                // Icon based on type
                const iconColors = {
                    'error': 'text-red-500',
                    'success': 'text-green-500',
                    'warning': 'text-yellow-500',
                    'info': 'text-blue-500'
                };
                
                const icons = {
                    'error': '⚠️',
                    'success': '✅',
                    'warning': '⚠️',
                    'info': 'ℹ️'
                };
                
                modal.innerHTML = `
                    <div class="flex items-center mb-4">
                        <span class="text-2xl mr-3">${icons[type]}</span>
                        <h3 class="text-lg font-semibold ${iconColors[type]}">
                            ${type.charAt(0).toUpperCase() + type.slice(1)}
                        </h3>
                    </div>
                    <p class="text-gray-700 mb-6">${message}</p>
                    <div class="flex justify-end">
                        <button id="confirmOk" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                            OK
                        </button>
                    </div>
                `;
                
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                
                // Handle click events
                const okButton = modal.querySelector('#confirmOk');
                
                const cleanup = () => {
                    document.body.removeChild(overlay);
                    resolve();
                };
                
                okButton.addEventListener('click', cleanup);
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) cleanup();
                });
                
                // Focus the OK button
                okButton.focus();
            });
        }

        // AI Generation Functions
    async function generateBlogPost() {
            const topic = document.getElementById('ai_topic').value;
            if (!topic) {
                await showConfirmDialog('Please enter a blog topic first', 'warning');
                return;
            }
            
            document.getElementById('ai_loading').classList.remove('hidden');
            
            try {
                const response = await fetch('/admin/blogs/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        topic: topic,
                        target_audience: document.getElementById('ai_audience').value
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.blog) {
                    document.getElementById('title').value = data.blog.title || '';
                    document.getElementById('slug').value = data.blog.slug || '';
                    document.getElementById('excerpt').value = data.blog.excerpt || '';
                    document.getElementById('content').value = data.blog.content || '';
                    document.getElementById('meta_title').value = data.blog.meta_title || '';
                    document.getElementById('meta_description').value = data.blog.meta_description || '';
                    if (data.blog.featured_image) {
                        document.getElementById('featured_image').value = data.blog.featured_image;
                        showGeneratedImagePreview(data.blog.featured_image);
                    }
                    
                    // Set as published by default
                    const isPublishedCheckbox = document.getElementById('is_published');
                    if (isPublishedCheckbox) {
                        isPublishedCheckbox.checked = true;
                    }
                    
                    await showConfirmDialog('🎉 AI content generated (not saved yet). Submit form to save draft.', 'success');
                } else {
                    await showConfirmDialog('Error: ' + (data.message || 'Failed to generate blog post'), 'error');
                }
            } catch (error) {
                await showConfirmDialog('Error: ' + error.message, 'error');
            } finally {
                document.getElementById('ai_loading').classList.add('hidden');
            }
        }

        function showGeneratedImagePreview(url) {
            // Basic inline preview injection (lightweight)
            let existing = document.getElementById('generated_image_preview');
            if (!existing) {
                existing = document.createElement('div');
                existing.id = 'generated_image_preview';
                existing.className = 'mt-4';
                const target = document.getElementById('featured_image');
                target.parentElement.appendChild(existing);
            }
            existing.innerHTML = `<p class='text-sm text-gray-600 mb-1'>Generated Image Preview:</p><img src='${url}' class='max-w-xs rounded border' alt='Generated preview'>`;
        }
        
        async function generateIdeas() {
            const topic = document.getElementById('ai_topic').value;
            if (!topic) {
                await showConfirmDialog('Please enter a topic first', 'warning');
                return;
            }
            
            document.getElementById('ai_loading').classList.remove('hidden');
            
            try {
                const response = await fetch('/admin/blogs/ideas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({ keywords: topic })
                });
                
                const data = await response.json();
                
                if (data.success && data.ideas) {
                    const container = document.getElementById('ideas_list');
                    container.innerHTML = '';
                    
                    data.ideas.forEach(idea => {
                        const div = document.createElement('div');
                        div.className = 'p-3 bg-white border rounded cursor-pointer hover:bg-gray-50 transition-colors';
                        div.innerHTML = `
                            <strong class="text-gray-900">${idea.title}</strong><br>
                            <small class="text-gray-600">${idea.excerpt}</small>
                        `;
                        div.onclick = () => {
                            document.getElementById('ai_topic').value = idea.title;
                            document.getElementById('title').value = idea.title;
                            showConfirmDialog('Generate full blog post for: ' + idea.title + '?', 'info').then(() => {
                                generateBlogPost();
                            });
                        };
                        container.appendChild(div);
                    });
                    
                    document.getElementById('ai_ideas').classList.remove('hidden');
                } else {
                    await showConfirmDialog('Error: ' + (data.message || 'Failed to generate ideas'), 'error');
                }
            } catch (error) {
                await showConfirmDialog('Error: ' + error.message, 'error');
            } finally {
                document.getElementById('ai_loading').classList.add('hidden');
            }
        }
    </script>
</x-admin.layout>
