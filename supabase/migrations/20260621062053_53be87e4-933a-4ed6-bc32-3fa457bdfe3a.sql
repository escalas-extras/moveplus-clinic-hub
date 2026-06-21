
-- Policies for clinic-logos bucket
CREATE POLICY "clinic_logos_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clinic-logos');

CREATE POLICY "clinic_logos_write_super_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-logos' AND public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "clinic_logos_update_super_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-logos' AND public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (bucket_id = 'clinic-logos' AND public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "clinic_logos_delete_super_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-logos' AND public.has_role(auth.uid(),'super_admin'));
