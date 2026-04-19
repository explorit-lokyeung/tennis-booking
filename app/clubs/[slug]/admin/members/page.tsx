'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useClub } from '@/lib/club';
import { useAuth } from '@/lib/auth-context';
import { logAudit } from '@/lib/audit';
import type { ClubMembership, MembershipRole, MembershipStatus } from '@/lib/types';

type MemberRow = ClubMembership & {
  user_email?: string;
  user_name?: string;
};

const STATUS_LABEL: Record<MembershipStatus, string> = {
  pending: '待審批', approved: '已批准', rejected: '已拒絕', suspended: '已停用',
};
const STATUS_STYLE: Record<MembershipStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-200 text-gray-600',
};
const ROLE_LABEL: Record<MembershipRole, string> = {
  member: '會員', coach: '教練', admin: '管理員', owner: '東主',
};

export default function ClubAdminMembersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { club } = useClub(slug);
  const { user } = useAuth();

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [filter, setFilter] = useState<MembershipStatus | 'all'>('pending');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('member');
  const [inviteError, setInviteError] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => { if (club) fetchMembers(); }, [club]);

  const fetchMembers = async () => {
    if (!club) return;
    const { data } = await supabase.from('club_memberships').select('*').eq('club_id', club.id).order('created_at', { ascending: false });
    if (!data) return;
    const userIds = data.map((r: any) => r.user_id);
    let users: any[] = [];
    if (userIds.length) {
      try {
        const res: any = await supabase.rpc('find_users_by_ids', { ids: userIds });
        users = (res?.data as any[]) || [];
      } catch {
        users = [];
      }
    }
    const byId: Record<string, any> = {};
    users.forEach((u: any) => { byId[u.id] = u; });
    setRows(data.map((r: any) => ({ ...r, user_email: byId[r.user_id]?.email, user_name: byId[r.user_id]?.raw_user_meta_data?.name })));
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(r => r.status === filter);
  }, [rows, filter]);

  const updateStatus = async (id: string, status: MembershipStatus) => {
    await supabase.from('club_memberships').update({ status }).eq('id', id);
    if (club && user) logAudit(club.id, user.id, `會員狀態變更: ${status}`, `membership_id: ${id}`);
    fetchMembers();
  };

  const updateRole = async (id: string, role: MembershipRole) => {
    await supabase.from('club_memberships').update({ role }).eq('id', id);
    if (club && user) logAudit(club.id, user.id, `會員角色變更: ${role}`, `membership_id: ${id}`);
    fetchMembers();
  };

  const removeMember = async (id: string) => {
    if (!confirm('確定移除此會員？')) return;
    await supabase.from('club_memberships').delete().eq('id', id);
    fetchMembers();
  };

  const searchUser = async (q: string) => {
    setInviteEmail(q); setInviteError('');
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.rpc('find_user_by_email', { search_email: '%' + q + '%' });
    setSearchResults(data || []);
  };

  const invite = async (userId: string) => {
    if (!club) return;
    const { data: existing } = await supabase.from('club_memberships').select('id').eq('club_id', club.id).eq('user_id', userId).maybeSingle();
    if (existing) { setInviteError('此用戶已經係會員或有申請中'); return; }
    await supabase.from('club_memberships').insert({ club_id: club.id, user_id: userId, role: inviteRole, status: 'approved' });
    setInviteEmail(''); setSearchResults([]);
    fetchMembers();
  };

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    suspended: rows.filter(r => r.status === 'suspended').length,
    all: rows.length,
  }), [rows]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">會員管理</h1>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-8">
        <h2 className="font-bold text-[#1A1A1A] mb-3">新增會員／教練</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <input type="text" value={inviteEmail} onChange={e => searchUser(e.target.value)}
              placeholder="輸入電郵搜尋用戶..."
              className="w-full px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-sm focus:outline-none focus:border-[#C4A265]" />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#1A1A1A]/10 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {searchResults.map((u: any) => (
                  <button key={u.id} onClick={() => invite(u.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#FFF8F0] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[#1A1A1A]">{u.raw_user_meta_data?.name || u.email.split('@')[0]}</span>
                      <span className="text-xs text-[#1A1A1A]/40 ml-2">{u.email}</span>
                    </div>
                    <span className="text-xs text-[#C4A265] font-semibold">+ 加入為{ROLE_LABEL[inviteRole]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as MembershipRole)}
            className="px-4 py-2 rounded-lg border border-[#1A1A1A]/20 bg-white text-sm">
            <option value="member">會員</option>
            <option value="coach">教練</option>
            <option value="admin">管理員</option>
          </select>
        </div>
        {inviteError && <p className="text-red-500 text-xs mt-2">{inviteError}</p>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['pending', 'approved', 'rejected', 'suspended', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === f ? 'bg-[#1A1A1A] text-[#FFF8F0]' : 'bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
            }`}>
            {f === 'all' ? '全部' : STATUS_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#1A1A1A]/50">沒有符合條件嘅會員</div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]/5">
            {filtered.map(r => (
              <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-[#1A1A1A]">{r.user_name || r.user_email?.split('@')[0] || '未知'}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 mt-1">{r.user_email || r.user_id} · 申請於 {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={r.role} onChange={e => updateRole(r.id, e.target.value as MembershipRole)}
                    className="px-3 py-1.5 rounded-lg border border-[#1A1A1A]/20 text-sm">
                    <option value="member">會員</option>
                    <option value="coach">教練</option>
                    <option value="admin">管理員</option>
                    <option value="owner">東主</option>
                  </select>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(r.id, 'approved')} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600">批准</button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600">拒絕</button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={() => updateStatus(r.id, 'suspended')} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600">停用</button>
                  )}
                  {r.status === 'suspended' && (
                    <button onClick={() => updateStatus(r.id, 'approved')} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600">恢復</button>
                  )}
                  <button onClick={() => removeMember(r.id)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-red-50 hover:text-red-600">刪除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
