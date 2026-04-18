import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// MVP notifications worker. Reads unsent rows from the notifications queue,
// logs them (real email integration can land later via Resend/SendGrid), and
// flips sent_at. Protected by NOTIFICATIONS_WORKER_SECRET when configured;
// otherwise only runs locally / with service key present.

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtinvnccabizaweqyszz.supabase.co';

export async function POST(request: Request) {
  const expected = process.env.NOTIFICATIONS_WORKER_SECRET;
  if (expected) {
    const provided = request.headers.get('x-worker-secret');
    if (provided !== expected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY not configured — worker cannot read the queue',
    }, { status: 503 });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await sb
    .from('notifications')
    .select('id, user_id, kind, subject, body')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const pending = rows ?? [];

  for (const row of pending) {
    // MVP: log the notification. Swap in a Resend/SendGrid client here once
    // SMTP credentials are provisioned.
    console.log('[notifications]', row.kind, row.subject, '→', row.user_id);
  }

  if (pending.length > 0) {
    const ids = pending.map(r => r.id);
    await sb.from('notifications').update({ sent_at: new Date().toISOString() }).in('id', ids);
  }

  return NextResponse.json({ processed: pending.length });
}

export async function GET() {
  return NextResponse.json({ hint: 'POST to process the queue' });
}
