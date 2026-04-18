'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Club, TennisClass } from '@/lib/types';

type Participant = {
  booking_id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  attended: boolean;
  created_at: string;
};

export default function CoachClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.id as string;
  const { user, loading: authLoading } = useAuth();

  const [cls, setCls] = useState<TennisClass | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [notAuthorised, setNotAuthorised] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    (async () => {
      const { data: classRow } = await supabase.from('classes').select('*').eq('id', classId).maybeSingle();
      if (!classRow) { setLoading(false); return; }
      setCls(classRow as TennisClass);

      const { data: membership } = await supabase
        .from('club_memberships')
        .select('role, status')
        .eq('club_id', (classRow as any).club_id)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (!membership || !['coach', 'admin', 'owner'].includes((membership as any).role)) {
        setNotAuthorised(true);
        setLoading(false);
        return;
      }

      const { data: clubRow } = await supabase.from('clubs').select('*').eq('id', (classRow as any).club_id).maybeSingle();
      setClub(clubRow as Club);

      const { data } = await supabase.rpc('get_class_participants', { p_class_id: classId });
      setParticipants((data as Participant[]) || []);
      setLoading(false);
    })();
  }, [authLoading, user, classId, router]);

  const toggleAttendance = async (bookingId: string, attended: boolean) => {
    await supabase.from('class_bookings').update({ attended }).eq('id', bookingId);
    setParticipants(prev => prev.map(p => p.booking_id === bookingId ? { ...p, attended } : p));
  };

  const markAll = async (attended: boolean) => {
    if (!cls) return;
    const ids = participants.map(p => p.booking_id);
    if (ids.length === 0) return;
    await supabase.from('class_bookings').update({ attended }).in('id', ids);
    setParticipants(prev => prev.map(p => ({ ...p, attended })));
  };

  if (authLoading || loading) return <main className="min-h-screen bg-[#FFF8F0]" />;

  if (notAuthorised) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">無權限查看</h1>
          <Link href="/coach" className="text-[#C4A265] font-semibold">← 返回教練控制台</Link>
        </div>
      </main>
    );
  }

  if (!cls) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">搵唔到課程</h1>
          <Link href="/coach" className="text-[#C4A265] font-semibold">← 教練控制台</Link>
        </div>
      </main>
    );
  }

  const attendedCount = participants.filter(p => p.attended).length;

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <section className="bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/coach" className="text-white/60 hover:text-white text-sm mb-3 inline-block">← 教練控制台</Link>
          <p className="text-xs uppercase tracking-wider text-[#C4A265] font-bold mb-1">{club?.name}</p>
          <h1 className="text-3xl md:text-4xl font-bold">{cls.name}</h1>
          <p className="text-white/70 mt-2 text-sm">{cls.day} · {cls.time} · {cls.location}</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#1A1A1A]/50">出席率</p>
              <p className="text-3xl font-bold text-[#1A1A1A]">{attendedCount} <span className="text-sm text-[#1A1A1A]/40 font-normal">/ {participants.length}</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markAll(true)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200">全部到齊</button>
              <button onClick={() => markAll(false)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10">清除全部</button>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#1A1A1A] mb-3">參加者 ({participants.length})</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-[#1A1A1A]/5">
          {participants.length === 0 ? (
            <p className="p-8 text-center text-[#1A1A1A]/50">未有人報名</p>
          ) : participants.map(p => (
            <div key={p.booking_id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A1A1A]">{p.name || p.email?.split('@')[0] || '未知'}</p>
                <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{p.email}</p>
              </div>
              <button onClick={() => toggleAttendance(p.booking_id, !p.attended)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  p.attended ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10'
                }`}>
                {p.attended ? '✓ 到齊' : '未到'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
