'use client';

import Link from 'next/link';
import ClubForm, { EMPTY_CLUB } from '../ClubForm';

export default function NewClubPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/clubs" className="text-sm text-[#1A1A1A]/50 hover:text-[#C4A265]">← 球會管理</Link>
        <h1 className="text-3xl font-bold text-[#1A1A1A] mt-2">新增球會</h1>
        <p className="text-[#1A1A1A]/60 mt-1">建立新球會後會自動建立預設開放時間／預約規則。</p>
      </div>
      <ClubForm initial={EMPTY_CLUB} mode={{ type: 'create' }} />
    </div>
  );
}
