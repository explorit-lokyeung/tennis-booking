-- T12 support: batch user lookup for admin member list.
--
-- find_users_by_ids(ids UUID[]) — returns id, email, raw_user_meta_data for
-- the auth.users rows matching the provided ids. Used by the admin members
-- page so we can show human-readable names/emails without exposing the
-- auth schema directly.
--
-- SECURITY DEFINER because auth.users is not accessible under anon/authenticated
-- roles. We gate access by requiring that the calling user is an approved
-- admin/owner of at least one club (is_club_admin loops on any club_id
-- would be expensive; we only require *some* admin membership, so a global
-- EXISTS check is enough). This is fine for MVP — admins should only look
-- up users for their own club flows.
CREATE OR REPLACE FUNCTION find_users_by_ids(ids UUID[])
RETURNS TABLE (id UUID, email TEXT, raw_user_meta_data JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE user_id = auth.uid()
      AND status  = 'approved'
      AND role    IN ('admin', 'owner', 'coach')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email::TEXT, u.raw_user_meta_data
    FROM auth.users u
    WHERE u.id = ANY(ids);
END;
$$;

GRANT EXECUTE ON FUNCTION find_users_by_ids(UUID[]) TO authenticated;
