-- T05: Per-club RLS policies
-- Multi-tenant conversion - Phase 2
--
-- Policy model:
--   * Public (anon + any authenticated user) can SELECT courts/classes/slots
--     as long as the owning club is active. Visibility gating at row level
--     (public/members/private) is enforced by the UI layer, not RLS, so that
--     unauthenticated landing pages can still preview club content.
--   * Users can SELECT their own bookings/class_bookings and INSERT new rows
--     for themselves, but only when the club_id on the new row matches the
--     club_id on the referenced court/class.
--   * Club admins / owners (approved membership with role IN ('admin','owner'))
--     get full CRUD on every tenant-scoped table for their club, plus the
--     ability to manage club_memberships for their club.
--   * Club coaches (approved membership with role='coach') can SELECT
--     bookings and class_bookings belonging to their club.
--
-- Everything is idempotent via DROP POLICY IF EXISTS so the file can be
-- re-applied safely.

-- ---------------------------------------------------------------------------
-- Helper: is the caller an approved admin/owner of the given club?
-- SECURITY DEFINER so policies can use it without recursing into
-- club_memberships' own RLS (which would cause a chicken-and-egg problem
-- when checking the club_memberships policies themselves).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND status  = 'approved'
      AND role    IN ('admin','owner')
  );
$$;

CREATE OR REPLACE FUNCTION is_club_coach(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND status  = 'approved'
      AND role    = 'coach'
  );
$$;

-- ---------------------------------------------------------------------------
-- clubs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active clubs" ON clubs;
DROP POLICY IF EXISTS "clubs_select_active"         ON clubs;
DROP POLICY IF EXISTS "clubs_admin_update"          ON clubs;

CREATE POLICY "clubs_select_active" ON clubs
  FOR SELECT USING (is_active = true OR is_club_admin(id));

CREATE POLICY "clubs_admin_update" ON clubs
  FOR UPDATE USING (is_club_admin(id))
             WITH CHECK (is_club_admin(id));

-- ---------------------------------------------------------------------------
-- club_memberships
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own memberships"      ON club_memberships;
DROP POLICY IF EXISTS "Users request own membership"    ON club_memberships;
DROP POLICY IF EXISTS "memberships_select_self_or_admin" ON club_memberships;
DROP POLICY IF EXISTS "memberships_insert_self_pending"  ON club_memberships;
DROP POLICY IF EXISTS "memberships_admin_insert"         ON club_memberships;
DROP POLICY IF EXISTS "memberships_admin_update"         ON club_memberships;
DROP POLICY IF EXISTS "memberships_admin_delete"         ON club_memberships;

-- Users see their own rows; admins see everything in their club.
CREATE POLICY "memberships_select_self_or_admin" ON club_memberships
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_club_admin(club_id)
    OR is_club_coach(club_id)
  );

-- Users request membership for themselves (pending only).
CREATE POLICY "memberships_insert_self_pending" ON club_memberships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND status = 'pending'
  );

-- Admins invite / create any membership in their club (any status/role).
CREATE POLICY "memberships_admin_insert" ON club_memberships
  FOR INSERT WITH CHECK (is_club_admin(club_id));

-- Admins update any membership in their club (approve, suspend, change role).
CREATE POLICY "memberships_admin_update" ON club_memberships
  FOR UPDATE USING (is_club_admin(club_id))
             WITH CHECK (is_club_admin(club_id));

CREATE POLICY "memberships_admin_delete" ON club_memberships
  FOR DELETE USING (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- courts
-- ---------------------------------------------------------------------------
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courts_select_public"      ON courts;
DROP POLICY IF EXISTS "courts_admin_all"          ON courts;

CREATE POLICY "courts_select_public" ON courts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = courts.club_id AND clubs.is_active = true)
    OR is_club_admin(club_id)
  );

CREATE POLICY "courts_admin_all" ON courts
  FOR ALL USING (is_club_admin(club_id))
          WITH CHECK (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select_public" ON classes;
DROP POLICY IF EXISTS "classes_admin_all"     ON classes;

CREATE POLICY "classes_select_public" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = classes.club_id AND clubs.is_active = true)
    OR is_club_admin(club_id)
  );

CREATE POLICY "classes_admin_all" ON classes
  FOR ALL USING (is_club_admin(club_id))
          WITH CHECK (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- slots
-- Booking flow inserts slot rows (status='booked') for the calling user.
-- Admins can INSERT closed slots and DELETE anything.
-- ---------------------------------------------------------------------------
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slots_select_public"   ON slots;
DROP POLICY IF EXISTS "slots_user_book"       ON slots;
DROP POLICY IF EXISTS "slots_admin_all"       ON slots;
DROP POLICY IF EXISTS "slots_user_cancel"     ON slots;

CREATE POLICY "slots_select_public" ON slots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = slots.club_id AND clubs.is_active = true)
    OR is_club_admin(club_id)
  );

-- Users can create 'booked' slots belonging to their own auth.uid(),
-- but only for a court that actually sits in the same club.
CREATE POLICY "slots_user_book" ON slots
  FOR INSERT WITH CHECK (
    auth.uid() = booked_by
    AND status  = 'booked'
    AND EXISTS (
      SELECT 1 FROM courts
      WHERE courts.id = slots.court_id
        AND courts.club_id = slots.club_id
    )
  );

-- Users can delete slots they booked (cancellation flow).
CREATE POLICY "slots_user_cancel" ON slots
  FOR DELETE USING (auth.uid() = booked_by);

CREATE POLICY "slots_admin_all" ON slots
  FOR ALL USING (is_club_admin(club_id))
          WITH CHECK (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_self_or_staff" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_self"          ON bookings;
DROP POLICY IF EXISTS "bookings_user_cancel"          ON bookings;
DROP POLICY IF EXISTS "bookings_admin_all"            ON bookings;

CREATE POLICY "bookings_select_self_or_staff" ON bookings
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_club_admin(club_id)
    OR is_club_coach(club_id)
  );

CREATE POLICY "bookings_insert_self" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM courts
      WHERE courts.id = bookings.court_id
        AND courts.club_id = bookings.club_id
    )
  );

CREATE POLICY "bookings_user_cancel" ON bookings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "bookings_admin_all" ON bookings
  FOR ALL USING (is_club_admin(club_id))
          WITH CHECK (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- class_bookings
-- ---------------------------------------------------------------------------
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_bookings_select_self_or_staff" ON class_bookings;
DROP POLICY IF EXISTS "class_bookings_insert_self"          ON class_bookings;
DROP POLICY IF EXISTS "class_bookings_user_cancel"          ON class_bookings;
DROP POLICY IF EXISTS "class_bookings_admin_all"            ON class_bookings;

CREATE POLICY "class_bookings_select_self_or_staff" ON class_bookings
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_club_admin(club_id)
    OR is_club_coach(club_id)
  );

CREATE POLICY "class_bookings_insert_self" ON class_bookings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_bookings.class_id
        AND classes.club_id = class_bookings.club_id
    )
  );

CREATE POLICY "class_bookings_user_cancel" ON class_bookings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "class_bookings_admin_all" ON class_bookings
  FOR ALL USING (is_club_admin(club_id))
          WITH CHECK (is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- settings
-- Public read (operating hours etc. used by public booking page),
-- admin write.
-- ---------------------------------------------------------------------------
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_public" ON settings;
DROP POLICY IF EXISTS "settings_admin_all"     ON settings;

CREATE POLICY "settings_select_public" ON settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM clubs WHERE clubs.id = settings.club_id AND clubs.is_active = true)
    OR is_club_admin(club_id)
  );

CREATE POLICY "settings_admin_all" ON settings
  FOR ALL USING (is_club_admin(club_id))
          WITH CHECK (is_club_admin(club_id));
