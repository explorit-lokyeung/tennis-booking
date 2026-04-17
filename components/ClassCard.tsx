import Link from 'next/link';

type ClassCardProps = {
  id: string;
  name: string;
  coach: string;
  initials: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  day: string;
  time: string;
  spotsAvailable: number;
  spotsTotal: number;
  price: number;
};

export default function ClassCard({
  id,
  name,
  coach,
  initials,
  level,
  day,
  time,
  spotsAvailable,
  spotsTotal,
  price,
}: ClassCardProps) {
  const levelColors = {
    Beginner: 'bg-green-500',
    Intermediate: 'bg-amber-500',
    Advanced: 'bg-red-500',
  };

  const spotsPercentage = (spotsAvailable / spotsTotal) * 100;

  return (
    <Link href={`/classes/${id}/`}>
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 h-full cursor-pointer">
        {/* Level Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`${levelColors[level]} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide`}>
            {level}
          </span>
          <span className="text-2xl font-bold text-[#1A1A1A]">${price}</span>
        </div>

        {/* Class Name */}
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{name}</h3>

        {/* Coach */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#C4A265] flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{coach}</p>
            <p className="text-xs text-[#1A1A1A]/60">教練</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-4">
          <p className="text-sm text-[#1A1A1A]/80">
            <span className="font-semibold">{day}</span> · {time}
          </p>
        </div>

        {/* Spots Available */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-[#1A1A1A]/60 uppercase tracking-wide">
              剩餘名額
            </span>
            <span className="text-sm font-bold text-[#1A1A1A]">
              {spotsAvailable}/{spotsTotal}
            </span>
          </div>
          <div className="w-full bg-[#1A1A1A]/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#C4A265] h-full rounded-full transition-all"
              style={{ width: `${spotsPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
