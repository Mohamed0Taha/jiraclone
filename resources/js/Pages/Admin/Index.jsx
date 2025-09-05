import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function AdminIndex() {
  const tiles = [
    {
      title: 'Analytics',
      description: 'Visitor & traffic analytics dashboard',
      href: '/admin/analytics',
      gradient: 'from-indigo-500 to-fuchsia-500'
    },
    {
      title: 'Sales Navigator',
      description: 'Ingest leads & create bulk message batches',
      href: '/admin/sales-navigator',
      gradient: 'from-emerald-500 to-teal-500'
    }
  ];

  return (
    <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800">Admin Dashboard</h2>}>
      <Head title="Admin" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(t => (
            <Link key={t.title} href={t.href}
              className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br ${t.gradient} mix-blend-multiply`} />
              <div className="relative p-5 flex flex-col gap-3 h-full">
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-white transition">{t.title}</h3>
                <p className="text-sm text-gray-600 group-hover:text-white/90 transition leading-snug flex-1">{t.description}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-white transition">
                  Open <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
