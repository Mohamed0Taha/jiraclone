import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function SalesNavigator({ leads = [], batches = [] }) {
  const [url, setUrl] = useState('');
  const [template, setTemplate] = useState('Hi {{first_name}}, loved your work at {{company}}!');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const toggle = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const ingest = async () => {
    if (!url) return;
    setBusy(true);
    try {
      await fetch('/sales-navigator/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify({ url }) });
      router.visit(route('sales.navigator')); // refresh
    } finally { setBusy(false); }
  };

  const createBatch = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await fetch('/sales-navigator/batches', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify({ lead_ids: Array.from(selected), template }) });
      router.visit(route('sales.navigator'));
    } finally { setBusy(false); }
  };

  return (
    <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800">Sales Navigator (Prototype)</h2>}>
      <Head title="Sales Navigator" />
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Paste Sales Navigator Search URL</h3>
          <div className="flex gap-2">
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.linkedin.com/sales/search/people?..." className="flex-1 border rounded px-3 py-2 text-sm" />
            <button disabled={!url||busy} onClick={ingest} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded disabled:opacity-50">Ingest</button>
          </div>
          <p className="text-xs text-gray-500">No live scraping implemented. A sample set of leads will be generated for demonstration.</p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Compose Message Template</h3>
          <textarea value={template} onChange={e=>setTemplate(e.target.value)} rows={4} className="w-full border rounded px-3 py-2 text-sm font-mono" />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Supported tokens:</span>
            <code className="bg-gray-100 px-1 rounded">{'{{full_name}}'}</code>
            <code className="bg-gray-100 px-1 rounded">{'{{first_name}}'}</code>
            <code className="bg-gray-100 px-1 rounded">{'{{company}}'}</code>
            <code className="bg-gray-100 px-1 rounded">{'{{title}}'}</code>
          </div>
          <button disabled={selected.size===0||busy} onClick={createBatch} className="px-4 py-2 bg-green-600 text-white text-sm rounded disabled:opacity-50">Create Batch ({selected.size})</button>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Leads ({leads.length})</h3>
            <button onClick={()=> setSelected(new Set(leads.map(l=>l.id)))} className="text-xs text-indigo-600 hover:underline">Select All</button>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2"></th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="p-2"><input type="checkbox" checked={selected.has(l.id)} onChange={()=>toggle(l.id)} /></td>
                    <td className="p-2 font-medium">{l.full_name}</td>
                    <td className="p-2">{l.title}</td>
                    <td className="p-2">{l.company}</td>
                    <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 capitalize">{l.status}</span></td>
                  </tr>
                ))}
                {leads.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No leads yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Recent Batches</h3>
          <ul className="divide-y">
            {batches.map(b => (
              <li key={b.id} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">Batch #{b.id}</div>
                  <div className="text-xs text-gray-500">Template {b.template_hash} • {b.sent}/{b.total} sent</div>
                </div>
                <span className="text-xs bg-gray-100 rounded px-2 py-0.5">Created {new Date(b.created_at).toLocaleDateString()}</span>
              </li>
            ))}
            {batches.length === 0 && <li className="py-2 text-sm text-gray-500">No batches yet.</li>}
          </ul>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
