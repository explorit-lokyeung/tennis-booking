'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, GraduationCap, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClub } from '@/lib/club';

type Stats = {
  members: number;
  pendingMembers: number;
  courts: number;
  classes: number;
  bookingsToday: number;
};

export default function ClubAdminDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const { club } = useClub(slug);
  const [stats, setStats] = useState<Stats>({ members: 0, pendingMembers: 0, courts: 0, classes: 0, bookingsToday: 0 });

  useEffect(() => {
    if (!club) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const [m, pm, cc, cls, bk] = await Promise.all([
        supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', club.id).eq('status', 'approved'),
        supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', club.id).eq('status', 'pending'),
        supabase.from('courts').select('id', { count: 'exact', head: true }).eq('club_id', club.id),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('club_id', club.id),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('club_id', club.id).eq('date', today),
      ]);
      setStats({
        members: m.count || 0,
        pendingMembers: pm.count || 0,
        courts: cc.count || 0,
        classes: cls.count || 0,
        bookingsToday: bk.count || 0,
      });
    })();
  }, [club]);

  const base = `/clubs/${slug}/admin`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">管理控制台</h1>
      <p className="text-[#1A1A1A]/60 mb-8">{club?.name}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">會員</p>
          <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{stats.members}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">待審批</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pendingMembers}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">球場</p>
          <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{stats.courts}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">課程</p>
          <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{stats.classes}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">今日預約</p>
          <p className="text-3xl font-bold text-[#C4A265] mt-1">{stats.bookingsToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`${base}/courts`} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
          <MapPin className="w-6 h-6 text-[#C4A265] mb-2" />
          <h3 className="font-bold text-[#1A1A1A] mb-1">球場管理</h3>
          <p className="text-sm text-[#1A1A1A]/60">開放時段、設定價格、取消預約</p>
        </Link>
        <Link href={`${base}/classes`} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
          <GraduationCap className="w-6 h-6 text-[#C4A265] mb-2" />
          <h3 className="font-bold text-[#1A1A1A] mb-1">課程管理</h3>
          <p className="text-sm text-[#1A1A1A]/60">新增課程、管理參加者</p>
        </Link>
        <Link href={`${base}/members`} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
          <Users className="w-6 h-6 text-[#C4A265] mb-2" />
          <h3 className="font-bold text-[#1A1A1A] mb-1">會員管理</h3>
          <p className="text-sm text-[#1A1A1A]/60">審批申請、角色、停用</p>
        </Link>
      </div>
    </div>
  );
}
