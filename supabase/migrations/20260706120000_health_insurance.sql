-- Sprint G2.4 — Convênios (operadoras e vínculo paciente)

CREATE TABLE IF NOT EXISTS public.health_insurance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  document text NULL,
  contact_name text NULL,
  phone text NULL,
  email text NULL,
  notes text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT health_insurance_providers_clinic_name_unique UNIQUE (clinic_id, name)
);

CREATE TABLE IF NOT EXISTS public.patient_health_insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES public.health_insurance_providers(id) ON DELETE RESTRICT,
  plan_name text NULL,
  card_number text NULL,
  authorization_number text NULL,
  valid_until date NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS health_insurance_provider_id uuid NULL
    REFERENCES public.health_insurance_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_health_insurance_id uuid NULL
    REFERENCES public.patient_health_insurances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_health_insurance_providers_clinic
  ON public.health_insurance_providers (clinic_id);

CREATE INDEX IF NOT EXISTS idx_health_insurance_providers_clinic_active
  ON public.health_insurance_providers (clinic_id, is_active);

CREATE INDEX IF NOT EXISTS idx_patient_health_insurances_clinic
  ON public.patient_health_insurances (clinic_id);

CREATE INDEX IF NOT EXISTS idx_patient_health_insurances_patient
  ON public.patient_health_insurances (clinic_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_health_insurances_provider
  ON public.patient_health_insurances (clinic_id, provider_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_health_insurance
  ON public.financial_entries (health_insurance_provider_id)
  WHERE health_insurance_provider_id IS NOT NULL;

CREATE TRIGGER health_insurance_providers_set_updated
  BEFORE UPDATE ON public.health_insurance_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER patient_health_insurances_set_updated
  BEFORE UPDATE ON public.patient_health_insurances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fn_patient_health_insurance_clinic_match()
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

  IF NOT EXISTS (
    SELECT 1 FROM public.health_insurance_providers h
    WHERE h.id = NEW.provider_id AND h.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'provider_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_financial_entry_health_insurance_clinic_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.health_insurance_provider_id IS NOT NULL THEN
    IF NEW.clinic_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.health_insurance_providers h
      WHERE h.id = NEW.health_insurance_provider_id AND h.clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'health_insurance_provider_id must belong to the same clinic'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.patient_health_insurance_id IS NOT NULL THEN
    IF NEW.clinic_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.patient_health_insurances phi
      WHERE phi.id = NEW.patient_health_insurance_id AND phi.clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'patient_health_insurance_id must belong to the same clinic'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_health_insurance_clinic ON public.patient_health_insurances;
CREATE TRIGGER trg_patient_health_insurance_clinic
  BEFORE INSERT OR UPDATE OF clinic_id, patient_id, provider_id ON public.patient_health_insurances
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_health_insurance_clinic_match();

DROP TRIGGER IF EXISTS trg_financial_entry_health_insurance_clinic ON public.financial_entries;
CREATE TRIGGER trg_financial_entry_health_insurance_clinic
  BEFORE INSERT OR UPDATE OF health_insurance_provider_id, patient_health_insurance_id, clinic_id
  ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_entry_health_insurance_clinic_match();

-- Modo Suporte
DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.health_insurance_providers;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.health_insurance_providers;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.health_insurance_providers;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.health_insurance_providers
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.health_insurance_providers
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.health_insurance_providers
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.patient_health_insurances;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.patient_health_insurances;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.patient_health_insurances;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.patient_health_insurances
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.patient_health_insurances
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.patient_health_insurances
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

ALTER TABLE public.health_insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_health_insurances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_hi_prov_tenant_select ON public.health_insurance_providers;
DROP POLICY IF EXISTS fin_hi_prov_tenant_insert ON public.health_insurance_providers;
DROP POLICY IF EXISTS fin_hi_prov_tenant_update ON public.health_insurance_providers;
DROP POLICY IF EXISTS fin_hi_prov_tenant_delete ON public.health_insurance_providers;

CREATE POLICY fin_hi_prov_tenant_select ON public.health_insurance_providers
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_hi_prov_tenant_insert ON public.health_insurance_providers
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_hi_prov_tenant_update ON public.health_insurance_providers
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_hi_prov_tenant_delete ON public.health_insurance_providers
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

DROP POLICY IF EXISTS fin_phi_tenant_select ON public.patient_health_insurances;
DROP POLICY IF EXISTS fin_phi_tenant_insert ON public.patient_health_insurances;
DROP POLICY IF EXISTS fin_phi_tenant_update ON public.patient_health_insurances;
DROP POLICY IF EXISTS fin_phi_tenant_delete ON public.patient_health_insurances;

CREATE POLICY fin_phi_tenant_select ON public.patient_health_insurances
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_phi_tenant_insert ON public.patient_health_insurances
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_phi_tenant_update ON public.patient_health_insurances
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_phi_tenant_delete ON public.patient_health_insurances
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_insurance_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_health_insurances TO authenticated;
GRANT ALL ON public.health_insurance_providers TO service_role;
GRANT ALL ON public.patient_health_insurances TO service_role;
