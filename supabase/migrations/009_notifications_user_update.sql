-- Allow users to mark their own notifications as read (set sent_at).
-- Used by the in-app notification bell. Users can only flip the sent_at
-- timestamp on their own rows; they can't change the body/subject/etc.

DROP POLICY IF EXISTS "notifications_update_self" ON notifications;
CREATE POLICY "notifications_update_self" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
             WITH CHECK (auth.uid() = user_id);
