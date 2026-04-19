-- 006: Add image_url to courts + recurring_day/recurring_hour to bookings
ALTER TABLE courts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Support recurring bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_group_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
