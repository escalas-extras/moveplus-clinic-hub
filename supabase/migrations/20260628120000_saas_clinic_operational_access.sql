-- SaaS mínimo: gate operacional de acesso por status da clínica/plano (sem apagar dados).

CREATE OR REPLACE FUNCTION public.clinic_has_operational_access(_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_status text;
  v_plan_status text;
  v_trial_ends timestamptz;
BEGIN
  SELECT c.status INTO v_clinic_status
  FROM public.clinics c
  WHERE c.id = _clinic_id;

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

CREATE OR REPLACE FUNCTION public.can_access_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_clinic uuid;
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.clinics WHERE id = _clinic_id;
  IF v_status = 'deleted' THEN
    RETURN false;
  END IF;

  v_support_clinic := public.current_support_session_clinic();
  IF v_support_clinic IS NOT NULL THEN
    RETURN _clinic_id = v_support_clinic;
  END IF;

  IF NOT public.clinic_has_operational_access(_clinic_id) THEN
    RETURN false;
  END IF;

  RETURN public.is_member_of(_clinic_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clinic_has_operational_access(uuid) TO authenticated;
