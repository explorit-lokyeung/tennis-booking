-- =============================================================
-- Tennis Booking Platform — Clean Production Setup
-- Run this in Supabase SQL Editor on a fresh project.
-- No demo data. Creates all tables, RLS, functions, indexes.
-- =============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clubs (tenants)
CREATE TABLE IF NOT EXISTS clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active clubs" ON clubs FOR SELECT USING (is_active = true);
CREATE POLICY "platform_admin_insert_clubs" ON clubs FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
);
CREATE POLICY "platform_admin_update_clubs" ON clubs FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
);
CREATE POLICY "platform_admin_delete_clubs" ON clubs FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
);
CREATE INDEX IF NOT EXISTS clubs_slug_idx ON clubs(slug);
CREATE INDEX IF NOT EXISTS clubs_active_idx ON clubs(is_active);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Club Memberships
CREATE TABLE IF NOT EXISTS club_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','coach','member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);
ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cm_club_idx ON club_memberships(club_id);
CREATE INDEX IF NOT EXISTS cm_user_idx ON club_memberships(user_id);
CREATE INDEX IF NOT EXISTS cm_status_idx ON club_memberships(status);

-- 3. Courts
CREATE TABLE IF NOT EXISTS courts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surface TEXT NOT NULL DEFAULT 'hard',
  surface_type TEXT,
  indoor BOOLEAN DEFAULT false,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  location TEXT,
  address TEXT,
  facilities TEXT,
  image_url TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','members','private')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS courts_club_idx ON courts(club_id);

-- 4. Court Slots
CREATE TABLE IF NOT EXISTS court_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','closed')),
  price NUMERIC,
  booked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(court_id, date, hour)
);
ALTER TABLE court_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS slots_club_idx ON court_slots(club_id);
CREATE INDEX IF NOT EXISTS slots_court_date_idx ON court_slots(court_id, date);

-- Legacy alias (some code references "slots" table)
-- CREATE VIEW slots AS SELECT * FROM court_slots;

-- 5. Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coach TEXT NOT NULL DEFAULT '',
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced','初級','中級','高級','所有級別')),
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  location TEXT DEFAULT '',
  spots_available INT NOT NULL DEFAULT 0,
  spots_total INT NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  visible BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','members','private')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS classes_club_idx ON classes(club_id);

-- 6. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES court_slots(id),
  court_id TEXT REFERENCES courts(id),
  date DATE NOT NULL,
  hour INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  recurring_group_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS bookings_club_idx ON bookings(club_id);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings(date);

-- 7. Class Bookings
CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','waitlisted')),
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cb_club_idx ON class_bookings(club_id);

-- 8. Settings (per-club key-value)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, key)
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS settings_club_idx ON settings(club_id);

-- 9. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_read_idx ON notifications(user_id, read);

-- =============================================================
-- RLS Policies
-- =============================================================

-- Helper: check if user is admin/owner of a club
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND status = 'approved'
      AND role IN ('admin','owner')
  );
$$;

CREATE OR REPLACE FUNCTION is_approved_member(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND status = 'approved'
  );
$$;

-- Club Memberships
CREATE POLICY "memberships_select_self_or_admin" ON club_memberships
  FOR SELECT USING (auth.uid() = user_id OR is_club_admin(club_id));
CREATE POLICY "memberships_insert_self_pending" ON club_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending' AND role = 'member');
CREATE POLICY "memberships_admin_insert" ON club_memberships
  FOR INSERT WITH CHECK (is_club_admin(club_id));
CREATE POLICY "memberships_admin_update" ON club_memberships
  FOR UPDATE USING (is_club_admin(club_id));
CREATE POLICY "memberships_admin_delete" ON club_memberships
  FOR DELETE USING (is_club_admin(club_id));

-- Courts
CREATE POLICY "courts_public_read" ON courts FOR SELECT USING (true);
CREATE POLICY "courts_admin_insert" ON courts FOR INSERT WITH CHECK (is_club_admin(club_id));
CREATE POLICY "courts_admin_update" ON courts FOR UPDATE USING (is_club_admin(club_id));
CREATE POLICY "courts_admin_delete" ON courts FOR DELETE USING (is_club_admin(club_id));

-- Court Slots
CREATE POLICY "slots_public_read" ON court_slots FOR SELECT USING (true);
CREATE POLICY "slots_member_insert" ON court_slots FOR INSERT WITH CHECK (is_approved_member(club_id));
CREATE POLICY "slots_member_update" ON court_slots FOR UPDATE USING (is_approved_member(club_id) OR is_club_admin(club_id));
CREATE POLICY "slots_admin_delete" ON court_slots FOR DELETE USING (is_club_admin(club_id));

-- Classes
CREATE POLICY "classes_public_read" ON classes FOR SELECT USING (visible = true);
CREATE POLICY "classes_admin_all" ON classes FOR ALL USING (is_club_admin(club_id));

-- Bookings
CREATE POLICY "bookings_own_read" ON bookings FOR SELECT USING (auth.uid() = user_id OR is_club_admin(club_id));
CREATE POLICY "bookings_own_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_own_update" ON bookings FOR UPDATE USING (auth.uid() = user_id OR is_club_admin(club_id));
CREATE POLICY "bookings_admin_delete" ON bookings FOR DELETE USING (is_club_admin(club_id));

-- Class Bookings
CREATE POLICY "cb_own_read" ON class_bookings FOR SELECT USING (auth.uid() = user_id OR is_club_admin(club_id));
CREATE POLICY "cb_own_insert" ON class_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cb_own_update" ON class_bookings FOR UPDATE USING (auth.uid() = user_id OR is_club_admin(club_id));
CREATE POLICY "cb_admin_delete" ON class_bookings FOR DELETE USING (is_club_admin(club_id));

-- Settings
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all" ON settings FOR ALL USING (is_club_admin(club_id));

-- Notifications
CREATE POLICY "notif_own_read" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_own_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_admin_insert" ON notifications FOR INSERT WITH CHECK (is_club_admin(club_id) OR auth.uid() = user_id);

-- =============================================================
-- User lookup functions (for admin pages)
-- =============================================================
CREATE OR REPLACE FUNCTION get_user_email(uid UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT email FROM auth.users WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION get_user_name(uid UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(raw_user_meta_data->>'name', email) FROM auth.users WHERE id = uid;
$$;

-- =============================================================
-- Done! Your production database is ready.
-- Next: Create your first club via the Platform Admin UI.
-- =============================================================
