
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS endereco_comercial text;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS historia_clinica text,
  ADD COLUMN IF NOT EXISTS habitos_vida text,
  ADD COLUMN IF NOT EXISTS hmp text,
  ADD COLUMN IF NOT EXISTS apresentacao text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tem_exames boolean,
  ADD COLUMN IF NOT EXISTS usa_medicamentos boolean,
  ADD COLUMN IF NOT EXISTS teve_cirurgias boolean,
  ADD COLUMN IF NOT EXISTS cirurgias text,
  ADD COLUMN IF NOT EXISTS inspecao_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS semiologia text,
  ADD COLUMN IF NOT EXISTS testes_especificos text,
  ADD COLUMN IF NOT EXISTS recursos_terapeuticos text,
  ADD COLUMN IF NOT EXISTS eva numeric(4,1);

ALTER TABLE public.evolutions
  ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intercorrencias text;

CREATE INDEX IF NOT EXISTS idx_evo_assessment ON public.evolutions(assessment_id);
