'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('未偵測到重設密碼 session — 請先按電郵裡嘅連結。');
      }
      setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('密碼至少要 6 位'); return; }
    if (password !== confirm) { setError('兩次輸入嘅密碼唔一致'); return; }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError(err.message || '更新失敗'); return; }
    router.push('/account');
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1A1A1A]/10 bg-white text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#C4A265] transition-all";

  return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-black tracking-tight text-[#1A1A1A]">TENNIS CLUB</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">設定新密碼</h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">輸入你嘅新密碼。</p>

          {!ready ? (
            <p className="text-sm text-[#1A1A1A]/50">載入中...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="password" placeholder="新密碼（至少 6 位）" value={password}
                onChange={e => setPassword(e.target.value)} className={inputCls} required minLength={6} />
              <input type="password" placeholder="再次確認新密碼" value={confirm}
                onChange={e => setConfirm(e.target.value)} className={inputCls} required minLength={6} />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full bg-[#1A1A1A] text-[#FFF8F0] py-3.5 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50">
                {loading ? '更新中...' : '更新密碼'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-[#1A1A1A]/60 hover:text-[#C4A265] font-semibold">
              返回登入
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
