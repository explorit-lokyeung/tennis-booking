'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void }>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-[#1A1A1A]' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`${colors[t.type]} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-slide-in pointer-events-auto`}>
            <span>{icons[t.type]}</span> {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
