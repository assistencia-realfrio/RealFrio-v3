
-- Adicionar colunas para o cronómetro partilhado
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS timer_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timer_is_active BOOLEAN DEFAULT false;
