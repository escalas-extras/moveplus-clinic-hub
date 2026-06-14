
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','physiotherapist','psychologist','nutritionist','occupational_therapist','speech_therapist','physical_educator','physician','other');
CREATE TYPE public.assessment_type AS ENUM ('avaliacao','reavaliacao');
CREATE TYPE public.assessment_module_type AS ENUM ('geral','traumato_ortopedica','neurologica','cardiorrespiratoria','postural','geriatrica','pediatrica','esportiva','rpg','pilates','dor_cronica','funcional','personalizada');
CREATE TYPE public.appointment_status AS ENUM ('agendado','confirmado','realizado','cancelado');
CREATE TYPE public.payment_method AS ENUM ('pix','dinheiro','cartao','transferencia');
CREATE TYPE public.payment_status AS ENUM ('pago','pendente');
CREATE TYPE public.entity_status AS ENUM ('ativo','inativo');
CREATE TYPE public.document_type AS ENUM ('avaliacao','reavaliacao','evolucao','relatorio','declaracao','recibo','termo','encaminhamento','laudo');
CREATE TYPE public.attachment_type AS ENUM ('exame','foto','outro');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PROFILES + ROLES POLICIES ============
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ CLINIC SETTINGS (singleton) ============
CREATE TABLE public.clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  telefones TEXT[],
  emails TEXT[],
  endereco TEXT,
  cidade TEXT DEFAULT 'Londrina',
  estado TEXT DEFAULT 'PR',
  cep TEXT,
  rodape_institucional TEXT,
  assinatura_padrao_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic read all authed" ON public.clinic_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "clinic admin write" ON public.clinic_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROFESSIONALS ============
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  profissao TEXT NOT NULL,
  conselho TEXT,
  registro TEXT,
  especialidade TEXT,
  situacao public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professionals TO authenticated;
GRANT ALL ON public.professionals TO service_role;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof read all authed" ON public.professionals FOR SELECT TO authenticated USING (true);
CREATE POLICY "prof admin write" ON public.professionals FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PATIENTS ============
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  data_nascimento DATE,
  sexo TEXT,
  estado_civil TEXT,
  profissao TEXT,
  naturalidade TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  whatsapp TEXT,
  contato_recado TEXT,
  responsavel TEXT,
  observacoes TEXT,
  situacao public.entity_status NOT NULL DEFAULT 'ativo',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patients_nome ON public.patients(nome_completo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients read authed" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "patients insert authed" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "patients update authed" ON public.patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "patients delete admin" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ PATIENT ATTACHMENTS ============
CREATE TABLE public.patient_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tipo public.attachment_type NOT NULL DEFAULT 'outro',
  file_path TEXT NOT NULL,
  descricao TEXT,
  uploaded_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attach_patient ON public.patient_attachments(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_attachments TO authenticated;
GRANT ALL ON public.patient_attachments TO service_role;
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attach read authed" ON public.patient_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "attach insert authed" ON public.patient_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "attach delete admin" ON public.patient_attachments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ ASSESSMENTS ============
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  tipo public.assessment_type NOT NULL DEFAULT 'avaliacao',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnostico_clinico TEXT,
  medico_responsavel TEXT,
  diagnostico_fisio TEXT,
  queixa_principal TEXT,
  hma TEXT,
  antecedentes_pessoais TEXT,
  antecedentes_familiares TEXT,
  tratamentos_realizados TEXT,
  exames_complementares TEXT,
  medicamentos TEXT,
  inspecao TEXT,
  palpacao TEXT,
  marcha TEXT,
  equilibrio TEXT,
  coordenacao TEXT,
  objetivos TEXT,
  condutas TEXT,
  peso NUMERIC(6,2),
  estatura NUMERIC(4,2),
  imc NUMERIC(5,2),
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ
);
CREATE INDEX idx_assess_patient ON public.assessments(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assess read authed" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "assess insert authed" ON public.assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "assess update unlocked" ON public.assessments FOR UPDATE TO authenticated USING (locked_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "assess delete admin" ON public.assessments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Trigger: bloquear updates após locked_at (exceto admin)
CREATE OR REPLACE FUNCTION public.block_locked_updates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Registro assinado/bloqueado não pode ser modificado';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_assess_lock BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.block_locked_updates();

-- ============ ASSESSMENT SUB-TABLES ============
CREATE TABLE public.assessment_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  module_type public.assessment_module_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, module_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_modules TO authenticated;
GRANT ALL ON public.assessment_modules TO service_role;
ALTER TABLE public.assessment_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules authed all" ON public.assessment_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.assessment_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
  pa TEXT, fc TEXT, fr TEXT, rr TEXT, pr TEXT,
  tosse TEXT, secrecao TEXT, temperatura NUMERIC(4,1),
  ausculta_pulmonar TEXT, dispneia TEXT, angina TEXT,
  edema TEXT, cianose TEXT, sincope TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_vitals TO authenticated;
GRANT ALL ON public.assessment_vitals TO service_role;
ALTER TABLE public.assessment_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitals authed all" ON public.assessment_vitals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.assessment_ortho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
  fm_mmss JSONB DEFAULT '{}'::jsonb,
  fm_mmii JSONB DEFAULT '{}'::jsonb,
  perimetria JSONB DEFAULT '{}'::jsonb,
  adm JSONB DEFAULT '{}'::jsonb,
  goniometria JSONB DEFAULT '{}'::jsonb,
  eva SMALLINT CHECK (eva BETWEEN 0 AND 10),
  testes_especificos TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_ortho TO authenticated;
GRANT ALL ON public.assessment_ortho TO service_role;
ALTER TABLE public.assessment_ortho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ortho authed all" ON public.assessment_ortho FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.assessment_neuro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
  consciencia TEXT, tonus TEXT, trofismo TEXT, clonus TEXT,
  motricidade TEXT, reflexos JSONB DEFAULT '{}'::jsonb,
  sensibilidade JSONB DEFAULT '{}'::jsonb,
  testes TEXT, manobras_deficitarias TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_neuro TO authenticated;
GRANT ALL ON public.assessment_neuro TO service_role;
ALTER TABLE public.assessment_neuro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "neuro authed all" ON public.assessment_neuro FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.assessment_postural (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
  anterior TEXT, posterior TEXT, lat_direita TEXT, lat_esquerda TEXT,
  foto_anterior TEXT, foto_posterior TEXT, foto_lat_d TEXT, foto_lat_e TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_postural TO authenticated;
GRANT ALL ON public.assessment_postural TO service_role;
ALTER TABLE public.assessment_postural ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postural authed all" ON public.assessment_postural FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ EVOLUTIONS ============
CREATE TABLE public.evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,
  sessao_numero INT,
  procedimentos TEXT,
  resposta_paciente TEXT,
  evolucao_observada TEXT,
  conduta TEXT,
  proximos_objetivos TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ
);
CREATE INDEX idx_evo_patient ON public.evolutions(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolutions TO authenticated;
GRANT ALL ON public.evolutions TO service_role;
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evo read authed" ON public.evolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "evo insert authed" ON public.evolutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "evo update unlocked" ON public.evolutions FOR UPDATE TO authenticated USING (locked_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "evo delete admin" ON public.evolutions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_evo_lock BEFORE UPDATE ON public.evolutions FOR EACH ROW EXECUTE FUNCTION public.block_locked_updates();

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  data DATE NOT NULL,
  horario TIME NOT NULL,
  duracao_min INT NOT NULL DEFAULT 60,
  observacao TEXT,
  status public.appointment_status NOT NULL DEFAULT 'agendado',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appt_data ON public.appointments(data, horario);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt read authed" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "appt insert authed" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appt update authed" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "appt delete admin" ON public.appointments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ FINANCIAL ENTRIES ============
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento public.payment_method,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_data ON public.financial_entries(data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin admin all" ON public.financial_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "fin prof read own" ON public.financial_entries FOR SELECT TO authenticated
  USING (professional_id IN (SELECT id FROM public.professionals WHERE profile_id = auth.uid()));

-- ============ RECEIPTS ============
CREATE SEQUENCE public.receipt_number_seq START 1;
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT NOT NULL UNIQUE DEFAULT nextval('public.receipt_number_seq'),
  financial_entry_id UUID NOT NULL REFERENCES public.financial_entries(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento public.payment_method,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.receipt_number_seq TO authenticated, service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec admin all" ON public.receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rec prof read own" ON public.receipts FOR SELECT TO authenticated
  USING (professional_id IN (SELECT id FROM public.professionals WHERE profile_id = auth.uid()));

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  tipo public.document_type NOT NULL,
  referencia_id UUID,
  pdf_path TEXT,
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_patient ON public.documents(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc read authed" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "doc insert authed" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "doc delete admin" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ HANDLE NEW USER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'physiotherapist')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
