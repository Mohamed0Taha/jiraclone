<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskPilot Admin - Create User</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen">
        <nav class="bg-blue-600 text-white p-4">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-xl font-bold">Create New User</h1>
                <div class="flex items-center space-x-4">
                    <a href="{{ route('admin.users') }}" class="bg-blue-500 px-3 py-1 rounded hover:bg-blue-400">← Back to Users</a>
                    <a href="{{ route('admin.dashboard') }}" class="bg-gray-500 px-3 py-1 rounded hover:bg-gray-400">Dashboard</a>
                </div>
            </div>
        </nav>

        <div class="container mx-auto py-8">
            @if($errors->any())
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <ul>
                        @foreach($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <div class="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                <form method="POST" action="{{ route('admin.users.store') }}">
                    @csrf
                    
                    <div class="grid grid-cols-1 gap-6">
                        <!-- Name -->
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" name="name" id="name" required
                                   value="{{ old('name') }}"
                                   class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <!-- Email -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" name="email" id="email" required
                                   value="{{ old('email') }}"
                                   class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <!-- Password -->
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" name="password" id="password" required minlength="8"
                                   class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <p class="mt-1 text-sm text-gray-500">Minimum 8 characters</p>
                        </div>

                        <!-- Admin Status -->
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" name="is_admin" value="1"
                                       {{ old('is_admin') ? 'checked' : '' }}
                                       class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                <span class="ml-2 text-sm text-gray-700">Make this user an administrator</span>
                            </label>
                        </div>

                        <!-- Subscription Plan -->
                        <div>
                            <label for="subscription_plan" class="block text-sm font-medium text-gray-700">Subscription Plan</label>
                            <select name="subscription_plan" id="subscription_plan"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                <option value="none" {{ old('subscription_plan') == 'none' ? 'selected' : '' }}>No Subscription (Free)</option>
                                <option value="basic" {{ old('subscription_plan') == 'basic' ? 'selected' : '' }}>Basic Plan</option>
                                <option value="pro" {{ old('subscription_plan') == 'pro' ? 'selected' : '' }}>Pro Plan</option>
                            </select>
                            <p class="mt-1 text-sm text-gray-500">Manual subscriptions bypass Stripe and are managed locally</p>
                        </div>
                    </div>

                    <div class="mt-6 flex items-center justify-end space-x-4">
                        <a href="{{ route('admin.users') }}" 
                           class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                            Cancel
                        </a>
                        <button type="submit" 
                                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Create User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
