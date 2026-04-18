-- T02: Create club_memberships table
-- Multi-tenant conversion - Phase 1

CREATE TABLE IF NOT EXISTS club_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','coach','member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, user_id, role)
);

ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS club_memberships_club_idx     ON club_memberships(club_id);
CREATE INDEX IF NOT EXISTS club_memberships_user_idx     ON club_memberships(user_id);
CREATE INDEX IF NOT EXISTS club_memberships_role_idx     ON club_memberships(club_id, role);
CREATE INDEX IF NOT EXISTS club_memberships_status_idx   ON club_memberships(club_id, status);

CREATE TRIGGER update_club_memberships_updated_at BEFORE UPDATE ON club_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Baseline RLS: users see their own memberships.
-- Club-admin / coach / member visibility policies are added in migration 005 (T05).
CREATE POLICY "Users view own memberships" ON club_memberships
  FOR SELECT USING (auth.uid() = user_id);

-- Users can request membership (insert pending rows for themselves only).
CREATE POLICY "Users request own membership" ON club_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

COMMENT ON TABLE club_memberships IS 'Links users to clubs with a role and approval status. A user may hold multiple roles across multiple clubs.';
COMMENT ON COLUMN club_memberships.role   IS 'owner | admin | coach | member';
COMMENT ON COLUMN club_memberships.status IS 'pending | approved | suspended';
