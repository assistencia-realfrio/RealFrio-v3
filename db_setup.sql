
-- Ativar extensão pgcrypto se necessário
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Tabela de Veículos (Gestão de Frota)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_plate TEXT UNIQUE,
    brand TEXT,
    model TEXT,
    year INTEGER,
    current_mileage INTEGER DEFAULT 0,
    next_revision_mileage INTEGER,
    next_inspection_date DATE,
    insurance_expiry_date DATE,
    status TEXT CHECK (status IN ('active', 'maintenance', 'inactive')) DEFAULT 'active',
    assigned_to TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Registos de Manutenção (Gestão de Frota)
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('revision', 'inspection', 'repair', 'tires', 'other')) NOT NULL,
    date DATE NOT NULL,
    mileage INTEGER NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    provider TEXT NOT NULL,
    next_scheduled_date DATE,
    status TEXT CHECK (status IN ('scheduled', 'completed', 'canceled')) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Segurança (RLS)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Permitir acesso total a utilizadores autenticados (Veículos)" ON public.vehicles;
DROP POLICY IF EXISTS "Permitir acesso total a utilizadores autenticados (Manutenção)" ON public.maintenance_records;
DROP POLICY IF EXISTS "Permitir tudo a todos (Veículos)" ON public.vehicles;
DROP POLICY IF EXISTS "Permitir tudo a todos (Manutenção)" ON public.maintenance_records;

-- Criar políticas mais abrangentes para garantir funcionamento
CREATE POLICY "Permitir tudo a todos (Veículos)" ON public.vehicles
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo a todos (Manutenção)" ON public.maintenance_records
    FOR ALL USING (true) WITH CHECK (true);

-- Dar permissões explícitas às tabelas
GRANT ALL ON TABLE public.vehicles TO authenticated;
GRANT ALL ON TABLE public.vehicles TO service_role;
GRANT ALL ON TABLE public.vehicles TO anon;

GRANT ALL ON TABLE public.maintenance_records TO authenticated;
GRANT ALL ON TABLE public.maintenance_records TO service_role;
GRANT ALL ON TABLE public.maintenance_records TO anon;

-- Garantir que o público pode ver e assinar orçamentos
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública de orçamentos" ON public.quotes;
CREATE POLICY "Permitir leitura pública de orçamentos" ON public.quotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir atualização pública de orçamentos" ON public.quotes;
CREATE POLICY "Permitir atualização pública de orçamentos" ON public.quotes FOR UPDATE USING (true) WITH CHECK (true);

-- Garantir que o público pode ver itens do orçamento
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública de itens de orçamento" ON public.quote_items;
CREATE POLICY "Permitir leitura pública de itens de orçamento" ON public.quote_items FOR SELECT USING (true);

-- Garantir que o público pode ver ordens de serviço (necessário para o vínculo de atividade)
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública de ordens de serviço" ON public.service_orders;
CREATE POLICY "Permitir leitura pública de ordens de serviço" ON public.service_orders FOR SELECT USING (true);

-- Garantir que o público pode inserir atividades (necessário para o log de assinatura)
ALTER TABLE public.os_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir inserção pública de atividades" ON public.os_activities;
CREATE POLICY "Permitir inserção pública de atividades" ON public.os_activities FOR INSERT WITH CHECK (true);

-- Dar permissões explícitas para anon
GRANT ALL ON TABLE public.quotes TO anon;
GRANT ALL ON TABLE public.quote_items TO anon;
GRANT ALL ON TABLE public.service_orders TO anon;
GRANT ALL ON TABLE public.os_activities TO anon;
GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.establishments TO anon;
GRANT ALL ON TABLE public.equipments TO anon;

-- Adicionar campos para "Ligar antes de ir" na tabela de ordens de serviço
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS call_before_going BOOLEAN DEFAULT FALSE;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS contact_phone TEXT;

COMMENT ON COLUMN public.service_orders.call_before_going IS 'Indica se o técnico deve ligar ao cliente antes de se deslocar ao local';
COMMENT ON COLUMN public.service_orders.contact_name IS 'Nome da pessoa a contactar antes da deslocação';
COMMENT ON COLUMN public.service_orders.contact_phone IS 'Telefone/Telemóvel da pessoa a contactar';
