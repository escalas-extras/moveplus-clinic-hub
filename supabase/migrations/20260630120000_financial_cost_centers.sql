-- Sprint G1.3 — Centros de custo (segmentação financeira por área/unidade)

CREATE TABLE IF NOT EXISTS public.financial_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NULL,
  color text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_cost_centers_clinic_name_unique UNIQUE (clinic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_clinic
  ON public.financial_cost_centers (clinic_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_clinic_active
  ON public.financial_cost_centers (clinic_id, is_active);

CREATE TRIGGER financial_cost_centers_set_updated
  BEFORE UPDATE ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cost_center_id opcional em lançamentos v1 (preparação G1.4+)
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS cost_center_id uuid NULL
  REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_cost_center
  ON public.financial_entries (cost_center_id)
  WHERE cost_center_id IS NOT NULL;

-- Garante que centro de custo pertence à mesma clínica do lançamento
CREATE OR REPLACE FUNCTION public.fn_financial_entry_cost_center_clinic_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cost_center_id IS NOT NULL THEN
    IF NEW.clinic_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.financial_cost_centers cc
      WHERE cc.id = NEW.cost_center_id AND cc.clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'cost_center_id must belong to the same clinic as the financial entry'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_financial_entry_cost_center_clinic ON public.financial_entries;
CREATE TRIGGER trg_financial_entry_cost_center_clinic
  BEFORE INSERT OR UPDATE OF cost_center_id, clinic_id ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_entry_cost_center_clinic_match();

-- Modo Suporte: bloqueio de escrita
DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.financial_cost_centers;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.financial_cost_centers;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.financial_cost_centers;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

ALTER TABLE public.financial_cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_cc_tenant_select ON public.financial_cost_centers;
DROP POLICY IF EXISTS fin_cc_tenant_insert ON public.financial_cost_centers;
DROP POLICY IF EXISTS fin_cc_tenant_update ON public.financial_cost_centers;
DROP POLICY IF EXISTS fin_cc_tenant_delete ON public.financial_cost_centers;

CREATE POLICY fin_cc_tenant_select ON public.financial_cost_centers
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_cc_tenant_insert ON public.financial_cost_centers
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_cc_tenant_update ON public.financial_cost_centers
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_cc_tenant_delete ON public.financial_cost_centers
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_cost_centers TO authenticated;
GRANT ALL ON public.financial_cost_centers TO service_role;
