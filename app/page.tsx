'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Club } from '@/lib/types';

export default function PlatformLandingPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('clubs')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .limit(6)
      .then(({ data }) => {
        if (data) setClubs(data as Club[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="absolute top-10 right-10 text-8xl opacity-10 animate-bounce-in hidden md:block">🎾</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            網球<span className="text-[#C4A265]">平台</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/80 max-w-2xl mx-auto">
            發掘香港嘅網球會。預約球場，報名課堂，由一個地方開始。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/clubs" className="bg-[#C4A265] text-[#1A1A1A] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#D4B275] transition-colors">
              瀏覽所有球會
            </Link>
            <Link href="/account" className="border-2 border-white/40 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-colors">
              我的帳戶
            </Link>
          </div>
        </div>
      </section>

      {/* Featured clubs */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-4xl font-bold text-[#1A1A1A] mb-2">精選球會</h2>
              <p className="text-[#1A1A1A]/60">加入社群，隨時揮拍</p>
            </div>
            <Link href="/clubs" className="text-sm font-bold text-[#C4A265] uppercase tracking-wider hover:underline">
              查看全部 →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-48 animate-pulse" />
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <p className="text-5xl mb-3">🎾</p>
              <p className="text-[#1A1A1A]/60">暫時未有球會</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {clubs.map(c => (
                <Link key={c.id} href={`/clubs/${c.slug}`}
                  className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                    🎾
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{c.name}</h3>
                  {c.address && <p className="text-sm text-[#1A1A1A]/60 mb-3">📍 {c.address}</p>}
                  {c.description && (
                    <p className="text-sm text-[#1A1A1A]/70 line-clamp-2">{c.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
