import { supabase } from './supabase';

/**
 * Send a notification to a user.
 */
export async function notify(
  clubId: string,
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'booking' | 'class' | 'membership' = 'info'
) {
  await supabase.from('notifications').insert({
    club_id: clubId,
    user_id: userId,
    title,
    message,
    type,
    read: false,
  });
}

/**
 * Notify all admins/owners of a club.
 */
export async function notifyClubAdmins(
  clubId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'booking' | 'class' | 'membership' = 'info'
) {
  const { data: admins } = await supabase
    .from('club_memberships')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('status', 'approved')
    .in('role', ['admin', 'owner']);

  if (admins) {
    const rows = admins.map(a => ({
      club_id: clubId,
      user_id: a.user_id,
      title,
      message,
      type,
      read: false,
    }));
    if (rows.length > 0) await supabase.from('notifications').insert(rows);
  }
}
