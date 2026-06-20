-- BLOCO F1+F3 — White Label & Altas

-- 1) Expandir clinic_settings com branding
ALTER TABLE public.clinic_settings
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#2f5d3a',
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#c75c3a',
  ADD COLUMN IF NOT EXISTS slogan text DEFAULT 'Transformando atendimentos em resultados',
  ADD COLUMN IF NOT EXISTS app_name text DEFAULT 'FisioOS',
  ADD COLUMN IF NOT EXISTS crefito_default text;

-- 2) Tabela de altas (encerramento de tratamento)
CREATE TABLE IF NOT EXISTS public.patient_discharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id),
  data_alta date NOT NULL DEFAULT CURRENT_DATE,
  motivo text NOT NULL,
  objetivos_alcancados text,
  objetivos_pendentes text,
  recomendacoes text,
  plano_domiciliar text,
  observacoes text,
  locked_at timestamptz,
  validation_hash text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_discharges TO authenticated;
GRANT ALL ON public.patient_discharges TO service_role;

ALTER TABLE public.patient_discharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage discharges"
  ON public.patient_discharges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see discharges of their patients"
  ON public.patient_discharges FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id));

CREATE POLICY "Users create discharges for their patients"
  ON public.patient_discharges FOR INSERT TO authenticated
  WITH CHECK (public.can_access_patient(patient_id));

CREATE POLICY "Users update own non-locked discharges"
  ON public.patient_discharges FOR UPDATE TO authenticated
  USING (public.can_access_patient(patient_id) AND locked_at IS NULL)
  WITH CHECK (public.can_access_patient(patient_id));

CREATE TRIGGER trg_discharges_updated_at
  BEFORE UPDATE ON public.patient_discharges
  FOR EACH ROW EXECUTE FUNCTION public.block_locked_updates();

CREATE TRIGGER trg_discharges_hash
  BEFORE INSERT ON public.patient_discharges
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_validation_hash();

-- 3) Marcar paciente como em alta
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS data_alta date,
  ADD COLUMN IF NOT EXISTS discharge_id uuid REFERENCES public.patient_discharges(id);

CREATE INDEX IF NOT EXISTS idx_discharges_patient ON public.patient_discharges(patient_id);
CREATE INDEX IF NOT EXISTS idx_discharges_data ON public.patient_discharges(data_alta DESC);