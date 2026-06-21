
-- 1) Expandir tabela receipts para multi-tenant + cancelamento
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill clinic_id dos recibos existentes a partir do lançamento financeiro
UPDATE public.receipts r
SET clinic_id = fe.clinic_id
FROM public.financial_entries fe
WHERE r.financial_entry_id = fe.id
  AND r.clinic_id IS NULL
  AND fe.clinic_id IS NOT NULL;

-- Forçar clinic_id NOT NULL (assume backfill ok; recibos órfãos sem clínica seriam inconsistentes)
ALTER TABLE public.receipts ALTER COLUMN clinic_id SET NOT NULL;

-- Permitir recibos sem vínculo direto (financial_entry e professional opcionais)
ALTER TABLE public.receipts ALTER COLUMN financial_entry_id DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN professional_id DROP NOT NULL;

-- 2) Numeração por clínica (substitui sequência global)
ALTER TABLE public.receipts ALTER COLUMN numero DROP DEFAULT;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_numero_key;

CREATE OR REPLACE FUNCTION public.fn_receipts_set_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    SELECT COALESCE(MAX(numero),0)+1 INTO NEW.numero
    FROM public.receipts WHERE clinic_id = NEW.clinic_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_receipts_set_numero ON public.receipts;
CREATE TRIGGER trg_receipts_set_numero
BEFORE INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.fn_receipts_set_numero();

CREATE UNIQUE INDEX IF NOT EXISTS receipts_clinic_numero_unique
  ON public.receipts(clinic_id, numero);

CREATE INDEX IF NOT EXISTS idx_receipts_clinic ON public.receipts(clinic_id);

-- 3) updated_at automático
DROP TRIGGER IF EXISTS trg_receipts_updated ON public.receipts;
CREATE TRIGGER trg_receipts_updated
BEFORE UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Bloqueio em Modo Suporte
DROP TRIGGER IF EXISTS trg_receipts_block_support ON public.receipts;
CREATE TRIGGER trg_receipts_block_support
BEFORE INSERT OR UPDATE OR DELETE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

-- 5) Default clinic_id a partir do current_clinic_id()
DROP TRIGGER IF EXISTS trg_receipts_default_clinic ON public.receipts;
CREATE TRIGGER trg_receipts_default_clinic
BEFORE INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.fn_default_clinic_id();

-- 6) RLS — recibos multi-tenant
DROP POLICY IF EXISTS "rec admin all" ON public.receipts;
DROP POLICY IF EXISTS "rec prof read own" ON public.receipts;

CREATE POLICY "receipts tenant select" ON public.receipts
  FOR SELECT TO authenticated
  USING (can_access_clinic(clinic_id));

CREATE POLICY "receipts tenant insert" ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_clinic(clinic_id));

CREATE POLICY "receipts tenant update" ON public.receipts
  FOR UPDATE TO authenticated
  USING (can_manage_clinic(clinic_id))
  WITH CHECK (can_manage_clinic(clinic_id));

-- (sem policy de DELETE: recibos cancelados mantêm histórico)

-- 7) GRANTs (Data API)
GRANT SELECT, INSERT, UPDATE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
