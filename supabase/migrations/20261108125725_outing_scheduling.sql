-- ============================================================
-- Migration: outing_scheduling
-- Description: Outing creation workflow, steps 1 to 3 of the
--              "Parcours complet d'une sortie" note.
--   1. outing_days           : candidate days chosen by the organizer.
--   2. outing_availabilities : one time slot per member and per day.
--   3. outing_participants   : members can see each other.
--   4. RPC create_outing_with_invites   : atomic creation + invitations.
--   5. RPC respond_to_outing_invitation : join / decline + availabilities.
--   6. Realtime on outing_participants and outing_availabilities.
-- Tests : supabase/tests/database/outing_scheduling.test.sql
-- ============================================================

-- ============================================================
-- 1. OUTING_DAYS
-- ============================================================
CREATE TABLE public.outing_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outing_days_unique_day UNIQUE (outing_id, day)
);

ALTER TABLE public.outing_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres peuvent lire les jours de la sortie"
  ON public.outing_days FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

CREATE POLICY "Organisateur peut ajouter des jours"
  ON public.outing_days FOR INSERT
  TO authenticated
  WITH CHECK (public.is_outing_organizer(outing_id, (SELECT auth.uid())));

CREATE POLICY "Organisateur peut retirer des jours"
  ON public.outing_days FOR DELETE
  TO authenticated
  USING (public.is_outing_organizer(outing_id, (SELECT auth.uid())));

REVOKE ALL ON public.outing_days FROM anon;
GRANT SELECT, INSERT, DELETE ON public.outing_days TO authenticated;

-- ============================================================
-- 2. OUTING_AVAILABILITIES
-- ============================================================
CREATE TABLE public.outing_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outing_availabilities_valid_range CHECK (end_time > start_time),
  CONSTRAINT outing_availabilities_one_slot_per_day UNIQUE (outing_id, user_id, day),
  -- A slot can only target one of the outing's candidate days
  CONSTRAINT outing_availabilities_candidate_day
    FOREIGN KEY (outing_id, day) REFERENCES public.outing_days (outing_id, day) ON DELETE CASCADE
);

CREATE INDEX outing_availabilities_outing_id_idx ON public.outing_availabilities (outing_id);
CREATE INDEX outing_availabilities_user_id_idx ON public.outing_availabilities (user_id);

CREATE TRIGGER update_outing_availabilities_updated_at
  BEFORE UPDATE ON public.outing_availabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.outing_availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres peuvent lire les disponibilités"
  ON public.outing_availabilities FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

CREATE POLICY "Membre peut ajouter ses disponibilités"
  ON public.outing_availabilities FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_outing_member(outing_id));

CREATE POLICY "Membre peut modifier ses disponibilités"
  ON public.outing_availabilities FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_outing_member(outing_id));

CREATE POLICY "Membre peut supprimer ses disponibilités"
  ON public.outing_availabilities FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.outing_availabilities FROM anon;
GRANT SELECT, INSERT, DELETE ON public.outing_availabilities TO authenticated;
GRANT UPDATE (start_time, end_time, updated_at) ON public.outing_availabilities TO authenticated;

-- ============================================================
-- 3. OUTING_PARTICIPANTS : members see each other ("Qui vient ?")
-- ============================================================
CREATE POLICY "Membres peuvent voir les participants"
  ON public.outing_participants FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

-- ============================================================
-- Internal helper: validate and insert a member's availabilities.
-- p_slots: [{"day": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM"}, ...]
-- ============================================================
CREATE OR REPLACE FUNCTION public.replace_outing_availabilities(
  p_outing_id UUID,
  p_user_id UUID,
  p_slots JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot JSONB;
  v_day DATE;
BEGIN
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' THEN
    RAISE EXCEPTION 'slots must be a JSON array' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.outing_availabilities
  WHERE outing_id = p_outing_id AND user_id = p_user_id;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots) LOOP
    v_day := (v_slot ->> 'day')::DATE;
    IF NOT EXISTS (
      SELECT 1 FROM public.outing_days WHERE outing_id = p_outing_id AND day = v_day
    ) THEN
      RAISE EXCEPTION 'day % is not a candidate day of this outing', v_day USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.outing_availabilities (outing_id, user_id, day, start_time, end_time)
    VALUES (p_outing_id, p_user_id, v_day, (v_slot ->> 'start')::TIME, (v_slot ->> 'end')::TIME);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replace_outing_availabilities(UUID, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. RPC create_outing_with_invites
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_outing_with_invites(
  p_title TEXT,
  p_start_date TIMESTAMPTZ,
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
  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'start date is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.outings (title, start_date, status, created_by)
  VALUES (btrim(p_title), p_start_date, 'draft', v_user)
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

REVOKE EXECUTE ON FUNCTION public.create_outing_with_invites(TEXT, TIMESTAMPTZ, DATE[], JSONB, UUID[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_outing_with_invites(TEXT, TIMESTAMPTZ, DATE[], JSONB, UUID[])
  TO authenticated;

-- ============================================================
-- 5. RPC respond_to_outing_invitation
-- ============================================================
CREATE OR REPLACE FUNCTION public.respond_to_outing_invitation(
  p_outing_id UUID,
  p_status public.participant_status,
  p_slots JSONB
)
RETURNS VOID
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
  IF p_status = 'invited' THEN
    RAISE EXCEPTION 'a response cannot be "invited"' USING ERRCODE = '22023';
  END IF;

  UPDATE public.outing_participants
  SET status = p_status, responded_at = now()
  WHERE outing_id = p_outing_id AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not invited to this outing' USING ERRCODE = '42501';
  END IF;

  IF p_status = 'declined' THEN
    DELETE FROM public.outing_availabilities
    WHERE outing_id = p_outing_id AND user_id = v_user;
  ELSE
    PERFORM public.replace_outing_availabilities(p_outing_id, v_user, coalesce(p_slots, '[]'::jsonb));
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_to_outing_invitation(UUID, public.participant_status, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_outing_invitation(UUID, public.participant_status, JSONB)
  TO authenticated;

-- ============================================================
-- 6. REALTIME (postgres_changes respects RLS)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.outing_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outing_availabilities;
