@extends('layouts.admin')

@section('title', 'Sales Navigator Dev Tool')

@section('content')
<div class="max-w-6xl mx-auto py-8 space-y-8">
    <div class="bg-white shadow rounded p-6 space-y-4">
        <h1 class="text-2xl font-bold">Sales Navigator (Prototype)</h1>
        <p class="text-sm text-gray-500">Developer-only tool. No live LinkedIn scraping. Generates sample leads.</p>
        <form id="ingest-form" class="flex gap-2" onsubmit="return false;">
            <input id="sn-url" type="text" placeholder="https://www.linkedin.com/sales/search/people?..." class="flex-1 border rounded px-3 py-2 text-sm" />
            <button id="btn-ingest" class="px-4 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50">Ingest</button>
        </form>
        <div id="ingest-status" class="text-xs text-gray-600"></div>
    </div>

    <div class="bg-white shadow rounded p-6 space-y-4">
        <h2 class="text-lg font-semibold">Compose Message Template</h2>
        <textarea id="tpl" rows="4" class="w-full border rounded px-3 py-2 text-sm font-mono">Hi {{first_name}}, loved your work at {{company}}!</textarea>
        <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span>Tokens:</span>
            <code class="bg-gray-100 px-1 rounded">{{'{{full_name}}'}}</code>
            <code class="bg-gray-100 px-1 rounded">{{'{{first_name}}'}}</code>
            <code class="bg-gray-100 px-1 rounded">{{'{{company}}'}}</code>
            <code class="bg-gray-100 px-1 rounded">{{'{{title}}'}}</code>
        </div>
        <button id="btn-create-batch" class="px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50">Create Batch (<span id="selected-count">0</span>)</button>
    </div>

    <div class="bg-white shadow rounded p-6 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Leads (<span id="lead-total">0</span>)</h2>
            <button id="btn-select-all" class="text-xs text-indigo-600 hover:underline">Select All</button>
        </div>
        <div class="overflow-x-auto border rounded">
            <table class="min-w-full text-sm" id="leads-table">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="p-2"></th>
                        <th class="p-2 text-left">Name</th>
                        <th class="p-2 text-left">Title</th>
                        <th class="p-2 text-left">Company</th>
                        <th class="p-2 text-left">Status</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>

    <div class="bg-white shadow rounded p-6 space-y-4">
        <h2 class="text-lg font-semibold">Recent Batches</h2>
        <ul id="batches" class="divide-y"></ul>
    </div>
</div>

<script data-leads='@json($leads ?? [])' data-batches='@json($batches ?? [])'>
    const scriptEl = document.currentScript;
    const state = {
        leads: JSON.parse(scriptEl.getAttribute('data-leads') || '[]'),
        batches: JSON.parse(scriptEl.getAttribute('data-batches') || '[]'),
        selected: new Set(),
        busy: false,
    };

    function render() {
        const tbody = document.querySelector('#leads-table tbody');
        tbody.innerHTML = '';
        state.leads.forEach(l => {
            const tr = document.createElement('tr');
            tr.className = 'border-t hover:bg-gray-50';
            tr.innerHTML = `
                <td class="p-2"><input data-id="${l.id}" type="checkbox" ${state.selected.has(l.id)?'checked':''}></td>
                <td class="p-2 font-medium">${l.full_name}</td>
                <td class="p-2">${l.title||''}</td>
                <td class="p-2">${l.company||''}</td>
                <td class="p-2"><span class="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 capitalize">${l.status||'new'}</span></td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById('lead-total').textContent = state.leads.length;
        document.getElementById('selected-count').textContent = state.selected.size;
        const batches = document.getElementById('batches');
        batches.innerHTML = '';
        state.batches.forEach(b => {
            const li = document.createElement('li');
            li.className='py-2 text-sm flex items-center justify-between';
            li.innerHTML = `<div><div class="font-medium">Batch #${b.id}</div><div class="text-xs text-gray-500">Template ${b.template_hash} • ${b.sent||0}/${b.total} sent</div></div><span class="text-xs bg-gray-100 rounded px-2 py-0.5">${new Date(b.created_at).toLocaleDateString()}</span>`;
            batches.appendChild(li);
        });
    }

    document.addEventListener('change', e => {
        if (e.target.matches('input[type=checkbox][data-id]')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
            render();
        }
    });

    document.getElementById('btn-select-all').addEventListener('click', () => {
        state.leads.forEach(l => state.selected.add(l.id));
        render();
    });

    document.getElementById('btn-ingest').addEventListener('click', async () => {
        const url = document.getElementById('sn-url').value.trim();
        if (!url) return;
        const status = document.getElementById('ingest-status');
        status.textContent = 'Ingesting...';
        const res = await fetch('/admin/sales-navigator/ingest', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content}, body: JSON.stringify({url})});
        if (res.ok) {
            const refreshed = await fetch('/admin/sales-navigator?partial=1');
            const data = await refreshed.json();
            state.leads = data.leads; state.batches = data.batches; state.selected.clear();
            status.textContent = 'Ingest complete.';
            render();
        } else status.textContent = 'Error ingesting.';
    });

    document.getElementById('btn-create-batch').addEventListener('click', async () => {
        if (state.selected.size === 0) return;
        const tpl = document.getElementById('tpl').value;
        const res = await fetch('/admin/sales-navigator/batches', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content}, body: JSON.stringify({lead_ids:[...state.selected], template: tpl})});
        if (res.ok) {
            const refreshed = await fetch('/admin/sales-navigator?partial=1');
            const data = await refreshed.json();
            state.leads = data.leads; state.batches = data.batches; state.selected.clear();
            render();
        }
    });

    render();
</script>
@endsection
