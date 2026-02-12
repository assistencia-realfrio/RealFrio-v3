
-- 1. Criar a tabela de Orçamentos (Independente das OS)
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES public.equipments(id) ON DELETE SET NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    total_amount NUMERIC(12,2) DEFAULT 0,
    store TEXT NOT NULL,
    client_signature TEXT, 
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MIGRATION: Garantir que as colunas novas existem
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- 2. Criar a tabela de Itens do Orçamento
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    reference TEXT,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_labor BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MIGRATION EQUIPAMENTOS: Adicionar campo PNC
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS pnc TEXT;

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de acesso (Acesso público para aceitação de propostas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Allow all operations for everyone') THEN
        CREATE POLICY "Allow all operations for everyone" ON public.quotes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_items' AND policyname = 'Allow all operations for items') THEN
        CREATE POLICY "Allow all operations for items" ON public.quote_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;