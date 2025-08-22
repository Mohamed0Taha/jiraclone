<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskPilot Admin - Edit User</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen">
        <nav class="bg-blue-600 text-white p-4">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-xl font-bold">Edit User: {{ $user->name }}</h1>
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
                <form method="POST" action="{{ route('admin.users.update', $user) }}">
                    @csrf
                    @method('PUT')
                    
                    <div class="grid grid-cols-1 gap-6">
                        <!-- Name -->
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" name="name" id="name" required
                                   value="{{ old('name', $user->name) }}"
                                   class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <!-- Email -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" name="email" id="email" required
                                   value="{{ old('email', $user->email) }}"
                                   class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <!-- User Info -->
                        <div class="bg-gray-50 p-4 rounded">
                            <h3 class="text-sm font-medium text-gray-700 mb-2">User Information</h3>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-500">Created:</span>
                                    <span class="font-medium">{{ $user->created_at->format('M j, Y') }}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Email Verified:</span>
                                    <span class="font-medium">{{ $user->email_verified_at ? 'Yes' : 'No' }}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Projects:</span>
                                    <span class="font-medium">{{ $user->projects()->count() }}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Tasks Created:</span>
                                    <span class="font-medium">{{ $user->tasks()->count() }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Admin Status -->
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" name="is_admin" value="1"
                                       {{ old('is_admin', $user->is_admin) ? 'checked' : '' }}
                                       class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                <span class="ml-2 text-sm text-gray-700">Administrator privileges</span>
                            </label>
                        </div>

                        <!-- Current Subscription Status -->
                        @php
                            $currentSub = $user->subscription('default');
                            $currentPlan = 'none';
                            if ($currentSub && $currentSub->stripe_status === 'active') {
                                $currentPlan = str_contains($currentSub->stripe_price, 'basic') ? 'basic' : 'pro';
                            }
                        @endphp

                        <div class="bg-blue-50 p-4 rounded">
                            <h3 class="text-sm font-medium text-gray-700 mb-2">Current Subscription</h3>
                            @if($currentSub)
                                <div class="text-sm">
                                    <p><span class="text-gray-500">Status:</span> 
                                       <span class="font-medium capitalize">{{ $currentSub->stripe_status }}</span>
                                    </p>
                                    <p><span class="text-gray-500">Plan:</span> 
                                       <span class="font-medium">{{ str_contains($currentSub->stripe_price, 'basic') ? 'Basic' : 'Pro' }}</span>
                                    </p>
                                    <p><span class="text-gray-500">Stripe ID:</span> 
                                       <span class="font-medium">{{ $currentSub->stripe_id }}</span>
                                    </p>
                                </div>
                            @else
                                <p class="text-sm text-gray-500">No active subscription</p>
                            @endif
                        </div>

                        <!-- Subscription Management -->
                        <div>
                            <label for="subscription_plan" class="block text-sm font-medium text-gray-700">Manage Subscription</label>
                            <select name="subscription_plan" id="subscription_plan"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                <option value="">-- No Change --</option>
                                <option value="none">Remove Subscription</option>
                                <option value="basic" {{ $currentPlan == 'basic' ? 'selected' : '' }}>Basic Plan</option>
                                <option value="pro" {{ $currentPlan == 'pro' ? 'selected' : '' }}>Pro Plan</option>
                                @if($currentSub && $currentSub->stripe_status === 'active')
                                    <option value="cancel">Cancel Subscription</option>
                                @endif
                            </select>
                            <p class="mt-1 text-sm text-gray-500">
                                Change or cancel the user's subscription. Manual subscriptions bypass Stripe.
                            </p>
                        </div>
                    </div>

                    <div class="mt-6 flex items-center justify-end space-x-4">
                        <a href="{{ route('admin.users') }}" 
                           class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                            Cancel
                        </a>
                        <button type="submit" 
                                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Update User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
