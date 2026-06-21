REVOKE DELETE ON public.receipts FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;