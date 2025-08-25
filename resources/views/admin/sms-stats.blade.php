<x-admin.layout title="TaskPilot Admin - SMS Statistics" page-title="SMS Statistics">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <!-- Overview Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-500">Total Messages</div>
                        <div class="text-2xl font-bold text-gray-900">{{ number_format($stats['total_messages']) }}</div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-500">Delivery Rate</div>
                        <div class="text-2xl font-bold text-gray-900">{{ number_format($stats['delivery_rate'], 1) }}%</div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <span class="text-white text-xs font-bold">$</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-500">Total Cost</div>
                        <div class="text-2xl font-bold text-gray-900">${{ number_format($stats['total_cost'], 2) }}</div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-500">Avg Cost/Message</div>
                        <div class="text-2xl font-bold text-gray-900">${{ number_format($stats['avg_cost'], 4) }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Status Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Message Status Breakdown</h3>
                <div class="space-y-4">
                    @foreach($stats['status_counts'] as $status => $count)
                        <div class="flex justify-between items-center">
                            <div class="flex items-center">
                                @if($status === 'delivered')
                                    <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                @elseif($status === 'sent')
                                    <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                                @elseif($status === 'failed')
                                    <div class="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                                @elseif($status === 'undelivered')
                                    <div class="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                                @else
                                    <div class="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                                @endif
                                <span class="text-sm text-gray-700 capitalize">{{ $status }}</span>
                            </div>
                            <div class="flex items-center">
                                <span class="text-sm font-medium text-gray-900 mr-2">{{ number_format($count) }}</span>
                                <span class="text-xs text-gray-500">
                                    ({{ $stats['total_messages'] > 0 ? number_format(($count / $stats['total_messages']) * 100, 1) : 0 }}%)
                                </span>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Daily Message Volume (Last 7 Days)</h3>
                <div class="space-y-3">
                    @foreach($stats['daily_volume'] as $day)
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-700">{{ $day['date'] }}</span>
                            <div class="flex items-center">
                                <div class="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                    <div class="bg-blue-500 h-2 rounded-full" 
                                         style="width: {{ $stats['max_daily'] > 0 ? ($day['count'] / $stats['max_daily']) * 100 : 0 }}%"></div>
                                </div>
                                <span class="text-sm font-medium text-gray-900 w-8 text-right">{{ $day['count'] }}</span>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>

        <!-- Cost Analysis -->
        <div class="bg-white p-6 rounded-lg shadow mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="text-center">
                    <div class="text-2xl font-bold text-gray-900">${{ number_format($stats['cost_this_month'], 2) }}</div>
                    <div class="text-sm text-gray-500">This Month</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-gray-900">${{ number_format($stats['cost_last_month'], 2) }}</div>
                    <div class="text-sm text-gray-500">Last Month</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold {{ $stats['cost_change'] >= 0 ? 'text-red-600' : 'text-green-600' }}">
                        {{ $stats['cost_change'] >= 0 ? '+' : '' }}{{ number_format($stats['cost_change'], 1) }}%
                    </div>
                    <div class="text-sm text-gray-500">Change</div>
                </div>
            </div>
        </div>

        <!-- Top Users -->
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Top SMS Users (This Month)</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages Sent</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        @forelse($stats['top_users'] as $userStat)
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900">{{ $userStat['name'] ?? 'Unknown' }}</div>
                                    <div class="text-sm text-gray-500">{{ $userStat['email'] ?? 'N/A' }}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {{ number_format($userStat['total_messages']) }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${{ number_format($userStat['total_cost'], 4) }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${{ number_format($userStat['avg_cost'], 4) }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="text-sm text-gray-900">{{ number_format($userStat['success_rate'], 1) }}%</span>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                                    No user data available
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

    </div>

</x-admin.layout>
