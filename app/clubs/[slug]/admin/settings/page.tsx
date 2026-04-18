'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useClub } from '@/lib/club';
import { getBookingPolicy, setBookingPolicyValue, DEFAULT_POLICY, type BookingPolicy } from '@/lib/policy';

export default function ClubAdminSettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { club } = useClub(slug);
  const [policy, setPolicy] = useState<BookingPolicy>(DEFAULT_POLICY);
  const [saving, setSaving] = useState<null | string>(null);
  const [saved, setSaved] = useState<string>('');

  useEffect(() => {
    if (!club) return;
    getBookingPolicy(club.id).then(setPolicy);
  }, [club]);

  const update = async (key: keyof BookingPolicy, value: number) => {
    if (!club) return;
    setSaving(key);
    await setBookingPolicyValue(club.id, key, value);
    setPolicy(p => ({ ...p, [key]: value }));
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(''), 1500);
  };

  const Field = ({ label, hint, k, min, max }: { label: string; hint: string; k: keyof BookingPolicy; min: number; max: number }) => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="font-bold text-[#1A1A1A]">{label}</h3>
          <p className="text-xs text-[#1A1A1A]/60 mt-0.5">{hint}</p>
        </div>
        {saved === k && <span className="text-xs text-emerald-600 font-semibold">已儲存</span>}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <input type="range" min={min} max={max} value={policy[k]}
          onChange={e => setPolicy(p => ({ ...p, [k]: +e.target.value }))}
          onMouseUp={e => update(k, +(e.target as HTMLInputElement).value)}
          onTouchEnd={e => update(k, +(e.target as HTMLInputElement).value)}
          className="flex-1 accent-[#C4A265]" />
        <input type="number" min={min} max={max} value={policy[k]}
          onChange={e => setPolicy(p => ({ ...p, [k]: +e.target.value }))}
          onBlur={e => update(k, +e.target.value)}
          className="w-20 px-3 py-2 rounded-lg border border-[#1A1A1A]/20 text-sm text-center" />
        <span className={`text-xs font-semibold ${saving === k ? 'text-[#C4A265]' : 'text-transparent'}`}>{saving === k ? '...' : '✓'}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">預約規則</h1>
      <p className="text-[#1A1A1A]/60 mb-8">{club?.name} · 設定會員與公眾嘅預約窗口同限制</p>

      <div className="space-y-4">
        <Field label="會員預約窗口" hint="會員可以預約未來幾日嘅時段（例如 14 = 今日加未來 13 日）" k="advance_days" min={1} max={60} />
        <Field label="公眾預約窗口" hint="未成為會員嘅用戶可以預約幾日之內嘅時段" k="advance_days_public" min={0} max={60} />
        <Field label="每日預約上限" hint="每個會員一日最多可以預約幾多個時段（0 = 冇限制）" k="daily_limit" min={0} max={12} />
        <Field label="會員優先時數" hint="新開放嘅時段會員可以搶先幾個鐘（未實作，將來用）" k="members_priority_hours" min={0} max={72} />
      </div>
    </div>
  );
}
