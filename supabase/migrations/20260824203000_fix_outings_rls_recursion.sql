-- ============================================================
-- Migration: fix_outings_rls_recursion
-- Description: Résout la récursion infinie dans les politiques RLS
--              entre `outings` et `outing_participants` en utilisant
--              des fonctions SECURITY DEFINER.
-- ============================================================

-- 1. Fonction helper SECURITY DEFINER : vérifie si un user est organisateur
CREATE OR REPLACE FUNCTION public.is_outing_organizer(p_outing_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outings
    WHERE id = p_outing_id AND created_by = p_user_id
  );
$$;

-- 2. Fonction helper SECURITY DEFINER : vérifie si un user est participant
CREATE OR REPLACE FUNCTION public.is_outing_participant(p_outing_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outing_participants
    WHERE outing_id = p_outing_id AND user_id = p_user_id
  );
$$;

-- 3. Mise à jour de la politique sur `outings`
DROP POLICY IF EXISTS "Participants peuvent lire la sortie" ON public.outings;
CREATE POLICY "Participants peuvent lire la sortie"
  ON public.outings FOR SELECT
  TO authenticated
  USING (
    public.is_outing_participant(id, auth.uid())
  );

-- 4. Mise à jour des politiques sur `outing_participants`
DROP POLICY IF EXISTS "Participants peuvent voir les membres d'une sortie" ON public.outing_participants;
CREATE POLICY "Participants peuvent voir les membres d'une sortie"
  ON public.outing_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

DROP POLICY IF EXISTS "Organisateur peut inviter des participants" ON public.outing_participants;
CREATE POLICY "Organisateur peut inviter des participants"
  ON public.outing_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_outing_organizer(outing_id, auth.uid())
  );

DROP POLICY IF EXISTS "Mise à jour statut participant" ON public.outing_participants;
CREATE POLICY "Mise à jour statut participant"
  ON public.outing_participants FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

DROP POLICY IF EXISTS "Organisateur peut retirer un participant" ON public.outing_participants;
CREATE POLICY "Organisateur peut retirer un participant"
  ON public.outing_participants FOR DELETE
  TO authenticated
  USING (
    public.is_outing_organizer(outing_id, auth.uid())
  );
