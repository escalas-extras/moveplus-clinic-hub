
-- Tabela clinic_members
CREATE TABLE IF NOT EXISTS public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','admin','profissional','recepcao','financeiro')),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_members_user ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic ON public.clinic_members(clinic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;

ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_member_of(_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = auth.uid() AND clinic_id = _clinic_id AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in(_clinic_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = auth.uid() AND clinic_id = _clinic_id AND role = _role AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT clinic_id FROM public.clinic_members
  WHERE user_id = auth.uid() AND active = true
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;
$$;

-- Policies
DROP POLICY IF EXISTS "members read own clinic" ON public.clinic_members;
CREATE POLICY "members read own clinic" ON public.clinic_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_member_of(clinic_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "owners manage members" ON public.clinic_members;
CREATE POLICY "owners manage members" ON public.clinic_members
  FOR ALL TO authenticated
  USING (
    public.has_role_in(clinic_id, 'owner')
    OR public.has_role_in(clinic_id, 'admin')
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role_in(clinic_id, 'owner')
    OR public.has_role_in(clinic_id, 'admin')
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- clinic_id em clinic_settings
ALTER TABLE public.clinic_settings
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_settings_clinic ON public.clinic_settings(clinic_id) WHERE clinic_id IS NOT NULL;

-- FK clinical_documents.clinic_id
ALTER TABLE public.clinical_documents
  DROP CONSTRAINT IF EXISTS clinical_documents_clinic_id_fkey;
ALTER TABLE public.clinical_documents
  ADD CONSTRAINT clinical_documents_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;

-- Backfill Move+
DO $$
DECLARE
  v_settings RECORD;
  v_clinic_id uuid;
  v_user RECORD;
  v_role text;
BEGIN
  SELECT * INTO v_settings FROM public.clinic_settings LIMIT 1;
  IF v_settings IS NULL THEN
    RAISE NOTICE 'clinic_settings vazio — backfill pulado';
    RETURN;
  END IF;

  IF v_settings.clinic_id IS NOT NULL THEN
    v_clinic_id := v_settings.clinic_id;
  ELSE
    SELECT id INTO v_clinic_id FROM public.clinics
      WHERE nome = COALESCE(v_settings.nome_fantasia, 'Move+') LIMIT 1;
    IF v_clinic_id IS NULL THEN
      INSERT INTO public.clinics (nome, slug, settings_id, plan, active)
      VALUES (
        COALESCE(v_settings.nome_fantasia, 'Move+'),
        lower(regexp_replace(COALESCE(v_settings.nome_fantasia, 'moveplus'), '[^a-zA-Z0-9]+', '-', 'g')),
        v_settings.id,
        'enterprise',
        true
      )
      RETURNING id INTO v_clinic_id;
    END IF;
    UPDATE public.clinic_settings SET clinic_id = v_clinic_id WHERE id = v_settings.id;
  END IF;

  FOR v_user IN SELECT DISTINCT user_id, role FROM public.user_roles LOOP
    v_role := CASE v_user.role::text
      WHEN 'admin' THEN 'admin'
      WHEN 'super_admin' THEN 'owner'
      ELSE 'profissional'
    END;
    INSERT INTO public.clinic_members (clinic_id, user_id, role, is_default, active)
    VALUES (v_clinic_id, v_user.user_id, v_role, true, true)
    ON CONFLICT (clinic_id, user_id) DO NOTHING;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = v_clinic_id AND role = 'owner') THEN
    UPDATE public.clinic_members SET role = 'owner'
     WHERE id = (
       SELECT cm.id FROM public.clinic_members cm
       JOIN public.user_roles ur ON ur.user_id = cm.user_id AND ur.role = 'admin'
       WHERE cm.clinic_id = v_clinic_id
       ORDER BY cm.created_at ASC LIMIT 1
     );
  END IF;

  UPDATE public.clinical_documents SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
  UPDATE public.document_templates SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;

  RAISE NOTICE 'Backfill OK: clinic_id=%', v_clinic_id;
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_clinic_members_updated_at ON public.clinic_members;
CREATE TRIGGER update_clinic_members_updated_at
  BEFORE UPDATE ON public.clinic_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- validate_document_by_hash usando clinic do documento
CREATE OR REPLACE FUNCTION public.validate_document_by_hash(_hash text)
RETURNS TABLE(existe boolean, status text, doc_type text, title text, paciente_iniciais text, clinica_nome text, profissional_nome text, profissional_registro text, issued_at timestamptz, locked_at timestamptz, hash text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE,
    CASE WHEN d.locked_at IS NOT NULL THEN 'autentico' ELSE 'invalido' END,
    d.doc_type::text,
    d.title::text,
    regexp_replace(COALESCE(p.nome_completo, ''), '(\S)\S+\s*', '\1. ', 'g'),
    COALESCE(cs_by_doc.nome_fantasia, cs_any.nome_fantasia)::text,
    pr.nome::text,
    NULLIF(COALESCE(pr.conselho,'') || COALESCE('-' || pr.registro, ''), ''),
    d.issued_at,
    d.locked_at,
    d.validation_hash::text
  FROM public.clinical_documents d
  LEFT JOIN public.professionals pr ON pr.id = d.professional_id
  LEFT JOIN public.patients p ON p.id = d.patient_id
  LEFT JOIN public.clinic_settings cs_by_doc ON cs_by_doc.clinic_id = d.clinic_id
  LEFT JOIN LATERAL (SELECT nome_fantasia FROM public.clinic_settings LIMIT 1) cs_any ON TRUE
  WHERE d.validation_hash = _hash
    AND d.locked_at IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalido'::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::timestamptz, NULL::text;
  END IF;
END;
$$;

-- Promover o primeiro admin original a super_admin (para acesso ao admin SaaS)
DO $$
DECLARE v_first_admin uuid;
BEGIN
  SELECT user_id INTO v_first_admin FROM public.user_roles WHERE role = 'admin'
    ORDER BY created_at ASC NULLS LAST, user_id ASC LIMIT 1;
  IF v_first_admin IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_first_admin, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
