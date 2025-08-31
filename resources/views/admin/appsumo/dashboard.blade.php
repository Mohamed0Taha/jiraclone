<x-admin.layout title="AppSumo Code Management">
    @push('extra-head')
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    @endpush

    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">AppSumo Code Management</h1>
                    <p class="mt-1 text-sm text-gray-600">Generate, manage, and export AppSumo redemption codes</p>
                </div>
                <div class="flex items-center gap-3">
                    <a href="{{ route('admin.appsumo.export') }}" 
                       class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                        📥 Download CSV
                    </a>
                </div>
            </div>
        </div>

        <!-- Flash Messages -->
        @if(session('message'))
            <div class="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-green-800">{{ session('message') }}</p>
                    </div>
                </div>
            </div>
        @endif

        @if(session('error'))
            <div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-red-800">{{ session('error') }}</p>
                    </div>
                </div>
            </div>
        @endif

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                                🎁
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Total Codes</dt>
                                <dd class="text-lg font-medium text-gray-900">{{ $stats['total'] }}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                                ⏰
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Active Codes</dt>
                                <dd class="text-lg font-medium text-blue-600">{{ $stats['active'] }}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                                ✅
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Redeemed</dt>
                                <dd class="text-lg font-medium text-green-600">{{ $stats['redeemed'] }}</dd>
                                @if($stats['total'] > 0)
                                    <dd class="text-xs text-gray-500">{{ number_format(($stats['redeemed'] / $stats['total']) * 100, 1) }}% conversion</dd>
                                @endif
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                                ❌
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Expired</dt>
                                <dd class="text-lg font-medium text-red-600">{{ $stats['expired'] }}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Generate Codes Form -->
        <div class="bg-white shadow rounded-lg mb-8">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Generate New Codes</h3>
                <p class="text-sm text-gray-600 mb-4">Create new AppSumo redemption codes for distribution</p>
                
                <form action="{{ route('admin.appsumo.generate') }}" method="POST" class="flex items-end gap-4">
                    @csrf
                    <div class="flex-1">
                        <label for="count" class="block text-sm font-medium text-gray-700 mb-1">
                            Number of codes to generate
                        </label>
                        <input type="number" 
                               id="count" 
                               name="count" 
                               min="1" 
                               max="10000" 
                               value="{{ old('count', 100) }}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 @error('count') border-red-500 @enderror">
                        @error('count')
                            <p class="text-sm text-red-600 mt-1">{{ $message }}</p>
                        @enderror
                    </div>
                    
                    <button type="submit" 
                            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        ➕ Generate
                    </button>
                </form>
            </div>
        </div>

        <!-- Codes List -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">AppSumo Codes</h3>
                    <p class="text-sm text-gray-600">{{ $codes->count() }} total codes</p>
                </div>

                @if($codes->count() > 0)
                    <div class="overflow-hidden border border-gray-200 rounded-lg">
                        <!-- Table Header -->
                        <div class="bg-gray-50 px-6 py-3 grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div>Code</div>
                            <div>Status</div>
                            <div>Redeemed By</div>
                            <div>Redeemed At</div>
                            <div>Created At</div>
                            <div>Actions</div>
                        </div>

                        <!-- Table Body -->
                        <div class="bg-white divide-y divide-gray-200">
                            @foreach($codes as $code)
                                <div class="px-6 py-4 grid grid-cols-6 gap-4 items-center">
                    <!-- Code -->
                                    <div class="code-cell" data-code="{{ $code->code }}">
                                        <span class="code-visible font-mono text-sm">{{ $code->code }}</span>
                                        <button data-copy-text="{{ $code->code }}" 
                                                class="copy-btn ml-2 text-gray-400 hover:text-gray-600">
                                            📋
                                        </button>
                                    </div>

                                    <!-- Status -->
                                    <div>
                                        @switch($code->status)
                                            @case('active')
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    ⏰ Active
                                                </span>
                                                @break
                                            @case('redeemed')
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    ✅ Redeemed
                                                </span>
                                                @break
                                            @case('expired')
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    ❌ Expired
                                                </span>
                                                @break
                                        @endswitch
                                    </div>

                                    <!-- Redeemed By -->
                                    <div>
                                        @if($code->redeemedByUser)
                                            <div>
                                                <div class="text-sm font-medium text-gray-900">{{ $code->redeemedByUser->name }}</div>
                                                <div class="text-sm text-gray-500">{{ $code->redeemedByUser->email }}</div>
                                            </div>
                                        @else
                                            <span class="text-gray-400">-</span>
                                        @endif
                                    </div>

                                    <!-- Redeemed At -->
                                    <div class="text-sm text-gray-600">
                                        @if($code->redeemed_at)
                                            {{ $code->redeemed_at->format('M j, Y') }}
                                            <div class="text-xs text-gray-400">{{ $code->redeemed_at->format('H:i') }}</div>
                                        @else
                                            -
                                        @endif
                                    </div>

                                    <!-- Created At -->
                                    <div class="text-sm text-gray-600">
                                        {{ $code->created_at->format('M j, Y') }}
                                        <div class="text-xs text-gray-400">{{ $code->created_at->format('H:i') }}</div>
                                    </div>

                                    <!-- Actions -->
                                    <div>
                                        @if($code->status === 'active')
                                            <button data-copy-text="{{ url('/appsumo/redeem') }}/{{ $code->code }}"
                                                    class="copy-btn text-blue-600 hover:text-blue-800 text-sm">
                                                🔗 Copy Link
                                            </button>
                                        @endif
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>

                    <!-- Pagination -->
                    @if($codes instanceof \Illuminate\Pagination\LengthAwarePaginator)
                        <div class="mt-4">
                            {{ $codes->links() }}
                        </div>
                    @endif
                @else
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">🎁</div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No codes generated yet</h3>
                        <p class="text-gray-600">Generate your first batch of AppSumo codes to get started.</p>
                    </div>
                @endif
            </div>
        </div>

        <!-- Integration URLs -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">AppSumo Integration URLs</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Static Redemption URL</label>
                        <div class="flex items-center gap-2">
                            <input type="text" 
                                   readonly 
                                   value="{{ url('/appsumo/redeem') }}" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 font-mono text-sm">
                            <button data-copy-text="{{ url('/appsumo/redeem') }}" 
                                    class="copy-btn px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                                📋
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Users will enter their code on this page</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Dynamic Link with Embedded Code</label>
                        <div class="flex items-center gap-2">
                            <input type="text" 
                                   readonly 
                                   value="{{ url('/appsumo/redeem') }}/CODE" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 font-mono text-sm">
                            <button data-copy-text="{{ url('/appsumo/redeem') }}/CODE" 
                                    class="copy-btn px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                                📋
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Replace 'CODE' with actual code for direct redemption links</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Event delegation for copy buttons
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
                const button = e.target.classList.contains('copy-btn') ? e.target : e.target.closest('.copy-btn');
                const textToCopy = button.getAttribute('data-copy-text');
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = button.textContent;
                    button.textContent = '✅ Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    const originalText = button.textContent;
                    button.textContent = '❌ Failed';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                });
            }
        });
    </script>
</x-admin.layout>
