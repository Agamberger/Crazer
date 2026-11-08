-- ============================================================
-- Migration: scrub_google_api_keys_from_places
-- Description: Les URLs de photos Google étaient stockées avec la clé API
--   (`…/place/photo?…&key=XXX`) dans `places.images`, table lisible par anon.
--   - Photo Google  → référence `google-photo:<photo_reference>` (l'app
--     reconstruit l'URL avec sa propre clé à l'affichage).
--   - Autre URL maps.googleapis.com → paramètre `key` retiré.
--   - URLs tierces inchangées.
-- La clé déjà exposée doit en plus être régénérée côté Google Cloud.
-- Tests : supabase/tests/database/scrub_google_keys.test.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.scrub_google_image_ref(p_image TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_image ~ '^https?://maps\.googleapis\.com/maps/api/place/photo\?'
         AND p_image ~ '[?&]photo_reference='
      THEN 'google-photo:' || substring(p_image FROM '[?&]photo_reference=([^&#]+)')
    WHEN p_image ~ '^https?://maps\.googleapis\.com/'
      THEN regexp_replace(
             regexp_replace(p_image, '([?&])key=[^&#]*&?', '\1', 'g'),
             '[?&]$', '')
    ELSE p_image
  END;
$$;

-- Fonction interne : pas d'exposition via l'API
REVOKE EXECUTE ON FUNCTION public.scrub_google_image_ref(TEXT) FROM PUBLIC, anon, authenticated;

UPDATE public.places
SET images = (
  SELECT array_agg(public.scrub_google_image_ref(img) ORDER BY ord)
  FROM unnest(images) WITH ORDINALITY AS t(img, ord)
)
WHERE EXISTS (
  SELECT 1 FROM unnest(images) AS img
  WHERE img ~ '^https?://maps\.googleapis\.com/' AND img ~ '[?&]key='
);
