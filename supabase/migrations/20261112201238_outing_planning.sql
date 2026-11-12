-- ============================================================
-- Migration: outing_planning
-- Description: step 6 of the "Parcours complet d'une sortie" note:
-- place the retained activities in the day.
--   1. planned_outings.activity_id: a step can come from a retained activity
--      (placed once; same outing, enforced by a composite foreign key).
--   2. RPC place_outing_activity (organizer only): turns a retained activity
--      into a step at the given time.
--   3. RPC reschedule_outing_steps (organizer only): saves the order and times
--      of several steps atomically (reorder, durations, suggested schedule).
--      RPC apply_outing_planning (organizer only): reschedules and places
--      activities in one transaction (what the app calls).
--   4. RPC set_my_outing_availability: a member changes their own slot for one
--      day (late arrival / early departure).
--   5. Realtime on planned_outings (everyone sees the planning live).
-- Decisions: the app suggests the times, the organizer orders the steps; a
-- late arrival is the member's own availability of the day.
-- Tests : supabase/tests/database/outing_planning.test.sql
-- ============================================================

-- ============================================================
-- 1. planned_outings.activity_id
-- ============================================================
ALTER TABLE public.planned_outings ADD COLUMN activity_id UUID;

ALTER TABLE public.planned_outings
  ADD CONSTRAINT planned_outings_activity_fk
  FOREIGN KEY (activity_id, outing_id)
  REFERENCES public.outing_activities (id, outing_id)
  ON DELETE SET NULL (activity_id);

-- An activity is placed at most once (a cancelled step frees it).
CREATE UNIQUE INDEX planned_outings_one_step_per_activity
  ON public.planned_outings (activity_id) WHERE activity_id IS NOT NULL AND status <> 'cancelled';

COMMENT ON COLUMN public.planned_outings.activity_id IS
  'Activité retenue (outing_activities) dont provient l''étape, NULL pour une étape ajoutée à la main. Écrite uniquement par place_outing_activity.';

-- activity_id is only written by place_outing_activity (SECURITY DEFINER).
REVOKE INSERT ON public.planned_outings FROM authenticated;
GRANT INSERT (
  id, outing_id, place_id, title, description, notes, scheduled_for, duration_min, status,
  created_by, created_at, updated_at
) ON public.planned_outings TO authenticated;

-- ============================================================
-- Internal helper: moves the outing's start date back so that a step can
-- start earlier (e.g. the common slot started late because of a late arrival).
-- ============================================================
CREATE FUNCTION public.lower_outing_start_date(p_outing_id UUID, p_earliest TIMESTAMPTZ)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.outings
  SET start_date = p_earliest
  WHERE id = p_outing_id AND start_date IS NOT NULL AND start_date > p_earliest;
$$;

REVOKE EXECUTE ON FUNCTION public.lower_outing_start_date(UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 2. RPC place_outing_activity
-- ============================================================
CREATE FUNCTION public.place_outing_activity(
  p_activity_id UUID,
  p_scheduled_for TIMESTAMPTZ,
  p_duration_min INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_activity public.outing_activities%ROWTYPE;
  v_step_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_scheduled_for IS NULL THEN
    RAISE EXCEPTION 'scheduled_for is required' USING ERRCODE = '22023';
  END IF;
  IF p_duration_min IS NULL OR p_duration_min NOT BETWEEN 1 AND 1440 THEN
    RAISE EXCEPTION 'duration must be between 1 and 1440 minutes' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_activity FROM public.outing_activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_outing_organizer(v_activity.outing_id, auth.uid()) THEN
    RAISE EXCEPTION 'only the organizer can place an activity' USING ERRCODE = '42501';
  END IF;
  IF NOT v_activity.chosen THEN
    RAISE EXCEPTION 'only a retained activity can be placed' USING ERRCODE = '22023';
  END IF;
  -- A day-specific activity goes on its day, in any time zone (UTC-12 to UTC+14).
  IF v_activity.day IS NOT NULL AND (
    p_scheduled_for < (v_activity.day::TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '14 hours'
    OR p_scheduled_for >= ((v_activity.day + 1)::TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '12 hours'
  ) THEN
    RAISE EXCEPTION 'the activity must be placed on its day' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.planned_outings
    WHERE activity_id = p_activity_id AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'activity already placed' USING ERRCODE = '23505';
  END IF;

  PERFORM public.lower_outing_start_date(v_activity.outing_id, p_scheduled_for);

  INSERT INTO public.planned_outings (
    outing_id, activity_id, place_id, title, notes, scheduled_for, duration_min, status, created_by
  )
  VALUES (
    v_activity.outing_id, v_activity.id, v_activity.place_id, v_activity.title, v_activity.note,
    p_scheduled_for, p_duration_min, 'pending', auth.uid()
  )
  RETURNING id INTO v_step_id;

  RETURN v_step_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_outing_activity(UUID, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_outing_activity(UUID, TIMESTAMPTZ, INTEGER) TO authenticated;

-- ============================================================
-- 3. RPC reschedule_outing_steps
-- p_steps: [{"id": uuid, "scheduled_for": timestamptz, "duration_min": int}, ...]
-- ============================================================
CREATE FUNCTION public.reschedule_outing_steps(p_outing_id UUID, p_steps JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_step JSONB;
  v_earliest TIMESTAMPTZ;
  v_duration INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_organizer(p_outing_id, auth.uid()) THEN
    RAISE EXCEPTION 'only the organizer can reschedule the steps' USING ERRCODE = '42501';
  END IF;
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' THEN
    RAISE EXCEPTION 'steps must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_steps) AS s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.planned_outings p
      WHERE p.id = (s ->> 'id')::UUID AND p.outing_id = p_outing_id
    )
  ) THEN
    RAISE EXCEPTION 'every step must belong to the outing' USING ERRCODE = '22023';
  END IF;

  SELECT min((s ->> 'scheduled_for')::TIMESTAMPTZ) INTO v_earliest
  FROM jsonb_array_elements(p_steps) AS s;
  IF v_earliest IS NOT NULL THEN
    PERFORM public.lower_outing_start_date(p_outing_id, v_earliest);
  END IF;

  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps) LOOP
    IF v_step ->> 'scheduled_for' IS NULL THEN
      RAISE EXCEPTION 'scheduled_for is required' USING ERRCODE = '22023';
    END IF;
    v_duration := (v_step ->> 'duration_min')::INTEGER;
    IF v_duration IS NOT NULL AND v_duration NOT BETWEEN 1 AND 1440 THEN
      RAISE EXCEPTION 'duration must be between 1 and 1440 minutes' USING ERRCODE = '22023';
    END IF;

    UPDATE public.planned_outings
    SET scheduled_for = (v_step ->> 'scheduled_for')::TIMESTAMPTZ,
        duration_min = coalesce(v_duration, duration_min)
    WHERE id = (v_step ->> 'id')::UUID;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reschedule_outing_steps(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_outing_steps(UUID, JSONB) TO authenticated;

-- ============================================================
-- RPC apply_outing_planning: reschedule + placements in one transaction.
-- p_placements: [{"activity_id": uuid, "scheduled_for": timestamptz, "duration_min": int}, ...]
-- ============================================================
CREATE FUNCTION public.apply_outing_planning(
  p_outing_id UUID,
  p_steps JSONB,
  p_placements JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_placement JSONB;
BEGIN
  IF p_placements IS NULL OR jsonb_typeof(p_placements) <> 'array' THEN
    RAISE EXCEPTION 'placements must be a JSON array' USING ERRCODE = '22023';
  END IF;

  PERFORM public.reschedule_outing_steps(p_outing_id, p_steps);

  FOR v_placement IN SELECT * FROM jsonb_array_elements(p_placements) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.outing_activities
      WHERE id = (v_placement ->> 'activity_id')::UUID AND outing_id = p_outing_id
    ) THEN
      RAISE EXCEPTION 'every activity must belong to the outing' USING ERRCODE = '22023';
    END IF;
    PERFORM public.place_outing_activity(
      (v_placement ->> 'activity_id')::UUID,
      (v_placement ->> 'scheduled_for')::TIMESTAMPTZ,
      (v_placement ->> 'duration_min')::INTEGER
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_outing_planning(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_outing_planning(UUID, JSONB, JSONB) TO authenticated;

-- ============================================================
-- 4. RPC set_my_outing_availability (late arrival / early departure)
-- ============================================================
CREATE FUNCTION public.set_my_outing_availability(
  p_outing_id UUID,
  p_day DATE,
  p_start TIME,
  p_end TIME
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_attendee(p_outing_id) THEN
    RAISE EXCEPTION 'only an attendee can change their availability' USING ERRCODE = '42501';
  END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
    RAISE EXCEPTION 'the slot must end after it starts' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.outing_days WHERE outing_id = p_outing_id AND day = p_day
  ) THEN
    RAISE EXCEPTION 'day % is not a candidate day of this outing', p_day USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.outing_availabilities (outing_id, user_id, day, start_time, end_time)
  VALUES (p_outing_id, auth.uid(), p_day, p_start, p_end)
  ON CONFLICT (outing_id, user_id, day)
  DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_outing_availability(UUID, DATE, TIME, TIME) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_outing_availability(UUID, DATE, TIME, TIME) TO authenticated;

-- ============================================================
-- 5. REALTIME (postgres_changes respects RLS)
-- FULL identity so that DELETE events carry outing_id and match the filter.
-- ============================================================
ALTER TABLE public.planned_outings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.planned_outings;
