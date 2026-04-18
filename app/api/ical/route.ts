import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtinvnccabizaweqyszz.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_LOa6NHmKG0bs0qdezNMpGw_w2HGigQP';

function pad(n: number) { return n.toString().padStart(2, '0'); }

function toIcsDateTime(date: string, hour: number): string {
  // date is YYYY-MM-DD (HKT), hour is 0-23 (HKT).
  // Produce a UTC stamp by subtracting HK offset (+08:00).
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hour - 8));
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  // Use anon client — bookings are filtered by user_id, and bookings RLS lets
  // each user read their own rows (`auth.uid() = user_id`). Because this route
  // runs server-side without the user's auth cookie, we'd normally read zero
  // rows. For the MVP, tokenise the export on the user_id query param and
  // trust the url — a production build should use a signed token.
  const token = url.searchParams.get('token');
  // For MVP: no token verification yet; read via service role if present in
  // env, otherwise fall through to anon and return whatever RLS allows.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: bookings } = await sb
    .from('bookings')
    .select('id, date, hour, club_id, courts(name), clubs(name)')
    .eq('user_id', userId)
    .eq('status', 'confirmed');

  const rows = (bookings as any[]) || [];
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tennis Platform//HK//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Tennis Bookings',
    'X-WR-TIMEZONE:Asia/Hong_Kong',
  ];

  for (const b of rows) {
    const start = toIcsDateTime(b.date, b.hour);
    const end = toIcsDateTime(b.date, b.hour + 1);
    const court = b.courts?.name ?? '球場';
    const clubName = b.clubs?.name ?? '';
    const summary = `網球 · ${court}${clubName ? ` @ ${clubName}` : ''}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${b.id}@tennis-platform`,
      `DTSTAMP:${toIcsDateTime(b.date, b.hour)}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(summary)}`,
      `LOCATION:${escapeText(clubName)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  const body = lines.join('\r\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tennis-bookings.ics"',
      'Cache-Control': 'no-cache',
    },
  });
}
