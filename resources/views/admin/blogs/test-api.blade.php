<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog API Test</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/app.css'])
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Blog API Test</h1>
        
        <div class="bg-white p-6 rounded-lg shadow mb-6">
            <h2 class="text-lg font-semibold mb-4">Test Blog Generation</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Topic:</label>
                    <input type="text" id="topic" class="w-full p-2 border rounded" value="project automation with AI">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Audience:</label>
                    <input type="text" id="audience" class="w-full p-2 border rounded" value="project managers">
                </div>
                <button onclick="testBlogGeneration()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Generate Blog
                </button>
            </div>
            <div id="blog-result" class="mt-4 p-4 bg-gray-50 rounded hidden"></div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-lg font-semibold mb-4">Test Image Generation</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Title:</label>
                    <input type="text" id="image-title" class="w-full p-2 border rounded" value="Master Project Management with AI">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Excerpt:</label>
                    <input type="text" id="image-excerpt" class="w-full p-2 border rounded" value="Learn how AI transforms project management">
                </div>
                <button onclick="testImageGeneration()" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                    Generate Image
                </button>
            </div>
            <div id="image-result" class="mt-4 p-4 bg-gray-50 rounded hidden"></div>
        </div>
    </div>

    <script>
        // Get CSRF token
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        async function testBlogGeneration() {
            const topic = document.getElementById('topic').value;
            const audience = document.getElementById('audience').value;
            const resultDiv = document.getElementById('blog-result');
            
            resultDiv.innerHTML = 'Generating blog...';
            resultDiv.classList.remove('hidden');
            
            try {
                const response = await fetch('/admin/blogs/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        topic: topic,
                        target_audience: audience
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = `
                        <h3 class="font-semibold text-green-600">Success!</h3>
                        <p><strong>Title:</strong> ${data.blog.title}</p>
                        <p><strong>Excerpt:</strong> ${data.blog.excerpt}</p>
                        <p><strong>Content Length:</strong> ${data.blog.content.length} characters</p>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <h3 class="font-semibold text-red-600">Error</h3>
                        <p>${data.message}</p>
                        ${data.debug ? `<p class="text-sm text-gray-600">Debug: ${data.debug}</p>` : ''}
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <h3 class="font-semibold text-red-600">Network Error</h3>
                    <p>${error.message}</p>
                `;
            }
        }
        
        async function testImageGeneration() {
            const title = document.getElementById('image-title').value;
            const excerpt = document.getElementById('image-excerpt').value;
            const resultDiv = document.getElementById('image-result');
            
            resultDiv.innerHTML = 'Generating image...';
            resultDiv.classList.remove('hidden');
            
            try {
                const response = await fetch('/admin/blogs/generate-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title,
                        excerpt: excerpt,
                        topic: title
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = `
                        <h3 class="font-semibold text-green-600">Success!</h3>
                        <p><strong>Image URL:</strong> <a href="${data.image_url}" target="_blank" class="text-blue-500">${data.image_url}</a></p>
                        <img src="${data.image_url}" alt="Generated image" class="mt-2 max-w-sm rounded">
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <h3 class="font-semibold text-red-600">Error</h3>
                        <p>${data.message || data.error}</p>
                        ${data.debug ? `<p class="text-sm text-gray-600">Debug: ${data.debug}</p>` : ''}
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <h3 class="font-semibold text-red-600">Network Error</h3>
                    <p>${error.message}</p>
                `;
            }
        }
    </script>
</body>
</html>
