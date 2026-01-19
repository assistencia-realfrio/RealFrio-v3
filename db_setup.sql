
-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO COMPLETA - REAL FRIO
-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE
-- ==========================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS BASE
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    billing_name TEXT,
    notes TEXT,
    store TEXT,
    google_drive_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    contact_person TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL,
    type TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    install_date TEXT,
    nameplate_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES equipments(id) ON DELETE SET NULL,
    type TEXT,
    status TEXT,
    description TEXT,
    priority TEXT,
    scheduled_date TEXT,
    anomaly_detected TEXT,
    resolution_notes TEXT,
    observations TEXT,
    client_signature TEXT,
    technician_signature TEXT,
    store TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELAS DE SUPORTE (MATERIAL, FOTOS, LOGS)
CREATE TABLE IF NOT EXISTS catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    stock INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS os_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    part_id UUID REFERENCES catalog(id) ON DELETE SET NULL,
    name TEXT,
    reference TEXT,
    quantity INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS os_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT, -- 'antes', 'depois', 'peca', 'geral'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    user_id UUID,
    user_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    user_id TEXT,
    user_name TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vacations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT,
    store TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'tecnico'
);

-- 4. ATIVAR ROW LEVEL SECURITY (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS DE ACESSO (PERMITIR TUDO PARA UTILIZADORES AUTENTICADOS)
-- Nota: Para uma app interna de gestão, o acesso total para técnicos logados é o padrão.

DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable all for authenticated" ON %I', t);
        EXECUTE format('CREATE POLICY "Enable all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Política extra para permitir acesso anónimo em modo demonstração (opcional/cuidado)
-- Se quiser que o modo demo funcione sem login real no Supabase, descomente a linha abaixo:
-- CREATE POLICY "Enable all for anon" ON catalog FOR ALL TO anon USING (true) WITH CHECK (true);
