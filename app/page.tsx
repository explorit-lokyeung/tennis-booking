'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { getClubs, getAllCourts, getPlatformStats, type PlatformStats, type CourtWithClub } from '@/lib/queries';
import { Building2, MapPin, Zap, GraduationCap, ChevronRight } from 'lucide-react';

const CourtsMap = dynamic(() => import('@/components/CourtsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[50vh] rounded-2xl bg-white animate-pulse" />,
});
import type { Club } from '@/lib/types';

export default function PlatformLandingPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [courts, setCourts] = useState<CourtWithClub[]>([]);
  const [stats, setStats] = useState<PlatformStats>({ clubs: 0, courts: 0, classes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClubs(), getPlatformStats(), getAllCourts()]).then(([all, s, c]) => {
      setClubs(all.slice(0, 6));
      setCourts(c);
      setStats(s);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white py-24 px-4 overflow-hidden">
        <div className="absolute top-10 right-10 opacity-10 animate-bounce-in hidden md:block"><svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20M2 12h20" /></svg></div>
        <div className="max-w-6xl mx-auto text-center relative">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            網球<span className="text-[#C4A265]">平台</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/80 max-w-2xl mx-auto">
            發掘香港嘅網球會。預約球場，報名課堂，由一個地方開始。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/clubs" className="bg-[#C4A265] text-[#1A1A1A] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#D4B275] transition-colors">
              瀏覽所有球會
            </Link>
            <Link href="/courts" className="border-2 border-white/40 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-colors">
              🗺️ 球場地圖
            </Link>
            <Link href="/classes" className="border-2 border-white/40 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-colors">
               所有課程
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 px-4 bg-white border-b border-[#1A1A1A]/10">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          <Link href="/clubs" className="group">
            <p className="text-4xl md:text-5xl font-bold text-[#1A1A1A] group-hover:text-[#C4A265] transition-colors">{stats.clubs}</p>
            <p className="text-xs md:text-sm text-[#1A1A1A]/50 uppercase tracking-wider mt-1">球會</p>
          </Link>
          <Link href="/courts" className="group">
            <p className="text-4xl md:text-5xl font-bold text-[#1A1A1A] group-hover:text-[#C4A265] transition-colors">{stats.courts}</p>
            <p className="text-xs md:text-sm text-[#1A1A1A]/50 uppercase tracking-wider mt-1">球場</p>
          </Link>
          <Link href="/classes" className="group">
            <p className="text-4xl md:text-5xl font-bold text-[#1A1A1A] group-hover:text-[#C4A265] transition-colors">{stats.classes}</p>
            <p className="text-xs md:text-sm text-[#1A1A1A]/50 uppercase tracking-wider mt-1">課程</p>
          </Link>
        </div>
      </section>

      {/* Featured clubs */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-4xl font-bold text-[#1A1A1A] mb-2">精選球會</h2>
              <p className="text-[#1A1A1A]/60">加入社群，隨時揮拍</p>
            </div>
            <Link href="/clubs" className="text-sm font-bold text-[#C4A265] uppercase tracking-wider hover:underline">
              查看全部 →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-48 animate-pulse" />
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-[#1A1A1A]/30 mx-auto mb-3" />
              <p className="text-[#1A1A1A]/60">暫時未有球會</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {clubs.map(c => (
                <Link key={c.id} href={`/clubs/${c.slug}`}
                  className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
                    {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover rounded-2xl" /> : <Building2 className="w-7 h-7 text-[#C4A265]" />}
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{c.name}</h3>
                  {c.address && <p className="text-sm text-[#1A1A1A]/60 mb-3">{c.address}</p>}
                  {c.description && (
                    <p className="text-sm text-[#1A1A1A]/70 line-clamp-2">{c.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Map View */}
      <section className="py-16 px-4 bg-white border-t border-[#1A1A1A]/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A]">球場位置</h2>
              <p className="text-sm text-[#1A1A1A]/50 mt-1">全港 {stats.courts} 個球場一覽</p>
            </div>
            <Link href="/courts" className="text-sm font-bold text-[#C4A265] hover:underline uppercase tracking-wide">
              查看全部 →
            </Link>
          </div>
          {courts.length > 0 ? (
            <CourtsMap courts={courts} showSidebar />
          ) : (
            <div className="w-full h-[50vh] rounded-2xl bg-[#FFF8F0] flex items-center justify-center">
              <p className="text-[#1A1A1A]/40">載入中...</p>
            </div>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 px-4 bg-white border-t border-[#1A1A1A]/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-12">點解揀我哋</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 className="w-7 h-7 text-[#C4A265]" /></div>
              <h3 className="font-bold text-[#1A1A1A] text-lg mb-2">多個球會，一個帳戶</h3>
              <p className="text-sm text-[#1A1A1A]/60">一次登入，管理你喺唔同球會嘅會籍同預約。</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center mx-auto mb-4"><Zap className="w-7 h-7 text-[#C4A265]" /></div>
              <h3 className="font-bold text-[#1A1A1A] text-lg mb-2">即時預約</h3>
              <p className="text-sm text-[#1A1A1A]/60">睇到可用時段即刻book，唔駛等電話通知。</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-[#C4A265]/15 rounded-2xl flex items-center justify-center mx-auto mb-4"><GraduationCap className="w-7 h-7 text-[#C4A265]" /></div>
              <h3 className="font-bold text-[#1A1A1A] text-lg mb-2">專業教練</h3>
              <p className="text-sm text-[#1A1A1A]/60">由初級到高級，搵到適合你嘅課程。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for club owners */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-[#C4A265] to-[#A38850] rounded-3xl p-10 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">你係球會東主？</h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">加入平台，管理會員、球場同課程，幫你嘅球會上線。</p>
          <a href="mailto:hello@tennisplatform.hk" className="inline-block bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-black transition-colors">
            聯絡我哋
          </a>
        </div>
      </section>
    </div>
  );
}
