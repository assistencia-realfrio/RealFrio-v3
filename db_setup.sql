
-- Adicionar coluna para subscrição Push (JSON)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- Garantir que as notificações podem ser enviadas por funções do sistema
COMMENT ON COLUMN public.profiles.push_subscription IS 'Armazena o endpoint e chaves para notificações PWA';
