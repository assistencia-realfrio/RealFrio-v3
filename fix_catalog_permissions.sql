
-- Garantir que a tabela catalog tem RLS e permissões corretas
ALTER TABLE public.catalog ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura pública de catálogo" ON public.catalog;
DROP POLICY IF EXISTS "Permitir tudo a todos (Catálogo)" ON public.catalog;

-- Criar política para permitir acesso total (leitura e escrita) a todos
-- Isso garante que tanto técnicos autenticados como o sistema podem gerir o catálogo
CREATE POLICY "Permitir tudo a todos (Catálogo)" ON public.catalog
    FOR ALL USING (true) WITH CHECK (true);

-- Dar permissões explícitas às tabelas para as roles do Supabase
GRANT ALL ON TABLE public.catalog TO authenticated;
GRANT ALL ON TABLE public.catalog TO service_role;
GRANT ALL ON TABLE public.catalog TO anon;

-- Fazer o mesmo para part_catalog caso seja necessário no futuro
ALTER TABLE public.part_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo a todos (Part Catálogo)" ON public.part_catalog;
CREATE POLICY "Permitir tudo a todos (Part Catálogo)" ON public.part_catalog
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.part_catalog TO authenticated;
GRANT ALL ON TABLE public.part_catalog TO service_role;
GRANT ALL ON TABLE public.part_catalog TO anon;
