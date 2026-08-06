-- ============================================================
-- Migration: create_places_table
-- Description: Table provider-agnostique pour stocker des lieux
--              (établissements OSM, Google, Foursquare, ou custom)
--              avec support PostGIS et recherche full-text.
-- ============================================================

-- Extension PostGIS (géospatial)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Extension unaccent (recherche full-text sans accents)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- ENUM: source du lieu
-- ============================================================
CREATE TYPE public.place_source AS ENUM (
  'osm',          -- OpenStreetMap (Overpass / Nominatim / Photon)
  'google',       -- Google Places API
  'foursquare',   -- Foursquare / FSQ Places API
  'here',         -- HERE Places
  'geoapify',     -- Geoapify
  'custom'        -- Créé manuellement par un utilisateur Crazer
);

-- ============================================================
-- ENUM: catégorie du lieu (aligné sur PoiCategory du front)
-- ============================================================
CREATE TYPE public.place_category AS ENUM (
  'resto',
  'bar',
  'activite',
  'nature',
  'culture',
  'autre'
);

-- ============================================================
-- TABLE: places
-- ============================================================
CREATE TABLE public.places (
  -- Identifiant interne
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Champs core (toujours présents) ──────────────────────
  name          TEXT NOT NULL,
  category      public.place_category NOT NULL DEFAULT 'autre',
  location      GEOGRAPHY(POINT, 4326) NOT NULL,  -- longitude, latitude WGS84

  -- ── Adresse (normalisée, provider-agnostique) ────────────
  address       TEXT,
  street        TEXT,
  city          TEXT,
  postcode      TEXT,
  country_code  CHAR(2) DEFAULT 'FR',

  -- ── Tracking de la source (agnostique) ───────────────────
  source        public.place_source NOT NULL DEFAULT 'custom',
  source_id     TEXT,       -- ID externe : osm_id, google place_id, fsq_id…
  source_url    TEXT,       -- URL vers la fiche source (optionnel)

  -- Unicité : on ne stocke pas deux fois le même lieu du même provider
  CONSTRAINT places_source_unique UNIQUE (source, source_id),

  -- ── Données enrichies (optionnelles) ─────────────────────
  description   TEXT,
  phone         TEXT,
  website       TEXT,
  opening_hours TEXT,                    -- format OSM "Mo-Fr 09:00-18:00"
  price_range   TEXT,                    -- '€' | '€€' | '€€€' | '€€€€' | 'Gratuit'
  rating        DECIMAL(3, 2),           -- 0.00 → 5.00
  reviews_count INTEGER DEFAULT 0,
  images        TEXT[],                  -- tableau d'URLs d'images
  tags          TEXT[],                  -- tags libres ['rooftop', 'terrasse', 'groupe']

  -- ── Données brutes du provider (extensible sans migration) ─
  -- Stocke le payload JSON original du provider pour ne rien perdre
  metadata      JSONB DEFAULT '{}'::JSONB,

  -- ── Propriétaire (pour les lieux custom) ─────────────────
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public     BOOLEAN NOT NULL DEFAULT true,

  -- ── Timestamps ───────────────────────────────────────────
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEX GÉOSPATIAL (requêtes ST_DWithin, ST_Distance)
-- ============================================================
CREATE INDEX places_location_idx ON public.places USING GIST (location);

-- ============================================================
-- INDEX FULL-TEXT SEARCH (recherche par nom, ville, description)
-- ============================================================
-- Note : unaccent() n'est pas IMMUTABLE en Postgres standard,
-- on utilise donc un trigger pour maintenir search_vector à jour
-- plutôt qu'une colonne GENERATED ALWAYS AS.
ALTER TABLE public.places ADD COLUMN search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION public.places_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.city, ''))), 'B') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.description, ''))), 'C') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.address, ''))), 'D');
  RETURN NEW;
END;
$$;

CREATE TRIGGER places_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.places_search_vector_update();

CREATE INDEX places_search_vector_idx ON public.places USING GIN (search_vector);

-- Index sur category et source (filtres fréquents)
CREATE INDEX places_category_idx ON public.places (category);
CREATE INDEX places_source_idx   ON public.places (source);
CREATE INDEX places_city_idx     ON public.places (city);

-- ============================================================
-- TRIGGER: mise à jour de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Tout le monde (authentifié ou non) peut lire les lieux publics
CREATE POLICY "Places publics lisibles par tous"
  ON public.places FOR SELECT
  USING (is_public = true);

-- Un utilisateur authentifié peut lire ses propres lieux (même privés)
CREATE POLICY "Owner peut lire ses lieux privés"
  ON public.places FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Un utilisateur authentifié peut créer un lieu custom
CREATE POLICY "Utilisateurs authentifiés peuvent créer des lieux"
  ON public.places FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'custom' AND auth.uid() = created_by
  );

-- Un utilisateur peut modifier uniquement ses propres lieux custom
CREATE POLICY "Owner peut modifier ses lieux custom"
  ON public.places FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND source = 'custom');

-- Un utilisateur peut supprimer uniquement ses propres lieux custom
CREATE POLICY "Owner peut supprimer ses lieux custom"
  ON public.places FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND source = 'custom');

-- ============================================================
-- FONCTION: recherche géospatiale + full-text (edge function ready)
-- Usage: SELECT * FROM search_places('restaurant', 48.8566, 2.3522, 1000, 'resto');
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_places(
  query         TEXT DEFAULT NULL,
  lat           FLOAT8 DEFAULT NULL,
  lng           FLOAT8 DEFAULT NULL,
  radius_m      INTEGER DEFAULT 2000,  -- rayon en mètres
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
LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.name,
    p.category,
    ST_Y(p.location::geometry)  AS latitude,
    ST_X(p.location::geometry)  AS longitude,
    p.address,
    p.city,
    p.rating,
    p.reviews_count,
    p.price_range,
    p.images,
    p.tags,
    p.source,
    CASE
      WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_Distance(p.location, ST_MakePoint(lng, lat)::geography)
      ELSE NULL
    END AS distance_m
  FROM public.places p
  WHERE
    p.is_public = true
    -- Filtre géospatial (si coordonnées fournies)
    AND (
      lat IS NULL OR lng IS NULL
      OR ST_DWithin(p.location, ST_MakePoint(lng, lat)::geography, radius_m)
    )
    -- Filtre catégorie (optionnel)
    AND (filter_cat IS NULL OR p.category = filter_cat)
    -- Recherche full-text (optionnel)
    AND (
      query IS NULL OR query = ''
      OR p.search_vector @@ to_tsquery('french', unaccent(query) || ':*')
    )
  ORDER BY
    -- Pertinence texte si query fournie
    CASE WHEN query IS NOT NULL AND query != ''
      THEN ts_rank(p.search_vector, to_tsquery('french', unaccent(query) || ':*'))
      ELSE 1
    END DESC,
    -- Distance si coordonnées fournies
    CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_Distance(p.location, ST_MakePoint(lng, lat)::geography)
      ELSE 0
    END ASC
  LIMIT max_results;
$$;
