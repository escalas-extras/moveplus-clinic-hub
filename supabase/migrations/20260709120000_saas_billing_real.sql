-- Sprint 10B — Billing SaaS real
-- Separado do financeiro clinico. Nao usar financial_entries/receipts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_subscription_status') THEN
    CREATE TYPE public.saas_subscription_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_billing_cycle') THEN
    CREATE TYPE public.saas_billing_cycle AS ENUM ('monthly', 'annual');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_invoice_status') THEN
    CREATE TYPE public.saas_invoice_status AS ENUM ('draft', 'open', 'paid', 'overdue', 'canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_payment_method') THEN
    CREATE TYPE public.saas_payment_method AS ENUM ('pix', 'boleto', 'dinheiro', 'transferencia', 'cartao', 'manual', 'outro');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_billing_event_kind') THEN
    CREATE TYPE public.saas_billing_event_kind AS ENUM (
      'subscription_created',
      'subscription_updated',
      'invoice_generated',
      'invoice_paid',
      'invoice_overdue',
      'clinic_suspended',
      'clinic_reactivated',
      'manual_adjustment'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status public.saas_subscription_status NOT NULL DEFAULT 'active',
  billing_cycle public.saas_billing_cycle NOT NULL DEFAULT 'monthly',
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date NOT NULL DEFAULT ((CURRENT_DATE + INTERVAL '1 month')::date),
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  source_clinic_plan_id uuid REFERENCES public.clinic_plans(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_subscriptions_one_current
  ON public.saas_subscriptions(clinic_id)
  WHERE status IN ('trial', 'active', 'past_due', 'suspended');

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_clinic
  ON public.saas_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status
  ON public.saas_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.saas_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.saas_subscriptions(id) ON DELETE SET NULL,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status public.saas_invoice_status NOT NULL DEFAULT 'open',
  paid_at timestamptz,
  reference_month text NOT NULL CHECK (reference_month ~ '^[0-9]{4}-[0-9]{2}$'),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_invoices_one_per_month
  ON public.saas_invoices(clinic_id, reference_month)
  WHERE status <> 'canceled';

CREATE INDEX IF NOT EXISTS idx_saas_invoices_clinic
  ON public.saas_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status_due
  ON public.saas_invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_subscription
  ON public.saas_invoices(subscription_id);

CREATE TABLE IF NOT EXISTS public.saas_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  method public.saas_payment_method NOT NULL DEFAULT 'manual',
  external_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_payments_invoice
  ON public.saas_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_paid_at
  ON public.saas_payments(paid_at DESC);

CREATE TABLE IF NOT EXISTS public.saas_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.saas_subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.saas_invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.saas_payments(id) ON DELETE SET NULL,
  kind public.saas_billing_event_kind NOT NULL,
  amount numeric(12,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_billing_events_clinic
  ON public.saas_billing_events(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_billing_events_invoice
  ON public.saas_billing_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_billing_events_kind
  ON public.saas_billing_events(kind);

DROP TRIGGER IF EXISTS trg_saas_subscriptions_updated_at ON public.saas_subscriptions;
CREATE TRIGGER trg_saas_subscriptions_updated_at
  BEFORE UPDATE ON public.saas_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_invoices_updated_at ON public.saas_invoices;
CREATE TRIGGER trg_saas_invoices_updated_at
  BEFORE UPDATE ON public.saas_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saas_subscriptions super_admin all" ON public.saas_subscriptions;
CREATE POLICY "saas_subscriptions super_admin all"
  ON public.saas_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "saas_invoices super_admin all" ON public.saas_invoices;
CREATE POLICY "saas_invoices super_admin all"
  ON public.saas_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "saas_payments super_admin all" ON public.saas_payments;
CREATE POLICY "saas_payments super_admin all"
  ON public.saas_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "saas_billing_events super_admin all" ON public.saas_billing_events;
CREATE POLICY "saas_billing_events super_admin all"
  ON public.saas_billing_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_billing_events TO authenticated;
GRANT ALL ON public.saas_subscriptions TO service_role;
GRANT ALL ON public.saas_invoices TO service_role;
GRANT ALL ON public.saas_payments TO service_role;
GRANT ALL ON public.saas_billing_events TO service_role;

-- Backfill nao destrutivo a partir de clinic_plans atuais.
INSERT INTO public.saas_subscriptions (
  clinic_id,
  plan_id,
  status,
  billing_cycle,
  started_at,
  current_period_start,
  current_period_end,
  trial_ends_at,
  canceled_at,
  source_clinic_plan_id,
  notes
)
SELECT
  cp.clinic_id,
  cp.plan_id,
  CASE
    WHEN cp.status = 'trial' THEN 'trial'::public.saas_subscription_status
    WHEN cp.status = 'suspended' THEN 'suspended'::public.saas_subscription_status
    WHEN cp.status = 'canceled' THEN 'canceled'::public.saas_subscription_status
    ELSE 'active'::public.saas_subscription_status
  END,
  'monthly'::public.saas_billing_cycle,
  cp.started_at,
  cp.started_at::date,
  (cp.started_at::date + INTERVAL '1 month')::date,
  cp.trial_ends_at,
  cp.canceled_at,
  cp.id,
  'Backfill Sprint 10B a partir de clinic_plans'
FROM public.clinic_plans cp
WHERE cp.status IN ('active', 'trial', 'suspended', 'canceled')
  AND NOT EXISTS (
    SELECT 1
    FROM public.saas_subscriptions ss
    WHERE ss.clinic_id = cp.clinic_id
      AND ss.status IN ('trial', 'active', 'past_due', 'suspended')
  );
