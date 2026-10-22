-- ============================================================
-- Migration: grant_outings_permissions
-- Description: Accorder les permissions SELECT, INSERT, UPDATE, DELETE
--              aux rôles 'authenticated' et 'anon' sur les tables outings
-- ============================================================

-- Table outings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outings TO authenticated, anon, service_role;

-- Table outing_participants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outing_participants TO authenticated, anon, service_role;

-- Table planned_outings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_outings TO authenticated, anon, service_role;

-- Fonctions helper SECURITY DEFINER
GRANT EXECUTE ON FUNCTION public.is_outing_organizer(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_outing_participant(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_outing_member(UUID) TO authenticated, anon, service_role;
