'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SaveContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const [status, setStatus] = useState('Saving to Vault...');

  useEffect(() => {
    if (!url) {
      setStatus('No URL provided.');
      return;
    }

    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    }).then(res => {
      if (res.ok) {
        setStatus('✅ Saved Successfully!');
        setTimeout(() => window.close(), 1500);
      } else {
        setStatus('❌ Failed to save.');
      }
    }).catch(e => {
      setStatus('❌ Error: ' + e.message);
    });
  }, [url]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9fb] font-sans text-zinc-800 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-stone-100 text-center w-full max-w-sm">
        <h2 className="text-lg font-medium mb-2 text-zinc-900">{status}</h2>
        <p className="text-xs text-zinc-500 mb-6 truncate">{url}</p>
        <button onClick={() => window.close()} className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl transition-colors">
          Close Window
        </button>
      </div>
    </div>
  );
}

export default function SavePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SaveContent />
    </Suspense>
  );
}
