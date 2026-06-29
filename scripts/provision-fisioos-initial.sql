-- FisioOS SaaS - Provisionamento inicial seguro
-- Ambiente alvo: Supabase remoto qvvarkiczhhlooohhldl
--
-- IMPORTANTE:
-- - Este script NAO apaga dados.
-- - Este script NAO deve ser transformado em migration.
-- - Execute manualmente no SQL Editor do Supabase ou via CLI somente apos revisar.
-- - Idempotente: pode ser reexecutado sem duplicar profile, role, clinica, membro ou plano ativo.

BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_auth_count integer;
  v_plan_id uuid;
  v_plan_code text;
  v_settings_id uuid;
  v_clinic_id uuid;
  v_has_super_admin boolean;
  v_has_clinics_active boolean;
  v_has_clinics_status boolean;
  v_has_clinics_plan boolean;
  v_has_members_active boolean;
  v_has_members_default boolean;
  v_has_settings_clinic_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'super_admin'
  )
  INTO v_has_super_admin;

  IF NOT v_has_super_admin THEN
    RAISE EXCEPTION 'Enum public.app_role ainda nao possui o valor super_admin. Verifique migrations antes de provisionar.';
  END IF;

  SELECT count(*) INTO v_auth_count FROM auth.users;

  SELECT
    u.id,
    u.email,
    COALESCE(
      NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(u.raw_user_meta_data ->> 'name', ''),
      u.email,
      'Administrador FisioOS'
    )
  INTO v_user_id, v_user_email, v_user_name
  FROM auth.users u
  WHERE lower(u.email) = lower('fernandoservil@gmail.com')
  ORDER BY u.created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL AND v_auth_count = 1 THEN
    SELECT
      u.id,
      u.email,
      COALESCE(
        NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(u.raw_user_meta_data ->> 'name', ''),
        u.email,
        'Administrador FisioOS'
      )
    INTO v_user_id, v_user_email, v_user_name
    FROM auth.users u
    ORDER BY u.created_at ASC
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Nao foi possivel selecionar usuario Auth. Existe(m) % usuario(s); fernandoservil@gmail.com nao foi encontrado. Informe o usuario alvo antes de executar.',
      v_auth_count;
  END IF;

  SELECT p.id, p.code
  INTO v_plan_id, v_plan_code
  FROM public.plans p
  WHERE COALESCE(p.active, true) = true
  ORDER BY
    CASE
      WHEN p.code IN ('premium', 'professional', 'pro', 'standard') THEN 0
      ELSE 1
    END,
    p.sort_order NULLS LAST,
    p.created_at ASC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum plano ativo encontrado em public.plans. Provisionamento interrompido.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'active'
  ) INTO v_has_clinics_active;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'status'
  ) INTO v_has_clinics_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'plan'
  ) INTO v_has_clinics_plan;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_members' AND column_name = 'active'
  ) INTO v_has_members_active;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_members' AND column_name = 'is_default'
  ) INTO v_has_members_default;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_settings' AND column_name = 'clinic_id'
  ) INTO v_has_settings_clinic_id;

  INSERT INTO public.profiles (id, full_name, email, updated_at)
  VALUES (v_user_id, v_user_name, v_user_email, now())
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_has_settings_clinic_id THEN
    SELECT id INTO v_settings_id
    FROM public.clinic_settings
    WHERE clinic_id IS NULL
      AND lower(nome_fantasia) IN ('move+', 'move 60+', 'move plus', 'move60+', 'move 60')
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    SELECT id INTO v_settings_id
    FROM public.clinic_settings
    WHERE lower(nome_fantasia) IN ('move+', 'move 60+', 'move plus', 'move60+', 'move 60')
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_settings_id IS NULL THEN
    INSERT INTO public.clinic_settings (
      nome_fantasia,
      razao_social,
      cidade,
      estado,
      created_at,
      updated_at
    )
    VALUES (
      'MOVE+',
      'MOVE+',
      'Londrina',
      'PR',
      now(),
      now()
    )
    RETURNING id INTO v_settings_id;
  ELSE
    UPDATE public.clinic_settings
    SET nome_fantasia = COALESCE(NULLIF(nome_fantasia, ''), 'MOVE+'),
        razao_social = COALESCE(NULLIF(razao_social, ''), 'MOVE+'),
        updated_at = now()
    WHERE id = v_settings_id;
  END IF;

  SELECT id INTO v_clinic_id
  FROM public.clinics
  WHERE slug = 'move-60'
     OR lower(nome) IN ('move+', 'move 60+', 'move plus', 'move60+', 'move 60')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_clinic_id IS NULL THEN
    INSERT INTO public.clinics (nome, slug, settings_id, plan, active, status, created_at, updated_at)
    VALUES ('MOVE+', 'move-60', v_settings_id, v_plan_code, true, 'active', now(), now())
    RETURNING id INTO v_clinic_id;
  ELSE
    UPDATE public.clinics
    SET nome = 'MOVE+',
        slug = 'move-60',
        settings_id = COALESCE(settings_id, v_settings_id),
        updated_at = now()
    WHERE id = v_clinic_id;
  END IF;

  IF v_has_clinics_plan THEN
    UPDATE public.clinics
    SET plan = v_plan_code,
        updated_at = now()
    WHERE id = v_clinic_id;
  END IF;

  IF v_has_clinics_active THEN
    UPDATE public.clinics
    SET active = true,
        updated_at = now()
    WHERE id = v_clinic_id;
  END IF;

  IF v_has_clinics_status THEN
    UPDATE public.clinics
    SET status = 'active',
        updated_at = now()
    WHERE id = v_clinic_id;
  END IF;

  IF v_has_settings_clinic_id THEN
    UPDATE public.clinic_settings
    SET clinic_id = v_clinic_id,
        updated_at = now()
    WHERE id = v_settings_id
      AND (clinic_id IS NULL OR clinic_id = v_clinic_id);
  END IF;

  INSERT INTO public.clinic_members (
    clinic_id,
    user_id,
    role,
    is_default,
    active,
    created_at,
    updated_at
  )
  VALUES (
    v_clinic_id,
    v_user_id,
    'owner',
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (clinic_id, user_id) DO UPDATE
    SET role = 'owner',
        is_default = CASE WHEN v_has_members_default THEN true ELSE public.clinic_members.is_default END,
        active = CASE WHEN v_has_members_active THEN true ELSE public.clinic_members.active END,
        updated_at = now();

  IF v_has_members_default THEN
    UPDATE public.clinic_members
    SET is_default = false,
        updated_at = now()
    WHERE user_id = v_user_id
      AND clinic_id <> v_clinic_id
      AND is_default = true;

    UPDATE public.clinic_members
    SET is_default = true,
        updated_at = now()
    WHERE user_id = v_user_id
      AND clinic_id = v_clinic_id;
  END IF;

  UPDATE public.clinic_plans
  SET status = 'canceled',
      canceled_at = COALESCE(canceled_at, now()),
      updated_at = now()
  WHERE clinic_id = v_clinic_id
    AND status IN ('active', 'trial')
    AND plan_id <> v_plan_id;

  INSERT INTO public.clinic_plans (
    clinic_id,
    plan_id,
    status,
    started_at,
    trial_ends_at,
    notes,
    created_at,
    updated_at
  )
  SELECT
    v_clinic_id,
    v_plan_id,
    'active',
    now(),
    NULL,
    'Provisionamento inicial FisioOS',
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.clinic_plans cp
    WHERE cp.clinic_id = v_clinic_id
      AND cp.status IN ('active', 'trial')
  );

  RAISE NOTICE 'Provisionamento inicial preparado/aplicado na transacao: user_id=%, email=%, clinic_id=%, plan_code=%',
    v_user_id, v_user_email, v_clinic_id, v_plan_code;
END $$;

COMMIT;

-- Checklist de validacao pos-execucao:
--
-- 1. Profile criado/atualizado
-- SELECT id, full_name, email FROM public.profiles WHERE lower(email) = lower('fernandoservil@gmail.com');
--
-- 2. super_admin criado
-- SELECT ur.user_id, ur.role FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE lower(p.email) = lower('fernandoservil@gmail.com');
--
-- 3. Clinica MOVE+ criada/ativa
-- SELECT id, nome, slug, status, active, plan FROM public.clinics WHERE slug = 'move-60';
--
-- 4. Membro owner/default criado
-- SELECT cm.* FROM public.clinic_members cm JOIN public.clinics c ON c.id = cm.clinic_id WHERE c.slug = 'move-60';
--
-- 5. Plano ativo criado
-- SELECT cp.*, p.code, p.name FROM public.clinic_plans cp JOIN public.plans p ON p.id = cp.plan_id JOIN public.clinics c ON c.id = cp.clinic_id WHERE c.slug = 'move-60';
--
-- 6. Login esperado
-- - super_admin fora do modo suporte deve redirecionar para /app/admin-saas.
-- - modo suporte pode acessar a area clinica.
-- - area clinica deve liberar acesso para o membro owner/default da MOVE+.
