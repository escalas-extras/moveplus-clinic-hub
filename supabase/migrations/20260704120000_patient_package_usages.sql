-- Sprint G2.2 — Consumo de sessões / créditos de pacotes

CREATE TYPE public.patient_package_usage_status AS ENUM ('active', 'reversed');

CREATE TABLE IF NOT EXISTS public.patient_package_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_package_contract_id uuid NOT NULL
    REFERENCES public.patient_package_contracts(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  professional_id uuid NULL REFERENCES public.professionals(id) ON DELETE SET NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes text NULL,
  status public.patient_package_usage_status NOT NULL DEFAULT 'active',
  reversed_at timestamptz NULL,
  reversed_by uuid NULL,
  reversal_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT patient_package_usages_reversal_consistency CHECK (
    (status = 'active' AND reversed_at IS NULL AND reversed_by IS NULL AND reversal_reason IS NULL)
    OR (status = 'reversed' AND reversed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_patient_package_usages_clinic
  ON public.patient_package_usages (clinic_id);

CREATE INDEX IF NOT EXISTS idx_patient_package_usages_contract
  ON public.patient_package_usages (patient_package_contract_id);

CREATE INDEX IF NOT EXISTS idx_patient_package_usages_contract_status
  ON public.patient_package_usages (patient_package_contract_id, status);

CREATE INDEX IF NOT EXISTS idx_patient_package_usages_patient
  ON public.patient_package_usages (clinic_id, patient_id);

-- Valida vínculos tenant e regras de consumo antes de inserir
CREATE OR REPLACE FUNCTION public.fn_patient_package_usage_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c public.patient_package_contracts%ROWTYPE;
BEGIN
  SELECT * INTO c
    FROM public.patient_package_contracts
   WHERE id = NEW.patient_package_contract_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'patient_package_contract_id not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF c.clinic_id IS DISTINCT FROM NEW.clinic_id THEN
    RAISE EXCEPTION 'contract must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  IF c.status <> 'ativo' THEN
    RAISE EXCEPTION 'Contrato não está ativo para consumo'
      USING ERRCODE = 'check_violation';
  END IF;

  IF c.patient_id IS DISTINCT FROM NEW.patient_id THEN
    RAISE EXCEPTION 'patient_id must match contract patient'
      USING ERRCODE = 'check_violation';
  END IF;

  IF c.sessions_used + NEW.quantity > c.sessions_total THEN
    RAISE EXCEPTION 'Saldo de sessões insuficiente'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.professionals pr
    WHERE pr.id = NEW.professional_id AND pr.clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'professional_id must belong to the same clinic'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_patient_package_usage_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.patient_package_contracts
     SET sessions_used = sessions_used + NEW.quantity
   WHERE id = NEW.patient_package_contract_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_patient_package_usage_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c public.patient_package_contracts%ROWTYPE;
BEGIN
  IF OLD.status = 'reversed' THEN
    RAISE EXCEPTION 'Consumo estornado não pode ser alterado'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'reversed' AND OLD.status = 'active' THEN
    IF NEW.reversed_at IS NULL THEN
      RAISE EXCEPTION 'reversed_at is required when reversing usage'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO c
      FROM public.patient_package_contracts
     WHERE id = OLD.patient_package_contract_id
     FOR UPDATE;

    IF c.sessions_used - OLD.quantity < 0 THEN
      RAISE EXCEPTION 'Estorno resultaria em saldo negativo'
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.quantity := OLD.quantity;
    NEW.usage_date := OLD.usage_date;
    NEW.patient_id := OLD.patient_id;
    NEW.patient_package_contract_id := OLD.patient_package_contract_id;
    NEW.clinic_id := OLD.clinic_id;
    NEW.professional_id := OLD.professional_id;
    NEW.notes := OLD.notes;
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  ELSE
    RAISE EXCEPTION 'Only reversal (active → reversed) is allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_patient_package_usage_after_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'reversed' THEN
    UPDATE public.patient_package_contracts
       SET sessions_used = sessions_used - OLD.quantity
     WHERE id = OLD.patient_package_contract_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_patient_package_usage_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Consumos de pacote não podem ser excluídos'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_package_usage_before_insert ON public.patient_package_usages;
CREATE TRIGGER trg_patient_package_usage_before_insert
  BEFORE INSERT ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_package_usage_before_insert();

DROP TRIGGER IF EXISTS trg_patient_package_usage_after_insert ON public.patient_package_usages;
CREATE TRIGGER trg_patient_package_usage_after_insert
  AFTER INSERT ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_package_usage_after_insert();

DROP TRIGGER IF EXISTS trg_patient_package_usage_before_update ON public.patient_package_usages;
CREATE TRIGGER trg_patient_package_usage_before_update
  BEFORE UPDATE ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_package_usage_before_update();

DROP TRIGGER IF EXISTS trg_patient_package_usage_after_update ON public.patient_package_usages;
CREATE TRIGGER trg_patient_package_usage_after_update
  AFTER UPDATE ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_package_usage_after_update();

DROP TRIGGER IF EXISTS trg_patient_package_usage_block_delete ON public.patient_package_usages;
CREATE TRIGGER trg_patient_package_usage_block_delete
  BEFORE DELETE ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_patient_package_usage_block_delete();

-- Modo Suporte
DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.patient_package_usages;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.patient_package_usages;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.patient_package_usages;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.patient_package_usages
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

ALTER TABLE public.patient_package_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_ppkg_use_tenant_select ON public.patient_package_usages;
DROP POLICY IF EXISTS fin_ppkg_use_tenant_insert ON public.patient_package_usages;
DROP POLICY IF EXISTS fin_ppkg_use_tenant_update ON public.patient_package_usages;
DROP POLICY IF EXISTS fin_ppkg_use_tenant_delete ON public.patient_package_usages;

CREATE POLICY fin_ppkg_use_tenant_select ON public.patient_package_usages
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_ppkg_use_tenant_insert ON public.patient_package_usages
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_ppkg_use_tenant_update ON public.patient_package_usages
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_ppkg_use_tenant_delete ON public.patient_package_usages
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_package_usages TO authenticated;
GRANT ALL ON public.patient_package_usages TO service_role;
