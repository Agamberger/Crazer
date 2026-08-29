-- ============================================================
-- Migration: fix_outings_rls_recursion
-- Description: Résout la récursion infinie dans les politiques RLS
--              entre `outings`, `outing_participants` et `planned_outings`
--              en utilisant des fonctions PL/pgSQL SECURITY DEFINER.
-- ============================================================

-- 1. Fonction helper SECURITY DEFINER : vérifie si un user est organisateur (PL/pgSQL anti-inlining)
CREATE OR REPLACE FUNCTION public.is_outing_organizer(p_outing_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.outings
    WHERE id = p_outing_id AND created_by = p_user_id
  );
END;
$$;

-- 2. Fonction helper SECURITY DEFINER : vérifie si un user est participant (PL/pgSQL anti-inlining)
CREATE OR REPLACE FUNCTION public.is_outing_participant(p_outing_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.outing_participants
    WHERE outing_id = p_outing_id AND user_id = p_user_id
  );
END;
$$;

-- 3. Fonction helper SECURITY DEFINER : vérifie si un user est membre (organisateur OU participant)
CREATE OR REPLACE FUNCTION public.is_outing_member(p_outing_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.outings o
      WHERE o.id = p_outing_id AND o.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.outing_participants op
      WHERE op.outing_id = p_outing_id AND op.user_id = auth.uid()
    )
  );
END;
$$;

-- 4. Mise à jour des politiques sur `outings`
DROP POLICY IF EXISTS "Organisateur peut lire ses sorties" ON public.outings;
DROP POLICY IF EXISTS "Participants peuvent lire la sortie" ON public.outings;

CREATE POLICY "Organisateur peut lire ses sorties"
  ON public.outings FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Participants peuvent lire la sortie"
  ON public.outings FOR SELECT
  TO authenticated
  USING (
    public.is_outing_participant(id, auth.uid())
  );

-- 5. Mise à jour des politiques sur `outing_participants`
DROP POLICY IF EXISTS "Participants peuvent voir les membres d'une sortie" ON public.outing_participants;
DROP POLICY IF EXISTS "Organisateur peut inviter des participants" ON public.outing_participants;
DROP POLICY IF EXISTS "Mise à jour statut participant" ON public.outing_participants;
DROP POLICY IF EXISTS "Organisateur peut retirer un participant" ON public.outing_participants;

CREATE POLICY "Participants peuvent voir les membres d'une sortie"
  ON public.outing_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

CREATE POLICY "Organisateur peut inviter des participants"
  ON public.outing_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_outing_organizer(outing_id, auth.uid())
  );

CREATE POLICY "Mise à jour statut participant"
  ON public.outing_participants FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

CREATE POLICY "Organisateur peut retirer un participant"
  ON public.outing_participants FOR DELETE
  TO authenticated
  USING (
    public.is_outing_organizer(outing_id, auth.uid())
  );

-- 6. Mise à jour des politiques sur `planned_outings`
DROP POLICY IF EXISTS "Membres peuvent lire les planned_outings" ON public.planned_outings;
DROP POLICY IF EXISTS "Membres peuvent créer des planned_outings" ON public.planned_outings;
DROP POLICY IF EXISTS "Créateur ou organisateur peut modifier un planned_outing" ON public.planned_outings;
DROP POLICY IF EXISTS "Créateur ou organisateur peut supprimer un planned_outing" ON public.planned_outings;

CREATE POLICY "Membres peuvent lire les planned_outings"
  ON public.planned_outings FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

CREATE POLICY "Membres peuvent créer des planned_outings"
  ON public.planned_outings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_outing_member(outing_id)
    AND auth.uid() = created_by
  );

CREATE POLICY "Créateur ou organisateur peut modifier un planned_outing"
  ON public.planned_outings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

CREATE POLICY "Créateur ou organisateur peut supprimer un planned_outing"
  ON public.planned_outings FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.is_outing_organizer(outing_id, auth.uid())
  );
