<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Billing & Revenue - TaskPilot Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen">
        <!-- Header -->
        <div class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-semibold text-gray-900">💳 Billing & Revenue</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <a href="/admin/dashboard" class="text-blue-600 hover:text-blue-800">← Back to Dashboard</a>
                        <a href="/dashboard" class="text-gray-600 hover:text-gray-800">Main App</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            <!-- Revenue Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
                    <div class="text-center">
                        <p class="text-green-100">Monthly Recurring Revenue</p>
                        <p class="text-3xl font-bold">${{ number_format($revenueStats['monthly_recurring_revenue'], 2) }}</p>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
                    <div class="text-center">
                        <p class="text-blue-100">Annual Projected Revenue</p>
                        <p class="text-3xl font-bold">${{ number_format($revenueStats['annual_projected_revenue'], 2) }}</p>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
                    <div class="text-center">
                        <p class="text-purple-100">Avg Revenue Per User</p>
                        <p class="text-3xl font-bold">${{ number_format($revenueStats['average_revenue_per_user'], 2) }}</p>
                    </div>
                </div>
            </div>

            <!-- Subscription Overview -->
            <div class="bg-white p-6 rounded-lg shadow mb-8">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">📊 Subscription Overview</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-green-600">{{ $subscriptionStats['total_active'] }}</div>
                        <div class="text-sm text-gray-600">Active</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-blue-600">{{ $subscriptionStats['total_on_trial'] }}</div>
                        <div class="text-sm text-gray-600">On Trial</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-red-600">{{ $subscriptionStats['total_cancelled'] }}</div>
                        <div class="text-sm text-gray-600">Cancelled</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-gray-600">{{ $subscriptionStats['total_active'] + $subscriptionStats['total_cancelled'] }}</div>
                        <div class="text-sm text-gray-600">Total</div>
                    </div>
                </div>
            </div>

            <!-- Plan Distribution -->
            <div class="bg-white p-6 rounded-lg shadow mb-8">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">📈 Plan Distribution</h3>
                <div class="space-y-4">
                    @foreach($subscriptionStats['by_plan'] as $plan => $count)
                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                            <div class="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                            <span class="font-medium">{{ $plan }} Plan</span>
                        </div>
                        <div class="text-right">
                            <span class="text-lg font-semibold">{{ $count }}</span>
                            <span class="text-sm text-gray-500 ml-2">subscribers</span>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>

            <!-- Active Subscriptions Table -->
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">🔄 Active Subscriptions</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trial</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Billing</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @forelse($subscriptions as $subscription)
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div>
                                                <div class="text-sm font-medium text-gray-900">{{ $subscription->user->name }}</div>
                                                <div class="text-sm text-gray-500">{{ $subscription->user->email }}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {{ $subscription->stripe_price === 'price_1RycMQKX2zcFuvyCqXjA6pCA' ? 'Basic' : ($subscription->stripe_price === 'price_1RycMrKX2zcFuvyCUEJZVhbr' ? 'Pro' : 'Business') }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        @if($subscription->stripe_status === 'active')
                                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                                        @elseif($subscription->stripe_status === 'trialing')
                                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Trialing</span>
                                        @else
                                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{{ ucfirst($subscription->stripe_status) }}</span>
                                        @endif
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        @if($subscription->trial_ends_at)
                                            {{ $subscription->trial_ends_at->format('M j, Y') }}
                                        @else
                                            No trial
                                        @endif
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {{ $subscription->created_at->format('M j, Y') }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        @if($subscription->ends_at)
                                            {{ $subscription->ends_at->format('M j, Y') }}
                                        @else
                                            Active
                                        @endif
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                                        No subscriptions found
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
