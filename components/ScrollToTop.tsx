'use client';
import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 md:bottom-8 right-4 z-50 w-12 h-12 bg-[#1A1A1A] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#C4A265] transition-all duration-300 animate-bounce-in text-lg">
      ↑
    </button>
  );
}
