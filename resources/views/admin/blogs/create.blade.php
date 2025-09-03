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

        <form action="{{ route('admin.blogs.store') }}" method="POST" enctype="multipart/form-data" class="bg-white rounded-lg shadow p-6">
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
                
                <div class="flex flex-wrap gap-3">
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
                    <button type="button" onclick="generateFeaturedImage()" 
                            class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors">
                        Generate Featured Image
                    </button>
                </div>
                
                <div id="ai_loading" class="hidden mt-4">
                    <div class="flex items-center text-blue-600">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span id="loading_text">Generating AI content...</span>
                    </div>
                </div>
                
                <div id="ai_ideas" class="hidden mt-4">
                    <h4 class="font-medium text-gray-900 mb-2">Generated Ideas:</h4>
                    <div id="ideas_list" class="space-y-2"></div>
                </div>

                <!-- Image Generation Status -->
                <div id="image_status" class="hidden mt-4 p-4 rounded-lg">
                    <div id="image_success" class="hidden bg-green-50 border border-green-200 text-green-800">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Featured image generated successfully!</span>
                        </div>
                    </div>
                    <div id="image_error" class="hidden bg-red-50 border border-red-200 text-red-800">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                            </svg>
                            <span id="image_error_text">Image generation failed</span>
                        </div>
                    </div>
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
                                    <input type="checkbox" name="is_published" id="is_published" value="1" {{ old('is_published') ? 'checked' : '' }}
                                           class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                    <span class="ml-2 text-sm text-gray-700">Publish immediately</span>
                                </label>
                                <p class="text-xs text-gray-500 mt-1">Leave unchecked to save as draft</p>
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
                                <label for="featured_image_file" class="block text-sm font-medium text-gray-700 mb-2">Featured Image Upload</label>
                                <input type="file" name="featured_image_file" id="featured_image_file" accept="image/*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                                <p class="text-xs text-gray-500 mt-1">Upload JPG, PNG, GIF, or WebP (max 5MB)</p>
                                
                                <!-- Image Preview -->
                                <div id="image_preview" class="hidden mt-3">
                                    <img id="preview_img" src="" alt="Preview" class="max-w-xs max-h-48 rounded-lg border">
                                    <button type="button" onclick="clearImagePreview()" class="ml-2 text-red-600 hover:text-red-800 text-sm">Remove</button>
                                </div>
                            </div>

                            <div class="text-center text-gray-500 text-sm">
                                OR
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
            console.log('generateBlogPost called');
            const topic = document.getElementById('ai_topic').value;
            const audience = document.getElementById('ai_audience').value;
            
            console.log('Topic:', topic, 'Audience:', audience);
            
            if (!topic) {
                await showConfirmDialog('Please enter a blog topic first', 'warning');
                return;
            }
            
            showLoading(true, 'Generating blog post and featured image...');
            
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
                    // Fill form fields with generated content (with null checks)
                    const titleInput = document.getElementById('title');
                    if (titleInput) titleInput.value = data.blog.title || '';
                    
                    const slugInput = document.getElementById('slug');
                    if (slugInput) slugInput.value = data.blog.slug || '';
                    
                    const excerptInput = document.getElementById('excerpt');
                    if (excerptInput) excerptInput.value = data.blog.excerpt || '';
                    
                    const contentInput = document.getElementById('content');
                    if (contentInput) contentInput.value = data.blog.content || '';
                    
                    const metaTitleInput = document.getElementById('meta_title');
                    if (metaTitleInput) metaTitleInput.value = data.blog.meta_title || '';
                    
                    const metaDescriptionInput = document.getElementById('meta_description');
                    if (metaDescriptionInput) metaDescriptionInput.value = data.blog.meta_description || '';
                    
                    // Set featured image if generated
                    if (data.blog.featured_image) {
                        const featuredImageInput = document.getElementById('featured_image');
                        if (featuredImageInput) {
                            featuredImageInput.value = data.blog.featured_image;
                        }
                        // Clear any uploaded file
                        const featuredImageFileInput = document.getElementById('featured_image_file');
                        if (featuredImageFileInput) {
                            featuredImageFileInput.value = '';
                        }
                        clearImagePreview();
                    }
                    
                    // Keep as draft by default - don't auto-publish
                    const isPublishedCheckbox = document.getElementById('is_published');
                    if (isPublishedCheckbox) {
                        isPublishedCheckbox.checked = false;
                    }
                    
                    // Clear publish date since it's a draft
                    const publishedAtInput = document.getElementById('published_at');
                    if (publishedAtInput) {
                        publishedAtInput.value = '';
                    }
                    
                    let message = 'Blog post generated successfully and saved as draft!';
                    if (data.blog.featured_image) {
                        message += ' Featured image also generated!';
                    } else if (data.blog.image_error) {
                        message += ' (Note: Image generation failed - you can upload one manually)';
                    }
                    message += ' Review and publish when ready.';
                    
                    await showConfirmDialog(message, 'success');
                } else {
                    await showConfirmDialog('Error generating blog post: ' + (data.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                await showConfirmDialog('Error generating blog post: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }
        
        async function generateIdeas() {
            console.log('generateIdeas called');
            const topic = document.getElementById('ai_topic').value;
            
            console.log('Topic for ideas:', topic);
            
            if (!topic) {
                await showConfirmDialog('Please enter a topic or keywords first', 'warning');
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
                    await showConfirmDialog('Error generating ideas: ' + (data.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                await showConfirmDialog('Error generating ideas: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }
        
        async function optimizeContent() {
            console.log('optimizeContent called');
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;
            
            console.log('Optimize params:', {title, content});
            
            if (!title || !content) {
                await showConfirmDialog('Please enter a title and content first', 'warning');
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
                    
                    await showConfirmDialog('Content optimized for SEO!', 'success');
                } else {
                    await showConfirmDialog('Error optimizing content: ' + (data.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                await showConfirmDialog('Error optimizing content: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }
        
        async function generateFeaturedImage() {
            console.log('generateFeaturedImage called');
            const title = document.getElementById('title').value;
            const excerpt = document.getElementById('excerpt').value;
            const topic = document.getElementById('ai_topic').value;
            
            console.log('Image generation params:', {title, excerpt, topic});
            
            if (!title) {
                await showConfirmDialog('Please enter a blog title first', 'warning');
                return;
            }
            
            showLoading(true, 'Generating featured image...');
            
            try {
                const response = await fetch('{{ route("admin.blogs.generate-image") }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({
                        title: title,
                        excerpt: excerpt,
                        topic: topic
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.image_url) {
                    // Set the featured image URL (now from ImageKit)
                    document.getElementById('featured_image').value = data.image_url;
                    
                    // Clear any uploaded file
                    document.getElementById('featured_image_file').value = '';
                    clearImagePreview();
                    
                    await showConfirmDialog('Featured image generated and saved successfully!', 'success');
                } else {
                    await showConfirmDialog('Error generating image: ' + (data.message || data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                await showConfirmDialog('Error generating image: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }
        
        function showLoading(show, message = 'Generating AI content...') {
            document.getElementById('ai_loading').classList.toggle('hidden', !show);
            document.getElementById('loading_text').textContent = message;
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

        // Featured image URL preview
        document.getElementById('featured_image').addEventListener('input', function(e) {
            if (e.target.value) {
                // Clear file upload when URL is entered
                document.getElementById('featured_image_file').value = '';
                clearImagePreview();
            }
        });
    </script>
</x-admin.layout>
