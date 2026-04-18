'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/Toast';
import SuccessAnimation from '@/components/SuccessAnimation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useClub, useMembership, isApprovedMember } from '@/lib/club';
import { getBookingPolicy, isWithinAdvanceWindow, getUserDayBookingCount, DEFAULT_POLICY, type BookingPolicy } from '@/lib/policy';
import type { Court, Slot, Visibility } from '@/lib/types';

type Selection = { courtId: string; hour: number };

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function fmtHour(h: number) {
  return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function ClubCourtsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { user } = useAuth();
  const { club, loading: clubLoading } = useClub(slug);
  const { membership } = useMembership(club?.id, user?.id);
  const approved = isApprovedMember(membership);

  const [courts, setCourts] = useState<Court[]>([]);
  const [policy, setPolicy] = useState<BookingPolicy>(DEFAULT_POLICY);
  const [operatingHours, setOperatingHours] = useState({ open: 7, close: 23 });
  const hours = Array.from({ length: operatingHours.close - operatingHours.open }, (_, i) => i + operatingHours.open);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dateIdx, setDateIdx] = useState(0);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [loading, setLoading] = useState(false);

  const nowHK = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
  const currentHKHour = nowHK.getHours();

  const advanceDays = approved ? policy.advance_days : policy.advance_days_public;

  const isViewOnly = (idx: number) => {
    // Outside the user's bookable window = preview only.
    return idx >= advanceDays;
  };

  const dates = Array.from({ length: Math.max(advanceDays, 8) }, (_, i) => {
    const d = new Date(nowHK);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    if (!club) return;
    supabase.from('settings').select('*').eq('club_id', club.id).then(({ data }) => {
      if (data) {
        const open = data.find((s: any) => s.key === 'open_hour');
        const close = data.find((s: any) => s.key === 'close_hour');
        if (open && close) setOperatingHours({ open: parseInt(open.value), close: parseInt(close.value) });
      }
    });
    supabase.from('courts').select('*').eq('club_id', club.id).order('id').then(({ data }) => {
      if (data) setCourts(data as Court[]);
    });
    getBookingPolicy(club.id).then(setPolicy);
  }, [club]);

  useEffect(() => {
    if (!club) return;
    const selectedDate = dates[dateIdx];
    const dateStr = selectedDate.toISOString().split('T')[0];

    const fetchSlots = async () => {
      const { data } = await supabase.from('slots').select('*').eq('club_id', club.id).eq('date', dateStr);
      if (data) setSlots(data as Slot[]);
    };
    fetchSlots();

    const interval = setInterval(fetchSlots, 2000);
    return () => clearInterval(interval);
  }, [dateIdx, club]);

  const getSlotForCourtAndHour = (courtId: string, hour: number) =>
    slots.find((s) => s.court_id === courtId && s.hour === hour);
  const isSelected = (courtId: string, hour: number) =>
    selections.some((s) => s.courtId === courtId && s.hour === hour);

  const handleSlotClick = (courtId: string, hour: number) => {
    if (isViewOnly(dateIdx)) return;
    if (dateIdx === 0 && hour <= currentHKHour) return;
    if (isSelected(courtId, hour)) {
      setSelections((prev) => prev.filter((s) => !(s.courtId === courtId && s.hour === hour)));
      return;
    }
    if (selections.length === 0 || selections[0].courtId !== courtId || selections.length >= 2) {
      setSelections([{ courtId, hour }]);
      return;
    }
    if (Math.abs(hour - selections[0].hour) === 1) {
      setSelections([...selections, { courtId, hour }].sort((a, b) => a.hour - b.hour));
    } else {
      setSelections([{ courtId, hour }]);
    }
  };

  const handleConfirmBooking = async () => {
    if (!user) { router.push('/login'); return; }
    if (!club) return;
    setLoading(true);
    setError('');

    try {
      const dateStr = dates[dateIdx].toISOString().split('T')[0];

      if (!isWithinAdvanceWindow(dateStr, approved, policy)) {
        setError(`超出預約窗口（${approved ? policy.advance_days : policy.advance_days_public} 日內）。`);
        setLoading(false);
        return;
      }

      if (policy.daily_limit > 0) {
        const already = await getUserDayBookingCount(club.id, user.id, dateStr);
        if (already + selections.length > policy.daily_limit) {
          setError(`每日最多 ${policy.daily_limit} 個時段，你已預約 ${already} 個。`);
          setLoading(false);
          return;
        }
      }
      const slotRows = selections.map(s => ({
        club_id: club.id,
        court_id: s.courtId,
        date: dateStr,
        hour: s.hour,
        status: 'booked',
        booked_by: user.id,
      }));
      const { data: insertedSlots, error: slotError } = await supabase.from('slots').insert(slotRows).select();
      if (slotError) {
        setError('預約失敗，時段可能已被預訂，或你已預約咗同一時間嘅其他場地。');
        setLoading(false);
        return;
      }
      const bookingRows = insertedSlots.map((slot, idx) => ({
        club_id: club.id,
        user_id: user.id,
        slot_id: slot.id,
        court_id: selections[idx].courtId,
        date: dateStr,
        hour: selections[idx].hour,
      }));
      const { error: bookingError } = await supabase.from('bookings').insert(bookingRows);
      if (bookingError) { setError('預約失敗，請稍後再試。'); setLoading(false); return; }
      setBooked(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch {
      setError('預約失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourt = courts.find((c) => c.id === selections[0]?.courtId);
  const totalHours = selections.length;
  const totalPrice = selectedCourt ? selectedCourt.hourly_rate * totalHours : 0;

  const visibleCourts = courts.filter(c => {
    const viz = (c.visibility || 'public') as Visibility;
    if (viz === 'public') return true;
    if (viz === 'members') return approved;
    return false;
  });

  if (clubLoading) return <main className="min-h-screen bg-[#FFF8F0]" />;
  if (!club) return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
      <div className="text-center"><h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">找不到球會</h1>
        <Link href="/clubs" className="text-[#C4A265] font-semibold">← 球會目錄</Link></div>
    </main>
  );

  return (
    <>{showSuccess && <SuccessAnimation message="預約成功！" />}
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Link href={`/clubs/${slug}`} className="text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] mb-3 inline-block">
          ← {club.name}
        </Link>
        <h1 className="text-4xl font-black tracking-tight text-[#1A1A1A] mb-2">球場預約</h1>
        <p className="text-[#1A1A1A]/60 mb-2">選擇日期，揀時段，預約球場。可選擇連續 1-2 個時段。</p>
        <div className="flex items-center gap-4 mb-8 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200"></span>可預約</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#C4A265]"></span>已選擇</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#1A1A1A]/5"></span>已滿</span>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {dates.map((d, i) => {
            const viewOnly = i === 7 || (i === 6 && currentHKHour < 9);
            return (
              <button key={i}
                onClick={() => { setDateIdx(i); setSelections([]); setBooked(false); setError(''); }}
                className={`flex flex-col items-center px-4 py-3 rounded-xl min-w-[72px] transition-all ${
                  dateIdx === i ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A] hover:bg-[#C4A265]/10'
                }`}>
                <span className="text-xs font-medium">星期{DAY_NAMES[d.getDay()]}</span>
                <span className="text-lg font-bold">{d.getDate()}</span>
                <span className="text-xs">{MONTH_NAMES[d.getMonth()]}</span>
                {viewOnly && <span className="text-[8px] text-[#C4A265] mt-0.5">預覽</span>}
              </button>
            );
          })}
        </div>

        {visibleCourts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-5xl mb-3">🎾</p>
            <p className="text-[#1A1A1A]/60">{courts.length === 0 ? '暫無球場' : '此球會的球場只開放會員使用，請先申請加入。'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-bold text-[#1A1A1A]/60">時間</th>
                  {visibleCourts.map(c => (
                    <th key={c.id} className="p-3 text-center text-sm font-bold text-[#1A1A1A]">
                      <div>{c.name}</div>
                      <div className="text-xs font-normal text-[#1A1A1A]/50">
                        {c.surface === 'Hard' ? '硬地' : c.surface === 'Clay' ? '泥地' : c.surface}
                        {c.indoor ? ' · 室內' : ' · 室外'}
                      </div>
                      {c.location && <div className="text-[10px] font-normal text-[#1A1A1A]/35">📍 {c.location}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(h => (
                  <tr key={h} className="border-t border-[#1A1A1A]/5">
                    <td className="p-3 text-sm font-medium text-[#1A1A1A]/70 whitespace-nowrap">{fmtHour(h)}</td>
                    {visibleCourts.map(c => {
                      const slot = getSlotForCourtAndHour(c.id, h);
                      const avail = !slot;
                      const sel = isSelected(c.id, h);
                      const isPast = dateIdx === 0 && h <= currentHKHour;
                      return (
                        <td key={c.id} className="p-1.5">
                          <button
                            disabled={!avail || isViewOnly(dateIdx) || isPast}
                            onClick={() => avail && !isPast && handleSlotClick(c.id, h)}
                            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${(isViewOnly(dateIdx) || isPast) ? 'opacity-40 cursor-default' : ''} ${
                              sel ? 'bg-[#C4A265] text-white ring-2 ring-[#C4A265] ring-offset-2'
                                : avail ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/20 cursor-not-allowed'
                            }`}>
                            {avail ? `$${c.hourly_rate}` : '—'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <div className="mt-8 bg-red-50 rounded-2xl p-4 text-center"><p className="text-red-600 font-semibold">{error}</p></div>}

        {selections.length > 0 && !booked && typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[9999]">
            <div className="bg-white border-t border-[#1A1A1A]/10 px-6 py-5 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]" style={{ animation: dismissing ? 'slideDown 0.3s ease-in forwards' : 'slideUp 0.3s ease-out' }}>
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center shrink-0"><span className="text-2xl">🎾</span></div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#1A1A1A] text-lg">{selectedCourt?.name}</h3>
                    <p className="text-[#1A1A1A]/50 text-sm mt-0.5">
                      {dates[dateIdx].getMonth() + 1}月{dates[dateIdx].getDate()}日 星期{DAY_NAMES[dates[dateIdx].getDay()]}
                      {'  ·  '}{fmtHour(selections[0].hour)} – {fmtHour(selections[selections.length - 1].hour + 1)}
                      {'  ·  '}{totalHours} 小時
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-right">
                    <p className="text-[#1A1A1A]/40 text-xs">總計</p>
                    <span className="text-2xl font-bold text-[#C4A265]">${totalPrice}</span>
                  </div>
                  <button onClick={handleConfirmBooking} disabled={loading}
                    className="bg-[#1A1A1A] text-[#FFF8F0] px-8 py-3.5 rounded-full font-bold text-base hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50 active:scale-95 shadow-lg">
                    {loading ? '⏳ 處理中...' : '確認預約'}
                  </button>
                  <button onClick={() => { setDismissing(true); setTimeout(() => { setSelections([]); setDismissing(false); }, 300); }} className="text-[#1A1A1A]/30 hover:text-red-500 transition-colors text-xl ml-1">✕</button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {booked && (
          <div className="mt-8 bg-emerald-50 rounded-2xl p-6 text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="font-bold text-lg text-emerald-800">預約成功！</h3>
            <p className="text-emerald-600 text-sm mt-1">
              {selectedCourt?.name} — {dates[dateIdx].getMonth() + 1}月{dates[dateIdx].getDate()}日{' '}
              {fmtHour(selections[0]?.hour)} – {fmtHour((selections[selections.length - 1]?.hour || 0) + 1)}
            </p>
            <button onClick={() => { setBooked(false); setSelections([]); }} className="mt-4 text-sm text-[#C4A265] font-semibold hover:underline">
              再預約
            </button>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
