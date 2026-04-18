-- T23: Email notifications queue.
--
-- We record an outbound notification row whenever something happens that
-- would usually earn the user an email (booking confirmed, membership
-- approved, class booking confirmed). Actual email delivery is handled by
-- a separate worker / Supabase Edge Function that reads from this queue
-- and sends via the provider, then flips sent_at. Keeping the queue in
-- Postgres means we can use RLS to lock it down and we don't need a
-- background queue service for the MVP.

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    UUID      REFERENCES clubs(id) ON DELETE SET NULL,
  kind       TEXT      NOT NULL, -- 'booking_confirmed' | 'membership_approved' | 'class_booking_confirmed'
  subject    TEXT      NOT NULL,
  body       TEXT      NOT NULL,
  payload    JSONB     NOT NULL DEFAULT '{}'::jsonb,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(sent_at) WHERE sent_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_self" ON notifications;
CREATE POLICY "notifications_select_self" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Only service_role (trigger / worker) writes notifications; authenticated
-- users cannot INSERT/UPDATE/DELETE. This is enforced by the absence of
-- any INSERT/UPDATE/DELETE policy combined with RLS being enabled.

-- -- Triggers ------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_booking_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_club_name TEXT; v_court_name TEXT;
BEGIN
  SELECT name INTO v_club_name  FROM clubs  WHERE id = NEW.club_id;
  SELECT name INTO v_court_name FROM courts WHERE id = NEW.court_id;
  INSERT INTO notifications (user_id, club_id, kind, subject, body, payload)
  VALUES (
    NEW.user_id, NEW.club_id, 'booking_confirmed',
    format('預約確認 · %s', COALESCE(v_club_name, '')),
    format('你已成功預約 %s · %s · %s:00', COALESCE(v_court_name, '球場'), NEW.date, NEW.hour),
    jsonb_build_object('booking_id', NEW.id, 'date', NEW.date, 'hour', NEW.hour, 'court_id', NEW.court_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_confirmed ON bookings;
CREATE TRIGGER trg_notify_booking_confirmed
  AFTER INSERT ON bookings
  FOR EACH ROW WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION notify_booking_confirmed();

CREATE OR REPLACE FUNCTION notify_membership_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_club_name TEXT;
BEGIN
  IF OLD.status = 'approved' OR NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  SELECT name INTO v_club_name FROM clubs WHERE id = NEW.club_id;
  INSERT INTO notifications (user_id, club_id, kind, subject, body, payload)
  VALUES (
    NEW.user_id, NEW.club_id, 'membership_approved',
    format('會籍已批准 · %s', COALESCE(v_club_name, '')),
    format('你已成為 %s 嘅%s。', COALESCE(v_club_name, '球會'),
      CASE NEW.role
        WHEN 'owner' THEN '東主'
        WHEN 'admin' THEN '管理員'
        WHEN 'coach' THEN '教練'
        ELSE '會員' END),
    jsonb_build_object('membership_id', NEW.id, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_membership_approved ON club_memberships;
CREATE TRIGGER trg_notify_membership_approved
  AFTER UPDATE ON club_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_membership_approved();

CREATE OR REPLACE FUNCTION notify_class_booking_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_class_name TEXT; v_day TEXT; v_time TEXT;
BEGIN
  SELECT name, day, time INTO v_class_name, v_day, v_time FROM classes WHERE id = NEW.class_id;
  INSERT INTO notifications (user_id, club_id, kind, subject, body, payload)
  VALUES (
    NEW.user_id, NEW.club_id, 'class_booking_confirmed',
    format('報名成功 · %s', COALESCE(v_class_name, '課程')),
    format('你已成功報名 %s，時間 %s %s。', COALESCE(v_class_name, '課程'), v_day, v_time),
    jsonb_build_object('class_booking_id', NEW.id, 'class_id', NEW.class_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_class_booking_confirmed ON class_bookings;
CREATE TRIGGER trg_notify_class_booking_confirmed
  AFTER INSERT ON class_bookings
  FOR EACH ROW WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION notify_class_booking_confirmed();
