
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
    client_signature TEXT, -- Adicionado para suportar aprovação digital
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que as colunas necessárias existem caso a tabela já tenha sido criada anteriormente
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='description') THEN
        ALTER TABLE public.quotes ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='client_signature') THEN
        ALTER TABLE public.quotes ADD COLUMN client_signature TEXT;
    END IF;
END $$;

ALTER TABLE public.quotes ALTER COLUMN description DROP NOT NULL;

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

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Allow all operations for everyone') THEN
        CREATE POLICY "Allow all operations for everyone" ON public.quotes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_items' AND policyname = 'Allow all operations for items') THEN
        CREATE POLICY "Allow all operations for items" ON public.quote_items FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON public.clients FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'establishments' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON public.establishments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipments' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON public.equipments FOR SELECT USING (true);
    END IF;
END $$;

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_quotes_code ON public.quotes(code);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_parent ON public.quote_items(quote_id);
