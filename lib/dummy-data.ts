import type { Club, Court, ClubMembership } from './types';

// Dummy data for prototype preview (before DB migration)
export const DEMO_CLUBS: Club[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    slug: 'demo',
    name: 'Demo Tennis Club',
    description: '位於沙田嘅綜合網球訓練中心，提供室內外場地及專業教練團隊。歡迎所有程度嘅球員加入！',
    address: '沙田區火炭路 88 號',
    phone: '2698-1234',
    email: 'info@demo-tennis.com',
    website: null,
    logo_url: null,
    settings: {
      open_hour: 7,
      close_hour: 23,
      booking_policy: 'members_only',
      advance_days: 7,
      max_daily_bookings: 2,
      cancel_hours: 24,
    },
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    slug: 'victoria-park',
    name: 'Victoria Park Tennis',
    description: '銅鑼灣維多利亞公園旁嘅老牌網球會，歷史悠久，設施齊全。提供公開及會員課程。',
    address: '銅鑼灣興發街 1 號',
    phone: '2570-6186',
    email: 'hello@vp-tennis.hk',
    website: null,
    logo_url: null,
    settings: { open_hour: 8, close_hour: 22 },
    is_active: true,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    slug: 'tko-tennis',
    name: '將軍澳網球學院',
    description: '全新室內場館，配備智能球速追蹤系統。專注青少年培訓及成人進階班。',
    address: '將軍澳唐德街 9 號',
    phone: '3145-6789',
    email: 'coach@tko-tennis.hk',
    website: null,
    logo_url: null,
    settings: { open_hour: 7, close_hour: 23 },
    is_active: true,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
  },
];

export const DEMO_COURTS: Record<string, Court[]> = {
  '00000000-0000-0000-0000-000000000001': [
    { id: 'c1', club_id: '00000000-0000-0000-0000-000000000001', name: 'Court 1', surface: 'Hard', surface_type: 'Hard', location: '室內', address: '', description: '硬地球場，LED 照明', facilities: '更衣室、飲水機', indoor: true, hourly_rate: 120 },
    { id: 'c2', club_id: '00000000-0000-0000-0000-000000000001', name: 'Court 2', surface: 'Hard', surface_type: 'Hard', location: '室內', address: '', description: '硬地球場', facilities: '更衣室', indoor: true, hourly_rate: 120 },
    { id: 'c3', club_id: '00000000-0000-0000-0000-000000000001', name: 'Court 3', surface: 'Hard', surface_type: 'Hard', location: '室外', address: '', description: '草地球場', facilities: '飲水機', indoor: false, hourly_rate: 80 },
    { id: 'c4', club_id: '00000000-0000-0000-0000-000000000001', name: 'Court 4', surface: 'Hard', surface_type: 'Hard', location: '室外', address: '', description: '紅土球場', facilities: '', indoor: false, hourly_rate: 100 },
  ],
  '00000000-0000-0000-0000-000000000002': [
    { id: 'c5', club_id: '00000000-0000-0000-0000-000000000002', name: 'Main Court', surface: 'Hard', surface_type: 'Hard', location: '室外', address: '', description: '標準硬地', facilities: '觀眾席', indoor: false, hourly_rate: 150 },
    { id: 'c6', club_id: '00000000-0000-0000-0000-000000000002', name: 'Practice Court', surface: 'Hard', surface_type: 'Hard', location: '室外', address: '', description: '練習場', facilities: '', indoor: false, hourly_rate: 100 },
  ],
  '00000000-0000-0000-0000-000000000003': [
    { id: 'c7', club_id: '00000000-0000-0000-0000-000000000003', name: 'Indoor A', surface: 'Hard', surface_type: 'Hard', location: '室內', address: '', description: '全天候室內場', facilities: '冷氣、更衣室、觀眾席', indoor: true, hourly_rate: 200 },
    { id: 'c8', club_id: '00000000-0000-0000-0000-000000000003', name: 'Indoor B', surface: 'Hard', surface_type: 'Hard', location: '室內', address: '', description: '全天候室內場', facilities: '冷氣、更衣室', indoor: true, hourly_rate: 200 },
    { id: 'c9', club_id: '00000000-0000-0000-0000-000000000003', name: 'Indoor C', surface: 'Hard', surface_type: 'Hard', location: '室內', address: '', description: '訓練專用', facilities: '冷氣', indoor: true, hourly_rate: 180 },
  ],
};

export interface DemoClass {
  id: string;
  club_id: string;
  name: string;
  coach: string;
  description: string;
  schedule: string;
  capacity: number;
  enrolled: number;
  price: number;
  visibility: 'public' | 'members' | 'private';
  level: string;
  visible: boolean;
}

export const DEMO_CLASSES: Record<string, DemoClass[]> = {
  '00000000-0000-0000-0000-000000000001': [
    { id: 'cl1', club_id: '00000000-0000-0000-0000-000000000001', name: '初級網球班', coach: 'Coach Wong', description: '適合零經驗初學者，學習基本握拍、正反手及發球技巧。', schedule: '逢六 10:00-11:30', capacity: 12, enrolled: 8, price: 200, visibility: 'public', level: 'Beginner', visible: true },
    { id: 'cl2', club_id: '00000000-0000-0000-0000-000000000001', name: '進階訓練班', coach: 'Coach Lee', description: '提升比賽技術，包括戰術分析及體能訓練。', schedule: '逢三 19:00-20:30', capacity: 8, enrolled: 8, price: 280, visibility: 'members', level: 'Advanced', visible: true },
    { id: 'cl3', club_id: '00000000-0000-0000-0000-000000000001', name: '親子網球班', coach: 'Coach Wong', description: '家長同小朋友一齊學，增進親子關係。', schedule: '逢日 09:00-10:00', capacity: 10, enrolled: 4, price: 150, visibility: 'public', level: 'Beginner', visible: true },
    { id: 'cl4', club_id: '00000000-0000-0000-0000-000000000001', name: 'VIP 私人訓練', coach: 'Coach Lee', description: '一對一私人教練課程。', schedule: '預約制', capacity: 1, enrolled: 0, price: 500, visibility: 'private', level: 'Advanced', visible: true },
  ],
  '00000000-0000-0000-0000-000000000002': [
    { id: 'cl5', club_id: '00000000-0000-0000-0000-000000000002', name: '週末網球營', coach: 'Coach Chan', description: '密集式週末訓練，快速提升球技。', schedule: '逢六日 14:00-16:00', capacity: 16, enrolled: 12, price: 350, visibility: 'public', level: 'Intermediate', visible: true },
  ],
  '00000000-0000-0000-0000-000000000003': [
    { id: 'cl6', club_id: '00000000-0000-0000-0000-000000000003', name: '青少年精英班', coach: 'Coach Tam', description: '專為 12-18 歲有潛質嘅青少年設計。', schedule: '逢二四 16:00-17:30', capacity: 8, enrolled: 6, price: 400, visibility: 'members', level: 'Advanced', visible: true },
    { id: 'cl7', club_id: '00000000-0000-0000-0000-000000000003', name: '成人入門班', coach: 'Coach Tam', description: '專為成人初學者設計，輕鬆學網球。', schedule: '逢一三五 20:00-21:00', capacity: 10, enrolled: 3, price: 250, visibility: 'public', level: 'Beginner', visible: true },
  ],
};

// Use dummy data when DB tables don't exist yet
export const USE_DUMMY_DATA = false;

export function getDemoClub(slug: string): Club | null {
  return DEMO_CLUBS.find(c => c.slug === slug) || null;
}

export function getDemoClubs(): Club[] {
  return DEMO_CLUBS;
}

export function getDemoCourts(clubId: string): Court[] {
  return DEMO_COURTS[clubId] || [];
}

export function getDemoClasses(clubId: string): DemoClass[] {
  return DEMO_CLASSES[clubId] || [];
}
