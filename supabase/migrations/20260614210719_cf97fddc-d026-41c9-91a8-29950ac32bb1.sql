
-- Restrict deletes on clinical records to admins only (fisioterapeutas e demais profissionais não podem excluir)
DROP POLICY IF EXISTS "assess delete own or admin" ON public.assessments;
CREATE POLICY "assess delete admin" ON public.assessments FOR DELETE USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "evo delete own or admin" ON public.evolutions;
CREATE POLICY "evo delete admin" ON public.evolutions FOR DELETE USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "doc delete own or admin" ON public.documents;
CREATE POLICY "doc delete admin" ON public.documents FOR DELETE USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "attach delete own or admin" ON public.patient_attachments;
CREATE POLICY "attach delete admin" ON public.patient_attachments FOR DELETE USING (public.has_role(auth.uid(),'admin'));
