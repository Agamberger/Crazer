-- ============================================================
-- Migration: activity_votes
-- Description: step 5 of the "Parcours complet d'une sortie" note.
--   1. outing_activities: activities proposed by members, per candidate day
--      (day NULL = "any day"), optionally linked to a saved place (`place_id`),
--      with a `chosen` flag set by the organizer.
--   2. outing_activity_votes: one vote (accepted / maybe) per member and
--      activity. No row = no vote.
--   3. RPCs (organizer only): choose_outing_activity, draw_outing_activity
--      (random tie-break among the best scored activities), reopen_outing_activities.
--   4. Realtime on both tables.
-- Decisions: the organizer settles a persistent tie (by hand or by a random
-- draw); activities are not ordered by the vote (ordering is lot 5, planning).
-- Tests : supabase/tests/database/activity_votes.test.sql
-- ============================================================

CREATE TYPE public.activity_vote AS ENUM ('accepted', 'maybe');

-- ============================================================
-- Helper: the caller attends the outing (organizer, accepted or "maybe").
-- ============================================================
CREATE FUNCTION public.is_outing_attendee(p_outing_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outings o
    WHERE o.id = p_outing_id AND o.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.outing_participants p
    WHERE p.outing_id = p_outing_id
      AND p.user_id = auth.uid()
      AND p.status IN ('accepted', 'maybe')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_outing_attendee(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_outing_attendee(UUID) TO authenticated;

-- ============================================================
-- 1. OUTING_ACTIVITIES
-- ============================================================
CREATE TABLE public.outing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  -- NULL = proposed for the whole outing; otherwise one of the candidate days.
  day DATE,
  title TEXT NOT NULL,
  note TEXT,
  proposed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Optional saved place (Crazer place or one imported from Google Maps) the activity happens at.
  place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
  chosen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outing_activities_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT outing_activities_note_length
    CHECK (note IS NULL OR char_length(note) <= 300),
  -- Needed by the composite foreign key of the votes.
  CONSTRAINT outing_activities_id_outing_unique UNIQUE (id, outing_id),
  -- An activity can only target one of the outing's candidate days (NULL day passes).
  CONSTRAINT outing_activities_candidate_day
    FOREIGN KEY (outing_id, day) REFERENCES public.outing_days (outing_id, day) ON DELETE CASCADE
);

-- At most one chosen activity per day (and one for the "any day" group).
CREATE UNIQUE INDEX outing_activities_one_chosen_per_day
  ON public.outing_activities (outing_id, day) WHERE chosen AND day IS NOT NULL;
CREATE UNIQUE INDEX outing_activities_one_chosen_without_day
  ON public.outing_activities (outing_id) WHERE chosen AND day IS NULL;
CREATE INDEX outing_activities_outing_id_idx ON public.outing_activities (outing_id);
CREATE INDEX outing_activities_place_id_idx ON public.outing_activities (place_id);

CREATE TRIGGER update_outing_activities_updated_at
  BEFORE UPDATE ON public.outing_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.outing_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres peuvent lire les activités"
  ON public.outing_activities FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

CREATE POLICY "Participant peut proposer une activité"
  ON public.outing_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = proposed_by
    AND NOT chosen
    AND public.is_outing_attendee(outing_id)
  );

CREATE POLICY "Auteur ou organisateur peut modifier une activité"
  ON public.outing_activities FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = proposed_by
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT auth.uid()) = proposed_by
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  );

CREATE POLICY "Auteur ou organisateur peut supprimer une activité"
  ON public.outing_activities FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = proposed_by
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  );

REVOKE ALL ON public.outing_activities FROM anon;
GRANT SELECT, INSERT, DELETE ON public.outing_activities TO authenticated;
-- `chosen` is only written by the RPCs below.
GRANT UPDATE (title, note, updated_at) ON public.outing_activities TO authenticated;

-- ============================================================
-- 2. OUTING_ACTIVITY_VOTES
-- ============================================================
CREATE TABLE public.outing_activity_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL,
  outing_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote public.activity_vote NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outing_activity_votes_one_per_member UNIQUE (activity_id, user_id),
  -- outing_id always matches the activity's outing (used by RLS and realtime filters).
  CONSTRAINT outing_activity_votes_activity_fk
    FOREIGN KEY (activity_id, outing_id)
    REFERENCES public.outing_activities (id, outing_id) ON DELETE CASCADE
);

CREATE INDEX outing_activity_votes_outing_id_idx ON public.outing_activity_votes (outing_id);

CREATE TRIGGER update_outing_activity_votes_updated_at
  BEFORE UPDATE ON public.outing_activity_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.outing_activity_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres peuvent lire les votes"
  ON public.outing_activity_votes FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

CREATE POLICY "Participant peut voter"
  ON public.outing_activity_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.is_outing_attendee(outing_id)
  );

CREATE POLICY "Participant peut modifier son vote"
  ON public.outing_activity_votes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.is_outing_attendee(outing_id)
  );

CREATE POLICY "Participant peut retirer son vote"
  ON public.outing_activity_votes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.outing_activity_votes FROM anon;
GRANT SELECT, INSERT, DELETE ON public.outing_activity_votes TO authenticated;
GRANT UPDATE (vote, updated_at) ON public.outing_activity_votes TO authenticated;

-- ============================================================
-- 3. RPCs (organizer only)
-- ============================================================

-- Internal: marks one activity as chosen and clears the other ones of its day group.
CREATE FUNCTION public.set_chosen_outing_activity(p_activity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outing_id UUID;
  v_day DATE;
BEGIN
  SELECT outing_id, day INTO v_outing_id, v_day
  FROM public.outing_activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.outing_activities
  SET chosen = FALSE
  WHERE outing_id = v_outing_id AND day IS NOT DISTINCT FROM v_day AND chosen;

  UPDATE public.outing_activities SET chosen = TRUE WHERE id = p_activity_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_chosen_outing_activity(UUID) FROM PUBLIC, anon, authenticated;

-- The organizer picks the activity of its day group (also settles a persistent tie).
CREATE FUNCTION public.choose_outing_activity(p_activity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outing_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT outing_id INTO v_outing_id FROM public.outing_activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_outing_organizer(v_outing_id, auth.uid()) THEN
    RAISE EXCEPTION 'only the organizer can choose the activity' USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_chosen_outing_activity(p_activity_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.choose_outing_activity(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_outing_activity(UUID) TO authenticated;

-- Random tie-break: draws among the best scored activities of a day group
-- (accepted = 2 points, maybe = 1 point), chooses it and returns its id.
CREATE FUNCTION public.draw_outing_activity(p_outing_id UUID, p_day DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_organizer(p_outing_id, auth.uid()) THEN
    RAISE EXCEPTION 'only the organizer can draw the activity' USING ERRCODE = '42501';
  END IF;

  WITH scores AS (
    SELECT a.id,
           coalesce(sum(CASE v.vote WHEN 'accepted' THEN 2 WHEN 'maybe' THEN 1 END), 0) AS score
    FROM public.outing_activities a
    LEFT JOIN public.outing_activity_votes v ON v.activity_id = a.id
    WHERE a.outing_id = p_outing_id AND a.day IS NOT DISTINCT FROM p_day
    GROUP BY a.id
  )
  SELECT id INTO v_winner
  FROM scores
  WHERE score = (SELECT max(score) FROM scores)
  ORDER BY random()
  LIMIT 1;

  IF v_winner IS NULL THEN
    RAISE EXCEPTION 'no activity to draw' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.set_chosen_outing_activity(v_winner);
  RETURN v_winner;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.draw_outing_activity(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_outing_activity(UUID, DATE) TO authenticated;

-- Reopens the vote of a day group (no activity chosen any more).
CREATE FUNCTION public.reopen_outing_activities(p_outing_id UUID, p_day DATE DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_outing_organizer(p_outing_id, auth.uid()) THEN
    RAISE EXCEPTION 'only the organizer can reopen the vote' USING ERRCODE = '42501';
  END IF;

  UPDATE public.outing_activities
  SET chosen = FALSE
  WHERE outing_id = p_outing_id AND day IS NOT DISTINCT FROM p_day AND chosen;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reopen_outing_activities(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_outing_activities(UUID, DATE) TO authenticated;

-- ============================================================
-- 4. REALTIME (postgres_changes respects RLS)
-- FULL identity so that DELETE events carry outing_id and match the filter.
-- ============================================================
ALTER TABLE public.outing_activities REPLICA IDENTITY FULL;
ALTER TABLE public.outing_activity_votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outing_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outing_activity_votes;
