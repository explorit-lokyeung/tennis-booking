'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Club } from '@/lib/types';

export default function PlatformAdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => { fetchClubs(); }, []);

  const fetchClubs = async () => {
    setLoading(true);
    const { data } = await supabase.from('clubs').select('*').order('created_at', { ascending: false });
    setClubs((data as Club[]) || []);
    setLoading(false);
  };

  const toggleActive = async (club: Club) => {
    const next = !club.is_active;
    await supabase.from('clubs').update({ is_active: next }).eq('id', club.id);
    setClubs(prev => prev.map(c => c.id === club.id ? { ...c, is_active: next } : c));
  };

  const filtered = query
    ? clubs.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase())
        || c.slug.toLowerCase().includes(query.toLowerCase())
        || (c.address || '').toLowerCase().includes(query.toLowerCase()))
    : clubs;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">球會管理</h1>
        <Link href="/admin/clubs/new"
          className="bg-[#C4A265] text-white px-5 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[#D4B275] transition-all">
          + 新增球會
        </Link>
      </div>

      <div className="mb-4">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="搜尋球會（名稱／slug／地址）..."
          className="w-full md:max-w-md px-4 py-2.5 rounded-xl border border-[#1A1A1A]/10 bg-white text-sm focus:outline-none focus:border-[#C4A265]" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#1A1A1A]/50">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#1A1A1A]/50">
            {clubs.length === 0 ? '仲未有球會 — 按上面「+ 新增球會」建立第一個' : '無符合條件嘅球會'}
          </div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]/5">
            {filtered.map(c => (
              <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={`/clubs/${c.slug}`} className="font-bold text-[#1A1A1A] hover:text-[#C4A265]">{c.name}</Link>
                    <span className="text-xs text-[#1A1A1A]/40 font-mono">/{c.slug}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {c.is_active ? '啟用中' : '已停用'}
                    </span>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 mt-1 truncate">
                    {c.address || '—'} · 建立於 {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/admin/clubs/${c.id}/edit`} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#C4A265]/10 text-[#C4A265] hover:bg-[#C4A265]/20">
                    編輯
                  </Link>
                  <button onClick={() => toggleActive(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${c.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                    {c.is_active ? '停用' : '啟用'}
                  </button>
                  <Link href={`/clubs/${c.slug}/admin`} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10">
                    球會後台
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
