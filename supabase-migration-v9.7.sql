-- ============================================================
-- AGRO PRO — Migration v9.7
-- Descontos de silo na tabela colheitas + índices de performance
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. NOVOS CAMPOS NA TABELA colheitas (classificação silo)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.colheitas
  ADD COLUMN IF NOT EXISTS umidade_padrao         NUMERIC(4,1)  DEFAULT 13.0,
  ADD COLUMN IF NOT EXISTS impureza               NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ardidos                NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esverdeados            NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quebrados              NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpo                    NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_armazenagem       NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_base_saca        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS peso_liquido_estimado  INTEGER       DEFAULT 0;

COMMENT ON COLUMN public.colheitas.umidade_padrao        IS 'Umidade padrão do armazém/silo (%)';
COMMENT ON COLUMN public.colheitas.impureza              IS 'Desconto por matéria estranha/impureza (%)';
COMMENT ON COLUMN public.colheitas.ardidos               IS 'Grãos ardidos e queimados (%)';
COMMENT ON COLUMN public.colheitas.esverdeados           IS 'Grãos esverdeados e imaturos (%)';
COMMENT ON COLUMN public.colheitas.quebrados             IS 'Grãos quebrados e avariados (%)';
COMMENT ON COLUMN public.colheitas.cpo                   IS 'CPO / óleo / grão duro (%)';
COMMENT ON COLUMN public.colheitas.taxa_armazenagem      IS 'Taxa de armazenagem mensal (%)';
COMMENT ON COLUMN public.colheitas.preco_base_saca       IS 'Preço base por saca (R$)';
COMMENT ON COLUMN public.colheitas.peso_liquido_estimado IS 'Peso líquido estimado após descontos do silo (kg)';

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────

-- Colheitas
CREATE INDEX IF NOT EXISTS idx_colheitas_data       ON public.colheitas(data);
CREATE INDEX IF NOT EXISTS idx_colheitas_updated_at ON public.colheitas(updated_at DESC);

-- Folha salarial
CREATE INDEX IF NOT EXISTS idx_folha_salarial_updated_at ON public.folha_salarial(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_competencia ON public.folha_salarial(competencia);

-- Analise solo
CREATE INDEX IF NOT EXISTS idx_analise_solo_updated_at ON public.analise_solo(updated_at DESC);

-- Aplicações (filtro por talhão + safra é comum)
CREATE INDEX IF NOT EXISTS idx_aplicacoes_data ON public.aplicacoes(data);

-- Manutenção
CREATE INDEX IF NOT EXISTS idx_manutencoes_user ON public.manutencoes(user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_data ON public.manutencoes(data_manutencao);

-- Equipe
CREATE INDEX IF NOT EXISTS idx_equipe_updated_at ON public.equipe(updated_at DESC);

-- Profiles — busca por plano para análises futuras
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON public.profiles(plan_type);

-- ────────────────────────────────────────────────────────────
-- 3. SEGURANÇA — Garantir RLS ativo nas tabelas principais
-- ────────────────────────────────────────────────────────────

-- (tabelas já têm RLS; abaixo é garantia idempotente)
ALTER TABLE public.colheitas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_salarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_solo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos_base   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pragas         ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 4. POLÍTICAS RLS para tabelas sem policy ainda
-- ────────────────────────────────────────────────────────────

-- Usar DO $$ para evitar erro se policy já existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'manutencoes' AND policyname = 'Users manage own manutencoes'
  ) THEN
    CREATE POLICY "Users manage own manutencoes"
      ON public.manutencoes FOR ALL
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'insumos_base' AND policyname = 'Users manage own insumos_base'
  ) THEN
    CREATE POLICY "Users manage own insumos_base"
      ON public.insumos_base FOR ALL
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lembretes' AND policyname = 'Users manage own lembretes'
  ) THEN
    CREATE POLICY "Users manage own lembretes"
      ON public.lembretes FOR ALL
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pragas' AND policyname = 'Users manage own pragas'
  ) THEN
    CREATE POLICY "Users manage own pragas"
      ON public.pragas FOR ALL
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────
-- 5. VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c2
   WHERE c2.table_schema = 'public' AND c2.table_name = t.table_name) AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('colheitas','folha_salarial','analise_solo','aplicacoes','manutencoes','equipe','maquinas')
ORDER BY table_name;
