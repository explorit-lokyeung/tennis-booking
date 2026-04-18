'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { isPlatformAdmin } from '@/lib/platform';

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (!isPlatformAdmin(user.id)) { router.push('/'); return; }
    setChecked(true);
  }, [loading, user, router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-[#1A1A1A]/60">載入中...</div>
      </div>
    );
  }

  const tabs = [
    { href: '/admin', label: '平台概覽' },
    { href: '/admin/clubs', label: '球會管理' },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <nav className="bg-[#1A1A1A] text-[#FFF8F0] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-xl font-bold">
                <span className="text-[#C4A265]">●</span> 平台管理
              </Link>
              <div className="flex gap-4 overflow-x-auto">
                {tabs.map(t => {
                  const active = pathname === t.href || (t.href !== '/admin' && pathname?.startsWith(t.href));
                  return (
                    <Link key={t.href} href={t.href}
                      className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${
                        active ? 'bg-[#C4A265] text-white' : 'hover:bg-white/10'
                      }`}>
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <Link href="/" className="text-sm px-4 py-2 rounded-lg hover:bg-white/10 transition-all">離開</Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
