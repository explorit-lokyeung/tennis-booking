'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState('處理驗證中...');

  useEffect(() => {
    (async () => {
      const next = params.get('next') || '/account';

      // Supabase client picks up tokens from the URL hash automatically,
      // but recovery flows arrive as query params (?code=...). Exchange the
      // code for a session explicitly.
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setMessage('驗證失敗：' + error.message); return; }
        router.replace(next);
        return;
      }

      // Fall through: the hash-based flow — wait one tick for supabase-js to
      // hydrate the session, then redirect.
      const { data } = await supabase.auth.getSession();
      if (data.session) { router.replace(next); return; }
      setMessage('連結已過期或無效，請重新申請。');
    })();
  }, [params, router]);

  return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="text-center text-[#1A1A1A]/60">{message}</div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#FFF8F0]" />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
