
-- Tabela de Entregas de Material
CREATE TABLE IF NOT EXISTS public.material_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    loading_address TEXT,
    unloading_address TEXT,
    at_code TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT CHECK (status IN ('pending', 'delivered', 'canceled')) DEFAULT 'pending',
    client_signature TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.material_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo a todos (Entregas)" ON public.material_deliveries;
CREATE POLICY "Permitir tudo a todos (Entregas)" ON public.material_deliveries
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.material_deliveries TO authenticated;
GRANT ALL ON TABLE public.material_deliveries TO service_role;
GRANT ALL ON TABLE public.material_deliveries TO anon;
