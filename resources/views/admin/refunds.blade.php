<x-admin.layout 
    title="TaskPilot Admin - Refund Management" 
    page-title="Refund Management">

    <x-slot name="extraHead">
        <!-- Bootstrap CSS (only loaded for this page) -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    </x-slot>

    @php
        // Normalize refund collection variable name to avoid undefined variable errors
        $refunds = $refundLogs ?? (isset($refunds) ? $refunds : null);
    @endphp

    <div class="space-y-6">
        <!-- Success/Error Messages -->
        @if(session('success'))
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                {{ session('success') }}
            </div>
        @endif

        @if(session('error'))
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {{ session('error') }}
            </div>
        @endif

                    <!-- Refund Statistics -->
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body text-center">
                                    <h5>Total Refunds</h5>
                                    <h3>{{ $stats['total_refunds'] ?? 0 }}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center">
                                    <h5>Total Amount</h5>
                                    <h3>${{ number_format($stats['total_amount'] ?? 0, 2) }}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body text-center">
                                    <h5>This Month</h5>
                                    <h3>{{ $stats['month_refunds'] ?? 0 }}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-danger text-white">
                                <div class="card-body text-center">
                                    <h5>Month Amount</h5>
                                    <h3>${{ number_format($stats['month_amount'] ?? 0, 2) }}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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

<!-- Process Refund Modal -->
<div class="modal fade" id="processRefundModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST" action="{{ route('admin.refunds.process') }}">
                @csrf
                <input type="hidden" name="user_id" id="refund_user_id">
                
                <div class="modal-header">
                    <h5 class="modal-title">🔄 Process Stripe Refund</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <div class="modal-body">
                    <div class="mb-3">
                        <strong>Customer:</strong> <span id="refund_customer_info"></span>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Refund Type</label>
                        <select name="refund_type" id="refund_type" class="form-control" required onchange="toggleRefundFields()">
                            <option value="">Select refund type...</option>
                            <option value="subscription">Latest Subscription Invoice (Stripe API)</option>
                            <option value="payment">Specific Payment Intent (Stripe API)</option>
                            <option value="manual">Manual Record Only (No API call)</option>
                        </select>
                    </div>

                    <div id="payment_intent_field" style="display: none;" class="mb-3">
                        <label class="form-label">Payment Intent ID</label>
                        <input type="text" name="payment_intent_id" class="form-control" placeholder="pi_...">
                        <small class="text-muted">Enter the Stripe Payment Intent ID to refund</small>
                    </div>

                    <div id="manual_amount_field" style="display: none;" class="mb-3">
                        <label class="form-label">Refund Amount ($)</label>
                        <input type="number" name="refund_amount" class="form-control" step="0.01" min="0.01" max="9999.99">
                        <small class="text-muted">Amount for manual record keeping</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Reason</label>
                        <select name="reason" class="form-control" required>
                            <option value="">Select reason...</option>
                            <option value="customer_request">Customer Request</option>
                            <option value="billing_error">Billing Error</option>
                            <option value="service_issue">Service Issue</option>
                            <option value="duplicate_charge">Duplicate Charge</option>
                            <option value="fraudulent">Fraudulent</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Notes (optional)</label>
                        <textarea name="notes" class="form-control" rows="3" placeholder="Additional details..."></textarea>
                    </div>

                    <div id="stripe_warning" class="alert alert-info" style="display: none;">
                        <strong>⚡ Stripe Integration:</strong> This will process an actual refund through the Stripe API and return money to the customer's payment method.
                    </div>

                    <div id="manual_warning" class="alert alert-warning" style="display: none;">
                        <strong>📝 Manual Record:</strong> This will only create a record in the database. No money will be refunded through Stripe.
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-danger">Process Refund</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Payment History Modal -->
<div class="modal fade" id="paymentHistoryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">💳 Customer Payment History</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="payment_history_loading" class="text-center py-4">
                    <div class="spinner-border" role="status"></div>
                    <div>Loading payment history from Stripe...</div>
                </div>
                <div id="payment_history_content" style="display: none;">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Payment Intent ID</th>
                                    <th>Amount</th>
                                    <th>Description</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="payment_history_tbody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<x-slot name="scripts">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<script>
// Event listeners for buttons using data attributes
document.addEventListener('DOMContentLoaded', function() {
    // Quick refund buttons
    document.querySelectorAll('.quick-refund-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const userName = this.dataset.userName;
            const userEmail = this.dataset.userEmail;
            const paymentId = this.dataset.paymentId;
            const amount = this.dataset.amount;
            
            if (confirm(`Process quick refund of $${(amount/100).toFixed(2)} for ${userName}?`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '{{ route("admin.refunds.quick") }}';
                
                form.innerHTML = `
                    @csrf
                    <input type="hidden" name="user_id" value="${userId}">
                    <input type="hidden" name="payment_intent_id" value="${paymentId}">
                    <input type="hidden" name="amount" value="${(amount/100).toFixed(2)}">
                    <input type="hidden" name="reason" value="Quick refund processed by admin">
                `;
                
                document.body.appendChild(form);
                form.submit();
            }
        });
    });

    // Open refund modal buttons
    document.querySelectorAll('.open-refund-modal-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const userName = this.dataset.userName;
            const userEmail = this.dataset.userEmail;
            const hasSubscription = this.dataset.hasSubscription === 'true';
            
            openRefundModal(userId, userName, userEmail, hasSubscription);
        });
    });

    // View all payments buttons
    document.querySelectorAll('.view-all-payments-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const userName = this.dataset.userName;
            
            viewPaymentHistory(userId);
        });
    });
});

function openRefundModal(userId, name, email, hasSubscription) {
    document.getElementById('refund_user_id').value = userId;
    document.getElementById('refund_customer_info').innerHTML = `<strong>${name}</strong> (${email})`;
    
    // Show/hide subscription option based on whether user has subscription
    const subscriptionOption = document.querySelector('option[value="subscription"]');
    if (hasSubscription) {
        subscriptionOption.style.display = 'block';
    } else {
        subscriptionOption.style.display = 'none';
    }
    
    // Reset form
    document.getElementById('refund_type').value = '';
    document.querySelector('input[name="payment_intent_id"]').value = '';
    document.querySelector('input[name="refund_amount"]').value = '';
    document.querySelector('select[name="reason"]').value = '';
    document.querySelector('textarea[name="notes"]').value = '';
    toggleRefundFields();
    
    new bootstrap.Modal(document.getElementById('processRefundModal')).show();
}

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
    const modal = new bootstrap.Modal(document.getElementById('paymentHistoryModal'));
    
    // Reset modal content
    document.getElementById('payment_history_loading').style.display = 'block';
    document.getElementById('payment_history_content').style.display = 'none';
    
    modal.show();
    
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

function refundPayment(paymentIntentId, amount) {
    // Close payment history modal and open refund modal with pre-filled payment ID
    bootstrap.Modal.getInstance(document.getElementById('paymentHistoryModal')).hide();
    
    setTimeout(() => {
        document.getElementById('refund_type').value = 'payment';
        document.querySelector('input[name="payment_intent_id"]').value = paymentIntentId;
        document.querySelector('select[name="reason"]').value = 'customer_request';
        toggleRefundFields();
    }, 300);
}
</script>
</x-slot>
</x-admin.layout>
