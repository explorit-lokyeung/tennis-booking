-- Court Pricing Rules
-- Dynamic pricing by day of week and hour range
CREATE TABLE IF NOT EXISTS court_pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  day_type TEXT NOT NULL CHECK (day_type IN ('weekday','weekend','mon','tue','wed','thu','fri','sat','sun','holiday','all')),
  hour_start INT NOT NULL CHECK (hour_start >= 0 AND hour_start <= 23),
  hour_end INT NOT NULL CHECK (hour_end >= 1 AND hour_end <= 24),
  price NUMERIC NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (hour_end > hour_start)
);

ALTER TABLE court_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cpr_court_idx ON court_pricing_rules(court_id);
CREATE INDEX IF NOT EXISTS cpr_club_idx ON court_pricing_rules(club_id);

CREATE POLICY "cpr_public_read" ON court_pricing_rules FOR SELECT USING (true);
CREATE POLICY "cpr_admin_all" ON court_pricing_rules FOR ALL USING (is_club_admin(club_id) OR is_platform_admin());
