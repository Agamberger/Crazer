-- ============================================================
-- Migration: places_store_google_place_id_only
-- Description: Google Maps Platform terms only allow storing the Google place ID
--   (indefinitely). Names, addresses, coordinates (beyond 30 days), photos,
--   ratings, opening hours… must be fetched live from the Places API.
--
--   1. `name`, `location` and `category` become nullable: a Google row has none.
--   2. New column `source_id_refreshed_at`: last time the Google place ID was
--      confirmed (Google recommends refreshing IDs older than 12 months).
--   3. PURGE of every existing Google row (source = 'google'): name, address,
--      street, city, postcode, location, category, source_url, description,
--      phone, website, opening_hours, price_range, rating, reviews_count,
--      images, tags and metadata are emptied. Kept: id, source, source_id,
--      created_by, is_public, timestamps, country_code. Links from
--      planned_outings / outing_activities (place_id) are unchanged.
--   4. CHECK constraints: a Google row stores nothing but its place ID; any
--      other row keeps a name, a location and a category.
--   5. RPC ensure_google_place(place_id): returns the row of a Google place,
--      creating it if needed (concurrency-safe), and refreshes the timestamp.
--   6. search_places ignores Google rows (they have no stored name/location).
-- RLS policies are unchanged.
-- Tests: supabase/tests/database/google_places_storage.test.sql
-- ============================================================

-- 1. Nullable columns for Google rows
ALTER TABLE public.places ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.places ALTER COLUMN location DROP NOT NULL;
ALTER TABLE public.places ALTER COLUMN category DROP NOT NULL;

-- 2. Refresh timestamp of the Google place ID
ALTER TABLE public.places ADD COLUMN source_id_refreshed_at TIMESTAMPTZ;
COMMENT ON COLUMN public.places.source_id_refreshed_at IS
  'Last confirmation of the external place ID (Google: refresh when older than 12 months).';

-- 3. Purge Google content already stored
UPDATE public.places
SET
  name = NULL,
  address = NULL,
  street = NULL,
  city = NULL,
  postcode = NULL,
  location = NULL,
  category = NULL,
  source_url = NULL,
  description = NULL,
  phone = NULL,
  website = NULL,
  opening_hours = NULL,
  price_range = NULL,
  rating = NULL,
  reviews_count = 0,
  images = NULL,
  tags = NULL,
  metadata = '{}'::JSONB,
  source_id_refreshed_at = now()
WHERE source = 'google';

-- 4. Constraints
ALTER TABLE public.places ADD CONSTRAINT places_google_rows_store_place_id_only CHECK (
  source <> 'google'
  OR (
    source_id IS NOT NULL
    AND name IS NULL AND address IS NULL AND street IS NULL AND city IS NULL
    AND postcode IS NULL AND location IS NULL AND category IS NULL
    AND source_url IS NULL AND description IS NULL AND phone IS NULL
    AND website IS NULL AND opening_hours IS NULL AND price_range IS NULL
    AND rating IS NULL AND coalesce(reviews_count, 0) = 0
    AND images IS NULL AND tags IS NULL
    AND coalesce(metadata, '{}'::JSONB) = '{}'::JSONB
  )
);

ALTER TABLE public.places ADD CONSTRAINT places_non_google_rows_have_core_fields CHECK (
  source = 'google'
  OR (name IS NOT NULL AND location IS NOT NULL AND category IS NOT NULL)
);

COMMENT ON TABLE public.places IS
  'Lieux Crazer / OSM (données complètes) et lieux Google (place ID uniquement : le reste est récupéré à la volée via l''API Places).';

-- 5. RPC ensure_google_place
CREATE FUNCTION public.ensure_google_place(p_google_place_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_google_place_id IS NULL OR p_google_place_id !~ '^[A-Za-z0-9_-]{10,255}$' THEN
    RAISE EXCEPTION 'invalid Google place id' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.places (source, source_id, category, created_by, is_public, source_id_refreshed_at)
  VALUES ('google', p_google_place_id, NULL, auth.uid(), true, now())
  ON CONFLICT ON CONSTRAINT places_source_unique
  DO UPDATE SET source_id_refreshed_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_google_place(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_google_place(TEXT) TO authenticated;

-- 6. search_places: same signature and columns, Google rows excluded
CREATE OR REPLACE FUNCTION public.search_places(
  query         TEXT DEFAULT NULL,
  lat           FLOAT8 DEFAULT NULL,
  lng           FLOAT8 DEFAULT NULL,
  radius_m      INTEGER DEFAULT 2000,
  filter_cat    public.place_category DEFAULT NULL,
  max_results   INTEGER DEFAULT 30
)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  category      public.place_category,
  latitude      FLOAT8,
  longitude     FLOAT8,
  address       TEXT,
  city          TEXT,
  rating        DECIMAL(3,2),
  reviews_count INTEGER,
  price_range   TEXT,
  images        TEXT[],
  tags          TEXT[],
  source        public.place_source,
  distance_m    FLOAT8
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      (
        SELECT CASE WHEN numnode(q) > 0 THEN q END
        FROM (
          SELECT to_tsquery('french', string_agg(quote_literal(tok) || ':*', ' & ')) AS q
          FROM regexp_split_to_table(lower(unaccent(coalesce(query, ''))), '[^[:alnum:]]+') AS tok
          WHERE tok <> ''
        ) AS built
      ) AS tsq,
      CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
        THEN ST_MakePoint(lng, lat)::geography
      END AS origin,
      LEAST(GREATEST(coalesce(radius_m, 2000), 1), 1000000) AS radius,
      LEAST(GREATEST(coalesce(max_results, 30), 1), 100) AS lim
  )
  SELECT
    p.id,
    p.name,
    p.category,
    ST_Y(p.location::geometry) AS latitude,
    ST_X(p.location::geometry) AS longitude,
    p.address,
    p.city,
    p.rating,
    p.reviews_count,
    p.price_range,
    p.images,
    p.tags,
    p.source,
    CASE WHEN params.origin IS NOT NULL
      THEN ST_Distance(p.location, params.origin)
    END AS distance_m
  FROM public.places p, params
  WHERE
    p.is_public = true
    AND p.source <> 'google'
    AND p.location IS NOT NULL
    AND (params.origin IS NULL OR ST_DWithin(p.location, params.origin, params.radius))
    AND (filter_cat IS NULL OR p.category = filter_cat)
    AND (params.tsq IS NULL OR p.search_vector @@ params.tsq)
  ORDER BY
    CASE WHEN params.tsq IS NOT NULL THEN ts_rank(p.search_vector, params.tsq) ELSE 1 END DESC,
    CASE WHEN params.origin IS NOT NULL THEN ST_Distance(p.location, params.origin) ELSE 0 END ASC,
    p.id
  LIMIT (SELECT lim FROM params);
$$;

GRANT EXECUTE ON FUNCTION
  public.search_places(TEXT, FLOAT8, FLOAT8, INTEGER, public.place_category, INTEGER)
  TO anon, authenticated;
