import type { User } from '@supabase/supabase-js';

export function isPlatformAdmin(userOrId: User | string | undefined | null): boolean {
  if (!userOrId) return false;
  // If passed a User object, check metadata
  if (typeof userOrId === 'object' && 'user_metadata' in userOrId) {
    return userOrId.user_metadata?.role === 'platform_admin';
  }
  // Legacy: string userId — can't check metadata, return false
  return false;
}
