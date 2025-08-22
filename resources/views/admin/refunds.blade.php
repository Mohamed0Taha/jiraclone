<x-admin.layout 
    title="TaskPilot Admin - Refund Management" 
    page-title="Refund Management">

    @php
        // Normalize refund collection variable name to avoid undefined variable errors
        $refunds = $refundLogs ?? (isset($refunds) ? $refunds : null);
    @endphp

    <div class="space-y-8">
        <!-- Flash Messages -->
        @if(session('success'))
            <div class="flex items-center bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded shadow-sm">
                <span class="mr-2">✅</span> {{ session('success') }}
            </div>
        @endif
        @if(session('error'))
            <div class="flex items-center bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded shadow-sm">
                <span class="mr-2">❌</span> {{ session('error') }}
            </div>
        @endif

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-white rounded-lg shadow p-5 border-t-4 border-blue-500">
                <div class="text-sm text-gray-500 mb-1">Total Refunds</div>
                <div class="text-3xl font-bold text-gray-800">{{ $stats['total_refunds'] ?? 0 }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-5 border-t-4 border-green-500">
                <div class="text-sm text-gray-500 mb-1">Total Amount</div>
                <div class="text-3xl font-bold text-gray-800">${{ number_format($stats['total_amount'] ?? 0, 2) }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-5 border-t-4 border-yellow-500">
                <div class="text-sm text-gray-500 mb-1">This Month (Count)</div>
                <div class="text-3xl font-bold text-gray-800">{{ $stats['month_refunds'] ?? 0 }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-5 border-t-4 border-purple-500">
                <div class="text-sm text-gray-500 mb-1">This Month (Amount)</div>
                <div class="text-3xl font-bold text-gray-800">${{ number_format($stats['month_amount'] ?? 0, 2) }}</div>
            </div>
        </div>

        <!-- Customers Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-800">👥 Stripe Customers</h3>
                <span class="text-sm text-gray-500">{{ count($users) }} customers</span>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Stripe ID</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Subscription</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Recent Payments / Invoices</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        @forelse($users as $userData)
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4">
                                    <div class="font-medium text-gray-900">{{ $userData['user']->name }}</div>
                                    <div class="text-gray-500 text-xs">{{ $userData['user']->email }}</div>
                                </td>
                                <td class="px-6 py-4 text-xs font-mono text-gray-700">{{ $userData['user']->stripe_id }}</td>
                                <td class="px-6 py-4">
                                    @if($userData['subscription'])
                                        <span class="inline-flex px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">{{ ucfirst($userData['subscription']->stripe_status) }}</span>
                                    @else
                                        <span class="inline-flex px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600">No Sub</span>
                                    @endif
                                </td>
                                <td class="px-6 py-4 space-y-1">
                                    @if(isset($userData['stripe_data']['error']))
                                        <span class="text-red-600 text-xs">Stripe Error</span>
                                    @elseif(!empty($userData['stripe_data']['payments']))
                                        @foreach(array_slice($userData['stripe_data']['payments'], 0, 3) as $payment)
                                            <div class="flex items-center gap-2 text-xs">
                                                <code class="text-gray-600">{{ $payment['id'] }}</code>
                                                <span class="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">${{ $payment['amount'] }}</span>
                                                <span class="text-gray-400">{{ $payment['created'] }}</span>
                                                <button class="quick-refund-btn text-red-600 hover:text-red-800 font-semibold"
                                                    data-user-id="{{ $userData['user']->id }}"
                                                    data-user-name="{{ $userData['user']->name }}"
                                                    data-user-email="{{ $userData['user']->email }}"
                                                    data-payment-id="{{ $payment['id'] }}"
                                                    data-amount="{{ $payment['amount'] }}">
                                                    Refund
                                                </button>
                                            </div>
                                        @endforeach
                                        @if(count($userData['stripe_data']['payments']) > 3)
                                            <div class="text-xs text-gray-400">+{{ count($userData['stripe_data']['payments']) - 3 }} more</div>
                                        @endif
                                    @elseif(!empty($userData['stripe_data']['invoices']))
                                        @foreach(array_slice($userData['stripe_data']['invoices'], 0, 2) as $invoice)
                                            <div class="flex items-center gap-2 text-xs">
                                                <code class="text-gray-600">{{ $invoice['payment_intent'] }}</code>
                                                <span class="inline-flex px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">${{ $invoice['amount'] }}</span>
                                                <span class="text-gray-400">{{ $invoice['date'] }}</span>
                                                <button class="quick-refund-btn text-red-600 hover:text-red-800 font-semibold"
                                                    data-user-id="{{ $userData['user']->id }}"
                                                    data-user-name="{{ $userData['user']->name }}"
                                                    data-user-email="{{ $userData['user']->email }}"
                                                    data-payment-id="{{ $invoice['payment_intent'] }}"
                                                    data-amount="{{ $invoice['amount'] }}">
                                                    Refund
                                                </button>
                                            </div>
                                        @endforeach
                                    @else
                                        <span class="text-xs text-gray-400">No payments</span>
                                    @endif
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col gap-2 text-xs">
                                        <button class="open-refund-modal-btn bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                            data-user-id="{{ $userData['user']->id }}"
                                            data-user-name="{{ $userData['user']->name }}"
                                            data-user-email="{{ $userData['user']->email }}"
                                            data-has-subscription="{{ $userData['subscription'] ? 'true' : 'false' }}">
                                            Custom Refund
                                        </button>
                                        @if(!empty($userData['stripe_data']['payments']))
                                            <button class="view-all-payments-btn bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 border"
                                                data-user-id="{{ $userData['user']->id }}"
                                                data-user-name="{{ $userData['user']->name }}">
                                                View All ({{ count($userData['stripe_data']['payments']) }})
                                            </button>
                                        @endif
                                    </div>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500">No Stripe customers found</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recent Refunds -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-800">📋 Recent Refunds</h3>
                @if($refunds instanceof \Illuminate\Pagination\LengthAwarePaginator)
                    <span class="text-xs text-gray-500">Page {{ $refunds->currentPage() }} / {{ $refunds->lastPage() }}</span>
                @endif
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">ID</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Amount</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Type</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Reason</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Status</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Stripe Refund ID</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Processed By</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        @forelse($refunds as $refund)
                            <tr class="hover:bg-gray-50">
                                <td class="px-4 py-2 text-xs text-gray-500">{{ $refund->id }}</td>
                                <td class="px-4 py-2">
                                    <div class="text-gray-900 font-medium text-xs">{{ $refund->user->name }}</div>
                                    <div class="text-gray-500 text-[10px]">{{ $refund->user->email }}</div>
                                </td>
                                <td class="px-4 py-2 font-semibold text-gray-800">${{ number_format($refund->amount, 2) }}</td>
                                <td class="px-4 py-2">
                                    @php $typeColors = ['manual'=>'bg-yellow-100 text-yellow-700','subscription'=>'bg-blue-100 text-blue-700','payment'=>'bg-indigo-100 text-indigo-700']; @endphp
                                    <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium {{ $typeColors[$refund->type] ?? 'bg-gray-100 text-gray-600' }}">{{ ucfirst($refund->type) }}</span>
                                </td>
                                <td class="px-4 py-2"><span class="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">{{ str_replace('_',' ', ucfirst($refund->reason)) }}</span></td>
                                <td class="px-4 py-2">
                                    @php $statusColors = ['completed'=>'bg-green-100 text-green-700','manual'=>'bg-yellow-100 text-yellow-700']; @endphp
                                    <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium {{ $statusColors[$refund->status] ?? 'bg-red-100 text-red-700' }}">{{ ucfirst($refund->status) }}</span>
                                </td>
                                <td class="px-4 py-2 text-[10px] font-mono">{{ $refund->stripe_refund_id ?? '—' }}</td>
                                <td class="px-4 py-2 text-xs">{{ $refund->processedBy->name ?? 'System' }}</td>
                                <td class="px-4 py-2 text-xs text-gray-500">{{ optional($refund->processed_at)->format('M d, Y H:i') ?? '—' }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="9" class="px-6 py-6 text-center text-sm text-gray-500">No refunds found</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
            @if($refunds instanceof \Illuminate\Pagination\LengthAwarePaginator)
                <div class="px-6 py-4 border-t border-gray-200">{{ $refunds->links() }}</div>
            @endif
        </div>
    </div>

    <!-- All Customers Table -->
    <div class="row justify-content-center mb-4">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header bg-secondary text-white">
                    <h5 class="mb-0">👥 All Stripe Customers</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Stripe ID</th>
                                    <th>Subscription</th>
                                    <th>Recent Payments</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                @forelse($users as $userData)
                                <tr>
                                    <td>
                                        <strong>{{ $userData['user']->name }}</strong><br>
                                        <small class="text-muted">{{ $userData['user']->email }}</small>
                                    </td>
                                    <td>
                                        <code class="small">{{ $userData['user']->stripe_id }}</code>
                                    </td>
                                    <td>
                                        @if($userData['subscription'])
                                            <span class="badge bg-success">
                                                {{ ucfirst($userData['subscription']->stripe_status) }}
                                            </span><br>
                                            <small class="text-muted">{{ $userData['subscription']->name ?? 'default' }}</small>
                                        @else
                                            <span class="badge bg-secondary">No Subscription</span>
                                        @endif
                                    </td>
                                    <td>
                                        @if(isset($userData['stripe_data']['error']))
                                            <span class="text-danger small">
                                                <i class="fas fa-exclamation-circle"></i> Stripe Error
                                            </span>
                                        @elseif(!empty($userData['stripe_data']['payments']))
                                            <div class="payment-intents">
                                                @foreach(array_slice($userData['stripe_data']['payments'], 0, 3) as $payment)
                                                    <div class="mb-1">
                                                        <code class="small">{{ $payment['id'] }}</code>
                                                        <span class="badge bg-primary">${{ $payment['amount'] }}</span>
                                                        <small class="text-muted">{{ $payment['created'] }}</small>
                                                        <button class="btn btn-xs btn-outline-danger ms-1 quick-refund-btn"
                                                                data-user-id="{{ $userData['user']->id }}"
                                                                data-user-name="{{ $userData['user']->name }}"
                                                                data-user-email="{{ $userData['user']->email }}"
                                                                data-payment-id="{{ $payment['id'] }}"
                                                                data-amount="{{ $payment['amount'] }}">
                                                            Refund
                                                        </button>
                                                    </div>
                                                @endforeach
                                                @if(count($userData['stripe_data']['payments']) > 3)
                                                    <small class="text-muted">
                                                        +{{ count($userData['stripe_data']['payments']) - 3 }} more payments
                                                    </small>
                                                @endif
                                            </div>
                                        @elseif(!empty($userData['stripe_data']['invoices']))
                                            <div class="invoice-intents">
                                                @foreach(array_slice($userData['stripe_data']['invoices'], 0, 2) as $invoice)
                                                    <div class="mb-1">
                                                        <code class="small">{{ $invoice['payment_intent'] }}</code>
                                                        <span class="badge bg-info">${{ $invoice['amount'] }}</span>
                                                        <small class="text-muted">{{ $invoice['date'] }}</small>
                                                        <button class="btn btn-xs btn-outline-danger ms-1 quick-refund-btn"
                                                                data-user-id="{{ $userData['user']->id }}"
                                                                data-user-name="{{ $userData['user']->name }}"
                                                                data-user-email="{{ $userData['user']->email }}"
                                                                data-payment-id="{{ $invoice['payment_intent'] }}"
                                                                data-amount="{{ $invoice['amount'] }}">
                                                            Refund
                                                        </button>
                                                    </div>
                                                @endforeach
                                            </div>
                                        @else
                                            <span class="text-muted small">No payments found</span>
                                        @endif
                                    </td>
                                    <td>
                                        <div class="btn-group-vertical btn-group-sm">
                                            <button class="btn btn-primary btn-sm open-refund-modal-btn"
                                                    data-user-id="{{ $userData['user']->id }}"
                                                    data-user-name="{{ $userData['user']->name }}"
                                                    data-user-email="{{ $userData['user']->email }}"
                                                    data-has-subscription="{{ $userData['subscription'] ? 'true' : 'false' }}">
                                                Custom Refund
                                            </button>
                                            @if(!empty($userData['stripe_data']['payments']))
                                                <button class="btn btn-info btn-sm view-all-payments-btn"
                                                        data-user-id="{{ $userData['user']->id }}"
                                                        data-user-name="{{ $userData['user']->name }}">
                                                    View All ({{ count($userData['stripe_data']['payments']) }})
                                                </button>
                                            @endif
                                        </div>
                                    </td>
                                </tr>
                                @empty
                                <tr>
                                    <td colspan="5" class="text-center py-4">
                                        <em class="text-muted">No customers with Stripe accounts found</em>
                                    </td>
                                </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Refunds -->
    <div class="row justify-content-center">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header bg-dark text-white">
                    <h5 class="mb-0">📋 Recent Refunds</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Stripe Refund ID</th>
                                    <th>Processed By</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @forelse($refunds as $refund)
                                <tr>
                                    <td>{{ $refund->id }}</td>
                                    <td>
                                        <strong>{{ $refund->user->name }}</strong><br>
                                        <small class="text-muted">{{ $refund->user->email }}</small>
                                    </td>
                                    <td>${{ number_format($refund->amount, 2) }}</td>
                                    <td>
                                        @if($refund->type == 'manual')
                                            <span class="badge bg-warning">Manual</span>
                                        @elseif($refund->type == 'subscription')
                                            <span class="badge bg-info">Subscription</span>
                                        @elseif($refund->type == 'payment')
                                            <span class="badge bg-primary">Payment</span>
                                        @else
                                            <span class="badge bg-secondary">{{ ucfirst($refund->type) }}</span>
                                        @endif
                                    </td>
                                    <td>
                                        <span class="badge bg-secondary">{{ ucfirst($refund->reason) }}</span>
                                    </td>
                                    <td>
                                        @if($refund->status == 'completed')
                                            <span class="badge bg-success">Completed</span>
                                        @elseif($refund->status == 'manual')
                                            <span class="badge bg-warning">Manual Record</span>
                                        @else
                                            <span class="badge bg-danger">{{ ucfirst($refund->status) }}</span>
                                        @endif
                                    </td>
                                    <td>
                                        @if($refund->stripe_refund_id)
                                            <code class="small">{{ $refund->stripe_refund_id }}</code>
                                        @else
                                            <em class="text-muted">N/A</em>
                                        @endif
                                    </td>
                                    <td>
                                        @if($refund->processedBy)
                                            {{ $refund->processedBy->name }}
                                        @else
                                            <em class="text-muted">System</em>
                                        @endif
                                    </td>
                                    <td>
                                        @if($refund->processed_at)
                                            {{ $refund->processed_at->format('M d, Y H:i') }}
                                        @else
                                            <em class="text-muted">Not processed</em>
                                        @endif
                                    </td>
                                </tr>
                                @empty
                                <tr>
                                    <td colspan="9" class="text-center py-4">
                                        <em class="text-muted">No refunds found</em>
                                    </td>
                                </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>

                    @if($refunds instanceof \Illuminate\Pagination\LengthAwarePaginator)
                        <div class="d-flex justify-content-center">
                            {{ $refunds->links() }}
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Process Refund Modal (Tailwind) -->
<div id="processRefundModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        <form method="POST" action="{{ route('admin.refunds.process') }}" class="flex flex-col max-h-[90vh]">
            @csrf
            <input type="hidden" name="user_id" id="refund_user_id">
            <div class="px-6 py-4 border-b flex items-center justify-between">
                <h4 class="text-lg font-semibold">🔄 Process Stripe Refund</h4>
                <button type="button" onclick="closeRefundModal()" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div class="px-6 py-4 space-y-4 overflow-y-auto">
                <div class="text-sm">Customer: <span id="refund_customer_info" class="font-semibold text-gray-800"></span></div>
                <div class="space-y-1">
                    <label class="text-sm font-medium text-gray-700">Refund Type</label>
                    <select name="refund_type" id="refund_type" required onchange="toggleRefundFields()" class="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select refund type...</option>
                        <option value="subscription">Latest Subscription Invoice (Stripe)</option>
                        <option value="payment">Specific Payment Intent (Stripe)</option>
                        <option value="manual">Manual Record Only (No Stripe)</option>
                    </select>
                </div>
                <div id="payment_intent_field" class="space-y-1 hidden">
                    <label class="text-sm font-medium text-gray-700">Payment Intent ID</label>
                    <input type="text" name="payment_intent_id" placeholder="pi_..." class="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                    <p class="text-xs text-gray-500">Enter the Stripe Payment Intent to refund.</p>
                </div>
                <div id="manual_amount_field" class="space-y-1 hidden">
                    <label class="text-sm font-medium text-gray-700">Refund Amount ($)</label>
                    <input type="number" name="refund_amount" step="0.01" min="0.01" class="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                    <p class="text-xs text-gray-500">Amount for manual record keeping.</p>
                </div>
                <div class="space-y-1">
                    <label class="text-sm font-medium text-gray-700">Reason</label>
                    <select name="reason" required class="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select reason...</option>
                        <option value="customer_request">Customer Request</option>
                        <option value="billing_error">Billing Error</option>
                        <option value="service_issue">Service Issue</option>
                        <option value="duplicate_charge">Duplicate Charge</option>
                        <option value="fraudulent">Fraudulent</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-sm font-medium text-gray-700">Notes (optional)</label>
                    <textarea name="notes" rows="3" class="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Additional details..."></textarea>
                </div>
                <div id="stripe_warning" class="hidden text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded p-3">
                    ⚡ This will process an actual refund via Stripe.
                </div>
                <div id="manual_warning" class="hidden text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded p-3">
                    📝 Manual record only. No Stripe refund will occur.
                </div>
            </div>
            <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button type="button" onclick="closeRefundModal()" class="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" class="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700">Process Refund</button>
            </div>
        </form>
    </div>
</div>

<!-- Payment History Modal (Tailwind) -->
<div id="paymentHistoryModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b flex items-center justify-between">
            <h4 class="text-lg font-semibold">💳 Customer Payment History</h4>
            <button type="button" onclick="closePaymentHistoryModal()" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="px-6 py-4 overflow-y-auto">
            <div id="payment_history_loading" class="py-8 text-center text-sm text-gray-500">Loading payment history...</div>
            <div id="payment_history_content" class="hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full text-xs divide-y divide-gray-200" >
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left font-medium text-gray-600">Payment Intent</th>
                                <th class="px-3 py-2 text-left font-medium text-gray-600">Amount</th>
                                <th class="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                                <th class="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                                <th class="px-3 py-2 text-left font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody id="payment_history_tbody" class="divide-y divide-gray-100 bg-white"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="px-6 py-3 border-t bg-gray-50 flex justify-end">
            <button type="button" onclick="closePaymentHistoryModal()" class="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100">Close</button>
        </div>
    </div>
</div>

<x-slot name="scripts">
<script>
// Event listeners for buttons using data attributes
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.quick-refund-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.userId;
            const userName = btn.dataset.userName;
            const paymentId = btn.dataset.paymentId;
            const amount = btn.dataset.amount; // already dollars
            if (confirm(`Process quick refund of $${Number(amount).toFixed(2)} for ${userName}?`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '{{ route('admin.refunds.quick') }}';
                form.innerHTML = `@csrf<input type="hidden" name="user_id" value="${userId}"><input type="hidden" name="payment_intent_id" value="${paymentId}"><input type="hidden" name="amount" value="${Number(amount).toFixed(2)}"><input type="hidden" name="reason" value="Quick refund processed by admin">`;
                document.body.appendChild(form); form.submit();
            }
        });
    });
    document.querySelectorAll('.open-refund-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openRefundModal(btn.dataset.userId, btn.dataset.userName, btn.dataset.userEmail, btn.dataset.hasSubscription === 'true');
        });
    });
    document.querySelectorAll('.view-all-payments-btn').forEach(btn => {
        btn.addEventListener('click', () => viewPaymentHistory(btn.dataset.userId));
    });
});

function openRefundModal(userId, name, email, hasSubscription){
    document.getElementById('refund_user_id').value = userId;
    document.getElementById('refund_customer_info').textContent = `${name} (${email})`;
    const subscriptionOption = document.querySelector('#refund_type option[value="subscription"]');
    if(subscriptionOption){ subscriptionOption.hidden = !hasSubscription; }
    document.getElementById('refund_type').value='';
    document.querySelector('input[name="payment_intent_id"]').value='';
    document.querySelector('input[name="refund_amount"]').value='';
    document.querySelector('select[name="reason"]').value='';
    document.querySelector('textarea[name="notes"]').value='';
    toggleRefundFields();
    const modal = document.getElementById('processRefundModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}
function closeRefundModal(){ const m=document.getElementById('processRefundModal'); m.classList.add('hidden'); m.classList.remove('flex'); }

function toggleRefundFields() {
    const refundType = document.getElementById('refund_type').value;
    const paymentField = document.getElementById('payment_intent_field');
    const manualField = document.getElementById('manual_amount_field');
    const stripeWarning = document.getElementById('stripe_warning');
    const manualWarning = document.getElementById('manual_warning');
    
    // Hide all fields first
    paymentField.style.display = 'none';
    manualField.style.display = 'none';
    stripeWarning.style.display = 'none';
    manualWarning.style.display = 'none';
    
    // Show relevant fields based on type
    switch(refundType) {
        case 'payment':
            paymentField.style.display = 'block';
            stripeWarning.style.display = 'block';
            break;
        case 'manual':
            manualField.style.display = 'block';
            manualWarning.style.display = 'block';
            break;
        case 'subscription':
            stripeWarning.style.display = 'block';
            break;
    }
}

function viewPaymentHistory(userId) {
    const modal = document.getElementById('paymentHistoryModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    document.getElementById('payment_history_loading').style.display='block';
    document.getElementById('payment_history_content').style.display='none';
    
    // Fetch payment history from Stripe API
    fetch(`/admin/customers/${userId}/payments`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('payment_history_loading').style.display = 'none';
            
            if (data.error) {
                document.getElementById('payment_history_content').innerHTML = 
                    `<div class="alert alert-danger">${data.error}</div>`;
            } else {
                const tbody = document.getElementById('payment_history_tbody');
                tbody.innerHTML = '';
                
                if (data.payments.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No successful payments found</td></tr>';
                } else {
                    data.payments.forEach(payment => {
                        tbody.innerHTML += `
                            <tr>
                                <td><code class="small">${payment.id}</code></td>
                                <td><strong>$${payment.amount} ${payment.currency}</strong></td>
                                <td>${payment.description}</td>
                                <td>${payment.created}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="refundPayment('${payment.id}', ${payment.amount})">
                                        Quick Refund
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
            }
            
            document.getElementById('payment_history_content').style.display = 'block';
        })
        .catch(error => {
            document.getElementById('payment_history_loading').style.display = 'none';
            document.getElementById('payment_history_content').innerHTML = 
                `<div class="alert alert-danger">Error loading payment history: ${error.message}</div>`;
            document.getElementById('payment_history_content').style.display = 'block';
        });
}

function refundPayment(paymentIntentId, amount){
    closePaymentHistoryModal();
    setTimeout(()=>{
        document.getElementById('refund_type').value='payment';
        document.querySelector('input[name="payment_intent_id"]').value=paymentIntentId;
        document.querySelector('select[name="reason"]').value='customer_request';
        toggleRefundFields();
    },150);
}
function closePaymentHistoryModal(){ const m=document.getElementById('paymentHistoryModal'); m.classList.add('hidden'); m.classList.remove('flex'); }
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeRefundModal(); closePaymentHistoryModal(); }});
</script>
</x-slot>
</x-admin.layout>
