-- ============================================================================
-- Migration: 20260817220000_create_finances_tables.sql
-- Description: Create tables for shared finances (expenses, payers, splits, settlements)
-- with strict constraints, indexes, and Row Level Security (RLS) policies.
-- ============================================================================

-- 1. Table: public.expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sortie_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'bar', 'transport', 'logement', 'activite', 'courses', 'autre')),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: public.expense_payers (Multi-payer support)
CREATE TABLE IF NOT EXISTS public.expense_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_expense_payer UNIQUE (expense_id, user_id)
);

-- 3. Table: public.expense_splits (Participant shares / breakdowns)
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  percentage NUMERIC(5, 2),
  shares NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_expense_split UNIQUE (expense_id, user_id)
);

-- 4. Table: public.settlements (Reimbursements between members)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sortie_id TEXT NOT NULL,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_settlement_distinct_users CHECK (payer_id <> recipient_id)
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Indexes for public.expenses
CREATE INDEX IF NOT EXISTS idx_expenses_sortie_id ON public.expenses(sortie_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON public.expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Indexes for public.expense_payers
CREATE INDEX IF NOT EXISTS idx_expense_payers_expense_id ON public.expense_payers(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payers_user_id ON public.expense_payers(user_id);

-- Indexes for public.expense_splits
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);

-- Indexes for public.settlements
CREATE INDEX IF NOT EXISTS idx_settlements_sortie_id ON public.settlements(sortie_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer_id ON public.settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_recipient_id ON public.settlements(recipient_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.settlements(date);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Policies for public.expenses
CREATE POLICY "Expenses are viewable by authenticated users"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR auth.uid() = payer_id);

CREATE POLICY "Authenticated users can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = payer_id);

CREATE POLICY "Authenticated users can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = payer_id);

-- Policies for public.expense_payers
CREATE POLICY "Expense payers are viewable by authenticated users"
  ON public.expense_payers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert expense payers"
  ON public.expense_payers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update expense payers"
  ON public.expense_payers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete expense payers"
  ON public.expense_payers FOR DELETE
  TO authenticated
  USING (true);

-- Policies for public.expense_splits
CREATE POLICY "Expense splits are viewable by authenticated users"
  ON public.expense_splits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert expense splits"
  ON public.expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update expense splits"
  ON public.expense_splits FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete expense splits"
  ON public.expense_splits FOR DELETE
  TO authenticated
  USING (true);

-- Policies for public.settlements
CREATE POLICY "Settlements are viewable by authenticated users"
  ON public.settlements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settlements"
  ON public.settlements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Authenticated users can update settlements"
  ON public.settlements FOR UPDATE
  TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can delete settlements"
  ON public.settlements FOR DELETE
  TO authenticated
  USING (auth.uid() = payer_id);
