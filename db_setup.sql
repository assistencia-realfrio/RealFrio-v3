
-- Adicionar coluna para subscrição Push (JSON)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- Garantir que as notificações podem ser enviadas por funções do sistema
COMMENT ON COLUMN public.profiles.push_subscription IS 'Armazena o endpoint e chaves para notificações PWA';

-- Adicionar colunas técnicas à tabela de orçamentos (quotes)
-- Estas colunas são necessárias para os relatórios de seguro
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS detected_problem TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS cause TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.quotes.detected_problem IS 'Descrição técnica do problema encontrado pelo técnico';
COMMENT ON COLUMN public.quotes.cause IS 'Causa provável do incidente (essencial para seguradoras)';

-- Adicionar campo NIF à tabela de clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nif TEXT;
COMMENT ON COLUMN public.clients.nif IS 'Número de Identificação Fiscal do cliente';
