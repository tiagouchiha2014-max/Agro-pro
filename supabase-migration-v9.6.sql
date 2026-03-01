-- ============================================================
-- AGRO PRO v9.6 — Migração SQL Supabase
-- Criar tabelas: folha_salarial + analise_solo
--
-- INSTRUÇÕES:
-- 1. Abrir https://supabase.com/dashboard
-- 2. Selecionar projeto nhxkgrczipcqexyaqdmf
-- 3. SQL Editor → New query
-- 4. Colar TODO este script e clicar em "Run"
-- 5. Deve aparecer "Success. No rows returned"
-- ============================================================


-- ============================================================
-- TABELA: folha_salarial
-- ============================================================
CREATE TABLE IF NOT EXISTS public.folha_salarial (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id            UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  funcionario_id      TEXT,
  funcionario_nome    TEXT,
  funcionario_funcao  TEXT,
  competencia         DATE,
  salario_base        NUMERIC(12,2) DEFAULT 0,
  dias_trabalhados    INTEGER DEFAULT 30,
  horas_extras        NUMERIC(8,2) DEFAULT 0,
  valor_hora_extra    NUMERIC(12,2) DEFAULT 0,
  valor_horas_extras  NUMERIC(12,2) DEFAULT 0,
  adiantamento        NUMERIC(12,2) DEFAULT 0,
  vale_transporte     NUMERIC(12,2) DEFAULT 0,
  vale_alimentacao    NUMERIC(12,2) DEFAULT 0,
  outros_beneficios   NUMERIC(12,2) DEFAULT 0,
  inss                NUMERIC(12,2) DEFAULT 0,
  descontos_extras    JSONB DEFAULT '[]',
  total_descontos     NUMERIC(12,2) DEFAULT 0,
  salario_bruto       NUMERIC(12,2) DEFAULT 0,
  salario_liquido     NUMERIC(12,2) DEFAULT 0,
  status              TEXT DEFAULT 'pendente',
  data_pagamento      DATE,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices folha_salarial
CREATE INDEX IF NOT EXISTS idx_folha_salarial_user_id     ON public.folha_salarial(user_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_safra_id    ON public.folha_salarial(safra_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_competencia ON public.folha_salarial(competencia);

-- RLS folha_salarial
ALTER TABLE public.folha_salarial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own folha_salarial" ON public.folha_salarial;
CREATE POLICY "Users can manage own folha_salarial"
  ON public.folha_salarial FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at (cria a função se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_folha_salarial_updated_at ON public.folha_salarial;
CREATE TRIGGER trg_folha_salarial_updated_at
  BEFORE UPDATE ON public.folha_salarial
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- TABELA: analise_solo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analise_solo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id            UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  talhao_id           UUID REFERENCES public.talhoes(id) ON DELETE SET NULL,
  talhao_nome         TEXT,
  talhao_area         NUMERIC(10,2),
  talhao_cultura      TEXT,
  fazenda_nome        TEXT,
  data                DATE,
  laboratorio         TEXT,
  profundidade        TEXT DEFAULT '0-20 cm',
  textura             TEXT,
  numero_laudo        TEXT,
  -- Parâmetros químicos
  ph                  NUMERIC(4,1),
  mo                  NUMERIC(8,2),
  p                   NUMERIC(8,2),
  k                   NUMERIC(8,3),
  ca                  NUMERIC(8,2),
  mg                  NUMERIC(8,2),
  al                  NUMERIC(8,2),
  h_al                NUMERIC(8,2),
  s                   NUMERIC(8,2),
  b                   NUMERIC(8,3),
  cu                  NUMERIC(8,3),
  fe                  NUMERIC(8,2),
  mn                  NUMERIC(8,2),
  zn                  NUMERIC(8,3),
  -- Calculados / físicos
  ctc                 NUMERIC(8,2),
  v_pct               NUMERIC(5,1),
  m_pct               NUMERIC(5,1),
  areia               NUMERIC(5,1),
  silte               NUMERIC(5,1),
  argila              NUMERIC(5,1),
  -- Recomendações
  recom_calagem       NUMERIC(8,2),
  recom_gessagem      NUMERIC(8,2),
  recom_adubacao      TEXT,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices analise_solo
CREATE INDEX IF NOT EXISTS idx_analise_solo_user_id   ON public.analise_solo(user_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_safra_id  ON public.analise_solo(safra_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_talhao_id ON public.analise_solo(talhao_id);

-- RLS analise_solo
ALTER TABLE public.analise_solo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own analise_solo" ON public.analise_solo;
CREATE POLICY "Users can manage own analise_solo"
  ON public.analise_solo FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_analise_solo_updated_at ON public.analise_solo;
CREATE TRIGGER trg_analise_solo_updated_at
  BEFORE UPDATE ON public.analise_solo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
