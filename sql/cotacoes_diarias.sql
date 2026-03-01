-- ============================================================
-- AGRO PRO — Cotações Diárias CEPEA/Esalq
-- Gerado: 2026-03-01 | Commodities: 11
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/midzgmbjylnbirvwrnvm/sql/new
-- ============================================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.cotacoes_diarias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    commodity text NOT NULL,
    preco numeric(12,2) NOT NULL,
    unidade text DEFAULT 'sc',
    fonte text DEFAULT 'CEPEA/Esalq',
    data date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(commodity, data)
);

-- 2. Habilitar RLS
ALTER TABLE public.cotacoes_diarias ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cotacoes_select_auth' AND tablename='cotacoes_diarias') THEN
    CREATE POLICY cotacoes_select_auth ON public.cotacoes_diarias FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cotacoes_select_anon' AND tablename='cotacoes_diarias') THEN
    CREATE POLICY cotacoes_select_anon ON public.cotacoes_diarias FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cotacoes_insert_auth' AND tablename='cotacoes_diarias') THEN
    CREATE POLICY cotacoes_insert_auth ON public.cotacoes_diarias FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cotacoes_update_auth' AND tablename='cotacoes_diarias') THEN
    CREATE POLICY cotacoes_update_auth ON public.cotacoes_diarias FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cotacoes_insert_anon' AND tablename='cotacoes_diarias') THEN
    CREATE POLICY cotacoes_insert_anon ON public.cotacoes_diarias FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cotacoes_update_anon' AND tablename='cotacoes_diarias') THEN
    CREATE POLICY cotacoes_update_anon ON public.cotacoes_diarias FOR UPDATE TO anon USING (true);
  END IF;
END $$;

-- 4. Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_cotacoes_commodity_data
    ON public.cotacoes_diarias(commodity, data DESC);

