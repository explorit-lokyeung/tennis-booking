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
  status?: string;
  courts: { name: string; surface: string } | null;
  clubs?: { slug: string; name: string } | null;
}

interface ClassBookingRow {
  id: string;
  club_id: string;
  status?: string;
  classes: { id: string; name: string; coach: string; day: string; time: string; spots_available: number } | null;
  clubs?: { slug: string; name: string } | null;
}

type MembershipRow = ClubMembership & { clubs: Club | null };

type CalendarEvent = {
  kind: 'court' | 'class';
  id: string;
  title: string;
  clubId: string;
  clubName: string;
  clubSlug: string;
  time: string;
  sortKey: number;
  status: string;
  raw: BookingRow | ClassBookingRow;
};

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseClassStartMinutes(time: string): number {
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function fmtHour(h: number): string {
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sMon = start.getMonth() + 1;
  const eMon = end.getMonth() + 1;
  return sameMonth
    ? `${start.getFullYear()} 年 ${sMon} 月 ${start.getDate()} – ${end.getDate()} 日`
    : `${start.getFullYear()} 年 ${sMon} 月 ${start.getDate()} 日 – ${eMon} 月 ${end.getDate()} 日`;
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [classBookings, setClassBookings] = useState<ClassBookingRow[]>([]);
  const [offline, setOffline] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
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
        .select('id, club_id, slot_id, date, hour, status, courts(name, surface), clubs(slug, name)')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      if (bk) setBookings(bk as any);

      const { data: cb } = await supabase
        .from('class_bookings')
        .select('id, club_id, status, classes(id, name, coach, day, time, spots_available), clubs(slug, name)')
        .eq('user_id', user.id);
      if (cb) setClassBookings(cb as any);

      setLoading(false);
    }
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const openEdit = () => {
    setEditName(user?.user_metadata?.name || '');
    setEditPhone(user?.user_metadata?.phone || '');
    setEditError('');
    setEditOpen(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { name: editName.trim(), phone: editPhone.trim() },
    });
    setEditSaving(false);
    if (error) { setEditError(error.message || '更新失敗'); return; }
    if (data?.user) setUser(data.user);
    setEditOpen(false);
    toast('已更新個人資料');
  };

  const cancelBooking = async (bookingId: string, slotId: string, date: string, hour: number) => {
    // Check cancel deadline (2 hours before)
    const slotTime = new Date(`${date}T${String(hour).padStart(2,'0')}:00:00+08:00`);
    const now = new Date();
    const hoursUntil = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 2) {
      toast('開始前 2 小時內不可取消預約。', 'error');
      return;
    }
    if (!confirm('確定取消此預約？')) return;
    // Soft delete: update status instead of deleting
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    // Release the slot back to available
    await supabase.from('court_slots').update({ status: 'available', booked_by: null }).eq('id', slotId);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    setSelected(null);
    toast('已取消預約');
  };

  const cancelClass = async (cbId: string, classId: string) => {
    const cls = classBookings.find(cb => cb.id === cbId);
    if (cls?.classes) {
      // Check if next class is within 24 hours
      const dayMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6,
        '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6 };
      const classDay = dayMap[cls.classes.day];
      if (classDay !== undefined && cls.classes.time) {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
        const todayDay = now.getDay();
        let daysUntil = (classDay - todayDay + 7) % 7;
        if (daysUntil === 0) {
          const [h, m] = cls.classes.time.split(':').map(Number);
          const classToday = new Date(now); classToday.setHours(h, m, 0, 0);
          if (now >= classToday) daysUntil = 7; // already passed this week
        }
        const nextClass = new Date(now); nextClass.setDate(nextClass.getDate() + daysUntil);
        const [ch, cm] = cls.classes.time.split(':').map(Number);
        nextClass.setHours(ch, cm, 0, 0);
        const hoursUntil = (nextClass.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntil < 24) {
          toast('下堂課 24 小時內不可取消報名。', 'error');
          return;
        }
      }
    }
    if (!confirm('確定取消報名？')) return;
    await supabase.from('class_bookings').update({ status: 'cancelled' }).eq('id', cbId);
    if (cls?.classes) {
      await supabase.from('classes').update({ spots_available: cls.classes.spots_available + 1 }).eq('id', classId);
    }
    setClassBookings(prev => prev.filter(cb => cb.id !== cbId));
    setSelected(null);
    toast('已取消報名');
  };

  const clubOptions = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach(b => { if (b.clubs) map.set(b.club_id, b.clubs.name); });
    classBookings.forEach(cb => { if (cb.clubs) map.set(cb.club_id, cb.clubs.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings, classBookings]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekDates.forEach(d => map.set(isoDate(d), []));

    const passesClubFilter = (clubId: string) => clubFilter === 'all' || clubFilter === clubId;

    bookings.forEach(b => {
      if (!passesClubFilter(b.club_id)) return;
      const bucket = map.get(b.date);
      if (!bucket) return;
      bucket.push({
        kind: 'court',
        id: `court-${b.id}`,
        title: b.courts?.name ?? '球場',
        clubId: b.club_id,
        clubName: b.clubs?.name ?? '',
        clubSlug: b.clubs?.slug ?? '',
        time: fmtHour(b.hour),
        sortKey: b.hour * 60,
        status: b.status ?? 'confirmed',
        raw: b,
      });
    });

    classBookings.forEach(cb => {
      if (!cb.classes) return;
      if (!passesClubFilter(cb.club_id)) return;
      const dayIdx = DAY_NAME_TO_INDEX[cb.classes.day.toLowerCase()];
      if (dayIdx === undefined) return;
      const target = weekDates.find(d => d.getDay() === dayIdx);
      if (!target) return;
      const bucket = map.get(isoDate(target));
      if (!bucket) return;
      bucket.push({
        kind: 'class',
        id: `class-${cb.id}`,
        title: cb.classes.name,
        clubId: cb.club_id,
        clubName: cb.clubs?.name ?? '',
        clubSlug: cb.clubs?.slug ?? '',
        time: cb.classes.time,
        sortKey: parseClassStartMinutes(cb.classes.time),
        status: cb.status ?? 'confirmed',
        raw: cb,
      });
    });

    map.forEach(list => list.sort((a, b) => a.sortKey - b.sortKey));
    return map;
  }, [bookings, classBookings, weekDates, clubFilter]);

  const totalEventsThisWeek = useMemo(
    () => Array.from(eventsByDate.values()).reduce((n, list) => n + list.length, 0),
    [eventsByDate],
  );

  if (loading) return <main className="min-h-screen bg-[#FFF8F0]" />;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center">
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
  const icalUrl = `/api/ical?user_id=${user.id}`;
  const todayIso = isoDate(new Date());

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#C4A265] flex items-center justify-center text-white text-xl font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            {offline && (
              <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm text-center mb-4 font-semibold">
                離線模式 — 顯示上次緩存嘅預約資料
              </div>
            )}
            <h1 className="text-xl font-bold text-[#1A1A1A]">{userName}</h1>
            <p className="text-sm text-[#1A1A1A]/50">{user.email}</p>
            {user.user_metadata?.phone && (
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{user.user_metadata.phone}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <button onClick={openEdit} className="text-xs font-bold bg-[#C4A265]/10 text-[#C4A265] px-3 py-1.5 rounded-full hover:bg-[#C4A265]/20 transition-all">
              編輯資料
            </button>
            <button onClick={handleLogout} className="text-sm text-red-500 font-semibold hover:underline">
              登出
            </button>
          </div>
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

        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">我的預約日曆</h2>
            <p className="text-xs text-[#1A1A1A]/50 mt-1">本週 {totalEventsThisWeek} 項 · 球場 + 課堂</p>
          </div>
          {(bookings.length > 0 || classBookings.length > 0) && (
            <a href={icalUrl} className="text-xs text-[#C4A265] font-semibold hover:underline" download="tennis-bookings.ics">
              匯出到日曆 (ical)
            </a>
          )}
        </div>

        {clubOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setClubFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                clubFilter === 'all'
                  ? 'bg-[#1A1A1A] text-[#FFF8F0] border-[#1A1A1A]'
                  : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#C4A265]'
              }`}
            >
              所有球會
            </button>
            {clubOptions.map(c => (
              <button
                key={c.id}
                onClick={() => setClubFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all border ${
                  clubFilter === c.id
                    ? 'bg-[#1A1A1A] text-[#FFF8F0] border-[#1A1A1A]'
                    : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#C4A265]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekStart(prev => addDays(prev, -7))}
              className="w-9 h-9 rounded-full border border-[#1A1A1A]/10 hover:border-[#C4A265] text-[#1A1A1A] flex items-center justify-center transition-all"
              aria-label="上一週"
            >
              ‹
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1A1A1A]">{fmtWeekRange(weekStart)}</p>
              <button
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="text-xs text-[#C4A265] font-semibold hover:underline mt-0.5"
              >
                返回本週
              </button>
            </div>
            <button
              onClick={() => setWeekStart(prev => addDays(prev, 7))}
              className="w-9 h-9 rounded-full border border-[#1A1A1A]/10 hover:border-[#C4A265] text-[#1A1A1A] flex items-center justify-center transition-all"
              aria-label="下一週"
            >
              ›
            </button>
          </div>

          <div className="flex items-center gap-4 mb-3 text-xs text-[#1A1A1A]/60">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#1A1A1A]" /> 球場
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#C4A265]" /> 課堂
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDates.map((d, idx) => {
              const iso = isoDate(d);
              const events = eventsByDate.get(iso) ?? [];
              const isToday = iso === todayIso;
              return (
                <div
                  key={iso}
                  className={`min-h-[140px] rounded-xl border p-2 flex flex-col ${
                    isToday ? 'border-[#C4A265] bg-[#C4A265]/5' : 'border-[#1A1A1A]/5 bg-[#FFF8F0]/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-[#C4A265]' : 'text-[#1A1A1A]/40'}`}>
                      {WEEKDAY_LABELS[d.getDay()]}
                    </span>
                    <span className={`text-sm font-bold ${isToday ? 'text-[#C4A265]' : 'text-[#1A1A1A]'}`}>
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {events.length === 0 ? (
                      <span className="text-[10px] text-[#1A1A1A]/20">—</span>
                    ) : events.map(ev => {
                      const cancelled = ev.status === 'cancelled';
                      const pending = ev.status === 'pending';
                      const base = ev.kind === 'court' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#C4A265] text-white';
                      const styled = cancelled
                        ? 'bg-[#1A1A1A]/20 text-[#1A1A1A]/50 line-through'
                        : pending
                          ? ev.kind === 'court' ? 'bg-[#1A1A1A]/60 text-[#FFF8F0]' : 'bg-[#C4A265]/60 text-white'
                          : base;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelected(ev)}
                          className={`${styled} text-left rounded-md px-1.5 py-1 text-[10px] leading-tight hover:opacity-90 transition-opacity`}
                        >
                          <p className="font-bold truncate">{ev.title}</p>
                          <p className="opacity-80 truncate">{ev.time}</p>
                          {ev.clubName && <p className="opacity-60 truncate hidden sm:block">{ev.clubName}</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {totalEventsThisWeek === 0 && (
            <p className="text-center text-[#1A1A1A]/40 text-sm mt-6">本週暫無預約</p>
          )}
        </div>

        <h2 className="text-lg font-bold text-[#1A1A1A] mb-3 mt-10">我的球會 ({approved.length})</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
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
                {m.clubs?.name} — 申請審批中
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/clubs" className="flex-1 text-center bg-[#1A1A1A] text-[#FFF8F0] py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all">
            瀏覽球會
          </Link>
          <Link href="/classes" className="flex-1 text-center bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:border-[#C4A265] transition-all">
            瀏覽課堂
          </Link>
        </div>
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 bg-[#1A1A1A]/50 flex items-center justify-center px-4 z-50"
          onClick={() => setEditOpen(false)}
        >
          <form
            onSubmit={saveProfile}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
          >
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">編輯個人資料</h3>
            <p className="text-xs text-[#1A1A1A]/50 mb-5">電郵地址無法修改</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/70 mb-1">姓名</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1A1A1A]/10 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/70 mb-1">電話</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1A1A1A]/10 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/70 mb-1">電郵</label>
                <input type="email" disabled value={user.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1A1A1A]/10 bg-[#FFF8F0] text-[#1A1A1A]/60" />
              </div>
            </div>

            {editError && <p className="text-red-500 text-sm mt-3">{editError}</p>}

            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setEditOpen(false)}
                className="flex-1 bg-[#FFF8F0] text-[#1A1A1A] py-2.5 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-[#FFF8F0]/60 transition-all">
                取消
              </button>
              <button type="submit" disabled={editSaving}
                className="flex-1 bg-[#1A1A1A] text-[#FFF8F0] py-2.5 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50">
                {editSaving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-[#1A1A1A]/50 flex items-center justify-center px-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
                  selected.kind === 'court' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#C4A265] text-white'
                }`}
              >
                {selected.kind === 'court' ? '球場' : '課堂'}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
                  selected.status === 'cancelled'
                    ? 'bg-red-50 text-red-600'
                    : selected.status === 'pending'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {selected.status === 'cancelled' ? '已取消' : selected.status === 'pending' ? '待確認' : '已確認'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">{selected.title}</h3>
            <p className="text-sm text-[#1A1A1A]/60 mb-1">{selected.time}</p>
            {selected.clubName && (
              <Link
                href={`/clubs/${selected.clubSlug}`}
                className="text-xs text-[#C4A265] font-semibold hover:underline"
              >
                {selected.clubName} →
              </Link>
            )}
            {selected.kind === 'class' && (selected.raw as ClassBookingRow).classes && (
              <p className="text-xs text-[#1A1A1A]/50 mt-2">教練 {(selected.raw as ClassBookingRow).classes!.coach}</p>
            )}
            {selected.kind === 'court' && (selected.raw as BookingRow).courts && (
              <p className="text-xs text-[#1A1A1A]/50 mt-2">場地 {(selected.raw as BookingRow).courts!.surface}</p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 bg-[#FFF8F0] text-[#1A1A1A] py-2.5 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-[#FFF8F0]/60 transition-all"
              >
                關閉
              </button>
              {selected.status !== 'cancelled' && (
                selected.kind === 'court' ? (
                  <button
                    onClick={() => {
                      const b = selected.raw as BookingRow;
                      cancelBooking(b.id, b.slot_id, b.date, b.hour);
                    }}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-red-600 transition-all"
                  >
                    取消預約
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const cb = selected.raw as ClassBookingRow;
                      cancelClass(cb.id, cb.classes?.id ?? '');
                    }}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-red-600 transition-all"
                  >
                    取消報名
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
