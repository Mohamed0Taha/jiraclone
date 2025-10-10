<x-admin.layout 
    title="TaskPilot Admin - Users" 
    page-title="User Management">

    <!-- No navActions slot so nothing shows in top nav for this page -->

    <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div class="flex flex-col gap-2 w-full lg:w-auto">
                <h2 class="text-xl font-semibold">All Users ({{ $users->total() }})</h2>
                <!-- Search (now inside page, not nav bar) -->
                <form method="GET" action="{{ route('admin.users') }}" class="flex items-center w-full max-w-md">
                    <input type="text" name="search" value="{{ request('search') }}" 
                           placeholder="Search users..." 
                           class="flex-grow border border-gray-300 rounded-l px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 text-sm">
                        Search
                    </button>
                </form>
            </div>
            <div class="flex items-center gap-3">
                <a href="{{ route('admin.users.create') }}" 
                   class="inline-flex items-center bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm font-medium shadow-sm">
                    + Create User
                </a>
            </div>
        </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last City</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @foreach($users as $user)
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">{{ $user->name }}</div>
                                            <div class="text-sm text-gray-500">{{ $user->email }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {{ $user->is_admin ? 'bg-red-100 text-red-800' : ($user->email_verified_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') }}">
                                        {{ $user->is_admin ? 'Admin' : ($user->email_verified_at ? 'Verified' : 'Unverified') }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    @php
                                        $userType = $user->getUserType();
                                    @endphp
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                        {{ $userType === 'AppSumo' ? 'bg-orange-100 text-orange-800' : 
                                           ($userType === 'Stripe' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800') }}">
                                        {{ $userType }}
                                        @if($userType === 'AppSumo')
                                            <span class="ml-1">🏷️</span>
                                        @elseif($userType === 'Stripe')
                                            <span class="ml-1">💳</span>
                                        @endif
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    @php
                                        $currentPlan = $user->getCurrentPlan();
                                        $hasSubscription = $user->hasActiveSubscription();
                                    @endphp
                                    @if($hasSubscription)
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {{ $currentPlan === 'basic' ? 'bg-blue-100 text-blue-800' : ($currentPlan === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800') }}">
                                            {{ ucfirst($currentPlan) }}{{ $user->onTrial() ? ' (Trial)' : '' }}
                                        </span>
                                        @if($user->cancellation_reason)
                                            <div class="mt-1">
                                                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800" title="Cancelled {{ $user->cancelled_at ? $user->cancelled_at->format('M j, Y') : '' }}">
                                                    ⚠️ {{ $user->getCancellationReasonLabel() }}
                                                </span>
                                            </div>
                                        @endif
                                    @else
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                            Free
                                        </span>
                                        @if($user->cancellation_reason)
                                            <div class="mt-1">
                                                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800" title="Cancelled {{ $user->cancelled_at ? $user->cancelled_at->format('M j, Y') : '' }}">
                                                    🚫 {{ $user->getCancellationReasonLabel() }}
                                                </span>
                                            </div>
                                        @endif
                                    @endif
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    @php
                                        $hasLoc = !empty($user->last_city) || !empty($user->last_country);
                                    @endphp
                                    <div class="text-gray-900">
                                        {{ $user->last_city ?? '—' }}
                                    </div>
                                    @if($hasLoc)
                                        <div class="text-xs text-gray-500">
                                            {{ $user->last_country ?? '' }}
                                            @if(!empty($user->last_ip))<span class="ml-1 text-gray-400">({{ $user->last_ip }})</span>@endif
                                        </div>
                                    @endif
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    @if(!empty($user->last_seen_at))
                                        <div class="text-gray-900">{{ $user->last_seen_at->format('M j, Y H:i') }}</div>
                                        <div class="text-xs text-gray-500">{{ $user->last_seen_at->diffForHumans() }}</div>
                                    @else
                                        —
                                    @endif
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{ $user->created_at->format('M j, Y') }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div class="flex items-center space-x-2">
                                        <!-- Edit User -->
                                        <a href="{{ route('admin.users.edit', $user) }}" 
                                           class="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-semibold hover:bg-blue-200 border border-blue-300">
                                            ✏️ Edit
                                        </a>
                                        
                                        <!-- Manual Verification (only show if not verified) -->
                                        @if(!$user->email_verified_at)
                                            <form method="POST" action="{{ route('admin.users.verify', $user) }}" class="inline">
                                                @csrf
                                                <button type="submit" class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-sm font-semibold hover:bg-emerald-200 border border-emerald-300"
                                                        onclick="return confirm('Manually verify {{ $user->name }}? This will mark their email as verified.')">
                                                    ✅ Verify
                                                </button>
                                            </form>
                                        @endif
                                        
                                        <!-- Upgrade User (dropdown) -->
                                        @php
                                            $currentPlan = $user->getCurrentPlan();
                                            $availableUpgrades = [];
                                            if ($currentPlan === 'free') $availableUpgrades = ['basic', 'pro', 'business'];
                                            elseif ($currentPlan === 'basic') $availableUpgrades = ['pro', 'business'];
                                            elseif ($currentPlan === 'pro') $availableUpgrades = ['business'];
                                        @endphp
                                        
                                        @if(!empty($availableUpgrades))
                                        <div class="relative inline-block text-left">
                                            <button type="button" class="inline-flex justify-center w-full rounded-md border border-purple-300 shadow-sm px-3 py-1 bg-purple-100 text-sm font-medium text-purple-700 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500" onclick="toggleUpgradeDropdown('{{ $user->id }}')">
                                                📈 Upgrade
                                                <svg class="-mr-1 ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                                </svg>
                                            </button>
                                            
                                            <div class="origin-top-right absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 hidden" id="upgrade-dropdown-{{ $user->id }}">
                                                <div class="py-1" role="menu">
                                                    @foreach($availableUpgrades as $plan)
                                                        <form method="POST" action="{{ route('admin.users.upgrade', $user) }}" class="inline w-full">
                                                            @csrf
                                                            <input type="hidden" name="plan" value="{{ $plan }}">
                                                            <button type="submit" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" onclick="return confirm('Upgrade {{ $user->name }} to {{ ucfirst($plan) }} plan?')">
                                                                {{ ucfirst($plan) }}
                                                            </button>
                                                        </form>
                                                    @endforeach
                                                </div>
                                            </div>
                                        </div>
                                        @endif
                                        
                                        <!-- Admin Toggle (always present; demote disabled if sole admin) -->
                                        @if(!$user->is_admin)
                                            <form method="POST" action="{{ route('admin.make-admin', $user) }}" class="inline">
                                                @csrf
                                                <button type="submit" class="bg-green-100 text-green-700 px-3 py-1 rounded text-sm font-semibold hover:bg-green-200 border border-green-300"
                                                        onclick="return confirm('Make {{ $user->name }} an admin? They will have full system access.')">
                                                    👑 Make Admin
                                                </button>
                                            </form>
                                        @else
                                            <form method="POST" action="{{ route('admin.demote-admin', $user) }}" class="inline">
                                                @csrf
                        <button type="submit" class="px-3 py-1 rounded text-sm font-semibold border {{ $adminCount <= 1 ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300' }}"
                            @if($adminCount <= 1) disabled title="Cannot demote the only admin" @else onclick="return confirm('Remove admin privileges from {{ $user->name }}? They will become a regular user.')" @endif>
                                                    {{ $adminCount <= 1 ? '👤 Sole Admin' : '👤 Demote Admin' }}
                                                </button>
                                            </form>
                                        @endif

                                        <!-- Delete User (always present; disabled if sole admin AND this user is that admin) -->
                                        <button type="button"
                                                class="px-3 py-1 rounded text-sm font-semibold border delete-user-btn {{ ($user->is_admin && $adminCount <= 1) ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300' }}"
                                                data-user-id="{{ $user->id }}"
                                                data-user-name="{{ $user->name }}"
                                                data-user-email="{{ $user->email }}"
                                                {{ ($user->is_admin && $adminCount <= 1) ? 'disabled title=\'Cannot delete the only admin\'' : '' }}>
                                            🗑️ Delete
                                        </button>
                                        <form method="POST" action="{{ route('admin.users.delete', $user) }}" class="hidden" id="fallback-delete-{{ $user->id }}">
                                            @csrf
                                            @method('DELETE')
                                        </form>
                                    </div>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                <div class="px-6 py-4 border-t border-gray-200">
                    {{ $users->links() }}
                </div>
            </div>

    <!-- Note: Removed two extra stray closing </div> tags that broke layout structure -->

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex items-center mb-4">
                <div class="flex-shrink-0">
                    <svg class="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <div class="ml-4">
                    <h3 class="text-lg font-medium text-red-600">⚠️ PERMANENT DELETION WARNING</h3>
                </div>
            </div>
            
            <div class="mb-6">
                <p class="text-sm text-gray-700 mb-3">
                    You are about to permanently delete user: <strong id="deleteUserName"></strong> (<span id="deleteUserEmail"></span>)
                </p>
                <p class="text-sm text-gray-700 mb-3">This will permanently delete:</p>
                <ul class="text-sm text-gray-600 list-disc ml-5 mb-4">
                    <li>User account and profile</li>
                    <li>All owned projects and tasks</li>
                    <li>All comments and activity</li>
                    <li>Subscription data</li>
                    <li>Email and AI usage logs</li>
                    <li>All associated data</li>
                </ul>
                <p class="text-sm font-semibold text-red-600">This action CANNOT be undone!</p>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Type "DELETE" to confirm:
                    </label>
                    <input type="text" id="confirmText" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-red-500" placeholder="Type DELETE here">
                </div>
            </div>
            
            <div class="flex justify-end space-x-3">
                <button type="button" onclick="closeDeleteModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                    Cancel
                </button>
                <button type="button" id="confirmDeleteBtn" onclick="executeDelete()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400" disabled>
                    Delete User
                </button>
            </div>
        </div>
    </div>

    <!-- Hidden form for deletion -->
    <form id="deleteForm" method="POST" style="display: none;">
        @csrf
        @method('DELETE')
    </form>

    <x-slot name="scripts">
        <script>
            let userToDelete = null;

            document.addEventListener('DOMContentLoaded', function() {
                // Delete user buttons
                document.querySelectorAll('.delete-user-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.userId;
                        const userName = this.dataset.userName;
                        const userEmail = this.dataset.userEmail;
                        
                        console.log('Delete button clicked for:', userName, userEmail, userId);
                        userToDelete = userId;
                        document.getElementById('deleteUserName').textContent = userName;
                        document.getElementById('deleteUserEmail').textContent = userEmail;
                        document.getElementById('confirmText').value = '';
                        document.getElementById('confirmDeleteBtn').disabled = true;
                        document.getElementById('deleteModal').classList.remove('hidden');
                        document.getElementById('deleteModal').classList.add('flex');
                    });
                });
            });

            function closeDeleteModal() {
                console.log('closeDeleteModal called');
                document.getElementById('deleteModal').classList.add('hidden');
                document.getElementById('deleteModal').classList.remove('flex');
                userToDelete = null;
            }

            function executeDelete() {
                console.log('executeDelete called with userToDelete:', userToDelete);
                if (userToDelete) {
                    // Try using the fallback form first
                    const fallbackForm = document.getElementById('fallback-delete-' + userToDelete);
                    if (fallbackForm) {
                        console.log('Using fallback form for user:', userToDelete);
                        fallbackForm.submit();
                    } else {
                        // Use the modal form as backup
                        const form = document.getElementById('deleteForm');
                        const actionUrl = '{{ url("/admin/users") }}/' + userToDelete;
                        console.log('Setting form action to:', actionUrl);
                        form.action = actionUrl;
                        console.log('Submitting modal form...');
                        form.submit();
                    }
                }
            }

            // Enable/disable delete button based on confirmation text
            document.getElementById('confirmText').addEventListener('input', function() {
                const confirmBtn = document.getElementById('confirmDeleteBtn');
                if (this.value === 'DELETE') {
                    confirmBtn.disabled = false;
                } else {
                    confirmBtn.disabled = true;
                }
            });

            // Close modal on escape key
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    closeDeleteModal();
                }
            });

            // Close modal when clicking outside
            document.getElementById('deleteModal').addEventListener('click', function(event) {
                if (event.target === this) {
                    closeDeleteModal();
                }
            });

            // Upgrade dropdown functionality
            function toggleUpgradeDropdown(userId) {
                const dropdown = document.getElementById('upgrade-dropdown-' + userId);
                const isVisible = !dropdown.classList.contains('hidden');
                
                // Close all dropdowns first
                document.querySelectorAll('[id^="upgrade-dropdown-"]').forEach(d => {
                    d.classList.add('hidden');
                });
                
                // Toggle current dropdown
                if (!isVisible) {
                    dropdown.classList.remove('hidden');
                }
            }

            // Close dropdowns when clicking outside
            document.addEventListener('click', function(event) {
                if (!event.target.closest('[id^="upgrade-dropdown-"]') && !event.target.closest('button[onclick*="toggleUpgradeDropdown"]')) {
                    document.querySelectorAll('[id^="upgrade-dropdown-"]').forEach(d => {
                        d.classList.add('hidden');
                    });
                }
            });
        </script>
    </x-slot>

</x-admin.layout>
