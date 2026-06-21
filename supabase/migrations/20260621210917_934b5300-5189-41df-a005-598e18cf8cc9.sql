DROP POLICY IF EXISTS "receipts tenant insert" ON public.receipts;
DROP POLICY IF EXISTS "receipts tenant update" ON public.receipts;

CREATE POLICY "receipts tenant insert" ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_clinic(clinic_id)
    OR public.has_role_in(clinic_id, 'financeiro')
  );

CREATE POLICY "receipts tenant update" ON public.receipts
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_clinic(clinic_id)
    OR public.has_role_in(clinic_id, 'financeiro')
  )
  WITH CHECK (
    public.can_manage_clinic(clinic_id)
    OR public.has_role_in(clinic_id, 'financeiro')
  );

GRANT SELECT, INSERT, UPDATE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;