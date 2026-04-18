'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');

    if (!email) { setError('請輸入電郵地址'); return; }

    setLoading(true);
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?next=/reset-password`
      : undefined;

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);

    if (err) {
      setError(err.message || '發送失敗，請再試');
      return;
    }
    setMessage('已發送重設密碼連結，請檢查你嘅電郵。');
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1A1A1A]/10 bg-white text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#C4A265] transition-all";

  return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-black tracking-tight text-[#1A1A1A]">TENNIS CLUB</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">重設密碼</h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">輸入你嘅電郵，我哋會寄一條重設連結俾你。</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} className={inputCls} required />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {message && <p className="text-emerald-600 text-sm">{message}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-[#1A1A1A] text-[#FFF8F0] py-3.5 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50">
              {loading ? '發送中...' : '寄出重設連結'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-[#1A1A1A]/60 hover:text-[#C4A265] font-semibold">
              ← 返回登入
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
