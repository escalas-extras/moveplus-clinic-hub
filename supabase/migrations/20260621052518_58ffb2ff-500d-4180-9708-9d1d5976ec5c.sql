
-- ===========================================================
-- BLOCO III — MULTI-TENANT DEFINITIVO
-- ===========================================================

-- 1) Add clinic_id columns (nullable first for backfill)
ALTER TABLE public.patients              ADD COLUMN IF NOT EXISTS clinic_id uuid;
ALTER TABLE public.professionals         ADD COLUMN IF NOT EXISTS clinic_id uuid;
ALTER TABLE public.assessments           ADD COLUMN IF NOT EXISTS clinic_id uuid;
ALTER TABLE public.evolutions            ADD COLUMN IF NOT EXISTS clinic_id uuid;
ALTER TABLE public.appointments          ADD COLUMN IF NOT EXISTS clinic_id uuid;
ALTER TABLE public.reassessment_schedule ADD COLUMN IF NOT EXISTS clinic_id uuid;

-- 2) Backfill — todos registros existentes pertencem à Move 60+
DO $$
DECLARE v_move uuid;
BEGIN
  SELECT id INTO v_move FROM public.clinics WHERE slug = 'move-60-' OR nome = 'Move 60+' LIMIT 1;
  IF v_move IS NULL THEN
    RAISE NOTICE 'Move 60+ não encontrada — pulando backfill';
    RETURN;
  END IF;
  UPDATE public.patients              SET clinic_id = v_move WHERE clinic_id IS NULL;
  UPDATE public.professionals         SET clinic_id = v_move WHERE clinic_id IS NULL;
  UPDATE public.assessments           SET clinic_id = v_move WHERE clinic_id IS NULL;
  UPDATE public.evolutions            SET clinic_id = v_move WHERE clinic_id IS NULL;
  UPDATE public.appointments          SET clinic_id = v_move WHERE clinic_id IS NULL;
  UPDATE public.reassessment_schedule SET clinic_id = v_move WHERE clinic_id IS NULL;
END $$;

-- 3) FKs + indexes
ALTER TABLE public.patients              DROP CONSTRAINT IF EXISTS patients_clinic_fk;
ALTER TABLE public.patients              ADD CONSTRAINT patients_clinic_fk              FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE RESTRICT;
ALTER TABLE public.professionals         DROP CONSTRAINT IF EXISTS professionals_clinic_fk;
ALTER TABLE public.professionals         ADD CONSTRAINT professionals_clinic_fk         FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE RESTRICT;
ALTER TABLE public.assessments           DROP CONSTRAINT IF EXISTS assessments_clinic_fk;
ALTER TABLE public.assessments           ADD CONSTRAINT assessments_clinic_fk           FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE RESTRICT;
ALTER TABLE public.evolutions            DROP CONSTRAINT IF EXISTS evolutions_clinic_fk;
ALTER TABLE public.evolutions            ADD CONSTRAINT evolutions_clinic_fk            FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE RESTRICT;
ALTER TABLE public.appointments          DROP CONSTRAINT IF EXISTS appointments_clinic_fk;
ALTER TABLE public.appointments          ADD CONSTRAINT appointments_clinic_fk          FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE RESTRICT;
ALTER TABLE public.reassessment_schedule DROP CONSTRAINT IF EXISTS reassessment_schedule_clinic_fk;
ALTER TABLE public.reassessment_schedule ADD CONSTRAINT reassessment_schedule_clinic_fk FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_patients_clinic              ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_professionals_clinic         ON public.professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_assessments_clinic           ON public.assessments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_clinic            ON public.evolutions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic          ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reassessment_schedule_clinic ON public.reassessment_schedule(clinic_id);

-- 4) Trigger: default clinic_id := current_clinic_id() em INSERT
CREATE OR REPLACE FUNCTION public.fn_default_clinic_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN
    NEW.clinic_id := public.current_clinic_id();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['patients','professionals','assessments','evolutions','appointments','reassessment_schedule']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_default_clinic_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_default_clinic_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_default_clinic_id()', t);
  END LOOP;
END $$;

-- 5) NOT NULL agora que tudo está preenchido e protegido por trigger
ALTER TABLE public.patients              ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.professionals         ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.assessments           ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.evolutions            ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.appointments          ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.reassessment_schedule ALTER COLUMN clinic_id SET NOT NULL;

-- ===========================================================
-- 6) Helpers de RLS / Suporte
-- ===========================================================
CREATE OR REPLACE FUNCTION public.current_support_session_clinic()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.support_sessions
  WHERE super_admin_id = auth.uid() AND ended_at IS NULL
  ORDER BY started_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
      OR public.is_member_of(_clinic_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
      OR public.has_role_in(_clinic_id,'owner')
      OR public.has_role_in(_clinic_id,'admin');
$$;

-- Bloqueio de escrita em modo suporte (super admin com sessão ativa não pode escrever)
CREATE OR REPLACE FUNCTION public.fn_block_support_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_support_session_clinic() IS NOT NULL THEN
    RAISE EXCEPTION 'Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.'
      USING ERRCODE='insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['patients','professionals','assessments','evolutions','appointments','reassessment_schedule','clinical_documents','financial_entries']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.%I', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.%I', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_block_support_writes_ins BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes()', t);
    EXECUTE format('CREATE TRIGGER trg_block_support_writes_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes()', t);
    EXECUTE format('CREATE TRIGGER trg_block_support_writes_del BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes()', t);
  END LOOP;
END $$;

-- ===========================================================
-- 7) RLS multi-clínica — reescreve políticas
-- ===========================================================

-- PATIENTS
DROP POLICY IF EXISTS "patients read authed"         ON public.patients;
DROP POLICY IF EXISTS "patients insert as self"      ON public.patients;
DROP POLICY IF EXISTS "patients update own or admin" ON public.patients;
DROP POLICY IF EXISTS "patients delete admin"        ON public.patients;
CREATE POLICY "patients tenant select" ON public.patients FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "patients tenant insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.can_access_clinic(clinic_id));
CREATE POLICY "patients tenant update" ON public.patients FOR UPDATE TO authenticated
  USING (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "patients tenant delete" ON public.patients FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

-- PROFESSIONALS
DROP POLICY IF EXISTS "prof read all authed" ON public.professionals;
DROP POLICY IF EXISTS "prof admin write"     ON public.professionals;
CREATE POLICY "professionals tenant select" ON public.professionals FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "professionals tenant insert" ON public.professionals FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));
CREATE POLICY "professionals tenant update" ON public.professionals FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));
CREATE POLICY "professionals tenant delete" ON public.professionals FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

-- ASSESSMENTS
DROP POLICY IF EXISTS "assess read authed"                  ON public.assessments;
DROP POLICY IF EXISTS "assess insert own or admin"          ON public.assessments;
DROP POLICY IF EXISTS "assess update own unlocked or admin" ON public.assessments;
DROP POLICY IF EXISTS "assess delete admin"                 ON public.assessments;
CREATE POLICY "assessments tenant select" ON public.assessments FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "assessments tenant insert" ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "assessments tenant update" ON public.assessments FOR UPDATE TO authenticated
  USING ((locked_at IS NULL AND public.is_member_of(clinic_id)) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK ((locked_at IS NULL AND public.is_member_of(clinic_id)) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "assessments tenant delete" ON public.assessments FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

-- EVOLUTIONS
DROP POLICY IF EXISTS "evo read authed"                  ON public.evolutions;
DROP POLICY IF EXISTS "evo insert own or admin"          ON public.evolutions;
DROP POLICY IF EXISTS "evo update own unlocked or admin" ON public.evolutions;
DROP POLICY IF EXISTS "evo delete admin"                 ON public.evolutions;
CREATE POLICY "evolutions tenant select" ON public.evolutions FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "evolutions tenant insert" ON public.evolutions FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "evolutions tenant update" ON public.evolutions FOR UPDATE TO authenticated
  USING ((locked_at IS NULL AND public.is_member_of(clinic_id)) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK ((locked_at IS NULL AND public.is_member_of(clinic_id)) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "evolutions tenant delete" ON public.evolutions FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

-- APPOINTMENTS
DROP POLICY IF EXISTS "appt read authed"         ON public.appointments;
DROP POLICY IF EXISTS "appt insert own or admin" ON public.appointments;
DROP POLICY IF EXISTS "appt update own or admin" ON public.appointments;
DROP POLICY IF EXISTS "appt delete own or admin" ON public.appointments;
CREATE POLICY "appointments tenant select" ON public.appointments FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "appointments tenant insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "appointments tenant update" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "appointments tenant delete" ON public.appointments FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

-- REASSESSMENT_SCHEDULE
DROP POLICY IF EXISTS reass_select ON public.reassessment_schedule;
DROP POLICY IF EXISTS reass_insert ON public.reassessment_schedule;
DROP POLICY IF EXISTS reass_update ON public.reassessment_schedule;
DROP POLICY IF EXISTS reass_delete ON public.reassessment_schedule;
CREATE POLICY "reass tenant select" ON public.reassessment_schedule FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "reass tenant insert" ON public.reassessment_schedule FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "reass tenant update" ON public.reassessment_schedule FOR UPDATE TO authenticated
  USING (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_member_of(clinic_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "reass tenant delete" ON public.reassessment_schedule FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

-- ===========================================================
-- 8) Comercial: trial_ends_at, suspended_at, canceled_at
-- ===========================================================
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS trial_ends_at  timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at   timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at    timestamptz;

-- Sincroniza datas conforme status muda
CREATE OR REPLACE FUNCTION public.fn_sync_clinic_lifecycle_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'suspended' AND NEW.suspended_at IS NULL THEN NEW.suspended_at := now(); END IF;
    IF NEW.status = 'active'    AND OLD.status='suspended' THEN NEW.suspended_at := NULL; END IF;
    IF NEW.status = 'canceled'  AND NEW.canceled_at  IS NULL THEN NEW.canceled_at  := now(); END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_clinic_lifecycle ON public.clinics;
CREATE TRIGGER trg_sync_clinic_lifecycle BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_clinic_lifecycle_dates();

-- ===========================================================
-- 9) Auditoria SaaS — enriquece colunas
-- ===========================================================
ALTER TABLE public.saas_audit_log
  ADD COLUMN IF NOT EXISTS clinic_id  uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS details    jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text;
CREATE INDEX IF NOT EXISTS idx_saas_audit_clinic  ON public.saas_audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_action  ON public.saas_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_saas_audit_created ON public.saas_audit_log(created_at DESC);

-- ===========================================================
-- 10) Support sessions — campos extras + funções start/stop
-- ===========================================================
ALTER TABLE public.support_sessions
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes  text;

CREATE OR REPLACE FUNCTION public.start_support_session(_clinic_id uuid, _reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito a super_admin';
  END IF;
  -- encerra qualquer sessão pendente do mesmo super admin
  UPDATE public.support_sessions
     SET ended_at = now(), active = false
   WHERE super_admin_id = auth.uid() AND ended_at IS NULL;
  INSERT INTO public.support_sessions (super_admin_id, clinic_id, reason, started_at, active)
  VALUES (auth.uid(), _clinic_id, _reason, now(), true)
  RETURNING id INTO v_id;
  INSERT INTO public.saas_audit_log (user_id, action, entity_type, entity_id, clinic_id, details)
  VALUES (auth.uid(), 'support.start', 'support_session', v_id, _clinic_id, jsonb_build_object('reason', _reason));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.end_support_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito a super_admin';
  END IF;
  SELECT id, clinic_id, started_at INTO r FROM public.support_sessions
   WHERE super_admin_id = auth.uid() AND ended_at IS NULL
   ORDER BY started_at DESC LIMIT 1;
  IF r.id IS NULL THEN RETURN; END IF;
  UPDATE public.support_sessions
     SET ended_at = now(), active = false
   WHERE id = r.id;
  INSERT INTO public.saas_audit_log (user_id, action, entity_type, entity_id, clinic_id, details)
  VALUES (auth.uid(), 'support.end', 'support_session', r.id, r.clinic_id,
          jsonb_build_object('duration_seconds', EXTRACT(EPOCH FROM (now() - r.started_at))));
END $$;
