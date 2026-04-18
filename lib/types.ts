/**
 * Multi-tenant domain types.
 * Mirrors the Supabase schema after migrations 001-00x.
 */

export type MembershipRole = 'member' | 'coach' | 'admin' | 'owner';
export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type Visibility = 'public' | 'members' | 'private';
export type ClassLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Club {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClubMembership {
  id: string;
  club_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  club_id: string;
  name: string;
  surface: string;
  indoor: boolean;
  hourly_rate: number;
  description: string | null;
  location: string | null;
  address: string | null;
  facilities: string | null;
  surface_type: string | null;
  visibility?: Visibility;
}

export interface Slot {
  id: string;
  club_id: string;
  court_id: string;
  date: string;
  hour: number;
  status: 'booked' | 'closed';
  price: number | null;
  booked_by: string | null;
}

export interface TennisClass {
  id: string;
  club_id: string;
  name: string;
  coach: string;
  level: ClassLevel;
  day: string;
  time: string;
  location: string;
  spots_available: number;
  spots_total: number;
  price: number;
  description: string;
  visible: boolean;
  visibility?: Visibility;
  start_date: string | null;
  end_date: string | null;
}

export interface Booking {
  id: string;
  club_id: string;
  user_id: string;
  slot_id: string;
  court_id: string;
  date: string;
  hour: number;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

export interface ClassBooking {
  id: string;
  club_id: string;
  user_id: string;
  class_id: string;
  status: 'confirmed' | 'cancelled' | 'waitlist';
  created_at: string;
}
