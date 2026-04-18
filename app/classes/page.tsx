'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAllClasses, type ClassWithClub } from '@/lib/queries';
import type { Visibility } from '@/lib/types';

// HK regions — a club's area is derived from its address.
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

const DAYS = [
  { key: 'Monday', label: '星期一' },
  { key: 'Tuesday', label: '星期二' },
  { key: 'Wednesday', label: '星期三' },
  { key: 'Thursday', label: '星期四' },
  { key: 'Friday', label: '星期五' },
  { key: 'Saturday', label: '星期六' },
  { key: 'Sunday', label: '星期日' },
];

// Sort order: weekdays first (Mon→Sun), unknown days at the end.
const DAY_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
};

function dayLabel(day: string): string {
  return DAYS.find(d => d.key === day)?.label ?? day;
}

const vizBadge: Record<Visibility, { label: string; cls: string }> = {
  public: { label: '公開', cls: 'bg-emerald-50 text-emerald-700' },
  members: { label: '會員', cls: 'bg-[#C4A265]/15 text-[#C4A265]' },
  private: { label: '私人', cls: 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60' },
};

const levelColors: Record<string, string> = {
  Beginner: 'bg-green-500',
  Intermediate: 'bg-amber-500',
  Advanced: 'bg-red-500',
};

const levelLabel: Record<string, string> = {
  Beginner: '初級',
  Intermediate: '中級',
  Advanced: '高級',
};

export default function AllClassesPage() {
  const [classes, setClasses] = useState<ClassWithClub[]>([]);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string>('all');
  const [day, setDay] = useState<string>('all');
  const [level, setLevel] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllClasses().then(all => {
      setClasses(all);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = classes.filter(c => {
      if (area !== 'all' && detectArea(c.club.address) !== area) return false;
      if (day !== 'all' && c.day !== day) return false;
      if (level !== 'all' && c.level !== level) return false;
      const viz = (c.visibility || 'public') as Visibility;
      if (viz === 'private') return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.coach.toLowerCase().includes(q) ||
        c.club.name.toLowerCase().includes(q)
      );
    });
    return out.sort((a, b) => {
      const da = DAY_ORDER[a.day] ?? 99;
      const db = DAY_ORDER[b.day] ?? 99;
      if (da !== db) return da - db;
      return a.time.localeCompare(b.time);
    });
  }, [classes, query, area, day, level]);

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-[#1A1A1A] mb-3">所有課程</h1>
        <p className="text-lg text-[#1A1A1A]/60 mb-8">全港網球會課程一覽</p>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <input
            type="text"
            placeholder="搜尋課程、教練或球會..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#C4A265]"
          />

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/50 mb-2">地區</p>
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
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/50 mb-2">日期</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDay('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${day === 'all' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                全部
              </button>
              {DAYS.map(d => (
                <button key={d.key} onClick={() => setDay(d.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${day === d.key ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/50 mb-2">程度</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setLevel('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${level === 'all' ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                全部程度
              </button>
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${level === l ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-[#FFF8F0] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                  {levelLabel[l]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide mb-4">
          搵到 {filtered.length} 堂課程
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-[#1A1A1A]/60">搵唔到符合條件嘅課程</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(cls => {
              const viz = (cls.visibility || 'public') as Visibility;
              const badge = vizBadge[viz];
              const spotsPct = cls.spots_total > 0
                ? ((cls.spots_total - cls.spots_available) / cls.spots_total) * 100
                : 0;
              const initials = cls.coach.replace('Coach ', '').split(' ').map(n => n[0]).join('');
              return (
                <Link key={cls.id} href={`/clubs/${cls.club.slug}/classes/${cls.id}`}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <span className={`${levelColors[cls.level] ?? 'bg-[#1A1A1A]/60'} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>{cls.level}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <span className="text-2xl font-bold text-[#1A1A1A]">${cls.price}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{cls.name}</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#C4A265] flex items-center justify-center text-white font-bold text-sm">{initials}</div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{cls.coach}</p>
                      <p className="text-xs text-[#1A1A1A]/60">教練</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#1A1A1A]/80 mb-3">
                    <span className="font-semibold">{dayLabel(cls.day)}</span> · {cls.time}
                  </p>
                  <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/clubs/${cls.club.slug}`; }}
                    className="text-xs text-[#1A1A1A]/60 mb-3 hover:text-[#C4A265] cursor-pointer inline-flex items-center gap-1 w-fit"
                  >
                     {cls.club.name}
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-[#1A1A1A]/60 uppercase tracking-wide">剩餘名額</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{cls.spots_available}/{cls.spots_total}</span>
                    </div>
                    <div className="w-full bg-[#1A1A1A]/10 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#C4A265] h-full rounded-full transition-all" style={{ width: `${spotsPct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
