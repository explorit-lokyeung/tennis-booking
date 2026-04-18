'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useClub } from '@/lib/club';

type DailyStat = { date: string; bookings: number; revenue: number };

type CourtRow = {
  id: string;
  name: string;
  hourly_rate: number;
  bookings: number;
  revenue: number;
};

type ClassRow = {
  id: string;
  name: string;
  coach: string;
  price: number;
  registrations: number;
  revenue: number;
};

const RANGES = [
  { key: '7d', label: '7 日', days: 7 },
  { key: '30d', label: '30 日', days: 30 },
  { key: '90d', label: '90 日', days: 90 },
];

export default function ClubAnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { club } = useClub(slug);

  const [range, setRange] = useState<string>('30d');
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [courts, setCourts] = useState<CourtRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    const days = RANGES.find(r => r.key === range)?.days ?? 30;
    const since = new Date(); since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    setLoading(true);

    (async () => {
      // Bookings (with slot price for revenue) in range
      const { data: bk } = await supabase
        .from('bookings')
        .select('id, date, court_id, slot_id, slots!inner(price), courts!inner(id, name, hourly_rate)')
        .eq('club_id', club.id)
        .gte('date', sinceStr);

      const bkRows = ((bk as any[]) || []).map(b => ({
        date: b.date,
        court_id: b.court_id,
        court_name: b.courts?.name ?? '—',
        court_rate: b.courts?.hourly_rate ?? 0,
        price: b.slots?.price ?? b.courts?.hourly_rate ?? 0,
      }));

      // Build daily timeseries
      const dailyMap = new Map<string, DailyStat>();
      for (let i = 0; i < days; i++) {
        const d = new Date(since); d.setDate(d.getDate() + i);
        const s = d.toISOString().split('T')[0];
        dailyMap.set(s, { date: s, bookings: 0, revenue: 0 });
      }
      for (const b of bkRows) {
        const row = dailyMap.get(b.date);
        if (row) { row.bookings += 1; row.revenue += b.price; }
      }
      setDaily(Array.from(dailyMap.values()));

      // Per-court utilisation
      const courtMap = new Map<string, CourtRow>();
      for (const b of bkRows) {
        const cur = courtMap.get(b.court_id) || { id: b.court_id, name: b.court_name, hourly_rate: b.court_rate, bookings: 0, revenue: 0 };
        cur.bookings += 1; cur.revenue += b.price;
        courtMap.set(b.court_id, cur);
      }
      // Include courts with zero bookings
      const { data: allCourts } = await supabase.from('courts').select('id, name, hourly_rate').eq('club_id', club.id);
      for (const c of (allCourts as any[]) || []) {
        if (!courtMap.has(c.id)) courtMap.set(c.id, { id: c.id, name: c.name, hourly_rate: c.hourly_rate, bookings: 0, revenue: 0 });
      }
      setCourts(Array.from(courtMap.values()).sort((a, b) => b.revenue - a.revenue));

      // Class registrations
      const { data: clsRows } = await supabase.from('classes').select('id, name, coach, price').eq('club_id', club.id);
      const classRowsBase: ClassRow[] = ((clsRows as any[]) || []).map(c => ({
        id: c.id, name: c.name, coach: c.coach, price: c.price, registrations: 0, revenue: 0,
      }));
      const { data: cbRows } = await supabase
        .from('class_bookings')
        .select('class_id, created_at')
        .eq('club_id', club.id)
        .eq('status', 'confirmed')
        .gte('created_at', since.toISOString());
      const byClass = new Map<string, number>();
      for (const cb of (cbRows as any[]) || []) {
        byClass.set(cb.class_id, (byClass.get(cb.class_id) || 0) + 1);
      }
      const mergedClasses = classRowsBase.map(c => ({
        ...c,
        registrations: byClass.get(c.id) || 0,
        revenue: (byClass.get(c.id) || 0) * (c.price || 0),
      })).sort((a, b) => b.revenue - a.revenue);
      setClasses(mergedClasses);

      setLoading(false);
    })();
  }, [club, range]);

  const totals = useMemo(() => {
    const bookings = daily.reduce((s, d) => s + d.bookings, 0);
    const revenue = daily.reduce((s, d) => s + d.revenue, 0) + classes.reduce((s, c) => s + c.revenue, 0);
    const registrations = classes.reduce((s, c) => s + c.registrations, 0);
    return { bookings, registrations, revenue };
  }, [daily, classes]);

  const maxBar = Math.max(1, ...daily.map(d => d.bookings));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">數據分析</h1>
          <p className="text-[#1A1A1A]/50 text-sm mt-1">{club?.name}</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold ${range === r.key ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A]/60'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">球場預約</p>
          <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{totals.bookings}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">課程報名</p>
          <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{totals.registrations}</p>
        </div>
        <div className="bg-gradient-to-br from-[#C4A265] to-[#A38850] text-white rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide opacity-80">估計收入</p>
          <p className="text-3xl font-bold mt-1">${totals.revenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-8">
        <h2 className="font-bold text-[#1A1A1A] mb-4">每日預約趨勢</h2>
        {loading ? (
          <p className="text-sm text-[#1A1A1A]/40">載入中...</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {daily.map(d => {
              const h = (d.bookings / maxBar) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="w-full bg-[#C4A265] rounded-t transition-all group-hover:bg-[#1A1A1A]" style={{ height: `${h}%`, minHeight: d.bookings > 0 ? 2 : 0 }} title={`${d.date}: ${d.bookings} 預約 · $${d.revenue}`} />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between text-[10px] text-[#1A1A1A]/40 mt-2">
          {daily.length > 0 && <><span>{daily[0].date}</span><span>{daily[daily.length - 1].date}</span></>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-[#1A1A1A] mb-4">球場使用率</h2>
          {courts.length === 0 ? (
            <p className="text-sm text-[#1A1A1A]/40">未有球場</p>
          ) : (
            <div className="space-y-3">
              {courts.map(c => {
                const maxRev = Math.max(1, ...courts.map(x => x.revenue));
                const pct = (c.revenue / maxRev) * 100;
                return (
                  <div key={c.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-semibold text-[#1A1A1A]">{c.name}</span>
                      <span className="text-xs text-[#1A1A1A]/50">{c.bookings} 預約 · ${c.revenue}</span>
                    </div>
                    <div className="h-2 bg-[#1A1A1A]/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C4A265]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-[#1A1A1A] mb-4">熱門課程</h2>
          {classes.length === 0 ? (
            <p className="text-sm text-[#1A1A1A]/40">未有課程</p>
          ) : (
            <div className="space-y-3">
              {classes.slice(0, 8).map(c => {
                const maxReg = Math.max(1, ...classes.map(x => x.registrations));
                const pct = (c.registrations / maxReg) * 100;
                return (
                  <div key={c.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-semibold text-[#1A1A1A]">{c.name}</span>
                      <span className="text-xs text-[#1A1A1A]/50">{c.registrations} 報名 · ${c.revenue}</span>
                    </div>
                    <div className="h-2 bg-[#1A1A1A]/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A1A1A]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
