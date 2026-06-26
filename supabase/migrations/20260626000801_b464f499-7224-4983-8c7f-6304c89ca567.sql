-- Garante restrição UNIQUE em clinic_settings.clinic_id para permitir upsert por clinic_id
ALTER TABLE public.clinic_settings
  ADD CONSTRAINT clinic_settings_clinic_id_key UNIQUE (clinic_id);