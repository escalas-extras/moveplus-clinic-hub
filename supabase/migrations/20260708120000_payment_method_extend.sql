-- Estende formas de recebimento e campos opcionais por método (sem alterar RLS).

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'boleto';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'outro';

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS pix_chave text,
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS recebido_por text,
  ADD COLUMN IF NOT EXISTS boleto_nosso_numero text,
  ADD COLUMN IF NOT EXISTS boleto_link text;

COMMENT ON COLUMN public.financial_entries.pix_chave IS 'Chave PIX informada no recebimento (opcional).';
COMMENT ON COLUMN public.financial_entries.comprovante_url IS 'URL ou caminho do comprovante de pagamento.';
COMMENT ON COLUMN public.financial_entries.recebido_por IS 'Responsável pelo recebimento em dinheiro.';
COMMENT ON COLUMN public.financial_entries.boleto_nosso_numero IS 'Nosso número / referência do boleto (controle manual).';
COMMENT ON COLUMN public.financial_entries.boleto_link IS 'Link do boleto, se disponível (controle manual).';
