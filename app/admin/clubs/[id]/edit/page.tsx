'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Club } from '@/lib/types';
import ClubForm, { clubToFormValue, ClubFormValue } from '../../ClubForm';

export default function EditClubPage() {
  const params = useParams();
  const clubId = params?.id as string;
  const [initial, setInitial] = useState<ClubFormValue | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    supabase.from('clubs').select('*').eq('id', clubId).maybeSingle().then(({ data }) => {
      if (!data) { setNotFound(true); return; }
      setInitial(clubToFormValue(data as Club));
    });
  }, [clubId]);

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">找不到球會</h1>
        <Link href="/admin/clubs" className="text-[#C4A265] font-semibold">← 返回球會管理</Link>
      </div>
    );
  }

  if (!initial) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-[#1A1A1A]/60">載入中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/clubs" className="text-sm text-[#1A1A1A]/50 hover:text-[#C4A265]">← 球會管理</Link>
        <h1 className="text-3xl font-bold text-[#1A1A1A] mt-2">編輯球會</h1>
        <p className="text-[#1A1A1A]/60 mt-1">{initial.name}</p>
      </div>
      <ClubForm initial={initial} mode={{ type: 'edit', clubId }} />
    </div>
  );
}
