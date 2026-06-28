-- Sprint G2.3 — Parcelamentos financeiros

CREATE TYPE public.installment_plan_status AS ENUM ('active', 'canceled', 'completed');

CREATE TABLE IF NOT EXISTS public.financial_installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('manual', 'package_contract')),
  source_id uuid NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount > 0),
  installments_count integer NOT NULL CHECK (installments_count >= 2),
  first_due_date date NOT NULL,
  status public.installment_plan_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS installment_plan_id uuid NULL
    REFERENCES public.financial_installment_plans(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS installment_number integer NULL,
  ADD COLUMN IF NOT EXISTS installment_total integer NULL;

ALTER TABLE public.financial_entries
  DROP CONSTRAINT IF EXISTS financial_entries_installment_fields_consistency;

ALTER TABLE public.financial_entries
  ADD CONSTRAINT financial_entries_installment_fields_consistency
  CHECK (
    (installment_plan_id IS NULL AND installment_number IS NULL AND installment_total IS NULL)
    OR (
      installment_plan_id IS NOT NULL
      AND installment_number IS NOT NULL
      AND installment_total IS NOT NULL
      AND installment_number >= 1
      AND installment_total >= 2
      AND installment_number <= installment_total
    )
  );

CREATE INDEX IF NOT EXISTS idx_financial_installment_plans_clinic
  ON public.financial_installment_plans (clinic_id);

CREATE INDEX IF NOT EXISTS idx_financial_installment_plans_clinic_status
  ON public.financial_installment_plans (clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_installment_plans_source
  ON public.financial_installment_plans (clinic_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_installment_plan
  ON public.financial_entries (installment_plan_id)
  WHERE installment_plan_id IS NOT NULL;

CREATE TRIGGER financial_installment_plans_set_updated
  BEFORE UPDATE ON public.financial_installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fn_financial_installment_plan_clinic_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN
    RAISE EXCEPTION 'clinic_id is required' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = NEW.patient_id AND p.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'patient_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.source_type = 'package_contract' AND NEW.source_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.patient_package_contracts c
      WHERE c.id = NEW.source_id AND c.clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'source_id must reference a package contract in the same clinic'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_financial_entry_installment_plan_clinic_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.installment_plan_id IS NOT NULL THEN
    IF NEW.clinic_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.financial_installment_plans p
      WHERE p.id = NEW.installment_plan_id AND p.clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'installment_plan_id must belong to the same clinic'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_financial_installment_plan_clinic ON public.financial_installment_plans;
CREATE TRIGGER trg_financial_installment_plan_clinic
  BEFORE INSERT OR UPDATE OF clinic_id, patient_id, source_type, source_id
  ON public.financial_installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_installment_plan_clinic_match();

DROP TRIGGER IF EXISTS trg_financial_entry_installment_plan_clinic ON public.financial_entries;
CREATE TRIGGER trg_financial_entry_installment_plan_clinic
  BEFORE INSERT OR UPDATE OF installment_plan_id, clinic_id ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_entry_installment_plan_clinic_match();

DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.financial_installment_plans;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.financial_installment_plans;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.financial_installment_plans;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.financial_installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.financial_installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.financial_installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

ALTER TABLE public.financial_installment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_inst_plan_tenant_select ON public.financial_installment_plans;
DROP POLICY IF EXISTS fin_inst_plan_tenant_insert ON public.financial_installment_plans;
DROP POLICY IF EXISTS fin_inst_plan_tenant_update ON public.financial_installment_plans;
DROP POLICY IF EXISTS fin_inst_plan_tenant_delete ON public.financial_installment_plans;

CREATE POLICY fin_inst_plan_tenant_select ON public.financial_installment_plans
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_inst_plan_tenant_insert ON public.financial_installment_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_inst_plan_tenant_update ON public.financial_installment_plans
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_inst_plan_tenant_delete ON public.financial_installment_plans
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_installment_plans TO authenticated;
GRANT ALL ON public.financial_installment_plans TO service_role;
