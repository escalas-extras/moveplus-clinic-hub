
-- 1) Allow 'deleted' status on clinics (soft delete)
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_status_check;
ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_status_check
  CHECK (status = ANY (ARRAY['active','inactive','suspended','deleted','canceled']));

-- 2) Make access helpers ignore deleted clinics
CREATE OR REPLACE FUNCTION public.is_member_of(_clinic_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.user_id = auth.uid()
      AND cm.clinic_id = _clinic_id
      AND cm.active = true
      AND c.status <> 'deleted'
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_clinic(_clinic_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_support_clinic uuid;
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.clinics WHERE id = _clinic_id;
  IF v_status = 'deleted' THEN RETURN false; END IF;

  v_support_clinic := public.current_support_session_clinic();
  IF v_support_clinic IS NOT NULL THEN
    RETURN _clinic_id = v_support_clinic;
  END IF;

  RETURN public.is_member_of(_clinic_id);
END;
$function$;

-- 3) Storage policies for user-avatars bucket
-- Path convention: {user_id}/avatar.{ext}
DROP POLICY IF EXISTS "user_avatars_self_read"   ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_self_write"  ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_self_update" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_self_delete" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_clinic_read" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_super_read"  ON storage.objects;

CREATE POLICY "user_avatars_self_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_avatars_self_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_avatars_self_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_avatars_self_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_avatars_clinic_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND public.shares_clinic_with(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "user_avatars_super_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND public.has_role(auth.uid(), 'super_admin')
);
