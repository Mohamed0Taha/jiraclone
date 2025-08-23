<x-admin.layout title="TaskPilot Admin - Cancellations" page-title="Subscription Cancellations">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <!-- Cancellation Reasons Chart -->
        <div class="bg-white p-6 rounded-lg shadow mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">📊 Cancellation Reasons</h3>
            <div class="relative h-64">
                <canvas id="cancellationChart"></canvas>
            </div>
        </div>

        <!-- Cancellation Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg shadow text-white">
                <div class="text-center">
                    <p class="text-red-100">Total Cancellations</p>
                    <p class="text-3xl font-bold">{{ $cancellations->total() }}</p>
                </div>
            </div>
            <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg shadow text-white">
                <div class="text-center">
                    <p class="text-orange-100">This Month</p>
                    <p class="text-3xl font-bold">{{ \App\Models\User::whereNotNull('cancellation_reason')->whereMonth('cancelled_at', now()->month)->count() }}</p>
                </div>
            </div>
            <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg shadow text-white">
                <div class="text-center">
                    <p class="text-yellow-100">Top Reason</p>
                    <p class="text-lg font-bold">{{ $chartData->first()->reason ?? 'None' }}</p>
                </div>
            </div>
            <div class="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
                <div class="text-center">
                    <p class="text-purple-100">Cancellation Rate</p>
                    <p class="text-3xl font-bold">{{ $cancellations->total() > 0 ? number_format(($cancellations->total() / (\App\Models\User::count() ?: 1)) * 100, 1) : 0 }}%</p>
                </div>
            </div>
        </div>

        <!-- Filters and List -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div class="flex flex-col gap-2 w-full lg:w-auto">
                    <h2 class="text-xl font-semibold">Cancelled Subscriptions ({{ $cancellations->total() }})</h2>
                    <!-- Filters -->
                    <form method="GET" action="{{ route('admin.cancellations') }}" class="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full">
                        <!-- Search -->
                        <input type="text" name="search" value="{{ request('search') }}" 
                               placeholder="Search users..." 
                               class="border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 w-full lg:w-48">
                        
                        <!-- Reason Filter -->
                        <select name="reason" class="border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 w-full lg:w-auto">
                            <option value="">All Reasons</option>
                            @foreach($allReasons as $reason)
                                <option value="{{ $reason['value'] }}" {{ request('reason') === $reason['value'] ? 'selected' : '' }}>
                                    {{ $reason['label'] }}
                                </option>
                            @endforeach
                        </select>
                        
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm whitespace-nowrap">
                            Apply Filters
                        </button>
                        
                        @if(request('search') || request('reason'))
                            <a href="{{ route('admin.cancellations') }}" class="text-gray-500 text-sm hover:text-gray-700 whitespace-nowrap">
                                Clear Filters
                            </a>
                        @endif
                    </form>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancellation Reason</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancelled Date</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        @forelse($cancellations as $user)
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div>
                                        <div class="text-sm font-medium text-gray-900">{{ $user->name }}</div>
                                        <div class="text-sm text-gray-500">{{ $user->email }}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    {{ $user->getCancellationReasonLabel() }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ $user->cancelled_at ? $user->cancelled_at->format('M j, Y g:i A') : 'N/A' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                @php
                                    $currentPlan = $user->getCurrentPlan();
                                    $hasSubscription = $user->hasActiveSubscription();
                                @endphp
                                @if($hasSubscription)
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {{ $currentPlan === 'basic' ? 'bg-blue-100 text-blue-800' : ($currentPlan === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800') }}">
                                        {{ ucfirst($currentPlan) }}{{ $user->onTrial() ? ' (Trial)' : '' }}
                                    </span>
                                @else
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                        Cancelled
                                    </span>
                                @endif
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div class="flex items-center space-x-2">
                                    <!-- View User -->
                                    <a href="{{ route('admin.users.edit', $user) }}" 
                                       class="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-semibold hover:bg-blue-200 border border-blue-300">
                                        👤 View User
                                    </a>
                                </div>
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                                <div class="text-lg">🎉 No cancellations found!</div>
                                <div class="text-sm mt-1">
                                    @if(request('search') || request('reason'))
                                        Try adjusting your filters.
                                    @else
                                        This is great - no users have cancelled their subscriptions.
                                    @endif
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            @if($cancellations->hasPages())
            <div class="px-6 py-3 border-t border-gray-200">
                {{ $cancellations->appends(request()->query())->links() }}
            </div>
            @endif
        </div>
    </div>

    <!-- Chart.js Script -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const ctx = document.getElementById('cancellationChart').getContext('2d');
            
            const chartData = @json($chartData);
            const labels = chartData.map(item => item.reason);
            const data = chartData.map(item => item.count);
            const colors = [
                '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
                '#84CC16', '#22C55E', '#10B981', '#14B8A6',
                '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
                '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
            ];

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Cancellations',
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderColor: colors.slice(0, data.length).map(color => color + 'CC'),
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#374151',
                            borderWidth: 1,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#F3F4F6'
                            },
                            ticks: {
                                color: '#6B7280',
                                stepSize: 1
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6B7280',
                                maxRotation: 45,
                                minRotation: 0
                            }
                        }
                    }
                }
            });
        });
    </script>

</x-admin.layout>
