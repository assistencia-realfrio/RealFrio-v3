
-- ======================================================
-- CONFIGURAÇÃO DE SINCRONIZAÇÃO AUTOMÁTICA DE PERFIS
-- EXECUTE ESTE BLOCO NO SQL EDITOR DO SUPABASE
-- ======================================================

-- 1. Garantir que a tabela profiles tem as colunas corretas
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'tecnico',
    store TEXT DEFAULT 'Todas'
);

-- 2. Função que será executada pelo Trigger
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

-- 3. Criar o Trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SCRIPT DE REPARAÇÃO: Criar perfis para utilizadores que já existem no Auth mas não no Profiles
-- (Isso vai resolver o caso do Bernardo automaticamente)
INSERT INTO public.profiles (id, email, full_name, role, store)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'Utilizador Antigo'),
    COALESCE(raw_user_meta_data->>'role', 'tecnico'),
    COALESCE(raw_user_meta_data->>'store', 'Todas')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Garantir permissões de RLS para que o sistema funcione
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis visíveis por todos autenticados" ON public.profiles;
CREATE POLICY "Perfis visíveis por todos autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Utilizadores podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Utilizadores podem atualizar o próprio perfil" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Permitir que o trigger (que corre como postgres) insira livremente
-- (Já garantido pelo SECURITY DEFINER na função)
