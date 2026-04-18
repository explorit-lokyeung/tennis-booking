'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  kind: string;
  subject: string;
  body: string;
  sent_at: string | null;
  created_at: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, kind, subject, body, sent_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setItems(data as Notification[]);
    setLoaded(true);
  };

  useEffect(() => {
    if (!userId) return;
    fetchItems();
    const iv = setInterval(fetchItems, 60000);
    return () => clearInterval(iv);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = loaded ? items.filter(n => !n.sent_at) : [];

  const markAllRead = async () => {
    if (unread.length === 0) return;
    const ids = unread.map(n => n.id);
    const nowIso = new Date().toISOString();
    await supabase.from('notifications').update({ sent_at: nowIso }).in('id', ids);
    setItems(prev => prev.map(n => n.sent_at ? n : { ...n, sent_at: nowIso }));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1A1A1A]/5 transition-colors"
        aria-label="通知"
      >
        <svg className="w-5 h-5 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-[#C4A265] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-[#1A1A1A]/5 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]/5">
            <h3 className="font-bold text-sm text-[#1A1A1A]">通知</h3>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#C4A265] font-semibold hover:underline">
                全部已讀
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <p className="p-6 text-sm text-[#1A1A1A]/40 text-center">載入中...</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-[#1A1A1A]/40 text-center">暫無通知</p>
            ) : (
              <ul className="divide-y divide-[#1A1A1A]/5">
                {items.map(n => (
                  <li key={n.id} className={`px-4 py-3 ${!n.sent_at ? 'bg-[#C4A265]/5' : ''}`}>
                    <div className="flex items-start gap-2">
                      {!n.sent_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#C4A265] flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{n.subject}</p>
                        <p className="text-xs text-[#1A1A1A]/60 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-[#1A1A1A]/30 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
