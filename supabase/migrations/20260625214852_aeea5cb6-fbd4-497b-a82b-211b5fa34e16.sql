CREATE OR REPLACE FUNCTION public.provision_clinic(_nome text, _plan_code text DEFAULT 'starter'::text, _owner_user_id uuid DEFAULT NULL::uuid, _nome_fantasia text DEFAULT NULL::text, _cidade text DEFAULT NULL::text, _estado text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
  v_plan_id uuid;
  v_settings_id uuid;
  v_clinic_id uuid;
  v_has_default boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito a super_admin';
  END IF;

  SELECT id INTO v_plan_id FROM public.plans WHERE code = _plan_code AND active = true;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Plano % inexistente ou inativo', _plan_code; END IF;

  v_slug := public.generate_clinic_slug(_nome);

  INSERT INTO public.clinic_settings (nome_fantasia, cidade, estado)
  VALUES (COALESCE(NULLIF(_nome_fantasia,''), _nome), _cidade, _estado)
  RETURNING id INTO v_settings_id;

  INSERT INTO public.clinics (nome, slug, plan, settings_id, active, status)
  VALUES (_nome, v_slug, _plan_code, v_settings_id, true, 'active')
  RETURNING id INTO v_clinic_id;

  UPDATE public.clinic_settings SET clinic_id = v_clinic_id WHERE id = v_settings_id;

  INSERT INTO public.clinic_plans (clinic_id, plan_id, status)
  VALUES (v_clinic_id, v_plan_id, 'active');

  IF _owner_user_id IS NOT NULL THEN
    -- se o usuário ainda não possui clínica padrão, esta vira a padrão
    SELECT EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE user_id = _owner_user_id AND active = true AND is_default = true
    ) INTO v_has_default;

    INSERT INTO public.clinic_members (clinic_id, user_id, role, is_default, active)
    VALUES (v_clinic_id, _owner_user_id, 'owner', NOT v_has_default, true)
    ON CONFLICT (clinic_id, user_id) DO UPDATE
      SET role = 'owner',
          active = true,
          is_default = EXCLUDED.is_default OR public.clinic_members.is_default;
  END IF;

  PERFORM public.seed_default_document_templates(v_clinic_id);

  RETURN v_clinic_id;
END
$function$;