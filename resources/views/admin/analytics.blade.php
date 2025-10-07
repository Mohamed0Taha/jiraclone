<x-admin.layout title="TaskPilot Admin - Analytics" page-title="Analytics Dashboard">
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/date-fns@2.29.3/index.min.js"></script>
    
    <div class="p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Analytics Dashboard</h2>

        <!-- Traffic Growth Chart -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">Visitor Traffic Growth</h3>
                <div class="flex space-x-2">
                    <button onclick="updateChart('7d')" class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors chart-period-btn active" data-period="7d">7D</button>
                    <button onclick="updateChart('30d')" class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors chart-period-btn" data-period="30d">30D</button>
                    <button onclick="updateChart('90d')" class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors chart-period-btn" data-period="90d">90D</button>
                </div>
            </div>
            <div class="relative h-80">
                <canvas id="trafficChart"></canvas>
            </div>
        </div>

        <!-- Insights Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Top Countries -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clip-rule="evenodd" />
                    </svg>
                    Top Countries
                </h3>
                <div class="space-y-3">
                    @foreach($insights['top_countries'] as $country)
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">{{ $country['flag'] }}</span>
                                <span class="font-medium text-gray-900">{{ $country['country'] }}</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="text-lg font-bold text-blue-600">{{ number_format($country['count']) }}</span>
                                <span class="text-sm text-gray-500">visitors</span>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>

            <!-- Top Cities -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                    Top Cities
                </h3>
                <div class="space-y-3">
                    @foreach($insights['top_cities'] as $city)
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">{{ $city['flag'] }}</span>
                                <span class="font-medium text-gray-900">{{ $city['city'] }}</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="text-lg font-bold text-green-600">{{ number_format($city['count']) }}</span>
                                <span class="text-sm text-gray-500">visitors</span>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>

        <!-- Dashboard Tiles -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Total Visitors -->
            <div class="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-800">{{ number_format($stats['total_visitors']) }}</h3>
                        <p class="text-gray-600 font-medium">Total Visitors</p>
                    </div>
                    <div class="bg-teal-100 p-3 rounded-full">
                        <svg class="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16.5c-.83 0-1.54.5-1.84 1.22L12.74 15 10.5 8h-1c-1.11 0-2 .89-2 2v6c0 1.11.89 2 2 2h8c1.11 0 2-.89 2-2z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Unique Visitors -->
            <div class="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-800">{{ number_format($stats['unique_visitors']) }}</h3>
                        <p class="text-gray-600 font-medium">Unique Visitors</p>
                    </div>
                    <div class="bg-blue-100 p-3 rounded-full">
                        <svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Page Views -->
            <div class="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-800">{{ number_format($stats['page_views']) }}</h3>
                        <p class="text-gray-600 font-medium">Page Views</p>
                    </div>
                    <div class="bg-green-100 p-3 rounded-full">
                        <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Latest Visitors Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                            </svg>
                            @if($showAll || $filters['search_ip'])
                                All Visitors by Location
                            @else
                                Latest Visitors
                            @endif
                        </h3>
                        <p class="text-sm text-gray-600 mt-1">
                            @if($showAll || $filters['search_ip'])
                                All visitor IP addresses and their locations
                            @else
                                Most recent 15 unique visitors
                            @endif
                        </p>
                    </div>
                    @if(!$showAll && !$filters['search_ip'])
                        <a href="{{ route('admin.analytics', ['show_all' => 1] + $filters) }}" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            View All Visitors
                        </a>
                    @endif
                </div>
                
                <!-- Filters -->
                @if($showAll || $filters['search_ip'])
                <form method="GET" action="{{ route('admin.analytics') }}" class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="hidden" name="show_all" value="1">
                    <div>
                        <label for="start_date" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input 
                            type="date" 
                            id="start_date" 
                            name="start_date" 
                            value="{{ $filters['start_date'] ?? '' }}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                    </div>
                    
                    <div>
                        <label for="end_date" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input 
                            type="date" 
                            id="end_date" 
                            name="end_date" 
                            value="{{ $filters['end_date'] ?? '' }}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                    </div>
                    
                    <div>
                        <label for="search_ip" class="block text-sm font-medium text-gray-700 mb-1">Search IP</label>
                        <input 
                            type="text" 
                            id="search_ip" 
                            name="search_ip" 
                            value="{{ $filters['search_ip'] ?? '' }}"
                            placeholder="e.g., 192.168"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                    </div>
                    
                    <div>
                        <label for="per_page" class="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
                        <select 
                            id="per_page" 
                            name="per_page"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="10" {{ ($filters['per_page'] ?? 25) == 10 ? 'selected' : '' }}>10</option>
                            <option value="25" {{ ($filters['per_page'] ?? 25) == 25 ? 'selected' : '' }}>25</option>
                            <option value="50" {{ ($filters['per_page'] ?? 25) == 50 ? 'selected' : '' }}>50</option>
                            <option value="100" {{ ($filters['per_page'] ?? 25) == 100 ? 'selected' : '' }}>100</option>
                        </select>
                    </div>
                    
                    <div class="md:col-span-4 flex gap-2">
                        <button 
                            type="submit"
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Apply Filters
                        </button>
                        
                        <a 
                            href="{{ route('admin.analytics') }}"
                            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                        >
                            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Clear Filters
                        </a>
                        
                        @if(is_object($visitors) && method_exists($visitors, 'total'))
                            <div class="ml-auto text-sm text-gray-600 flex items-center">
                                Showing {{ $visitors->firstItem() ?? 0 }} to {{ $visitors->lastItem() ?? 0 }} of {{ $visitors->total() }} visitors
                            </div>
                        @endif
                    </div>
                </form>
                @endif
            </div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Views</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        @forelse($visitors as $visitor)
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="font-mono text-sm text-gray-900">{{ $visitor['ip'] }}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {{ $visitor['city'] }}, {{ $visitor['region'] }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div class="flex items-center">
                                        <span class="mr-2">{{ $visitor['country_flag'] }}</span>
                                        {{ $visitor['country'] }}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{ \Carbon\Carbon::parse($visitor['last_visit'])->format('M j, Y g:i A') }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {{ $visitor['page_views'] ?? 1 }} views
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    @if($visitor['is_unique'])
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            New
                                        </span>
                                    @else
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            Return
                                        </span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-6 py-12 text-center">
                                    <div class="text-gray-500">
                                        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p class="text-sm font-medium">No visitor data available yet</p>
                                        <p class="text-xs text-gray-400 mt-1">Visitors will appear here as they access your site</p>
                                    </div>
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
            
            <!-- Summary Footer for Latest View -->
            @if(!$showAll && !$filters['search_ip'])
                <div class="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div class="text-sm text-gray-700">
                            <svg class="w-5 h-5 inline-block mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                            </svg>
                            <span class="font-medium">Showing latest 15 visitors</span>
                            <span class="text-gray-600 ml-1">• Total: {{ number_format($stats['unique_visitors']) }} unique visitors</span>
                        </div>
                        <a href="{{ route('admin.analytics', ['show_all' => 1] + $filters) }}" class="inline-flex items-center px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-50 transition-colors shadow-sm">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View All {{ number_format($stats['unique_visitors']) }} Visitors
                        </a>
                    </div>
                </div>
            @endif

            <!-- Pagination -->
            @if($showAll && is_object($visitors) && method_exists($visitors, 'hasPages') && $visitors->hasPages())
                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div class="text-sm text-gray-700">
                            Showing <span class="font-medium">{{ $visitors->firstItem() }}</span> to <span class="font-medium">{{ $visitors->lastItem() }}</span> of <span class="font-medium">{{ $visitors->total() }}</span> results
                        </div>
                        
                        <div class="flex gap-1">
                            {{-- Previous Page Link --}}
                            @if ($visitors->onFirstPage())
                                <span class="px-3 py-2 text-sm text-gray-400 bg-white border border-gray-300 rounded-md cursor-not-allowed">
                                    Previous
                                </span>
                            @else
                                <a href="{{ $visitors->appends(request()->except('page'))->previousPageUrl() }}" class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                    Previous
                                </a>
                            @endif

                            {{-- Pagination Elements --}}
                            @foreach ($visitors->getUrlRange(1, $visitors->lastPage()) as $page => $url)
                                @if ($page == $visitors->currentPage())
                                    <span class="px-3 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-md">
                                        {{ $page }}
                                    </span>
                                @else
                                    <a href="{{ $visitors->appends(request()->except('page'))->url($page) }}" class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                        {{ $page }}
                                    </a>
                                @endif
                            @endforeach

                            {{-- Next Page Link --}}
                            @if ($visitors->hasMorePages())
                                <a href="{{ $visitors->appends(request()->except('page'))->nextPageUrl() }}" class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                    Next
                                </a>
                            @else
                                <span class="px-3 py-2 text-sm text-gray-400 bg-white border border-gray-300 rounded-md cursor-not-allowed">
                                    Next
                                </span>
                            @endif
                        </div>
                    </div>
                </div>
            @endif
        </div>
    </div>

    <script>
        // Chart data from backend
        const chartData = @json($chartData ?? []);
        
        let trafficChart;
        
        function initChart() {
            const ctx = document.getElementById('trafficChart').getContext('2d');
            
            trafficChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData['7d']?.labels || [],
                    datasets: [{
                        label: 'Daily Visitors',
                        data: chartData['7d']?.data || [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8,
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
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#3b82f6',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    return `${context.parsed.y} visitors`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false,
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false,
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 12
                                },
                                callback: function(value) {
                                    return Math.floor(value);
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    },
                    elements: {
                        point: {
                            hoverBackgroundColor: '#3b82f6',
                            hoverBorderColor: '#ffffff',
                        }
                    }
                }
            });
        }
        
        function updateChart(period) {
            // Update active button
            document.querySelectorAll('.chart-period-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-100', 'text-blue-700');
                btn.classList.add('bg-gray-100', 'text-gray-700');
            });
            
            const activeBtn = document.querySelector(`[data-period="${period}"]`);
            activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
            activeBtn.classList.add('active', 'bg-blue-100', 'text-blue-700');
            
            // Update chart data
            const data = chartData[period] || { labels: [], data: [] };
            trafficChart.data.labels = data.labels;
            trafficChart.data.datasets[0].data = data.data;
            trafficChart.update('active');
        }
        
        // Initialize chart when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initChart();
        });
    </script>
</x-admin.layout>
