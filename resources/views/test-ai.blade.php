<!DOCTYPE html>
<html>
<head>
    <title>Test AI Task Generation</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    <h1>Test AI Task Generation</h1>
    
    <form id="testForm" action="/projects/3/tasks/ai/preview" method="POST">
        @csrf
        <label>Count: <input type="number" name="count" value="3" min="1" max="10"></label><br><br>
        <label>Prompt: <textarea name="prompt" rows="3" cols="50">Test quick generation</textarea></label><br><br>
        <button type="submit">Generate Tasks</button>
    </form>
    
    <div id="result" style="margin-top: 20px;"></div>
    
    <script>
        document.getElementById('testForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = 'Generating... (this should be fast now)';
            
            const startTime = Date.now();
            
            fetch(this.action, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'text/html',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000;
                
                resultDiv.innerHTML = `
                    <h3>Response received in ${duration}s</h3>
                    <p>Status: ${response.status}</p>
                    <p>Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}</p>
                `;
                
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error('Response not ok');
                }
            })
            .then(html => {
                // If we get HTML back, it means success (redirect)
                resultDiv.innerHTML += '<p style="color: green;">✅ Success! Task generation working.</p>';
            })
            .catch(error => {
                resultDiv.innerHTML += `<p style="color: red;">❌ Error: ${error.message}</p>`;
            });
        });
    </script>
</body>
</html>
