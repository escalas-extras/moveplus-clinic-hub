
-- ============ Segurança: tighten policies =============
DROP POLICY IF EXISTS "patients update authed" ON public.patients;
CREATE POLICY "patients update own or admin" ON public.patients
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "patients insert authed" ON public.patients;
CREATE POLICY "patients insert as self" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS audit_insert_any ON public.audit_log;
-- Apenas service_role (gatilhos rodam como definer, contornam RLS).
CREATE POLICY audit_no_client_insert ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- ============ Revoke EXECUTE from anon on internal SECURITY DEFINER ============
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_patient(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_professional_id() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_professional_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_audit_trigger() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_locked_updates() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_set_validation_hash() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_schedule_reassessment() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- ============ Índices de performance ==============
CREATE INDEX IF NOT EXISTS idx_assess_professional ON public.assessments(professional_id);
CREATE INDEX IF NOT EXISTS idx_assess_status ON public.assessments(status, data DESC);
CREATE INDEX IF NOT EXISTS idx_assess_clinprofile ON public.assessments USING GIN (clinical_profiles);
CREATE INDEX IF NOT EXISTS idx_assess_next_reaval ON public.assessments(next_reassessment_date) WHERE next_reassessment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON public.patients(created_by);
CREATE INDEX IF NOT EXISTS idx_patients_situacao ON public.patients(situacao);
CREATE INDEX IF NOT EXISTS idx_evo_data ON public.evolutions(data DESC);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON public.appointments(patient_id, data);
CREATE INDEX IF NOT EXISTS idx_appt_professional ON public.appointments(professional_id, data);
CREATE INDEX IF NOT EXISTS idx_fin_data ON public.financial_entries(data DESC);
CREATE INDEX IF NOT EXISTS idx_fin_patient ON public.financial_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_reaval_patient ON public.reassessment_schedule(patient_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reaval_pending ON public.reassessment_schedule(scheduled_for) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docs_validation_hash ON public.clinical_documents(validation_hash);
CREATE INDEX IF NOT EXISTS idx_docs_clinic ON public.clinical_documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_default ON public.document_templates(doc_type) WHERE is_default = true;
