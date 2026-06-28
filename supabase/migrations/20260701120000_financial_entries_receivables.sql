-- Sprint G1.4 — Contas a Receber (extensão de financial_entries)

-- Status cancelado para títulos anulados
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelado';

-- Campos para vencimento, recebimento, documento e tipo de lançamento (prep. G1.5 payables)
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS data_vencimento date NULL,
  ADD COLUMN IF NOT EXISTS data_recebimento date NULL,
  ADD COLUMN IF NOT EXISTS documento text NULL,
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'receivable'
    CHECK (entry_type IN ('receivable', 'payable'));

-- Backfill compatível com lançamentos v1 existentes
UPDATE public.financial_entries
   SET data_vencimento = data
 WHERE data_vencimento IS NULL;

UPDATE public.financial_entries
   SET data_recebimento = data
 WHERE status = 'pago' AND data_recebimento IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_vencimento
  ON public.financial_entries (clinic_id, data_vencimento);

CREATE INDEX IF NOT EXISTS idx_financial_entries_entry_type
  ON public.financial_entries (clinic_id, entry_type);

CREATE INDEX IF NOT EXISTS idx_financial_entries_status
  ON public.financial_entries (clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_entries_documento
  ON public.financial_entries (clinic_id, documento)
  WHERE documento IS NOT NULL;
