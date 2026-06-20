
-- ENUMS
DO $$ BEGIN CREATE TYPE public.scale_type AS ENUM ('barthel','katz','berg','tinetti','braden'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.goal_term AS ENUM ('curto','medio','longo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.goal_status AS ENUM ('pendente','em_andamento','atingido','nao_atingido','cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.document_type AS ENUM ('avaliacao_inicial','reavaliacao','evolucao','relatorio','alta','encaminhamento','parecer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.signer_role AS ENUM ('paciente','responsavel','profissional'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.risk_level AS ENUM ('baixo','moderado','alto','muito_alto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: patient ownership
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND p.created_by = auth.uid())
$$;

-- 1) Scales
CREATE TABLE IF NOT EXISTS public.assessment_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scale_type public.scale_type NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric, classification text, risk_level public.risk_level, notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_scales TO authenticated;
GRANT ALL ON public.assessment_scales TO service_role;
ALTER TABLE public.assessment_scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scales_select" ON public.assessment_scales FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "scales_insert" ON public.assessment_scales FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "scales_update" ON public.assessment_scales FOR UPDATE TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "scales_delete" ON public.assessment_scales FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scales_updated BEFORE UPDATE ON public.assessment_scales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_scales_patient ON public.assessment_scales(patient_id, scale_type, applied_at DESC);

-- 2) MRC
CREATE TABLE IF NOT EXISTS public.assessment_mrc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_right numeric, total_left numeric, classification text, notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_mrc TO authenticated;
GRANT ALL ON public.assessment_mrc TO service_role;
ALTER TABLE public.assessment_mrc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mrc_select" ON public.assessment_mrc FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "mrc_insert" ON public.assessment_mrc FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "mrc_update" ON public.assessment_mrc FOR UPDATE TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "mrc_delete" ON public.assessment_mrc FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mrc_updated BEFORE UPDATE ON public.assessment_mrc FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_mrc_patient ON public.assessment_mrc(patient_id, applied_at DESC);

-- 3) Goniometry
CREATE TABLE IF NOT EXISTS public.assessment_goniometry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb, notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_goniometry TO authenticated;
GRANT ALL ON public.assessment_goniometry TO service_role;
ALTER TABLE public.assessment_goniometry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gonio_select" ON public.assessment_goniometry FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "gonio_insert" ON public.assessment_goniometry FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "gonio_update" ON public.assessment_goniometry FOR UPDATE TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "gonio_delete" ON public.assessment_goniometry FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_gonio_updated BEFORE UPDATE ON public.assessment_goniometry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_gonio_patient ON public.assessment_goniometry(patient_id, applied_at DESC);

-- 4) Normative ROM
CREATE TABLE IF NOT EXISTS public.normative_rom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL, movement_key text NOT NULL, movement_label text NOT NULL,
  normal_min numeric NOT NULL, normal_max numeric NOT NULL,
  unit text NOT NULL DEFAULT 'graus', display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true, UNIQUE(region, movement_key)
);
GRANT SELECT ON public.normative_rom TO authenticated, anon;
GRANT ALL ON public.normative_rom TO service_role;
ALTER TABLE public.normative_rom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rom_read_all" ON public.normative_rom FOR SELECT USING (true);
CREATE POLICY "rom_admin_write" ON public.normative_rom FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Goals
CREATE TABLE IF NOT EXISTS public.assessment_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  term public.goal_term NOT NULL, description text NOT NULL, target_date date,
  status public.goal_status NOT NULL DEFAULT 'pendente',
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  achieved_at timestamptz, notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_goals TO authenticated;
GRANT ALL ON public.assessment_goals TO service_role;
ALTER TABLE public.assessment_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_select" ON public.assessment_goals FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "goals_insert" ON public.assessment_goals FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "goals_update" ON public.assessment_goals FOR UPDATE TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "goals_delete" ON public.assessment_goals FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.assessment_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_goals_patient ON public.assessment_goals(patient_id, status);

-- 6) Reassessment
CREATE TABLE IF NOT EXISTS public.reassessment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  base_assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  scheduled_for date NOT NULL, interval_days int NOT NULL DEFAULT 30,
  completed_at timestamptz, reminder_sent boolean NOT NULL DEFAULT false, notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reassessment_schedule TO authenticated;
GRANT ALL ON public.reassessment_schedule TO service_role;
ALTER TABLE public.reassessment_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reass_select" ON public.reassessment_schedule FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "reass_insert" ON public.reassessment_schedule FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "reass_update" ON public.reassessment_schedule FOR UPDATE TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "reass_delete" ON public.reassessment_schedule FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_reass_updated BEFORE UPDATE ON public.reassessment_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_reass_patient ON public.reassessment_schedule(patient_id, scheduled_for);

-- 7) Clinical Documents
CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  doc_type public.document_type NOT NULL, title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb, body_text text,
  validation_hash text UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  professional_id uuid REFERENCES public.professionals(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_documents TO authenticated;
GRANT ALL ON public.clinical_documents TO service_role;
GRANT SELECT ON public.clinical_documents TO anon;
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_select_owner" ON public.clinical_documents FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "docs_public_validate" ON public.clinical_documents FOR SELECT TO anon USING (validation_hash IS NOT NULL AND locked_at IS NOT NULL);
CREATE POLICY "docs_insert" ON public.clinical_documents FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "docs_update" ON public.clinical_documents FOR UPDATE TO authenticated USING (public.can_access_patient(patient_id) AND locked_at IS NULL);
CREATE POLICY "docs_delete" ON public.clinical_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.clinical_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_docs_patient ON public.clinical_documents(patient_id, doc_type, issued_at DESC);

-- 8) Signatures
CREATE TABLE IF NOT EXISTS public.clinical_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.clinical_documents(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  signer_role public.signer_role NOT NULL, signer_name text NOT NULL,
  signer_document text, signature_png text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.clinical_signatures TO authenticated;
GRANT ALL ON public.clinical_signatures TO service_role;
ALTER TABLE public.clinical_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sig_select" ON public.clinical_signatures FOR SELECT TO authenticated USING (public.can_access_patient(patient_id));
CREATE POLICY "sig_insert" ON public.clinical_signatures FOR INSERT TO authenticated WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "sig_delete" ON public.clinical_signatures FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_sig_doc ON public.clinical_signatures(document_id);
CREATE INDEX idx_sig_assessment ON public.clinical_signatures(assessment_id);

-- 9) Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL, record_id uuid, action text NOT NULL,
  user_id uuid, old_data jsonb, new_data jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit_insert_any" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_audit_table ON public.audit_log(table_name, record_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := (to_jsonb(OLD)->>'id')::uuid;
    INSERT INTO public.audit_log(table_name, record_id, action, user_id, old_data)
    VALUES (TG_TABLE_NAME, rec_id, TG_OP, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    rec_id := (to_jsonb(NEW)->>'id')::uuid;
    INSERT INTO public.audit_log(table_name, record_id, action, user_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, rec_id, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    rec_id := (to_jsonb(NEW)->>'id')::uuid;
    INSERT INTO public.audit_log(table_name, record_id, action, user_id, new_data)
    VALUES (TG_TABLE_NAME, rec_id, TG_OP, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER aud_assessments AFTER INSERT OR UPDATE OR DELETE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_scales AFTER INSERT OR UPDATE OR DELETE ON public.assessment_scales FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_mrc AFTER INSERT OR UPDATE OR DELETE ON public.assessment_mrc FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_gonio AFTER INSERT OR UPDATE OR DELETE ON public.assessment_goniometry FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_goals AFTER INSERT OR UPDATE OR DELETE ON public.assessment_goals FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_docs AFTER INSERT OR UPDATE OR DELETE ON public.clinical_documents FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_sig AFTER INSERT OR DELETE ON public.clinical_signatures FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
CREATE TRIGGER aud_evolutions AFTER INSERT OR UPDATE OR DELETE ON public.evolutions FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Seeds
INSERT INTO public.normative_rom (region, movement_key, movement_label, normal_min, normal_max, display_order) VALUES
 ('ombro','flexao','Flexão',0,180,1),('ombro','extensao','Extensão',0,60,2),('ombro','abducao','Abdução',0,180,3),
 ('ombro','aducao','Adução',0,50,4),('ombro','rot_interna','Rotação Interna',0,90,5),('ombro','rot_externa','Rotação Externa',0,90,6),
 ('cotovelo','flexao','Flexão',0,150,1),('cotovelo','pronacao','Pronação',0,80,2),('cotovelo','supinacao','Supinação',0,80,3),
 ('punho','flexao','Flexão',0,80,1),('punho','extensao','Extensão',0,70,2),('punho','desvio_radial','Desvio Radial',0,20,3),('punho','desvio_ulnar','Desvio Ulnar',0,30,4),
 ('quadril','flexao','Flexão',0,120,1),('quadril','extensao','Extensão',0,30,2),('quadril','abducao','Abdução',0,45,3),
 ('quadril','aducao','Adução',0,30,4),('quadril','rot_interna','Rotação Interna',0,45,5),('quadril','rot_externa','Rotação Externa',0,45,6),
 ('joelho','flexao','Flexão',0,135,1),
 ('tornozelo','dorsiflexao','Dorsiflexão',0,20,1),('tornozelo','flexao_plantar','Flexão Plantar',0,50,2),('tornozelo','inversao','Inversão',0,35,3),('tornozelo','eversao','Eversão',0,15,4),
 ('cervical','flexao','Flexão',0,45,1),('cervical','extensao','Extensão',0,45,2),('cervical','inclinacao','Inclinação Lateral',0,45,3),('cervical','rotacao','Rotação',0,60,4),
 ('toracica','flexao','Flexão',0,50,1),('toracica','extensao','Extensão',0,40,2),('toracica','rotacao','Rotação',0,30,3),
 ('lombar','flexao','Flexão',0,60,1),('lombar','extensao','Extensão',0,25,2),('lombar','inclinacao','Inclinação Lateral',0,25,3)
ON CONFLICT (region, movement_key) DO NOTHING;
