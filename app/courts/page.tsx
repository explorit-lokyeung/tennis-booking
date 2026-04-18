'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { getAllCourts, type CourtWithClub } from '@/lib/queries';

// Leaflet depends on window, so load the map only on the client.
const CourtsMap = dynamic(() => import('@/components/CourtsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[70vh] rounded-2xl bg-white animate-pulse" />,
});

const AREAS = [
  { key: 'hk', label: '港島', keywords: ['中環', '灣仔', '銅鑼灣', '北角', '鰂魚涌', '西環', '香港島', '筲箕灣', '跑馬地', '柴灣', '薄扶林', '赤柱', '淺水灣', '深水灣'] },
  { key: 'kln', label: '九龍', keywords: ['九龍', '旺角', '油麻地', '尖沙咀', '佐敦', '紅磡', '何文田', '九龍塘', '深水埗', '長沙灣', '觀塘', '黃大仙', '新蒲崗', '牛池灣'] },
  { key: 'nt', label: '新界', keywords: ['新界', '沙田', '荃灣', '葵涌', '青衣', '元朗', '屯門', '大埔', '粉嶺', '上水', '西貢', '將軍澳', '馬鞍山', '天水圍', '離島', '大嶼山', '東涌'] },
];

function detectArea(address: string | null | undefined): string | null {
  if (!address) return null;
  for (const a of AREAS) {
    if (a.keywords.some(k => address.includes(k))) return a.key;
  }
  return null;
}

function surfaceLabel(surface: string | null): string {
  if (!surface) return '—';
  const s = surface.toLowerCase();
  if (s.includes('hard')) return '硬地';
  if (s.includes('clay') || s.includes('紅土')) return '紅土';
  if (s.includes('grass') || s.includes('草')) return '人造草';
  return surface;
}

type ViewMode = 'list' | 'map';

export default function AllCourtsPage() {
  const [courts, setCourts] = useState<CourtWithClub[]>([]);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCourts().then(all => {
      setCourts(all);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courts.filter((c: CourtWithClub) => {
      if (area !== 'all' && detectArea(c.club.address) !== area) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.club.name.toLowerCase().includes(q) ||
        (c.club.address?.toLowerCase().includes(q) ?? false) ||
        (c.surface?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [courts, query, area]);

  // Group filtered courts by club
  const grouped = useMemo(() => {
    const map = new Map<string, { club: CourtWithClub['club']; courts: CourtWithClub[] }>();
    for (const c of filtered) {
      const existing = map.get(c.club.id);
      if (existing) { existing.courts.push(c); }
      else { map.set(c.club.id, { club: c.club, courts: [c] }); }
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-[#1A1A1A] mb-3">所有球場</h1>
        <p className="text-lg text-[#1A1A1A]/60 mb-8">全港網球會球場一覽</p>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <input
            type="text"
            placeholder="搜尋球場、球會或地區..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#C4A265]"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setArea('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${area === 'all' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                全部地區
              </button>
              {AREAS.map(a => (
                <button key={a.key} onClick={() => setArea(a.key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${area === a.key ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                  {a.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-[#FFF8F0] rounded-full p-1">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${view === 'list' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'}`}>
                📋 列表
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${view === 'map' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'}`}>
                🗺️ 地圖
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide mb-4">
          搵到 {filtered.length} 個球場
        </p>

        {view === 'map' ? (
          loading ? (
            <div className="w-full h-[70vh] rounded-2xl bg-white animate-pulse" />
          ) : (
            <CourtsMap courts={filtered} showSidebar />
          )
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-[#1A1A1A]/60">搵唔到符合條件嘅球場</p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(group => {
              const areaKey = detectArea(group.club.address);
              const areaLabel = AREAS.find(a => a.key === areaKey)?.label;
              return (
                <div key={group.club.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <Link href={`/clubs/${group.club.slug}`} className="text-lg font-bold text-[#1A1A1A] hover:text-[#C4A265] transition-colors">
                      {group.club.name}
                    </Link>
                    {areaLabel && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-[#C4A265]/10 text-[#C4A265] font-bold uppercase">{areaLabel}</span>
                    )}
                    {group.club.address && (
                      <span className="text-xs text-[#1A1A1A]/50 hidden sm:inline">{group.club.address}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.courts.map(court => (
                      <Link key={court.id} href={`/clubs/${court.club.slug}/courts?court=${court.id}`}
                        className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
                        <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{court.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-[#1A1A1A]/5 text-[#1A1A1A]/70 font-semibold">
                            {surfaceLabel(court.surface)}
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-[#1A1A1A]/5 text-[#1A1A1A]/70 font-semibold">
                            {court.indoor ? '室內' : '室外'}
                          </span>
                          {court.hourly_rate > 0 && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                              ${court.hourly_rate}/小時
                            </span>
                          )}
                        </div>
                        {court.description && (
                          <p className="text-xs text-[#1A1A1A]/60 line-clamp-2">{court.description}</p>
                        )}
                        <div className="mt-auto pt-3 text-xs font-bold text-[#C4A265] uppercase tracking-wide">
                          預約球場 →
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
