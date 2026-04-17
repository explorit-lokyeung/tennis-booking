'use client';

import { useState } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';

type TennisClass = {
  id: string;
  name: string;
  coach: string;
  initials: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  day: string;
  time: string;
  location: string;
  spotsAvailable: number;
  spotsTotal: number;
  price: number;
  description: string;
};

export default function ClassDetail({ classData }: { classData: TennisClass }) {
  const [showToast, setShowToast] = useState(false);

  const levelColors = {
    Beginner: 'bg-green-500',
    Intermediate: 'bg-amber-500',
    Advanced: 'bg-red-500',
  };

  const handleBooking = () => {
    const user = localStorage.getItem('tennisClubUser');
    if (!user) {
      window.location.href = '/tennis-booking/login/';
      return;
    }

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/classes/"
          className="inline-flex items-center text-[#1A1A1A]/60 hover:text-[#C4A265] mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回課程列表
        </Link>

        {/* Class Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
            <div className="flex-1 mb-4 md:mb-0">
              <span className={`${levelColors[classData.level]} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide inline-block mb-4`}>
                {classData.level}
              </span>
              <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">{classData.name}</h1>
              <p className="text-xl text-[#1A1A1A]/70">{classData.description}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-[#C4A265]">${classData.price}</div>
              <div className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide mt-1">每堂</div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#1A1A1A]/10 my-8"></div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Coach */}
            <div>
              <h3 className="text-sm font-medium text-[#1A1A1A]/60 uppercase tracking-wide mb-3">
                教練
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#C4A265] flex items-center justify-center text-white font-bold text-xl">
                  {classData.initials}
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">{classData.coach}</p>
                  <p className="text-sm text-[#1A1A1A]/60">專業教練</p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="text-sm font-medium text-[#1A1A1A]/60 uppercase tracking-wide mb-3">
                時間表
              </h3>
              <p className="text-lg font-bold text-[#1A1A1A] mb-1">{classData.day}</p>
              <p className="text-[#1A1A1A]/70">{classData.time}</p>
              <p className="text-[#1A1A1A]/70 mt-2">{classData.location}</p>
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-sm font-medium text-[#1A1A1A]/60 uppercase tracking-wide mb-3">
                剩餘名額
              </h3>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-[#1A1A1A]">{classData.spotsAvailable}</span>
                <span className="text-[#1A1A1A]/60">/ {classData.spotsTotal} 個名額</span>
              </div>
              <div className="w-full bg-[#1A1A1A]/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#C4A265] h-full rounded-full transition-all"
                  style={{ width: `${(classData.spotsAvailable / classData.spotsTotal) * 100}%` }}
                />
              </div>
            </div>

            {/* Level Info */}
            <div>
              <h3 className="text-sm font-medium text-[#1A1A1A]/60 uppercase tracking-wide mb-3">
                程度
              </h3>
              <p className="text-lg font-bold text-[#1A1A1A]">{classData.level}</p>
              <p className="text-[#1A1A1A]/70 mt-2">
                {classData.level === 'Beginner' && '適合初學者'}
                {classData.level === 'Intermediate' && '適合有基礎嘅球員'}
                {classData.level === 'Advanced' && '適合進階球員'}
              </p>
            </div>
          </div>

          {/* Book Button */}
          <button
            onClick={handleBooking}
            disabled={classData.spotsAvailable === 0}
            className={`w-full py-4 rounded-full font-bold text-lg transition-colors ${
              classData.spotsAvailable === 0
                ? 'bg-[#1A1A1A]/20 text-[#1A1A1A]/40 cursor-not-allowed'
                : 'bg-[#1A1A1A] text-[#FFF8F0] hover:bg-[#2A2A2A]'
            }`}
          >
            {classData.spotsAvailable === 0 ? '已滿額' : '立即報名'}
          </button>
        </div>
      </div>

      {showToast && (
        <Toast
          message="課堂報名成功！"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
