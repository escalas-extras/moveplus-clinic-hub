-- Sprint G1.2 — Categorias financeiras (plano de contas simplificado)

CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_categories_clinic_type_name_unique UNIQUE (clinic_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_categories_clinic
  ON public.financial_categories (clinic_id);

CREATE INDEX IF NOT EXISTS idx_financial_categories_clinic_type
  ON public.financial_categories (clinic_id, type);

CREATE INDEX IF NOT EXISTS idx_financial_categories_clinic_active
  ON public.financial_categories (clinic_id, is_active);

CREATE TRIGGER financial_categories_set_updated
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- category_id opcional em lançamentos v1 (preparação G1.4+)
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS category_id uuid NULL
  REFERENCES public.financial_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_category
  ON public.financial_entries (category_id)
  WHERE category_id IS NOT NULL;

-- Garante que categoria pertence à mesma clínica do lançamento
CREATE OR REPLACE FUNCTION public.fn_financial_entry_category_clinic_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    IF NEW.clinic_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.financial_categories c
      WHERE c.id = NEW.category_id AND c.clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'category_id must belong to the same clinic as the financial entry'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_financial_entry_category_clinic ON public.financial_entries;
CREATE TRIGGER trg_financial_entry_category_clinic
  BEFORE INSERT OR UPDATE OF category_id, clinic_id ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_entry_category_clinic_match();

-- Modo Suporte: bloqueio de escrita
DROP TRIGGER IF EXISTS trg_block_support_writes_ins ON public.financial_categories;
DROP TRIGGER IF EXISTS trg_block_support_writes_upd ON public.financial_categories;
DROP TRIGGER IF EXISTS trg_block_support_writes_del ON public.financial_categories;
CREATE TRIGGER trg_block_support_writes_ins
  BEFORE INSERT ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_upd
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();
CREATE TRIGGER trg_block_support_writes_del
  BEFORE DELETE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_support_writes();

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_cat_tenant_select ON public.financial_categories;
DROP POLICY IF EXISTS fin_cat_tenant_insert ON public.financial_categories;
DROP POLICY IF EXISTS fin_cat_tenant_update ON public.financial_categories;
DROP POLICY IF EXISTS fin_cat_tenant_delete ON public.financial_categories;

CREATE POLICY fin_cat_tenant_select ON public.financial_categories
  FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));

CREATE POLICY fin_cat_tenant_insert ON public.financial_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_cat_tenant_update ON public.financial_categories
  FOR UPDATE TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

CREATE POLICY fin_cat_tenant_delete ON public.financial_categories
  FOR DELETE TO authenticated
  USING (public.can_manage_clinic(clinic_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
