'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import ClassCard from "@/components/ClassCard";
import { supabase } from "@/lib/supabase";

type TennisClass = {
  id: string;
  name: string;
  coach: string;
  initials: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  day: string;
  time: string;
  spotsAvailable: number;
  spotsTotal: number;
  price: number;
  description: string;
};

export default function Home() {
  const [featuredClasses, setFeaturedClasses] = useState<TennisClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    supabase.from('classes').select('*').limit(3)
      .then(({ data }) => { if (data) setFeaturedClasses(data as any); setLoadingClasses(false); });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] text-white py-20 px-4 bg-fixed">
        <div className="max-w-7xl mx-auto text-center">
          <div className="absolute top-10 right-10 text-8xl opacity-10 animate-bounce-in hidden md:block">🎾</div>
          <div className="absolute bottom-10 left-10 text-6xl opacity-10 animate-bounce-in hidden md:block">🏆</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            歡迎嚟到<br />
            <span className="text-[#C4A265]">網球俱樂部</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            預約球場。提升球技。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/classes/"
              className="bg-[#1A1A1A] text-[#FFF8F0] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#2A2A2A] transition-colors"
            >
              瀏覽課堂
            </Link>
            <Link
              href="/courts/"
              className="bg-[#C4A265] text-[#1A1A1A] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#D4B275] transition-colors"
            >
              預約球場
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center animate-fade-in">
            <div>
              <div className="text-4xl font-bold text-[#C4A265] mb-2">6</div>
              <div className="text-sm uppercase tracking-wide text-[#1A1A1A]/60">個球場</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#C4A265] mb-2">10+</div>
              <div className="text-sm uppercase tracking-wide text-[#1A1A1A]/60">堂課程</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#C4A265] mb-2">8</div>
              <div className="text-sm uppercase tracking-wide text-[#1A1A1A]/60">位教練</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#C4A265] mb-2">500+</div>
              <div className="text-sm uppercase tracking-wide text-[#1A1A1A]/60">活躍會員</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Classes */}
      <section className="py-16 px-4 bg-[#FFF8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1A1A1A] mb-4 animate-fade-in">精選課程</h2>
            <p className="text-lg text-[#1A1A1A]/70">加入我哋最受歡迎嘅網球課程</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredClasses.map((classItem) => (
              <ClassCard key={classItem.id} {...classItem} />
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/classes/"
              className="inline-block bg-[#1A1A1A] text-[#FFF8F0] px-8 py-3 rounded-full font-bold hover:bg-[#2A2A2A] transition-colors"
            >
              查看所有課程
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
