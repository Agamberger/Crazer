-- ============================================================
-- Migration: outing_days_guards
-- Description: safer rules for set_outing_days (outing hub « Quand ? »).
--   - the candidate days cannot change while a day is chosen (start_date set):
--     the organizer removes the date first (« Changer de jour »). This replaces
--     the « chosen day cannot be removed » check, which compared days in
--     Europe/Paris while the app builds start_date in the device time zone;
--   - a day whose retained activity is already placed as a step
--     (planned_outings.activity_id) cannot be removed, so that no step is left
--     linked to an activity that is not retained any more.
-- Tests : supabase/tests/database/outing_hub.test.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_outing_days(p_outing_id UUID, p_days DATE[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_days DATE[] := ARRAY(SELECT DISTINCT d FROM unnest(coalesce(p_days, ARRAY[]::DATE[])) AS d);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_organizer(p_outing_id, v_user) THEN
    RAISE EXCEPTION 'only the organizer can change the days' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.outings o WHERE o.id = p_outing_id AND o.start_date IS NOT NULL)
     AND (
       EXISTS (SELECT 1 FROM unnest(v_days) AS d
               WHERE NOT EXISTS (SELECT 1 FROM public.outing_days od
                                 WHERE od.outing_id = p_outing_id AND od.day = d))
       OR EXISTS (SELECT 1 FROM public.outing_days od
                  WHERE od.outing_id = p_outing_id AND NOT (od.day = ANY (v_days)))
     ) THEN
    RAISE EXCEPTION 'the candidate days cannot change while a day is chosen' USING ERRCODE = '22023';
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

  IF EXISTS (
    SELECT 1
    FROM public.outing_activities a
    JOIN public.planned_outings p ON p.activity_id = a.id
    WHERE a.outing_id = p_outing_id
      AND a.day IS NOT NULL
      AND NOT (a.day = ANY (v_days))
  ) THEN
    RAISE EXCEPTION 'a day with an activity placed in the planning cannot be removed'
      USING ERRCODE = '22023';
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
