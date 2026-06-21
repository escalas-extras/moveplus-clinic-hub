
-- 1) can_access_patient: escopo por clínica do paciente, não por papel global
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = _patient_id
          AND public.is_member_of(p.clinic_id)
      );
$$;

-- 2) clinical_documents: usar clinic_id (multi-tenant) e remover bypass admin global
DROP POLICY IF EXISTS docs_select_owner ON public.clinical_documents;
DROP POLICY IF EXISTS docs_update ON public.clinical_documents;
DROP POLICY IF EXISTS docs_delete ON public.clinical_documents;

CREATE POLICY docs_tenant_select ON public.clinical_documents
  FOR SELECT USING (public.can_access_clinic(clinic_id));
CREATE POLICY docs_tenant_update ON public.clinical_documents
  FOR UPDATE USING (public.is_member_of(clinic_id) AND locked_at IS NULL)
  WITH CHECK (public.is_member_of(clinic_id));
CREATE POLICY docs_tenant_delete ON public.clinical_documents
  FOR DELETE USING (public.can_manage_clinic(clinic_id));

-- 3) patient_attachments: substituir leitura aberta a qualquer autenticado
DROP POLICY IF EXISTS "attach read authed" ON public.patient_attachments;
DROP POLICY IF EXISTS "attach insert authed" ON public.patient_attachments;
DROP POLICY IF EXISTS "attach update own or admin" ON public.patient_attachments;
DROP POLICY IF EXISTS "attach delete admin" ON public.patient_attachments;

CREATE POLICY attach_tenant_select ON public.patient_attachments
  FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY attach_tenant_insert ON public.patient_attachments
  FOR INSERT WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY attach_tenant_update ON public.patient_attachments
  FOR UPDATE USING (public.can_access_patient(patient_id))
  WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY attach_tenant_delete ON public.patient_attachments
  FOR DELETE USING (
    public.has_role(auth.uid(),'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND public.can_manage_clinic(p.clinic_id)
    )
  );

-- 4) financial_entries: remover bypass admin global; escopo via paciente/profissional
DROP POLICY IF EXISTS "fin admin all" ON public.financial_entries;
DROP POLICY IF EXISTS "fin prof read own" ON public.financial_entries;
DROP POLICY IF EXISTS "fin prof insert own" ON public.financial_entries;
DROP POLICY IF EXISTS "fin prof update own" ON public.financial_entries;
DROP POLICY IF EXISTS "fin prof delete own" ON public.financial_entries;

CREATE POLICY fin_tenant_select ON public.financial_entries
  FOR SELECT USING (
    public.has_role(auth.uid(),'super_admin')
    OR (patient_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = patient_id AND public.is_member_of(p.clinic_id)
    ))
    OR (professional_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.id = professional_id AND public.is_member_of(pr.clinic_id)
    ))
  );
CREATE POLICY fin_tenant_insert ON public.financial_entries
  FOR INSERT WITH CHECK (
    (patient_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = patient_id AND public.is_member_of(p.clinic_id)
    ))
    OR (professional_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.id = professional_id AND public.is_member_of(pr.clinic_id)
    ))
  );
CREATE POLICY fin_tenant_update ON public.financial_entries
  FOR UPDATE USING (
    public.has_role(auth.uid(),'super_admin')
    OR (patient_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = patient_id AND public.can_manage_clinic(p.clinic_id)
    ))
    OR (professional_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.id = professional_id AND public.can_manage_clinic(pr.clinic_id)
    ))
  ) WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR (patient_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = patient_id AND public.is_member_of(p.clinic_id)
    ))
    OR (professional_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.id = professional_id AND public.is_member_of(pr.clinic_id)
    ))
  );
CREATE POLICY fin_tenant_delete ON public.financial_entries
  FOR DELETE USING (
    public.has_role(auth.uid(),'super_admin')
    OR (patient_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = patient_id AND public.can_manage_clinic(p.clinic_id)
    ))
    OR (professional_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.id = professional_id AND public.can_manage_clinic(pr.clinic_id)
    ))
  );
