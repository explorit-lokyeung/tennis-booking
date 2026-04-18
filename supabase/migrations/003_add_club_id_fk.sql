-- T03: Add club_id FK to tenant-scoped tables
-- Multi-tenant conversion - Phase 1
--
-- Columns are added as nullable here so existing rows can be backfilled
-- in migration 004. Migration 004 then flips them to NOT NULL.

ALTER TABLE courts         ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE classes        ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE slots          ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE bookings       ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE class_bookings ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE settings       ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS courts_club_idx         ON courts(club_id);
CREATE INDEX IF NOT EXISTS classes_club_idx        ON classes(club_id);
CREATE INDEX IF NOT EXISTS slots_club_idx          ON slots(club_id);
CREATE INDEX IF NOT EXISTS bookings_club_idx       ON bookings(club_id);
CREATE INDEX IF NOT EXISTS class_bookings_club_idx ON class_bookings(club_id);
CREATE INDEX IF NOT EXISTS settings_club_idx       ON settings(club_id);
