<x-admin.layout title="TaskPilot Admin - SMS Message Details" page-title="SMS Message Details">

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Back Button -->
        <div class="mb-6">
            <a href="/admin/sms-messages" class="inline-flex items-center text-blue-600 hover:text-blue-900">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Back to SMS Messages
            </a>
        </div>

        <!-- Message Details Card -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Message Information</h3>
            </div>
            
            <div class="px-6 py-6">
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Twilio Message SID</dt>
                        <dd class="mt-1 text-sm text-gray-900 font-mono">{{ $smsMessage->twilio_sid }}</dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">Status</dt>
                        <dd class="mt-1">
                            @if($smsMessage->status === 'delivered')
                                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                                    ✓ Delivered
                                </span>
                            @elseif($smsMessage->status === 'sent')
                                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                                    → Sent
                                </span>
                            @elseif($smsMessage->status === 'undelivered')
                                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    ⚠ Undelivered
                                </span>
                            @elseif($smsMessage->status === 'failed')
                                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                                    ✗ Failed
                                </span>
                            @else
                                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {{ ucfirst($smsMessage->status) }}
                                </span>
                            @endif
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">From Number</dt>
                        <dd class="mt-1 text-sm text-gray-900 font-mono">{{ $smsMessage->from_number }}</dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">To Number</dt>
                        <dd class="mt-1 text-sm text-gray-900 font-mono">{{ $smsMessage->to_number }}</dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">Cost</dt>
                        <dd class="mt-1 text-sm text-gray-900">
                            @if($smsMessage->price)
                                ${{ number_format($smsMessage->price, 4) }}
                                @if($smsMessage->price_unit)
                                    {{ strtoupper($smsMessage->price_unit) }}
                                @endif
                            @else
                                Not available
                            @endif
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">Direction</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ ucfirst($smsMessage->direction ?? 'outbound') }}</dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">Sent At</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ $smsMessage->created_at->format('M j, Y H:i:s T') }}</dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ $smsMessage->updated_at->format('M j, Y H:i:s T') }}</dd>
                    </div>

                    @if($smsMessage->user)
                    <div>
                        <dt class="text-sm font-medium text-gray-500">User</dt>
                        <dd class="mt-1 text-sm text-gray-900">
                            {{ $smsMessage->user->name }} ({{ $smsMessage->user->email }})
                        </dd>
                    </div>
                    @endif

                    @if($smsMessage->automation)
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Automation</dt>
                        <dd class="mt-1 text-sm text-gray-900">
                            {{ $smsMessage->automation->name }}
                        </dd>
                    </div>
                    @endif

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-gray-500">Message Body</dt>
                        <dd class="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-md">
                            {{ $smsMessage->body }}
                        </dd>
                    </div>

                    @if($smsMessage->error_message)
                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-gray-500">Error Message</dt>
                        <dd class="mt-1 text-sm text-red-600 bg-red-50 p-4 rounded-md">
                            {{ $smsMessage->error_message }}
                        </dd>
                    </div>
                    @endif

                    @if($smsMessage->error_code)
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Error Code</dt>
                        <dd class="mt-1 text-sm text-red-600">{{ $smsMessage->error_code }}</dd>
                    </div>
                    @endif
                </dl>
            </div>
        </div>

        <!-- Webhook Data (if available) -->
        @if($smsMessage->webhook_data)
        <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Webhook Data</h3>
            </div>
            <div class="px-6 py-6">
                <pre class="text-sm text-gray-900 bg-gray-50 p-4 rounded-md overflow-x-auto">{{ json_encode($smsMessage->webhook_data, JSON_PRETTY_PRINT) }}</pre>
            </div>
        </div>
        @endif
    </div>

</x-admin.layout>
