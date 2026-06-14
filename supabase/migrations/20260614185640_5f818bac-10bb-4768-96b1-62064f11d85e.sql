
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS avaliacao_algica jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.evolutions
  ADD COLUMN IF NOT EXISTS sinais_vitais jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avaliacao_algica jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inspecao text,
  ADD COLUMN IF NOT EXISTS palpacao text,
  ADD COLUMN IF NOT EXISTS nivel_consciencia text,
  ADD COLUMN IF NOT EXISTS observacoes_gerais text;
