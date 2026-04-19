'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useClub } from '@/lib/club';
import type { Court, Slot, Visibility, CourtPricingRule, PricingDayType } from '@/lib/types';
import { DAY_TYPE_LABELS } from '@/lib/pricing';

const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

type EditRate = {
  id: string;
  rate: number;
  name?: string;
  location?: string;
  address?: string;
  description?: string;
  facilities?: string;
  indoor?: boolean;
  visibility?: Visibility;
  image_url?: string;
};

export default function ClubAdminCourtsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { club } = useClub(slug);

  const [courts, setCourts] = useState<Court[]>([]);
  const [opHours, setOpHours] = useState({ open: 7, close: 23 });
  const HOURS = Array.from({ length: opHours.close - opHours.open }, (_, i) => i + opHours.open);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dateIdx, setDateIdx] = useState(0);
  const [weekPage, setWeekPage] = useState(0);
  const [mobileCourt, setMobileCourt] = useState(0);
  const [editRate, setEditRate] = useState<EditRate | null>(null);
  const [showNewCourt, setShowNewCourt] = useState(false);
  const [newCourt, setNewCourt] = useState({ name: '', surface: 'hard', indoor: false, hourly_rate: 200 });
  const [pricingRules, setPricingRules] = useState<CourtPricingRule[]>([]);
  const [showAddRule, setShowAddRule] = useState<string | null>(null); // court_id
  const [newRule, setNewRule] = useState({ day_type: 'all' as PricingDayType, hour_start: 7, hour_end: 23, price: 200, label: '' });
  const [editPrice, setEditPrice] = useState<{ slotId: string; price: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const hk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
    const d = new Date(hk); d.setDate(d.getDate() + i); return d;
  });
  const dateStr = dates[dateIdx].toISOString().split('T')[0];

  useEffect(() => {
    if (!club) return;
    supabase.from('courts').select('*').eq('club_id', club.id).order('id').then(({ data }) => {
      if (data) setCourts(data as Court[]);
    });
    supabase.from('court_pricing_rules').select('*').eq('club_id', club.id)
      .order('court_id').order('hour_start').then(({ data }) => {
        if (data) setPricingRules(data as CourtPricingRule[]);
      });
    supabase.from('settings').select('*').eq('club_id', club.id).then(({ data }) => {
      if (data) {
        const open = data.find((s: any) => s.key === 'open_hour');
        const close = data.find((s: any) => s.key === 'close_hour');
        if (open && close) setOpHours({ open: parseInt(open.value), close: parseInt(close.value) });
      }
    });
  }, [club]);

  useEffect(() => { if (club) fetchSlots(); }, [dateIdx, club]);

  const fetchSlots = async () => {
    if (!club) return;
    const { data } = await supabase.from('slots').select('*').eq('club_id', club.id).eq('date', dateStr);
    if (data) setSlots(data as Slot[]);
  };

  const createCourt = async () => {
    if (!club || !newCourt.name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('courts').insert({
      club_id: club.id,
      name: newCourt.name.trim(),
      surface: newCourt.surface,
      indoor: newCourt.indoor,
      hourly_rate: newCourt.hourly_rate,
    });
    if (!error) {
      const { data } = await supabase.from('courts').select('*').eq('club_id', club.id).order('id');
      if (data) setCourts(data as Court[]);
      setNewCourt({ name: '', surface: 'hard', indoor: false, hourly_rate: 200 });
      setShowNewCourt(false);
    }
    setLoading(false);
  };

  const deleteCourt = async (courtId: string, courtName: string) => {
    if (!confirm(`確定刪除「${courtName}」？此操作不可撤銷。`)) return;
    setLoading(true);
    await supabase.from('courts').delete().eq('id', courtId);
    setCourts(prev => prev.filter(c => c.id !== courtId));
    setLoading(false);
  };

  const addPricingRule = async (courtId: string) => {
    if (!club) return;
    const { data } = await supabase.from('court_pricing_rules').insert({
      club_id: club.id,
      court_id: courtId,
      label: newRule.label || `${DAY_TYPE_LABELS[newRule.day_type]} ${newRule.hour_start}:00-${newRule.hour_end}:00`,
      day_type: newRule.day_type,
      hour_start: newRule.hour_start,
      hour_end: newRule.hour_end,
      price: newRule.price,
      priority: 0,
    }).select().single();
    if (data) {
      setPricingRules(prev => [...prev, data as CourtPricingRule]);
      setShowAddRule(null);
      setNewRule({ day_type: 'all', hour_start: 7, hour_end: 23, price: 200, label: '' });
    }
  };

  const deletePricingRule = async (id: string) => {
    await supabase.from('court_pricing_rules').delete().eq('id', id);
    setPricingRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleSlot = async (courtId: string, hour: number, slot: Slot | undefined) => {
    if (!club) return;
    if (!slot) {
      await supabase.from('slots').insert({ club_id: club.id, court_id: courtId, date: dateStr, hour, status: 'closed' });
    } else if (slot.status === 'closed') {
      await supabase.from('slots').delete().eq('id', slot.id);
    }
    fetchSlots();
  };

  const openAll = async (courtId: string) => {
    if (!club) return;
    setLoading(true);
    await supabase.from('slots').delete().eq('court_id', courtId).eq('date', dateStr).eq('status', 'closed');
    await fetchSlots(); setLoading(false);
  };

  const closeAll = async (courtId: string) => {
    if (!club) return;
    setLoading(true);
    const existingHours = slots.filter(s => s.court_id === courtId).map(s => s.hour);
    const hoursToClose = HOURS.filter(h => !existingHours.includes(h));
    const closedSlots = hoursToClose.map(h => ({ club_id: club.id, court_id: courtId, date: dateStr, hour: h, status: 'closed' }));
    if (closedSlots.length > 0) await supabase.from('slots').insert(closedSlots);
    await fetchSlots(); setLoading(false);
  };

  const updateCourtRate = async () => {
    if (!editRate) return;
    const updates: any = {
      hourly_rate: editRate.rate,
      name: editRate.name,
      location: editRate.location || '',
      address: editRate.address || '',
      description: editRate.description || '',
      facilities: editRate.facilities || '',
      indoor: editRate.indoor || false,
      visibility: editRate.visibility || 'public',
      image_url: editRate.image_url || null,
    };
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

  const cancelBookedSlot = async (slotId: string) => {
    if (!confirm('確定取消此預約？')) return;
    setLoading(true);
    await supabase.from('bookings').delete().eq('slot_id', slotId);
    await supabase.from('slots').delete().eq('id', slotId);
    await fetchSlots(); setLoading(false);
  };

  const updateSetting = async (key: string, value: string) => {
    if (!club) return;
    const { data } = await supabase.from('settings').select('id').eq('club_id', club.id).eq('key', key).maybeSingle();
    if (data) {
      await supabase.from('settings').update({ value }).eq('id', data.id);
    } else {
      await supabase.from('settings').insert({ club_id: club.id, key, value });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">場地及時段管理</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setShowNewCourt(true)}
            className="px-4 py-2 bg-[#C4A265] text-white rounded-xl text-sm font-semibold hover:bg-[#b08d4f] transition-colors">
            + 新增球場
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-4 py-2">
          <span className="text-sm text-[#1A1A1A]/60">開放時間</span>
          <select value={opHours.open} onChange={(e) => {
            const v = +e.target.value; setOpHours(p => ({ ...p, open: v })); updateSetting('open_hour', String(v));
          }} className="px-2 py-1 border rounded text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 5).map(h => <option key={h} value={h}>{h}:00</option>)}
          </select>
          <span className="text-sm">~</span>
          <select value={opHours.close} onChange={(e) => {
            const v = +e.target.value; setOpHours(p => ({ ...p, close: v })); updateSetting('close_hour', String(v));
          }} className="px-2 py-1 border rounded text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 13).map(h => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
      </div>

      {/* New Court Modal */}
      {showNewCourt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCourt(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">新增球場</h2>
            <div className="space-y-3">
              <input type="text" placeholder="球場名稱（例：Court 1）" value={newCourt.name}
                onChange={e => setNewCourt(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" autoFocus />
              <select value={newCourt.surface} onChange={e => setNewCourt(p => ({ ...p, surface: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="hard">硬地</option>
                <option value="clay">泥地</option>
                <option value="grass">草地</option>
                <option value="carpet">地毯</option>
              </select>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newCourt.indoor}
                    onChange={e => setNewCourt(p => ({ ...p, indoor: e.target.checked }))} />
                  室內
                </label>
                <label className="flex items-center gap-2 text-sm">
                  每小時 $
                  <input type="number" value={newCourt.hourly_rate}
                    onChange={e => setNewCourt(p => ({ ...p, hourly_rate: +e.target.value }))}
                    className="w-20 px-2 py-1 border rounded text-sm" />
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={createCourt} disabled={loading || !newCourt.name.trim()}
                  className="flex-1 px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm font-semibold hover:bg-[#b08d4f] disabled:opacity-50">
                  建立
                </button>
                <button onClick={() => setShowNewCourt(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-bold text-[#1A1A1A] mb-3">球場預設價格</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {courts.map(c => (
            <div key={c.id} className="bg-[#FFF8F0] p-4 rounded-lg border border-[#1A1A1A]/10">
              {editRate?.id === c.id ? (
                <div className="space-y-2">
                  <input type="text" value={editRate.name || ''} onChange={e => setEditRate({ ...editRate, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-sm bg-white" placeholder="球場名稱" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#1A1A1A]/50 block mb-1">預設價格 ($/小時)</label>
                      <input type="number" value={editRate.rate} onChange={e => setEditRate({ ...editRate, rate: +e.target.value })}
                        className="w-full px-3 py-2 border rounded text-sm bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#1A1A1A]/50 block mb-1">可見性</label>
                      <select value={editRate.visibility || 'public'} onChange={e => setEditRate({ ...editRate, visibility: e.target.value as Visibility })}
                        className="w-full px-3 py-2 border rounded text-sm bg-white">
                        <option value="public">公開</option>
                        <option value="members">會員</option>
                        <option value="private">私人</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#1A1A1A]/50 block mb-1">地區</label>
                    <input type="text" value={editRate.location || ''} onChange={e => setEditRate({ ...editRate, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm bg-white" placeholder="例：油尖旺" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#1A1A1A]/50 block mb-1">地址</label>
                    <input type="text" value={editRate.address || ''} onChange={e => setEditRate({ ...editRate, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm bg-white" placeholder="完整地址" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#1A1A1A]/50 block mb-1">場地描述</label>
                    <textarea value={editRate.description || ''} onChange={e => setEditRate({ ...editRate, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm bg-white resize-none" rows={2} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#1A1A1A]/50 block mb-1">設施</label>
                    <input type="text" value={editRate.facilities || ''} onChange={e => setEditRate({ ...editRate, facilities: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm bg-white" placeholder="例：燈光、更衣室" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editRate.indoor || false} onChange={e => setEditRate({ ...editRate, indoor: e.target.checked })} />
                    室內場地
                  </label>
                  <input type="url" value={editRate.image_url || ''} onChange={e => setEditRate({ ...editRate, image_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-sm bg-white" placeholder="球場圖片 URL" />
                  {editRate.image_url && <img src={editRate.image_url} alt="preview" className="w-full h-24 object-cover rounded" />}
                  <div className="flex gap-2">
                    <button onClick={updateCourtRate} className="bg-[#1A1A1A] text-white px-4 py-2 rounded text-xs font-semibold">儲存</button>
                    <button onClick={() => setEditRate(null)} className="text-xs text-[#1A1A1A]/50 px-2">取消</button>
                  </div>
                  {/* Pricing Rules Section */}
                  <div className="mt-3 pt-3 border-t border-[#1A1A1A]/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[#1A1A1A]/60">定價規則</p>
                      <button onClick={() => setShowAddRule(showAddRule === c.id ? null : c.id)}
                        className="text-xs text-[#C4A265] hover:underline">+ 新增</button>
                    </div>
                    {pricingRules.filter(r => r.court_id === c.id).length === 0 && (
                      <p className="text-xs text-[#1A1A1A]/30">未設定，使用預設價格</p>
                    )}
                    {pricingRules.filter(r => r.court_id === c.id).map(r => (
                      <div key={r.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-[#1A1A1A]/70">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-[#C4A265]/10 text-[#C4A265] font-semibold mr-1">
                            {DAY_TYPE_LABELS[r.day_type as PricingDayType]}
                          </span>
                          {r.hour_start}:00-{r.hour_end}:00
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-[#C4A265]">${r.price}</span>
                          <button onClick={() => deletePricingRule(r.id)} className="text-red-400 hover:text-red-600">×</button>
                        </span>
                      </div>
                    ))}
                    {showAddRule === c.id && (
                      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRule(null)}>
                        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">新增定價規則 — {c.name}</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-semibold text-[#1A1A1A]/60 block mb-1">標籤（可選）</label>
                              <input type="text" placeholder="例：繁忙時段" value={newRule.label}
                                onChange={e => setNewRule(p => ({ ...p, label: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-[#1A1A1A]/60 block mb-1">適用日子</label>
                              <select value={newRule.day_type} onChange={e => setNewRule(p => ({ ...p, day_type: e.target.value as PricingDayType }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm">
                                {Object.entries(DAY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-[#1A1A1A]/60 block mb-1">時段</label>
                              <div className="flex items-center gap-3">
                                <select value={newRule.hour_start} onChange={e => setNewRule(p => ({ ...p, hour_start: +e.target.value }))}
                                  className="flex-1 px-3 py-2 border rounded-lg text-sm">
                                  {Array.from({ length: 18 }, (_, i) => i + 6).map(h => <option key={h} value={h}>{h}:00</option>)}
                                </select>
                                <span className="text-sm text-[#1A1A1A]/40">至</span>
                                <select value={newRule.hour_end} onChange={e => setNewRule(p => ({ ...p, hour_end: +e.target.value }))}
                                  className="flex-1 px-3 py-2 border rounded-lg text-sm">
                                  {Array.from({ length: 18 }, (_, i) => i + 6).filter(h => h > newRule.hour_start).map(h => <option key={h} value={h}>{h}:00</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-[#1A1A1A]/60 block mb-1">每小時價格 (HKD)</label>
                              <input type="number" value={newRule.price} onChange={e => setNewRule(p => ({ ...p, price: +e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => addPricingRule(c.id)}
                                className="flex-1 px-4 py-2.5 bg-[#C4A265] text-white rounded-xl text-sm font-semibold hover:bg-[#b08d4f]">建立規則</button>
                              <button onClick={() => setShowAddRule(null)}
                                className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">取消</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                <button onClick={() => setEditRate({ id: c.id, rate: c.hourly_rate, name: c.name, location: c.location || '', address: c.address || '', description: c.description || '', facilities: c.facilities || '', indoor: c.indoor || false, visibility: (c.visibility || 'public') as Visibility, image_url: (c as any).image_url || '' })} className="w-full text-left">
                  <p className="font-bold text-[#1A1A1A] text-base">{c.name}</p>
                  <p className="text-[#C4A265] font-bold text-lg">${c.hourly_rate}<span className="text-xs text-[#1A1A1A]/40 font-normal">/小時</span></p>
                  <p className="text-xs text-[#1A1A1A]/50 mt-1">
                    {(c.visibility || 'public') === 'public' ? '公開' : (c.visibility || 'public') === 'members' ? '僅會員' : '私人'}
                    {c.indoor ? ' · 室內' : ' · 室外'}
                  </p>
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteCourt(c.id, c.name); }}
                  className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors">
                  刪除球場
                </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekPage(0)} disabled={weekPage === 0}
          className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-20 text-sm">‹</button>
        <div className="flex gap-1.5 flex-1 justify-center">
          {dates.slice(weekPage * 7, weekPage * 7 + 7).map((d, i) => {
            const idx = weekPage * 7 + i;
            return (
              <button key={idx} onClick={() => setDateIdx(idx)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[64px] text-xs ${
                  dateIdx === idx ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/10'
                }`}>
                <span>星期{DAY_NAMES[d.getDay()]}</span>
                <span className="text-base font-bold">{d.getDate()}</span>
                <span className="text-[10px]">{d.getMonth() + 1}月</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setWeekPage(1)} disabled={weekPage === 1}
          className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-20 text-sm">›</button>
      </div>

      {/* Mobile view */}
      <div className="md:hidden mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {courts.map((c, i) => (
            <button key={c.id} onClick={() => setMobileCourt(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${mobileCourt === i ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A]'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => courts[mobileCourt] && openAll(courts[mobileCourt].id)} disabled={loading}
            className="flex-1 text-sm bg-emerald-100 text-emerald-700 py-2 rounded-xl font-semibold">開放全部</button>
          <button onClick={() => courts[mobileCourt] && closeAll(courts[mobileCourt].id)} disabled={loading}
            className="flex-1 text-sm bg-red-100 text-red-700 py-2 rounded-xl font-semibold">關閉全部</button>
        </div>
      </div>

      <div className="md:hidden bg-white rounded-xl shadow-sm">
        {courts[mobileCourt] && (
          <table className="w-full">
            <thead><tr className="border-b"><th className="p-3 text-left text-sm text-[#1A1A1A]/50">時間</th><th className="p-3 text-center text-sm font-bold">{courts[mobileCourt].name}</th></tr></thead>
            <tbody>
              {HOURS.map(h => {
                const court = courts[mobileCourt];
                const slot = getSlot(court.id, h);
                const isBooked = slot?.status === 'booked';
                const isAvailable = !slot;
                const price = slot?.price ?? court.hourly_rate;
                return (
                  <tr key={h} className="border-b border-[#1A1A1A]/5">
                    <td className="p-3 text-sm text-[#1A1A1A]/60 w-20">{fmtHour(h)}</td>
                    <td className="p-2 text-center">
                      {isBooked ? (
                        <div className="space-y-1">
                          <span className="inline-block w-full py-2 bg-[#C4A265]/10 text-[#C4A265] rounded-lg text-sm font-semibold">已預約</span>
                          <button onClick={() => slot && cancelBookedSlot(slot.id)} className="text-xs text-red-500 font-semibold">取消</button>
                        </div>
                      ) : (
                        <button onClick={() => toggleSlot(court.id, h, slot)}
                          className={`w-full py-2 rounded-lg text-sm font-semibold ${isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30'}`}>
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

      {/* Desktop view */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left text-sm text-[#1A1A1A]/50">時間</th>
              {courts.map(c => (
                <th key={c.id} className="p-3 text-center">
                  <div className="text-sm font-bold text-[#1A1A1A]">{c.name}</div>
                  <div className="flex gap-1 justify-center mt-1.5 w-full">
                    <button onClick={() => openAll(c.id)} disabled={loading} className="flex-1 text-xs bg-emerald-100 text-emerald-700 py-1.5 rounded font-semibold disabled:opacity-50">開放</button>
                    <button onClick={() => closeAll(c.id)} disabled={loading} className="flex-1 text-xs bg-red-100 text-red-700 py-1.5 rounded font-semibold disabled:opacity-50">關閉</button>
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
                  const isAvailable = !slot;
                  const price = slot?.price ?? c.hourly_rate;
                  return (
                    <td key={c.id} className="p-1.5 text-center">
                      {isBooked ? (
                        <div className="flex flex-col gap-1">
                          <div className="bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold">已預訂</div>
                          <button onClick={() => slot && cancelBookedSlot(slot.id)} disabled={loading} className="text-[10px] text-red-500 font-semibold disabled:opacity-50">取消</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => toggleSlot(c.id, h, slot)} disabled={loading}
                            className={`py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30'}`}>
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
                              <button onClick={() => setEditPrice({ slotId: `${c.id}-${h}`, price: '' })} className="text-[10px] text-[#1A1A1A]/30 hover:text-[#C4A265]">改價</button>
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
