<x-admin.layout title="TaskPilot Admin - Broadcast Email" page-title="Broadcast Email">

    <div class="max-w-3xl mx-auto space-y-8">
        @if(session('success'))
            <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{{ session('success') }}</div>
        @endif
        @if(session('error'))
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{{ session('error') }}</div>
        @endif
        @if($errors->any())
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <ul class="list-disc ml-5 text-sm">
                    @foreach($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form method="POST" action="{{ route('admin.broadcast-email.send') }}" class="space-y-8">
            @csrf

            <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-sm font-semibold text-gray-800">Audience Segments</h2>
                        <p class="mt-1 text-xs text-gray-500">Choose who will receive this message.</p>
                    </div>
                </div>
                @php $segments = [
                    'free' => ['label' => 'Free Tier', 'color' => 'pink'],
                    'basic' => ['label' => 'Basic', 'color' => 'blue'],
                    'pro' => ['label' => 'Pro', 'color' => 'green'],
                    'business' => ['label' => 'Business', 'color' => 'orange'],
                ]; @endphp
                <!-- Selectable Chips -->
                <div id="segmentChips" class="flex flex-wrap gap-2 mb-3">
                    @foreach($segments as $value => $meta)
                        <button type="button" data-value="{{ $value }}" data-color="{{ $meta['color'] }}" class="segment-chip group relative px-3 h-8 inline-flex items-center rounded-full text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500">
                            <span class="select-label">{{ $meta['label'] }}</span>
                        </button>
                    @endforeach
                </div>

                <!-- Direct Recipient Input -->
                <div class="space-y-2">
                    <label class="block text-xs font-medium text-gray-700">Direct Recipient (optional)</label>
                    <div class="flex items-center gap-2">
                        <input type="email" id="directEmailInput" class="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="user@example.com (press Enter to add)" />
                        <button type="button" id="addDirectEmailBtn" class="px-3 py-2 text-xs font-semibold rounded-md bg-gray-700 text-white hover:bg-gray-800">Add</button>
                    </div>
                    <p class="text-[11px] text-gray-500">Add one or more specific user emails in addition to (or instead of) segments.</p>
                </div>

                <!-- Selected Chips Display (segments + direct emails) -->
                <div id="selectedContainer" class="min-h-[2.25rem] flex flex-wrap gap-2"></div>
                <p class="mt-2 text-[11px] leading-snug text-gray-500">Click a segment to add or type an email then press Enter. Remove with the × button. Free Tier = users without an active subscription.</p>
                <!-- Tailwind safelist helper (hidden) -->
                <div class="hidden">
                    <span class="bg-pink-600 bg-blue-600 bg-green-600 bg-orange-600 text-pink-700 text-blue-700 text-green-700 text-orange-700"></span>
                </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-2">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-800 mb-1">Subject</label>
                        <p class="text-xs text-gray-500">Clear and concise. Max 150 characters.</p>
                    </div>
                    <div class="text-[11px] text-gray-400 self-center" id="subjectCount">0 / 150</div>
                </div>
                <input type="text" name="subject" id="subjectInput" required maxlength="150" value="{{ old('subject') }}" class="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm px-3 py-2 leading-tight" placeholder="e.g. New Feature: Automation Workflows" />
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-2">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-800 mb-1">Message</label>
                        <p class="text-xs text-gray-500">Plain text only; line breaks are preserved. Max 5000 characters.</p>
                    </div>
                    <div class="text-[11px] text-gray-400 self-center" id="messageCount">0 / 5000</div>
                </div>
                <textarea name="message" id="messageInput" required rows="10" maxlength="5000" class="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm px-3 py-2 leading-relaxed resize-y" placeholder="Write your announcement, update, or notice...">{{ old('message') }}</textarea>
            </div>

            <div class="flex items-center justify-end gap-4 pt-2">
                <a href="{{ route('admin.dashboard') }}" class="text-sm text-gray-600 hover:text-gray-800">Cancel</a>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" id="sendBtn" disabled>
                    Send Broadcast
                </button>
            </div>
        </form>
    </div>

    <x-slot name="scripts">
        <script>
            const chips = document.querySelectorAll('.segment-chip');
            const selectedContainer = document.getElementById('selectedContainer');
            const sendBtn = document.getElementById('sendBtn');
            const subjectInput = document.getElementById('subjectInput');
            const messageInput = document.getElementById('messageInput');
            const subjectCount = document.getElementById('subjectCount');
            const messageCount = document.getElementById('messageCount');
            const directEmailInput = document.getElementById('directEmailInput');
            const addDirectEmailBtn = document.getElementById('addDirectEmailBtn');
            let selectedSegments = {}; // seg value -> {label,color}
            let directEmails = new Set(); // unique emails

            // Character counters
            function updateCounts(){
                if(subjectInput) subjectCount.textContent = `${subjectInput.value.length} / 150`;
                if(messageInput) messageCount.textContent = `${messageInput.value.length} / 5000`;
            }
            ['input','keyup','change'].forEach(evt => {
                subjectInput.addEventListener(evt, updateCounts);
                messageInput.addEventListener(evt, updateCounts);
            });
            updateCounts();

            chips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const value = chip.dataset.value;
                    const color = chip.dataset.color;
                    const label = chip.querySelector('.select-label').textContent.trim();
                    if(selectedSegments[value]) { return; }
                    selectedSegments[value] = {label, color};
                    renderSelected();
                });
            });

            function addDirectEmail(){
                const email = directEmailInput.value.trim();
                if(!email) return;
                const pattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
                if(!pattern.test(email)) { directEmailInput.classList.add('ring','ring-red-400'); return; }
                directEmailInput.classList.remove('ring','ring-red-400');
                if(directEmails.has(email)) { directEmailInput.value=''; return; }
                directEmails.add(email);
                directEmailInput.value='';
                renderSelected();
            }
            addDirectEmailBtn.addEventListener('click', addDirectEmail);
            directEmailInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addDirectEmail(); }});

            function renderSelected(){
                selectedContainer.innerHTML = '';
                // Remove previous hidden inputs
                document.querySelectorAll('input[name="segments[]"], input[name="direct_emails[]"]').forEach(el => el.remove());
                const form = document.querySelector('form');

                // Segments
                Object.entries(selectedSegments).forEach(([value, meta]) => {
                    const hidden = document.createElement('input');
                    hidden.type='hidden'; hidden.name='segments[]'; hidden.value=value; form.appendChild(hidden);
                    const pill = document.createElement('div');
                    pill.className = `flex items-center pl-4 pr-1 h-8 rounded-full text-xs font-medium text-white shadow-sm relative bg-${meta.color}-600`;
                    pill.innerHTML = `
                        <span>${meta.label}</span>
                        <button type="button" aria-label="Remove ${meta.label}" data-type="segment" data-value="${value}" class="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 text-${meta.color}-700 hover:bg-white text-sm font-bold leading-none transition">×</button>
                    `;
                    selectedContainer.appendChild(pill);
                });

                // Direct Emails
                Array.from(directEmails).forEach(email => {
                    const hidden = document.createElement('input');
                    hidden.type='hidden'; hidden.name='direct_emails[]'; hidden.value=email; form.appendChild(hidden);
                    const pill = document.createElement('div');
                    pill.className = 'flex items-center pl-4 pr-1 h-8 rounded-full text-xs font-medium text-white shadow-sm relative bg-slate-600';
                    pill.innerHTML = `
                        <span>${email}</span>
                        <button type="button" aria-label="Remove ${email}" data-type="email" data-value="${email}" class="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white text-sm font-bold leading-none transition">×</button>
                    `;
                    selectedContainer.appendChild(pill);
                });

                // Attach remove handlers
                selectedContainer.querySelectorAll('button[data-type]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const type = btn.dataset.type;
                        const value = btn.dataset.value;
                        if(type==='segment') { delete selectedSegments[value]; }
                        else if(type==='email'){ directEmails.delete(value); }
                        renderSelected();
                    });
                });

                sendBtn.disabled = Object.keys(selectedSegments).length === 0 && directEmails.size === 0;
            }
        </script>
    </x-slot>
</x-admin.layout>
