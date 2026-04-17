'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Court { id: string; name: string; surface: string; indoor: boolean; hourly_rate: number; }
interface Slot { id: string; court_id: string; date: string; hour: number; status: string; price: number | null; }

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7-20
const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dateIdx, setDateIdx] = useState(0);
  const [editRate, setEditRate] = useState<{ id: string; rate: number; name?: string } | null>(null);
  const [editPrice, setEditPrice] = useState<{ slotId: string; price: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });
  const dateStr = dates[dateIdx].toISOString().split('T')[0];

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) { router.push('/admin/'); return; }
      const { data: courtsData } = await supabase.from('courts').select('*').order('id');
      if (courtsData) setCourts(courtsData);
    };
    init();
  }, [router]);

  useEffect(() => { fetchSlots(); }, [dateIdx]);

  const fetchSlots = async () => {
    const { data } = await supabase.from('slots').select('*').eq('date', dateStr);
    if (data) setSlots(data);
  };

  const toggleSlot = async (courtId: string, hour: number, slot: Slot | undefined) => {
    if (!slot) {
      // No row = available → INSERT with status='closed'
      await supabase.from('slots').insert({
        court_id: courtId,
        date: dateStr,
        hour: hour,
        status: 'closed',
      });
    } else if (slot.status === 'closed') {
      // Row exists with status='closed' → DELETE row
      await supabase.from('slots').delete().eq('id', slot.id);
    }
    fetchSlots();
  };

  const openAll = async (courtId: string) => {
    setLoading(true);
    // DELETE all closed rows for that court/date
    await supabase.from('slots').delete().eq('court_id', courtId).eq('date', dateStr).eq('status', 'closed');
    await fetchSlots(); setLoading(false);
  };

  const closeAll = async (courtId: string) => {
    setLoading(true);
    // INSERT closed rows for all hours that don't have a row
    const existingHours = slots.filter(s => s.court_id === courtId).map(s => s.hour);
    const hoursToClose = HOURS.filter(h => !existingHours.includes(h));
    const closedSlots = hoursToClose.map(h => ({
      court_id: courtId,
      date: dateStr,
      hour: h,
      status: 'closed',
    }));
    if (closedSlots.length > 0) {
      await supabase.from('slots').insert(closedSlots);
    }
    await fetchSlots(); setLoading(false);
  };


  const updateCourtRate = async () => {
    if (!editRate) return;
    const updates: any = { hourly_rate: editRate.rate };
    if (editRate.name) updates.name = editRate.name;
    await supabase.from('courts').update(updates).eq('id', editRate.id);
    setCourts(prev => prev.map(c => c.id === editRate.id ? { ...c, hourly_rate: editRate.rate, name: editRate.name || c.name } : c));
    setEditRate(null);
  };

  const updateSlotPrice = async () => {
    if (!editPrice) return;
    const price = editPrice.price ? parseInt(editPrice.price) : null;
    await supabase.from('slots').update({ price }).eq('id', editPrice.slotId);
    await fetchSlots(); setEditPrice(null);
  };

  const getSlot = (courtId: string, hour: number) => slots.find(s => s.court_id === courtId && s.hour === hour);
  const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

  const cancelBookedSlot = async (slotId: string) => {
    if (!confirm('確定取消此預約？')) return;
    setLoading(true);
    // Delete booking(s) that reference this slot
    await supabase.from('bookings').delete().eq('slot_id', slotId);
    // Delete the slot row
    await supabase.from('slots').delete().eq('id', slotId);
    await fetchSlots();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <nav className="bg-[#1A1A1A] text-[#FFF8F0] px-6 py-3 flex items-center gap-6">
        <span className="font-bold">管理員</span>
        <Link href="/admin/classes/" className="text-sm hover:text-[#C4A265]">課堂</Link>
        <Link href="/admin/courts/" className="text-sm text-[#C4A265]">場地</Link>
        <Link href="/admin/bookings/" className="text-sm hover:text-[#C4A265]">預約</Link>
        <button onClick={() => { supabase.auth.signOut().then(() => router.push('/admin/')); }} className="ml-auto text-sm text-red-400">登出</button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">場地及時段管理</h1>

        {/* Court hourly rates */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-bold text-[#1A1A1A] mb-3">球場預設價格</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {courts.map(c => (
              <div key={c.id} className="bg-[#FFF8F0] p-4 rounded-lg border border-[#1A1A1A]/10">
                {editRate?.id === c.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editRate.name || ''} onChange={e => setEditRate({ ...editRate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm font-bold text-[#1A1A1A]" placeholder="球場名稱" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#1A1A1A]/60">每小時 $</span>
                      <input type="number" value={editRate.rate} onChange={e => setEditRate({ ...editRate, rate: +e.target.value })}
                        className="w-24 px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm font-bold" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={updateCourtRate} className="text-xs bg-[#1A1A1A] text-white px-4 py-1.5 rounded-lg font-semibold">儲存</button>
                      <button onClick={() => setEditRate(null)} className="text-xs text-red-500 font-semibold">取消</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditRate({ id: c.id, rate: c.hourly_rate, name: c.name })} className="w-full text-left">
                    <p className="font-bold text-[#1A1A1A] text-base">{c.name}</p>
                    <p className="text-[#C4A265] font-bold text-lg">${c.hourly_rate}<span className="text-xs text-[#1A1A1A]/40 font-normal"> /小時</span></p>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Date selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {dates.map((d, i) => (
            <button key={i} onClick={() => setDateIdx(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                dateIdx === i ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/10'
              }`}>
              {d.getMonth() + 1}/{d.getDate()} 星期{DAY_NAMES[d.getDay()]}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {courts.map(c => (
            <div key={c.id} className="flex gap-1">
              <button onClick={() => openAll(c.id)} disabled={loading}
                className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-200 disabled:opacity-50">
                開放 {c.name} 全部
              </button>
              <button onClick={() => closeAll(c.id)} disabled={loading}
                className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50">
                關閉 {c.name} 全部
              </button>
            </div>
          ))}
        </div>

        {/* Slots grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left text-sm text-[#1A1A1A]/50">時間</th>
                {courts.map(c => <th key={c.id} className="p-3 text-center text-sm font-bold">{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h => (
                <tr key={h} className="border-b border-[#1A1A1A]/5">
                  <td className="p-3 text-sm text-[#1A1A1A]/60">{fmtHour(h)}</td>
                  {courts.map(c => {
                    const slot = getSlot(c.id, h);
                    const isBooked = slot?.status === 'booked';
                    const isClosed = slot?.status === 'closed';
                    const isAvailable = !slot; // No row = available
                    const price = slot?.price ?? c.hourly_rate;
                    return (
                      <td key={c.id} className="p-1.5 text-center">
                        {isBooked ? (
                          <div className="flex flex-col gap-1">
                            <div className="bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold">已預訂</div>
                            <button onClick={() => slot && cancelBookedSlot(slot.id)} disabled={loading}
                              className="text-[10px] text-red-500 hover:text-red-700 font-semibold disabled:opacity-50">
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <button onClick={() => toggleSlot(c.id, h, slot)} disabled={loading}
                              className={`py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                                isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30 hover:bg-[#1A1A1A]/10'
                              }`}>
                              {isAvailable ? `$${price} ✓` : '關閉'}
                            </button>
                            {isAvailable && (
                              editPrice?.slotId === `${c.id}-${h}` ? (
                                <div className="flex gap-1">
                                  <input type="number" value={editPrice.price} onChange={e => setEditPrice({ ...editPrice, price: e.target.value })}
                                    className="w-16 px-1 py-0.5 border rounded text-xs" placeholder={`${c.hourly_rate}`} />
                                  <button onClick={updateSlotPrice} className="text-xs text-[#C4A265]">✓</button>
                                  <button onClick={() => setEditPrice(null)} className="text-xs text-red-500">✗</button>
                                </div>
                              ) : (
                                <button onClick={() => setEditPrice({ slotId: `${c.id}-${h}`, price: '' })}
                                  className="text-[10px] text-[#1A1A1A]/30 hover:text-[#C4A265]">改價</button>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
