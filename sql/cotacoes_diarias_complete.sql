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

-- 5. Dados CEPEA/Esalq — 2026-03-01
INSERT INTO public.cotacoes_diarias (commodity, preco, unidade, fonte, data) VALUES
  ('acucar', 98.59, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('algodao', 116.49, '@', 'CEPEA/Esalq', '2026-03-01'),
  ('arroz', 55.51, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('bezerro', 3224.18, 'cab', 'CEPEA/Esalq', '2026-03-01'),
  ('boi', 353.15, '@', 'CEPEA/Esalq', '2026-03-01'),
  ('cafe', 1797.61, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('feijao', 290.0, 'sc', 'CEPEA/Esalq (ref.)', '2026-03-01'),
  ('milho', 69.53, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('soja', 120.7, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('sorgo', 45.0, 'sc', 'CEPEA/Esalq (ref.)', '2026-03-01'),
  ('trigo', 90.0, 'sc', 'CEPEA/Esalq (ref.)', '2026-03-01')
ON CONFLICT (commodity, data) DO UPDATE SET preco = EXCLUDED.preco, fonte = EXCLUDED.fonte;

-- 6. Verificação
SELECT commodity, preco, unidade, fonte, data FROM public.cotacoes_diarias ORDER BY commodity;
