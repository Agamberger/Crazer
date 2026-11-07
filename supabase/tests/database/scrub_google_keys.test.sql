-- ============================================================
-- Tests pgTAP : nettoyage des clés Google stockées dans places.images
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(5);

SELECT is(
  public.scrub_google_image_ref(
    'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=REF_1&key=SECRET'),
  'google-photo:REF_1',
  'photo Google → référence sans clé'
);

SELECT is(
  public.scrub_google_image_ref('https://maps.googleapis.com/maps/api/staticmap?key=SECRET&size=2x2'),
  'https://maps.googleapis.com/maps/api/staticmap?size=2x2',
  'autre URL Google : paramètre key retiré'
);

SELECT is(
  public.scrub_google_image_ref('https://maps.googleapis.com/maps/api/staticmap?size=2x2&key=SECRET'),
  'https://maps.googleapis.com/maps/api/staticmap?size=2x2',
  'autre URL Google : clé en fin de chaîne retirée'
);

SELECT is(
  public.scrub_google_image_ref('https://example.com/a.jpg?key=public'),
  'https://example.com/a.jpg?key=public',
  'URL tierce inchangée'
);

SELECT is_empty(
  $$ SELECT id FROM public.places, unnest(images) AS img
     WHERE img ~ '^https?://maps\.googleapis\.com/' AND img ~ '[?&]key=' $$,
  'plus aucune clé Google stockée après migration'
);

SELECT * FROM finish();
ROLLBACK;
