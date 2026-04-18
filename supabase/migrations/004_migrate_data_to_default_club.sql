-- T04: Backfill existing data into a default club
-- Multi-tenant conversion - Phase 1
--
-- Creates the "Demo Tennis Club" tenant, points every pre-existing row at it,
-- enrolls existing users (admin as owner, everyone else as approved member),
-- then flips club_id to NOT NULL now that the backfill is complete.

DO $$
DECLARE
  default_club_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  admin_user_id   CONSTANT UUID := 'c87080df-1e1f-4765-a9f5-af832156e87a';
BEGIN
  -- 1. Default club ----------------------------------------------------------
  INSERT INTO clubs (id, slug, name, description, address, phone, email, is_active)
  VALUES (
    default_club_id,
    'demo',
    'Demo Tennis Club',
    '示範網球會 — 預設租戶，收納多租戶升級前已存在的所有資料。',
    'Hong Kong',
    NULL,
    'admin@demo-tennis.com',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Backfill club_id on tenant-scoped tables ------------------------------
  UPDATE courts         SET club_id = default_club_id WHERE club_id IS NULL;
  UPDATE classes        SET club_id = default_club_id WHERE club_id IS NULL;
  UPDATE slots          SET club_id = default_club_id WHERE club_id IS NULL;
  UPDATE bookings       SET club_id = default_club_id WHERE club_id IS NULL;
  UPDATE class_bookings SET club_id = default_club_id WHERE club_id IS NULL;
  UPDATE settings       SET club_id = default_club_id WHERE club_id IS NULL;

  -- 3. Seed memberships -------------------------------------------------------
  -- Admin user becomes the club owner.
  INSERT INTO club_memberships (club_id, user_id, role, status)
  VALUES (default_club_id, admin_user_id, 'owner', 'approved')
  ON CONFLICT (club_id, user_id, role) DO UPDATE SET status = 'approved';

  -- Every other existing auth user becomes an approved member.
  INSERT INTO club_memberships (club_id, user_id, role, status)
  SELECT default_club_id, u.id, 'member', 'approved'
  FROM auth.users u
  WHERE u.id <> admin_user_id
  ON CONFLICT (club_id, user_id, role) DO NOTHING;
END $$;

-- 4. Enforce NOT NULL now that backfill is complete --------------------------
ALTER TABLE courts         ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE classes        ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE slots          ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE bookings       ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE class_bookings ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE settings       ALTER COLUMN club_id SET NOT NULL;
