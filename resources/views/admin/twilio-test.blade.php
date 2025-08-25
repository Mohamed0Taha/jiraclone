<x-admin.layout title="TaskPilot Admin - Twilio Testing" page-title="Twilio Testing">

    <div class="max-w-4xl mx-auto space-y-8">
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

        <!-- Configuration Status -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">TaskPilot Twilio Configuration Status</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <strong class="text-gray-700">Account SID:</strong>
                    <span class="ml-2 {{ config('twilio.account_sid') ? 'text-green-600' : 'text-red-600' }}">
                        {{ config('twilio.account_sid') ? '✓ Configured' : '✗ Not configured' }}
                    </span>
                </div>
                <div>
                    <strong class="text-gray-700">Auth Token:</strong>
                    <span class="ml-2 {{ config('twilio.auth_token') ? 'text-green-600' : 'text-red-600' }}">
                        {{ config('twilio.auth_token') ? '✓ Configured' : '✗ Not configured' }}
                    </span>
                </div>
                <div>
                    <strong class="text-gray-700">TaskPilot SMS Number:</strong>
                    <span class="ml-2 {{ config('twilio.phone_number') ? 'text-green-600' : 'text-red-600' }}">
                        {{ config('twilio.phone_number') ?: '✗ Not configured' }}
                    </span>
                </div>
                <div>
                    <strong class="text-gray-700">TaskPilot WhatsApp Number:</strong>
                    <span class="ml-2 {{ config('twilio.whatsapp_number') ? 'text-green-600' : 'text-red-600' }}">
                        {{ config('twilio.whatsapp_number') ?: '✗ Not configured' }}
                    </span>
                </div>
            </div>
            <div class="mt-4 p-3 bg-blue-50 rounded-md">
                <p class="text-sm text-blue-700">
                    <strong>Note:</strong> These are TaskPilot's sending numbers. Users will provide their own receiving numbers when setting up automations.
                </p>
            </div>
        </div>

        <!-- Test SMS -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Test SMS</h2>
            <form id="smsForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="tel" id="smsPhone" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="+1234567890" required />
                    <p class="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea id="smsMessage" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" rows="3" placeholder="Test message from TaskPilot!" maxlength="1600" required></textarea>
                    <p class="text-xs text-gray-500 mt-1"><span id="smsCharCount">0</span>/1600 characters</p>
                </div>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" id="smsSubmitBtn">
                    Send SMS
                </button>
            </form>
            <div id="smsResult" class="mt-4 hidden"></div>
        </div>

        <!-- Test WhatsApp -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Test WhatsApp</h2>
            <form id="whatsappForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="tel" id="whatsappPhone" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="+1234567890" required />
                    <p class="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea id="whatsappMessage" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" rows="3" placeholder="🤖 Test WhatsApp message from TaskPilot!" maxlength="1600" required></textarea>
                    <p class="text-xs text-gray-500 mt-1"><span id="whatsappCharCount">0</span>/1600 characters</p>
                </div>
                <button type="submit" class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" id="whatsappSubmitBtn">
                    Send WhatsApp
                </button>
            </form>
            <div id="whatsappResult" class="mt-4 hidden"></div>
        </div>

        <!-- Usage Examples -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Usage in Automations</h2>
            <div class="space-y-4 text-sm">
                <div>
                    <h3 class="font-medium text-gray-700">SMS Action Configuration:</h3>
                    <pre class="bg-white border rounded p-3 mt-2 text-xs overflow-x-auto"><code>{
  "type": "SMS",
  "config": {
    "phone_number": "+1234567890",
    "message": "Task '{task_name}' is due in project '{project_name}'"
  }
}</code></pre>
                </div>
                <div>
                    <h3 class="font-medium text-gray-700">WhatsApp Action Configuration:</h3>
                    <pre class="bg-white border rounded p-3 mt-2 text-xs overflow-x-auto"><code>{
  "type": "WhatsApp",
  "config": {
    "phone_number": "+1234567890",
    "message": "🤖 Automation '{automation_name}' triggered for project '{project_name}'"
  }
}</code></pre>
                </div>
                <div>
                    <h3 class="font-medium text-gray-700">Available Placeholders:</h3>
                    <div class="bg-white border rounded p-3 mt-2 text-xs">
                        <ul class="space-y-1">
                            <li><code>{project_name}</code> - Project name</li>
                            <li><code>{automation_name}</code> - Automation name</li>
                            <li><code>{date}</code> - Current date (Y-m-d)</li>
                            <li><code>{time}</code> - Current time (H:i:s)</li>
                            <li><code>{datetime}</code> - Current date and time</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Character counters
        function setupCharacterCounter(textareaId, counterId) {
            const textarea = document.getElementById(textareaId);
            const counter = document.getElementById(counterId);
            
            textarea.addEventListener('input', function() {
                counter.textContent = this.value.length;
            });
        }

        setupCharacterCounter('smsMessage', 'smsCharCount');
        setupCharacterCounter('whatsappMessage', 'whatsappCharCount');

        // SMS Form Handler
        document.getElementById('smsForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('smsSubmitBtn');
            const resultDiv = document.getElementById('smsResult');
            const phone = document.getElementById('smsPhone').value;
            const message = document.getElementById('smsMessage').value;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch('{{ route('admin.twilio.test-sms') }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({ phone, message })
                });

                const data = await response.json();
                
                resultDiv.className = 'mt-4 p-4 rounded-md ' + (data.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700');
                resultDiv.innerHTML = data.success ? 
                    `✅ SMS sent successfully!<br><small>SID: ${data.sid}<br>Status: ${data.status}</small>` :
                    `❌ Failed: ${data.error || data.message}`;
                resultDiv.classList.remove('hidden');
            } catch (error) {
                resultDiv.className = 'mt-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700';
                resultDiv.textContent = '❌ Network error: ' + error.message;
                resultDiv.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send SMS';
            }
        });

        // WhatsApp Form Handler
        document.getElementById('whatsappForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('whatsappSubmitBtn');
            const resultDiv = document.getElementById('whatsappResult');
            const phone = document.getElementById('whatsappPhone').value;
            const message = document.getElementById('whatsappMessage').value;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch('{{ route('admin.twilio.test-whatsapp') }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({ phone, message })
                });

                const data = await response.json();
                
                resultDiv.className = 'mt-4 p-4 rounded-md ' + (data.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700');
                resultDiv.innerHTML = data.success ? 
                    `✅ WhatsApp message sent successfully!<br><small>SID: ${data.sid}<br>Status: ${data.status}</small>` :
                    `❌ Failed: ${data.error || data.message}`;
                resultDiv.classList.remove('hidden');
            } catch (error) {
                resultDiv.className = 'mt-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700';
                resultDiv.textContent = '❌ Network error: ' + error.message;
                resultDiv.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send WhatsApp';
            }
        });
    </script>
</x-admin.layout>
