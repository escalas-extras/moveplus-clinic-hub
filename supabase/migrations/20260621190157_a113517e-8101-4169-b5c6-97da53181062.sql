-- Normalize template names for duplicate prevention
CREATE OR REPLACE FUNCTION public.normalize_document_template_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT trim(regexp_replace(lower(translate(coalesce(_name, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- Make Move+ the source for the canonical library whenever a matching template exists there
UPDATE public.canonical_document_templates c
SET doc_type = m.doc_type,
    is_default = m.is_default,
    sections = m.sections,
    layout_config = m.layout_config,
    updated_at = now()
FROM public.document_templates m
JOIN public.clinics mc ON mc.id = m.clinic_id
WHERE mc.nome ILIKE '%Move%'
  AND m.is_active = true
  AND public.normalize_document_template_name(m.name) = public.normalize_document_template_name(c.name);

-- Ensure every active clinic has exactly the canonical active library.
CREATE OR REPLACE FUNCTION public.apply_canonical_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _clinic_id IS NULL THEN RETURN; END IF;

  -- Archive active templates that are not part of the canonical Move+ library.
  UPDATE public.document_templates d
     SET is_active = false,
         is_default = false,
         updated_at = now()
   WHERE d.clinic_id = _clinic_id
     AND d.is_active = true
     AND NOT EXISTS (
       SELECT 1
         FROM public.canonical_document_templates c
        WHERE public.normalize_document_template_name(c.name) = public.normalize_document_template_name(d.name)
     );

  -- Archive duplicate active templates by visual name, keeping the best canonical/default/newest row.
  WITH ranked AS (
    SELECT d.id,
           row_number() OVER (
             PARTITION BY d.clinic_id, public.normalize_document_template_name(d.name)
             ORDER BY
               CASE WHEN c.id IS NOT NULL THEN 0 ELSE 1 END,
               CASE WHEN d.is_default THEN 0 ELSE 1 END,
               d.updated_at DESC,
               d.created_at DESC,
               d.id
           ) AS rn
      FROM public.document_templates d
      LEFT JOIN public.canonical_document_templates c
        ON public.normalize_document_template_name(c.name) = public.normalize_document_template_name(d.name)
     WHERE d.clinic_id = _clinic_id
       AND d.is_active = true
  )
  UPDATE public.document_templates d
     SET is_active = false,
         is_default = false,
         updated_at = now()
    FROM ranked r
   WHERE d.id = r.id
     AND r.rn > 1;

  -- Reset defaults so canonical defaults win.
  UPDATE public.document_templates
     SET is_default = false,
         updated_at = now()
   WHERE clinic_id = _clinic_id
     AND is_default = true;

  -- Insert missing canonical templates.
  INSERT INTO public.document_templates
    (clinic_id, doc_type, name, description, version, is_default, is_active, sections, layout_config, required_tags)
  SELECT _clinic_id, c.doc_type, c.name, NULL, 1, c.is_default, true, c.sections, c.layout_config, ARRAY[]::text[]
    FROM public.canonical_document_templates c
   WHERE NOT EXISTS (
     SELECT 1
       FROM public.document_templates d
      WHERE d.clinic_id = _clinic_id
        AND d.is_active = true
        AND public.normalize_document_template_name(d.name) = public.normalize_document_template_name(c.name)
   );

  -- Update existing canonical templates to match Move+ canonical content exactly.
  UPDATE public.document_templates d
     SET name          = c.name,
         doc_type      = c.doc_type,
         description   = NULL,
         version       = 1,
         is_default    = c.is_default,
         sections      = c.sections,
         layout_config = c.layout_config,
         required_tags = ARRAY[]::text[],
         is_active     = true,
         updated_at    = now()
    FROM public.canonical_document_templates c
   WHERE d.clinic_id = _clinic_id
     AND d.is_active = true
     AND public.normalize_document_template_name(d.name) = public.normalize_document_template_name(c.name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_default_document_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.apply_canonical_templates(_clinic_id);
END;
$function$;

-- Re-apply to all current active clinics.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clinics WHERE status <> 'deleted' LOOP
    PERFORM public.apply_canonical_templates(r.id);
  END LOOP;
END $$;

-- Prevent future active duplicate templates with the same visual name in one clinic.
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_one_active_name_per_clinic
ON public.document_templates (clinic_id, public.normalize_document_template_name(name))
WHERE is_active = true AND clinic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS canonical_document_templates_one_name
ON public.canonical_document_templates (public.normalize_document_template_name(name));