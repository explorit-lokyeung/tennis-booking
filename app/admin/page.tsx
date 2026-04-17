'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in as admin
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (profile?.is_admin) {
        router.push('/admin/classes/');
        return;
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('登入失敗：' + signInError.message);
      setLoading(false);
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
    if (!profile?.is_admin) {
      setError('你不是管理員');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push('/admin/classes/');
  };

  if (loading) return <div className="min-h-screen bg-[#FFF8F0]" />;

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">管理員登入</h1>
        <p className="text-[#1A1A1A]/60 mb-6">請使用管理員帳號登入</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">電郵</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
              placeholder="admin@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
              placeholder="密碼" required />
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#1A1A1A] text-[#FFF8F0] py-3 rounded-xl font-bold hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50">
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
