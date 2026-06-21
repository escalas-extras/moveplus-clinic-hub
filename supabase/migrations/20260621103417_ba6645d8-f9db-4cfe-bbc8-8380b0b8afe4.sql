
-- Helper: dois usuários compartilham clínica ativa
CREATE OR REPLACE FUNCTION public.shares_clinic_with(_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members a
    JOIN public.clinic_members b ON a.clinic_id = b.clinic_id
    WHERE a.user_id = auth.uid()
      AND b.user_id = _other_user_id
      AND a.active = true
      AND b.active = true
  );
$$;

-- profiles: remover bypass global 'admin'; permitir auto, super_admin ou colegas de clínica
DROP POLICY IF EXISTS "profiles self select" ON public.profiles;
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin insert" ON public.profiles;

CREATE POLICY "profiles read scoped"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.shares_clinic_with(id)
);

CREATE POLICY "profiles self update"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles insert self"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- user_roles: remover bypass global 'admin'; manter self ou super_admin (e colegas de clínica para listar perfis)
DROP POLICY IF EXISTS "user_roles self read" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin delete" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin update" ON public.user_roles;

CREATE POLICY "user_roles read scoped"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.shares_clinic_with(user_id)
);

CREATE POLICY "user_roles super admin write"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Corrigir dado: vero (Move+) não deve ter role global 'admin'
DELETE FROM public.user_roles
WHERE user_id = '8a598a84-ffb7-4ac6-a5cf-6e2bdacce0e3'
  AND role = 'admin';
