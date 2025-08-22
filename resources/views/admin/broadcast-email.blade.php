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

        <form method="POST" action="{{ route('admin.broadcast-email.send') }}" class="space-y-6">
            @csrf

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Audience Segments (choose one or more)</label>
                <div id="segmentChips" class="flex flex-wrap gap-3">
                    @php $segments = ['free' => 'Free Tier','basic' => 'Basic','pro' => 'Pro','business' => 'Business']; @endphp
                    @foreach($segments as $value => $label)
                        <button type="button" data-value="{{ $value }}" class="segment-chip px-4 py-2 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-pressed="false">{{ $label }}</button>
                    @endforeach
                </div>
                <input type="hidden" name="segments[]" id="segmentsHidden" />
                <p class="mt-2 text-xs text-gray-500">Free Tier = users without an active subscription.</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" name="subject" required maxlength="150" value="{{ old('subject') }}" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Announcement / Update" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea name="message" required rows="10" maxlength="5000" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Write your message...">{{ old('message') }}</textarea>
                <p class="mt-1 text-xs text-gray-500">Plain text only; line breaks preserved.</p>
            </div>

            <div class="flex items-center justify-end gap-4">
                <a href="{{ route('admin.dashboard') }}" class="text-sm text-gray-600 hover:text-gray-800">Cancel</a>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded shadow-sm disabled:opacity-50" id="sendBtn" disabled>Send Broadcast</button>
            </div>
        </form>
    </div>

    <x-slot name="scripts">
        <script>
            const chips = document.querySelectorAll('.segment-chip');
            const hiddenInput = document.getElementById('segmentsHidden');
            const sendBtn = document.getElementById('sendBtn');
            let selected = new Set();

            chips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const val = chip.dataset.value;
                    if(selected.has(val)) { selected.delete(val); } else { selected.add(val); }
                    chip.classList.toggle('bg-blue-600');
                    chip.classList.toggle('text-white');
                    chip.classList.toggle('border-blue-600');
                    chip.setAttribute('aria-pressed', chip.classList.contains('bg-blue-600') ? 'true' : 'false');
                    updateState();
                });
            });

            function updateState(){
                // Remove existing hidden inputs
                document.querySelectorAll('input[name="segments[]"]').forEach(el => el.remove());
                const form = document.querySelector('form');
                selected.forEach(seg => {
                    const input = document.createElement('input');
                    input.type='hidden'; input.name='segments[]'; input.value=seg; form.appendChild(input);
                });
                sendBtn.disabled = selected.size === 0;
            }
        </script>
    </x-slot>
</x-admin.layout>
