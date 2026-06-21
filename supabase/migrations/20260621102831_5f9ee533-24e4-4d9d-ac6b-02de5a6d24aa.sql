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

  -- super_admin só acessa dados clínicos quando há sessão de suporte ativa para a clínica
  IF v_support_clinic IS NOT NULL THEN
    RETURN _clinic_id = v_support_clinic;
  END IF;

  -- Sem sessão de suporte: apenas membros da própria clínica
  RETURN public.is_member_of(_clinic_id);
END;
$$;