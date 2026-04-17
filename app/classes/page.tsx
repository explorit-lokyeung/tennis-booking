'use client';

import { useEffect, useState } from 'react';
import ClassCard from '@/components/ClassCard';
import { supabase } from '@/lib/supabase';

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

export default function ClassesPage() {
  const [classes, setClasses] = useState<TennisClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<TennisClass[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    supabase.from('classes').select('*').neq('visible', false).then(({ data }) => {
      if (!data) return;
      const mapped = data.map((c: any) => ({
        ...c, 
        spotsAvailable: c.spots_available, 
        spotsTotal: c.spots_total,
        initials: c.coach.replace('Coach ', '').split(' ').map((n: string) => n[0]).join(''),
      }));
        setClasses(data);
        setFilteredClasses(data);
      });
  }, []);

  useEffect(() => {
    let filtered = classes;

    // Filter by level
    if (levelFilter !== 'All') {
      filtered = filtered.filter(c => c.level === levelFilter);
    }

    // Filter by coach name
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.coach.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredClasses(filtered);
  }, [levelFilter, searchQuery, classes]);

  return (
    <div className="min-h-screen py-12 px-4 bg-[#FFF8F0]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-[#1A1A1A] mb-4">課程列表</h1>
          <p className="text-xl text-[#1A1A1A]/70">
            專業教練，適合所有程度
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Level Filter */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2 uppercase tracking-wide">
                程度
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
              >
                <option value="All">所有程度</option>
                <option value="Beginner">初級</option>
                <option value="Intermediate">中級</option>
                <option value="Advanced">高級</option>
              </select>
            </div>

            {/* Coach Search */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2 uppercase tracking-wide">
                搜尋教練
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋教練..."
                className="w-full px-4 py-3 rounded-full border border-[#1A1A1A]/20 bg-[#FFF8F0] text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#C4A265]"
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-[#1A1A1A]/60 uppercase tracking-wide">
            搵到 {filteredClasses.length} 堂課程
          </p>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((classItem) => (
            <ClassCard key={classItem.id} {...classItem} />
          ))}
        </div>

        {/* No Results */}
        {filteredClasses.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-[#1A1A1A]/60">搵唔到符合條件嘅課程</p>
          </div>
        )}
      </div>
    </div>
  );
}
