import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-[10rem] leading-none font-black text-[#C4A265]/30 tracking-tighter select-none">404</p>
        <h1 className="text-2xl font-bold text-[#1A1A1A] -mt-4 mb-2">呢個頁面唔見咗</h1>
        <p className="text-sm text-[#1A1A1A]/60 mb-8">你搵嘅頁面可能已經移除、改名或暫時無法存取。</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="bg-[#1A1A1A] text-[#FFF8F0] px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-[#1A1A1A]/80 transition-all">
            返回首頁
          </Link>
          <Link href="/clubs" className="bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:border-[#C4A265] transition-all">
            瀏覽球會
          </Link>
        </div>
      </div>
    </main>
  );
}
