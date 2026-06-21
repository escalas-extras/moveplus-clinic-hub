
-- 1) Translate plan names
UPDATE public.plans SET name='Inicial'      WHERE code='starter';
UPDATE public.plans SET name='Profissional' WHERE code='professional';
UPDATE public.plans SET name='Clínica'      WHERE code='clinic';
UPDATE public.plans SET name='Empresarial'  WHERE code='enterprise';

-- 2) has_plan_feature(feature) — checks current clinic's plan modules
CREATE OR REPLACE FUNCTION public.has_plan_feature(_feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_clinic uuid; v_modules jsonb;
BEGIN
  -- super_admin sem clínica: acesso total (modo plataforma)
  IF public.has_role(auth.uid(),'super_admin') THEN
    RETURN true;
  END IF;
  v_clinic := public.current_clinic_id();
  IF v_clinic IS NULL THEN RETURN false; END IF;

  SELECT p.modules INTO v_modules
  FROM public.clinic_plans cp
  JOIN public.plans p ON p.id = cp.plan_id
  WHERE cp.clinic_id = v_clinic AND cp.status IN ('active','trial')
  ORDER BY cp.started_at DESC LIMIT 1;

  IF v_modules IS NULL THEN RETURN false; END IF;
  RETURN v_modules ? _feature;
END $$;

GRANT EXECUTE ON FUNCTION public.has_plan_feature(text) TO authenticated;

-- 3) Current plan limits (per current clinic)
CREATE OR REPLACE FUNCTION public.current_plan_limits()
RETURNS TABLE(max_users int, max_patients int, max_documents_month int, max_storage_mb int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_clinic uuid;
BEGIN
  v_clinic := public.current_clinic_id();
  IF v_clinic IS NULL THEN
    RETURN QUERY SELECT NULL::int, NULL::int, NULL::int, NULL::int;
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.max_users, p.max_patients, p.max_documents_month, p.max_storage_mb
  FROM public.clinic_plans cp
  JOIN public.plans p ON p.id = cp.plan_id
  WHERE cp.clinic_id = v_clinic AND cp.status IN ('active','trial')
  ORDER BY cp.started_at DESC LIMIT 1;
END $$;

GRANT EXECUTE ON FUNCTION public.current_plan_limits() TO authenticated;

-- 4) Trigger: limite de pacientes
CREATE OR REPLACE FUNCTION public.fn_enforce_patient_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_clinic uuid; v_max int; v_count int;
BEGIN
  IF public.has_role(auth.uid(),'super_admin') THEN RETURN NEW; END IF;
  v_clinic := public.current_clinic_id();
  IF v_clinic IS NULL THEN RETURN NEW; END IF;

  SELECT p.max_patients INTO v_max
  FROM public.clinic_plans cp JOIN public.plans p ON p.id=cp.plan_id
  WHERE cp.clinic_id=v_clinic AND cp.status IN ('active','trial')
  ORDER BY cp.started_at DESC LIMIT 1;

  IF v_max IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_count
  FROM public.patients pa
  WHERE pa.created_by IN (
    SELECT user_id FROM public.clinic_members
    WHERE clinic_id=v_clinic AND active=true
  );

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Seu plano atingiu o limite contratado de pacientes (% / %). Entre em contato para ampliar sua capacidade.', v_count, v_max
      USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_patient_limit ON public.patients;
CREATE TRIGGER trg_enforce_patient_limit
  BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_patient_limit();

-- 5) Trigger: limite de documentos no mês
CREATE OR REPLACE FUNCTION public.fn_enforce_document_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_clinic uuid; v_max int; v_count int;
BEGIN
  IF public.has_role(auth.uid(),'super_admin') THEN RETURN NEW; END IF;
  v_clinic := COALESCE(NEW.clinic_id, public.current_clinic_id());
  IF v_clinic IS NULL THEN RETURN NEW; END IF;

  SELECT p.max_documents_month INTO v_max
  FROM public.clinic_plans cp JOIN public.plans p ON p.id=cp.plan_id
  WHERE cp.clinic_id=v_clinic AND cp.status IN ('active','trial')
  ORDER BY cp.started_at DESC LIMIT 1;

  IF v_max IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_count
  FROM public.clinical_documents
  WHERE clinic_id=v_clinic
    AND created_at >= date_trunc('month', now());

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Seu plano atingiu o limite contratado de documentos no mês (% / %). Entre em contato para ampliar sua capacidade.', v_count, v_max
      USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_document_limit ON public.clinical_documents;
CREATE TRIGGER trg_enforce_document_limit
  BEFORE INSERT ON public.clinical_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_document_limit();

-- 6) Trigger: limite de usuários ativos por clínica
CREATE OR REPLACE FUNCTION public.fn_enforce_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_max int; v_count int;
BEGIN
  IF public.has_role(auth.uid(),'super_admin') THEN RETURN NEW; END IF;
  IF NEW.clinic_id IS NULL OR NEW.active IS NOT TRUE THEN RETURN NEW; END IF;

  SELECT p.max_users INTO v_max
  FROM public.clinic_plans cp JOIN public.plans p ON p.id=cp.plan_id
  WHERE cp.clinic_id=NEW.clinic_id AND cp.status IN ('active','trial')
  ORDER BY cp.started_at DESC LIMIT 1;

  IF v_max IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_count
  FROM public.clinic_members
  WHERE clinic_id=NEW.clinic_id AND active=true;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Seu plano atingiu o limite contratado de usuários (% / %). Entre em contato para ampliar sua capacidade.', v_count, v_max
      USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_user_limit ON public.clinic_members;
CREATE TRIGGER trg_enforce_user_limit
  BEFORE INSERT ON public.clinic_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_user_limit();

-- 7) saas_audit_log
CREATE TABLE IF NOT EXISTS public.saas_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb
);

GRANT SELECT ON public.saas_audit_log TO authenticated;
GRANT ALL ON public.saas_audit_log TO service_role;

ALTER TABLE public.saas_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='saas_audit_log' AND policyname='super_admin reads saas audit') THEN
    CREATE POLICY "super_admin reads saas audit"
      ON public.saas_audit_log FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'super_admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_saas_audit_created ON public.saas_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_audit_entity ON public.saas_audit_log(entity_type, entity_id);
