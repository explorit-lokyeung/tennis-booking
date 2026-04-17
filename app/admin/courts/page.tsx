'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Court { id: string; name: string; surface: string; indoor: boolean; hourly_rate: number; location: string; address: string; description: string; facilities: string; surface_type: string; }
interface Slot { id: string; court_id: string; date: string; hour: number; status: string; price: number | null; }

const ALL_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6AM-10PM for admin dropdown
const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [opHours, setOpHours] = useState({ open: 7, close: 23 });
  const HOURS = Array.from({ length: opHours.close - opHours.open }, (_, i) => i + opHours.open);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dateIdx, setDateIdx] = useState(0);
  const [weekPage, setWeekPage] = useState(0);
  const [mobileCourt, setMobileCourt] = useState(0);
    const [editRate, setEditRate] = useState<{ id: string; rate: number; name?: string; location?: string; address?: string; description?: string; facilities?: string; indoor?: boolean } | null>(null);
  const [editPrice, setEditPrice] = useState<{ slotId: string; price: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const dates = Array.from({ length: 14 }, (_, i) => {
    const hk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
    const d = new Date(hk); d.setDate(d.getDate() + i); return d;
  });
  const dateStr = dates[dateIdx].toISOString().split('T')[0];

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      await new Promise(r => setTimeout(r, 100));
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { router.push('/admin/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
      if (cancelled) return;
      if (!profile?.is_admin) { router.push('/admin/'); return; }
      const { data: courtsData } = await supabase.from('courts').select('*').order('id');
      if (courtsData) setCourts(courtsData);
    };
    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { fetchSlots(); }, [dateIdx]);

  // Fetch operating hours
  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      if (data) {
        const open = data.find((s: any) => s.key === 'open_hour');
        const close = data.find((s: any) => s.key === 'close_hour');
        if (open && close) setOpHours({ open: parseInt(open.value), close: parseInt(close.value) });
      }
    });
  }, []);

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
    updates.location = editRate.location || '';
    updates.address = editRate.address || '';
    updates.description = editRate.description || '';
    updates.facilities = editRate.facilities || '';
    updates.indoor = editRate.indoor || false;
    await supabase.from('courts').update(updates).eq('id', editRate.id);
    setCourts(prev => prev.map(c => c.id === editRate.id ? { ...c, ...updates } : c));
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
    <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">場地及時段管理</h1>
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-4 py-2">
            <span className="text-sm text-[#1A1A1A]/60">開放時間</span>
            <select value={opHours.open} onChange={async (e) => {
              const v = +e.target.value;
              setOpHours(p => ({ ...p, open: v }));
              await supabase.from('settings').update({ value: String(v) }).eq('key', 'open_hour');
            }} className="px-2 py-1 border rounded text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 5).map(h => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
            <span className="text-sm">~</span>
            <select value={opHours.close} onChange={async (e) => {
              const v = +e.target.value;
              setOpHours(p => ({ ...p, close: v }));
              await supabase.from('settings').update({ value: String(v) }).eq('key', 'close_hour');
            }} className="px-2 py-1 border rounded text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 13).map(h => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
          </div>
        </div>

        {/* Court hourly rates */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-bold text-[#1A1A1A] mb-3">球場預設價格</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {courts.map(c => (
              <div key={c.id} className="bg-[#FFF8F0] p-4 rounded-lg border border-[#1A1A1A]/10">
                {editRate?.id === c.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={editRate.name || ''} onChange={e => setEditRate({ ...editRate, name: e.target.value })}
                        className="px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm font-bold text-[#1A1A1A] bg-white" placeholder="球場名稱" />
                      <div className="flex items-center gap-1 px-3 py-2 border border-[#1A1A1A]/20 rounded-lg bg-white">
                        <span className="text-sm text-[#1A1A1A]/40">$</span>
                        <input type="number" value={editRate.rate} onChange={e => setEditRate({ ...editRate, rate: +e.target.value })}
                          className="w-full text-sm font-bold text-[#1A1A1A] outline-none bg-transparent" />
                        <span className="text-xs text-[#1A1A1A]/40 whitespace-nowrap">/小時</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={editRate.location || ''} onChange={e => setEditRate({ ...editRate, location: e.target.value })}
                        className="px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm text-[#1A1A1A] bg-white" placeholder="📍 地區" />
                      <div className="flex items-center gap-2 px-3 py-2 border border-[#1A1A1A]/20 rounded-lg bg-white">
                        <label className="flex items-center gap-1.5 text-sm text-[#1A1A1A] cursor-pointer">
                          <input type="checkbox" checked={editRate.indoor || false} onChange={e => setEditRate({ ...editRate, indoor: e.target.checked })}
                            className="w-4 h-4 rounded accent-[#C4A265]" />
                          室內場地
                        </label>
                      </div>
                    </div>
                    <input type="text" value={editRate.address || ''} onChange={e => setEditRate({ ...editRate, address: e.target.value })}
                      className="w-full px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm text-[#1A1A1A] bg-white" placeholder="地址" />
                    <textarea value={editRate.description || ''} onChange={e => setEditRate({ ...editRate, description: e.target.value })}
                      className="w-full px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm text-[#1A1A1A] bg-white resize-none" rows={2} placeholder="場地描述" />
                    <input type="text" value={editRate.facilities || ''} onChange={e => setEditRate({ ...editRate, facilities: e.target.value })}
                      className="w-full px-3 py-2 border border-[#1A1A1A]/20 rounded-lg text-sm text-[#1A1A1A] bg-white" placeholder="設施（燈光, 更衣室, 停車場）" />
                    <div className="flex gap-2 pt-1">
                      <button onClick={updateCourtRate} className="text-xs bg-[#1A1A1A] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[#1A1A1A]/80 transition-all">儲存</button>
                      <button onClick={() => setEditRate(null)} className="text-xs text-[#1A1A1A]/40 hover:text-red-500 font-semibold px-3 py-2 transition-colors">取消</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditRate({ id: c.id, rate: c.hourly_rate, name: c.name, location: c.location || '', address: c.address || '', description: c.description || '', facilities: c.facilities || '', indoor: c.indoor || false })} className="w-full text-left">
                    <p className="font-bold text-[#1A1A1A] text-base">{c.name}</p>
                    <p className="text-[#C4A265] font-bold text-lg">${c.hourly_rate}<span className="text-xs text-[#1A1A1A]/40 font-normal"> /小時</span></p>
                    {c.location && <p className="text-xs text-[#1A1A1A]/50 mt-1">📍 {c.location}{c.address ? ` · ${c.address}` : ''}</p>}
                    <p className="text-xs text-[#1A1A1A]/40">{c.surface || 'Hard'} · {c.indoor ? '室內' : '室外'}{c.facilities ? ` · ${c.facilities}` : ''}</p>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Date selector - 7 tabs per page */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setWeekPage(0)} disabled={weekPage === 0}
            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all disabled:opacity-20 shrink-0 text-sm">
            ‹
          </button>
          <div className="flex gap-1.5 flex-1 justify-center">
            {dates.slice(weekPage * 7, weekPage * 7 + 7).map((d, i) => {
              const idx = weekPage * 7 + i;
              return (
                <button key={idx} onClick={() => setDateIdx(idx)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[64px] transition-all text-xs ${
                    dateIdx === idx
                      ? 'bg-[#1A1A1A] text-[#FFF8F0]'
                      : 'bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/10'
                  }`}>
                  <span className="font-medium">星期{DAY_NAMES[d.getDay()]}</span>
                  <span className="text-base font-bold">{d.getDate()}</span>
                  <span className="text-[10px]">{d.getMonth() + 1}月</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setWeekPage(1)} disabled={weekPage === 1}
            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all disabled:opacity-20 shrink-0 text-sm">
            ›
          </button>
        </div>

        {/* Mobile court selector */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {courts.map((c, i) => (
              <button key={c.id} onClick={() => setMobileCourt(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  mobileCourt === i ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A]'
                }`}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => courts[mobileCourt] && openAll(courts[mobileCourt].id)} disabled={loading}
              className="flex-1 text-sm bg-emerald-100 text-emerald-700 py-2 rounded-xl font-semibold hover:bg-emerald-200">
              開放全部
            </button>
            <button onClick={() => courts[mobileCourt] && closeAll(courts[mobileCourt].id)} disabled={loading}
              className="flex-1 text-sm bg-red-100 text-red-700 py-2 rounded-xl font-semibold hover:bg-red-200">
              關閉全部
            </button>
          </div>
        </div>

        {/* Mobile: single court view */}
        <div className="md:hidden bg-white rounded-xl shadow-sm">
          {courts[mobileCourt] && (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-sm text-[#1A1A1A]/50">時間</th>
                  <th className="p-3 text-center text-sm font-bold">{courts[mobileCourt].name}</th>
                </tr>
              </thead>
              <tbody>
                {HOURS.map(h => {
                  const court = courts[mobileCourt];
                  const slot = getSlot(court.id, h);
                  const isBooked = slot?.status === 'booked';
                  const isClosed = slot?.status === 'closed';
                  const isAvailable = !slot;
                  const price = slot?.price ?? court.hourly_rate;
                  return (
                    <tr key={h} className="border-b border-[#1A1A1A]/5">
                      <td className="p-3 text-sm text-[#1A1A1A]/60 w-20">{fmtHour(h)}</td>
                      <td className="p-2 text-center">
                        {isBooked ? (
                          <span className="inline-block w-full py-2 bg-[#C4A265]/10 text-[#C4A265] rounded-lg text-sm font-semibold">已預約</span>
                        ) : (
                          <button onClick={() => toggleSlot(court.id, h, slot)} className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                            isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30 hover:bg-[#1A1A1A]/10'
                          }`}>
                            {isAvailable ? `$${price} ✓` : '關閉'}
                          </button>
                        )}

                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left text-sm text-[#1A1A1A]/50">時間</th>
                {courts.map(c => (
                  <th key={c.id} className="p-3 text-center">
                    <div className="text-sm font-bold text-[#1A1A1A]">{c.name}</div>
                    <div className="flex gap-1 justify-center mt-1.5 w-full">
                      <button onClick={() => openAll(c.id)} disabled={loading}
                        className="flex-1 text-xs bg-emerald-100 text-emerald-700 py-1.5 rounded font-semibold hover:bg-emerald-200 disabled:opacity-50">
                        開放
                      </button>
                      <button onClick={() => closeAll(c.id)} disabled={loading}
                        className="flex-1 text-xs bg-red-100 text-red-700 py-1.5 rounded font-semibold hover:bg-red-200 disabled:opacity-50">
                        關閉
                      </button>
                    </div>
                  </th>
                ))}
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
  );
}
