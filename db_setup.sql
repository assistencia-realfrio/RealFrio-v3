
-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO - REAL FRIO v3.1
-- ==========================================

-- Migração rápida para quem já tem a tabela:
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS store TEXT DEFAULT 'Todas';

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS (Apenas as definições críticas alteradas)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'tecnico',
    store TEXT DEFAULT 'Todas'
);

-- Re-aplicar políticas de segurança se necessário
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated" ON profiles;
CREATE POLICY "Enable all for authenticated" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
