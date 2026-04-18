-- T20: Attendance tracking for classes.
--
-- Add a simple `attended` boolean to class_bookings so coaches and admins
-- can mark each confirmed participant as having shown up to a given
-- session. For the MVP we track attendance at the class level (one row per
-- member per class) rather than per-session — if a class has multiple
-- recurring sessions we would add a separate attendance_events table.

ALTER TABLE class_bookings
  ADD COLUMN IF NOT EXISTS attended BOOLEAN NOT NULL DEFAULT FALSE;

-- No new RLS policies needed: class_bookings_admin_all already lets admins
-- UPDATE any class_booking row in their club. Coaches should also be able
-- to update attendance for their own club — add a targeted policy.

DROP POLICY IF EXISTS "class_bookings_coach_update_attendance" ON class_bookings;

CREATE POLICY "class_bookings_coach_update_attendance" ON class_bookings
  FOR UPDATE USING (is_club_coach(club_id))
             WITH CHECK (is_club_coach(club_id));

-- Update the RPC used by admin class detail to include attendance.
CREATE OR REPLACE FUNCTION get_class_participants(p_class_id UUID)
RETURNS TABLE (
  booking_id UUID,
  user_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  attended BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Allow admins, coaches, or owners of the class's club to see the participant list.
  IF NOT EXISTS (
    SELECT 1
    FROM classes c
    JOIN club_memberships cm ON cm.club_id = c.club_id
    WHERE c.id = p_class_id
      AND cm.user_id = auth.uid()
      AND cm.status  = 'approved'
      AND cm.role    IN ('admin', 'owner', 'coach')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN QUERY
    SELECT cb.id, cb.user_id,
           COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS name,
           u.email::TEXT,
           COALESCE(u.raw_user_meta_data->>'phone', '')::TEXT AS phone,
           cb.attended,
           cb.created_at
    FROM class_bookings cb
    JOIN auth.users u ON u.id = cb.user_id
    WHERE cb.class_id = p_class_id
      AND cb.status = 'confirmed'
    ORDER BY cb.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_class_participants(UUID) TO authenticated;
