CREATE OR REPLACE FUNCTION public.can_access_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_support_clinic uuid;
BEGIN
  v_support_clinic := public.current_support_session_clinic();

  IF v_support_clinic IS NOT NULL THEN
    RETURN _clinic_id = v_support_clinic;
  END IF;

  RETURN public.has_role(auth.uid(), 'super_admin')
      OR public.is_member_of(_clinic_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_support_clinic uuid;
BEGIN
  v_support_clinic := public.current_support_session_clinic();

  IF v_support_clinic IS NOT NULL THEN
    RETURN false;
  END IF;

  RETURN public.has_role(auth.uid(), 'super_admin')
      OR public.has_role_in(_clinic_id, 'owner')
      OR public.has_role_in(_clinic_id, 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = _patient_id
      AND public.can_access_clinic(p.clinic_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_plan_feature(_feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clinic uuid;
  v_modules jsonb;
BEGIN
  v_clinic := COALESCE(public.current_support_session_clinic(), public.current_clinic_id());

  IF v_clinic IS NULL THEN
    IF public.has_role(auth.uid(), 'super_admin') THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  SELECT p.modules INTO v_modules
  FROM public.clinic_plans cp
  JOIN public.plans p ON p.id = cp.plan_id
  WHERE cp.clinic_id = v_clinic AND cp.status IN ('active', 'trial')
  ORDER BY cp.started_at DESC
  LIMIT 1;

  IF v_modules IS NULL THEN RETURN false; END IF;
  RETURN v_modules ? _feature;
END;
$$;