
-- 1) Assessments update — scope to authenticated role
DROP POLICY IF EXISTS "assessments tenant update" ON public.assessments;
CREATE POLICY "assessments tenant update" ON public.assessments
  FOR UPDATE TO authenticated
  USING (((locked_at IS NULL) AND is_member_of(clinic_id)) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_member_of(clinic_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 2) Evolutions update — scope to authenticated role
DROP POLICY IF EXISTS "evolutions tenant update" ON public.evolutions;
CREATE POLICY "evolutions tenant update" ON public.evolutions
  FOR UPDATE TO authenticated
  USING (((locked_at IS NULL) AND is_member_of(clinic_id)) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_member_of(clinic_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3) Clinics select — restrict to membership / super_admin
DROP POLICY IF EXISTS clinics_select ON public.clinics;
CREATE POLICY clinics_select ON public.clinics
  FOR SELECT TO authenticated
  USING (public.is_member_of(id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4) Documents bucket insert — require clinic_id folder prefix matching membership
DROP POLICY IF EXISTS documents_insert_authenticated ON storage.objects;
CREATE POLICY documents_insert_authenticated ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND owner_id = (auth.uid())::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.is_member_of(((storage.foldername(name))[1])::uuid)
  );
