<x-admin.layout title="TaskPilot Admin - Email Detail" page-title="Email Log Detail">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Back Button -->
        <div class="mb-6">
            <a href="{{ route('admin.email-logs') }}" 
               class="inline-flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm font-medium">
                ← Back to Email Logs
            </a>
        </div>

        <!-- Email Details -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 class="text-xl font-semibold text-gray-900">Email Details</h2>
            </div>
            
            <div class="px-6 py-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <!-- Recipient Information -->
                    <div>
                        <h3 class="text-sm font-medium text-gray-500 mb-2">Recipient Information</h3>
                        <div class="space-y-2">
                            <div>
                                <span class="text-sm font-medium text-gray-700">Email:</span>
                                <span class="text-sm text-gray-900 ml-2">{{ $emailLog->to_email }}</span>
                            </div>
                            @if($emailLog->to_name)
                                <div>
                                    <span class="text-sm font-medium text-gray-700">Name:</span>
                                    <span class="text-sm text-gray-900 ml-2">{{ $emailLog->to_name }}</span>
                                </div>
                            @endif
                            @if($emailLog->user)
                                <div>
                                    <span class="text-sm font-medium text-gray-700">User Account:</span>
                                    <span class="text-sm text-gray-900 ml-2">{{ $emailLog->user->name }} ({{ $emailLog->user->email }})</span>
                                </div>
                            @endif
                        </div>
                    </div>

                    <!-- Email Metadata -->
                    <div>
                        <h3 class="text-sm font-medium text-gray-500 mb-2">Email Metadata</h3>
                        <div class="space-y-2">
                            <div>
                                <span class="text-sm font-medium text-gray-700">Subject:</span>
                                <span class="text-sm text-gray-900 ml-2">{{ $emailLog->subject }}</span>
                            </div>
                            <div>
                                <span class="text-sm font-medium text-gray-700">Type:</span>
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ml-2">
                                    {{ ucfirst($emailLog->type) }}
                                </span>
                            </div>
                            <div>
                                <span class="text-sm font-medium text-gray-700">Status:</span>
                                @if($emailLog->sent_successfully)
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 ml-2">
                                        ✓ Sent Successfully
                                    </span>
                                @else
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ml-2">
                                        ✗ Failed
                                    </span>
                                @endif
                            </div>
                            <div>
                                <span class="text-sm font-medium text-gray-700">Sent At:</span>
                                <span class="text-sm text-gray-900 ml-2">{{ $emailLog->created_at->format('M j, Y H:i:s T') }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Message (if failed) -->
                @if(!$emailLog->sent_successfully && $emailLog->error_message)
                    <div class="mb-6">
                        <h3 class="text-sm font-medium text-gray-500 mb-2">Error Message</h3>
                        <div class="bg-red-50 border border-red-200 rounded-md p-3">
                            <div class="text-sm text-red-700 font-mono">
                                {{ $emailLog->error_message }}
                            </div>
                        </div>
                    </div>
                @endif

                <!-- Email Content -->
                @if($emailLog->content)
                    <div>
                        <h3 class="text-sm font-medium text-gray-500 mb-2">Email Content</h3>
                        <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                            <div class="prose max-w-none">
                                @if(Str::contains($emailLog->content, '<'))
                                    <!-- HTML Content -->
                                    <div class="bg-white border rounded p-4 mb-4">
                                        <h4 class="text-sm font-medium text-gray-700 mb-2">Rendered Preview:</h4>
                                        <div class="email-preview" style="max-height: 400px; overflow-y: auto;">
                                            {!! $emailLog->content !!}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 class="text-sm font-medium text-gray-700 mb-2">Raw HTML Source:</h4>
                                        <pre class="text-xs text-gray-800 bg-white border rounded p-3 overflow-x-auto"><code>{{ $emailLog->content }}</code></pre>
                                    </div>
                                @else
                                    <!-- Plain Text Content -->
                                    <div class="bg-white border rounded p-4">
                                        <h4 class="text-sm font-medium text-gray-700 mb-2">Plain Text Content:</h4>
                                        <pre class="text-sm text-gray-800 whitespace-pre-wrap">{{ $emailLog->content }}</pre>
                                    </div>
                                @endif
                            </div>
                        </div>
                    </div>
                @else
                    <div>
                        <h3 class="text-sm font-medium text-gray-500 mb-2">Email Content</h3>
                        <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                            <p class="text-sm text-gray-500 italic">No content available (content not logged for this email)</p>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </div>

</x-admin.layout>
