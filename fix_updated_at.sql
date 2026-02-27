-- Adicionar a coluna updated_at à tabela profiles se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Atualizar o cache do schema (o Supabase faz isto automaticamente, mas alterar a estrutura força o refresh)
NOTIFY pgrst, 'reload config';
