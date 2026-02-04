
-- Adicionar colunas para o cronómetro partilhado
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS timer_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timer_is_active BOOLEAN DEFAULT false;

-- Adicionar colunas de auditoria em falta na tabela parts_used para evitar erros 400
ALTER TABLE public.parts_used
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS work_date DATE DEFAULT now();
