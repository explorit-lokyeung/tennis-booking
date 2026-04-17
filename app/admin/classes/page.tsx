'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type TennisClass = {
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
  visible?: boolean;
  start_date?: string;
  end_date?: string;
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<TennisClass[]>([]);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TennisClass>>({
    name: '',
    coach: '',
    level: 'Beginner',
    day: '',
    time: '',
    location: '',
    spots_available: 10,
    spots_total: 10,
    price: 0,
    description: '',
    visible: true,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // Wait for Supabase to restore session from localStorage
      await new Promise(r => setTimeout(r, 500));
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[ADMIN DEBUG] session:', session ? 'EXISTS user=' + session.user.email : 'NULL');
      console.log('[ADMIN DEBUG] localStorage keys:', Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-')));
      if (cancelled) return;
      if (!session?.user) { console.log('[ADMIN DEBUG] NO SESSION'); setPageLoading(false); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
      if (cancelled) return;
      if (!profile?.is_admin) { router.push('/admin/'); return; }
      setPageLoading(false);
      fetchClasses();
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const fetchParticipants = async (classId: string) => {
    if (expandedClass === classId) { setExpandedClass(null); return; }
    setExpandedClass(classId);
    setLoadingParticipants(true);
    const { data } = await supabase.rpc('get_class_participants', { p_class_id: classId });
    setParticipants(data || []);
    setLoadingParticipants(false);
  };

  const removeParticipant = async (bookingId: string, classId: string) => {
    if (!confirm('確定移除此參加者？')) return;
    await supabase.from('class_bookings').delete().eq('id', bookingId);
    // Update spots
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      await supabase.from('classes').update({ spots_available: cls.spots_available + 1 }).eq('id', classId);
    }
    fetchParticipants(classId);
    setExpandedClass(null); // force re-expand
    setTimeout(() => fetchParticipants(classId), 100);
    fetchClasses();
  };

  const searchUsers = async (query: string) => {
    setAddEmail(query);
    setAddError('');
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.rpc('find_user_by_email', { search_email: '%' + query + '%' });
    setSearchResults(data || []);
    setSearching(false);
  };

  const addParticipant = async (classId: string, userId: string, userEmail: string) => {
    setAddError('');
    const { data: existing } = await supabase.from('class_bookings').select('id').eq('class_id', classId).eq('user_id', userId);
    if (existing && existing.length > 0) {
      setAddError('此用戶已報名');
      return;
    }
    await supabase.from('class_bookings').insert({ class_id: classId, user_id: userId, status: 'confirmed' });
    const cls = classes.find(cl => cl.id === classId);
    if (cls && cls.spots_available > 0) {
      await supabase.from('classes').update({ spots_available: cls.spots_available - 1 }).eq('id', classId);
    }
    setAddEmail('');
    setSearchResults([]);
    setExpandedClass(null);
    setTimeout(() => fetchParticipants(classId), 100);
    fetchClasses();
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('id');
    if (data) setClasses(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // Update existing class
      await supabase.from('classes').update(formData).eq('id', editingId);
    } else {
      // Create new class
      await supabase.from('classes').insert([formData]);
    }
    fetchClasses();
    resetForm();
  };

  const handleEdit = (cls: TennisClass) => {
    setEditingId(cls.id);
    setFormData(cls);
    setShowForm(true);
  };

  const handleToggleVisible = async (id: string, currentVisible: boolean) => {
    console.log('Toggle visible:', id, 'from', currentVisible, 'to', !currentVisible);
    const { data, error } = await supabase.from('classes').update({ visible: !currentVisible }).eq('id', id).select();
    console.log('Toggle result:', data, error);
    if (error) alert('更新失敗: ' + error.message);
    fetchClasses();
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除這個課程？')) {
      await supabase.from('classes').delete().eq('id', id);
      fetchClasses();
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      coach: '',
      level: 'Beginner',
      day: '',
      time: '',
      location: '',
      spots_available: 10,
      spots_total: 10,
      price: 0,
      description: '',
      visible: true,
      start_date: '',
      end_date: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">課程管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#C4A265] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#C4A265]/80 transition-all"
        >
          {showForm ? '取消' : '+ 新增課程'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">
            {editingId ? '編輯課程' : '新增課程'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">課程名稱</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">教練</label>
              <input
                type="text"
                value={formData.coach}
                onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">程度</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
              >
                <option value="Beginner">初級</option>
                <option value="Intermediate">中級</option>
                <option value="Advanced">高級</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">星期</label>
              <input
                type="text"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                placeholder="例：星期一"
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">時間</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="例：6:00 PM - 8:00 PM"
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">地點</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">可用名額</label>
              <input
                type="number"
                value={formData.spots_available}
                onChange={(e) => setFormData({ ...formData, spots_available: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">總名額</label>
              <input
                type="number"
                value={formData.spots_total}
                onChange={(e) => setFormData({ ...formData, spots_total: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">開始日期</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">結束日期</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">價格</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265]"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C4A265] h-24"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.visible ?? true}
                onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-[#1A1A1A]">在公開頁面顯示</label>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="bg-[#1A1A1A] text-[#FFF8F0] px-8 py-2 rounded-lg font-semibold hover:bg-[#1A1A1A]/80 transition-all"
              >
                {editingId ? '更新' : '新增'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-white text-[#1A1A1A] px-8 py-2 rounded-lg font-semibold border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 transition-all"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes List */}
      <div className="grid gap-4">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-[#1A1A1A]">{cls.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  cls.visible !== false
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {cls.visible !== false ? '顯示中' : '已隱藏'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-[#1A1A1A]/70">
                <div>教練：{cls.coach}</div>
                <div>程度：{cls.level === 'Beginner' ? '初級' : cls.level === 'Intermediate' ? '中級' : '高級'}</div>
                <div>{cls.day} {cls.time}</div>
                <div>名額：{cls.spots_available}/{cls.spots_total}</div>
                <div>地點：{cls.location}</div>
                <div>價格：${cls.price}</div>
                {(cls.start_date || cls.end_date) && (
                  <div>日期：{cls.start_date || '?'} → {cls.end_date || '?'}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4 flex-wrap">
              <button
                onClick={() => fetchParticipants(cls.id)}
                className="px-4 py-2 rounded-lg font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
              >
                👥 參加者
              </button>
              <button
                onClick={() => handleToggleVisible(cls.id, cls.visible !== false)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  cls.visible !== false
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {cls.visible !== false ? '隱藏' : '顯示'}
              </button>
              <button
                onClick={() => handleEdit(cls)}
                className="px-4 py-2 rounded-lg font-semibold bg-[#C4A265]/10 text-[#C4A265] hover:bg-[#C4A265]/20 transition-all"
              >
                編輯
              </button>
              <button
                onClick={() => handleDelete(cls.id)}
                className="px-4 py-2 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all"
              >
                刪除
              </button>
            </div>
            </div>
            {expandedClass === cls.id && (
              <div className="mt-4 pt-4 border-t border-[#1A1A1A]/10 w-full">
                <h4 className="font-bold text-[#1A1A1A] mb-2">參加者列表</h4>
                {loadingParticipants ? (
                  <p className="text-sm text-[#1A1A1A]/40">載入中...</p>
                ) : participants.length === 0 ? (
                  <p className="text-sm text-[#1A1A1A]/40">暫無參加者</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map(p => (
                      <div key={p.booking_id || p.id} className="flex items-center justify-between bg-[#FFF8F0] p-3 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#1A1A1A]">{p.name || '未設名稱'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>{p.status === 'confirmed' ? '已確認' : p.status}</span>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-[#1A1A1A]/50">
                            <span>📧 {p.email || '—'}</span>
                            <span>📱 {p.phone || '—'}</span>
                            <span>報名：{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button onClick={() => removeParticipant(p.booking_id || p.id, cls.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold ml-3">移除</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 relative">
                  <input type="text" value={addEmail} onChange={e => searchUsers(e.target.value)}
                    placeholder="輸入電郵搜尋用戶..." className="w-full px-3 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] text-sm focus:outline-none focus:border-[#C4A265]" />
                  {searching && <p className="text-xs text-[#1A1A1A]/40 mt-1">搜尋中...</p>}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#1A1A1A]/10 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {searchResults.map((u: any) => (
                        <button key={u.id} onClick={() => addParticipant(cls.id, u.id, u.email)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#FFF8F0] transition-all flex items-center justify-between border-b border-[#1A1A1A]/5 last:border-0">
                          <div>
                            <span className="text-sm font-semibold text-[#1A1A1A]">{u.raw_user_meta_data?.name || u.email.split('@')[0]}</span>
                            <span className="text-xs text-[#1A1A1A]/40 ml-2">{u.email}</span>
                          </div>
                          <span className="text-xs text-[#C4A265] font-semibold">+ 加入</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {addEmail.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-xs text-[#1A1A1A]/40 mt-1">找不到匹配用戶</p>
                  )}
                </div>
                {addError && <p className="text-red-500 text-xs mt-1">{addError}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="text-center py-12 text-[#1A1A1A]/60">
          暫無課程資料
        </div>
      )}
    </div>
  );
}
