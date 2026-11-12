-- ============================================================
-- Migration: outing_hub
-- Description: the outing is created as soon as it has a name, then completed
--              from the outing hub (« Quand ? » / « Qui ? » / « Comment ? »).
--   1. invite_friends_to_outing (internal) : shared invitation logic.
--   2. RPC create_outing_with_invites      : candidate days become optional.
--   3. RPC set_outing_days                  : organizer edits the candidate days.
--   4. RPC invite_to_outing                 : organizer invites friends later.
--   5. RPC set_my_outing_slots              : attendee replaces their own slots.
--   6. Realtime on outing_days.
-- Tests : supabase/tests/database/outing_hub.test.sql
-- ============================================================

-- ============================================================
-- 1. Internal helper: invite accepted friends of the inviter.
--    A declined invitee is invited again; other members are left untouched.
--    Returns the number of friends whose participation became « invited ».
-- ============================================================
CREATE FUNCTION public.invite_friends_to_outing(
  p_outing_id UUID,
  p_inviter_id UUID,
  p_invitee_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitee UUID;
  v_count INTEGER := 0;
  v_rows INTEGER;
BEGIN
  FOREACH v_invitee IN ARRAY coalesce(p_invitee_ids, ARRAY[]::UUID[]) LOOP
    CONTINUE WHEN v_invitee = p_inviter_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = p_inviter_id AND f.friend_id = v_invitee)
          OR (f.friend_id = p_inviter_id AND f.user_id = v_invitee)
        )
    ) THEN
      RAISE EXCEPTION 'invitee % is not an accepted friend', v_invitee USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.outing_participants (outing_id, user_id, status)
    VALUES (p_outing_id, v_invitee, 'invited')
    ON CONFLICT (outing_id, user_id) DO UPDATE
      SET status = 'invited', responded_at = NULL
      WHERE public.outing_participants.status = 'declined';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_friends_to_outing(UUID, UUID, UUID[])
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 2. RPC create_outing_with_invites: candidate days are optional
--    (the hub creates the outing from its name only).
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_outing_with_invites(
  p_title TEXT,
  p_days DATE[],
  p_slots JSONB,
  p_invitee_ids UUID[],
  p_outing_type public.outing_type DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_outing_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.outings (title, start_date, status, created_by, outing_type)
  VALUES (btrim(p_title), NULL, 'draft', v_user, p_outing_type)
  RETURNING id INTO v_outing_id;

  INSERT INTO public.outing_participants (outing_id, user_id, status, responded_at)
  VALUES (v_outing_id, v_user, 'accepted', now());

  INSERT INTO public.outing_days (outing_id, day)
  SELECT DISTINCT v_outing_id, d FROM unnest(coalesce(p_days, ARRAY[]::DATE[])) AS d;

  PERFORM public.replace_outing_availabilities(v_outing_id, v_user, coalesce(p_slots, '[]'::jsonb));
  PERFORM public.invite_friends_to_outing(v_outing_id, v_user, p_invitee_ids);

  RETURN v_outing_id;
END;
$$;

-- ============================================================
-- 3. RPC set_outing_days: the organizer replaces the candidate days.
--    - a new day cannot be in the past;
--    - the day of the chosen date (start_date, Europe/Paris) cannot be removed;
--    - slots of a removed day are deleted (FK cascade);
--    - activities of a removed day move to « Peu importe » (day NULL) and lose
--      their « retained » flag, so that no proposal or vote is lost.
-- ============================================================
CREATE FUNCTION public.set_outing_days(p_outing_id UUID, p_days DATE[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_days DATE[] := ARRAY(SELECT DISTINCT d FROM unnest(coalesce(p_days, ARRAY[]::DATE[])) AS d);
  v_chosen_day DATE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_organizer(p_outing_id, v_user) THEN
    RAISE EXCEPTION 'only the organizer can change the days' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_days) AS d
    WHERE d < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.outing_days od WHERE od.outing_id = p_outing_id AND od.day = d
      )
  ) THEN
    RAISE EXCEPTION 'a new candidate day cannot be in the past' USING ERRCODE = '22023';
  END IF;

  SELECT (o.start_date AT TIME ZONE 'Europe/Paris')::DATE INTO v_chosen_day
  FROM public.outings o WHERE o.id = p_outing_id;
  IF v_chosen_day IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.outing_days od
                 WHERE od.outing_id = p_outing_id AND od.day = v_chosen_day)
     AND NOT (v_chosen_day = ANY (v_days)) THEN
    RAISE EXCEPTION 'the chosen day % cannot be removed', v_chosen_day USING ERRCODE = '22023';
  END IF;

  UPDATE public.outing_activities
  SET day = NULL, chosen = false
  WHERE outing_id = p_outing_id AND day IS NOT NULL AND NOT (day = ANY (v_days));

  DELETE FROM public.outing_days
  WHERE outing_id = p_outing_id AND NOT (day = ANY (v_days));

  INSERT INTO public.outing_days (outing_id, day)
  SELECT p_outing_id, d FROM unnest(v_days) AS d
  ON CONFLICT (outing_id, day) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_outing_days(UUID, DATE[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_outing_days(UUID, DATE[]) TO authenticated;

-- ============================================================
-- 4. RPC invite_to_outing: the organizer invites friends after creation.
--    Returns the number of newly invited friends.
-- ============================================================
CREATE FUNCTION public.invite_to_outing(p_outing_id UUID, p_invitee_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_organizer(p_outing_id, v_user) THEN
    RAISE EXCEPTION 'only the organizer can invite' USING ERRCODE = '42501';
  END IF;

  RETURN public.invite_friends_to_outing(p_outing_id, v_user, p_invitee_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_to_outing(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_to_outing(UUID, UUID[]) TO authenticated;

-- ============================================================
-- 5. RPC set_my_outing_slots: an attendee (organizer, accepted or « maybe »)
--    replaces all their slots at once.
--    p_slots: [{"day": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM"}, ...]
-- ============================================================
CREATE FUNCTION public.set_my_outing_slots(p_outing_id UUID, p_slots JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_attendee(p_outing_id) THEN
    RAISE EXCEPTION 'only an attendee can change their availability' USING ERRCODE = '42501';
  END IF;

  PERFORM public.replace_outing_availabilities(p_outing_id, auth.uid(), p_slots);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_outing_slots(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_outing_slots(UUID, JSONB) TO authenticated;

-- ============================================================
-- 6. Realtime: the hub summary follows the candidate days live.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.outing_days;
