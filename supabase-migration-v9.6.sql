-- ============================================================
-- AGRO PRO v9.6 — Migração SQL Supabase
-- Criar tabelas: folha_salarial + analise_solo
--
-- Como usar:
-- 1. Abrir https://supabase.com/dashboard
-- 2. Selecionar projeto nhxkgrczipcqexyaqdmf
-- 3. Ir em SQL Editor
-- 4. Colar este script e clicar em "Run"
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_folha_salarial_user_id  ON public.folha_salarial(user_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_safra_id ON public.folha_salarial(safra_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_competencia ON public.folha_salarial(competencia);

-- RLS (Row Level Security)
ALTER TABLE public.folha_salarial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own folha_salarial" ON public.folha_salarial;
CREATE POLICY "Users can manage own folha_salarial"
  ON public.folha_salarial
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_folha_salarial_updated_at ON public.folha_salarial;
CREATE TRIGGER update_folha_salarial_updated_at
  BEFORE UPDATE ON public.folha_salarial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


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
  profundidade        TEXT,
  textura             TEXT,
  numero_laudo        TEXT,
  -- Parâmetros químicos
  ph                  NUMERIC(4,1),
  mo                  NUMERIC(8,2),       -- Matéria orgânica g/dm³
  p                   NUMERIC(8,2),       -- Fósforo mg/dm³
  k                   NUMERIC(8,3),       -- Potássio mmolc/dm³
  ca                  NUMERIC(8,2),       -- Cálcio mmolc/dm³
  mg                  NUMERIC(8,2),       -- Magnésio mmolc/dm³
  al                  NUMERIC(8,2),       -- Alumínio mmolc/dm³
  h_al                NUMERIC(8,2),       -- H+Al mmolc/dm³
  s                   NUMERIC(8,2),       -- Enxofre mg/dm³
  b                   NUMERIC(8,3),       -- Boro mg/dm³
  cu                  NUMERIC(8,3),       -- Cobre mg/dm³
  fe                  NUMERIC(8,2),       -- Ferro mg/dm³
  mn                  NUMERIC(8,2),       -- Manganês mg/dm³
  zn                  NUMERIC(8,3),       -- Zinco mg/dm³
  -- Parâmetros calculados/físicos
  ctc                 NUMERIC(8,2),       -- CTC mmolc/dm³
  v_pct               NUMERIC(5,1),       -- Saturação de Bases %
  m_pct               NUMERIC(5,1),       -- Saturação por Alumínio %
  areia               NUMERIC(5,1),       -- Areia %
  silte               NUMERIC(5,1),       -- Silte %
  argila              NUMERIC(5,1),       -- Argila %
  -- Recomendações
  recom_calagem       NUMERIC(8,2),       -- t/ha
  recom_gessagem      NUMERIC(8,2),       -- t/ha
  recom_adubacao      TEXT,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analise_solo_user_id   ON public.analise_solo(user_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_safra_id  ON public.analise_solo(safra_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_talhao_id ON public.analise_solo(talhao_id);

-- RLS
ALTER TABLE public.analise_solo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own analise_solo" ON public.analise_solo;
CREATE POLICY "Users can manage own analise_solo"
  ON public.analise_solo
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_analise_solo_updated_at ON public.analise_solo;
CREATE TRIGGER update_analise_solo_updated_at
  BEFORE UPDATE ON public.analise_solo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- VERIFICAR se as tabelas foram criadas
-- ============================================================
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('folha_salarial', 'analise_solo')
ORDER BY table_name;
