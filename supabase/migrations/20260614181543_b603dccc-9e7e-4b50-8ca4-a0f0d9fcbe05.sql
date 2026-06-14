
-- Geriatric assessment fields (stored as JSONB to keep schema flexible)
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS doencas_previas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS habitos_anamnese jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS exame_fisico jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS postura_alinhamento jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sinais_vitais jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS med_cintura numeric,
  ADD COLUMN IF NOT EXISTS med_quadril numeric,
  ADD COLUMN IF NOT EXISTS icq numeric,
  ADD COLUMN IF NOT EXISTS nivel_consciencia text,
  ADD COLUMN IF NOT EXISTS observacoes_gerais text;

-- Evolutions: vitals + EVA
ALTER TABLE public.evolutions
  ADD COLUMN IF NOT EXISTS pa text,
  ADD COLUMN IF NOT EXISTS fc text,
  ADD COLUMN IF NOT EXISTS fr text,
  ADD COLUMN IF NOT EXISTS spo2 text,
  ADD COLUMN IF NOT EXISTS eva numeric;
