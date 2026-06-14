
-- 1. Padronização numérica
ALTER TABLE public.assessments
  ALTER COLUMN peso TYPE numeric(10,2),
  ALTER COLUMN estatura TYPE numeric(10,2),
  ALTER COLUMN imc TYPE numeric(10,2);

ALTER TABLE public.assessment_ortho
  ALTER COLUMN eva TYPE numeric(10,2);

ALTER TABLE public.assessment_vitals
  ALTER COLUMN temperatura TYPE numeric(10,2);

-- 2. Status da avaliação
DO $$ BEGIN
  CREATE TYPE public.assessment_status AS ENUM ('rascunho','finalizada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS status public.assessment_status NOT NULL DEFAULT 'rascunho';

-- 3. Políticas de Storage para o bucket 'documents' (privado, acesso autenticado)
DROP POLICY IF EXISTS "documents_read_authenticated" ON storage.objects;
CREATE POLICY "documents_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_insert_authenticated" ON storage.objects;
CREATE POLICY "documents_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_update_authenticated" ON storage.objects;
CREATE POLICY "documents_update_authenticated"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_delete_authenticated" ON storage.objects;
CREATE POLICY "documents_delete_authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');
