
-- Adicionar coluna last_price à tabela catalog
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS last_price DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN public.catalog.last_price IS 'Último preço unitário aplicado a este artigo (exceto deslocação)';
