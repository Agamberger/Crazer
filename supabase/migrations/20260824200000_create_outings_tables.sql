-- ============================================================
-- Migration: create_outings_tables
-- Description: Crée les tables `outings` (sortie principale avec
--              date de début) et `planned_outings` (étapes planifiées
--              d'une sortie, triées par scheduled_for).
-- ============================================================

-- ============================================================
-- ENUM: statut d'une sortie
-- ============================================================
CREATE TYPE public.outing_status AS ENUM (
  'draft',      -- Brouillon, organisateur seul peut voir
  'planned',    -- Confirmée, invités notifiés
  'ongoing',    -- En cours
  'done',       -- Terminée
  'cancelled'   -- Annulée
);

-- ============================================================
-- ENUM: statut d'un planned_outing
-- ============================================================
CREATE TYPE public.planned_outing_status AS ENUM (
  'pending',    -- En attente de confirmation
  'confirmed',  -- Confirmée
  'skipped',    -- Passée / ignorée
  'cancelled'   -- Annulée individuellement
);

-- ============================================================
-- TABLE: outings
-- Description: Représente une sortie globale créée par un user.
--              Elle a une date de début (start_date) et regroupe
--              plusieurs étapes planifiées (planned_outings).
-- ============================================================
CREATE TABLE public.outings (\
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Auteur ───────────────────────────────────────────────
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ── Informations générales ───────────────────────────────
  title         TEXT NOT NULL,
  description   TEXT,

  -- ── Date de début de la sortie ───────────────────────────
  -- Représente le jour/heure à partir duquel la sortie démarre.
  -- Les planned_outings peuvent avoir des scheduled_for >= start_date.
  start_date    TIMESTAMPTZ NOT NULL,

  -- ── Statut ───────────────────────────────────────────────
  status        public.outing_status NOT NULL DEFAULT 'draft',

  -- ── Image de couverture (optionnelle) ────────────────────
  cover_image   TEXT,

  -- ── Timestamps ───────────────────────────────────────────
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index sur created_by (lister les sorties d'un utilisateur)
CREATE INDEX outings_created_by_idx ON public.outings (created_by);

-- Index sur start_date (tri chronologique)
CREATE INDEX outings_start_date_idx ON public.outings (start_date);

-- Index sur status (filtrage)
CREATE INDEX outings_status_idx ON public.outings (status);

-- ============================================================
-- TRIGGER: mise à jour automatique de updated_at sur outings
-- (réutilise la fonction update_updated_at_column déjà créée)
-- ============================================================
CREATE TRIGGER outings_updated_at
  BEFORE UPDATE ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY — outings
-- ============================================================
ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;

-- L'organisateur peut tout faire sur ses propres sorties
CREATE POLICY "Organisateur peut lire ses sorties"
  ON public.outings FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Organisateur peut créer une sortie"
  ON public.outings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organisateur peut modifier sa sortie"
  ON public.outings FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Organisateur peut supprimer sa sortie"
  ON public.outings FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- TABLE: outing_participants
-- Description: Membres invités / acceptés à une sortie.
--              Permet d'exposer les sorties aux participants.
-- ============================================================
CREATE TYPE public.participant_status AS ENUM (
  'invited',    -- Invité mais n'a pas encore répondu
  'accepted',   -- A accepté l'invitation
  'declined',   -- A décliné
  'maybe'       -- Peut-être présent
);

CREATE TABLE public.outing_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id     UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        public.participant_status NOT NULL DEFAULT 'invited',
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,

  CONSTRAINT outing_participants_unique UNIQUE (outing_id, user_id)
);

CREATE INDEX outing_participants_outing_idx ON public.outing_participants (outing_id);
CREATE INDEX outing_participants_user_idx   ON public.outing_participants (user_id);

<<<<<<< Updated upstream
=======
-- Helper PL/pgSQL SECURITY DEFINER pour éviter les récursions RLS (anti-inlining)
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

>>>>>>> Stashed changes
-- ============================================================
-- ROW LEVEL SECURITY — outing_participants
-- ============================================================
ALTER TABLE public.outing_participants ENABLE ROW LEVEL SECURITY;

-- Un participant peut voir les participants de ses sorties
CREATE POLICY "Participants peuvent voir les membres d'une sortie"
  ON public.outing_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.outings o
      WHERE o.id = outing_id AND o.created_by = auth.uid()
    )
  );

-- L'organisateur peut inviter des participants
CREATE POLICY "Organisateur peut inviter des participants"
  ON public.outing_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outings o
      WHERE o.id = outing_id AND o.created_by = auth.uid()
    )
  );

-- Un participant peut mettre à jour son propre statut ; l'organisateur peut tout modifier
CREATE POLICY "Mise à jour statut participant"
  ON public.outing_participants FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.outings o
      WHERE o.id = outing_id AND o.created_by = auth.uid()
    )
  );

-- L'organisateur peut retirer un participant
CREATE POLICY "Organisateur peut retirer un participant"
  ON public.outing_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.outings o
      WHERE o.id = outing_id AND o.created_by = auth.uid()
    )
  );

-- ============================================================
-- RLS ADDITIONNEL — outings: les participants peuvent aussi lire
-- ============================================================
CREATE POLICY "Participants peuvent lire la sortie"
  ON public.outings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.outing_participants op
      WHERE op.outing_id = id AND op.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: planned_outings
-- Description: Étapes/activités planifiées au sein d'une sortie.
--              Chaque planned_outing est lié à un outing et
--              éventuellement à un lieu (places). Elles sont
--              naturellement triées par scheduled_for ASC.
-- ============================================================
CREATE TABLE public.planned_outings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Relation vers la sortie parente ──────────────────────
  outing_id       UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,

  -- ── Lieu optionnel (lié à la table places) ───────────────
  place_id        UUID REFERENCES public.places(id) ON DELETE SET NULL,

  -- ── Informations de l'étape ──────────────────────────────
  title           TEXT NOT NULL,
  description     TEXT,
  notes           TEXT,           -- Notes libres pour les participants

  -- ── Date et heure planifiée (clé de tri) ─────────────────
  -- DOIT être >= outings.start_date
  scheduled_for   TIMESTAMPTZ NOT NULL,

  -- ── Durée estimée (en minutes) ───────────────────────────
  duration_min    INTEGER CHECK (duration_min > 0),

  -- ── Statut de l'étape ────────────────────────────────────
  status          public.planned_outing_status NOT NULL DEFAULT 'pending',

  -- ── Créateur de l'étape (peut être n'importe quel participant) ──
  created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ── Timestamps ───────────────────────────────────────────
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte: scheduled_for doit être >= start_date du outing parent
  -- (validée via trigger ci-dessous, pas possible avec simple CHECK sans subquery)
  CONSTRAINT planned_outings_duration_positive CHECK (duration_min IS NULL OR duration_min > 0)
);

-- ── Index principaux ───────────────────────────────────────
-- Index sur outing_id + scheduled_for : la requête canonique est
-- "toutes les étapes d'une sortie, triées par date/heure"
CREATE INDEX planned_outings_outing_scheduled_idx
  ON public.planned_outings (outing_id, scheduled_for ASC);

CREATE INDEX planned_outings_place_idx
  ON public.planned_outings (place_id)
  WHERE place_id IS NOT NULL;

CREATE INDEX planned_outings_created_by_idx
  ON public.planned_outings (created_by);

CREATE INDEX planned_outings_status_idx
  ON public.planned_outings (status);

-- ============================================================
-- TRIGGER: validation que scheduled_for >= outing.start_date
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_planned_outing_scheduled_for()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  SELECT start_date INTO v_start_date
  FROM public.outings
  WHERE id = NEW.outing_id;

  IF v_start_date IS NULL THEN
    RAISE EXCEPTION 'outing_id % introuvable', NEW.outing_id;
  END IF;

  IF NEW.scheduled_for < v_start_date THEN
    RAISE EXCEPTION
      'scheduled_for (%) ne peut pas être antérieur à start_date de la sortie (%)',
      NEW.scheduled_for, v_start_date;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER planned_outings_check_scheduled_for
  BEFORE INSERT OR UPDATE OF scheduled_for, outing_id ON public.planned_outings
  FOR EACH ROW EXECUTE FUNCTION public.check_planned_outing_scheduled_for();

-- ============================================================
-- TRIGGER: mise à jour automatique de updated_at sur planned_outings
-- ============================================================
CREATE TRIGGER planned_outings_updated_at
  BEFORE UPDATE ON public.planned_outings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY — planned_outings
-- ============================================================
ALTER TABLE public.planned_outings ENABLE ROW LEVEL SECURITY;

-- Helper PL/pgSQL: est-ce que l'utilisateur courant participe à ce outing ?
-- (organisateur OU participant accepté/invité)
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

-- Les membres de la sortie peuvent lire les étapes
CREATE POLICY "Membres peuvent lire les planned_outings"
  ON public.planned_outings FOR SELECT
  TO authenticated
  USING (public.is_outing_member(outing_id));

-- Les membres peuvent créer une étape dans une de leurs sorties
CREATE POLICY "Membres peuvent créer des planned_outings"
  ON public.planned_outings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_outing_member(outing_id)
    AND auth.uid() = created_by
  );

-- Le créateur de l'étape OU l'organisateur peut modifier
CREATE POLICY "Créateur ou organisateur peut modifier un planned_outing"
  ON public.planned_outings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

-- Le créateur de l'étape OU l'organisateur peut supprimer
CREATE POLICY "Créateur ou organisateur peut supprimer un planned_outing"
  ON public.planned_outings FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.is_outing_organizer(outing_id, auth.uid())
  );

-- ============================================================
-- COMMENTAIRES (pg_description pour Supabase Studio)
-- ============================================================
COMMENT ON TABLE public.outings IS
  'Sorties principales créées par un utilisateur. Contient une date de début (start_date) et regroupe plusieurs étapes planifiées (planned_outings).';

COMMENT ON COLUMN public.outings.start_date IS
  'Date et heure de début de la sortie. Toutes les étapes (planned_outings.scheduled_for) doivent être >= à cette valeur.';

COMMENT ON TABLE public.outing_participants IS
  'Membres invités ou participants à une sortie.';

COMMENT ON TABLE public.planned_outings IS
  'Étapes/activités planifiées d''une sortie. Triées par scheduled_for ASC. Liées optionnellement à un lieu (places).';

COMMENT ON COLUMN public.planned_outings.scheduled_for IS
  'Date/heure planifiée de l''étape. Doit être >= outings.start_date (validée par trigger).';

COMMENT ON COLUMN public.planned_outings.duration_min IS
  'Durée estimée de l''étape en minutes (optionnel, doit être > 0).';
