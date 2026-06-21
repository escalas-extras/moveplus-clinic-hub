
-- 1) clinic_settings: remover policy global e aplicar isolamento por clínica
DROP POLICY IF EXISTS "clinic read all authed" ON public.clinic_settings;
DROP POLICY IF EXISTS "clinic admin write" ON public.clinic_settings;

CREATE POLICY "clinic_settings tenant select" ON public.clinic_settings
  FOR SELECT TO authenticated
  USING (
    clinic_id IS NULL  -- registros legados sem clínica: só super_admin
      AND public.has_role(auth.uid(),'super_admin')
    OR public.can_access_clinic(clinic_id)
  );

CREATE POLICY "clinic_settings tenant insert" ON public.clinic_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

CREATE POLICY "clinic_settings tenant update" ON public.clinic_settings
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

CREATE POLICY "clinic_settings tenant delete" ON public.clinic_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- 2) patient_discharges: substituir can_access_patient (created_by) por clínica do paciente
DROP POLICY IF EXISTS "Users see discharges of their patients" ON public.patient_discharges;
DROP POLICY IF EXISTS "Users create discharges for their patients" ON public.patient_discharges;
DROP POLICY IF EXISTS "Users update own non-locked discharges" ON public.patient_discharges;
DROP POLICY IF EXISTS "Admins manage discharges" ON public.patient_discharges;

CREATE POLICY "discharges tenant select" ON public.patient_discharges
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_discharges.patient_id
      AND public.can_access_clinic(p.clinic_id)
  ));

CREATE POLICY "discharges tenant insert" ON public.patient_discharges
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_discharges.patient_id
      AND public.can_access_clinic(p.clinic_id)
  ));

CREATE POLICY "discharges tenant update" ON public.patient_discharges
  FOR UPDATE TO authenticated
  USING (
    locked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_discharges.patient_id
        AND public.is_member_of(p.clinic_id)
    )
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE POLICY "discharges tenant delete" ON public.patient_discharges
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_discharges.patient_id
      AND public.can_manage_clinic(p.clinic_id)
  ));
