-- Permitir que super_admin em modo Suporte edite cadastros administrativos (professionals).
-- Prontuário clínico continua bloqueado (patients, assessments, evolutions, appointments,
-- financial_entries, reassessment_schedule, clinical_documents).

DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.professionals;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.professionals;

DROP POLICY IF EXISTS "professionals tenant update" ON public.professionals;
CREATE POLICY "professionals tenant update" ON public.professionals
FOR UPDATE TO authenticated
USING (
  can_manage_clinic(clinic_id)
  OR (has_role(auth.uid(), 'super_admin'::app_role) AND current_support_session_clinic() = clinic_id)
)
WITH CHECK (
  can_manage_clinic(clinic_id)
  OR (has_role(auth.uid(), 'super_admin'::app_role) AND current_support_session_clinic() = clinic_id)
);

DROP POLICY IF EXISTS "professionals tenant delete" ON public.professionals;
CREATE POLICY "professionals tenant delete" ON public.professionals
FOR DELETE TO authenticated
USING (
  can_manage_clinic(clinic_id)
  OR (has_role(auth.uid(), 'super_admin'::app_role) AND current_support_session_clinic() = clinic_id)
);