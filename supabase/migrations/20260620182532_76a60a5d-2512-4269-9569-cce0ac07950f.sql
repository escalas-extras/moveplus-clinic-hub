
-- 0) Função updated_at (idempotente) -----------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) CATÁLOGOS PARAMETRIZADOS ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.catalog_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  clinical_profiles text[] NOT NULL DEFAULT '{}',
  suggested_scales text[] NOT NULL DEFAULT '{}',
  suggested_objectives text[] NOT NULL DEFAULT '{}',
  template_anamnese text,
  template_objetivos text,
  template_condutas text,
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_diagnoses TO authenticated;
GRANT ALL ON public.catalog_diagnoses TO service_role;
ALTER TABLE public.catalog_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_diagnoses read" ON public.catalog_diagnoses FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_diagnoses admin write" ON public.catalog_diagnoses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.catalog_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  clinical_profiles text[] NOT NULL DEFAULT '{}',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  classification jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_score int,
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_scales TO authenticated;
GRANT ALL ON public.catalog_scales TO service_role;
ALTER TABLE public.catalog_scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_scales read" ON public.catalog_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_scales admin write" ON public.catalog_scales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.catalog_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  clinical_profiles text[] NOT NULL DEFAULT '{}',
  default_indicator text,
  default_deadline_days int,
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_objectives TO authenticated;
GRANT ALL ON public.catalog_objectives TO service_role;
ALTER TABLE public.catalog_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_objectives read" ON public.catalog_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_objectives admin write" ON public.catalog_objectives FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.catalog_risk_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type text NOT NULL,
  source_scale_code text,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risk_type, source_scale_code)
);
GRANT SELECT ON public.catalog_risk_classifications TO authenticated;
GRANT ALL ON public.catalog_risk_classifications TO service_role;
ALTER TABLE public.catalog_risk_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_risk read" ON public.catalog_risk_classifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_risk admin write" ON public.catalog_risk_classifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) AMPLIAÇÃO DE assessments (aditivo) --------------------------------------

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS clinical_profiles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diagnosis_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wizard_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wizard_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS executive_summary jsonb,
  ADD COLUMN IF NOT EXISTS scales_results jsonb,
  ADD COLUMN IF NOT EXISTS strength_mrc jsonb,
  ADD COLUMN IF NOT EXISTS rom_goniometry jsonb,
  ADD COLUMN IF NOT EXISTS therapeutic_goals jsonb,
  ADD COLUMN IF NOT EXISTS risk_falls text,
  ADD COLUMN IF NOT EXISTS risk_pressure text,
  ADD COLUMN IF NOT EXISTS dependency_level text,
  ADD COLUMN IF NOT EXISTS signatures jsonb,
  ADD COLUMN IF NOT EXISTS qr_validation_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS next_reassessment_date date,
  ADD COLUMN IF NOT EXISTS last_autosaved_at timestamptz;

-- 3) RASCUNHOS COM AUTO-SAVE -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.assessment_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  wizard_step int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessment_drafts_user_patient_idx
  ON public.assessment_drafts(user_id, patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_drafts_unique_existing
  ON public.assessment_drafts(assessment_id) WHERE assessment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_drafts_unique_new
  ON public.assessment_drafts(user_id, patient_id) WHERE assessment_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_drafts TO authenticated;
GRANT ALL ON public.assessment_drafts TO service_role;
ALTER TABLE public.assessment_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts owner all" ON public.assessment_drafts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER assessment_drafts_set_updated
  BEFORE UPDATE ON public.assessment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) TRILHA DE AUDITORIA -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.assessment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  step text,
  details jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessment_audit_assessment_idx
  ON public.assessment_audit_log(assessment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS assessment_audit_user_idx
  ON public.assessment_audit_log(user_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.assessment_audit_log TO authenticated;
GRANT ALL ON public.assessment_audit_log TO service_role;
ALTER TABLE public.assessment_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit insert self" ON public.assessment_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit read self or admin" ON public.assessment_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 5) updated_at triggers para catálogos --------------------------------------
CREATE TRIGGER catalog_diagnoses_set_updated BEFORE UPDATE ON public.catalog_diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER catalog_scales_set_updated BEFORE UPDATE ON public.catalog_scales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER catalog_objectives_set_updated BEFORE UPDATE ON public.catalog_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER catalog_risk_set_updated BEFORE UPDATE ON public.catalog_risk_classifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) SEED — biblioteca inicial de diagnósticos -------------------------------

INSERT INTO public.catalog_diagnoses (code, label, keywords, clinical_profiles, suggested_scales, suggested_objectives, template_anamnese, template_objetivos, template_condutas, sort_order) VALUES
  ('avc','AVC / AVE',ARRAY['avc','ave','acidente vascular','isquemic','hemorrag'],ARRAY['neuro','geriatrico'],ARRAY['barthel','berg','tinetti','katz'],ARRAY['mobilidade','marcha','equilibrio','adl'],
   'Paciente com diagnóstico de AVC. Investigar lado acometido, tempo de evolução, sequelas motoras (hemiparesia/hemiplegia), espasticidade, comunicação (afasia/disartria), disfagia, controle esfincteriano e suporte familiar.',
   'Recuperar mobilidade funcional; treino de marcha e equilíbrio; reduzir tônus espástico; estimular independência em AVDs; prevenir complicações secundárias.',
   'Cinesioterapia neurofuncional; treino motor orientado à tarefa; treino de transferências; mobilizações; alongamentos; orientações ao cuidador.',10),
  ('parkinson','Doença de Parkinson',ARRAY['parkinson'],ARRAY['neuro','geriatrico'],ARRAY['berg','tinetti','barthel'],ARRAY['marcha','equilibrio','mobilidade'],
   'Paciente com Doença de Parkinson. Investigar tempo de diagnóstico, estágio (Hoehn & Yahr), tremor, rigidez, bradicinesia, instabilidade postural, freezing, quedas e flutuações motoras.',
   'Otimizar marcha (amplitude, cadência); melhorar equilíbrio e prevenir quedas; manter mobilidade global; treino de dupla tarefa.',
   'Treino de marcha com pistas externas; exercícios de grande amplitude; treino de equilíbrio; alongamentos; orientação familiar.',20),
  ('alzheimer','Doença de Alzheimer',ARRAY['alzheimer'],ARRAY['neuro','geriatrico'],ARRAY['katz','barthel','tinetti','braden'],ARRAY['mobilidade','adl','prevencao_quedas'],
   'Paciente com Doença de Alzheimer. Avaliar estágio cognitivo, nível de dependência em AVDs, alterações de marcha e equilíbrio, risco de quedas e participação do cuidador.',
   'Preservar mobilidade e função; reduzir risco de quedas; manter participação em AVDs; suporte e orientação ao cuidador.',
   'Atividades funcionais com comando simples; treino de marcha e equilíbrio; mobilizações; estimulação cognitivo-motora.',30),
  ('demencia','Demência (outras)',ARRAY['demencia','demência'],ARRAY['neuro','geriatrico'],ARRAY['katz','barthel','tinetti','braden'],ARRAY['mobilidade','adl','prevencao_quedas'],
   'Paciente com quadro demencial. Investigar etiologia, estágio, funcionalidade em AVDs, mobilidade, risco de quedas, risco de lesão por pressão e suporte do cuidador.',
   'Manter funcionalidade; prevenir quedas e lesões por pressão; estimular participação em AVDs.',
   'Mobilizações; exercícios funcionais; treino de transferências; orientação ao cuidador; prevenção de imobilismo.',31),
  ('esclerose_multipla','Esclerose Múltipla',ARRAY['esclerose multipla','esclerose múltipla','em','multiple sclerosis'],ARRAY['neuro'],ARRAY['berg','barthel','tinetti'],ARRAY['mobilidade','equilibrio','fadiga'],
   'Paciente com Esclerose Múltipla. Investigar forma clínica (surto-remissão/progressiva), surtos recentes, fadiga, espasticidade, ataxia, alterações visuais e esfincterianas.',
   'Reduzir impacto da fadiga; manter mobilidade e equilíbrio; controlar espasticidade; promover independência funcional.',
   'Exercícios aeróbicos de baixa intensidade; treino de equilíbrio; alongamentos; manejo da fadiga.',40),
  ('lesao_medular','Lesão Medular',ARRAY['lesao medular','lesão medular','tetraplegi','paraplegi','medula'],ARRAY['neuro'],ARRAY['barthel','braden'],ARRAY['transferencias','mobilidade','adl','prevencao_lpp'],
   'Paciente com lesão medular. Identificar nível neurológico, ASIA, tempo de lesão, sensibilidade, controle esfincteriano, espasticidade e risco de lesão por pressão.',
   'Maximizar independência funcional conforme nível; treino de transferências e mobilidade em cadeira; prevenir lesões por pressão e contraturas.',
   'Treino de transferências; fortalecimento de MMSS; mobilizações de MMII; orientação de mudança de decúbito; cinesioterapia respiratória.',50),
  ('ela','ELA (Esclerose Lateral Amiotrófica)',ARRAY['ela','esclerose lateral','amiotrofica','amiotrófica'],ARRAY['neuro','paliativo'],ARRAY['barthel','katz'],ARRAY['mobilidade','respiratorio','conforto'],
   'Paciente com ELA. Avaliar fraqueza progressiva, fasciculações, comprometimento bulbar, função respiratória, deglutição e necessidade de suporte ventilatório.',
   'Preservar função enquanto possível; prevenir complicações musculoesqueléticas e respiratórias; promover conforto e qualidade de vida.',
   'Exercícios ativo-assistidos suaves; alongamentos; cinesioterapia respiratória; orientação para posicionamento; suporte ao cuidador.',60),
  ('huntington','Doença de Huntington',ARRAY['huntington'],ARRAY['neuro'],ARRAY['berg','tinetti','barthel'],ARRAY['marcha','equilibrio','prevencao_quedas'],
   'Paciente com Doença de Huntington. Investigar coreia, alterações cognitivas e comportamentais, marcha, equilíbrio e disfagia.',
   'Reduzir risco de quedas; preservar funcionalidade; treino de marcha e equilíbrio.',
   'Treino de equilíbrio; mobilizações; exercícios funcionais com comando simples.',70),
  ('paralisia_cerebral','Paralisia Cerebral',ARRAY['paralisia cerebral','pc encefalopatia'],ARRAY['neuro'],ARRAY['barthel'],ARRAY['mobilidade','adl','postura'],
   'Paciente com Paralisia Cerebral. Avaliar tipo (espástica/discinética/atáxica), GMFCS, deformidades, controle de tronco, comunicação e participação.',
   'Otimizar função e participação; controle de tônus; prevenir deformidades; treino de mobilidade.',
   'Cinesioterapia; alongamentos; treino funcional; orientação postural; suporte familiar.',80),
  ('artrose','Artrose / Osteoartrose',ARRAY['artrose','osteoartrose','gonartrose','coxartrose'],ARRAY['orto','geriatrico'],ARRAY['barthel','tinetti'],ARRAY['dor','mobilidade','forca'],
   'Paciente com artrose. Identificar articulações acometidas, tempo de evolução, dor, rigidez matinal, limitação funcional e uso de analgesia.',
   'Reduzir dor; melhorar mobilidade articular; fortalecer musculatura periarticular; otimizar função.',
   'Cinesioterapia analgésica; mobilizações; fortalecimento; recursos eletrotermofototerápicos; orientação domiciliar.',90),
  ('fratura','Fratura (geral)',ARRAY['fratura'],ARRAY['orto'],ARRAY['barthel','tinetti'],ARRAY['mobilidade','forca','marcha'],
   'Paciente em recuperação de fratura. Identificar local, mecanismo, tipo de tratamento (conservador/cirúrgico), tempo de imobilização e restrições de carga.',
   'Recuperar amplitude e força; restaurar marcha e carga conforme orientação; retornar à funcionalidade prévia.',
   'Mobilizações; fortalecimento progressivo; treino de marcha com auxiliar conforme indicação; orientação de carga.',100),
  ('fratura_femur','Fratura de Fêmur',ARRAY['fratura femur','fratura de femur','fratura fêmur','colo do femur','colo femur'],ARRAY['orto','geriatrico'],ARRAY['barthel','tinetti','berg','braden'],ARRAY['marcha','transferencias','prevencao_quedas'],
   'Paciente com fratura de fêmur. Identificar tipo de tratamento (osteossíntese, artroplastia), tempo pós-operatório, restrições de carga, dor, marcha prévia e risco de novas quedas.',
   'Restaurar marcha funcional; treino de transferências; prevenir nova queda; recuperar força de MMII; estimular AVDs.',
   'Treino progressivo de carga conforme indicação; fortalecimento de MMII; treino de marcha com auxiliar; mobilizações; orientação domiciliar.',101),
  ('pos_operatorio','Pós-operatório',ARRAY['pos operatorio','pós operatório','pós-operatório','pop'],ARRAY['orto'],ARRAY['barthel'],ARRAY['dor','mobilidade','forca'],
   'Paciente em pós-operatório. Identificar cirurgia, data, restrições, condutas médicas, dor pós-operatória e funcionalidade prévia.',
   'Controlar dor; recuperar mobilidade e força; retomar funcionalidade conforme protocolo pós-operatório.',
   'Cinesioterapia conforme protocolo; mobilizações respeitando restrições; orientação domiciliar.',110),
  ('amputacao','Amputação',ARRAY['amputacao','amputação','amputad'],ARRAY['orto'],ARRAY['barthel'],ARRAY['mobilidade','transferencias','protetizacao'],
   'Paciente amputado. Identificar nível de amputação, data, etiologia, condição do coto, uso de prótese, dor fantasma e funcionalidade.',
   'Preparar coto para protetização; treino com prótese; treino de transferências e marcha; independência em AVDs.',
   'Cuidados com coto; dessensibilização; fortalecimento; treino com prótese; treino de marcha.',120),
  ('dpoc','DPOC',ARRAY['dpoc','enfisema','bronquite cronica','bronquite crônica'],ARRAY['respiratorio','geriatrico'],ARRAY['barthel'],ARRAY['respiratorio','tolerancia_esforço','dispneia'],
   'Paciente com DPOC. Avaliar GOLD, dispneia (mMRC), tosse, expectoração, uso de O2 domiciliar, exacerbações e tolerância ao esforço.',
   'Reduzir dispneia; melhorar tolerância ao esforço; otimizar mecânica ventilatória; prevenir descondicionamento.',
   'Reabilitação pulmonar; treino aeróbico progressivo; treino muscular respiratório; técnicas de higiene brônquica; educação.',130),
  ('pos_covid','Pós-Covid com sequelas funcionais',ARRAY['pos covid','pós covid','pos-covid','long covid','sequela covid'],ARRAY['respiratorio'],ARRAY['barthel'],ARRAY['tolerancia_esforço','respiratorio','fadiga'],
   'Paciente com sequelas pós-COVID. Avaliar fadiga, dispneia aos esforços, descondicionamento, alterações cognitivas, força muscular e impacto funcional.',
   'Recuperar capacidade aeróbica; reduzir fadiga; restaurar força e função; reintegração às atividades.',
   'Treino aeróbico progressivo; fortalecimento; cinesioterapia respiratória; manejo da fadiga.',140),
  ('paliativo','Cuidados Paliativos',ARRAY['paliativ','cuidados paliativos','terminalidade'],ARRAY['paliativo','geriatrico'],ARRAY['barthel','braden'],ARRAY['conforto','mobilidade','prevencao_lpp'],
   'Paciente em cuidados paliativos. Avaliar funcionalidade atual, dor, dispneia, mobilidade, risco de lesão por pressão, conforto e desejos do paciente/família.',
   'Promover conforto; preservar funcionalidade possível; controlar sintomas; suporte à família.',
   'Posicionamento; mobilizações suaves; alívio de sintomas; orientação à família e cuidadores.',150)
ON CONFLICT (code) DO NOTHING;

-- 7) SEED — escalas funcionais ----------------------------------------------

INSERT INTO public.catalog_scales (code, label, description, clinical_profiles, items, classification, max_score, sort_order) VALUES
  ('barthel','Índice de Barthel','Avalia independência em atividades de vida diária.',
   ARRAY['neuro','orto','geriatrico'],
   '[
     {"key":"alimentacao","label":"Alimentação","options":[{"value":0,"label":"Dependente"},{"value":5,"label":"Ajuda"},{"value":10,"label":"Independente"}]},
     {"key":"banho","label":"Banho","options":[{"value":0,"label":"Dependente"},{"value":5,"label":"Independente"}]},
     {"key":"higiene","label":"Higiene pessoal","options":[{"value":0,"label":"Dependente"},{"value":5,"label":"Independente"}]},
     {"key":"vestir","label":"Vestir-se","options":[{"value":0,"label":"Dependente"},{"value":5,"label":"Ajuda"},{"value":10,"label":"Independente"}]},
     {"key":"intestino","label":"Controle intestinal","options":[{"value":0,"label":"Incontinente"},{"value":5,"label":"Acidente ocasional"},{"value":10,"label":"Continente"}]},
     {"key":"bexiga","label":"Controle vesical","options":[{"value":0,"label":"Incontinente"},{"value":5,"label":"Acidente ocasional"},{"value":10,"label":"Continente"}]},
     {"key":"banheiro","label":"Uso do vaso sanitário","options":[{"value":0,"label":"Dependente"},{"value":5,"label":"Ajuda"},{"value":10,"label":"Independente"}]},
     {"key":"transferencia","label":"Transferência (cama-cadeira)","options":[{"value":0,"label":"Incapaz"},{"value":5,"label":"Grande ajuda"},{"value":10,"label":"Pequena ajuda"},{"value":15,"label":"Independente"}]},
     {"key":"mobilidade","label":"Mobilidade","options":[{"value":0,"label":"Imóvel"},{"value":5,"label":"Cadeira de rodas"},{"value":10,"label":"Anda com ajuda"},{"value":15,"label":"Independente"}]},
     {"key":"escadas","label":"Escadas","options":[{"value":0,"label":"Incapaz"},{"value":5,"label":"Ajuda"},{"value":10,"label":"Independente"}]}
   ]'::jsonb,
   '[
     {"min":0,"max":20,"label":"Dependência total","severity":"total"},
     {"min":21,"max":40,"label":"Dependência grave","severity":"high"},
     {"min":41,"max":60,"label":"Dependência moderada","severity":"moderate"},
     {"min":61,"max":99,"label":"Dependência leve","severity":"low"},
     {"min":100,"max":100,"label":"Independente","severity":"low"}
   ]'::jsonb,100,10),
  ('katz','Escala de Katz','Avalia independência básica em AVDs.',
   ARRAY['geriatrico','neuro'],
   '[
     {"key":"banho","label":"Banhar-se","options":[{"value":1,"label":"Independente"},{"value":0,"label":"Dependente"}]},
     {"key":"vestir","label":"Vestir-se","options":[{"value":1,"label":"Independente"},{"value":0,"label":"Dependente"}]},
     {"key":"banheiro","label":"Ir ao banheiro","options":[{"value":1,"label":"Independente"},{"value":0,"label":"Dependente"}]},
     {"key":"transferencia","label":"Transferência","options":[{"value":1,"label":"Independente"},{"value":0,"label":"Dependente"}]},
     {"key":"continencia","label":"Continência","options":[{"value":1,"label":"Independente"},{"value":0,"label":"Dependente"}]},
     {"key":"alimentacao","label":"Alimentação","options":[{"value":1,"label":"Independente"},{"value":0,"label":"Dependente"}]}
   ]'::jsonb,
   '[
     {"min":6,"max":6,"label":"Independente","severity":"low"},
     {"min":4,"max":5,"label":"Dependência moderada","severity":"moderate"},
     {"min":0,"max":3,"label":"Dependência grave","severity":"high"}
   ]'::jsonb,6,20),
  ('berg','Escala de Equilíbrio de Berg','14 itens, 0–4 pontos cada; avalia risco de queda.',
   ARRAY['neuro','geriatrico','orto'],
   '[
     {"key":"sentado_para_pe","label":"Sentado para de pé"},
     {"key":"em_pe_sem_apoio","label":"Em pé sem apoio"},
     {"key":"sentado_sem_apoio","label":"Sentado sem apoio"},
     {"key":"em_pe_para_sentado","label":"De pé para sentado"},
     {"key":"transferencia","label":"Transferência"},
     {"key":"olhos_fechados","label":"Em pé com olhos fechados"},
     {"key":"pes_juntos","label":"Em pé com pés juntos"},
     {"key":"alcance_anterior","label":"Alcance anterior"},
     {"key":"objeto_solo","label":"Apanhar objeto do solo"},
     {"key":"olhar_para_tras","label":"Olhar para trás"},
     {"key":"girar_360","label":"Girar 360°"},
     {"key":"pe_alternado","label":"Pé alternado no banco"},
     {"key":"tandem","label":"Em pé com um pé à frente"},
     {"key":"unipodal","label":"Em pé apoiado em um pé"}
   ]'::jsonb,
   '[
     {"min":0,"max":20,"label":"Alto risco de queda","severity":"high"},
     {"min":21,"max":40,"label":"Médio risco de queda","severity":"moderate"},
     {"min":41,"max":56,"label":"Baixo risco de queda","severity":"low"}
   ]'::jsonb,56,30),
  ('tinetti','Escala de Tinetti (POMA)','Avalia equilíbrio e marcha (max 28).',
   ARRAY['geriatrico','neuro'],
   '[
     {"key":"equilibrio","label":"Subescala de Equilíbrio (max 16)"},
     {"key":"marcha","label":"Subescala de Marcha (max 12)"}
   ]'::jsonb,
   '[
     {"min":0,"max":18,"label":"Alto risco de queda","severity":"high"},
     {"min":19,"max":23,"label":"Risco moderado","severity":"moderate"},
     {"min":24,"max":28,"label":"Baixo risco","severity":"low"}
   ]'::jsonb,28,40),
  ('braden','Escala de Braden','Risco de lesão por pressão.',
   ARRAY['geriatrico','neuro','paliativo'],
   '[
     {"key":"percepcao","label":"Percepção sensorial","options":[{"value":1,"label":"Totalmente limitada"},{"value":2,"label":"Muito limitada"},{"value":3,"label":"Levemente limitada"},{"value":4,"label":"Nenhuma limitação"}]},
     {"key":"umidade","label":"Umidade","options":[{"value":1,"label":"Constantemente úmida"},{"value":2,"label":"Muito úmida"},{"value":3,"label":"Ocasionalmente úmida"},{"value":4,"label":"Raramente úmida"}]},
     {"key":"atividade","label":"Atividade","options":[{"value":1,"label":"Acamado"},{"value":2,"label":"Confinado à cadeira"},{"value":3,"label":"Anda ocasionalmente"},{"value":4,"label":"Anda frequentemente"}]},
     {"key":"mobilidade","label":"Mobilidade","options":[{"value":1,"label":"Totalmente imóvel"},{"value":2,"label":"Muito limitada"},{"value":3,"label":"Levemente limitada"},{"value":4,"label":"Sem limitação"}]},
     {"key":"nutricao","label":"Nutrição","options":[{"value":1,"label":"Muito pobre"},{"value":2,"label":"Provavelmente inadequada"},{"value":3,"label":"Adequada"},{"value":4,"label":"Excelente"}]},
     {"key":"friccao","label":"Fricção e cisalhamento","options":[{"value":1,"label":"Problema"},{"value":2,"label":"Problema potencial"},{"value":3,"label":"Nenhum problema"}]}
   ]'::jsonb,
   '[
     {"min":6,"max":9,"label":"Risco muito alto","severity":"high"},
     {"min":10,"max":12,"label":"Risco alto","severity":"high"},
     {"min":13,"max":14,"label":"Risco moderado","severity":"moderate"},
     {"min":15,"max":18,"label":"Risco baixo","severity":"low"},
     {"min":19,"max":23,"label":"Sem risco","severity":"low"}
   ]'::jsonb,23,50)
ON CONFLICT (code) DO NOTHING;

-- 8) SEED — objetivos terapêuticos padrão ------------------------------------

INSERT INTO public.catalog_objectives (code, label, clinical_profiles, default_indicator, default_deadline_days, sort_order) VALUES
  ('mobilidade','Melhorar mobilidade funcional',ARRAY['neuro','orto','geriatrico'],'Aumento de Barthel ≥ 10 pontos',60,10),
  ('marcha','Treino de marcha',ARRAY['neuro','orto','geriatrico'],'Marcha com supervisão por 10 m',45,20),
  ('equilibrio','Melhorar equilíbrio',ARRAY['neuro','geriatrico'],'Aumento de Berg ≥ 8 pontos',45,30),
  ('prevencao_quedas','Prevenir quedas',ARRAY['geriatrico','neuro'],'Sem novas quedas em 90 dias',90,40),
  ('forca','Ganho de força muscular',ARRAY['orto','neuro','geriatrico'],'MRC médio +1 grau no segmento alvo',45,50),
  ('dor','Reduzir dor',ARRAY['orto','geriatrico'],'EVA reduzida em ≥ 3 pontos',30,60),
  ('adl','Independência em AVDs',ARRAY['neuro','geriatrico'],'Aumento de Katz ≥ 1 ponto',60,70),
  ('transferencias','Treino de transferências',ARRAY['neuro','orto','geriatrico'],'Transferência independente cama-cadeira',45,80),
  ('respiratorio','Otimizar função respiratória',ARRAY['respiratorio'],'Redução da dispneia (mMRC -1)',60,90),
  ('tolerancia_esforço','Aumentar tolerância ao esforço',ARRAY['respiratorio'],'+50 m no TC6 ou equivalente',90,100),
  ('dispneia','Reduzir dispneia',ARRAY['respiratorio'],'mMRC reduzida em ≥ 1 ponto',45,110),
  ('fadiga','Manejar fadiga',ARRAY['neuro','respiratorio'],'Redução percebida da fadiga',60,120),
  ('postura','Adequação postural',ARRAY['orto','neuro'],'Melhora dos pontos posturais alterados',60,130),
  ('prevencao_lpp','Prevenir lesão por pressão',ARRAY['geriatrico','neuro','paliativo'],'Sem LPP em 90 dias; Braden estável',90,140),
  ('protetizacao','Treino com prótese',ARRAY['orto'],'Marcha com prótese ≥ 50 m',90,150),
  ('conforto','Conforto e qualidade de vida',ARRAY['paliativo'],'Sintomas controlados conforme avaliação clínica',30,160)
ON CONFLICT (code) DO NOTHING;

-- 9) SEED — regras de classificação de risco ---------------------------------

INSERT INTO public.catalog_risk_classifications (risk_type, source_scale_code, rules) VALUES
  ('falls','berg','[
     {"min":0,"max":20,"label":"Alto","severity":"high"},
     {"min":21,"max":40,"label":"Moderado","severity":"moderate"},
     {"min":41,"max":56,"label":"Baixo","severity":"low"}
   ]'::jsonb),
  ('falls','tinetti','[
     {"min":0,"max":18,"label":"Alto","severity":"high"},
     {"min":19,"max":23,"label":"Moderado","severity":"moderate"},
     {"min":24,"max":28,"label":"Baixo","severity":"low"}
   ]'::jsonb),
  ('pressure','braden','[
     {"min":6,"max":12,"label":"Alto","severity":"high"},
     {"min":13,"max":14,"label":"Moderado","severity":"moderate"},
     {"min":15,"max":23,"label":"Baixo","severity":"low"}
   ]'::jsonb),
  ('dependency','barthel','[
     {"min":0,"max":20,"label":"Total","severity":"total"},
     {"min":21,"max":40,"label":"Alta","severity":"high"},
     {"min":41,"max":60,"label":"Moderada","severity":"moderate"},
     {"min":61,"max":100,"label":"Baixa","severity":"low"}
   ]'::jsonb),
  ('dependency','katz','[
     {"min":0,"max":3,"label":"Alta","severity":"high"},
     {"min":4,"max":5,"label":"Moderada","severity":"moderate"},
     {"min":6,"max":6,"label":"Baixa","severity":"low"}
   ]'::jsonb)
ON CONFLICT (risk_type, source_scale_code) DO NOTHING;
