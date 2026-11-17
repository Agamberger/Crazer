-- ============================================================
-- Migration: activity_pool
-- Description: the proposed activities of an outing form a POOL that any
--              attendee drops into the programme (a planned_outings step);
--              removing the step puts the activity back in the pool.
--   RPC place_outing_activity: any attendee, any activity of the pool (no
--   « retained » nor day condition). The steps that the new step overlaps are
--   moved later, in cascade, only as much as needed; the server decides which
--   steps move, never the client.
--
-- Transition: `outing_activities.day`, `outing_activities.chosen` and the
-- choose / draw / reopen RPCs are kept, unused by the new app, so that the
-- versions already installed keep working. They are dropped in a later
-- migration, once those versions are no longer supported.
-- Tests : supabase/tests/database/outing_planning.test.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_outing_activity(
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
  v_step RECORD;
  v_cursor TIMESTAMPTZ;
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
  IF NOT public.is_outing_attendee(v_activity.outing_id) THEN
    RAISE EXCEPTION 'only an attendee can place an activity' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.planned_outings
    WHERE activity_id = p_activity_id AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'activity already placed' USING ERRCODE = '23505';
  END IF;

  v_cursor := p_scheduled_for + make_interval(mins => p_duration_min);
  FOR v_step IN
    SELECT id, scheduled_for, duration_min
    FROM public.planned_outings
    WHERE outing_id = v_activity.outing_id
      AND status <> 'cancelled'
      AND scheduled_for >= p_scheduled_for
    ORDER BY scheduled_for, created_at
  LOOP
    EXIT WHEN v_step.scheduled_for >= v_cursor;
    UPDATE public.planned_outings SET scheduled_for = v_cursor WHERE id = v_step.id;
    v_cursor := v_cursor + make_interval(mins => GREATEST(coalesce(v_step.duration_min, 60), 1));
  END LOOP;

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
