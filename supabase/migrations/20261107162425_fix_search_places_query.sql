-- ============================================================
-- Migration: fix_search_places_query
-- Description: Rend la RPC search_places robuste à la saisie libre.
--   - La requête est découpée en mots (accents et casse ignorés) ; chaque mot
--     est cherché en préfixe et tous doivent correspondre. Les opérateurs
--     tsquery saisis (& | ! : ( ) ') ne provoquent plus d'erreur de syntaxe.
--   - Une saisie sans aucun mot n'applique pas de filtre texte.
--   - radius_m est borné à [1 ; 1 000 000] m (aligné sur MAX_AREA_RADIUS_M de
--     usePlaces, carte dézoomée) et max_results à [1 ; 100].
-- Signature et colonnes de retour inchangées.
-- Tests : supabase/tests/database/search_places.test.sql
-- ============================================================

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
      -- Chaque mot alphanumérique devient un lexème préfixe : 'mot':* & 'autre':*
      (
        SELECT to_tsquery('french', string_agg(quote_literal(tok) || ':*', ' & '))
        FROM regexp_split_to_table(lower(unaccent(coalesce(query, ''))), '[^[:alnum:]]+') AS tok
        WHERE tok <> ''
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
    AND (params.origin IS NULL OR ST_DWithin(p.location, params.origin, params.radius))
    AND (filter_cat IS NULL OR p.category = filter_cat)
    AND (params.tsq IS NULL OR p.search_vector @@ params.tsq)
  ORDER BY
    CASE WHEN params.tsq IS NOT NULL THEN ts_rank(p.search_vector, params.tsq) ELSE 1 END DESC,
    CASE WHEN params.origin IS NOT NULL THEN ST_Distance(p.location, params.origin) ELSE 0 END ASC,
    p.id
  LIMIT (SELECT lim FROM params);
$$;

-- Exécution explicite : les stacks Supabase récentes n'accordent plus EXECUTE par défaut.
GRANT EXECUTE ON FUNCTION
  public.search_places(TEXT, FLOAT8, FLOAT8, INTEGER, public.place_category, INTEGER)
  TO anon, authenticated;
