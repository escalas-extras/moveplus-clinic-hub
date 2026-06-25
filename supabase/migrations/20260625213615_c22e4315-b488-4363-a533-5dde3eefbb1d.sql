DROP POLICY "assessments tenant update" ON public.assessments;
CREATE POLICY "assessments tenant update" ON public.assessments
  FOR UPDATE
  USING (((locked_at IS NULL) AND is_member_of(clinic_id)) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_member_of(clinic_id) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY "evolutions tenant update" ON public.evolutions;
CREATE POLICY "evolutions tenant update" ON public.evolutions
  FOR UPDATE
  USING (((locked_at IS NULL) AND is_member_of(clinic_id)) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_member_of(clinic_id) OR has_role(auth.uid(), 'super_admin'::app_role));