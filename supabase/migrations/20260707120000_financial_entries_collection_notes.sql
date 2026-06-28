-- Sprint G2.5 — Inadimplência (notas simples de cobrança em recebíveis)

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS collection_notes text NULL;

COMMENT ON COLUMN public.financial_entries.collection_notes IS
  'Observações de cobrança manual (Sprint G2.5 — inadimplência).';
