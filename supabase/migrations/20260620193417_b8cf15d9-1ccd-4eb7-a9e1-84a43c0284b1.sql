
DO $$ BEGIN
  CREATE TYPE public.library_content_type AS ENUM (
    'cartilha','protocolo','exercicio','documento','marketing','treinamento','post_social','pop'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.library_scope AS ENUM ('global','clinic','shared');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.library_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid REFERENCES public.library_categories(id) ON DELETE SET NULL,
  icon text,
  color text,
  sort_order int DEFAULT 0,
  scope public.library_scope NOT NULL DEFAULT 'global',
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lib_cat_global_slug ON public.library_categories(slug) WHERE clinic_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lib_cat_clinic_slug ON public.library_categories(clinic_id, slug) WHERE clinic_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_categories TO authenticated;
GRANT ALL ON public.library_categories TO service_role;
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lib_cat_read" ON public.library_categories FOR SELECT TO authenticated
  USING (scope = 'global' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lib_cat_admin_all" ON public.library_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lib_cat_updated BEFORE UPDATE ON public.library_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.library_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.library_content_type NOT NULL,
  category_id uuid REFERENCES public.library_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text,
  summary text,
  body text,
  body_json jsonb,
  tags text[] DEFAULT '{}',
  body_region text,
  related_diagnoses text[] DEFAULT '{}',
  difficulty text,
  suggested_frequency text,
  duration_minutes int,
  level text,
  scales_suggested text[] DEFAULT '{}',
  objectives_suggested text[] DEFAULT '{}',
  conducts_suggested text[] DEFAULT '{}',
  reassessment_days int,
  cover_image_url text,
  attachments jsonb DEFAULT '[]'::jsonb,
  scope public.library_scope NOT NULL DEFAULT 'global',
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  author text,
  status text DEFAULT 'active',
  views_count int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lib_contents_type ON public.library_contents(type);
CREATE INDEX IF NOT EXISTS idx_lib_contents_category ON public.library_contents(category_id);
CREATE INDEX IF NOT EXISTS idx_lib_contents_scope ON public.library_contents(scope, clinic_id);
CREATE INDEX IF NOT EXISTS idx_lib_contents_tags ON public.library_contents USING gin(tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_contents TO authenticated;
GRANT ALL ON public.library_contents TO service_role;
ALTER TABLE public.library_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lib_contents_read" ON public.library_contents FOR SELECT TO authenticated
  USING (scope IN ('global','shared') OR public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY "lib_contents_insert" ON public.library_contents FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lib_contents_update" ON public.library_contents FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lib_contents_delete" ON public.library_contents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lib_contents_updated BEFORE UPDATE ON public.library_contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.library_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.library_contents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);
GRANT SELECT, INSERT, DELETE ON public.library_favorites TO authenticated;
GRANT ALL ON public.library_favorites TO service_role;
ALTER TABLE public.library_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lib_fav_own" ON public.library_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.exercise_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  frequency text,
  sent_at timestamptz,
  sent_via text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_programs TO authenticated;
GRANT ALL ON public.exercise_programs TO service_role;
ALTER TABLE public.exercise_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exprog_read" ON public.exercise_programs FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id));
CREATE POLICY "exprog_write" ON public.exercise_programs FOR ALL TO authenticated
  USING (public.can_access_patient(patient_id)) WITH CHECK (public.can_access_patient(patient_id));
CREATE TRIGGER trg_exprog_updated BEFORE UPDATE ON public.exercise_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.exercise_program_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.exercise_programs(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.library_contents(id) ON DELETE SET NULL,
  custom_title text,
  series int,
  reps int,
  rest_seconds int,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_program_items TO authenticated;
GRANT ALL ON public.exercise_program_items TO service_role;
ALTER TABLE public.exercise_program_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exprog_items_all" ON public.exercise_program_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_programs p WHERE p.id = program_id AND public.can_access_patient(p.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_programs p WHERE p.id = program_id AND public.can_access_patient(p.patient_id)));

CREATE TABLE IF NOT EXISTS public.home_care_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes int,
  address text,
  checklist jsonb DEFAULT '[]'::jsonb,
  therapeutic_plan text,
  family_report text,
  observations text,
  signature_url text,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_care_visits TO authenticated;
GRANT ALL ON public.home_care_visits TO service_role;
ALTER TABLE public.home_care_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hcv_read" ON public.home_care_visits FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id));
CREATE POLICY "hcv_write" ON public.home_care_visits FOR ALL TO authenticated
  USING (public.can_access_patient(patient_id)) WITH CHECK (public.can_access_patient(patient_id));
CREATE TRIGGER trg_hcv_updated BEFORE UPDATE ON public.home_care_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.marketing_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for date NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  channel text,
  status text DEFAULT 'planejado',
  content_id uuid REFERENCES public.library_contents(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_calendar TO authenticated;
GRANT ALL ON public.marketing_calendar TO service_role;
ALTER TABLE public.marketing_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_cal_read" ON public.marketing_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "mkt_cal_write" ON public.marketing_calendar FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mkt_cal_updated BEFORE UPDATE ON public.marketing_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.training_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.library_contents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  completed boolean DEFAULT false,
  UNIQUE(content_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.training_views TO authenticated;
GRANT ALL ON public.training_views TO service_role;
ALTER TABLE public.training_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_own" ON public.training_views FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

-- Seed categorias
INSERT INTO public.library_categories (name, slug, icon, color, sort_order, scope) VALUES
  ('Neurologia','neurologia','Brain','#7c3aed',1,'global'),
  ('Ortopedia','ortopedia','Bone','#0ea5e9',2,'global'),
  ('Respiratória','respiratoria','Wind','#10b981',3,'global'),
  ('Geriatria','geriatria','HeartPulse','#f59e0b',4,'global'),
  ('Home Care','home-care','Home','#ef4444',5,'global'),
  ('Marketing','marketing','Megaphone','#ec4899',6,'global'),
  ('Treinamentos','treinamentos','GraduationCap','#6366f1',7,'global'),
  ('Documentos','documentos','FileText','#64748b',8,'global')
ON CONFLICT DO NOTHING;

-- Seed conteúdos
WITH cats AS (SELECT id, slug FROM public.library_categories)
INSERT INTO public.library_contents (type, category_id, title, summary, body, tags, related_diagnoses, scope, author) VALUES
  ('cartilha',(SELECT id FROM cats WHERE slug='neurologia'),'Cartilha AVC — Orientações ao Familiar','Guia para cuidadores de pacientes pós-AVC.','# AVC\n\nPosicionamento, transferências, prevenção de quedas e estímulos motores.',ARRAY['avc','neuro','familiar'],ARRAY['AVC'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='neurologia'),'Cartilha Parkinson — Vida Diária','Estratégias para AVDs e mobilidade.','# Parkinson\n\nMarcha, equilíbrio, fala e exercícios diários.',ARRAY['parkinson'],ARRAY['Parkinson'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='neurologia'),'Cartilha Alzheimer','Estímulos cognitivos e motores.','# Alzheimer\n\nRotina, estímulos sensoriais.',ARRAY['alzheimer'],ARRAY['Alzheimer'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='neurologia'),'Cartilha Esclerose Múltipla','Fadiga e exercícios.','# EM\n\nFadiga, equilíbrio.',ARRAY['em'],ARRAY['Esclerose Múltipla'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='neurologia'),'Cartilha Lesão Medular','Cuidados com pele e transferências.','# Medular\n\nPrevenção de úlceras.',ARRAY['medular'],ARRAY['Lesão Medular'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='ortopedia'),'Cartilha Lombalgia','Dor lombar — orientações.','# Lombalgia\n\nPostura, alongamento, fortalecimento.',ARRAY['lombar'],ARRAY['Lombalgia'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='ortopedia'),'Cartilha Cervicalgia','Dor cervical.','# Cervical\n\nPostura, alongamentos.',ARRAY['cervical'],ARRAY['Cervicalgia'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='ortopedia'),'Cartilha Artrose','Manejo da artrose.','# Artrose\n\nProteção articular.',ARRAY['artrose'],ARRAY['Artrose'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='ortopedia'),'Cartilha Ombro','Reabilitação do ombro.','# Ombro\n\nPendulares, mobilidade.',ARRAY['ombro'],ARRAY['Ombro'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='ortopedia'),'Cartilha Joelho','Reabilitação do joelho.','# Joelho\n\nFortalecimento de quadríceps.',ARRAY['joelho'],ARRAY['Joelho'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='ortopedia'),'Cartilha Pós-Operatório','Cuidados pós-cirúrgicos.','# Pós-op\n\nMobilidade precoce.',ARRAY['posop'],ARRAY['Pós-operatório'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='respiratoria'),'Cartilha DPOC','Exercícios respiratórios.','# DPOC\n\nRespiração diafragmática, freno labial.',ARRAY['dpoc'],ARRAY['DPOC'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='respiratoria'),'Cartilha Pós-Covid','Reabilitação pós-Covid.','# Pós-Covid\n\nCondicionamento gradual.',ARRAY['covid'],ARRAY['Pós-Covid'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='geriatria'),'Prevenção de Quedas','Orientações para idosos.','# Quedas\n\nAdaptação ambiental, calçados.',ARRAY['queda'],ARRAY['Idoso'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='geriatria'),'Mobilidade do Idoso','Manutenção da mobilidade.','# Mobilidade\n\nCaminhada, alongamentos.',ARRAY['mobilidade'],ARRAY['Idoso'],'global','Move+'),
  ('cartilha',(SELECT id FROM cats WHERE slug='geriatria'),'Exercícios Domiciliares','Programa para idosos.','# Domiciliar\n\nSentar/levantar, marcha.',ARRAY['domiciliar'],ARRAY['Idoso'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='neurologia'),'Protocolo AVC','Escalas e condutas AVC.','Protocolo padrão pós-AVC.',ARRAY['avc'],ARRAY['AVC'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='neurologia'),'Protocolo Parkinson','Condutas Parkinson.','LSVT BIG, marcha.',ARRAY['parkinson'],ARRAY['Parkinson'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='neurologia'),'Protocolo Alzheimer','Estimulação.','Estimulação cognitiva e AVDs.',ARRAY['alzheimer'],ARRAY['Alzheimer'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='ortopedia'),'Protocolo Lombalgia','Conduta lombalgia.','McKenzie, core.',ARRAY['lombar'],ARRAY['Lombalgia'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='ortopedia'),'Protocolo Cervicalgia','Conduta cervical.','Alongamento, fortalecimento.',ARRAY['cervical'],ARRAY['Cervicalgia'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='ortopedia'),'Protocolo Artrose','Manejo artrose.','Proteção articular.',ARRAY['artrose'],ARRAY['Artrose'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='ortopedia'),'Protocolo Fratura Fêmur','Pós-op fêmur.','Mobilização precoce.',ARRAY['femur'],ARRAY['Fratura de Fêmur'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='respiratoria'),'Protocolo DPOC','Reabilitação respiratória.','Treino aeróbico.',ARRAY['dpoc'],ARRAY['DPOC'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='respiratoria'),'Protocolo Pós-Covid','Reabilitação Covid.','Condicionamento.',ARRAY['covid'],ARRAY['Pós-Covid'],'global','Move+'),
  ('protocolo',(SELECT id FROM cats WHERE slug='geriatria'),'Protocolo Geriátrico','Avaliação multidimensional.','Katz, Barthel, Tinetti.',ARRAY['geri'],ARRAY['Idoso'],'global','Move+'),
  ('exercicio',(SELECT id FROM cats WHERE slug='ortopedia'),'Ponte','Fortalecimento glúteos.','Elevar quadril deitado.',ARRAY['gluteo'],ARRAY['Lombalgia'],'global','Move+'),
  ('exercicio',(SELECT id FROM cats WHERE slug='ortopedia'),'Agachamento Apoiado','MMII.','Agachar apoiado.',ARRAY['mmii'],ARRAY['Artrose'],'global','Move+'),
  ('exercicio',(SELECT id FROM cats WHERE slug='geriatria'),'Sentar e Levantar','Funcionalidade.','Repetições.',ARRAY['funcional'],ARRAY['Idoso'],'global','Move+'),
  ('exercicio',(SELECT id FROM cats WHERE slug='neurologia'),'Marcha Tandem','Equilíbrio.','Linha reta.',ARRAY['equilibrio'],ARRAY['Parkinson'],'global','Move+'),
  ('exercicio',(SELECT id FROM cats WHERE slug='respiratoria'),'Respiração Diafragmática','Treino respiratório.','Expandir abdômen.',ARRAY['resp'],ARRAY['DPOC'],'global','Move+'),
  ('documento',(SELECT id FROM cats WHERE slug='documentos'),'Termo de Consentimento','Modelo TCLE.','TCLE padrão.',ARRAY['tcle'],ARRAY[]::text[],'global','Move+'),
  ('documento',(SELECT id FROM cats WHERE slug='documentos'),'Autorização de Imagem','Modelo.','Uso de imagem.',ARRAY['imagem'],ARRAY[]::text[],'global','Move+'),
  ('documento',(SELECT id FROM cats WHERE slug='documentos'),'Contrato de Prestação','Modelo.','Contrato fisioterapia.',ARRAY['contrato'],ARRAY[]::text[],'global','Move+'),
  ('documento',(SELECT id FROM cats WHERE slug='documentos'),'Declaração de Comparecimento','Modelo.','Declaração padrão.',ARRAY['declaracao'],ARRAY[]::text[],'global','Move+'),
  ('marketing',(SELECT id FROM cats WHERE slug='marketing'),'Campanha Mobilidade Idoso','Mês da mobilidade.','Posts, stories, cartilha.',ARRAY['junho'],ARRAY[]::text[],'global','Move+'),
  ('marketing',(SELECT id FROM cats WHERE slug='marketing'),'Campanha AVC','Dia Mundial.','Cartilha + sinais.',ARRAY['outubro'],ARRAY[]::text[],'global','Move+'),
  ('post_social',(SELECT id FROM cats WHERE slug='marketing'),'Post Dia do Fisioterapeuta','13/out.','Template comemorativo.',ARRAY['data'],ARRAY[]::text[],'global','Move+'),
  ('post_social',(SELECT id FROM cats WHERE slug='marketing'),'Story Dica da Semana','Template.','Story educativo.',ARRAY['story'],ARRAY[]::text[],'global','Move+'),
  ('treinamento',(SELECT id FROM cats WHERE slug='treinamentos'),'Onboarding da Equipe','Inicial.','Boas-vindas e fluxos.',ARRAY['onboarding'],ARRAY[]::text[],'global','Move+'),
  ('treinamento',(SELECT id FROM cats WHERE slug='treinamentos'),'Como usar a Move+','Tour.','Treinamento sistema.',ARRAY['sistema'],ARRAY[]::text[],'global','Move+'),
  ('pop',(SELECT id FROM cats WHERE slug='treinamentos'),'POP Atendimento Domiciliar','POP.','Checklist domiciliar.',ARRAY['pop'],ARRAY[]::text[],'global','Move+'),
  ('pop',(SELECT id FROM cats WHERE slug='treinamentos'),'POP Higienização','POP.','Higienização materiais.',ARRAY['pop'],ARRAY[]::text[],'global','Move+')
ON CONFLICT DO NOTHING;
