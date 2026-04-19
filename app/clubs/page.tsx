'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getClubs } from '@/lib/queries';
import { Building2 } from 'lucide-react';
import type { Club } from '@/lib/types';

// HK regions. A club's area is derived from its address by substring match.
const AREAS = [
  { key: 'hk', label: '港島', keywords: ['中環', '灣仔', '銅鑼灣', '北角', '鰂魚涌', '西環', '香港島', '筲箕灣', '跑馬地', '柴灣', '薄扶林', '赤柱', '淺水灣'] },
  { key: 'kln', label: '九龍', keywords: ['九龍', '旺角', '油麻地', '尖沙咀', '佐敦', '紅磡', '何文田', '九龍塘', '深水埗', '長沙灣', '觀塘', '黃大仙', '新蒲崗', '牛池灣'] },
  { key: 'nt', label: '新界', keywords: ['新界', '沙田', '荃灣', '葵涌', '青衣', '元朗', '屯門', '大埔', '粉嶺', '上水', '西貢', '將軍澳', '馬鞍山', '天水圍', '離島', '大嶼山', '東涌'] },
];

function detectArea(address: string | null): string | null {
  if (!address) return null;
  for (const a of AREAS) {
    if (a.keywords.some(k => address.includes(k))) return a.key;
  }
  return null;
}

export default function ClubDirectoryPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClubs().then(all => {
      setClubs(all);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter(c => {
      if (area !== 'all' && detectArea(c.address) !== area) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.address?.toLowerCase().includes(q) ?? false) ||
        (c.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clubs, query, area]);

  const areaCounts = useMemo(() => {
    const out: Record<string, number> = { all: clubs.length };
    for (const a of AREAS) out[a.key] = 0;
    for (const c of clubs) {
      const k = detectArea(c.address);
      if (k) out[k] = (out[k] || 0) + 1;
    }
    return out;
  }, [clubs]);

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-[#1A1A1A] mb-3">球會目錄</h1>
        <p className="text-lg text-[#1A1A1A]/60 mb-8">所有加入平台嘅網球會</p>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <input
            type="text"
            placeholder="搜尋球會名稱、地區或關鍵字..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#C4A265]"
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => setArea('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${area === 'all' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
              全部地區 ({areaCounts.all})
            </button>
            {AREAS.map(a => (
              <button key={a.key} onClick={() => setArea(a.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${area === a.key ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                {a.label} ({areaCounts[a.key] || 0})
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide mb-4">
          搵到 {filtered.length} 個球會
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-[#1A1A1A]/60">搵唔到符合條件嘅球會</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => {
              const areaKey = detectArea(c.address);
              const areaLabel = AREAS.find(a => a.key === areaKey)?.label;
              return (
                <Link key={c.id} href={`/clubs/${c.slug}`}
                  className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center overflow-hidden">
                      {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover rounded-2xl" /> : <Building2 className="w-7 h-7 text-[#C4A265]" />}
                    </div>
                    {areaLabel && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-[#C4A265]/10 text-[#C4A265] font-bold uppercase">{areaLabel}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{c.name}</h3>
                  {c.address && <p className="text-sm text-[#1A1A1A]/60 mb-3">{c.address}</p>}
                  {c.description && (
                    <p className="text-sm text-[#1A1A1A]/70 line-clamp-2">{c.description}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
