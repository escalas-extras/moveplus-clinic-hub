
-- Plans: pricing, featured, audit
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS monthly_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Backfill monthly_price from legacy price_cents
UPDATE public.plans
  SET monthly_price = ROUND(price_cents::numeric/100, 2)
  WHERE monthly_price IS NULL;

-- Plan change audit
CREATE TABLE IF NOT EXISTS public.plan_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  from_plan_id uuid REFERENCES public.plans(id),
  to_plan_id uuid REFERENCES public.plans(id),
  from_plan_code text,
  to_plan_code text,
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_change_audit TO authenticated;
GRANT ALL ON public.plan_change_audit TO service_role;

ALTER TABLE public.plan_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin reads plan audit"
  ON public.plan_change_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super_admin to manage plans (catalog CRUD via RLS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='super_admin manages plans') THEN
    CREATE POLICY "super_admin manages plans"
      ON public.plans FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;
