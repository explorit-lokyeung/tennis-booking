'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useClub, useMembership, hasRole } from '@/lib/club';
import { isPlatformAdmin } from '@/lib/platform';

export default function ClubAdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params?.slug as string;
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { club, loading: clubLoading } = useClub(slug);
  const { membership, loading: mbLoading } = useMembership(club?.id, user?.id);
  const [checked, setChecked] = useState(false);

  // Track whether membership has ever been non-null to avoid race condition redirect
  const [mbReady, setMbReady] = useState(false);

  useEffect(() => {
    if (membership !== null) setMbReady(true);
  }, [membership]);

  useEffect(() => {
    if (authLoading || clubLoading || mbLoading) return;
    if (!club) return;
    if (!user) { router.push('/login'); return; }
    // Wait for membership to settle — first render may have null before data arrives
    if (!mbReady && membership === null) {
      // Platform admin bypass — don't wait for membership
      if (isPlatformAdmin(user)) { setChecked(true); return; }
      return;
    }
    if (!hasRole(membership, 'admin', 'owner') && !isPlatformAdmin(user)) { router.push(`/clubs/${slug}`); return; }
    setChecked(true);
  }, [authLoading, clubLoading, mbLoading, user, membership, slug, router, club, mbReady]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-[#1A1A1A]/60">載入中...</div>
      </div>
    );
  }

  const base = `/clubs/${slug}/admin`;
  const tabs = [
    { href: base, label: '控制台' },
    { href: `${base}/courts`, label: '球場管理' },
    { href: `${base}/classes`, label: '課程管理' },
    { href: `${base}/members`, label: '會員管理' },
    { href: `${base}/analytics`, label: '數據分析' },
    { href: `${base}/pricing`, label: '定價管理' },
    { href: `${base}/settings`, label: '預約規則' },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <nav className="bg-[#1A1A1A] text-[#FFF8F0] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href={`/clubs/${slug}`} className="text-xl font-bold">{club?.name || '球會'}</Link>
              <div className="flex gap-4 overflow-x-auto">
                {tabs.map(t => (
                  <Link key={t.href} href={t.href}
                    className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${
                      pathname === t.href ? 'bg-[#C4A265] text-white' : 'hover:bg-white/10'
                    }`}>
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link href={`/clubs/${slug}`} className="text-sm px-4 py-2 rounded-lg hover:bg-white/10 transition-all">離開</Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
