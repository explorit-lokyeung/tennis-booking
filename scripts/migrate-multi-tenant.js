const { Client } = require('pg');

// Supabase direct connection (Transaction mode)
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.xtinvnccabizaweqyszz',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_USER_ID = 'c87080df-1e1f-4765-a9f5-af832156e87a';
const DEFAULT_CLUB_ID = '00000000-0000-0000-0000-000000000001';

const migrations = [
  // T01: Create clubs table
  {
    name: 'T01: Create clubs table',
    sql: `
      CREATE TABLE IF NOT EXISTS clubs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        address TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        logo_url TEXT,
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Anyone can view active clubs" ON clubs FOR SELECT USING (is_active = true);
      CREATE INDEX IF NOT EXISTS idx_clubs_slug ON clubs(slug);
    `
  },
  // T02: Create club_memberships table
  {
    name: 'T02: Create club_memberships table',
    sql: `
      CREATE TABLE IF NOT EXISTS club_memberships (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','coach','member')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','suspended','rejected')),
        invited_by UUID REFERENCES auth.users(id),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(club_id, user_id, role)
      );
      ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
      CREATE INDEX IF NOT EXISTS idx_memberships_club ON club_memberships(club_id);
      CREATE INDEX IF NOT EXISTS idx_memberships_user ON club_memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_memberships_role ON club_memberships(club_id, role);
      
      -- Users can view their own memberships
      CREATE POLICY "Users view own memberships" ON club_memberships
        FOR SELECT USING (auth.uid() = user_id);
      -- Club admins/owners can view all memberships in their club
      CREATE POLICY "Club admins view memberships" ON club_memberships
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = club_memberships.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin')
            AND cm.status = 'active'
          )
        );
      -- Club admins/owners can manage memberships
      CREATE POLICY "Club admins manage memberships" ON club_memberships
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = club_memberships.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin')
            AND cm.status = 'active'
          )
        );
      -- Users can insert their own membership requests (pending)
      CREATE POLICY "Users can request membership" ON club_memberships
        FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
    `
  },
  // T03: Add club_id to existing tables
  {
    name: 'T03: Add club_id to existing tables',
    sql: `
      -- Add club_id to courts (nullable first)
      ALTER TABLE courts ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
      -- Add club_id to classes
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
      -- Add club_id to slots
      ALTER TABLE slots ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
      -- Add club_id to class_bookings
      ALTER TABLE class_bookings ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
      -- Add visibility to classes
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'members_only' CHECK (visibility IN ('members_only','public','invite_only'));
      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_courts_club ON courts(club_id);
      CREATE INDEX IF NOT EXISTS idx_classes_club ON classes(club_id);
      CREATE INDEX IF NOT EXISTS idx_slots_club ON slots(club_id);
      CREATE INDEX IF NOT EXISTS idx_class_bookings_club ON class_bookings(club_id);
    `
  },
  // T04: Migration — default club + data
  {
    name: 'T04: Migrate data to default club',
    sql: `
      -- Insert default club
      INSERT INTO clubs (id, slug, name, description, address, contact_email)
      VALUES ('${DEFAULT_CLUB_ID}', 'demo', 'Demo Tennis Club', '示範網球會', 'Hong Kong', 'admin@demo-tennis.com')
      ON CONFLICT (id) DO NOTHING;
      
      -- Update existing data to default club
      UPDATE courts SET club_id = '${DEFAULT_CLUB_ID}' WHERE club_id IS NULL;
      UPDATE classes SET club_id = '${DEFAULT_CLUB_ID}' WHERE club_id IS NULL;
      UPDATE slots SET club_id = '${DEFAULT_CLUB_ID}' WHERE club_id IS NULL;
      UPDATE class_bookings SET club_id = '${DEFAULT_CLUB_ID}' WHERE club_id IS NULL;
      
      -- Make admin user the owner
      INSERT INTO club_memberships (club_id, user_id, role, status)
      VALUES ('${DEFAULT_CLUB_ID}', '${ADMIN_USER_ID}', 'owner', 'active')
      ON CONFLICT (club_id, user_id, role) DO NOTHING;
      
      -- Migrate existing profiles to members
      INSERT INTO club_memberships (club_id, user_id, role, status)
      SELECT '${DEFAULT_CLUB_ID}', id, 'member', 'active'
      FROM auth.users
      WHERE id != '${ADMIN_USER_ID}'
      ON CONFLICT (club_id, user_id, role) DO NOTHING;
      
      -- Make club_id NOT NULL (after data migration)
      ALTER TABLE courts ALTER COLUMN club_id SET NOT NULL;
      ALTER TABLE classes ALTER COLUMN club_id SET NOT NULL;
      ALTER TABLE slots ALTER COLUMN club_id SET NOT NULL;
      ALTER TABLE class_bookings ALTER COLUMN club_id SET NOT NULL;
      
      -- Set default visibility for existing classes
      UPDATE classes SET visibility = 'public' WHERE visibility IS NULL;
    `
  },
  // T05: Rewrite RLS policies
  {
    name: 'T05: Rewrite RLS policies',
    sql: `
      -- Drop old court policies
      DROP POLICY IF EXISTS "Anyone can view courts" ON courts;
      DROP POLICY IF EXISTS "Admins can manage courts" ON courts;
      DROP POLICY IF EXISTS "courts_select_policy" ON courts;
      DROP POLICY IF EXISTS "courts_all_policy" ON courts;
      
      -- New court policies
      CREATE POLICY "Anyone can view courts" ON courts
        FOR SELECT USING (true);
      CREATE POLICY "Club admins manage courts" ON courts
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = courts.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin')
            AND cm.status = 'active'
          )
        );
      
      -- Drop old class policies
      DROP POLICY IF EXISTS "Anyone can view visible classes" ON classes;
      DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
      DROP POLICY IF EXISTS "classes_select_policy" ON classes;
      DROP POLICY IF EXISTS "classes_all_policy" ON classes;
      
      -- New class policies (respect visibility)
      CREATE POLICY "View public classes" ON classes
        FOR SELECT USING (
          visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = classes.club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
          )
        );
      CREATE POLICY "Club admins manage classes" ON classes
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = classes.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin')
            AND cm.status = 'active'
          )
        );
      CREATE POLICY "Coaches manage own classes" ON classes
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = classes.club_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'coach'
            AND cm.status = 'active'
          )
        );
      
      -- Drop old slot policies
      DROP POLICY IF EXISTS "Anyone can view slots" ON slots;
      DROP POLICY IF EXISTS "Users can book slots" ON slots;
      DROP POLICY IF EXISTS "Admins can manage slots" ON slots;
      DROP POLICY IF EXISTS "slots_select_policy" ON slots;
      DROP POLICY IF EXISTS "slots_insert_policy" ON slots;
      DROP POLICY IF EXISTS "slots_update_policy" ON slots;
      DROP POLICY IF EXISTS "slots_delete_policy" ON slots;
      DROP POLICY IF EXISTS "Users can delete own slots" ON slots;
      
      -- New slot policies
      CREATE POLICY "Anyone can view slots" ON slots
        FOR SELECT USING (true);
      CREATE POLICY "Members can book slots" ON slots
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = slots.club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
          )
        );
      CREATE POLICY "Users can cancel own slots" ON slots
        FOR DELETE USING (booked_by = auth.uid());
      CREATE POLICY "Club admins manage slots" ON slots
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = slots.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin')
            AND cm.status = 'active'
          )
        );
      
      -- Drop old class_bookings policies
      DROP POLICY IF EXISTS "Users can view own class bookings" ON class_bookings;
      DROP POLICY IF EXISTS "Users can book classes" ON class_bookings;
      DROP POLICY IF EXISTS "Users can cancel own class bookings" ON class_bookings;
      DROP POLICY IF EXISTS "Admins can manage class bookings" ON class_bookings;
      DROP POLICY IF EXISTS "class_bookings_select_policy" ON class_bookings;
      DROP POLICY IF EXISTS "class_bookings_insert_policy" ON class_bookings;
      DROP POLICY IF EXISTS "class_bookings_delete_policy" ON class_bookings;
      DROP POLICY IF EXISTS "class_bookings_all_policy" ON class_bookings;
      
      -- New class_bookings policies
      CREATE POLICY "Users view own class bookings" ON class_bookings
        FOR SELECT USING (user_id = auth.uid());
      CREATE POLICY "Club admins view class bookings" ON class_bookings
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = class_bookings.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin','coach')
            AND cm.status = 'active'
          )
        );
      CREATE POLICY "Members can enroll in classes" ON class_bookings
        FOR INSERT WITH CHECK (
          auth.uid() = user_id
          AND EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = class_bookings.club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
          )
        );
      CREATE POLICY "Users can cancel own enrollment" ON class_bookings
        FOR DELETE USING (user_id = auth.uid());
      CREATE POLICY "Club admins manage class bookings" ON class_bookings
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM club_memberships cm
            WHERE cm.club_id = class_bookings.club_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner','admin')
            AND cm.status = 'active'
          )
        );
      
      -- Settings policies
      DROP POLICY IF EXISTS "Anyone can view settings" ON settings;
      DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
      DROP POLICY IF EXISTS "settings_select_policy" ON settings;
      DROP POLICY IF EXISTS "settings_all_policy" ON settings;
    `
  },
  // T06: Update DB functions
  {
    name: 'T06: Update DB functions',
    sql: `
      -- Replace find_user_by_email to be club-aware
      CREATE OR REPLACE FUNCTION find_user_by_email(search_email TEXT)
      RETURNS TABLE(id UUID, email VARCHAR, raw_user_meta_data JSONB) 
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        WHERE u.email ILIKE '%' || search_email || '%'
        LIMIT 10;
      END;
      $$;
      
      -- Replace get_class_participants to be club-aware
      CREATE OR REPLACE FUNCTION get_class_participants(p_class_id UUID)
      RETURNS TABLE(user_id UUID, email VARCHAR, booked_at TIMESTAMPTZ)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT cb.user_id, u.email, cb.booked_at
        FROM class_bookings cb
        JOIN auth.users u ON u.id = cb.user_id
        WHERE cb.class_id = p_class_id;
      END;
      $$;
      
      -- New function: check if user is club admin/owner
      CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID, p_user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM club_memberships
          WHERE club_id = p_club_id
          AND user_id = p_user_id
          AND role IN ('owner','admin')
          AND status = 'active'
        );
      END;
      $$;
      
      -- New function: check if user is club member
      CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM club_memberships
          WHERE club_id = p_club_id
          AND user_id = p_user_id
          AND status = 'active'
        );
      END;
      $$;
      
      -- New function: get user's clubs
      CREATE OR REPLACE FUNCTION get_user_clubs(p_user_id UUID DEFAULT auth.uid())
      RETURNS TABLE(club_id UUID, club_name TEXT, club_slug TEXT, role TEXT, status TEXT)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT c.id, c.name, c.slug, cm.role, cm.status
        FROM club_memberships cm
        JOIN clubs c ON c.id = cm.club_id
        WHERE cm.user_id = p_user_id;
      END;
      $$;
    `
  }
];

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Connected!\n');
  
  for (const m of migrations) {
    console.log(`Running: ${m.name}`);
    try {
      await client.query(m.sql);
      console.log(`  ✅ ${m.name} — done\n`);
    } catch (err) {
      console.error(`  ❌ ${m.name} — FAILED: ${err.message}\n`);
      // Continue with other migrations
    }
  }
  
  // Verify
  console.log('--- Verification ---');
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));
  
  const clubs = await client.query("SELECT id, slug, name FROM clubs");
  console.log('Clubs:', clubs.rows);
  
  const memberships = await client.query("SELECT cm.role, cm.status, u.email FROM club_memberships cm JOIN auth.users u ON u.id = cm.user_id");
  console.log('Memberships:', memberships.rows);
  
  await client.end();
  console.log('\nDone!');
}

run().catch(e => { console.error(e); process.exit(1); });
