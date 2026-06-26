-- Corrige RLS de INSERT em assessments para permitir criação apenas
-- dentro da clínica autorizada do usuário autenticado.
-- Mantém RLS ativa e restringe paciente/profissional à mesma clínica.

DROP POLICY IF EXISTS "assessments tenant insert" ON public.assessments;

CREATE POLICY "assessments tenant insert" ON public.assessments
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id IS NOT NULL
  AND public.is_member_of(clinic_id)
  AND EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = patient_id
      AND p.clinic_id = assessments.clinic_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.professionals pr
    WHERE pr.id = professional_id
      AND pr.clinic_id = assessments.clinic_id
  )
  AND (created_by IS NULL OR created_by = auth.uid())
);
