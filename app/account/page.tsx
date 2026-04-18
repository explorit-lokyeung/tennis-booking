'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import type { Club, ClubMembership } from '@/lib/types';

interface BookingRow {
  id: string;
  club_id: string;
  slot_id: string;
  date: string;
  hour: number;
  courts: { name: string; surface: string } | null;
  clubs?: { slug: string; name: string } | null;
}

interface ClassBookingRow {
  id: string;
  club_id: string;
  classes: { id: string; name: string; coach: string; day: string; time: string; spots_available: number } | null;
  clubs?: { slug: string; name: string } | null;
}

type MembershipRow = ClubMembership & { clubs: Club | null };

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [classBookings, setClassBookings] = useState<ClassBookingRow[]>([]);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    setOffline(!navigator.onLine);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUser(user);

      const { data: mb } = await supabase
        .from('club_memberships')
        .select('*, clubs(*)')
        .eq('user_id', user.id);
      if (mb) setMemberships(mb as MembershipRow[]);

      const { data: bk } = await supabase
        .from('bookings')
        .select('id, club_id, slot_id, date, hour, courts(name, surface), clubs(slug, name)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('date', { ascending: true });
      if (bk) setBookings(bk as any);

      const { data: cb } = await supabase
        .from('class_bookings')
        .select('id, club_id, classes(id, name, coach, day, time, spots_available), clubs(slug, name)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      if (cb) setClassBookings(cb as any);

      setLoading(false);
    }
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const cancelBooking = async (bookingId: string, slotId: string) => {
    if (!confirm('確定取消此預約？')) return;
    await supabase.from('bookings').delete().eq('id', bookingId);
    await supabase.from('slots').delete().eq('id', slotId);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    toast('已取消預約');
  };

  const cancelClass = async (cbId: string, classId: string) => {
    if (!confirm('確定取消報名？')) return;
    await supabase.from('class_bookings').delete().eq('id', cbId);
    const cls = classBookings.find(cb => cb.id === cbId);
    if (cls?.classes) {
      await supabase.from('classes').update({ spots_available: cls.classes.spots_available + 1 }).eq('id', classId);
    }
    setClassBookings(prev => prev.filter(cb => cb.id !== cbId));
    toast('已取消報名');
  };

  const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

  const { upcoming, past } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      upcoming: bookings.filter(b => b.date >= today),
      past: bookings.filter(b => b.date < today),
    };
  }, [bookings]);

  if (loading) return <main className="min-h-screen bg-[#FFF8F0]" />;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🎾</p>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">請先登入</h2>
          <p className="text-[#1A1A1A]/50 mb-6">查看你嘅球會同預約</p>
          <Link href="/login" className="inline-block bg-[#1A1A1A] text-[#FFF8F0] px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all">
            登入
          </Link>
        </div>
      </main>
    );
  }

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || '用戶';
  const approved = memberships.filter(m => m.status === 'approved');
  const pending = memberships.filter(m => m.status === 'pending');
  const coachMemberships = approved.filter(m => m.role === 'coach');
  const shown = tab === 'upcoming' ? upcoming : past;

  const icalUrl = `/api/ical?user_id=${user.id}`;

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#C4A265] flex items-center justify-center text-white text-xl font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            {offline && (
              <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm text-center mb-4 font-semibold">
                📡 離線模式 — 顯示上次緩存嘅預約資料
              </div>
            )}
            <h1 className="text-xl font-bold text-[#1A1A1A]">{userName}</h1>
            <p className="text-sm text-[#1A1A1A]/50">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-500 font-semibold hover:underline">
            登出
          </button>
        </div>

        {coachMemberships.length > 0 && (
          <Link href="/coach" className="block bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white rounded-2xl shadow-sm p-5 mb-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#C4A265] font-bold mb-1">教練模式</p>
                <p className="font-bold">查看我嘅教學課堂</p>
                <p className="text-xs text-white/60 mt-1">於 {coachMemberships.length} 間球會</p>
              </div>
              <span className="text-2xl">→</span>
            </div>
          </Link>
        )}

        <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">我的球會 ({approved.length})</h2>
        <div className="space-y-3 mb-4">
          {approved.length === 0 ? (
            <p className="text-[#1A1A1A]/40 text-sm">暫未加入任何球會 · <Link href="/clubs" className="text-[#C4A265] font-semibold">瀏覽球會 →</Link></p>
          ) : approved.map(m => (
            <Link key={m.id} href={`/clubs/${m.clubs?.slug}`}
              className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{m.clubs?.name}</p>
                  <p className="text-xs text-[#1A1A1A]/50 mt-0.5">
                    {m.role === 'owner' ? '東主' : m.role === 'admin' ? '管理員' : m.role === 'coach' ? '教練' : '會員'}
                  </p>
                </div>
                <span className="text-xs text-[#C4A265] font-semibold">查看 →</span>
              </div>
            </Link>
          ))}
        </div>

        {pending.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#1A1A1A]/60 mb-2">審批中</h3>
            {pending.map(m => (
              <div key={m.id} className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                🕒 {m.clubs?.name} — 申請審批中
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-8 mb-3">
          <h2 className="text-lg font-bold text-[#1A1A1A]">我的球場預約</h2>
          {bookings.length > 0 && (
            <a href={icalUrl} className="text-xs text-[#C4A265] font-semibold hover:underline" download="tennis-bookings.ics">
              匯出到日曆 (ical)
            </a>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          {(['upcoming', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === t ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A]/50'
              }`}>
              {t === 'upcoming' ? `未來 (${upcoming.length})` : `過去 (${past.length})`}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          {shown.length === 0 ? (
            <p className="text-[#1A1A1A]/40 text-sm">{tab === 'upcoming' ? '暫無預約' : '未有紀錄'}</p>
          ) : shown.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1A1A1A]">
                  {b.courts?.name}
                  {b.clubs?.slug && <Link href={`/clubs/${b.clubs.slug}`} className="text-xs text-[#C4A265] ml-2 hover:underline">{b.clubs.name}</Link>}
                </p>
                <p className="text-sm text-[#1A1A1A]/50">{b.date} · {fmtHour(b.hour)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-semibold">已確認</span>
                {tab === 'upcoming' && (
                  <button onClick={() => cancelBooking(b.id, b.slot_id)} className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50">取消</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">我的課堂</h2>
        <div className="space-y-3 mb-8">
          {classBookings.length === 0 ? (
            <p className="text-[#1A1A1A]/40 text-sm">暫無報名</p>
          ) : classBookings.map(cb => (
            <div key={cb.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1A1A1A]">
                  {cb.classes?.name}
                  {cb.clubs?.slug && <Link href={`/clubs/${cb.clubs.slug}`} className="text-xs text-[#C4A265] ml-2 hover:underline">{cb.clubs.name}</Link>}
                </p>
                <p className="text-sm text-[#1A1A1A]/50">{cb.classes?.day} {cb.classes?.time} · {cb.classes?.coach}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#C4A265]/10 text-[#C4A265] px-3 py-1 rounded-full font-semibold">已報名</span>
                <button onClick={() => cancelClass(cb.id, cb.classes?.id || '')} className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50">取消</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/clubs" className="flex-1 text-center bg-[#1A1A1A] text-[#FFF8F0] py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all">
            瀏覽球會
          </Link>
        </div>
      </div>
    </main>
  );
}
