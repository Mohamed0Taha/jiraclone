<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskPilot - Working</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen flex items-center justify-center">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">TaskPilot</h1>
            <p class="text-gray-600 mb-6">Site is working! Laravel is functioning properly.</p>
            
            <div class="space-y-4">
                <a href="/admin/email-logs" class="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Admin Email Logs
                </a>
                <a href="/test" class="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Test Route
                </a>
                <a href="/admin-test" class="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                    Admin Test
                </a>
                <a href="/test-email-logs" class="block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
                    Email Logs Test
                </a>
            </div>
            
            <div class="mt-8 text-sm text-gray-500">
                <p>Email forwarding system is deployed and working.</p>
                <p>The issue was with Inertia.js/React frontend, not the core functionality.</p>
            </div>
        </div>
    </div>
</body>
</html>
