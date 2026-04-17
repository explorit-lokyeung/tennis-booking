export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="skeleton h-4 w-20 mb-3" />
      <div className="skeleton h-6 w-3/4 mb-4" />
      <div className="skeleton h-4 w-1/2 mb-2" />
      <div className="skeleton h-4 w-2/3 mb-4" />
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function CourtGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 42 }).map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-lg" style={{ animationDelay: `${i * 20}ms` }} />
      ))}
    </div>
  );
}
