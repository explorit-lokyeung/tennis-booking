'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', icon: '🏠', label: '首頁' },
  { href: '/clubs', icon: '🎾', label: '球會' },
  { href: '/account', icon: '👤', label: '我的' },
];

export default function MobileNav() {
  const pathname = usePathname() || '/';
  if (pathname.includes('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-[#1A1A1A]/10 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {links.map(l => {
          const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
          return (
            <Link key={l.href} href={l.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
                active ? 'text-[#C4A265] scale-110' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70'
              }`}>
              <span className="text-xl">{l.icon}</span>
              <span className="text-[10px] font-semibold">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
