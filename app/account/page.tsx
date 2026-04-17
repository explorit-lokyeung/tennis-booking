'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Booking {
  id: string;
  date: string;
  hour: number;
  courts: { name: string; surface: string };
}

interface ClassBooking {
  id: string;
  classes: { name: string; coach: string; day: string; time: string };
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classBookings, setClassBookings] = useState<ClassBooking[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUser(user);

      const { data: bk } = await supabase
        .from('bookings')
        .select('id, date, hour, courts(name, surface)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('date', { ascending: true });
      if (bk) setBookings(bk as any);

      const { data: cb } = await supabase
        .from('class_bookings')
        .select('id, classes(name, coach, day, time)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      if (cb) setClassBookings(cb as any);

      setLoading(false);
    }
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login/');
  };

  const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

  if (loading) return <main className="min-h-screen bg-[#FFF8F0]" />;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🎾</p>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">請先登入</h2>
          <p className="text-[#1A1A1A]/50 mb-6">查看你嘅預約同課堂</p>
          <Link href="/login/" className="inline-block bg-[#1A1A1A] text-[#FFF8F0] px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all">
            登入
          </Link>
        </div>
      </main>
    );
  }

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || '用戶';

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#C4A265] flex items-center justify-center text-white text-xl font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1A1A1A]">{userName}</h1>
            <p className="text-sm text-[#1A1A1A]/50">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-500 font-semibold hover:underline">
            登出
          </button>
        </div>

        <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">我的球場預約</h2>
        <div className="space-y-3 mb-8">
          {bookings.length === 0 ? (
            <p className="text-[#1A1A1A]/40 text-sm">暫無預約</p>
          ) : bookings.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1A1A1A]">{b.courts?.name} <span className="text-xs text-[#1A1A1A]/40">({b.courts?.surface})</span></p>
                <p className="text-sm text-[#1A1A1A]/50">{b.date} · {fmtHour(b.hour)}</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-semibold">已確認</span>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">我的課堂</h2>
        <div className="space-y-3 mb-8">
          {classBookings.length === 0 ? (
            <p className="text-[#1A1A1A]/40 text-sm">暫無報名</p>
          ) : classBookings.map(cb => (
            <div key={cb.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1A1A1A]">{cb.classes?.name}</p>
                <p className="text-sm text-[#1A1A1A]/50">{cb.classes?.day} {cb.classes?.time} · {cb.classes?.coach}</p>
              </div>
              <span className="text-xs bg-[#C4A265]/10 text-[#C4A265] px-3 py-1 rounded-full font-semibold">已報名</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/classes/" className="flex-1 text-center bg-[#1A1A1A] text-[#FFF8F0] py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all">
            瀏覽課堂
          </Link>
          <Link href="/courts/" className="flex-1 text-center border-2 border-[#1A1A1A] text-[#1A1A1A] py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A] hover:text-[#FFF8F0] transition-all">
            預約球場
          </Link>
        </div>
      </div>
    </main>
  );
}
