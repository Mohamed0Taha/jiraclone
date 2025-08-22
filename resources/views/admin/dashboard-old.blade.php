<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskPilot Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen">
        <nav class="bg-blue-600 text-white p-4">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-xl font-bold">TaskPilot Admin Dashboard</h1>
                <div class="flex items-center space-x-4">
                    <span>Welcome, {{ auth()->user()->name }}</span>
                    <a href="{{ url('/') }}" class="bg-blue-500 px-3 py-1 rounded hover:bg-blue-400">Main App</a>
                    <form method="POST" action="{{ route('logout') }}" class="inline">
                        @csrf
                        <button type="submit" class="bg-red-500 px-3 py-1 rounded hover:bg-red-400">Logout</button>
                    </form>
                </div>
            </div>
        </nav>

        <div class="container mx-auto py-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-700">Total Users</h3>
                    <p class="text-3xl font-bold text-blue-600">{{ $stats['users'] }}</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-700">Total Projects</h3>
                    <p class="text-3xl font-bold text-green-600">{{ $stats['projects'] }}</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-700">Total Tasks</h3>
                    <p class="text-3xl font-bold text-yellow-600">{{ $stats['tasks'] }}</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-700">Subscriptions</h3>
                    <p class="text-3xl font-bold text-purple-600">{{ $stats['subscriptions'] }}</p>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-bold mb-4">Quick Actions</h2>
                <div class="flex space-x-4">
                    <a href="{{ route('admin.users') }}" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Manage Users</a>
                    <a href="{{ url('/admin') }}" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Filament Admin</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
