-- SQL para adicionar a coluna 'zone' à tabela de equipamentos
-- Execute este comando no SQL Editor do seu Supabase

ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS zone TEXT;
COMMENT ON COLUMN public.equipments.zone IS 'Zona ou área do estabelecimento onde o equipamento está instalado (ex: Cozinha, Bar)';
