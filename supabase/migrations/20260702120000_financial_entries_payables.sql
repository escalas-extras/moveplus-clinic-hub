-- Sprint G1.5 — Contas a Pagar (payables em financial_entries)

-- Despesas não exigem paciente/profissional; receitas (receivable) continuam obrigatórias.
ALTER TABLE public.financial_entries
  ALTER COLUMN patient_id DROP NOT NULL,
  ALTER COLUMN professional_id DROP NOT NULL;

ALTER TABLE public.financial_entries
  DROP CONSTRAINT IF EXISTS financial_entries_receivable_requires_parties;

ALTER TABLE public.financial_entries
  ADD CONSTRAINT financial_entries_receivable_requires_parties
  CHECK (
    entry_type = 'payable'
    OR (patient_id IS NOT NULL AND professional_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_financial_entries_payable_vencimento
  ON public.financial_entries (clinic_id, data_vencimento)
  WHERE entry_type = 'payable';
