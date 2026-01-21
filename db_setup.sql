
-- ======================================================
-- CONFIGURAÇÃO COMPLETA DA BASE DE DADOS REAL FRIO V3
-- EXECUTE ESTE BLOCO NO SQL EDITOR DO SUPABASE
-- ======================================================

-- 1. Tabela de Perfis (Já existente, mas garantindo integridade)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'tecnico',
    store TEXT DEFAULT 'Todas'
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Empresa',
    address TEXT,
    phone TEXT,
    email TEXT,
    billing_name TEXT,
    notes TEXT,
    store TEXT NOT NULL,
    google_drive_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Estabelecimentos (Locais de Intervenção)
CREATE TABLE IF NOT EXISTS public.establishments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    contact_person TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Equipamentos (Ativos)
CREATE TABLE IF NOT EXISTS public.equipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    serial_number TEXT NOT NULL,
    install_date DATE,
    nameplate_url TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Catálogo (Artigos / Peças)
CREATE TABLE IF NOT EXISTS public.catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    stock NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES public.equipments(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'por_iniciar',
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'media',
    scheduled_date TIMESTAMPTZ,
    anomaly_detected TEXT,
    resolution_notes TEXT,
    observations TEXT,
    client_signature TEXT,
    technician_signature TEXT,
    store TEXT NOT NULL,
    is_warranty BOOLEAN DEFAULT false,
    warranty_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Peças Aplicadas em OS
CREATE TABLE IF NOT EXISTS public.parts_used (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.catalog(id) ON DELETE SET NULL,
    name TEXT,
    reference TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Fotos de OS
CREATE TABLE IF NOT EXISTS public.os_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Notas de OS
CREATE TABLE IF NOT EXISTS public.os_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Atividades de OS
CREATE TABLE IF NOT EXISTS public.os_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Férias
CREATE TABLE IF NOT EXISTS public.vacations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    user_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'aprovada',
    store TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ======================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- Garante que utilizadores autenticados possam ver e editar
-- ======================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

-- Criar políticas genéricas para acesso total de utilizadores autenticados
-- (Simplificado para o contexto atual)
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Acesso total autenticados" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Acesso total autenticados" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 12. Trigger de Perfil (Repetido para garantir funcionalidade)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, store)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Utilizador'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tecnico'),
    COALESCE(NEW.raw_user_meta_data->>'store', 'Todas')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    store = COALESCE(EXCLUDED.store, profiles.store);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
