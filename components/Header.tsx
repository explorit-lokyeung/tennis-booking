'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { isPlatformAdmin } from '@/lib/platform';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="text-xs font-semibold text-[#1A1A1A]/50 hover:text-[#C4A265] transition-colors px-2 py-1 rounded border border-[#1A1A1A]/10"
      title={locale === 'zh' ? 'Switch to English' : '切換中文'}
    >
      {locale === 'zh' ? 'EN' : '中'}
    </button>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  if (pathname?.includes('/admin')) return null;
  const { user } = useAuth();
  const showPlatformAdmin = isPlatformAdmin(user?.id);

  return (
    <header className="sticky top-0 z-50 bg-[#FFF8F0] border-b border-[#1A1A1A]/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold tracking-wider text-[#1A1A1A] hover:text-[#C4A265] transition-colors">
            網球平台
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/clubs" className="text-sm font-medium tracking-wide text-[#1A1A1A] hover:text-[#C4A265] transition-colors uppercase">
              球會
            </Link>
            <Link href="/courts" className="text-sm font-medium tracking-wide text-[#1A1A1A] hover:text-[#C4A265] transition-colors uppercase">
              球場
            </Link>
            <Link href="/classes" className="text-sm font-medium tracking-wide text-[#1A1A1A] hover:text-[#C4A265] transition-colors uppercase">
              課程
            </Link>
            {showPlatformAdmin && (
              <Link href="/admin" className="text-xs font-bold tracking-wider text-[#C4A265] hover:text-[#1A1A1A] transition-colors uppercase border border-[#C4A265]/40 px-3 py-1 rounded-full">
                平台管理
              </Link>
            )}
            {user && <NotificationBell userId={user.id} />}
            <LangToggle />
            {user ? (
              <Link href="/account" className="text-sm font-medium tracking-wide text-[#1A1A1A] hover:text-[#C4A265] transition-colors uppercase">
                {user.user_metadata?.name || user.email?.split('@')[0] || '帳戶'}
              </Link>
            ) : (
              <Link href="/login" className="bg-[#1A1A1A] text-[#FFF8F0] px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-all">
                登入
              </Link>
            )}
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-[#1A1A1A]" aria-label="選單">
            <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#1A1A1A]/10">
            <div className="flex flex-col gap-4">
              <Link href="/clubs" className="text-sm font-medium tracking-wide text-[#1A1A1A] uppercase" onClick={() => setMobileMenuOpen(false)}>球會</Link>
              <Link href="/courts" className="text-sm font-medium tracking-wide text-[#1A1A1A] uppercase" onClick={() => setMobileMenuOpen(false)}>球場</Link>
              <Link href="/classes" className="text-sm font-medium tracking-wide text-[#1A1A1A] uppercase" onClick={() => setMobileMenuOpen(false)}>課程</Link>
              {showPlatformAdmin && (
                <Link href="/admin" className="text-sm font-bold tracking-wider text-[#C4A265] uppercase" onClick={() => setMobileMenuOpen(false)}>平台管理</Link>
              )}
              {user ? (
                <Link href="/account" className="text-sm font-medium tracking-wide text-[#1A1A1A] uppercase" onClick={() => setMobileMenuOpen(false)}>
                  {user.user_metadata?.name || user.email?.split('@')[0] || '帳戶'}
                </Link>
              ) : (
                <Link href="/login" className="text-sm font-medium tracking-wide text-[#1A1A1A] uppercase" onClick={() => setMobileMenuOpen(false)}>登入</Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
