DROP POLICY IF EXISTS "modules read authed" ON public.assessment_modules;
DROP POLICY IF EXISTS "modules write own or admin" ON public.assessment_modules;
CREATE POLICY "modules tenant select" ON public.assessment_modules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)
  ));
CREATE POLICY "modules tenant insert" ON public.assessment_modules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)
  ));
CREATE POLICY "modules tenant update" ON public.assessment_modules
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)
  ));
CREATE POLICY "modules tenant delete" ON public.assessment_modules
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)
  ));

DROP POLICY IF EXISTS "neuro read authed" ON public.assessment_neuro;
DROP POLICY IF EXISTS "neuro write own or admin" ON public.assessment_neuro;
CREATE POLICY "neuro tenant select" ON public.assessment_neuro
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "neuro tenant insert" ON public.assessment_neuro
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "neuro tenant update" ON public.assessment_neuro
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "neuro tenant delete" ON public.assessment_neuro
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));

DROP POLICY IF EXISTS "ortho read authed" ON public.assessment_ortho;
DROP POLICY IF EXISTS "ortho write own or admin" ON public.assessment_ortho;
CREATE POLICY "ortho tenant select" ON public.assessment_ortho
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "ortho tenant insert" ON public.assessment_ortho
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "ortho tenant update" ON public.assessment_ortho
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "ortho tenant delete" ON public.assessment_ortho
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));

DROP POLICY IF EXISTS "postural read authed" ON public.assessment_postural;
DROP POLICY IF EXISTS "postural write own or admin" ON public.assessment_postural;
CREATE POLICY "postural tenant select" ON public.assessment_postural
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "postural tenant insert" ON public.assessment_postural
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "postural tenant update" ON public.assessment_postural
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "postural tenant delete" ON public.assessment_postural
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));

DROP POLICY IF EXISTS "vitals read authed" ON public.assessment_vitals;
DROP POLICY IF EXISTS "vitals write own or admin" ON public.assessment_vitals;
CREATE POLICY "vitals tenant select" ON public.assessment_vitals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "vitals tenant insert" ON public.assessment_vitals
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "vitals tenant update" ON public.assessment_vitals
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));
CREATE POLICY "vitals tenant delete" ON public.assessment_vitals
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.can_access_patient(a.patient_id)));

DROP POLICY IF EXISTS "drafts owner all" ON public.assessment_drafts;
CREATE POLICY "drafts tenant select" ON public.assessment_drafts
  FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id));
CREATE POLICY "drafts tenant insert" ON public.assessment_drafts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_patient(patient_id));
CREATE POLICY "drafts tenant update" ON public.assessment_drafts
  FOR UPDATE TO authenticated
  USING (public.can_access_patient(patient_id))
  WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY "drafts tenant delete" ON public.assessment_drafts
  FOR DELETE TO authenticated
  USING (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS "audit read self or admin" ON public.assessment_audit_log;
CREATE POLICY "audit tenant select" ON public.assessment_audit_log
  FOR SELECT TO authenticated
  USING ((patient_id IS NOT NULL AND public.can_access_patient(patient_id)) OR user_id = auth.uid());

DROP POLICY IF EXISTS "goals_delete" ON public.assessment_goals;
CREATE POLICY "goals_delete" ON public.assessment_goals
  FOR DELETE TO authenticated
  USING (public.can_access_patient(patient_id));
DROP POLICY IF EXISTS "gonio_delete" ON public.assessment_goniometry;
CREATE POLICY "gonio_delete" ON public.assessment_goniometry
  FOR DELETE TO authenticated
  USING (public.can_access_patient(patient_id));
DROP POLICY IF EXISTS "mrc_delete" ON public.assessment_mrc;
CREATE POLICY "mrc_delete" ON public.assessment_mrc
  FOR DELETE TO authenticated
  USING (public.can_access_patient(patient_id));
DROP POLICY IF EXISTS "scales_delete" ON public.assessment_scales;
CREATE POLICY "scales_delete" ON public.assessment_scales
  FOR DELETE TO authenticated
  USING (public.can_access_patient(patient_id));