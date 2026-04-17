'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.email || !form.password) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (tab === 'register' && !form.name) {
      setError('Please enter your name.');
      setLoading(false);
      return;
    }

    try {
      if (tab === 'login') {
        const { error: signInError } = await signIn(form.email, form.password);
        if (signInError) {
          setError(signInError.message || 'Invalid email or password.');
          setLoading(false);
          return;
        }
      } else {
        const { error: signUpError } = await signUp(form.email, form.password, form.name);
        if (signUpError) {
          setError(signUpError.message || 'Failed to create account.');
          setLoading(false);
          return;
        }
      }
      router.push('/account/');
    } catch (err) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1A1A1A]/10 bg-white text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#C4A265] transition-all";

  return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-black tracking-tight text-[#1A1A1A]">TENNIS CLUB</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8 animate-bounce-in">
          {/* Tabs */}
          <div className="flex mb-6 bg-[#FFF8F0] rounded-xl p-1">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                  tab === t ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputCls}
            />
            {tab === 'register' && (
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={inputCls}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A1A1A] text-[#FFF8F0] py-3.5 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '處理中...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
