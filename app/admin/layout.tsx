'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
      setLoading(false);

      // If not admin and not on login page, redirect to login
      if (!adminStatus && pathname !== '/admin/') {
        router.push('/admin/');
      }
    };
    checkAuth();
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    router.push('/admin/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-[#1A1A1A]/60">載入中...</div>
      </div>
    );
  }

  // Show login page without nav
  if (pathname === '/admin/') {
    return <>{children}</>;
  }

  // Show admin pages with nav
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Admin Nav */}
      <nav className="bg-[#1A1A1A] text-[#FFF8F0] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold">
                網球會
              </Link>
              <div className="flex gap-4">
                <Link
                  href="/admin/classes/"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    pathname === '/admin/classes/'
                      ? 'bg-[#C4A265] text-white'
                      : 'hover:bg-white/10'
                  }`}
                >
                  課程管理
                </Link>
                <Link
                  href="/admin/courts/"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    pathname === '/admin/courts/'
                      ? 'bg-[#C4A265] text-white'
                      : 'hover:bg-white/10'
                  }`}
                >
                  球場管理
                </Link>
                <Link
                  href="/admin/bookings/"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    pathname === '/admin/bookings/'
                      ? 'bg-[#C4A265] text-white'
                      : 'hover:bg-white/10'
                  }`}
                >
                  預約管理
                </Link>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
            >
              登出
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
