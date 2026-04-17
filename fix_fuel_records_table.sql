
-- SCRIPT DE CORREÇÃO PARA TABELA DE COMBUSTÍVEL
-- Caso receba o erro PGRST205 (Table not found), execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.vehicle_fuel_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mileage INTEGER NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL,
    liters DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.vehicle_fuel_records ENABLE ROW LEVEL SECURITY;

-- Criar Política de Acesso Total
DROP POLICY IF EXISTS "Permitir tudo a todos (Combustível)" ON public.vehicle_fuel_records;
CREATE POLICY "Permitir tudo a todos (Combustível)" ON public.vehicle_fuel_records
    FOR ALL USING (true) WITH CHECK (true);

-- Garantir permissões
GRANT ALL ON TABLE public.vehicle_fuel_records TO authenticated;
GRANT ALL ON TABLE public.vehicle_fuel_records TO service_role;
GRANT ALL ON TABLE public.vehicle_fuel_records TO anon;

-- Notificar PostgREST para recarregar a cache (se possível)
NOTIFY pgrst, 'reload schema';
