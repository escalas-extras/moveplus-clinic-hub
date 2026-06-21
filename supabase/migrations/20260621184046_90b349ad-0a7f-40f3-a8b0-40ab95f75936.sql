CREATE TABLE IF NOT EXISTS public.canonical_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  doc_type text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  sections jsonb NOT NULL,
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.canonical_document_templates TO authenticated;
GRANT ALL ON public.canonical_document_templates TO service_role;

ALTER TABLE public.canonical_document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canonical templates readable by authenticated" ON public.canonical_document_templates;
CREATE POLICY "canonical templates readable by authenticated"
  ON public.canonical_document_templates FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_canonical_templates_updated_at ON public.canonical_document_templates;
CREATE TRIGGER trg_canonical_templates_updated_at
  BEFORE UPDATE ON public.canonical_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_canonical_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF _clinic_id IS NULL THEN RETURN; END IF;

  -- Reset defaults so canonical defaults win
  UPDATE public.document_templates
     SET is_default = false
   WHERE clinic_id = _clinic_id AND is_default = true;

  -- Insert missing canonical templates
  INSERT INTO public.document_templates
    (clinic_id, doc_type, name, is_default, is_active, sections, layout_config)
  SELECT _clinic_id, c.doc_type, c.name, c.is_default, true, c.sections, c.layout_config
    FROM public.canonical_document_templates c
   WHERE NOT EXISTS (
     SELECT 1 FROM public.document_templates d
      WHERE d.clinic_id = _clinic_id AND d.name = c.name
   );

  -- Update existing templates to match canonical content
  UPDATE public.document_templates d
     SET doc_type      = c.doc_type,
         is_default    = c.is_default,
         sections      = c.sections,
         layout_config = c.layout_config,
         is_active     = true,
         updated_at    = now()
    FROM public.canonical_document_templates c
   WHERE d.clinic_id = _clinic_id AND d.name = c.name;
END;
$func$;

CREATE OR REPLACE FUNCTION public.seed_default_document_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  PERFORM public.apply_canonical_templates(_clinic_id);
END;
$func$;