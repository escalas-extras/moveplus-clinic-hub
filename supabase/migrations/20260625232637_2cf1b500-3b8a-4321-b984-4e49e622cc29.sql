DROP POLICY IF EXISTS documents_read_authenticated ON storage.objects;
CREATE POLICY documents_read_authenticated ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.clinical_documents d
        WHERE d.pdf_url = storage.objects.name
          AND public.can_access_clinic(d.clinic_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.receipts r
        WHERE r.pdf_path = storage.objects.name
          AND public.can_access_clinic(r.clinic_id)
      )
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        AND (storage.foldername(name))[2] = 'branding'
        AND public.can_access_clinic(((storage.foldername(name))[1])::uuid)
      )
      OR auth.uid()::text = owner_id
    )
  );

DROP POLICY IF EXISTS documents_insert_authenticated ON storage.objects;
CREATE POLICY documents_insert_authenticated ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND owner_id = auth.uid()::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND (
      (
        (storage.foldername(name))[2] = 'branding'
        AND (
          public.can_manage_clinic(((storage.foldername(name))[1])::uuid)
          OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        )
      )
      OR (
        COALESCE((storage.foldername(name))[2], '') <> 'branding'
        AND public.is_member_of(((storage.foldername(name))[1])::uuid)
      )
    )
  );