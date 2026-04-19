import { supabase } from './supabase';

/**
 * Log an admin action. Uses the notifications table with type='audit'.
 * No separate table needed — keeps schema simple.
 */
export async function logAudit(
  clubId: string,
  userId: string,
  action: string,
  details?: string
) {
  try {
    await supabase.from('notifications').insert({
      club_id: clubId,
      user_id: userId,
      type: 'audit',
      title: action,
      message: details || '',
    });
  } catch {
    // Non-critical — don't block the UI if audit logging fails
  }
}
