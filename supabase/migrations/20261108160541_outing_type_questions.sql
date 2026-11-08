-- ============================================================
-- Migration: outing_type_questions
-- Description: step 4 of the "Parcours complet d'une sortie" note.
--   1. Enums outing_type, outing_activity_type, outing_budget.
--   2. outings.outing_type (NULL = type not chosen yet), set by the organizer.
--   3. outing_answers: one row per member and outing holding the guided
--      answers (typed columns; which ones are used depends on the outing type).
--   4. create_outing_with_invites takes the outing type (atomic creation).
-- Tests : supabase/tests/database/outing_type_questions.test.sql
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE public.outing_type AS ENUM ('precise', 'one_day', 'holidays');

CREATE TYPE public.outing_activity_type AS ENUM (
  'food', 'drinks', 'sport', 'culture', 'party', 'nature', 'other'
);

CREATE TYPE public.outing_budget AS ENUM ('low', 'medium', 'high');

-- ============================================================
-- 2. outings.outing_type
-- ============================================================
ALTER TABLE public.outings ADD COLUMN outing_type public.outing_type;

COMMENT ON COLUMN public.outings.outing_type IS
  'Type de sortie choisi par l''organisateur (precise, one_day, holidays). NULL tant qu''il n''est pas choisi.';

-- ============================================================
-- 3. OUTING_ANSWERS
-- ============================================================
CREATE TABLE public.outing_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- precise
  activity_type public.outing_activity_type,
  place_wish TEXT,
  preferred_time TIME,
  eat_before BOOLEAN,
  -- one_day
  day_preferences TEXT[] NOT NULL DEFAULT '{}',
  -- holidays
  period_start DATE,
  period_end DATE,
  budget public.outing_budget,
  wishes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outing_answers_one_per_member UNIQUE (outing_id, user_id),
  CONSTRAINT outing_answers_valid_period
    CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start),
  CONSTRAINT outing_answers_known_day_preferences
    CHECK (day_preferences <@ ARRAY['morning', 'afternoon', 'evening', 'outdoor', 'indoor', 'active', 'relaxed']),
  CONSTRAINT outing_answers_known_wishes
    CHECK (wishes <@ ARRAY['beach', 'mountain', 'city', 'culture', 'party', 'relax']),
  CONSTRAINT outing_answers_place_wish_length
    CHECK (place_wish IS NULL OR char_length(place_wish) <= 200)
);

CREATE INDEX outing_answers_outing_id_idx ON public.outing_answers (outing_id);

CREATE TRIGGER update_outing_answers_updated_at
  BEFORE UPDATE ON public.outing_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.outing_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres peuvent lire les réponses"
  ON public.outing_answers FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

-- A member who declined the outing can no longer answer.
CREATE POLICY "Membre peut ajouter ses réponses"
  ON public.outing_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.is_outing_member(outing_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.outing_participants p
      WHERE p.outing_id = outing_answers.outing_id
        AND p.user_id = (SELECT auth.uid())
        AND p.status = 'declined'
    )
  );

CREATE POLICY "Membre peut modifier ses réponses"
  ON public.outing_answers FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.is_outing_member(outing_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.outing_participants p
      WHERE p.outing_id = outing_answers.outing_id
        AND p.user_id = (SELECT auth.uid())
        AND p.status = 'declined'
    )
  );

CREATE POLICY "Membre peut supprimer ses réponses"
  ON public.outing_answers FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.outing_answers FROM anon;
GRANT SELECT, INSERT, DELETE ON public.outing_answers TO authenticated;
GRANT UPDATE (
  activity_type, place_wish, preferred_time, eat_before,
  day_preferences, period_start, period_end, budget, wishes, updated_at
) ON public.outing_answers TO authenticated;

-- ============================================================
-- 4. RPC create_outing_with_invites takes the outing type
--    (the type chosen in the wizard is saved atomically with the outing).
--    Callers that omit p_outing_type keep working (NULL = not chosen yet).
-- ============================================================
DROP FUNCTION public.create_outing_with_invites(TEXT, DATE[], JSONB, UUID[]);

CREATE FUNCTION public.create_outing_with_invites(
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

  INSERT INTO public.outings (title, start_date, status, created_by, outing_type)
  VALUES (btrim(p_title), NULL, 'draft', v_user, p_outing_type)
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

REVOKE EXECUTE ON FUNCTION public.create_outing_with_invites(TEXT, DATE[], JSONB, UUID[], public.outing_type)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_outing_with_invites(TEXT, DATE[], JSONB, UUID[], public.outing_type)
  TO authenticated;
