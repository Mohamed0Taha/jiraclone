<x-admin.layout title="LinkedIn Sales Navigator - Lead Management" page-title="Sales Navigator">

<div class="max-w-7xl mx-auto py-8 px-4 space-y-8">
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg p-6">
        <h1 class="text-3xl font-bold mb-2">LinkedIn Sales Navigator</h1>
        <p class="text-blue-100">Extract leads from Sales Navigator URLs and create bulk message campaigns</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-500">Total Leads</div>
                    <div class="text-2xl font-bold text-gray-900" id="total-leads">{{ $leads->count() }}</div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-500">Message Batches</div>
                    <div class="text-2xl font-bold text-gray-900" id="total-batches">{{ $batches->count() }}</div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-500">Selected</div>
                    <div class="text-2xl font-bold text-gray-900" id="selected-count">0</div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-500">Messages Ready</div>
                    <div class="text-2xl font-bold text-gray-900" id="messages-ready">{{ $batches->sum('total') }}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- LinkedIn Authentication Status -->
    @if(!$linkedInAuthConfigured)
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div class="flex">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">LinkedIn Authentication Required</h3>
                <div class="mt-2 text-sm text-yellow-700">
                    <p>To extract real leads from LinkedIn Sales Navigator, you need to configure your authentication cookies.</p>
                    <details class="mt-3">
                        <summary class="cursor-pointer font-medium hover:text-yellow-900">Click here for setup instructions</summary>
                        <div class="mt-3 bg-white rounded-md p-3 border border-yellow-200">
                            <ol class="list-decimal list-inside space-y-1 text-sm">
                                @foreach($authInstructions['instructions'] as $instruction)
                                    <li>{{ $instruction }}</li>
                                @endforeach
                            </ol>
                            <div class="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                                <p class="font-semibold mb-1">Add these to your .env file:</p>
                                @foreach($authInstructions['env_variables'] as $key => $description)
                                    <p>{{ $key }}=<span class="text-gray-500">{{ $description }}</span></p>
                                @endforeach
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    </div>
    @else
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div class="flex">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">LinkedIn Authentication Configured</h3>
                <p class="mt-1 text-sm text-green-700">Ready to extract leads from Sales Navigator!</p>
            </div>
        </div>
    </div>
    @endif

    <!-- Lead Import Section -->
    <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Import Leads from Sales Navigator</h2>
        <div class="space-y-4">
            <div>
                <label for="sn-url" class="block text-sm font-medium text-gray-700 mb-2">Sales Navigator Search URL</label>
                <input 
                    id="sn-url" 
                    type="text" 
                    placeholder="https://www.linkedin.com/sales/search/people?query=..." 
                    class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value="https://www.linkedin.com/sales/search/people?query=(spellCorrectionEnabled%3Atrue%2Ckeywords%3Aproject%2520manager)&sessionId=2q%2Fose4ITH24wbD2nhESMA%3D%3D"
                />
                <p class="mt-1 text-xs text-gray-500">Paste your LinkedIn Sales Navigator search URL here</p>
            </div>
            
            <div class="flex items-center space-x-4">
                <div>
                    <label for="lead-count" class="block text-sm font-medium text-gray-700 mb-1">Number of Leads</label>
                    <select id="lead-count" class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="25">25 leads</option>
                        <option value="50">50 leads</option>
                        <option value="100">100 leads</option>
                    </select>
                </div>
                
                <div class="flex-1 flex space-x-3">
                    <button 
                        id="btn-test-auth" 
                        class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                    >
                        <span class="btn-text">Test Auth</span>
                        <span class="btn-spinner hidden">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Testing...
                        </span>
                    </button>
                    
                    <button 
                        id="btn-ingest" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                    >
                        <span class="btn-text">Extract Leads</span>
                        <span class="btn-spinner hidden">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Extracting...
                        </span>
                    </button>
                </div>
            </div>
            
            <div id="ingest-status" class="text-sm"></div>
        </div>
    </div>

    <!-- Message Template Section -->
    <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Create Message Template</h2>
        <div class="space-y-4">
            <div>
                <label for="batch-name" class="block text-sm font-medium text-gray-700 mb-2">Batch Name (Optional)</label>
                <input 
                    id="batch-name" 
                    type="text" 
                    placeholder="e.g., Project Manager Outreach - January 2025" 
                    class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            
            <div>
                <label for="message-template" class="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
                <textarea 
                    id="message-template" 
                    rows="6" 
                    class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hi @verbatim{{first_name}}@endverbatim, I noticed your experience at @verbatim{{company}}@endverbatim and would love to connect..."
                >@verbatim
Hi {{first_name}},

I noticed your experience as a {{title}} at {{company}} and was impressed by your background. I'd love to connect and explore potential collaboration opportunities.

Best regards!
@endverbatim</textarea>
            </div>
            
            <div class="bg-gray-50 rounded-md p-4">
                <h3 class="text-sm font-medium text-gray-700 mb-2">Available Template Variables:</h3>
                <div class="flex flex-wrap gap-2">
                    <code class="bg-white px-2 py-1 rounded text-xs border">@verbatim{{full_name}}@endverbatim</code>
                    <code class="bg-white px-2 py-1 rounded text-xs border">@verbatim{{first_name}}@endverbatim</code>
                    <code class="bg-white px-2 py-1 rounded text-xs border">@verbatim{{last_name}}@endverbatim</code>
                    <code class="bg-white px-2 py-1 rounded text-xs border">@verbatim{{title}}@endverbatim</code>
                    <code class="bg-white px-2 py-1 rounded text-xs border">@verbatim{{company}}@endverbatim</code>
                    <code class="bg-white px-2 py-1 rounded text-xs border">@verbatim{{location}}@endverbatim</code>
                </div>
            </div>
            
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    <span id="selected-for-batch">0</span> leads selected for messaging
                </div>
                <button 
                    id="btn-create-batch" 
                    class="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled
                >
                    Create Message Batch
                </button>
            </div>
        </div>
    </div>

    <!-- Leads Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900">Leads</h2>
                <div class="flex items-center space-x-3">
                    <button id="btn-select-all" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Select All</button>
                    <button id="btn-clear-selection" class="text-sm text-gray-600 hover:text-gray-800 font-medium">Clear Selection</button>
                    <button id="btn-export" class="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors">Export CSV</button>
                </div>
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200" id="leads-table">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input type="checkbox" id="select-all-checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- Leads will be populated here by JavaScript -->
                </tbody>
            </table>
        </div>
        
        <div id="no-leads" class="hidden px-6 py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 20h8v-2a5 5 0 00-10 0v2zM7 10a3 3 0 106 0v1H7v-1z"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No leads yet</h3>
            <p class="mt-1 text-sm text-gray-500">Get started by importing leads from LinkedIn Sales Navigator.</p>
        </div>
    </div>

    <!-- Message Batches -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-900">Recent Message Batches</h2>
        </div>
        
        <div class="divide-y divide-gray-200" id="batches-container">
            <!-- Batches will be populated here by JavaScript -->
        </div>
        
        <div id="no-batches" class="hidden px-6 py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No message batches yet</h3>
            <p class="mt-1 text-sm text-gray-500">Create your first message batch by selecting leads and composing a template.</p>
        </div>
    </div>
</div>

<script>
    console.log('Sales Navigator script loaded');
    
    // Initialize with empty data for now
    const initialData = {
        leads: [],
        batches: []
    };

    // Application state
    const state = {
        leads: [],
        batches: [],
        selectedLeads: new Set(),
        isLoading: false
    };

    // Load initial data from server
    async function loadInitialData() {
        try {
            const response = await fetch('/admin/sales?partial=1');
            if (response.ok) {
                const data = await response.json();
                state.leads = data.leads || [];
                state.batches = data.batches || [];
                render();
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Utility functions
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function updateCounts() {
        document.getElementById('total-leads').textContent = state.leads.length;
        document.getElementById('total-batches').textContent = state.batches.length;
        document.getElementById('selected-count').textContent = state.selectedLeads.size;
        document.getElementById('selected-for-batch').textContent = state.selectedLeads.size;
        document.getElementById('messages-ready').textContent = state.batches.reduce((sum, batch) => sum + (batch.total || 0), 0);
        
        // Update create batch button state
        const createBatchBtn = document.getElementById('btn-create-batch');
        createBatchBtn.disabled = state.selectedLeads.size === 0;
    }

    function renderLeads() {
        const tbody = document.querySelector('#leads-table tbody');
        const noLeadsDiv = document.getElementById('no-leads');
        
        if (state.leads.length === 0) {
            tbody.innerHTML = '';
            noLeadsDiv.classList.remove('hidden');
            return;
        }
        
        noLeadsDiv.classList.add('hidden');
        tbody.innerHTML = state.leads.map(lead => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <input 
                        type="checkbox" 
                        data-lead-id="${lead.id}" 
                        class="lead-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        ${state.selectedLeads.has(lead.id) ? 'checked' : ''}
                    >
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${lead.full_name || ''}</div>
                    ${lead.linkedin_profile_url ? `<a href="${lead.linkedin_profile_url}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800">View Profile</a>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.title || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.company || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lead.location || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(lead.status)}">
                        ${lead.status || 'new'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                        class="text-red-600 hover:text-red-900 delete-lead" 
                        data-lead-id="${lead.id}"
                        title="Delete lead"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function getStatusClass(status) {
        const classes = {
            'new': 'bg-green-100 text-green-800',
            'contacted': 'bg-blue-100 text-blue-800',
            'responded': 'bg-purple-100 text-purple-800',
            'not_interested': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    function renderBatches() {
        const container = document.getElementById('batches-container');
        const noBatchesDiv = document.getElementById('no-batches');
        
        if (state.batches.length === 0) {
            container.innerHTML = '';
            noBatchesDiv.classList.remove('hidden');
            return;
        }
        
        noBatchesDiv.classList.add('hidden');
        container.innerHTML = state.batches.map(batch => `
            <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h3 class="text-sm font-medium text-gray-900">
                            ${batch.name || `Batch #${batch.id}`}
                        </h3>
                        <div class="mt-1 text-sm text-gray-500">
                            Created ${formatDate(batch.created_at)} • ${batch.total || 0} messages
                            ${batch.sent ? ` • ${batch.sent} sent` : ''}
                            ${batch.failed ? ` • ${batch.failed} failed` : ''}
                        </div>
                        ${batch.template_raw ? `
                            <div class="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 max-w-md truncate">
                                ${batch.template_raw.substring(0, 100)}${batch.template_raw.length > 100 ? '...' : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBatchStatusClass(batch.status)}">
                            ${batch.status || 'draft'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function getBatchStatusClass(status) {
        const classes = {
            'draft': 'bg-gray-100 text-gray-800',
            'sending': 'bg-yellow-100 text-yellow-800',
            'sent': 'bg-green-100 text-green-800',
            'failed': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    // Event handlers
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, setting up event handlers');
        
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('lead-checkbox')) {
                const leadId = parseInt(e.target.dataset.leadId);
                if (e.target.checked) {
                    state.selectedLeads.add(leadId);
                } else {
                    state.selectedLeads.delete(leadId);
                }
                updateCounts();
            }
            
            if (e.target.id === 'select-all-checkbox') {
                const checkboxes = document.querySelectorAll('.lead-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const leadId = parseInt(cb.dataset.leadId);
                    if (e.target.checked) {
                        state.selectedLeads.add(leadId);
                    } else {
                        state.selectedLeads.delete(leadId);
                    }
                });
                updateCounts();
            }
        });

        document.addEventListener('click', async (e) => {
            console.log('Click event detected:', e.target.id);
            
            if (e.target.id === 'btn-select-all' || e.target.closest('#btn-select-all')) {
                state.leads.forEach(lead => state.selectedLeads.add(lead.id));
                document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = true);
                document.getElementById('select-all-checkbox').checked = true;
                updateCounts();
            }
            
            if (e.target.id === 'btn-clear-selection' || e.target.closest('#btn-clear-selection')) {
                state.selectedLeads.clear();
                document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = false);
                document.getElementById('select-all-checkbox').checked = false;
                updateCounts();
            }
            
            if (e.target.id === 'btn-export' || e.target.closest('#btn-export')) {
                window.location.href = '/admin/leads/export';
            }
            
            if (e.target.classList.contains('delete-lead')) {
                const leadId = parseInt(e.target.dataset.leadId);
                if (confirm('Are you sure you want to delete this lead?')) {
                    await deleteLead(leadId);
                }
            }
            
            // Check if the clicked element is the extract button or its child
            if (e.target.id === 'btn-ingest' || e.target.closest('#btn-ingest')) {
                console.log('Extract Leads button clicked');
                await ingestLeads();
            }
            
            // Check if the clicked element is the test auth button or its child
            if (e.target.id === 'btn-test-auth' || e.target.closest('#btn-test-auth')) {
                console.log('Test Auth button clicked');
                await testLinkedInAuth();
            }
            
            // Check if the clicked element is the create batch button or its child
            if (e.target.id === 'btn-create-batch' || e.target.closest('#btn-create-batch')) {
                await createMessageBatch();
            }
        });
    });

    // API functions
    async function ingestLeads() {
        console.log('ingestLeads function called');
        const url = document.getElementById('sn-url').value.trim();
        const count = parseInt(document.getElementById('lead-count').value);
        
        console.log('URL:', url);
        console.log('Count:', count);
        
        if (!url) {
            alert('Please enter a Sales Navigator URL');
            return;
        }
        
        const btn = document.getElementById('btn-ingest');
        const btnText = btn.querySelector('.btn-text');
        const btnSpinner = btn.querySelector('.btn-spinner');
        const statusDiv = document.getElementById('ingest-status');
        
        btn.disabled = true;
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        statusDiv.innerHTML = '<div class="text-blue-600">Extracting leads from Sales Navigator URL...</div>';
        
        try {
            const response = await fetch('/admin/sales/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ url, count })
            });
            
            const data = await response.json();
            
            if (data.success) {
                statusDiv.innerHTML = `<div class="text-green-600">✓ Successfully extracted ${data.inserted} new leads (${data.total_processed} total processed)</div>`;
                await refreshData();
            } else {
                statusDiv.innerHTML = '<div class="text-red-600">✗ Failed to extract leads</div>';
            }
        } catch (error) {
            statusDiv.innerHTML = '<div class="text-red-600">✗ Error extracting leads</div>';
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }

    async function testLinkedInAuth() {
        const btn = document.getElementById('btn-test-auth');
        const btnText = btn.querySelector('.btn-text');
        const btnSpinner = btn.querySelector('.btn-spinner');
        const statusDiv = document.getElementById('ingest-status');

        try {
            btn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            statusDiv.innerHTML = '<div class="text-blue-600">Testing LinkedIn authentication...</div>';

            const response = await fetch('{{ route("admin.sales.test-auth") }}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            });

            const data = await response.json();
            
            if (data.success) {
                statusDiv.innerHTML = '<div class="text-green-600">✓ LinkedIn authentication successful!</div>';
            } else {
                let errorMessage = `<div class="text-red-600">✗ ${data.message}</div>`;
                
                if (data.next_steps) {
                    errorMessage += '<div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded"><h4 class="font-medium text-yellow-800 mb-2">Manual Cookie Setup Required:</h4><ol class="list-decimal list-inside text-sm text-yellow-700 space-y-1">';
                    data.next_steps.forEach(step => {
                        errorMessage += `<li>${step}</li>`;
                    });
                    errorMessage += '</ol></div>';
                }
                
                statusDiv.innerHTML = errorMessage;
            }
        } catch (error) {
            statusDiv.innerHTML = '<div class="text-red-600">✗ Error testing LinkedIn authentication</div>';
            console.error('Error:', error);
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }

    async function createMessageBatch() {
        const template = document.getElementById('message-template').value.trim();
        const batchName = document.getElementById('batch-name').value.trim();
        
        if (!template) {
            alert('Please enter a message template');
            return;
        }
        
        if (state.selectedLeads.size === 0) {
            alert('Please select at least one lead');
            return;
        }
        
        try {
            const response = await fetch('/admin/sales/create-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({
                    lead_ids: Array.from(state.selectedLeads),
                    template: template,
                    batch_name: batchName
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Message batch created successfully! ${data.total_messages} messages prepared.`);
                document.getElementById('message-template').value = '';
                document.getElementById('batch-name').value = '';
                state.selectedLeads.clear();
                await refreshData();
            } else {
                alert('Failed to create message batch');
            }
        } catch (error) {
            alert('Error creating message batch');
        }
    }

    async function deleteLead(leadId) {
        try {
            const response = await fetch(`/admin/leads/${leadId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                state.selectedLeads.delete(leadId);
                await refreshData();
            } else {
                alert('Failed to delete lead');
            }
        } catch (error) {
            alert('Error deleting lead');
        }
    }

    async function refreshData() {
        try {
            const response = await fetch('/admin/sales?partial=1');
            const data = await response.json();
            state.leads = data.leads;
            state.batches = data.batches;
            render();
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    function render() {
        renderLeads();
        renderBatches();
        updateCounts();
    }

    // Initialize the page
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing page');
        loadInitialData();
        console.log('Page initialized successfully');
    });
</script>
</x-admin.layout>
