-- ============================================================
-- Tests pgTAP : contributions des utilisateurs sur les lieux (phase 2, 2.1)
-- Lancement : npm run db:test (stack locale requise)
-- Migration : 20261128104312_place_contributions.sql
-- Seeds : alice 1111…, bob 2222…, charlie 3333… ; lieux b1111… (Crazer), b4444… (Google)
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(38);

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::TEXT, true);
$$;

-- Fichiers « déjà envoyés » (insérés en superuser, comme le ferait Storage)
CREATE FUNCTION pg_temp.fake_upload(p_place UUID, p_photo UUID, p_owner UUID) RETURNS VOID
LANGUAGE sql AS $$
  INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
  VALUES
    ('place-photos', p_place || '/' || p_photo || '.jpg', p_owner, p_owner::TEXT),
    ('place-photos', p_place || '/' || p_photo || '_thumb.jpg', p_owner, p_owner::TEXT);
$$;

-- ── Bucket ───────────────────────────────────────────────────────────────────
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'place-photos'),
  false,
  'bucket place-photos : privé'
);
SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'place-photos'),
  2097152::BIGINT,
  'bucket place-photos : 2 Mo maximum'
);
SELECT is(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'place-photos'),
  ARRAY['image/jpeg'],
  'bucket place-photos : JPEG uniquement'
);
SELECT ok(
  public.is_place_photo_object_path(
    'b1111111-1111-1111-1111-111111111111/0a0a0a0a-0000-4000-8000-000000000001_thumb.jpg'),
  'chemin de photo valide accepté'
);
SELECT ok(
  NOT public.is_place_photo_object_path('b1111111-1111-1111-1111-111111111111/../evil.jpg'),
  'chemin de photo invalide refusé'
);

-- ── Photos ───────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$ SELECT public.add_place_photo('b1111111-1111-1111-1111-111111111111',
       '0a0a0a0a-0000-4000-8000-000000000001', 800, 600) $$,
  '42501', NULL,
  'add_place_photo : interdit aux visiteurs non connectés'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  $$ SELECT public.add_place_photo('b1111111-1111-1111-1111-111111111111',
       '0a0a0a0a-0000-4000-8000-000000000001', 800, 600) $$,
  '22023', NULL,
  'add_place_photo : refuse une photo dont les fichiers ne sont pas envoyés'
);
SELECT throws_ok(
  $$ SELECT public.add_place_photo('00000000-0000-4000-8000-000000000000',
       '0a0a0a0a-0000-4000-8000-000000000001', 800, 600) $$,
  'P0002', NULL,
  'add_place_photo : refuse un lieu inconnu'
);
RESET ROLE;

SELECT pg_temp.fake_upload('b1111111-1111-1111-1111-111111111111',
  '0a0a0a0a-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
SELECT is(
  (SELECT storage_path FROM public.add_place_photo('b1111111-1111-1111-1111-111111111111',
     '0a0a0a0a-0000-4000-8000-000000000001', 800, 600)),
  'b1111111-1111-1111-1111-111111111111/0a0a0a0a-0000-4000-8000-000000000001.jpg',
  'add_place_photo : enregistre la photo une fois les fichiers envoyés'
);
SELECT throws_ok(
  $$ SELECT public.report_place_photo('0a0a0a0a-0000-4000-8000-000000000001', 'spam') $$,
  '22023', NULL,
  'report_place_photo : impossible de signaler sa propre photo'
);
SELECT throws_ok(
  $$ INSERT INTO public.place_photos (id, place_id, uploaded_by, storage_path, thumbnail_path, width, height)
     VALUES ('0a0a0a0a-0000-4000-8000-000000000002', 'b1111111-1111-1111-1111-111111111111',
       '11111111-1111-1111-1111-111111111111', 'x', 'y', 1, 1) $$,
  '42501', NULL,
  'place_photos : pas d''insertion directe (RPC uniquement)'
);
RESET ROLE;

-- Signalements : masquée à partir de 3
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
SELECT is(
  public.report_place_photo('0a0a0a0a-0000-4000-8000-000000000001', 'spam'),
  false,
  'report_place_photo : 1 signalement, photo toujours visible'
);
SELECT is(
  public.report_place_photo('0a0a0a0a-0000-4000-8000-000000000001', 'spam'),
  false,
  'report_place_photo : un même utilisateur ne compte qu''une fois'
);
SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333');
SELECT is(
  public.report_place_photo('0a0a0a0a-0000-4000-8000-000000000001', 'inappropriate'),
  false,
  'report_place_photo : 2 signalements, photo toujours visible'
);
RESET ROLE;

-- Troisième signalement (superuser : aucun 4e utilisateur dans les seeds)
INSERT INTO public.place_photo_reports (photo_id, reported_by, reason)
VALUES ('0a0a0a0a-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'other')
ON CONFLICT DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'dave-test@crazer.app');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('44444444-4444-4444-4444-444444444444');
SELECT is(
  public.report_place_photo('0a0a0a0a-0000-4000-8000-000000000001', 'wrong_place'),
  true,
  'report_place_photo : la photo est masquée au 3e signalement'
);
SELECT is_empty(
  $$ SELECT id FROM public.place_photos WHERE id = '0a0a0a0a-0000-4000-8000-000000000001' $$,
  'place_photos : une photo masquée n''est plus lisible par les autres'
);
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
SELECT isnt_empty(
  $$ SELECT id FROM public.place_photos WHERE id = '0a0a0a0a-0000-4000-8000-000000000001' $$,
  'place_photos : son auteur voit encore sa photo masquée'
);
RESET ROLE;

-- Quotas
INSERT INTO public.place_photos (id, place_id, uploaded_by, storage_path, thumbnail_path, width, height)
SELECT g.id, 'b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
       'b2222222-2222-2222-2222-222222222222/' || g.id || '.jpg',
       'b2222222-2222-2222-2222-222222222222/' || g.id || '_thumb.jpg', 10, 10
FROM (SELECT gen_random_uuid() AS id FROM generate_series(1, 10)) AS g;
SELECT pg_temp.fake_upload('b3333333-3333-3333-3333-333333333333',
  '0a0a0a0a-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
SELECT throws_ok(
  $$ SELECT public.add_place_photo('b3333333-3333-3333-3333-333333333333',
       '0a0a0a0a-0000-4000-8000-000000000003', 800, 600) $$,
  '54000', 'daily photo quota reached',
  'add_place_photo : 10 photos par jour et par utilisateur au plus'
);
RESET ROLE;

INSERT INTO public.place_photos (id, place_id, uploaded_by, storage_path, thumbnail_path, width, height)
SELECT g.id, 'b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
       'b3333333-3333-3333-3333-333333333333/' || g.id || '.jpg',
       'b3333333-3333-3333-3333-333333333333/' || g.id || '_thumb.jpg', 10, 10
FROM (SELECT gen_random_uuid() AS id FROM generate_series(1, 20)) AS g;
SELECT pg_temp.fake_upload('b3333333-3333-3333-3333-333333333333',
  '0a0a0a0a-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  $$ SELECT public.add_place_photo('b3333333-3333-3333-3333-333333333333',
       '0a0a0a0a-0000-4000-8000-000000000004', 800, 600) $$,
  '54000', 'this place already has the maximum number of photos',
  'add_place_photo : 20 photos visibles par lieu au plus'
);

-- Storage : chemin et lieu vérifiés à l'envoi
SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
     VALUES ('place-photos', 'not-a-place/evil.jpg', auth.uid(), auth.uid()::TEXT) $$,
  '42501', NULL,
  'storage : envoi refusé hors du format <lieu>/<photo>.jpg'
);
SELECT lives_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
     VALUES ('place-photos',
       'b1111111-1111-1111-1111-111111111111/0a0a0a0a-0000-4000-8000-000000000005.jpg',
       auth.uid(), auth.uid()::TEXT) $$,
  'storage : envoi accepté pour un lieu visible'
);
SELECT lives_ok(
  $$ SELECT public.delete_place_photo('0a0a0a0a-0000-4000-8000-000000000001') $$,
  'delete_place_photo : l''auteur supprime sa photo'
);
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
SELECT throws_ok(
  $$ SELECT public.delete_place_photo(
       (SELECT id FROM public.place_photos WHERE place_id = 'b3333333-3333-3333-3333-333333333333' LIMIT 1)) $$,
  'P0002', NULL,
  'delete_place_photo : impossible de supprimer la photo d''un autre'
);
RESET ROLE;

-- ── Horaires ─────────────────────────────────────────────────────────────────
SELECT ok(
  public.is_valid_opening_periods('[{"day":0,"open":"12:00","close":"14:30"},{"day":5,"open":"19:00","close":"02:00"}]'),
  'horaires : périodes valides (dont passage de minuit)'
);
SELECT ok(
  NOT public.is_valid_opening_periods('[{"day":7,"open":"12:00","close":"14:00"}]'),
  'horaires : jour hors 0–6 refusé'
);
SELECT ok(
  NOT public.is_valid_opening_periods('[{"day":1,"open":"25:00","close":"14:00","extra":1}]'),
  'horaires : heure invalide ou champ inconnu refusés'
);

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  $$ SELECT public.propose_place_hours('b4444444-4444-4444-4444-444444444444', '{"day":1}') $$,
  '22023', NULL,
  'propose_place_hours : refuse des horaires invalides'
);
CREATE TEMP TABLE first_proposal ON COMMIT DROP AS
SELECT id FROM public.propose_place_hours('b4444444-4444-4444-4444-444444444444',
  '[{"day":0,"open":"09:30","close":"18:00"}]');
CREATE TEMP TABLE proposal ON COMMIT DROP AS
SELECT id FROM public.propose_place_hours('b4444444-4444-4444-4444-444444444444',
  '[{"day":1,"open":"09:30","close":"18:00"}]');
SELECT is(
  (SELECT count(*)::INT FROM public.place_hours_proposals
   WHERE place_id = 'b4444444-4444-4444-4444-444444444444' AND status = 'pending'),
  1,
  'propose_place_hours : une nouvelle proposition remplace la précédente en attente'
);
SELECT throws_ok(
  $$ SELECT public.vote_place_hours((SELECT id FROM proposal), true) $$,
  '22023', NULL,
  'vote_place_hours : impossible de voter pour sa propre proposition'
);
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
SELECT is(
  (SELECT status FROM public.vote_place_hours((SELECT id FROM proposal), true)),
  'pending'::public.place_hours_status,
  'vote_place_hours : un « Oui » ne suffit pas'
);
SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333');
SELECT is(
  (SELECT status FROM public.vote_place_hours((SELECT id FROM proposal), true)),
  'confirmed'::public.place_hours_status,
  'vote_place_hours : confirmé après 2 « Oui »'
);
SELECT pg_temp.act_as('44444444-4444-4444-4444-444444444444');
SELECT is(
  (SELECT status FROM public.vote_place_hours((SELECT id FROM proposal), false)),
  'confirmed'::public.place_hours_status,
  'vote_place_hours : reste confirmé tant que les « Oui » l''emportent'
);
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
SELECT is(
  (SELECT status FROM public.vote_place_hours((SELECT id FROM proposal), false)),
  'rejected'::public.place_hours_status,
  'vote_place_hours : rejeté quand les « Non » l''emportent (changement de vote compté)'
);

-- ── Avis ─────────────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$ INSERT INTO public.place_reviews (place_id, author_id, rating, comment)
     VALUES ('b4444444-4444-4444-4444-444444444444', auth.uid(), 5, 'Super vue') $$,
  'place_reviews : un utilisateur publie son avis'
);
SELECT throws_ok(
  $$ INSERT INTO public.place_reviews (place_id, author_id, rating)
     VALUES ('b4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 1) $$,
  '42501', NULL,
  'place_reviews : impossible de publier au nom d''un autre'
);
SELECT throws_ok(
  $$ INSERT INTO public.place_reviews (place_id, author_id, rating)
     VALUES ('b1111111-1111-1111-1111-111111111111', auth.uid(), 6) $$,
  '23514', NULL,
  'place_reviews : note entre 1 et 5'
);

-- ── Résumés ──────────────────────────────────────────────────────────────────
SELECT is(
  (SELECT row(review_count, average_rating, confirmed_hours IS NULL)::TEXT
   FROM public.get_place_contribution_summaries(ARRAY['b4444444-4444-4444-4444-444444444444']::UUID[])),
  (SELECT row(count(*)::INT, round(avg(rating), 2)::NUMERIC(3, 2), true)::TEXT
   FROM public.place_reviews WHERE place_id = 'b4444444-4444-4444-4444-444444444444'),
  'get_place_contribution_summaries : avis comptés, horaires rejetés ignorés'
);
SELECT is(
  (SELECT photo_count FROM public.get_place_contribution_summaries(
     ARRAY['b3333333-3333-3333-3333-333333333333']::UUID[])),
  20,
  'get_place_contribution_summaries : photos visibles comptées'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
