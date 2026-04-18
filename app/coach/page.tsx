'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Club, ClubMembership, TennisClass } from '@/lib/types';

type CoachMembership = ClubMembership & { clubs: Club | null };

export default function CoachDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<CoachMembership[]>([]);
  const [classes, setClasses] = useState<(TennisClass & { participants: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const coachName: string = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    (async () => {
      const { data: mb } = await supabase
        .from('club_memberships')
        .select('*, clubs(*)')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('role', 'coach');
      const coachMemberships = (mb as CoachMembership[]) || [];
      setMemberships(coachMemberships);

      const clubIds = coachMemberships.map(m => m.club_id);
      if (clubIds.length === 0) { setLoading(false); return; }

      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .in('club_id', clubIds)
        .order('id');
      const all = (cls as TennisClass[]) || [];
      const mine = all.filter(c => c.coach && coachName && c.coach.toLowerCase().includes(coachName.toLowerCase()));

      const withCounts = await Promise.all(
        mine.map(async c => {
          const { count } = await supabase
            .from('class_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', c.id)
            .eq('status', 'confirmed');
          return { ...c, participants: count ?? 0 };
        })
      );

      setClasses(withCounts);
      setLoading(false);
    })();
  }, [authLoading, user, router, coachName]);

  const bySlug: Record<string, Club | null> = useMemo(() => {
    const out: Record<string, Club | null> = {};
    memberships.forEach(m => { if (m.clubs) out[m.club_id] = m.clubs; });
    return out;
  }, [memberships]);

  if (authLoading || loading) return <main className="min-h-screen bg-[#FFF8F0]" />;

  if (!user) return null;

  if (memberships.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 text-[#1A1A1A]/20"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">未係教練</h1>
          <p className="text-[#1A1A1A]/60 mb-6">你仲未被任何球會認可為教練。如果你係教練，可以搵球會申請加入教練團隊。</p>
          <Link href="/clubs" className="inline-block bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm">瀏覽球會</Link>
        </div>
      </main>
    );
  }

  const totalParticipants = classes.reduce((sum, c) => sum + c.participants, 0);
  const totalSlots = classes.reduce((sum, c) => sum + c.spots_total, 0);

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <section className="bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-wider text-[#C4A265] font-bold mb-2">教練模式</p>
          <h1 className="text-3xl md:text-4xl font-bold">{coachName}</h1>
          <p className="text-white/60 mt-2">於 {memberships.length} 間球會授課</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">課程</p>
            <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{classes.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">學生</p>
            <p className="text-3xl font-bold text-[#C4A265] mt-1">{totalParticipants}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">總名額</p>
            <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{totalSlots}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1A1A1A]">今日 / 即將</h2>
          <Link href="/coach/schedule" className="text-sm text-[#C4A265] font-semibold hover:underline">完整行程 →</Link>
        </div>

        <div className="space-y-3 mb-10">
          {classes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-[#1A1A1A]/50">
              <p>未有課程記錄名為「{coachName}」教學</p>
              <p className="text-xs mt-2">球會管理員喺建立課程時應該用你嘅名稱作為教練名</p>
            </div>
          ) : classes.map(c => {
            const club = bySlug[c.club_id];
            const pct = c.spots_total ? Math.round((c.participants / c.spots_total) * 100) : 0;
            return (
              <Link key={c.id} href={`/coach/classes/${c.id}`}
                className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs text-[#C4A265] font-bold uppercase tracking-wider mb-1">{club?.name}</p>
                    <h3 className="text-lg font-bold text-[#1A1A1A]">{c.name}</h3>
                    <p className="text-sm text-[#1A1A1A]/60 mt-1">{c.day} · {c.time} · {c.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{c.participants}<span className="text-sm text-[#1A1A1A]/40 font-normal"> / {c.spots_total}</span></p>
                    <p className="text-xs text-[#1A1A1A]/50">報名 {pct}%</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">我嘅球會</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-12">
          {memberships.map(m => (
            <Link key={m.id} href={`/clubs/${m.clubs?.slug}`}
              className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
              <p className="font-semibold text-[#1A1A1A]">{m.clubs?.name}</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">教練</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
