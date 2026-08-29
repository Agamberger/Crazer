-- ============================================================
-- Migration: fix_places_rls_policies
-- Description: Corriger les politiques RLS sur `places` pour permettre
--              l'insertion et l'import de lieux (custom, google, osm...)
--              par des utilisateurs authentifiés.
-- ============================================================

-- 1. Supprimer l'ancienne politique restrictive sur l'INSERT
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent créer des lieux" ON public.places;

-- 2. Créer la nouvelle politique permissive pour l'INSERT
-- Permet aux utilisateurs connectés de créer ou d'importer n'importe quel lieu
CREATE POLICY "Utilisateurs authentifiés peuvent créer ou importer des lieux"
  ON public.places FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR created_by IS NULL OR source != 'custom'
  );

-- 3. Mettre à jour la politique UPDATE pour autoriser les enrichissements
DROP POLICY IF EXISTS "Owner peut modifier ses lieux custom" ON public.places;

CREATE POLICY "Utilisateurs authentifiés peuvent modifier leurs lieux ou enrichir les lieux"
  ON public.places FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR source != 'custom'
  )
  WITH CHECK (
    auth.uid() = created_by OR source != 'custom'
  );

-- 4. Assurer les droits d'accès sur la table places
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated, anon, service_role;
