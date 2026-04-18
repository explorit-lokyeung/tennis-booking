'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Club, ClubMembership, TennisClass } from '@/lib/types';

type CoachMembership = ClubMembership & { clubs: Club | null };

const DAY_ORDER: Record<string, number> = {
  '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6,
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

const DAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export default function CoachSchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<TennisClass[]>([]);
  const [clubsById, setClubsById] = useState<Record<string, Club>>({});
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
      const memberships = (mb as CoachMembership[]) || [];
      const clubMap: Record<string, Club> = {};
      memberships.forEach(m => { if (m.clubs) clubMap[m.club_id] = m.clubs; });
      setClubsById(clubMap);

      const clubIds = memberships.map(m => m.club_id);
      if (clubIds.length === 0) { setLoading(false); return; }

      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .in('club_id', clubIds)
        .neq('visible', false);
      const mine = ((cls as TennisClass[]) || []).filter(
        c => c.coach && coachName && c.coach.toLowerCase().includes(coachName.toLowerCase())
      );
      setClasses(mine);
      setLoading(false);
    })();
  }, [authLoading, user, router, coachName]);

  const byDay = useMemo(() => {
    const out: Record<number, TennisClass[]> = {};
    for (const c of classes) {
      const key = DAY_ORDER[c.day] ?? 7;
      (out[key] = out[key] || []).push(c);
    }
    Object.values(out).forEach(arr => arr.sort((a, b) => a.time.localeCompare(b.time)));
    return out;
  }, [classes]);

  if (authLoading || loading) return <main className="min-h-screen bg-[#FFF8F0]" />;
  if (!user) return null;

  const today = new Date().getDay();

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/coach" className="text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] mb-3 inline-block">← 教練控制台</Link>
        <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">每週行程</h1>
        <p className="text-[#1A1A1A]/60 mb-8">{classes.length} 堂課，橫跨 {Object.keys(clubsById).length} 間球會</p>

        {classes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-[#1A1A1A]/50">
            未有課程記錄名為「{coachName}」教學
          </div>
        ) : (
          <div className="space-y-6">
            {DAY_NAMES.map((dayName, dayIdx) => {
              const items = byDay[dayIdx] || [];
              if (items.length === 0) return null;
              const isToday = dayIdx === today;
              return (
                <div key={dayIdx}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className={`text-2xl font-bold ${isToday ? 'text-[#C4A265]' : 'text-[#1A1A1A]'}`}>{dayName}</h2>
                    {isToday && <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4A265] text-white font-bold uppercase">今日</span>}
                    <span className="text-sm text-[#1A1A1A]/40">{items.length} 堂</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(c => {
                      const club = clubsById[c.club_id];
                      return (
                        <Link key={c.id} href={`/coach/classes/${c.id}`}
                          className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
                          <p className="text-xs text-[#C4A265] font-bold uppercase tracking-wider mb-1">{club?.name}</p>
                          <h3 className="text-lg font-bold text-[#1A1A1A]">{c.name}</h3>
                          <p className="text-sm text-[#1A1A1A]/60 mt-1">{c.time} · {c.location}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1A1A1A]/5">
                            <span className="text-xs text-[#1A1A1A]/50">{c.level === 'Beginner' ? '初級' : c.level === 'Intermediate' ? '中級' : '高級'}</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">{c.spots_total - c.spots_available}/{c.spots_total}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
