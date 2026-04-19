import type { CourtPricingRule, PricingDayType } from './types';

const DAY_MAP: Record<number, PricingDayType> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

const WEEKDAYS: PricingDayType[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS: PricingDayType[] = ['sat', 'sun'];

/**
 * Get the price for a specific court, date, and hour.
 * Rules are matched by priority (higher wins), then specificity.
 */
export function getPrice(
  rules: CourtPricingRule[],
  defaultRate: number,
  date: Date,
  hour: number
): number {
  const dayOfWeek = date.getDay(); // 0=Sun
  const dayName = DAY_MAP[dayOfWeek];
  const isWeekend = WEEKENDS.includes(dayName);

  const matching = rules.filter(r => {
    // Check hour range
    if (hour < r.hour_start || hour >= r.hour_end) return false;
    // Check day type
    if (r.day_type === 'all') return true;
    if (r.day_type === 'weekday' && !isWeekend) return true;
    if (r.day_type === 'weekend' && isWeekend) return true;
    if (r.day_type === dayName) return true;
    return false;
  });

  if (matching.length === 0) return defaultRate;

  // Sort by priority desc, then specificity (specific day > weekday/weekend > all)
  matching.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const specScore = (t: PricingDayType) => {
      if (['mon','tue','wed','thu','fri','sat','sun'].includes(t)) return 3;
      if (t === 'weekend' || t === 'weekday') return 2;
      if (t === 'holiday') return 3;
      return 1; // 'all'
    };
    return specScore(b.day_type) - specScore(a.day_type);
  });

  return matching[0].price;
}

export const DAY_TYPE_LABELS: Record<PricingDayType, string> = {
  all: '全部日子',
  weekday: '平日 (一至五)',
  weekend: '週末 (六日)',
  mon: '星期一',
  tue: '星期二',
  wed: '星期三',
  thu: '星期四',
  fri: '星期五',
  sat: '星期六',
  sun: '星期日',
  holiday: '公眾假期',
};
