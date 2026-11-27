-- ============================================================
-- Tests pgTAP : lieux Google — seul le place ID est stocké
-- Lancement : npm run db:test (stack locale requise)
-- Migration : 20261127222229_places_store_google_place_id_only.sql
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(14);

-- ── Contraintes ─────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$ INSERT INTO public.places (source, source_id, category)
     VALUES ('google', 'ChIJ_test_id_only_1', NULL) $$,
  'places : un lieu Google avec son seul place ID est accepté'
);

SELECT throws_ok(
  $$ INSERT INTO public.places (name, source, source_id, category)
     VALUES ('Nom copié de Google', 'google', 'ChIJ_test_with_name', NULL) $$,
  '23514', NULL,
  'places : un lieu Google ne peut pas stocker de nom'
);

SELECT throws_ok(
  $$ INSERT INTO public.places (location, source, source_id, category)
     VALUES ('POINT(2.35 48.85)', 'google', 'ChIJ_test_with_location', NULL) $$,
  '23514', NULL,
  'places : un lieu Google ne peut pas stocker de coordonnées'
);

SELECT throws_ok(
  $$ INSERT INTO public.places (source, source_id, category, rating, images)
     VALUES ('google', 'ChIJ_test_with_rating', NULL, 4.5, ARRAY['https://x/y.jpg']) $$,
  '23514', NULL,
  'places : un lieu Google ne peut pas stocker de note ni de photos'
);

SELECT throws_ok(
  $$ INSERT INTO public.places (source, source_id, category)
     VALUES ('google', NULL, NULL) $$,
  '23514', NULL,
  'places : un lieu Google doit avoir un place ID'
);

SELECT throws_ok(
  $$ INSERT INTO public.places (source, location, category)
     VALUES ('custom', 'POINT(2.35 48.85)', 'bar') $$,
  '23514', NULL,
  'places : un lieu Crazer garde un nom obligatoire'
);

SELECT is(
  (SELECT count(*)::int FROM public.places
   WHERE source = 'google' AND (name IS NOT NULL OR location IS NOT NULL OR images IS NOT NULL)),
  0,
  'places : aucun contenu Google stocké après la migration'
);

-- ── search_places ignore les lieux Google ────────────────────────────────────
SELECT is_empty(
  $$ SELECT id FROM public.search_places(NULL, NULL, NULL, 2000, NULL, 100) WHERE source = 'google' $$,
  'search_places : aucun lieu Google renvoyé'
);

-- ── RPC ensure_google_place ──────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$ SELECT public.ensure_google_place('ChIJ_anon_attempt_1') $$,
  '42501', NULL,
  'ensure_google_place : interdit aux visiteurs non connectés'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT isnt(
  public.ensure_google_place('ChIJ_rpc_new_place_1'),
  NULL,
  'ensure_google_place : crée le lieu et renvoie son id'
);

SELECT is(
  public.ensure_google_place('ChIJ_rpc_new_place_1'),
  (SELECT id FROM public.places WHERE source = 'google' AND source_id = 'ChIJ_rpc_new_place_1'),
  'ensure_google_place : renvoie la même ligne au second appel'
);

SELECT is(
  public.ensure_google_place('ChIJLU7jZClu5kcR4PcOOO6p3I0'),
  'b4444444-4444-4444-4444-444444444444'::uuid,
  'ensure_google_place : réutilise un lieu Google existant (seed)'
);

SELECT throws_ok(
  $$ SELECT public.ensure_google_place('pas un id; DROP TABLE places') $$,
  '22023', NULL,
  'ensure_google_place : refuse un place ID invalide'
);

RESET ROLE;

SELECT is(
  (SELECT created_by FROM public.places WHERE source_id = 'ChIJ_rpc_new_place_1'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ensure_google_place : le créateur est l''utilisateur connecté'
);

SELECT * FROM finish();
ROLLBACK;
