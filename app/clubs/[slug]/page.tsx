'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useClub, useMembership, isClubAdmin, isApprovedMember } from '@/lib/club';
import { getClubCourts, getClubClasses } from '@/lib/queries';
import type { Court, TennisClass, Visibility } from '@/lib/types';

const vizBadge: Record<Visibility, { label: string; cls: string }> = {
  public: { label: '公開', cls: 'bg-emerald-50 text-emerald-700' },
  members: { label: '會員', cls: 'bg-[#C4A265]/15 text-[#C4A265]' },
  private: { label: '私人', cls: 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60' },
};

export default function ClubHomepage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();
  const { club, loading } = useClub(slug);
  const { membership } = useMembership(club?.id, user?.id);

  const [courts, setCourts] = useState<Court[]>([]);
  const [classes, setClasses] = useState<TennisClass[]>([]);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');
  const [showJoinMenu, setShowJoinMenu] = useState(false);

  useEffect(() => {
    if (!club) return;
    getClubCourts(club.id).then(setCourts);
    getClubClasses(club.id).then(setClasses);
  }, [club]);

  const handleJoin = async (role: 'member' | 'coach') => {
    if (!user || !club) return;
    setJoining(true);
    setShowJoinMenu(false);
    const { error } = await supabase.from('club_memberships').insert({
      club_id: club.id, user_id: user.id, role, status: 'pending',
    });
    setJoining(false);
    if (error) {
      setJoinMsg('申請失敗：' + error.message);
    } else {
      setJoinMsg(role === 'coach' ? '教練申請已提交，等待審批' : '申請已提交，等待審批');
    }
  };

  if (loading) return <main className="min-h-screen bg-[#FFF8F0]" />;
  if (!club) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">找不到球會</h1>
          <Link href="/clubs" className="text-[#C4A265] font-semibold">← 返回球會目錄</Link>
        </div>
      </main>
    );
  }

  const approved = isApprovedMember(membership);
  const isAdmin = isClubAdmin(membership);

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubs" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
            ← 球會目錄
          </Link>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mt-4">
            <div className="flex items-center gap-5">
              {club.logo_url && <img src={club.logo_url} alt={club.name} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-white/10" />}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3">{club.name}</h1>
                {club.address && <p className="text-white/70">{club.address}</p>}
                {club.description && <p className="mt-4 text-white/80 max-w-2xl">{club.description}</p>}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              {!user ? (
                <Link href="/login" className="bg-[#C4A265] text-[#1A1A1A] px-6 py-3 rounded-full font-bold hover:bg-[#D4B275] transition-colors">
                  登入加入
                </Link>
              ) : !membership ? (
                <div className="relative">
                  <button onClick={() => setShowJoinMenu(v => !v)} disabled={joining}
                    className="bg-[#C4A265] text-[#1A1A1A] px-6 py-3 rounded-full font-bold hover:bg-[#D4B275] transition-colors disabled:opacity-50">
                    {joining ? '提交中...' : '申請加入 ▾'}
                  </button>
                  {showJoinMenu && (
                    <div className="absolute right-0 mt-2 bg-white text-[#1A1A1A] rounded-xl shadow-lg overflow-hidden z-10 min-w-[180px]">
                      <button onClick={() => handleJoin('member')} className="w-full text-left px-4 py-3 hover:bg-[#FFF8F0] text-sm font-semibold">
                        以會員身份加入
                      </button>
                      <button onClick={() => handleJoin('coach')} className="w-full text-left px-4 py-3 hover:bg-[#FFF8F0] text-sm font-semibold border-t border-[#1A1A1A]/5">
                        以教練身份申請
                      </button>
                    </div>
                  )}
                </div>
              ) : membership.status === 'pending' ? (
                <span className="bg-amber-500/20 text-amber-200 px-4 py-2 rounded-full text-sm font-semibold">
                  申請審批中
                </span>
              ) : membership.status === 'approved' ? (
                <span className="bg-emerald-500/20 text-emerald-200 px-4 py-2 rounded-full text-sm font-semibold">
                  ✓ {membership.role === 'owner' ? '東主' : membership.role === 'admin' ? '管理員' : membership.role === 'coach' ? '教練' : '會員'}
                </span>
              ) : (
                <span className="bg-red-500/20 text-red-200 px-4 py-2 rounded-full text-sm font-semibold">
                  {membership.status === 'rejected' ? '申請被拒' : '已停用'}
                </span>
              )}
              {joinMsg && <p className="text-xs text-white/70">{joinMsg}</p>}
              {isAdmin && (
                <Link href={`/clubs/${slug}/admin`} className="text-xs text-[#C4A265] hover:underline">
                  管理控制台 →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Nav quick links */}
      <section className="bg-white border-b border-[#1A1A1A]/10 py-4 px-4 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto flex gap-6 overflow-x-auto text-sm font-medium">
          <Link href={`/clubs/${slug}`} className="text-[#1A1A1A] font-bold whitespace-nowrap">關於</Link>
          <Link href={`/clubs/${slug}/courts`} className="text-[#1A1A1A]/60 hover:text-[#C4A265] whitespace-nowrap">場地預約</Link>
          <Link href={`/clubs/${slug}/classes`} className="text-[#1A1A1A]/60 hover:text-[#C4A265] whitespace-nowrap">課堂</Link>
        </div>
      </section>

      {/* Courts preview */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-3xl font-bold text-[#1A1A1A]">球場</h2>
            <Link href={`/clubs/${slug}/courts`} className="text-sm font-bold text-[#C4A265] uppercase tracking-wider hover:underline">
              預約 →
            </Link>
          </div>
          {courts.length === 0 ? (
            <p className="text-[#1A1A1A]/50">暫無球場</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courts.map(c => {
                const viz = (c.visibility || 'public') as Visibility;
                const badge = vizBadge[viz];
                const locked = viz !== 'public' && !approved;
                return (
                  <div key={c.id} className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[#1A1A1A]">{c.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-sm text-[#1A1A1A]/60">
                      {c.surface === 'Hard' ? '硬地' : c.surface === 'Clay' ? '泥地' : c.surface}
                      {c.indoor ? ' · 室內' : ' · 室外'}
                    </p>
                    <p className="text-lg font-bold text-[#C4A265] mt-2">${c.hourly_rate}<span className="text-xs text-[#1A1A1A]/40 font-normal">/小時</span></p>
                    {locked && <p className="text-xs text-[#1A1A1A]/40 mt-2">需要會員資格</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Classes preview */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-3xl font-bold text-[#1A1A1A]">課堂</h2>
            <Link href={`/clubs/${slug}/classes`} className="text-sm font-bold text-[#C4A265] uppercase tracking-wider hover:underline">
              全部課程 →
            </Link>
          </div>
          {classes.length === 0 ? (
            <p className="text-[#1A1A1A]/50">暫無課堂</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.slice(0, 6).map(cls => {
                const viz = (cls.visibility || 'public') as Visibility;
                const badge = vizBadge[viz];
                return (
                  <Link key={cls.id} href={`/clubs/${slug}/classes/${cls.id}`}
                    className="bg-[#FFF8F0] rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[#1A1A1A]">{cls.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-sm text-[#1A1A1A]/60">{cls.coach}</p>
                    <p className="text-sm text-[#1A1A1A]/60">{cls.day} · {cls.time}</p>
                    <p className="text-lg font-bold text-[#C4A265] mt-2">${cls.price}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {(club.phone || club.email || club.website) && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">聯絡</h2>
            <div className="bg-white rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {club.phone && <div><p className="text-[#1A1A1A]/40 mb-1">電話</p><p className="font-semibold">{club.phone}</p></div>}
              {club.email && <div><p className="text-[#1A1A1A]/40 mb-1">電郵</p><p className="font-semibold">{club.email}</p></div>}
              {club.website && <div><p className="text-[#1A1A1A]/40 mb-1">網址</p><a href={club.website} className="font-semibold text-[#C4A265] hover:underline" target="_blank" rel="noreferrer">{club.website}</a></div>}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
