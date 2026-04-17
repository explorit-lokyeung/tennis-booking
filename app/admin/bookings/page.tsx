'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Booking {
  id: string;
  user_id: string;
  slot_id: string;
  court_id: string;
  date: string;
  hour: number;
  status: string;
  created_at: string;
}

const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) { router.push('/admin/'); return; }
      fetchBookings();
    };
    checkAuth();
  }, [router]);

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('date', { ascending: false });
    if (data) setBookings(data);
    setLoading(false);
  };

  const cancelBooking = async (booking: Booking) => {
    if (!confirm(`確定取消 ${booking.date} ${fmtHour(booking.hour)} 嘅預約？`)) return;
    // Reset slot
    await supabase.from('slots').update({ status: 'available', booked_by: null }).eq('id', booking.slot_id);
    // Delete booking
    await supabase.from('bookings').delete().eq('id', booking.id);
    fetchBookings();
  };

  const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <nav className="bg-[#1A1A1A] text-[#FFF8F0] px-6 py-3 flex items-center gap-6">
        <span className="font-bold">管理員</span>
        <Link href="/admin/classes/" className="text-sm hover:text-[#C4A265]">課堂</Link>
        <Link href="/admin/courts/" className="text-sm hover:text-[#C4A265]">場地</Link>
        <Link href="/admin/bookings/" className="text-sm text-[#C4A265]">預約</Link>
        <button onClick={() => { supabase.auth.signOut().then(() => router.push('/admin/')); }} className="ml-auto text-sm text-red-400">登出</button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">預約管理</h1>
          <span className="text-sm text-[#1A1A1A]/50">共 {bookings.length} 個預約</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#1A1A1A]/40">載入中...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-[#1A1A1A]/40">暫無預約</div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const d = new Date(b.date + 'T00:00:00');
              return (
                <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-[#FFF8F0] rounded-xl flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#1A1A1A]">{d.getDate()}</span>
                    <span className="text-xs text-[#1A1A1A]/50">{d.getMonth() + 1}月 星期{DAY_NAMES[d.getDay()]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1A1A1A]">{b.court_id.replace('court-', 'Court ').toUpperCase()}</p>
                    <p className="text-sm text-[#1A1A1A]/50">{fmtHour(b.hour)}</p>
                    <p className="text-xs text-[#1A1A1A]/30">User: {b.user_id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{b.status === 'confirmed' ? '已確認' : b.status}</span>
                    <button onClick={() => cancelBooking(b)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold">取消</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
