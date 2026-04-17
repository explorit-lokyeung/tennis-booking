'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface TennisClass {
  id: string;
  name: string;
  coach: string;
  level: string;
  day: string;
  time: string;
  location: string;
  spots_available: number;
  spots_total: number;
  price: number;
  description: string;
}

export default function ClassDetailClient() {
  const params = useParams();
  const id = params?.id as string;
  const [cls, setCls] = useState<TennisClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    supabase.from('classes').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setCls(data);
      setLoading(false);
    });
    // Check if already enrolled
    if (user) {
      supabase.from('class_bookings').select('id').eq('class_id', id).eq('user_id', user.id).then(({ data }) => {
        if (data && data.length > 0) { setEnrolled(true); setEnrollmentId(data[0].id); }
      });
    }
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) { window.location.href = '/tennis-booking/login/'; return; }
    if (!cls) return;
    setEnrolling(true);
    setError('');

    if (cls.spots_available <= 0) { setError('名額已滿'); setEnrolling(false); return; }

    const { error: insertErr } = await supabase.from('class_bookings').insert({
      class_id: cls.id, user_id: user.id, status: 'confirmed'
    });
    if (insertErr) { setError(insertErr.message.includes('duplicate') ? '你已報名此課程' : '報名失敗'); setEnrolling(false); return; }

    await supabase.from('classes').update({ spots_available: cls.spots_available - 1 }).eq('id', cls.id);
    setCls({ ...cls, spots_available: cls.spots_available - 1 });
    setEnrolled(true);
    setEnrolling(false);
  };

  const handleCancel = async () => {
    if (!confirm('確定取消報名？')) return;
    setCancelling(true);
    await supabase.from('class_bookings').delete().eq('id', enrollmentId);
    if (cls) {
      await supabase.from('classes').update({ spots_available: cls.spots_available + 1 }).eq('id', cls.id);
      setCls({ ...cls, spots_available: cls.spots_available + 1 });
    }
    setEnrolled(false);
    setEnrollmentId(null);
    setCancelling(false);
  };

  if (loading) return <div className="min-h-screen bg-[#FFF8F0]" />;
  if (!cls) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">找不到課程</h1>
        <Link href="/classes/" className="text-[#C4A265] font-semibold">返回課程列表</Link>
      </div>
    </div>
  );

  const initials = cls.coach.replace('Coach ', '').split(' ').map(n => n[0]).join('');
  const levelMap: Record<string, { label: string; color: string; desc: string }> = {
    'Beginner': { label: 'BEGINNER', color: 'bg-emerald-500', desc: '適合初學者' },
    'Intermediate': { label: 'INTERMEDIATE', color: 'bg-amber-500', desc: '適合有基礎嘅球員' },
    'Advanced': { label: 'ADVANCED', color: 'bg-red-500', desc: '適合進階球員' },
  };
  const lv = levelMap[cls.level] || levelMap['Beginner'];
  const spotsPercent = ((cls.spots_total - cls.spots_available) / cls.spots_total) * 100;

  return (
    <main className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/classes/" className="inline-flex items-center gap-1 text-[#1A1A1A]/60 hover:text-[#1A1A1A] mb-6 text-sm">
          ‹ 返回課程列表
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`${lv.color} text-white text-xs px-3 py-1 rounded-full font-bold uppercase`}>{lv.label}</span>
              <h1 className="text-3xl font-bold text-[#1A1A1A] mt-3">{cls.name}</h1>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-[#C4A265]">${cls.price}</span>
              <p className="text-xs text-[#1A1A1A]/40">每堂</p>
            </div>
          </div>

          <p className="text-[#1A1A1A]/60 mb-6">{cls.description}</p>
          <hr className="border-[#1A1A1A]/10 mb-6" />

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-[#1A1A1A]/40 mb-2">教練</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C4A265] flex items-center justify-center text-white font-bold text-sm">{initials}</div>
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{cls.coach}</p>
                  <p className="text-xs text-[#1A1A1A]/40">專業教練</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#1A1A1A]/40 mb-2">時間表</p>
              <p className="font-semibold text-[#1A1A1A]">{cls.day}</p>
              <p className="text-sm text-[#1A1A1A]/60">{cls.time}</p>
              <p className="text-sm text-[#1A1A1A]/60">{cls.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs text-[#1A1A1A]/40 mb-2">剩餘名額</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{cls.spots_available} <span className="text-sm font-normal text-[#1A1A1A]/40">/ {cls.spots_total} 個名額</span></p>
              <div className="w-full bg-[#1A1A1A]/10 rounded-full h-2 mt-2">
                <div className="bg-[#C4A265] h-2 rounded-full transition-all" style={{ width: `${spotsPercent}%` }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-[#1A1A1A]/40 mb-2">程度</p>
              <p className="font-semibold text-[#1A1A1A]">{lv.label}</p>
              <p className="text-sm text-[#1A1A1A]/60">{lv.desc}</p>
            </div>
          </div>

          {enrolled ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 text-emerald-700 py-4 rounded-2xl text-center font-bold">
                ✅ 你已報名此課程
              </div>
              <button onClick={handleCancel} disabled={cancelling}
                className="w-full border-2 border-red-300 text-red-500 py-3 rounded-2xl font-semibold hover:bg-red-50 transition-all disabled:opacity-50">
                {cancelling ? '取消中...' : '取消報名'}
              </button>
            </div>
          ) : (
            <button onClick={handleEnroll} disabled={enrolling || cls.spots_available <= 0}
              className="w-full bg-[#1A1A1A] text-[#FFF8F0] py-4 rounded-2xl font-bold text-lg hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50">
              {enrolling ? '報名中...' : cls.spots_available <= 0 ? '名額已滿' : '立即報名'}
            </button>
          )}
          {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
        </div>
      </div>
    </main>
  );
}
