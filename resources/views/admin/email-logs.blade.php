<x-admin.layout title="TaskPilot Admin - Email Logs" page-title="Email Logs">

    <style>
        /* Custom styles for email logs table to prevent horizontal scrolling */
        .email-logs-table {
            min-width: 100%;
            table-layout: fixed;
        }
        
        .email-logs-table th,
        .email-logs-table td {
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Responsive adjustments */
        @media (max-width: 1024px) {
            .email-logs-table .hidden-lg {
                display: none;
            }
        }
        
        @media (max-width: 768px) {
            .email-logs-table .hidden-md {
                display: none;
            }
        }
    </style>

    <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Filters -->
            <form method="GET" class="bg-white p-4 rounded-lg shadow mb-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Type</label>
                        <select name="type" class="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="">All Types</option>
                            @foreach($emailTypes as $type)
                                <option value="{{ $type }}" {{ request('type') == $type ? 'selected' : '' }}>
                                    {{ ucfirst($type) }}
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="success" class="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="">All Status</option>
                            <option value="1" {{ request('success') === '1' ? 'selected' : '' }}>Successful</option>
                            <option value="0" {{ request('success') === '0' ? 'selected' : '' }}>Failed</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                            Filter
                        </button>
                        <a href="/admin/email-logs" class="ml-2 text-gray-600 hover:text-gray-800">Clear</a>
                    </div>
                </div>
            </form>

    <!-- Email Logs Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="w-full">
            <table class="email-logs-table w-full table-fixed divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">Recipient</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">Subject</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/12 hidden-md">Type</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/12">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/8">Sent At</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/12 hidden-lg">User</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/8">Actions</th>
                    </tr>
                </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        @forelse($emails as $email)
                            <tr class="hover:bg-gray-50">
                                <td class="px-4 py-4">
                                    <div class="text-sm font-medium text-gray-900 truncate">{{ $email->to_email }}</div>
                                    @if($email->to_name)
                                        <div class="text-xs text-gray-500 truncate">{{ $email->to_name }}</div>
                                    @endif
                                </td>
                                <td class="px-4 py-4">
                                    <div class="text-sm text-gray-900 truncate" title="{{ $email->subject }}">{{ $email->subject }}</div>
                                </td>
                                <td class="px-4 py-4 hidden-md">
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {{ ucfirst($email->type) }}
                                    </span>
                                </td>
                                <td class="px-4 py-4">
                                    @if($email->sent_successfully)
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            ✓ Sent
                                        </span>
                                    @else
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                            ✗ Failed
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-4 text-sm text-gray-500">
                                    <div class="truncate">{{ $email->created_at->format('M j, Y') }}</div>
                                    <div class="text-xs text-gray-400">{{ $email->created_at->format('H:i') }}</div>
                                </td>
                                <td class="px-4 py-4 text-sm text-gray-500 hidden-lg">
                                    <div class="truncate">
                                        @if($email->user)
                                            {{ $email->user->name }}
                                        @else
                                            N/A
                                        @endif
                                    </div>
                                </td>
                                <td class="px-4 py-4">
                                    <a href="{{ route('admin.email-logs.detail', $email) }}" 
                                       class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-200 border border-blue-300 inline-block">
                                        📧 View
                                    </a>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="7" class="px-4 py-12 text-center text-gray-500">
                                    No email logs found
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination -->
        <div class="mt-6">
                {{ $emails->withQueryString()->links() }}
            </div>
    </div>

</x-admin.layout>
