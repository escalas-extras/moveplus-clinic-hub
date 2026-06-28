-- Flag de clínica de teste (sem apagar dados; filtro Admin SaaS).
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clinics_is_test ON public.clinics (is_test) WHERE is_test = true;

COMMENT ON COLUMN public.clinics.is_test IS 'Clínica sandbox/teste — excluída de métricas de produção no Admin SaaS.';

-- Bloquear acesso operacional a clínicas de teste (dados preservados).
CREATE OR REPLACE FUNCTION public.clinic_has_operational_access(_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_status text;
  v_is_test boolean;
  v_plan_status text;
  v_trial_ends timestamptz;
BEGIN
  SELECT c.status, COALESCE(c.is_test, false)
  INTO v_clinic_status, v_is_test
  FROM public.clinics c
  WHERE c.id = _clinic_id;

  IF v_is_test THEN
    RETURN false;
  END IF;

  IF v_clinic_status IS NULL OR v_clinic_status IN ('deleted', 'inactive', 'suspended', 'canceled') THEN
    RETURN false;
  END IF;

  SELECT cp.status, cp.trial_ends_at
  INTO v_plan_status, v_trial_ends
  FROM public.clinic_plans cp
  WHERE cp.clinic_id = _clinic_id
    AND cp.status IN ('active', 'trial')
  ORDER BY cp.created_at DESC
  LIMIT 1;

  IF v_plan_status IS NULL THEN
    RETURN false;
  END IF;

  IF v_plan_status = 'trial' AND v_trial_ends IS NOT NULL AND v_trial_ends <= now() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
