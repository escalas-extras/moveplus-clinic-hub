-- Sprint G2.1 — Pacotes clínico-financeiros

CREATE TYPE public.patient_package_status AS ENUM ('ativo', 'encerrado', 'cancelado');

CREATE TABLE IF NOT EXISTS public.clinical_package_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  session_count integer NOT NULL CHECK (session_count > 0),
  total_value numeric(12, 2) NOT NULL CHECK (total_value > 0),
  session_unit_value numeric(12, 2) GENERATED ALWAYS AS (
    ROUND(total_value / session_count, 2)
  ) STORED,
  validity_days integer NOT NULL CHECK (validity_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinical_package_templates_clinic_name_unique UNIQUE (clinic_id, name)
);

CREATE TABLE IF NOT EXISTS public.patient_package_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  package_template_id uuid NOT NULL REFERENCES public.clinical_package_templates(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  professional_id uuid NULL REFERENCES public.professionals(id) ON DELETE SET NULL,
  financial_entry_id uuid NULL REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  contracted_at date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  sessions_total integer NOT NULL CHECK (sessions_total > 0),
  sessions_used integer NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  sessions_remaining integer GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
  contracted_value numeric(12, 2) NOT NULL CHECK (contracted_value > 0),
  status public.patient_package_status NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_package_contracts_sessions_used_lte_total
    CHECK (sessions_used <= sessions_total)
);

CREATE INDEX IF NOT EXISTS idx_clinical_package_templates_clinic
  ON public.clinical_package_templates (clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinical_package_templates_clinic_active
  ON public.clinical_package_templates (clinic_id, is_active);

CREATE INDEX IF NOT EXISTS idx_patient_package_contracts_clinic
  ON public.patient_package_contracts (clinic_id);

CREATE INDEX IF NOT EXISTS idx_patient_package_contracts_clinic_status
  ON public.patient_package_contracts (clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_patient_package_contracts_patient
  ON public.patient_package_contracts (clinic_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_package_contracts_template
  ON public.patient_package_contracts (package_template_id);

CREATE TRIGGER clinical_package_templates_set_updated
  BEFORE UPDATE ON public.clinical_package_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER patient_package_contracts_set_updated
  BEFORE UPDATE ON public.patient_package_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- G2.1 — receivable exige paciente; profissional opcional (contratos de pacote)
ALTER TABLE public.financial_entries
  DROP CONSTRAINT IF EXISTS financial_entries_receivable_requires_parties;

ALTER TABLE public.financial_entries
  ADD CONSTRAINT financial_entries_receivable_requires_parties
  CHECK (
    entry_type = 'payable'
    OR patient_id IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.fn_patient_package_contract_clinic_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN
    RAISE EXCEPTION 'clinic_id is required' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinical_package_templates t
    WHERE t.id = NEW.package_template_id AND t.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'package_template_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = NEW.patient_id AND p.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'patient_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.professionals pr
    WHERE pr.id = NEW.professional_id AND pr.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'professional_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.financial_entry_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.financial_entries fe
    WHERE fe.id = NEW.financial_entry_id AND fe.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'financial_entry_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_package_contract_clinic ON public.patient_package_contracts;
CREATE TRIGGER trg_patient_package_contract_clinic
  BEFORE INSERT OR UPDATE OF clinic_id, package_template_id, patient_id, professional_id, financial_entry_id
  ON public.patient_package_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_package_contract_clinic_match();

-- Modo Suporte: bloqueio de escrita
DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.clinical_package_templates;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.clinical_package_templates;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.clinical_package_templates;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.clinical_package_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.clinical_package_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.clinical_package_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.patient_package_contracts;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.patient_package_contracts;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.patient_package_contracts;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.patient_package_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.patient_package_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.patient_package_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

ALTER TABLE public.clinical_package_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_package_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_pkg_tpl_tenant_select ON public.clinical_package_templates;
DROP POLICY IF EXISTS fin_pkg_tpl_tenant_insert ON public.clinical_package_templates;
DROP POLICY IF EXISTS fin_pkg_tpl_tenant_update ON public.clinical_package_templates;
DROP POLICY IF EXISTS fin_pkg_tpl_tenant_delete ON public.clinical_package_templates;

CREATE POLICY fin_pkg_tpl_tenant_select ON public.clinical_package_templates
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_pkg_tpl_tenant_insert ON public.clinical_package_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_pkg_tpl_tenant_update ON public.clinical_package_templates
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_pkg_tpl_tenant_delete ON public.clinical_package_templates
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

DROP POLICY IF EXISTS fin_ppkg_tenant_select ON public.patient_package_contracts;
DROP POLICY IF EXISTS fin_ppkg_tenant_insert ON public.patient_package_contracts;
DROP POLICY IF EXISTS fin_ppkg_tenant_update ON public.patient_package_contracts;
DROP POLICY IF EXISTS fin_ppkg_tenant_delete ON public.patient_package_contracts;

CREATE POLICY fin_ppkg_tenant_select ON public.patient_package_contracts
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_ppkg_tenant_insert ON public.patient_package_contracts
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_ppkg_tenant_update ON public.patient_package_contracts
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_ppkg_tenant_delete ON public.patient_package_contracts
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_package_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_package_contracts TO authenticated;
GRANT ALL ON public.clinical_package_templates TO service_role;
GRANT ALL ON public.patient_package_contracts TO service_role;
