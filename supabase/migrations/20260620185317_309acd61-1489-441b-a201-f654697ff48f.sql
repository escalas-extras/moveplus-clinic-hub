
CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE,
  settings_id uuid REFERENCES public.clinic_settings(id) ON DELETE SET NULL,
  plan text DEFAULT 'standard',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinics_select ON public.clinics;
CREATE POLICY clinics_select ON public.clinics FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS clinics_admin ON public.clinics;
CREATE POLICY clinics_admin ON public.clinics FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('avaliacao_inicial','reavaliacao','evolucao','relatorio','alta','encaminhamento','parecer')),
  name text NOT NULL,
  description text,
  version integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_tags text[] DEFAULT ARRAY[]::text[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON public.document_templates(doc_type, is_active);
GRANT SELECT ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS doc_templates_read ON public.document_templates;
CREATE POLICY doc_templates_read ON public.document_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS doc_templates_admin ON public.document_templates;
CREATE POLICY doc_templates_admin ON public.document_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_doc_templates_updated ON public.document_templates;
CREATE TRIGGER trg_doc_templates_updated BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_templates_default
  ON public.document_templates(doc_type, COALESCE(clinic_id::text,'_global'))
  WHERE is_default = true AND is_active = true;

CREATE TABLE IF NOT EXISTS public.merge_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  example text,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merge_tags TO authenticated;
GRANT ALL ON public.merge_tags TO service_role;
ALTER TABLE public.merge_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merge_tags_read ON public.merge_tags;
CREATE POLICY merge_tags_read ON public.merge_tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS merge_tags_admin ON public.merge_tags;
CREATE POLICY merge_tags_admin ON public.merge_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.merge_tags(tag, category, description, example, is_sensitive) VALUES
  ('paciente_nome','Paciente','Nome completo','João Silva',false),
  ('paciente_idade','Paciente','Idade','72 anos',false),
  ('paciente_sexo','Paciente','Sexo','Masculino',false),
  ('paciente_cpf','Paciente','CPF','***',true),
  ('paciente_data_nascimento','Paciente','Data de nascimento','01/01/1953',false),
  ('paciente_endereco','Paciente','Endereço','Rua X, 100',true),
  ('diagnostico','Clínico','Diagnóstico clínico','AVC',false),
  ('diagnostico_fisio','Clínico','Diagnóstico fisioterapêutico','Hemiparesia D',false),
  ('queixa_principal','Clínico','Queixa principal','...',false),
  ('hma','Clínico','HMA','...',false),
  ('profissional_nome','Profissional','Nome do fisioterapeuta','Dra. Maria',false),
  ('profissional_crefito','Profissional','CREFITO','CREFITO-3/12345-F',false),
  ('data_atual','Sistema','Data atual','20/06/2026',false),
  ('data_avaliacao','Avaliação','Data da avaliação','15/06/2026',false),
  ('escala_barthel','Escalas','Barthel','75/100',false),
  ('escala_katz','Escalas','Katz','5/6',false),
  ('escala_berg','Escalas','Berg','42/56',false),
  ('escala_tinetti','Escalas','Tinetti','22/28',false),
  ('escala_braden','Escalas','Braden','18',false),
  ('objetivos','Plano','Objetivos','...',false),
  ('condutas','Plano','Condutas','...',false),
  ('proxima_reavaliacao','Plano','Próxima reavaliação','20/09/2026',false),
  ('clinica_nome','Clínica','Nome da clínica','Move+',false),
  ('clinica_endereco','Clínica','Endereço','...',false),
  ('clinica_telefone','Clínica','Telefone','(11) 99999-9999',false)
ON CONFLICT (tag) DO NOTHING;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS reassessment_interval_days integer DEFAULT 90;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS reassessment_notify boolean DEFAULT true;
ALTER TABLE public.catalog_diagnoses ADD COLUMN IF NOT EXISTS default_reassessment_days integer DEFAULT 90;

ALTER TABLE public.clinical_signatures ADD COLUMN IF NOT EXISTS signature_order integer DEFAULT 1;
ALTER TABLE public.clinical_signatures ADD COLUMN IF NOT EXISTS device_info text;

ALTER TABLE public.clinical_documents ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL;
ALTER TABLE public.clinical_documents ADD COLUMN IF NOT EXISTS template_version integer;
ALTER TABLE public.clinical_documents ADD COLUMN IF NOT EXISTS rendered_html text;
ALTER TABLE public.clinical_documents ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.clinical_documents ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.fn_set_validation_hash()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.validation_hash IS NULL OR NEW.validation_hash = '' THEN
    NEW.validation_hash := encode(gen_random_bytes(24),'hex');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_clin_doc_hash ON public.clinical_documents;
CREATE TRIGGER trg_clin_doc_hash BEFORE INSERT ON public.clinical_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_validation_hash();

CREATE OR REPLACE VIEW public.v_document_validation AS
SELECT
  d.validation_hash,
  d.doc_type,
  d.title,
  d.issued_at,
  d.locked_at,
  CASE WHEN d.locked_at IS NOT NULL THEN 'autentico' ELSE 'rascunho' END as status,
  pr.nome as profissional_nome,
  COALESCE(pr.conselho,'') || COALESCE('-' || pr.registro,'') as profissional_registro,
  regexp_replace(COALESCE(p.nome_completo,''), '(\S)\S+\s*', '\1. ', 'g') as paciente_iniciais,
  c.nome_fantasia as clinica_nome
FROM public.clinical_documents d
LEFT JOIN public.professionals pr ON pr.id = d.professional_id
LEFT JOIN public.patients p ON p.id = d.patient_id
LEFT JOIN public.clinic_settings c ON true
WHERE d.locked_at IS NOT NULL;

GRANT SELECT ON public.v_document_validation TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_schedule_reassessment()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_interval integer;
BEGIN
  IF NEW.tipo = 'avaliacao' AND NEW.status = 'finalizada' THEN
    SELECT COALESCE(reassessment_interval_days, 90) INTO v_interval
    FROM public.patients WHERE id = NEW.patient_id;

    UPDATE public.assessments SET next_reassessment_date = (NEW.data + (v_interval || ' days')::interval)::date
    WHERE id = NEW.id;

    INSERT INTO public.reassessment_schedule(patient_id, base_assessment_id, scheduled_for, interval_days, created_by)
    VALUES (NEW.patient_id, NEW.id, (NEW.data + (v_interval || ' days')::interval)::date, v_interval, NEW.created_by);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_assessment_reassessment ON public.assessments;
CREATE TRIGGER trg_assessment_reassessment AFTER INSERT OR UPDATE OF status ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.fn_schedule_reassessment();
