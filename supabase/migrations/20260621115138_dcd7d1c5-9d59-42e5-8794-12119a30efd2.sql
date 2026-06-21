
-- =====================================================
-- BLOCO C — Tenant-scoping RLS for templates, library,
-- marketing. Replaces global has_role('admin') checks
-- with clinic-scoped helpers so cross-tenant leakage
-- becomes impossible at the database layer.
-- =====================================================

-- ---------- document_templates ----------
DROP POLICY IF EXISTS doc_templates_admin ON public.document_templates;
DROP POLICY IF EXISTS doc_templates_read  ON public.document_templates;

-- Read: members of the owning clinic (or global templates with clinic_id IS NULL).
-- Super_admin only sees data when impersonating via support session.
CREATE POLICY doc_templates_select ON public.document_templates
  FOR SELECT TO authenticated
  USING (
    clinic_id IS NULL
    OR public.can_access_clinic(clinic_id)
  );

-- Write: owner/admin of the clinic; global templates only via super_admin in support mode is denied (read-only).
CREATE POLICY doc_templates_insert ON public.document_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id IS NOT NULL
    AND public.can_manage_clinic(clinic_id)
  );

CREATE POLICY doc_templates_update ON public.document_templates
  FOR UPDATE TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  WITH CHECK (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));

CREATE POLICY doc_templates_delete ON public.document_templates
  FOR DELETE TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));

-- Auto-fill clinic_id on insert based on active clinic.
DROP TRIGGER IF EXISTS trg_doc_templates_default_clinic ON public.document_templates;
CREATE TRIGGER trg_doc_templates_default_clinic
  BEFORE INSERT ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_default_clinic_id();

-- ---------- library_categories ----------
DROP POLICY IF EXISTS lib_cat_admin_all ON public.library_categories;
DROP POLICY IF EXISTS lib_cat_read     ON public.library_categories;

-- Global categories visible to everyone authenticated; clinic-scoped only to members.
CREATE POLICY lib_cat_select ON public.library_categories
  FOR SELECT TO authenticated
  USING (
    scope = 'global'
    OR (clinic_id IS NOT NULL AND public.can_access_clinic(clinic_id))
  );

-- Only super_admin can manage global categories; owners/admins manage their clinic categories.
CREATE POLICY lib_cat_insert ON public.library_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

CREATE POLICY lib_cat_update ON public.library_categories
  FOR UPDATE TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

CREATE POLICY lib_cat_delete ON public.library_categories
  FOR DELETE TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

-- ---------- library_contents ----------
DROP POLICY IF EXISTS lib_contents_read   ON public.library_contents;
DROP POLICY IF EXISTS lib_contents_insert ON public.library_contents;
DROP POLICY IF EXISTS lib_contents_update ON public.library_contents;
DROP POLICY IF EXISTS lib_contents_delete ON public.library_contents;

-- Read: global to everyone; shared/private clinic-scoped only to members of that clinic.
CREATE POLICY lib_contents_select ON public.library_contents
  FOR SELECT TO authenticated
  USING (
    scope = 'global'
    OR (clinic_id IS NOT NULL AND public.can_access_clinic(clinic_id))
  );

CREATE POLICY lib_contents_insert ON public.library_contents
  FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

CREATE POLICY lib_contents_update ON public.library_contents
  FOR UPDATE TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

CREATE POLICY lib_contents_delete ON public.library_contents
  FOR DELETE TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

-- ---------- marketing_calendar ----------
DROP POLICY IF EXISTS mkt_cal_read  ON public.marketing_calendar;
DROP POLICY IF EXISTS mkt_cal_write ON public.marketing_calendar;

CREATE POLICY mkt_cal_select ON public.marketing_calendar
  FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_access_clinic(clinic_id));

CREATE POLICY mkt_cal_insert ON public.marketing_calendar
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));

CREATE POLICY mkt_cal_update ON public.marketing_calendar
  FOR UPDATE TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  WITH CHECK (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));

CREATE POLICY mkt_cal_delete ON public.marketing_calendar
  FOR DELETE TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));

DROP TRIGGER IF EXISTS trg_mkt_cal_default_clinic ON public.marketing_calendar;
CREATE TRIGGER trg_mkt_cal_default_clinic
  BEFORE INSERT ON public.marketing_calendar
  FOR EACH ROW EXECUTE FUNCTION public.fn_default_clinic_id();

-- ---------- financial_entries ----------
-- Já é tenant-scoped indiretamente via patient/professional. Adicionamos
-- coluna clinic_id explícita + trigger de default para permitir queries
-- client-side eficientes com .eq('clinic_id', ...) sem JOIN.
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Backfill a partir do paciente ou profissional vinculado.
UPDATE public.financial_entries f
   SET clinic_id = COALESCE(
        (SELECT p.clinic_id FROM public.patients p WHERE p.id = f.patient_id),
        (SELECT pr.clinic_id FROM public.professionals pr WHERE pr.id = f.professional_id)
     )
 WHERE f.clinic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_clinic ON public.financial_entries(clinic_id);

DROP TRIGGER IF EXISTS trg_fin_default_clinic ON public.financial_entries;
CREATE TRIGGER trg_fin_default_clinic
  BEFORE INSERT ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_default_clinic_id();

-- Reforça as policies usando clinic_id direto (mantém compatibilidade com paciente/profissional).
DROP POLICY IF EXISTS fin_tenant_select ON public.financial_entries;
DROP POLICY IF EXISTS fin_tenant_insert ON public.financial_entries;
DROP POLICY IF EXISTS fin_tenant_update ON public.financial_entries;
DROP POLICY IF EXISTS fin_tenant_delete ON public.financial_entries;

CREATE POLICY fin_tenant_select ON public.financial_entries
  FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_access_clinic(clinic_id));

CREATE POLICY fin_tenant_insert ON public.financial_entries
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IS NOT NULL AND public.can_access_clinic(clinic_id));

CREATE POLICY fin_tenant_update ON public.financial_entries
  FOR UPDATE TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  WITH CHECK (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));

CREATE POLICY fin_tenant_delete ON public.financial_entries
  FOR DELETE TO authenticated
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id));
