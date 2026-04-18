'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Stats = {
  clubs: number;
  activeClubs: number;
  courts: number;
  classes: number;
  memberships: number;
  bookings: number;
};

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<Stats>({ clubs: 0, activeClubs: 0, courts: 0, classes: 0, memberships: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cl, clA, co, cs, mb, bk] = await Promise.all([
        supabase.from('clubs').select('id', { count: 'exact', head: true }),
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('courts').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      ]);
      setStats({
        clubs: cl.count || 0,
        activeClubs: clA.count || 0,
        courts: co.count || 0,
        classes: cs.count || 0,
        memberships: mb.count || 0,
        bookings: bk.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">平台概覽</h1>
        <p className="text-[#1A1A1A]/60">全平台球會、會員、預約統計</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <StatCard label="球會總數" value={stats.clubs} loading={loading} />
        <StatCard label="啟用球會" value={stats.activeClubs} loading={loading} accent />
        <StatCard label="球場" value={stats.courts} loading={loading} />
        <StatCard label="課程" value={stats.classes} loading={loading} />
        <StatCard label="會員" value={stats.memberships} loading={loading} />
        <StatCard label="確認預約" value={stats.bookings} loading={loading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/clubs" className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
          <p className="text-2xl mb-2"></p>
          <h3 className="font-bold text-[#1A1A1A] mb-1">球會管理</h3>
          <p className="text-sm text-[#1A1A1A]/60">建立新球會、編輯資料、啟用／停用</p>
        </Link>
        <Link href="/admin/clubs/new" className="bg-[#C4A265] text-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
          <p className="text-2xl mb-2">+</p>
          <h3 className="font-bold mb-1">新增球會</h3>
          <p className="text-sm text-white/80">為新客戶建立球會頁面同預設設定</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, loading, accent }: { label: string; value: number; loading: boolean; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? 'text-[#C4A265]' : 'text-[#1A1A1A]'}`}>
        {loading ? '—' : value}
      </p>
    </div>
  );
}
