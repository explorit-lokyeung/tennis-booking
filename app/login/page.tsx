'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { validateEmail, validatePassword } from '@/lib/validation';

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

    const emailErr = validateEmail(form.email);
    if (emailErr) { setError(emailErr); setLoading(false); return; }

    if (tab === 'register') {
      const pwErr = validatePassword(form.password);
      if (pwErr) { setError(pwErr); setLoading(false); return; }
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

  const handleGoogleLogin = async () => {
    setError('');
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (oauthError) setError(oauthError.message || 'Google login failed.');
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

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 text-[#1A1A1A] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            用 Google 繼續
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#1A1A1A]/10" />
            <span className="text-xs text-[#1A1A1A]/40 uppercase tracking-wider">或</span>
            <div className="flex-1 h-px bg-[#1A1A1A]/10" />
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

            {tab === 'login' && (
              <div className="text-center">
                <Link href="/forgot-password" className="text-xs text-[#1A1A1A]/60 hover:text-[#C4A265] font-semibold">
                  忘記密碼？
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
