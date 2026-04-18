'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Club } from '@/lib/types';

interface ClubSettings {
  open_hour?: string;
  close_hour?: string;
  lat?: string;
  lng?: string;
  area?: string;
}

export interface ClubFormValue {
  slug: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  is_active: boolean;
  settings: ClubSettings;
}

export const EMPTY_CLUB: ClubFormValue = {
  slug: '', name: '', description: '', address: '', phone: '', email: '', website: '',
  logo_url: '', is_active: true,
  settings: { open_hour: '7', close_hour: '23', lat: '', lng: '', area: '' },
};

function toFormValue(c: Club): ClubFormValue {
  const s = (c.settings ?? {}) as Record<string, unknown>;
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    address: c.address ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    website: c.website ?? '',
    logo_url: c.logo_url ?? '',
    is_active: c.is_active,
    settings: {
      open_hour: String(s.open_hour ?? '7'),
      close_hour: String(s.close_hour ?? '23'),
      lat: s.lat != null ? String(s.lat) : '',
      lng: s.lng != null ? String(s.lng) : '',
      area: (s.area as string) ?? '',
    },
  };
}

export function clubToFormValue(c: Club): ClubFormValue { return toFormValue(c); }

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-[#1A1A1A]/10 bg-white text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:border-[#C4A265]";

type Mode = { type: 'create' } | { type: 'edit'; clubId: string };

export default function ClubForm({ initial, mode }: { initial: ClubFormValue; mode: Mode }) {
  const router = useRouter();
  const [form, setForm] = useState<ClubFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = <K extends keyof ClubFormValue>(k: K, v: ClubFormValue[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const updateSetting = <K extends keyof ClubSettings>(k: K, v: string) =>
    setForm(prev => ({ ...prev, settings: { ...prev.settings, [k]: v } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.slug.trim() || !form.name.trim()) {
      setError('請輸入球會名稱同 slug');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('Slug 只可以用細楷英文、數字、「-」');
      return;
    }

    setSaving(true);

    const settingsJson: Record<string, unknown> = {};
    if (form.settings.open_hour) settingsJson.open_hour = form.settings.open_hour;
    if (form.settings.close_hour) settingsJson.close_hour = form.settings.close_hour;
    if (form.settings.area) settingsJson.area = form.settings.area;
    if (form.settings.lat) settingsJson.lat = parseFloat(form.settings.lat);
    if (form.settings.lng) settingsJson.lng = parseFloat(form.settings.lng);

    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      is_active: form.is_active,
      settings: settingsJson,
    };

    if (mode.type === 'create') {
      const { data, error: err } = await supabase.from('clubs').insert(payload).select('id').single();
      if (err) { setError(err.message); setSaving(false); return; }
      const newId = data?.id as string;

      // Auto-create default settings rows (matches Club admin courts page expectations)
      if (newId) {
        const rows = [
          { club_id: newId, key: 'open_hour',   value: form.settings.open_hour || '7'  },
          { club_id: newId, key: 'close_hour',  value: form.settings.close_hour || '23' },
          { club_id: newId, key: 'advance_days', value: '14' },
          { club_id: newId, key: 'advance_days_public', value: '7' },
          { club_id: newId, key: 'daily_limit', value: '3' },
          { club_id: newId, key: 'members_priority_hours', value: '24' },
        ];
        await supabase.from('settings').insert(rows);
      }

      router.push('/admin/clubs');
    } else {
      const { error: err } = await supabase.from('clubs').update(payload).eq('id', mode.clubId);
      if (err) { setError(err.message); setSaving(false); return; }
      router.push('/admin/clubs');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">基本資料</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">球會名稱 *</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">Slug *</label>
            <input type="text" value={form.slug} onChange={e => update('slug', e.target.value.toLowerCase())}
              required pattern="[a-z0-9-]+" placeholder="e.g. happy-valley-tc" className={inputCls} />
            <p className="text-xs text-[#1A1A1A]/40 mt-1">URL: /clubs/{form.slug || 'your-slug'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">描述</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)}
              rows={3} className={`${inputCls} resize-none`} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">聯絡資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">地址</label>
            <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">電話</label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">電郵</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">網址</label>
            <input type="url" value={form.website} onChange={e => update('website', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">Logo URL</label>
            <input type="url" value={form.logo_url} onChange={e => update('logo_url', e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">設定</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">開放時間（由）</label>
            <select value={form.settings.open_hour || '7'} onChange={e => updateSetting('open_hour', e.target.value)} className={inputCls}>
              {Array.from({ length: 12 }, (_, i) => i + 5).map(h => <option key={h} value={String(h)}>{h}:00</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">關閉時間（至）</label>
            <select value={form.settings.close_hour || '23'} onChange={e => updateSetting('close_hour', e.target.value)} className={inputCls}>
              {Array.from({ length: 12 }, (_, i) => i + 13).map(h => <option key={h} value={String(h)}>{h}:00</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">地區（港島／九龍／新界）</label>
            <select value={form.settings.area || ''} onChange={e => updateSetting('area', e.target.value)} className={inputCls}>
              <option value="">— 未指定 —</option>
              <option value="港島">港島</option>
              <option value="九龍">九龍</option>
              <option value="新界">新界</option>
            </select>
          </div>
          <div />
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">緯度 (lat)</label>
            <input type="text" inputMode="decimal" value={form.settings.lat || ''}
              onChange={e => updateSetting('lat', e.target.value)} placeholder="22.2783" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A]/70 mb-1">經度 (lng)</label>
            <input type="text" inputMode="decimal" value={form.settings.lng || ''}
              onChange={e => updateSetting('lng', e.target.value)} placeholder="114.1747" className={inputCls} />
          </div>
          <label className="flex items-center gap-3 md:col-span-2 mt-2">
            <input type="checkbox" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-semibold text-[#1A1A1A]">啟用球會（對公眾顯示）</span>
          </label>
        </div>
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 md:flex-none bg-[#1A1A1A] text-[#FFF8F0] px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all disabled:opacity-50">
          {saving ? '儲存中...' : mode.type === 'create' ? '建立球會' : '儲存'}
        </button>
        <Link href="/admin/clubs"
          className="flex-1 md:flex-none text-center bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:border-[#C4A265] transition-all">
          取消
        </Link>
      </div>
    </form>
  );
}
