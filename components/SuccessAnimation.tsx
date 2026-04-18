'use client';

export default function SuccessAnimation({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-10 text-center animate-bounce-in shadow-2xl max-w-sm mx-4">
        <svg className="w-14 h-14 mx-auto mb-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">{message}</h3>
        <p className="text-sm text-gray-500">你可以喺「我的預約」查看詳情</p>
      </div>
    </div>
  );
}
