import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-slate-900 rounded-xl border border-slate-800 p-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Next.js scaffold (side-by-side)</h1>
        <p className="text-slate-400 mb-4">This project now includes a minimal Next.js app scaffold for incremental migration. The original Vite app remains intact — run it with <code>npm run dev</code>.</p>
        <ul className="text-sm text-slate-300 space-y-2 mb-4">
          <li>- Run the Vite app: <code>npm run dev</code> (existing behavior)</li>
          <li>- Run Next dev server: <code>npm run next-dev</code></li>
        </ul>
        <p className="text-slate-300 mb-6">Use this Next app to add API routes or migrate pages incrementally. For now the Vite UI will continue to work unchanged.</p>
        <div className="flex gap-3">
          <Link href="/api/hello" className="px-4 py-2 bg-indigo-600 text-white rounded">Check API</Link>
          <a href="http://localhost:5173" className="px-4 py-2 bg-slate-700 text-slate-200 rounded" target="_blank" rel="noreferrer">Open Vite App</a>
        </div>
      </div>
    </div>
  );
}
