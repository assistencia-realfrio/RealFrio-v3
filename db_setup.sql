
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

CREATE POLICY "Permitir acesso total a utilizadores autenticados (Veículos)" ON public.vehicles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso total a utilizadores autenticados (Manutenção)" ON public.maintenance_records
    FOR ALL USING (auth.role() = 'authenticated');

-- Dar permissões explícitas às tabelas (Necessário para evitar 401 em alguns ambientes)
GRANT ALL ON TABLE public.vehicles TO authenticated;
GRANT ALL ON TABLE public.vehicles TO service_role;
GRANT ALL ON TABLE public.vehicles TO anon;

GRANT ALL ON TABLE public.maintenance_records TO authenticated;
GRANT ALL ON TABLE public.maintenance_records TO service_role;
GRANT ALL ON TABLE public.maintenance_records TO anon;
