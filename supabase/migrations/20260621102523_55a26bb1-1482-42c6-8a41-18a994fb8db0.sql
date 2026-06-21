DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.professionals;

DROP POLICY IF EXISTS "professionals tenant insert" ON public.professionals;

CREATE POLICY "professionals tenant insert"
  ON public.professionals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_clinic(clinic_id)
    OR (
      public.has_role(auth.uid(), 'super_admin')
      AND public.current_support_session_clinic() = clinic_id
    )
  );