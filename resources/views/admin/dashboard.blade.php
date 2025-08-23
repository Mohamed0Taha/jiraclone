<x-admin.layout title="TaskPilot Admin - Dashboard" page-title="Dashboard Overview">

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                <!-- Users -->
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-100">Total Users</p>
                            <p class="text-3xl font-bold">{{ number_format($totalUsers) }}</p>
                        </div>
                        <div class="text-4xl opacity-80">👥</div>
                    </div>
                </div>

                <!-- Projects -->
                <div class="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-green-100">Total Projects</p>
                            <p class="text-3xl font-bold">{{ number_format($totalProjects) }}</p>
                        </div>
                        <div class="text-4xl opacity-80">📁</div>
                    </div>
                </div>

                <!-- Tasks -->
                <div class="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-purple-100">Total Tasks</p>
                            <p class="text-3xl font-bold">{{ number_format($totalTasks) }}</p>
                        </div>
                        <div class="text-4xl opacity-80">✅</div>
                    </div>
                </div>

                <!-- Emails Sent -->
                <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 rounded-lg shadow text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-indigo-100">Emails Sent</p>
                            <p class="text-3xl font-bold">{{ $recentEmails->count() }}</p>
                        </div>
                        <div class="text-4xl opacity-80">📧</div>
                    </div>
                </div>

                <!-- Revenue -->
                <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg shadow text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-yellow-100">Monthly Revenue</p>
                            <p class="text-3xl font-bold">${{ number_format($revenueStats['monthly_recurring_revenue'], 2) }}</p>
                        </div>
                        <div class="text-4xl opacity-80">💰</div>
                    </div>
                </div>

                <!-- Cancellations -->
                <div class="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg shadow text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-red-100">Cancellations</p>
                            <p class="text-3xl font-bold">{{ number_format($totalCancellations) }}</p>
                        </div>
                        <div class="text-4xl opacity-80">🚫</div>
                    </div>
                </div>
            </div>

    <!-- Navigation Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <a href="/admin/users" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">👥</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">User Management</h3>
                            <p class="text-gray-600">Manage users and admins</p>
                        </div>
                    </div>
                </a>

                <a href="/admin/refunds" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">💰</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Refunds</h3>
                            <p class="text-gray-600">Process customer refunds</p>
                        </div>
                    </div>
                </a>


                <a href="/admin/billing" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">💳</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Billing & Revenue</h3>
                            <p class="text-gray-600">Subscription analytics</p>
                        </div>
                    </div>
                </a>

                <a href="{{ route('admin.cancellations') }}" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">🚫</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Cancellations</h3>
                            <p class="text-gray-600">Track cancellation reasons</p>
                            <p class="text-sm text-red-600 font-medium mt-1">{{ number_format($totalCancellations) }} total cancellations</p>
                        </div>
                    </div>
                </a>

                <a href="/admin/email-logs" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">📧</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Email Logs</h3>
                            <p class="text-gray-600">Track sent emails</p>
                        </div>
                    </div>
                </a>

                <a href="/admin/openai-requests" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">🤖</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">AI Usage</h3>
                            <p class="text-gray-600">OpenAI requests & costs</p>
                        </div>
                    </div>
                </a>
                <a href="{{ route('admin.broadcast-email.form') }}" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex items-center">
                        <div class="text-3xl mr-4">✉️</div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Broadcast Email</h3>
                            <p class="text-gray-600">Send email to segments</p>
                        </div>
                    </div>
                </a>
            </div>

    <!-- Subscription Analytics -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Subscription Stats -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">💳 Subscription Overview</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Active Subscriptions</span>
                            <span class="font-semibold text-green-600">{{ $subscriptionStats['total_active'] }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Trial Subscriptions</span>
                            <span class="font-semibold text-blue-600">{{ $subscriptionStats['total_on_trial'] }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Cancelled</span>
                            <span class="font-semibold text-red-600">{{ $subscriptionStats['total_cancelled'] }}</span>
                        </div>
                    </div>
                </div>

                <!-- Plan Distribution -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">📊 Plans Distribution</h3>
                    <div class="space-y-4">
                        @foreach($subscriptionStats['by_plan'] as $plan => $count)
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">{{ $plan }}</span>
                            <span class="font-semibold text-blue-600">{{ $count }}</span>
                        </div>
                        @endforeach
                    </div>
                </div>
            </div>

    <!-- OpenAI Usage Stats -->
    @if($openaiStats['total_requests'] > 0)
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <!-- AI Usage Overview -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">🤖 AI Usage</h3>
                    <div class="space-y-3">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{{ number_format($openaiStats['total_requests']) }}</div>
                            <div class="text-sm text-gray-600">Total Requests</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${{ number_format($openaiStats['total_cost'], 2) }}</div>
                            <div class="text-sm text-gray-600">Total Cost</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">{{ number_format($openaiStats['total_tokens']) }}</div>
                            <div class="text-sm text-gray-600">Tokens Used</div>
                        </div>
                    </div>
                </div>

                <!-- Top Users -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">👑 Top AI Users</h3>
                    <div class="space-y-3">
                        @foreach($openaiStats['top_users']->take(5) as $user)
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="font-medium">{{ $user->user->name ?? 'Unknown' }}</div>
                                <div class="text-xs text-gray-500">{{ number_format($user->total_tokens) }} tokens</div>
                            </div>
                            <div class="text-sm font-semibold text-blue-600">{{ $user->request_count }} req</div>
                        </div>
                        @endforeach
                    </div>
                </div>

                <!-- Request Types -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">📈 Request Types</h3>
                    <div class="space-y-3">
                        @foreach($openaiStats['by_type'] as $type)
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">{{ ucfirst(str_replace('_', ' ', $type->request_type)) }}</span>
                            <span class="font-semibold text-blue-600">{{ $type->count }}</span>
                        </div>
                        @endforeach
                    </div>
                </div>
            </div>
    @endif

    <!-- Recent Email Logs -->
    @if($recentEmails->count() > 0)
    <div class="bg-white rounded-lg shadow mb-8">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">📧 Recent Emails</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @foreach($recentEmails->take(5) as $email)
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ $email->to_email }}</td>
                                <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{{ $email->subject }}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {{ ucfirst($email->type) }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    @if($email->sent_successfully)
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Success</span>
                                    @else
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Failed</span>
                                    @endif
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{ $email->created_at->diffForHumans() }}
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
                <div class="px-6 py-3 bg-gray-50">
                    <a href="/admin/email-logs" class="text-blue-600 hover:text-blue-800 text-sm font-medium">View all emails →</a>
                </div>
            </div>
    @endif

    <!-- System Status -->
    <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">⚡ System Status</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div class="text-green-500 text-2xl">●</div>
                        <div class="text-sm font-medium">Database</div>
                        <div class="text-xs text-gray-500">Online</div>
                    </div>
                    <div class="text-center">
                        <div class="text-green-500 text-2xl">●</div>
                        <div class="text-sm font-medium">Mail Service</div>
                        <div class="text-xs text-gray-500">Active</div>
                    </div>
                    <div class="text-center">
                        <div class="text-green-500 text-2xl">●</div>
                        <div class="text-sm font-medium">Stripe</div>
                        <div class="text-xs text-gray-500">Connected</div>
                    </div>
                    <div class="text-center">
                        <div class="text-green-500 text-2xl">●</div>
                        <div class="text-sm font-medium">Application</div>
                        <div class="text-xs text-gray-500">Healthy</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</x-admin.layout>
