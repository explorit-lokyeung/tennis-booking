'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { USE_DUMMY_DATA, getDemoClubs } from '@/lib/dummy-data';
import type { Club } from '@/lib/types';

export default function ClubDirectoryPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_DUMMY_DATA) {
      setClubs(getDemoClubs());
      setLoading(false);
      return;
    }
    supabase
      .from('clubs')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setClubs(data as Club[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!query) return clubs;
    const q = query.toLowerCase();
    return clubs.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.address?.toLowerCase().includes(q) ?? false)
    );
  }, [clubs, query]);

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-[#1A1A1A] mb-3">球會目錄</h1>
        <p className="text-lg text-[#1A1A1A]/60 mb-8">所有加入平台嘅網球會</p>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <input
            type="text"
            placeholder="搜尋球會名稱或地區..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#C4A265]"
          />
        </div>

        <p className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide mb-4">
          搵到 {filtered.length} 個球會
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-[#1A1A1A]/60">搵唔到符合條件嘅球會</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => (
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
    </main>
  );
}
