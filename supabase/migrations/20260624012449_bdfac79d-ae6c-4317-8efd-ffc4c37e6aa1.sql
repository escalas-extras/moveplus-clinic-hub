-- Restrict policies to authenticated role only, and tighten documents bucket access

-- clinical_documents
DROP POLICY IF EXISTS docs_tenant_select ON public.clinical_documents;
DROP POLICY IF EXISTS docs_tenant_update ON public.clinical_documents;
DROP POLICY IF EXISTS docs_tenant_delete ON public.clinical_documents;

CREATE POLICY docs_tenant_select ON public.clinical_documents
  FOR SELECT TO authenticated
  USING (can_access_clinic(clinic_id));

CREATE POLICY docs_tenant_update ON public.clinical_documents
  FOR UPDATE TO authenticated
  USING (is_member_of(clinic_id) AND (locked_at IS NULL))
  WITH CHECK (is_member_of(clinic_id));

CREATE POLICY docs_tenant_delete ON public.clinical_documents
  FOR DELETE TO authenticated
  USING (can_manage_clinic(clinic_id));

-- documents (table, not bucket)
DROP POLICY IF EXISTS "doc delete admin" ON public.documents;
CREATE POLICY "doc delete admin" ON public.documents
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- patient_attachments
DROP POLICY IF EXISTS attach_tenant_select ON public.patient_attachments;
DROP POLICY IF EXISTS attach_tenant_insert ON public.patient_attachments;
DROP POLICY IF EXISTS attach_tenant_update ON public.patient_attachments;
DROP POLICY IF EXISTS attach_tenant_delete ON public.patient_attachments;

CREATE POLICY attach_tenant_select ON public.patient_attachments
  FOR SELECT TO authenticated
  USING (can_access_patient(patient_id));

CREATE POLICY attach_tenant_insert ON public.patient_attachments
  FOR INSERT TO authenticated
  WITH CHECK (can_access_patient(patient_id));

CREATE POLICY attach_tenant_update ON public.patient_attachments
  FOR UPDATE TO authenticated
  USING (can_access_patient(patient_id))
  WITH CHECK (can_access_patient(patient_id));

CREATE POLICY attach_tenant_delete ON public.patient_attachments
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_attachments.patient_id
        AND can_manage_clinic(p.clinic_id)
    )
  );

-- Storage: restrict documents bucket reads/inserts to files owned by the user's clinic.
-- Files are referenced from public.clinical_documents.pdf_url and public.receipts.pdf_path.
DROP POLICY IF EXISTS documents_read_authenticated ON storage.objects;
DROP POLICY IF EXISTS documents_insert_authenticated ON storage.objects;

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
      OR auth.uid()::text = owner_id
    )
  );

CREATE POLICY documents_insert_authenticated ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND owner_id = auth.uid()::text
  );
