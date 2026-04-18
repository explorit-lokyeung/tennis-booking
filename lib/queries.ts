import { supabase } from './supabase';
import type { Club, Court, TennisClass } from './types';

/** List all active clubs, ordered by name. */
export async function getClubs(): Promise<Club[]> {
  const { data } = await supabase
    .from('clubs')
    .select('*')
    .eq('is_active', true)
    .order('name');
  return (data as Club[]) ?? [];
}

/** Load a single active club by slug, or null if not found. */
export async function getClubBySlug(slug: string): Promise<Club | null> {
  const { data } = await supabase
    .from('clubs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return (data as Club) ?? null;
}

export async function getClubCourts(clubId: string): Promise<Court[]> {
  const { data } = await supabase
    .from('courts')
    .select('*')
    .eq('club_id', clubId)
    .order('name');
  return (data as Court[]) ?? [];
}

export async function getClubClasses(
  clubId: string,
  { includeHidden = false }: { includeHidden?: boolean } = {}
): Promise<TennisClass[]> {
  let q = supabase.from('classes').select('*').eq('club_id', clubId).order('id');
  if (!includeHidden) q = q.neq('visible', false);
  const { data } = await q;
  return (data as TennisClass[]) ?? [];
}

export interface PlatformStats {
  clubs: number;
  courts: number;
  classes: number;
}

/** Aggregate counts across the platform for the landing page. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [cl, co, cs] = await Promise.all([
    supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('courts').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }).neq('visible', false),
  ]);
  return {
    clubs: cl.count ?? 0,
    courts: co.count ?? 0,
    classes: cs.count ?? 0,
  };
}
