'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Club, ClubMembership, MembershipRole } from './types';

export function useClub(slug: string | undefined) {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('clubs')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setClub(data as Club);
        setLoading(false);
      });
  }, [slug]);

  return { club, loading, error };
}

export function useMembership(clubId: string | undefined, userId: string | undefined) {
  const [membership, setMembership] = useState<ClubMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId || !userId) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('club_memberships')
      .select('*')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setMembership((data as ClubMembership) || null);
        setLoading(false);
      });
  }, [clubId, userId]);

  return { membership, loading };
}

export function isApprovedMember(m: ClubMembership | null): boolean {
  return !!m && m.status === 'approved';
}

export function hasRole(m: ClubMembership | null, ...roles: MembershipRole[]): boolean {
  if (!m || m.status !== 'approved') return false;
  return roles.includes(m.role);
}

export function isClubAdmin(m: ClubMembership | null): boolean {
  return hasRole(m, 'admin', 'owner');
}

/**
 * Fetch a user's approved role in a specific club, or null if none.
 * Prefer `useMembership` inside React components; this is for imperative
 * flows (guards, callbacks, non-hook helpers).
 */
export async function getUserClubRole(
  clubId: string,
  userId: string
): Promise<MembershipRole | null> {
  const { data } = await supabase
    .from('club_memberships')
    .select('role,status')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();
  return (data?.role as MembershipRole) ?? null;
}
