-- T01: Create clubs table
-- Multi-tenant conversion - Phase 1

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

-- Add RLS policy for clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Public can view active clubs
CREATE POLICY "Public can view active clubs" ON clubs
  FOR SELECT USING (is_active = true);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for slug lookup
CREATE INDEX IF NOT EXISTS clubs_slug_idx ON clubs(slug);
CREATE INDEX IF NOT EXISTS clubs_active_idx ON clubs(is_active);

-- Insert comment for table documentation
COMMENT ON TABLE clubs IS 'Multi-tenant clubs - each club is a separate tenant with its own courts, classes, etc.';
COMMENT ON COLUMN clubs.slug IS 'URL-friendly identifier for club (e.g., "wimbledon-tc")';
COMMENT ON COLUMN clubs.settings IS 'Club-specific configuration (booking rules, policies, etc.)';