import { supabase } from './supabase';

/**
 * Club-level booking policies, stored in the `settings` table with
 * club_id scoping. All fields are optional; callers should fall back to
 * platform defaults when a policy is not defined.
 *
 *   advance_days             — how many days in advance a member can book
 *                              (e.g. 14 means today + 13 future days).
 *   advance_days_public      — same, but for non-approved users (usually
 *                              stricter). Defaults to advance_days.
 *   daily_limit              — max bookings per member per day.
 *   members_priority_hours   — # of hours after a slot becomes bookable
 *                              where only members can book (early access).
 */
export interface BookingPolicy {
  advance_days: number;
  advance_days_public: number;
  daily_limit: number;
  members_priority_hours: number;
}

export const DEFAULT_POLICY: BookingPolicy = {
  advance_days: 14,
  advance_days_public: 7,
  daily_limit: 4,
  members_priority_hours: 0,
};

const POLICY_KEYS = [
  'advance_days',
  'advance_days_public',
  'daily_limit',
  'members_priority_hours',
] as const;

export async function getBookingPolicy(clubId: string): Promise<BookingPolicy> {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .eq('club_id', clubId)
    .in('key', POLICY_KEYS as unknown as string[]);

  const out: BookingPolicy = { ...DEFAULT_POLICY };
  for (const row of (data as Array<{ key: keyof BookingPolicy; value: string }> | null) || []) {
    const n = parseInt(row.value, 10);
    if (!Number.isNaN(n)) out[row.key] = n;
  }
  return out;
}

export async function setBookingPolicyValue(clubId: string, key: keyof BookingPolicy, value: number): Promise<void> {
  const { data } = await supabase
    .from('settings')
    .select('id')
    .eq('club_id', clubId)
    .eq('key', key)
    .maybeSingle();
  if (data) {
    await supabase.from('settings').update({ value: String(value) }).eq('id', (data as any).id);
  } else {
    await supabase.from('settings').insert({ club_id: clubId, key, value: String(value) });
  }
}

/**
 * Is a given date within the bookable window for this user?
 *
 * @param dateStr   booking date, YYYY-MM-DD (HKT-local)
 * @param approved  whether the user is an approved member of the club
 */
export function isWithinAdvanceWindow(
  dateStr: string,
  approved: boolean,
  policy: BookingPolicy
): boolean {
  const hk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
  hk.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const diffDays = Math.round((target.getTime() - hk.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return false;
  const max = approved ? policy.advance_days : policy.advance_days_public;
  return diffDays < max;
}

/**
 * Count how many bookings a user already has on a given date. Used to
 * enforce daily_limit. Uses a head count via Supabase.
 */
export async function getUserDayBookingCount(
  clubId: string,
  userId: string,
  dateStr: string
): Promise<number> {
  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .eq('date', dateStr)
    .eq('status', 'confirmed');
  return count ?? 0;
}
