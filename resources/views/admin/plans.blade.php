<x-admin.layout title="TaskPilot Admin - Plans" page-title="Stripe Pricing (Live)">
    @if(session('success'))
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">{!! session('success') !!}</div>
    @endif
    @if(session('error'))
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{!! session('error') !!}</div>
    @endif
    @if(!empty($stripeError))
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">Stripe error: {{ $stripeError }}</div>
    @endif

    <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">Live Stripe Prices</h2>
        <form method="POST" action="{{ route('admin.plans.sync') }}" class="inline-block">
            @csrf
            <button type="submit" class="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow">🔄 Refresh from Stripe</button>
        </form>
    </div>

    <div class="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Price ID</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Amount ({{ strtoupper($stripePlans->first()['currency'] ?? 'USD') }})</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Interval</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
                @forelse($stripePlans as $p)
                    <tr @class(['bg-red-50'=>isset($p['error'])])>
                        <td class="px-4 py-3 font-medium text-gray-800">
                            {{ $p['name'] }}
                            @if(isset($p['previous_price_id']))
                                <div class="text-xs text-amber-600">Replaced {{ $p['previous_price_id'] }} – update .env to persist.</div>
                            @endif
                            @if(isset($p['error']))<div class="text-xs text-red-600">{{ $p['error'] }}</div>@endif
                        </td>
                        <td class="px-4 py-3 text-xs font-mono text-gray-700">{{ $p['price_id'] }}</td>
                        <td class="px-4 py-3">
                            @if(empty($p['error']) && ($p['currency'] ?? 'N/A') !== 'N/A')
                                <form method="POST" action="{{ route('admin.plans.price.update') }}" class="flex items-center gap-2">
                                    @csrf
                                    <input type="hidden" name="price_id" value="{{ $p['price_id'] }}" />
                                    <input type="hidden" name="plan_key" value="{{ $p['plan_key'] ?? 'debug-missing' }}" />
                                    <!-- Debug: {{ json_encode($p) }} -->
                                    <input aria-label="Amount" type="number" step="0.01" min="0.5" name="amount" value="{{ number_format($p['amount'],2,'.','') }}" class="w-24 border-gray-300 rounded-md text-xs px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono" />
                                    <span class="text-xs text-gray-500">/{{ $p['interval'] }}</span>
                                    <button type="submit" class="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
                                </form>
                            @else
                                <span class="text-gray-500">—</span>
                            @endif
                        </td>
                        <td class="px-4 py-3 text-gray-600">{{ $p['interval'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500">No Stripe price IDs configured or fetched.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="mt-6 flex justify-end">
        <a href="{{ route('admin.dashboard') }}" class="text-sm text-gray-600 hover:text-gray-800">Back</a>
    </div>
</x-admin.layout>
