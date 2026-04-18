'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useClub, useMembership, isApprovedMember } from '@/lib/club';
import type { TennisClass, Visibility } from '@/lib/types';

const vizBadge: Record<Visibility, { label: string; cls: string }> = {
  public: { label: '公開', cls: 'bg-emerald-50 text-emerald-700' },
  members: { label: '會員', cls: 'bg-[#C4A265]/15 text-[#C4A265]' },
  private: { label: '私人', cls: 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60' },
};

export default function ClubClassesPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();
  const { club, loading: clubLoading } = useClub(slug);
  const { membership } = useMembership(club?.id, user?.id);
  const approved = isApprovedMember(membership);

  const [classes, setClasses] = useState<TennisClass[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!club) return;
    supabase.from('classes').select('*').eq('club_id', club.id).neq('visible', false)
      .then(({ data }) => { if (data) setClasses(data as TennisClass[]); });
  }, [club]);

  const filtered = useMemo(() => {
    let out = classes;
    if (levelFilter !== 'All') out = out.filter(c => c.level === levelFilter);
    if (searchQuery) out = out.filter(c => c.coach.toLowerCase().includes(searchQuery.toLowerCase()));
    return out.filter(c => {
      const viz = (c.visibility || 'public') as Visibility;
      if (viz === 'public') return true;
      if (viz === 'members') return approved;
      return false;
    });
  }, [classes, levelFilter, searchQuery, approved]);

  if (clubLoading) return <main className="min-h-screen bg-[#FFF8F0]" />;
  if (!club) return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
      <div className="text-center"><h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">找不到球會</h1>
        <Link href="/clubs" className="text-[#C4A265] font-semibold">← 球會目錄</Link></div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href={`/clubs/${slug}`} className="text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] mb-3 inline-block">
          ← {club.name}
        </Link>
        <h1 className="text-5xl font-bold text-[#1A1A1A] mb-3">課程列表</h1>
        <p className="text-lg text-[#1A1A1A]/70 mb-8">專業教練，適合所有程度</p>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2 uppercase tracking-wide">程度</label>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]">
                <option value="All">所有程度</option>
                <option value="Beginner">初級</option>
                <option value="Intermediate">中級</option>
                <option value="Advanced">高級</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2 uppercase tracking-wide">搜尋教練</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋教練..."
                className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#C4A265]" />
            </div>
          </div>
        </div>

        <p className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide mb-4">搵到 {filtered.length} 堂課程</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(cls => {
            const viz = (cls.visibility || 'public') as Visibility;
            const badge = vizBadge[viz];
            const spotsPct = ((cls.spots_total - cls.spots_available) / cls.spots_total) * 100;
            const initials = cls.coach.replace('Coach ', '').split(' ').map(n => n[0]).join('');
            const levelColors: Record<string, string> = { Beginner: 'bg-green-500', Intermediate: 'bg-amber-500', Advanced: 'bg-red-500' };
            return (
              <Link key={cls.id} href={`/clubs/${slug}/classes/${cls.id}`}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <span className={`${levelColors[cls.level]} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>{cls.level}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <span className="text-2xl font-bold text-[#1A1A1A]">${cls.price}</span>
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{cls.name}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#C4A265] flex items-center justify-center text-white font-bold text-sm">{initials}</div>
                  <div><p className="text-sm font-medium text-[#1A1A1A]">{cls.coach}</p><p className="text-xs text-[#1A1A1A]/60">教練</p></div>
                </div>
                <p className="text-sm text-[#1A1A1A]/80 mb-4"><span className="font-semibold">{cls.day}</span> · {cls.time}</p>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-[#1A1A1A]/60 uppercase tracking-wide">剩餘名額</span>
                    <span className="text-sm font-bold text-[#1A1A1A]">{cls.spots_available}/{cls.spots_total}</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A]/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C4A265] h-full rounded-full transition-all" style={{ width: `${spotsPct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-[#1A1A1A]/60">搵唔到符合條件嘅課程</p>
          </div>
        )}
      </div>
    </main>
  );
}
