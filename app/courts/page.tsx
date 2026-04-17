'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import SuccessAnimation from '@/components/SuccessAnimation';
import { supabase } from '@/lib/supabase';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';

interface Court {
  id: string;
  name: string;
  surface: string;
  indoor: boolean;
  hourly_rate: number;
  description: string;
  location: string;
  address: string;
  facilities: string;
  surface_type: string;
}

interface Slot {
  id: string;
  court_id: string;
  date: string;
  hour: number;
  status: 'booked' | 'closed';
  price?: number | null;
  booked_by: string | null;
}

type Selection = { courtId: string; hour: number };

const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function fmtHour(h: number) {
  return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
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
  const router = useRouter();
  const { user } = useAuth();

  // Use HK timezone for date generation
  const nowHK = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
  const currentHKHour = nowHK.getHours();

  // Day 7 (index 6): bookable only after 9AM HKT on the day it appears (i.e. 6 days before)
  // Day 8 (index 7): always view-only (preview)
  const isViewOnly = (idx: number) => {
    if (idx === 7) return true;
    if (idx === 6 && currentHKHour < 9) return true;
    return false;
  };

  const dates = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(nowHK);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Fetch operating hours
  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      if (data) {
        const open = data.find((s: any) => s.key === 'open_hour');
        const close = data.find((s: any) => s.key === 'close_hour');
        if (open && close) setOperatingHours({ open: parseInt(open.value), close: parseInt(close.value) });
      }
    });
  }, []);

  // Fetch courts
  useEffect(() => {
    const fetchCourts = async () => {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('id');

      if (data && !error) {
        setCourts(data);
      }
    };
    fetchCourts();
  }, []);

  // Fetch slots for selected date
  useEffect(() => {
    const selectedDate = dates[dateIdx];
    const dateStr = selectedDate.toISOString().split('T')[0];

    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .eq('date', dateStr);

      if (data && !error) {
        setSlots(data);
      }
    };
    fetchSlots();

    // Poll for slot updates every 5 seconds
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('slots')
        .select('*')
        .eq('date', dateStr);
      if (data) setSlots(data);
    }, 2000);

    return () => clearInterval(interval);
  }, [dateIdx]);

  const getSlotForCourtAndHour = (courtId: string, hour: number) => {
    return slots.find((s) => s.court_id === courtId && s.hour === hour);
  };

  const isSelected = (courtId: string, hour: number) =>
    selections.some((s) => s.courtId === courtId && s.hour === hour);

  const handleSlotClick = (courtId: string, hour: number) => {
    if (isViewOnly(dateIdx)) return; // view-only day
    if (dateIdx === 0 && hour <= currentHKHour) return; // past hour today
    if (isViewOnly(dateIdx)) return; // view-only day
    if (isSelected(courtId, hour)) {
      setSelections((prev) => prev.filter((s) => !(s.courtId === courtId && s.hour === hour)));
      return;
    }

    if (selections.length === 0) {
      setSelections([{ courtId, hour }]);
      return;
    }

    // Must be same court
    if (selections[0].courtId !== courtId) {
      setSelections([{ courtId, hour }]);
      return;
    }

    // Max 2 sessions, must be consecutive
    if (selections.length >= 2) {
      setSelections([{ courtId, hour }]);
      return;
    }

    const existingHour = selections[0].hour;
    if (Math.abs(hour - existingHour) === 1) {
      // Consecutive — add it (keep sorted)
      const newSels = [...selections, { courtId, hour }].sort((a, b) => a.hour - b.hour);
      setSelections(newSels);
    } else {
      // Not consecutive — start fresh
      setSelections([{ courtId, hour }]);
    }
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      router.push('/login/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedDate = dates[dateIdx];
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Insert new slot rows with status='booked' for each selection
      const slotRows = selections.map(s => ({
        court_id: s.courtId,
        date: dateStr,
        hour: s.hour,
        status: 'booked',
        booked_by: user.id,
      }));

      const { data: insertedSlots, error: slotError } = await supabase
        .from('slots')
        .insert(slotRows)
        .select();

      if (slotError) {
        // Race condition: slot already exists (someone booked it or admin closed it)
        setError('預約失敗，時段可能已被預訂，或你已預約咗同一時間嘅其他場地。');
        setLoading(false);
        return;
      }

      // Insert into bookings table
      const bookingRows = insertedSlots.map((slot, idx) => ({
        user_id: user.id,
        slot_id: slot.id,
        court_id: selections[idx].courtId,
        date: dateStr,
        hour: selections[idx].hour,
      }));
      const { error: bookingError } = await supabase.from('bookings').insert(bookingRows);

      if (bookingError) {
        setError('預約失敗，請稍後再試。');
        setLoading(false);
        return;
      }

      setBooked(true);
      setLoading(false);
    } catch (err) {
      setError('預約失敗，請稍後再試。');
      setLoading(false);
    }
  };

  const selectedCourt = courts.find((c) => c.id === selections[0]?.courtId);
  const totalHours = selections.length;
  const totalPrice = selectedCourt ? selectedCourt.hourly_rate * totalHours : 0;

  return (
    <>{showSuccess && <SuccessAnimation message="預約成功！" />}
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black tracking-tight text-[#1A1A1A] mb-2">球場預約</h1>
        <p className="text-[#1A1A1A]/60 mb-2">選擇日期，揀時段，預約球場。可選擇連續 1-2 個時段。</p>
        <div className="flex items-center gap-4 mb-8 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200"></span> 可預約
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#C4A265]"></span> 已選擇
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#1A1A1A]/5"></span> 已滿
          </span>
        </div>

        {/* Date tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {dates.map((d, i) => {
            const viewOnly = i === 7 || (i === 6 && currentHKHour < 9);
            return (
            <button
              key={i}
              onClick={() => {
                setDateIdx(i);
                setSelections([]);
                setBooked(false);
                setError('');
              }}
              className={`flex flex-col items-center px-4 py-3 rounded-xl min-w-[72px] transition-all ${
                dateIdx === i
                  ? 'bg-[#1A1A1A] text-[#FFF8F0]'
                  : 'bg-white text-[#1A1A1A] hover:bg-[#C4A265]/10'
              }`}
            >
              <span className="text-xs font-medium">星期{DAY_NAMES[d.getDay()]}</span>
              <span className="text-lg font-bold">{d.getDate()}</span>
              <span className="text-xs">{MONTH_NAMES[d.getMonth()]}</span>
              {viewOnly && <span className="text-[8px] text-[#C4A265] mt-0.5">預覽</span>}
            </button>
            );
          })}
        </div>

        {/* Court grid */}
        {courts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-bold text-[#1A1A1A]/60">時間</th>
                  {courts.map((c) => (
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
                {hours.map((h) => (
                  <tr key={h} className="border-t border-[#1A1A1A]/5">
                    <td className="p-3 text-sm font-medium text-[#1A1A1A]/70 whitespace-nowrap">
                      {fmtHour(h)}
                    </td>
                    {courts.map((c) => {
                      const slot = getSlotForCourtAndHour(c.id, h);
                      const avail = !slot; // No row = available
                      const sel = isSelected(c.id, h);
                      const isPast = dateIdx === 0 && h <= currentHKHour;
                      return (
                        <td key={c.id} className="p-1.5">
                          <button
                            disabled={!avail || isViewOnly(dateIdx) || isPast}
                            onClick={() => avail && !isPast && handleSlotClick(c.id, h)}
                            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${(isViewOnly(dateIdx) || isPast) ? 'opacity-40 cursor-default' : ''} ${
                              sel
                                ? 'bg-[#C4A265] text-white ring-2 ring-[#C4A265] ring-offset-2'
                                : avail
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/20 cursor-not-allowed'
                            }`}
                          >
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

        {/* Error message */}
        {error && (
          <div className="mt-8 bg-red-50 rounded-2xl p-4 text-center">
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        )}

        {/* Floating bottom booking bar */}
        {selections.length > 0 && !booked && typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[9999]" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="bg-white border-t border-[#1A1A1A]/10 px-6 py-5 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]" style={{ animation: dismissing ? 'slideDown 0.3s ease-in forwards' : 'slideUp 0.3s ease-out' }}>
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center shrink-0">
                    <span className="text-2xl">🎾</span>
                  </div>
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
                  <button
                    onClick={handleConfirmBooking}
                    disabled={loading}
                    className="bg-[#1A1A1A] text-[#FFF8F0] px-8 py-3.5 rounded-full font-bold text-base hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50 active:scale-95 shadow-lg"
                  >
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
            <p className="text-2xl mb-2">✅</p>
            <h3 className="font-bold text-lg text-emerald-800">預約成功！</h3>
            <p className="text-emerald-600 text-sm mt-1">
              {selectedCourt?.name} — {dates[dateIdx].getMonth() + 1}月{dates[dateIdx].getDate()}日{' '}
              {fmtHour(selections[0]?.hour)} – {fmtHour((selections[selections.length - 1]?.hour || 0) + 1)}
            </p>
            <button
              onClick={() => {
                setBooked(false);
                setSelections([]);
              }}
              className="mt-4 text-sm text-[#C4A265] font-semibold hover:underline"
            >
              再預約
            </button>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
