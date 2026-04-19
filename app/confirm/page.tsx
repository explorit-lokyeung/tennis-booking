'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function ConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setStatus('success');
      setTimeout(() => router.push('/account/'), 3000);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setStatus('success');
          setTimeout(() => router.push('/account/'), 3000);
        } else {
          setStatus('error');
        }
      });
    }
  }, [router]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
      {status === 'loading' && (
        <>
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">驗證中...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">電郵已確認</h1>
          <p className="text-gray-500 mb-4">你嘅帳戶已經成功驗證，正在跳轉...</p>
          <Link href="/account/" className="text-[#C4A265] hover:underline">立即前往帳戶</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">驗證失敗</h1>
          <p className="text-gray-500 mb-4">連結可能已過期，請重新註冊或聯絡管理員。</p>
          <Link href="/login" className="text-[#C4A265] hover:underline">返回登入</Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <Suspense fallback={<div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />}>
        <ConfirmContent />
      </Suspense>
    </main>
  );
}
