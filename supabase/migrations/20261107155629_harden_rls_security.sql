-- ============================================================
-- Migration: harden_rls_security
-- Description: Durcissement des politiques RLS et des privilèges.
--   1. friendships         : plus d'amitié auto-acceptée, seul le destinataire
--                            répond, colonnes d'identité figées.
--   2. outing_participants : un invité ne peut plus se déplacer vers une autre
--                            sortie ; l'organisateur n'impose plus "accepted".
--      planned_outings     : outing_id / created_by figés après création.
--   3. places              : seuls les propriétaires modifient leurs lieux.
--   4. profiles            : emails masqués ; recherche via RPC dédiées.
--   5. anon                : plus aucun accès aux sorties ni aux helpers.
--   6. search_path figé sur les fonctions qui n'en avaient pas.
-- Tests : supabase/tests/database/rls_security.test.sql
-- ============================================================

-- ============================================================
-- 1. FRIENDSHIPS
-- ============================================================
ALTER TABLE public.friendships
  ADD CONSTRAINT friendships_not_self CHECK (user_id <> friend_id);

CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON public.friendships (friend_id);

DROP POLICY IF EXISTS "Users can insert friend requests" ON public.friendships;
CREATE POLICY "Users can insert friend requests"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'pending'
    AND user_id <> friend_id
    -- Pas de doublon en sens inverse (le sens direct est couvert par unique_friendship)
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.user_id = friendships.friend_id AND f.friend_id = friendships.user_id
    )
  );

-- Seul le destinataire de la demande peut changer son statut
DROP POLICY IF EXISTS "Users can update their friendship status" ON public.friendships;
CREATE POLICY "Recipient can update friendship status"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = friend_id)
  WITH CHECK ((SELECT auth.uid()) = friend_id);

-- Privilèges explicites : les stacks Supabase récentes n'accordent plus
-- SELECT/INSERT/UPDATE/DELETE par défaut aux rôles de l'API.
REVOKE ALL ON public.friendships FROM anon;
REVOKE UPDATE ON public.friendships FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;
GRANT UPDATE (status, updated_at) ON public.friendships TO authenticated;

-- ============================================================
-- 2. OUTINGS / OUTING_PARTICIPANTS / PLANNED_OUTINGS
-- ============================================================
DROP POLICY IF EXISTS "Organisateur peut modifier sa sortie" ON public.outings;
CREATE POLICY "Organisateur peut modifier sa sortie"
  ON public.outings FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- L'organisateur invite (statut 'invited') ; il peut s'ajouter lui-même avec n'importe quel statut
DROP POLICY IF EXISTS "Organisateur peut inviter des participants" ON public.outing_participants;
CREATE POLICY "Organisateur peut inviter des participants"
  ON public.outing_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_outing_organizer(outing_id, (SELECT auth.uid()))
    AND (status = 'invited' OR user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Mise à jour statut participant" ON public.outing_participants;
CREATE POLICY "Mise à jour statut participant"
  ON public.outing_participants FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  );

-- Seuls le statut et la date de réponse sont modifiables
REVOKE UPDATE ON public.outing_participants FROM authenticated;
GRANT UPDATE (status, responded_at) ON public.outing_participants TO authenticated;

DROP POLICY IF EXISTS "Créateur ou organisateur peut modifier un planned_outing" ON public.planned_outings;
CREATE POLICY "Créateur ou organisateur peut modifier un planned_outing"
  ON public.planned_outings FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = created_by
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT auth.uid()) = created_by
    OR public.is_outing_organizer(outing_id, (SELECT auth.uid()))
  );

-- outing_id et created_by sont figés après création
REVOKE UPDATE ON public.planned_outings FROM authenticated;
GRANT UPDATE (
  place_id, title, description, notes, scheduled_for, duration_min, status, updated_at
) ON public.planned_outings TO authenticated;

-- ============================================================
-- 3. PLACES
-- ============================================================
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier leurs lieux ou enrichir les lieux"
  ON public.places;
CREATE POLICY "Owner peut modifier ses lieux"
  ON public.places FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

REVOKE INSERT, UPDATE, DELETE ON public.places FROM anon;

-- RPC de recherche de lieux publics : exécution explicite (plus de droit implicite à PUBLIC)
GRANT EXECUTE ON FUNCTION
  public.search_places(TEXT, FLOAT8, FLOAT8, INTEGER, public.place_category, INTEGER)
  TO anon, authenticated;

-- ============================================================
-- 4. PROFILES : emails masqués
-- ============================================================
REVOKE ALL ON public.profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, updated_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Les profils sont créés par le trigger handle_new_user (SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- L'email d'un profil est visible par : soi-même, un ami accepté,
-- ou l'auteur d'une demande d'ami en attente adressée à l'utilisateur courant.
CREATE OR REPLACE FUNCTION public.can_view_profile_email(p_target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_target = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (
          f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = p_target)
            OR (f.friend_id = auth.uid() AND f.user_id = p_target)
          )
        )
        OR (f.status = 'pending' AND f.user_id = p_target AND f.friend_id = auth.uid())
    );
$$;

-- Recherche d'utilisateurs : nom (sous-chaîne, jokers échappés) ou email exact.
CREATE OR REPLACE FUNCTION public.search_profiles(p_query TEXT)
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT
      btrim(coalesce(p_query, '')) AS raw,
      replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_')
        AS escaped
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    CASE
      WHEN lower(p.email) = lower(q.raw) OR public.can_view_profile_email(p.id) THEN p.email
    END AS email
  FROM public.profiles p, q
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND char_length(q.raw) BETWEEN 2 AND 100
    AND (
      p.full_name ILIKE '%' || q.escaped || '%' ESCAPE '\'
      OR lower(p.email) = lower(q.raw)
    )
  ORDER BY p.full_name NULLS LAST, p.id
  LIMIT 20;
$$;

-- Profils par identifiants (liste d'amis, demandes), email masqué selon les mêmes règles.
CREATE OR REPLACE FUNCTION public.get_profiles(p_ids UUID[])
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    CASE WHEN public.can_view_profile_email(p.id) THEN p.email END AS email
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY (p_ids[1:200]);
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_profile_email(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.search_profiles(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles(UUID[]) TO authenticated;

-- ============================================================
-- 5. ANON : aucun accès aux sorties ni aux helpers SECURITY DEFINER
-- ============================================================
REVOKE ALL ON public.outings FROM anon;
REVOKE ALL ON public.outing_participants FROM anon;
REVOKE ALL ON public.planned_outings FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_outing_organizer(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_outing_participant(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_outing_member(UUID) FROM PUBLIC, anon;

-- ============================================================
-- 6. search_path figé
-- ============================================================
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.check_planned_outing_scheduled_for() SET search_path = '';
ALTER FUNCTION public.places_search_vector_update() SET search_path = public;
ALTER FUNCTION public.search_places(TEXT, FLOAT8, FLOAT8, INTEGER, public.place_category, INTEGER)
  SET search_path = public;
