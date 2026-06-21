
-- Remove public/anon SELECT policy on clinical_documents
DROP POLICY IF EXISTS docs_public_validate ON public.clinical_documents;

-- Drop the public view that joined sensitive tables
DROP VIEW IF EXISTS public.v_document_validation;

-- Secure validation function: returns only LGPD-safe metadata
CREATE OR REPLACE FUNCTION public.validate_document_by_hash(_hash text)
RETURNS TABLE (
  existe boolean,
  status text,
  doc_type text,
  title text,
  paciente_iniciais text,
  clinica_nome text,
  profissional_nome text,
  profissional_registro text,
  issued_at timestamptz,
  locked_at timestamptz,
  hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS existe,
    CASE WHEN d.locked_at IS NOT NULL THEN 'autentico' ELSE 'invalido' END AS status,
    d.doc_type,
    d.title,
    regexp_replace(COALESCE(p.nome_completo, ''), '(\S)\S+\s*', '\1. ', 'g') AS paciente_iniciais,
    c.nome_fantasia AS clinica_nome,
    pr.nome AS profissional_nome,
    NULLIF(COALESCE(pr.conselho,'') || COALESCE('-' || pr.registro, ''), '') AS profissional_registro,
    d.issued_at,
    d.locked_at,
    d.validation_hash AS hash
  FROM public.clinical_documents d
  LEFT JOIN public.professionals pr ON pr.id = d.professional_id
  LEFT JOIN public.patients p ON p.id = d.patient_id
  LEFT JOIN public.clinic_settings c ON TRUE
  WHERE d.validation_hash = _hash
    AND d.locked_at IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalido'::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::timestamptz, NULL::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_document_by_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_document_by_hash(text) TO anon, authenticated;
