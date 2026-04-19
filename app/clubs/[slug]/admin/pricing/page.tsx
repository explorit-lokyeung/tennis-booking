'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useClub } from '@/lib/club';
import type { Court, CourtPricingRule, PricingDayType } from '@/lib/types';
import { DAY_TYPE_LABELS } from '@/lib/pricing';

const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 6); // 6-24

export default function PricingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { club } = useClub(slug);

  const [courts, setCourts] = useState<Court[]>([]);
  const [rules, setRules] = useState<CourtPricingRule[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState<{
    day_type: PricingDayType; hour_start: number; hour_end: number; price: number; label: string;
  }>({ day_type: 'all', hour_start: 7, hour_end: 23, price: 200, label: '' });

  useEffect(() => {
    if (!club) return;
    supabase.from('courts').select('*').eq('club_id', club.id).order('name').then(({ data }) => {
      if (data) {
        setCourts(data as Court[]);
        if (data.length > 0 && !selectedCourt) setSelectedCourt(data[0].id);
      }
    });
  }, [club]);

  useEffect(() => {
    if (!club) return;
    supabase.from('court_pricing_rules').select('*').eq('club_id', club.id)
      .order('court_id').order('priority', { ascending: false }).order('hour_start')
      .then(({ data }) => { if (data) setRules(data as CourtPricingRule[]); });
  }, [club]);

  const courtRules = rules.filter(r => r.court_id === selectedCourt);
  const court = courts.find(c => c.id === selectedCourt);

  const addRule = async () => {
    if (!club || !selectedCourt) return;
    const { data, error } = await supabase.from('court_pricing_rules').insert({
      club_id: club.id,
      court_id: selectedCourt,
      label: newRule.label || `${DAY_TYPE_LABELS[newRule.day_type]} ${newRule.hour_start}:00-${newRule.hour_end}:00`,
      day_type: newRule.day_type,
      hour_start: newRule.hour_start,
      hour_end: newRule.hour_end,
      price: newRule.price,
      priority: 0,
    }).select().single();
    if (data) {
      setRules(prev => [...prev, data as CourtPricingRule]);
      setShowAdd(false);
      setNewRule({ day_type: 'all', hour_start: 7, hour_end: 23, price: 200, label: '' });
    }
  };

  const deleteRule = async (id: string) => {
    await supabase.from('court_pricing_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const fmtHour = (h: number) => `${h}:00`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">場地定價管理</h1>

      {courts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-[#1A1A1A]/50">
          請先建立球場
        </div>
      ) : (
        <>
          {/* Court selector */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {courts.map(c => (
              <button key={c.id} onClick={() => setSelectedCourt(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  selectedCourt === c.id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/5 border border-[#1A1A1A]/10'
                }`}>
                {c.name}
              </button>
            ))}
          </div>

          {court && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-lg text-[#1A1A1A]">{court.name}</h2>
                  <p className="text-sm text-[#1A1A1A]/50">預設價格：${court.hourly_rate}/小時（無匹配規則時使用）</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                  className="px-4 py-2 bg-[#C4A265] text-white rounded-xl text-sm font-semibold hover:bg-[#b08d4f]">
                  + 新增定價規則
                </button>
              </div>

              {courtRules.length === 0 ? (
                <div className="text-center py-8 text-[#1A1A1A]/40 text-sm">
                  未有定價規則，所有時段使用預設價格 ${court.hourly_rate}/小時
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1A1A1A]/10 text-left">
                        <th className="py-3 pr-4 font-semibold text-[#1A1A1A]/60">標籤</th>
                        <th className="py-3 pr-4 font-semibold text-[#1A1A1A]/60">日子</th>
                        <th className="py-3 pr-4 font-semibold text-[#1A1A1A]/60">時段</th>
                        <th className="py-3 pr-4 font-semibold text-[#1A1A1A]/60">價格</th>
                        <th className="py-3 font-semibold text-[#1A1A1A]/60"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {courtRules.map(r => (
                        <tr key={r.id} className="border-b border-[#1A1A1A]/5">
                          <td className="py-3 pr-4">{r.label}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#C4A265]/10 text-[#C4A265]">
                              {DAY_TYPE_LABELS[r.day_type as PricingDayType] || r.day_type}
                            </span>
                          </td>
                          <td className="py-3 pr-4">{fmtHour(r.hour_start)} - {fmtHour(r.hour_end)}</td>
                          <td className="py-3 pr-4 font-bold text-[#C4A265]">${r.price}</td>
                          <td className="py-3">
                            <button onClick={() => deleteRule(r.id)}
                              className="text-red-400 hover:text-red-600 text-xs">刪除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pricing preview grid */}
              {courtRules.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#1A1A1A]/10">
                  <h3 className="font-semibold text-sm text-[#1A1A1A]/60 mb-3">價格預覽（本週）</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="p-1 text-left text-[#1A1A1A]/40">時間</th>
                          {['一','二','三','四','五','六','日'].map(d => (
                            <th key={d} className="p-1 text-center text-[#1A1A1A]/40">星期{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 17 }, (_, i) => i + 7).map(hour => (
                          <tr key={hour}>
                            <td className="p-1 text-[#1A1A1A]/50">{hour}:00</td>
                            {[1,2,3,4,5,6,0].map(dow => {
                              const fakeDate = new Date(2026, 0, 5 + dow); // Mon=5 Jan 2026
                              const dayName = (['sun','mon','tue','wed','thu','fri','sat'] as PricingDayType[])[dow];
                              const isWkend = dow === 0 || dow === 6;
                              const match = courtRules
                                .filter(r => hour >= r.hour_start && hour < r.hour_end)
                                .filter(r => r.day_type === 'all' || r.day_type === dayName || (r.day_type === 'weekday' && !isWkend) || (r.day_type === 'weekend' && isWkend))
                                .sort((a, b) => b.priority - a.priority)[0];
                              const price = match ? match.price : court.hourly_rate;
                              const isCustom = !!match;
                              return (
                                <td key={dow} className={`p-1 text-center ${isCustom ? 'bg-[#C4A265]/10 font-semibold text-[#C4A265]' : 'text-[#1A1A1A]/40'}`}>
                                  ${price}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add rule modal */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">新增定價規則</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#1A1A1A]/50 block mb-1">標籤（可選）</label>
                    <input type="text" placeholder="例：繁忙時段" value={newRule.label}
                      onChange={e => setNewRule(p => ({ ...p, label: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-[#1A1A1A]/50 block mb-1">適用日子</label>
                    <select value={newRule.day_type} onChange={e => setNewRule(p => ({ ...p, day_type: e.target.value as PricingDayType }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      {Object.entries(DAY_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#1A1A1A]/50 block mb-1">開始時間</label>
                      <select value={newRule.hour_start} onChange={e => setNewRule(p => ({ ...p, hour_start: +e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm">
                        {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#1A1A1A]/50 block mb-1">結束時間</label>
                      <select value={newRule.hour_end} onChange={e => setNewRule(p => ({ ...p, hour_end: +e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm">
                        {HOUR_OPTIONS.filter(h => h > newRule.hour_start).map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#1A1A1A]/50 block mb-1">每小時價格 (HKD)</label>
                    <input type="number" value={newRule.price}
                      onChange={e => setNewRule(p => ({ ...p, price: +e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={addRule}
                      className="flex-1 px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm font-semibold hover:bg-[#b08d4f]">
                      建立
                    </button>
                    <button onClick={() => setShowAdd(false)}
                      className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
