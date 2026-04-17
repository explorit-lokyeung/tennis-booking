'use client';

export default function SuccessAnimation({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-10 text-center animate-bounce-in shadow-2xl max-w-sm mx-4">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{message}</h3>
        <div className="flex justify-center gap-1 mt-4">
          {['🎾', '✨', '🏆'].map((e, i) => (
            <span key={i} className="text-2xl" style={{ animation: `bounce-in 0.4s ease-out ${i * 150}ms both` }}>{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
