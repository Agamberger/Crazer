-- ============================================================
-- Migration: outing_without_date
-- Description: an outing may exist without a precise date.
--   1. outings.start_date becomes nullable (NULL = "date to define").
--   2. check_planned_outing_scheduled_for accepts an outing without date.
--   3. create_outing_with_invites no longer takes (nor invents) a start date.
-- Tests : supabase/tests/database/outing_scheduling.test.sql
-- ============================================================

-- ============================================================
-- 1. outings.start_date nullable
-- ============================================================
ALTER TABLE public.outings ALTER COLUMN start_date DROP NOT NULL;

COMMENT ON COLUMN public.outings.start_date IS
  'Date/heure de début de la sortie. NULL tant que la date n''est pas définie (les jours candidats sont dans outing_days).';

-- ============================================================
-- 2. Trigger: scheduled_for >= start_date only when the outing has a date
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_planned_outing_scheduled_for()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_found BOOLEAN;
BEGIN
  SELECT o.start_date, TRUE INTO v_start_date, v_found
  FROM public.outings o
  WHERE o.id = NEW.outing_id;

  IF v_found IS NOT TRUE THEN
    RAISE EXCEPTION 'outing_id % introuvable', NEW.outing_id;
  END IF;

  -- Undated outing: any scheduled_for is accepted.
  IF v_start_date IS NOT NULL AND NEW.scheduled_for < v_start_date THEN
    RAISE EXCEPTION
      'scheduled_for (%) ne peut pas être antérieur à start_date de la sortie (%)',
      NEW.scheduled_for, v_start_date;
  END IF;

  RETURN NEW;
END;
$$;

-- When a date is set on an outing, steps planned before it (default dates of an
-- undated outing) are moved to the start date so the invariant keeps holding.
CREATE OR REPLACE FUNCTION public.align_planned_outings_with_start_date()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.planned_outings
  SET scheduled_for = NEW.start_date
  WHERE outing_id = NEW.id AND scheduled_for < NEW.start_date;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.align_planned_outings_with_start_date()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER outings_align_planned_outings
  AFTER UPDATE OF start_date ON public.outings
  FOR EACH ROW
  WHEN (NEW.start_date IS NOT NULL AND NEW.start_date IS DISTINCT FROM OLD.start_date)
  EXECUTE FUNCTION public.align_planned_outings_with_start_date();

COMMENT ON COLUMN public.planned_outings.scheduled_for IS
  'Date/heure planifiée de l''étape. Doit être >= outings.start_date quand la sortie a une date (validée par trigger). Requise même pour une sortie sans date.';

-- ============================================================
-- 3. RPC create_outing_with_invites without start date
-- ============================================================
DROP FUNCTION public.create_outing_with_invites(TEXT, TIMESTAMPTZ, DATE[], JSONB, UUID[]);

CREATE FUNCTION public.create_outing_with_invites(
  p_title TEXT,
  p_days DATE[],
  p_slots JSONB,
  p_invitee_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_outing_id UUID;
  v_invitee UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;
  IF p_days IS NULL OR cardinality(p_days) = 0 THEN
    RAISE EXCEPTION 'at least one day is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.outings (title, start_date, status, created_by)
  VALUES (btrim(p_title), NULL, 'draft', v_user)
  RETURNING id INTO v_outing_id;

  INSERT INTO public.outing_participants (outing_id, user_id, status, responded_at)
  VALUES (v_outing_id, v_user, 'accepted', now());

  INSERT INTO public.outing_days (outing_id, day)
  SELECT DISTINCT v_outing_id, d FROM unnest(p_days) AS d;

  PERFORM public.replace_outing_availabilities(v_outing_id, v_user, coalesce(p_slots, '[]'::jsonb));

  FOREACH v_invitee IN ARRAY coalesce(p_invitee_ids, ARRAY[]::UUID[]) LOOP
    CONTINUE WHEN v_invitee = v_user;
    IF NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = v_user AND f.friend_id = v_invitee)
          OR (f.friend_id = v_user AND f.user_id = v_invitee)
        )
    ) THEN
      RAISE EXCEPTION 'invitee % is not an accepted friend', v_invitee USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.outing_participants (outing_id, user_id, status)
    VALUES (v_outing_id, v_invitee, 'invited')
    ON CONFLICT (outing_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_outing_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_outing_with_invites(TEXT, DATE[], JSONB, UUID[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_outing_with_invites(TEXT, DATE[], JSONB, UUID[])
  TO authenticated;
