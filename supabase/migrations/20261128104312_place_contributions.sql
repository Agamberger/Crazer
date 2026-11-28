-- ============================================================
-- Migration: place_contributions (roadmap phase 2, increment 2.1)
-- Description: content added by Crazer users to any place (Crazer, OSM or a
--   Google place stored by its ID). Never copied from Google.
--
--   1. Storage bucket `place-photos` (private, JPEG, 2 MB max). Objects live at
--      `<place_id>/<photo_id>.jpg` and `<place_id>/<photo_id>_thumb.jpg`.
--   2. place_photos + place_photo_reports: a photo is hidden after 3 reports.
--      Quotas: 10 photos per user per rolling day, 20 visible photos per place.
--   3. place_hours_proposals + place_hours_votes: weekly opening hours proposed
--      by a user, confirmed after 2 « Oui » with more « Oui » than « Non »,
--      rejected with at least 2 « Non » and more « Non » than « Oui ».
--   4. place_reviews: one review per user and place (1–5 stars, ≤ 500 chars).
--   5. RPC get_place_contribution_summaries(place_ids): counts, average rating
--      and confirmed hours per place (completeness score, increment 2.5).
--
--   Reads: any authenticated user (places are shared). Writes: through
--   SECURITY DEFINER RPCs (photos, reports, hours, votes) or own rows (reviews).
-- Tests: supabase/tests/database/place_contributions.test.sql
-- ============================================================

-- ------------------------------------------------------------
-- 0. Shared helper: the place exists and the caller may see it
-- ------------------------------------------------------------
CREATE FUNCTION public.is_place_visible(p_place_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.id = p_place_id AND (p.is_public OR p.created_by = auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_place_visible(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_place_visible(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 1. Storage bucket
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('place-photos', 'place-photos', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Path: <place uuid>/<photo uuid>.jpg or <place uuid>/<photo uuid>_thumb.jpg
CREATE FUNCTION public.is_place_photo_object_path(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_thumb)?\.jpg$';
$$;

GRANT EXECUTE ON FUNCTION public.is_place_photo_object_path(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 2. Photos and reports
-- ------------------------------------------------------------
CREATE TABLE public.place_photos (
  id             UUID PRIMARY KEY,
  place_id       UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  uploaded_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL UNIQUE,
  thumbnail_path TEXT NOT NULL UNIQUE,
  width          INTEGER NOT NULL CHECK (width BETWEEN 1 AND 4096),
  height         INTEGER NOT NULL CHECK (height BETWEEN 1 AND 4096),
  report_count   INTEGER NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  is_hidden      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT place_photos_paths_match_id CHECK (
    storage_path = place_id::TEXT || '/' || id::TEXT || '.jpg'
    AND thumbnail_path = place_id::TEXT || '/' || id::TEXT || '_thumb.jpg'
  )
);

CREATE INDEX place_photos_place_idx ON public.place_photos (place_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX place_photos_uploader_idx ON public.place_photos (uploaded_by, created_at DESC);

CREATE TABLE public.place_photo_reports (
  photo_id    UUID NOT NULL REFERENCES public.place_photos(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN ('inappropriate', 'wrong_place', 'spam', 'other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, reported_by)
);

ALTER TABLE public.place_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_photo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "place_photos: visible photos and own uploads are readable"
  ON public.place_photos FOR SELECT
  TO authenticated
  USING (NOT is_hidden OR uploaded_by = (SELECT auth.uid()));

CREATE POLICY "place_photo_reports: own reports are readable"
  ON public.place_photo_reports FOR SELECT
  TO authenticated
  USING (reported_by = (SELECT auth.uid()));

GRANT SELECT ON public.place_photos, public.place_photo_reports TO authenticated;

-- Storage policies (they read place_photos, created above)
-- Files uploaded by the caller to the bucket over the last 24 h.
CREATE FUNCTION public.place_photo_uploads_last_day()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INTEGER FROM storage.objects o
  WHERE o.bucket_id = 'place-photos'
    AND o.owner = auth.uid()
    AND o.created_at > now() - INTERVAL '1 day';
$$;

REVOKE EXECUTE ON FUNCTION public.place_photo_uploads_last_day() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_photo_uploads_last_day() TO authenticated;

CREATE POLICY "place-photos: upload to a visible place, within the daily quota"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-photos'
    AND public.is_place_photo_object_path(name)
    AND public.is_place_visible(((storage.foldername(name))[1])::UUID)
    AND public.place_photo_uploads_last_day() < 22  -- 10 photos + 10 thumbnails, with a margin for a retried upload
  );

CREATE POLICY "place-photos: read visible photos and own uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'place-photos'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.place_photos ph
        WHERE NOT ph.is_hidden
          AND (ph.storage_path = storage.objects.name OR ph.thumbnail_path = storage.objects.name)
      )
    )
  );

CREATE POLICY "place-photos: delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'place-photos' AND owner = auth.uid());

-- add_place_photo: called once both files are uploaded.
CREATE FUNCTION public.add_place_photo(
  p_place_id UUID,
  p_photo_id UUID,
  p_width INTEGER,
  p_height INTEGER
)
RETURNS public.place_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_path TEXT := p_place_id::TEXT || '/' || p_photo_id::TEXT || '.jpg';
  v_thumb TEXT := p_place_id::TEXT || '/' || p_photo_id::TEXT || '_thumb.jpg';
  v_row public.place_photos;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_place_visible(p_place_id) THEN
    RAISE EXCEPTION 'place not found' USING ERRCODE = 'P0002';
  END IF;
  IF (
    SELECT count(*) FROM storage.objects o
    WHERE o.bucket_id = 'place-photos' AND o.owner = v_user AND o.name IN (v_path, v_thumb)
  ) <> 2 THEN
    RAISE EXCEPTION 'upload the photo and its thumbnail first' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(*) FROM public.place_photos
    WHERE uploaded_by = v_user AND created_at > now() - INTERVAL '1 day'
  ) >= 10 THEN
    RAISE EXCEPTION 'daily photo quota reached' USING ERRCODE = '54000';
  END IF;
  IF (
    SELECT count(*) FROM public.place_photos WHERE place_id = p_place_id AND NOT is_hidden
  ) >= 20 THEN
    RAISE EXCEPTION 'this place already has the maximum number of photos' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.place_photos (id, place_id, uploaded_by, storage_path, thumbnail_path, width, height)
  VALUES (p_photo_id, p_place_id, v_user, v_path, v_thumb, p_width, p_height)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- report_place_photo: one report per user and photo; hidden from 3 reports.
CREATE FUNCTION public.report_place_photo(p_photo_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.place_photos WHERE id = p_photo_id AND NOT is_hidden) THEN
    RAISE EXCEPTION 'photo not found' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.place_photos WHERE id = p_photo_id AND uploaded_by = v_user) THEN
    RAISE EXCEPTION 'you cannot report your own photo' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.place_photo_reports (photo_id, reported_by, reason)
  VALUES (p_photo_id, v_user, p_reason)
  ON CONFLICT (photo_id, reported_by) DO NOTHING;

  SELECT count(*) INTO v_count FROM public.place_photo_reports WHERE photo_id = p_photo_id;
  UPDATE public.place_photos
  SET report_count = v_count, is_hidden = v_count >= 3
  WHERE id = p_photo_id;
  RETURN v_count >= 3;
END;
$$;

-- delete_place_photo: the uploader removes their photo (files deleted by the app).
CREATE FUNCTION public.delete_place_photo(p_photo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.place_photos WHERE id = p_photo_id AND uploaded_by = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'photo not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 3. Opening hours: proposals and votes
-- ------------------------------------------------------------
CREATE TYPE public.place_hours_status AS ENUM ('pending', 'confirmed', 'rejected');

-- periods: [{"day": 0-6 (0 = Monday), "open": "HH:MM", "close": "HH:MM"}, ...]
-- A day without period is closed; close < open means the period ends after midnight.
CREATE FUNCTION public.is_valid_opening_periods(p_periods JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(p_periods) = 'array'
    AND jsonb_array_length(p_periods) <= 21
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_periods) AS period
      WHERE jsonb_typeof(period) <> 'object'
        OR jsonb_typeof(period -> 'day') <> 'number'
        OR (period ->> 'day') !~ '^[0-6]$'
        OR coalesce(period ->> 'open', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        OR coalesce(period ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        OR period ->> 'open' = period ->> 'close'
        OR (SELECT count(*) FROM jsonb_object_keys(period)) <> 3
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_valid_opening_periods(JSONB) TO authenticated;

CREATE TABLE public.place_hours_proposals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periods     JSONB NOT NULL CHECK (public.is_valid_opening_periods(periods)),
  status      public.place_hours_status NOT NULL DEFAULT 'pending',
  yes_count   INTEGER NOT NULL DEFAULT 0 CHECK (yes_count >= 0),
  no_count    INTEGER NOT NULL DEFAULT 0 CHECK (no_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX place_hours_proposals_place_idx
  ON public.place_hours_proposals (place_id, status, updated_at DESC);
-- One pending proposal per user and place (a new one replaces it).
CREATE UNIQUE INDEX place_hours_proposals_one_pending_per_user
  ON public.place_hours_proposals (place_id, proposed_by) WHERE status = 'pending';

CREATE TABLE public.place_hours_votes (
  proposal_id UUID NOT NULL REFERENCES public.place_hours_proposals(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_correct  BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, voter_id)
);

ALTER TABLE public.place_hours_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_hours_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "place_hours_proposals: readable by authenticated users"
  ON public.place_hours_proposals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "place_hours_votes: own votes are readable"
  ON public.place_hours_votes FOR SELECT
  TO authenticated
  USING (voter_id = (SELECT auth.uid()));

GRANT SELECT ON public.place_hours_proposals, public.place_hours_votes TO authenticated;

CREATE TRIGGER place_hours_proposals_updated_at
  BEFORE UPDATE ON public.place_hours_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE FUNCTION public.propose_place_hours(p_place_id UUID, p_periods JSONB)
RETURNS public.place_hours_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_row public.place_hours_proposals;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_place_visible(p_place_id) THEN
    RAISE EXCEPTION 'place not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_periods IS NULL OR NOT public.is_valid_opening_periods(p_periods) THEN
    RAISE EXCEPTION 'invalid opening periods' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.place_hours_proposals
  WHERE place_id = p_place_id AND proposed_by = v_user AND status = 'pending';

  INSERT INTO public.place_hours_proposals (place_id, proposed_by, periods)
  VALUES (p_place_id, v_user, p_periods)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE FUNCTION public.vote_place_hours(p_proposal_id UUID, p_is_correct BOOLEAN)
RETURNS public.place_hours_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_yes INTEGER;
  v_no INTEGER;
  v_row public.place_hours_proposals;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_is_correct IS NULL THEN
    RAISE EXCEPTION 'vote required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_row FROM public.place_hours_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_place_visible(v_row.place_id) THEN
    RAISE EXCEPTION 'proposal not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.proposed_by = v_user THEN
    RAISE EXCEPTION 'you cannot vote on your own proposal' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.place_hours_votes (proposal_id, voter_id, is_correct)
  VALUES (p_proposal_id, v_user, p_is_correct)
  ON CONFLICT (proposal_id, voter_id) DO UPDATE SET is_correct = EXCLUDED.is_correct;

  SELECT count(*) FILTER (WHERE is_correct), count(*) FILTER (WHERE NOT is_correct)
  INTO v_yes, v_no
  FROM public.place_hours_votes WHERE proposal_id = p_proposal_id;

  UPDATE public.place_hours_proposals
  SET yes_count = v_yes,
      no_count = v_no,
      status = CASE
        WHEN v_yes >= 2 AND v_yes > v_no THEN 'confirmed'::public.place_hours_status
        WHEN v_no >= 2 AND v_no > v_yes THEN 'rejected'::public.place_hours_status
        ELSE 'pending'::public.place_hours_status
      END
  WHERE id = p_proposal_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 4. Reviews
-- ------------------------------------------------------------
CREATE TABLE public.place_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id   UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT place_reviews_one_per_author UNIQUE (place_id, author_id)
);

CREATE INDEX place_reviews_place_idx ON public.place_reviews (place_id, updated_at DESC);

ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "place_reviews: readable by authenticated users"
  ON public.place_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "place_reviews: authors write their review on a visible place"
  ON public.place_reviews FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()) AND public.is_place_visible(place_id));

CREATE POLICY "place_reviews: authors update their review"
  ON public.place_reviews FOR UPDATE
  TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "place_reviews: authors delete their review"
  ON public.place_reviews FOR DELETE
  TO authenticated
  USING (author_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.place_reviews TO authenticated;
GRANT UPDATE (rating, comment, updated_at) ON public.place_reviews TO authenticated;

CREATE TRIGGER place_reviews_updated_at
  BEFORE UPDATE ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 5. Summaries (completeness score)
-- ------------------------------------------------------------
CREATE FUNCTION public.get_place_contribution_summaries(p_place_ids UUID[])
RETURNS TABLE (
  place_id         UUID,
  photo_count      INTEGER,
  review_count     INTEGER,
  average_rating   NUMERIC(3, 2),
  confirmed_hours  JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    (SELECT count(*)::INTEGER FROM public.place_photos ph
     WHERE ph.place_id = p.id AND NOT ph.is_hidden),
    (SELECT count(*)::INTEGER FROM public.place_reviews r WHERE r.place_id = p.id),
    (SELECT round(avg(r.rating), 2)::NUMERIC(3, 2) FROM public.place_reviews r WHERE r.place_id = p.id),
    (SELECT h.periods FROM public.place_hours_proposals h
     WHERE h.place_id = p.id AND h.status = 'confirmed'
     ORDER BY h.updated_at DESC LIMIT 1)
  FROM public.places p
  WHERE p.id = ANY ((coalesce(p_place_ids, ARRAY[]::UUID[]))[1:100])
    AND (p.is_public OR p.created_by = auth.uid());
$$;

-- ------------------------------------------------------------
-- 6. Execution rights
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.add_place_photo(UUID, UUID, INTEGER, INTEGER),
  public.report_place_photo(UUID, TEXT),
  public.delete_place_photo(UUID),
  public.propose_place_hours(UUID, JSONB),
  public.vote_place_hours(UUID, BOOLEAN),
  public.get_place_contribution_summaries(UUID[])
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.add_place_photo(UUID, UUID, INTEGER, INTEGER),
  public.report_place_photo(UUID, TEXT),
  public.delete_place_photo(UUID),
  public.propose_place_hours(UUID, JSONB),
  public.vote_place_hours(UUID, BOOLEAN),
  public.get_place_contribution_summaries(UUID[])
TO authenticated;
