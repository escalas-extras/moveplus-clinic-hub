
-- ============================================================
-- BLOCO II — Entrega 1: Fundação de dados SaaS (v2)
-- ============================================================

-- 1) Ajustes em clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','suspended'));

UPDATE public.clinics SET status = CASE WHEN active THEN 'active' ELSE 'inactive' END;

CREATE OR REPLACE FUNCTION public.fn_sync_clinic_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.active := (NEW.status = 'active');
  ELSIF TG_OP='UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.active := (NEW.status = 'active');
    ELSIF NEW.active IS DISTINCT FROM OLD.active THEN
      NEW.status := CASE WHEN NEW.active THEN 'active' ELSE 'inactive' END;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_clinic_status ON public.clinics;
CREATE TRIGGER trg_sync_clinic_status
  BEFORE INSERT OR UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_clinic_status();

CREATE UNIQUE INDEX IF NOT EXISTS clinics_slug_uniq ON public.clinics(slug) WHERE slug IS NOT NULL;

-- 2) plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  max_users integer,
  max_patients integer,
  max_documents_month integer,
  max_storage_mb integer,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans readable by authenticated"
  ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans writable by super_admin"
  ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) clinic_plans
CREATE TABLE IF NOT EXISTS public.clinic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trial','suspended','canceled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS clinic_plans_one_active
  ON public.clinic_plans(clinic_id) WHERE status IN ('active','trial');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_plans TO authenticated;
GRANT ALL ON public.clinic_plans TO service_role;
ALTER TABLE public.clinic_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_plans super_admin all"
  ON public.clinic_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "clinic_plans member read own"
  ON public.clinic_plans FOR SELECT TO authenticated
  USING (public.is_member_of(clinic_id));

DROP TRIGGER IF EXISTS trg_clinic_plans_updated_at ON public.clinic_plans;
CREATE TRIGGER trg_clinic_plans_updated_at BEFORE UPDATE ON public.clinic_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) support_sessions
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_sessions TO authenticated;
GRANT ALL ON public.support_sessions TO service_role;
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_sessions super_admin all"
  ON public.support_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS support_sessions_clinic_idx ON public.support_sessions(clinic_id, started_at DESC);
CREATE INDEX IF NOT EXISTS support_sessions_admin_idx ON public.support_sessions(super_admin_id, started_at DESC);

-- 5) View clinic_usage (sem professionals.clinic_id que não existe)
CREATE OR REPLACE VIEW public.clinic_usage WITH (security_invoker = true) AS
SELECT
  c.id AS clinic_id,
  c.nome,
  c.slug,
  c.status,
  c.plan,
  COALESCE((SELECT count(*) FROM public.clinic_members cm WHERE cm.clinic_id = c.id AND cm.active = true), 0)::int AS user_count,
  COALESCE((SELECT count(*) FROM public.clinical_documents d WHERE d.clinic_id = c.id), 0)::int AS document_count,
  COALESCE((SELECT count(*) FROM public.clinical_documents d WHERE d.clinic_id = c.id AND d.created_at >= date_trunc('month', now())), 0)::int AS documents_this_month,
  c.created_at
FROM public.clinics c;

GRANT SELECT ON public.clinic_usage TO authenticated;

-- 6) generate_clinic_slug
CREATE OR REPLACE FUNCTION public.generate_clinic_slug(_name text)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE base text; candidate text; n integer := 1;
BEGIN
  base := lower(translate(_name,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' THEN base := 'clinica'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = candidate) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END $$;

-- 7) provision_clinic
CREATE OR REPLACE FUNCTION public.provision_clinic(
  _nome text,
  _plan_code text DEFAULT 'starter',
  _owner_user_id uuid DEFAULT NULL,
  _nome_fantasia text DEFAULT NULL,
  _cidade text DEFAULT NULL,
  _estado text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slug text; v_plan_id uuid; v_settings_id uuid; v_clinic_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito a super_admin';
  END IF;
  SELECT id INTO v_plan_id FROM public.plans WHERE code = _plan_code AND active = true;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Plano % inexistente ou inativo', _plan_code; END IF;

  v_slug := public.generate_clinic_slug(_nome);

  INSERT INTO public.clinic_settings (nome_fantasia, cidade, estado)
  VALUES (COALESCE(_nome_fantasia,_nome), _cidade, _estado)
  RETURNING id INTO v_settings_id;

  INSERT INTO public.clinics (nome, slug, plan, settings_id, active, status)
  VALUES (_nome, v_slug, _plan_code, v_settings_id, true, 'active')
  RETURNING id INTO v_clinic_id;

  UPDATE public.clinic_settings SET clinic_id = v_clinic_id WHERE id = v_settings_id;

  INSERT INTO public.clinic_plans (clinic_id, plan_id, status)
  VALUES (v_clinic_id, v_plan_id, 'active');

  IF _owner_user_id IS NOT NULL THEN
    INSERT INTO public.clinic_members (clinic_id, user_id, role, is_default, active)
    VALUES (v_clinic_id, _owner_user_id, 'owner', false, true)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN v_clinic_id;
END $$;

-- 8) Seeds
INSERT INTO public.plans (code, name, description, price_cents, max_users, max_patients, max_documents_month, max_storage_mb, modules, sort_order)
VALUES
  ('starter','Starter','Para profissionais autônomos iniciando',9900,2,100,100,1024,'["pacientes","avaliacoes","documentos"]'::jsonb,1),
  ('professional','Professional','Para clínicas pequenas com 1 a 5 profissionais',19900,5,500,500,5120,'["pacientes","avaliacoes","documentos","biblioteca","agenda"]'::jsonb,2),
  ('clinic','Clinic','Para clínicas médias com múltiplos profissionais',39900,15,2000,2000,20480,'["pacientes","avaliacoes","documentos","biblioteca","agenda","financeiro","relatorios"]'::jsonb,3),
  ('enterprise','Enterprise','Para redes e operações de grande porte',99900,NULL,NULL,NULL,NULL,'["pacientes","avaliacoes","documentos","biblioteca","agenda","financeiro","relatorios","marketing","home_care","multi_unidade"]'::jsonb,4)
ON CONFLICT (code) DO NOTHING;

-- 9) Backfill clinic_plans
INSERT INTO public.clinic_plans (clinic_id, plan_id, status, started_at)
SELECT c.id, p.id, 'active', c.created_at
FROM public.clinics c
JOIN public.plans p ON p.code = COALESCE(c.plan,'professional')
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinic_plans cp WHERE cp.clinic_id = c.id AND cp.status IN ('active','trial')
);
