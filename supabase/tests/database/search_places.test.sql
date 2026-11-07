-- ============================================================
-- Tests pgTAP : RPC search_places (recherche plein texte robuste + bornes)
-- Lancement : npm run db:test  (supabase test db, stack locale requise)
-- Seeds : « Le Burger Gourmet » et « Bowling de Montparnasse » (Paris).
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(11);

-- ── Saisie libre : plusieurs mots, ponctuation, opérateurs tsquery ──────────
SELECT lives_ok(
  $$ SELECT * FROM public.search_places('burger gourmet') $$,
  'search_places : une recherche à plusieurs mots ne plante pas'
);

SELECT is(
  (SELECT name FROM public.search_places('burger gour') LIMIT 1),
  'Le Burger Gourmet',
  'search_places : chaque mot est cherché en préfixe (ET logique)'
);

SELECT is_empty(
  $$ SELECT id FROM public.search_places('burger montparnasse') $$,
  'search_places : tous les mots doivent correspondre'
);

SELECT lives_ok(
  $$ SELECT * FROM public.search_places('bar & (resto | !pizza): ''test''') $$,
  'search_places : les opérateurs tsquery saisis sont neutralisés'
);

SELECT isnt_empty(
  $$ SELECT id FROM public.search_places('MONTPARNASSÉ') $$,
  'search_places : insensible à la casse et aux accents'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_places('!!! ???', NULL, NULL, 2000, NULL, 100)),
  (SELECT count(*)::int FROM public.places WHERE is_public),
  'search_places : une saisie sans mot n''applique pas de filtre texte'
);

-- Mots vides français seuls (« le », « la »…) : to_tsquery renvoie une requête vide
SELECT is(
  (SELECT count(*)::int FROM public.search_places('le', NULL, NULL, 2000, NULL, 100)),
  (SELECT count(*)::int FROM public.places WHERE is_public),
  'search_places : une saisie faite uniquement de mots vides n''applique pas de filtre texte'
);

SELECT is(
  (SELECT name FROM public.search_places('le burger') LIMIT 1),
  'Le Burger Gourmet',
  'search_places : les mots vides sont ignorés quand d''autres mots sont saisis'
);

-- ── Bornes : nombre de résultats et rayon ───────────────────────────────────
INSERT INTO public.places (name, location, source)
SELECT 'Lieu de charge ' || g, 'POINT(2.35 48.85)', 'custom'
FROM generate_series(1, 120) AS g;

SELECT is(
  (SELECT count(*)::int FROM public.search_places(NULL, NULL, NULL, 2000, NULL, 100000)),
  100,
  'search_places : max_results est plafonné à 100'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_places(NULL, NULL, NULL, 2000, NULL, -5)),
  1,
  'search_places : max_results négatif ramené à 1'
);

-- Lieu à ~1 500 km au nord de Paris : hors du rayon maximal de 1 000 km
INSERT INTO public.places (name, location, source)
VALUES ('Lieu lointain', 'POINT(2.35 62.35)', 'custom');

SELECT is_empty(
  $$ SELECT id FROM public.search_places('lointain', 48.85, 2.35, 2000000000, NULL, 10) $$,
  'search_places : le rayon est plafonné à 1 000 km'
);

SELECT * FROM finish();
ROLLBACK;
