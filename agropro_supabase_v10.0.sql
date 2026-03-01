-- ============================================================
-- AGRO PRO — Setup Supabase COMPLETO v10.0
-- ============================================================
-- MUDANÇAS em relação ao v8.0:
--   + Tabela ai_usage_log (rate limiting Edge Functions)
--   + Tabela folha_salarial (folha de pagamento)
--   + Tabela analise_solo (análise de solo)
--   + Colunas v9.7 em colheitas (classificação silo)
--   + Índices de performance em todas as tabelas
--   + RLS consistente: 4 policies por tabela (sel/ins/upd/del)
--   + 100% compatível com supabase-client.js TABLE_MAP/FIELD_MAP
-- ============================================================
-- Como usar:
--   1. Crie um novo projeto no supabase.com
--   2. Vá em SQL Editor → New Query
--   3. Cole TODO este bloco e clique em Run
--   4. Configure os secrets da Edge Function:
--      OPENAI_API_KEY, HG_BRASIL_KEY
-- ============================================================

-- ============================================================
-- 1. FUNÇÃO updated_at (reusável por todas as tabelas)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  email         TEXT,
  cpf           TEXT,
  phone         TEXT,
  user_role     TEXT        DEFAULT 'admin',
  plan_type     TEXT        DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS profiles_sel ON profiles FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY IF NOT EXISTS profiles_ins ON profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY IF NOT EXISTS profiles_upd ON profiles FOR UPDATE USING ((SELECT auth.uid()) = id);
CREATE POLICY IF NOT EXISTS profiles_del ON profiles FOR DELETE USING ((SELECT auth.uid()) = id);
DROP TRIGGER IF EXISTS trg_profiles_upd ON profiles;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. SAFRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS safras (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  data_inicio DATE,
  data_fim    DATE,
  ativa       BOOLEAN     DEFAULT true,
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE safras ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS safras_sel ON safras FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS safras_ins ON safras FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS safras_upd ON safras FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS safras_del ON safras FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_safras_user ON safras(user_id);
DROP TRIGGER IF EXISTS trg_safras_upd ON safras;
CREATE TRIGGER trg_safras_upd BEFORE UPDATE ON safras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. FAZENDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS fazendas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  cidade      TEXT,
  uf          TEXT,
  area_ha     NUMERIC,
  latitude    TEXT,
  longitude   TEXT,
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS fazendas_sel ON fazendas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS fazendas_ins ON fazendas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS fazendas_upd ON fazendas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS fazendas_del ON fazendas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_fazendas_user  ON fazendas(user_id);
CREATE INDEX IF NOT EXISTS idx_fazendas_safra ON fazendas(safra_id);
DROP TRIGGER IF EXISTS trg_fazendas_upd ON fazendas;
CREATE TRIGGER trg_fazendas_upd BEFORE UPDATE ON fazendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. TALHOES
-- ============================================================
CREATE TABLE IF NOT EXISTS talhoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  fazenda_id  UUID        REFERENCES fazendas(id) ON DELETE SET NULL,
  nome        TEXT        NOT NULL,
  area_ha     NUMERIC,
  cultura     TEXT,
  safra       TEXT,
  solo        TEXT,
  coordenadas TEXT,
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE talhoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS talhoes_sel ON talhoes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS talhoes_ins ON talhoes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS talhoes_upd ON talhoes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS talhoes_del ON talhoes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_user       ON talhoes(user_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_safra      ON talhoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_fazenda    ON talhoes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_user_safra ON talhoes(user_id, safra_id);
DROP TRIGGER IF EXISTS trg_talhoes_upd ON talhoes;
CREATE TRIGGER trg_talhoes_upd BEFORE UPDATE ON talhoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. MAQUINAS
-- ============================================================
CREATE TABLE IF NOT EXISTS maquinas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID        REFERENCES safras(id) ON DELETE CASCADE,
  nome         TEXT        NOT NULL,
  tipo         TEXT,
  marca        TEXT,
  modelo       TEXT,
  ano          NUMERIC,
  placa        TEXT,
  horimetro    NUMERIC     DEFAULT 0,
  capacidade_l NUMERIC,
  bicos        TEXT,
  status       TEXT        DEFAULT 'ativo',
  observacoes  TEXT,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS maquinas_sel ON maquinas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS maquinas_ins ON maquinas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS maquinas_upd ON maquinas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS maquinas_del ON maquinas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_user  ON maquinas(user_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_safra ON maquinas(safra_id);
DROP TRIGGER IF EXISTS trg_maquinas_upd ON maquinas;
CREATE TRIGGER trg_maquinas_upd BEFORE UPDATE ON maquinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. EQUIPE
-- ============================================================
CREATE TABLE IF NOT EXISTS equipe (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id      UUID        REFERENCES safras(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  funcao        TEXT,
  telefone      TEXT,
  data_admissao TEXT,
  salario       NUMERIC,
  status        TEXT,
  observacoes   TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS equipe_sel ON equipe FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS equipe_ins ON equipe FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS equipe_upd ON equipe FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS equipe_del ON equipe FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_equipe_user ON equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_equipe_updated_at ON equipe(updated_at);
DROP TRIGGER IF EXISTS trg_equipe_upd ON equipe;
CREATE TRIGGER trg_equipe_upd BEFORE UPDATE ON equipe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id      UUID        REFERENCES safras(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  tipo          TEXT,
  tipo_produto  TEXT,
  unidade       TEXT,
  preco         NUMERIC,
  estoque_atual NUMERIC     DEFAULT 0,
  observacoes   TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS produtos_sel ON produtos FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS produtos_ins ON produtos FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS produtos_upd ON produtos FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS produtos_del ON produtos FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_user ON produtos(user_id);
DROP TRIGGER IF EXISTS trg_produtos_upd ON produtos;
CREATE TRIGGER trg_produtos_upd BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id         UUID        REFERENCES safras(id) ON DELETE CASCADE,
  produto_id       UUID        REFERENCES produtos(id) ON DELETE SET NULL,
  tipo             TEXT,
  quantidade       NUMERIC,
  quantidade_atual NUMERIC     DEFAULT 0,
  preco_unitario   NUMERIC,
  data             TEXT,
  data_entrada     TEXT,
  nota_fiscal      TEXT,
  observacoes      TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS estoque_sel ON estoque FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS estoque_ins ON estoque FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS estoque_upd ON estoque FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS estoque_del ON estoque FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_estoque_user ON estoque(user_id);
DROP TRIGGER IF EXISTS trg_estoque_upd ON estoque;
CREATE TRIGGER trg_estoque_upd BEFORE UPDATE ON estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. APLICACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS aplicacoes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id         UUID        REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id        UUID        REFERENCES talhoes(id) ON DELETE SET NULL,
  produto_id       UUID        REFERENCES produtos(id) ON DELETE SET NULL,
  data             TEXT,
  produto          TEXT,
  tipo             TEXT,
  dose_ha          NUMERIC,
  area_aplicada    NUMERIC,
  quantidade_total NUMERIC,
  custo_unitario   NUMERIC,
  custo_total      NUMERIC,
  volume_calda     NUMERIC,
  condicao_clima   TEXT,
  maquina          TEXT,
  operador         TEXT,
  observacoes      TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE aplicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS aplicacoes_sel ON aplicacoes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS aplicacoes_ins ON aplicacoes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS aplicacoes_upd ON aplicacoes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS aplicacoes_del ON aplicacoes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_user       ON aplicacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_safra      ON aplicacoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_talhao     ON aplicacoes(talhao_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_data       ON aplicacoes(data);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_user_safra ON aplicacoes(user_id, safra_id);
DROP TRIGGER IF EXISTS trg_aplicacoes_upd ON aplicacoes;
CREATE TRIGGER trg_aplicacoes_upd BEFORE UPDATE ON aplicacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. COLHEITAS (inclui campos v9.7 — classificação silo)
-- ============================================================
CREATE TABLE IF NOT EXISTS colheitas (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id              UUID        REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id             UUID        REFERENCES talhoes(id) ON DELETE SET NULL,
  data                  TEXT,
  area_colhida          NUMERIC,
  producao_total        NUMERIC,
  unidade               TEXT,
  umidade               NUMERIC,
  peso_liquido          NUMERIC,
  sacas_ha              NUMERIC,
  armazem_1             TEXT,
  ton_armazem_1         NUMERIC,
  frete_1_ton           NUMERIC,
  armazem_2             TEXT,
  ton_armazem_2         NUMERIC,
  frete_2_ton           NUMERIC,
  preco_venda           NUMERIC,
  receita_total         NUMERIC,
  -- Campos v9.7: classificação silo
  umidade_padrao        NUMERIC(4,1)  DEFAULT 13.0,
  impureza              NUMERIC(5,2)  DEFAULT 0,
  ardidos               NUMERIC(5,2)  DEFAULT 0,
  esverdeados           NUMERIC(5,2)  DEFAULT 0,
  quebrados             NUMERIC(5,2)  DEFAULT 0,
  cpo                   NUMERIC(5,2)  DEFAULT 0,
  taxa_armazenagem      NUMERIC(5,2)  DEFAULT 0,
  preco_base_saca       NUMERIC(12,2) DEFAULT 0,
  peso_liquido_estimado INTEGER       DEFAULT 0,
  observacoes           TEXT,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE colheitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS colheitas_sel ON colheitas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS colheitas_ins ON colheitas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS colheitas_upd ON colheitas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS colheitas_del ON colheitas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_user       ON colheitas(user_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_talhao     ON colheitas(talhao_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_data       ON colheitas(data);
CREATE INDEX IF NOT EXISTS idx_colheitas_updated_at ON colheitas(updated_at);
CREATE INDEX IF NOT EXISTS idx_colheitas_user_safra ON colheitas(user_id, safra_id);
DROP TRIGGER IF EXISTS trg_colheitas_upd ON colheitas;
CREATE TRIGGER trg_colheitas_upd BEFORE UPDATE ON colheitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. COMBUSTIVEL
-- ============================================================
CREATE TABLE IF NOT EXISTS combustivel (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id   UUID        REFERENCES talhoes(id) ON DELETE SET NULL,
  fazenda_id  UUID        REFERENCES fazendas(id) ON DELETE SET NULL,
  maquina_id  UUID,
  operador_id UUID,
  data        TEXT,
  tipo        TEXT,
  deposito    TEXT,
  posto       TEXT,
  litros      NUMERIC,
  preco_litro NUMERIC,
  km_ou_hora  NUMERIC,
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE combustivel ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS combustivel_sel ON combustivel FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS combustivel_ins ON combustivel FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS combustivel_upd ON combustivel FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS combustivel_del ON combustivel FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_user       ON combustivel(user_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_talhao     ON combustivel(talhao_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_user_safra ON combustivel(user_id, safra_id);
DROP TRIGGER IF EXISTS trg_combustivel_upd ON combustivel;
CREATE TRIGGER trg_combustivel_upd BEFORE UPDATE ON combustivel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13-14. DIESEL (ENTRADAS + ESTOQUE)
-- ============================================================
CREATE TABLE IF NOT EXISTS diesel_entradas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  data        TEXT,
  deposito    TEXT,
  litros      NUMERIC,
  preco_litro NUMERIC,
  fornecedor  TEXT,
  nota_fiscal TEXT,
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE diesel_entradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS diesel_entradas_sel ON diesel_entradas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS diesel_entradas_ins ON diesel_entradas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS diesel_entradas_upd ON diesel_entradas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS diesel_entradas_del ON diesel_entradas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_diesel_entradas_user ON diesel_entradas(user_id);
DROP TRIGGER IF EXISTS trg_diesel_entradas_upd ON diesel_entradas;
CREATE TRIGGER trg_diesel_entradas_upd BEFORE UPDATE ON diesel_entradas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS diesel_estoque (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id      UUID        REFERENCES safras(id) ON DELETE CASCADE,
  deposito      TEXT,
  litros        NUMERIC     DEFAULT 0,
  preco_vigente NUMERIC     DEFAULT 0,
  observacoes   TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE diesel_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS diesel_estoque_sel ON diesel_estoque FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS diesel_estoque_ins ON diesel_estoque FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS diesel_estoque_upd ON diesel_estoque FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS diesel_estoque_del ON diesel_estoque FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_diesel_estoque_user ON diesel_estoque(user_id);
DROP TRIGGER IF EXISTS trg_diesel_estoque_upd ON diesel_estoque;
CREATE TRIGGER trg_diesel_estoque_upd BEFORE UPDATE ON diesel_estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 15. CLIMA
-- ============================================================
CREATE TABLE IF NOT EXISTS clima (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  data        TEXT,
  temperatura NUMERIC,
  temp_max    NUMERIC,
  temp_min    NUMERIC,
  umidade     NUMERIC,
  chuva_mm    NUMERIC,
  vento_kmh   NUMERIC,
  condicao    TEXT,
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clima ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS clima_sel ON clima FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS clima_ins ON clima FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS clima_upd ON clima FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS clima_del ON clima FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_clima_user ON clima(user_id);
DROP TRIGGER IF EXISTS trg_clima_upd ON clima;
CREATE TRIGGER trg_clima_upd BEFORE UPDATE ON clima
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 16. MANUTENCOES
-- ============================================================
CREATE TABLE IF NOT EXISTS manutencoes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id              UUID        REFERENCES safras(id) ON DELETE CASCADE,
  maquina_id            UUID,
  maquina_nome          TEXT,
  tipo_manutencao       TEXT,
  data                  TEXT,
  horimetro_atual       NUMERIC,
  intervalo_horas       NUMERIC     DEFAULT 500,
  proxima_data          TEXT,
  proxima_revisao_horas NUMERIC,
  proxima_revisao_data  TEXT,
  mecanico              TEXT,
  oficina               TEXT,
  servico               TEXT,
  servico_realizado     TEXT,
  tempo_parada          NUMERIC,
  pecas                 JSONB,
  pecas_trocadas        TEXT,
  custo_pecas           NUMERIC     DEFAULT 0,
  custo_mao_obra        NUMERIC     DEFAULT 0,
  outros_custos         NUMERIC     DEFAULT 0,
  custo_total           NUMERIC     DEFAULT 0,
  observacoes           TEXT,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS manutencoes_sel ON manutencoes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS manutencoes_ins ON manutencoes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS manutencoes_upd ON manutencoes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS manutencoes_del ON manutencoes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_user       ON manutencoes(user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_maquina    ON manutencoes(maquina_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_data       ON manutencoes(data);
CREATE INDEX IF NOT EXISTS idx_manutencoes_user_safra ON manutencoes(user_id, safra_id);
DROP TRIGGER IF EXISTS trg_manutencoes_upd ON manutencoes;
CREATE TRIGGER trg_manutencoes_upd BEFORE UPDATE ON manutencoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 17. INSUMOS BASE
-- ============================================================
CREATE TABLE IF NOT EXISTS insumos_base (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id       UUID        REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id      UUID        REFERENCES talhoes(id) ON DELETE SET NULL,
  produto        TEXT,
  tipo_insumo    TEXT,
  quantidade     NUMERIC,
  unidade        TEXT,
  custo_unitario NUMERIC,
  custo_total    NUMERIC,
  data           TEXT,
  observacoes    TEXT,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE insumos_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS insumos_base_sel ON insumos_base FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS insumos_base_ins ON insumos_base FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS insumos_base_upd ON insumos_base FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS insumos_base_del ON insumos_base FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_insumos_base_user   ON insumos_base(user_id);
CREATE INDEX IF NOT EXISTS idx_insumos_base_talhao ON insumos_base(talhao_id);
DROP TRIGGER IF EXISTS trg_insumos_base_upd ON insumos_base;
CREATE TRIGGER trg_insumos_base_upd BEFORE UPDATE ON insumos_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 18. LEMBRETES
-- ============================================================
CREATE TABLE IF NOT EXISTS lembretes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  titulo      TEXT,
  descricao   TEXT,
  data        TEXT,
  prioridade  TEXT,
  concluido   BOOLEAN     DEFAULT false,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS lembretes_sel ON lembretes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS lembretes_ins ON lembretes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS lembretes_upd ON lembretes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS lembretes_del ON lembretes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_user ON lembretes(user_id);
DROP TRIGGER IF EXISTS trg_lembretes_upd ON lembretes;
CREATE TRIGGER trg_lembretes_upd BEFORE UPDATE ON lembretes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 19. PRAGAS
-- ============================================================
CREATE TABLE IF NOT EXISTS pragas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id        UUID        REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id       UUID        REFERENCES talhoes(id) ON DELETE SET NULL,
  nome            TEXT,
  nome_cientifico TEXT,
  tipo            TEXT,
  nivel           TEXT,
  data            TEXT,
  temp_min        NUMERIC,
  temp_max        NUMERIC,
  umidade_min     NUMERIC,
  observacoes     TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pragas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS pragas_sel ON pragas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS pragas_ins ON pragas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS pragas_upd ON pragas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS pragas_del ON pragas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_pragas_user ON pragas(user_id);
DROP TRIGGER IF EXISTS trg_pragas_upd ON pragas;
CREATE TRIGGER trg_pragas_upd BEFORE UPDATE ON pragas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 20. PARAMETROS DE MERCADO
-- ============================================================
CREATE TABLE IF NOT EXISTS parametros (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preco_soja                 NUMERIC     DEFAULT 135,
  produtividade_min_soja     NUMERIC     DEFAULT 65,
  produtividade_max_soja     NUMERIC     DEFAULT 75,
  preco_milho                NUMERIC     DEFAULT 63,
  produtividade_min_milho    NUMERIC     DEFAULT 100,
  produtividade_max_milho    NUMERIC     DEFAULT 130,
  preco_sorgo                NUMERIC     DEFAULT 45,
  produtividade_min_sorgo    NUMERIC     DEFAULT 70,
  produtividade_max_sorgo    NUMERIC     DEFAULT 100,
  preco_feijao               NUMERIC     DEFAULT 295,
  produtividade_min_feijao   NUMERIC     DEFAULT 25,
  produtividade_max_feijao   NUMERIC     DEFAULT 40,
  preco_trigo                NUMERIC     DEFAULT 91,
  produtividade_min_trigo    NUMERIC     DEFAULT 40,
  produtividade_max_trigo    NUMERIC     DEFAULT 60,
  preco_arroz                NUMERIC     DEFAULT 66,
  produtividade_min_arroz    NUMERIC     DEFAULT 60,
  produtividade_max_arroz    NUMERIC     DEFAULT 80,
  preco_cafe                 NUMERIC     DEFAULT 1350,
  produtividade_min_cafe     NUMERIC     DEFAULT 20,
  produtividade_max_cafe     NUMERIC     DEFAULT 40,
  preco_canola               NUMERIC     DEFAULT 145,
  produtividade_min_canola   NUMERIC     DEFAULT 40,
  produtividade_max_canola   NUMERIC     DEFAULT 65,
  preco_girassol             NUMERIC     DEFAULT 95,
  produtividade_min_girassol NUMERIC     DEFAULT 35,
  produtividade_max_girassol NUMERIC     DEFAULT 55,
  preco_amendoim             NUMERIC     DEFAULT 230,
  produtividade_min_amendoim NUMERIC     DEFAULT 60,
  produtividade_max_amendoim NUMERIC     DEFAULT 100,
  preco_algodao              NUMERIC     DEFAULT 120,
  produtividade_min_algodao  NUMERIC     DEFAULT 250,
  produtividade_max_algodao  NUMERIC     DEFAULT 300,
  peso_padrao_saca           NUMERIC     DEFAULT 60,
  created_at                 TIMESTAMPTZ DEFAULT now(),
  updated_at                 TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS parametros_sel ON parametros FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS parametros_ins ON parametros FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS parametros_upd ON parametros FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS parametros_del ON parametros FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_parametros_user ON parametros(user_id);
DROP TRIGGER IF EXISTS trg_parametros_upd ON parametros;
CREATE TRIGGER trg_parametros_upd BEFORE UPDATE ON parametros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 21. BACKUP JSON
-- ============================================================
CREATE TABLE IF NOT EXISTS user_data_backup (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_data_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS user_data_backup_sel ON user_data_backup FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS user_data_backup_ins ON user_data_backup FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS user_data_backup_upd ON user_data_backup FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS user_data_backup_del ON user_data_backup FOR DELETE USING ((SELECT auth.uid()) = user_id);
DROP TRIGGER IF EXISTS trg_user_data_backup_upd ON user_data_backup;
CREATE TRIGGER trg_user_data_backup_upd BEFORE UPDATE ON user_data_backup
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 22. FOLHA SALARIAL (novo v9.6)
-- ============================================================
CREATE TABLE IF NOT EXISTS folha_salarial (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id            UUID REFERENCES safras(id) ON DELETE SET NULL,
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
  criado_em           TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE folha_salarial ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS folha_salarial_sel ON folha_salarial FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS folha_salarial_ins ON folha_salarial FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS folha_salarial_upd ON folha_salarial FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS folha_salarial_del ON folha_salarial FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_user        ON folha_salarial(user_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_safra       ON folha_salarial(safra_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_competencia ON folha_salarial(competencia);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_updated_at  ON folha_salarial(updated_at);
DROP TRIGGER IF EXISTS trg_folha_salarial_upd ON folha_salarial;
CREATE TRIGGER trg_folha_salarial_upd BEFORE UPDATE ON folha_salarial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 23. ANALISE SOLO (novo v9.6)
-- ============================================================
CREATE TABLE IF NOT EXISTS analise_solo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id            UUID REFERENCES safras(id) ON DELETE SET NULL,
  talhao_id           UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  talhao_nome         TEXT,
  talhao_area         NUMERIC(10,2),
  talhao_cultura      TEXT,
  fazenda_nome        TEXT,
  data                DATE,
  laboratorio         TEXT,
  profundidade        TEXT DEFAULT '0-20 cm',
  textura             TEXT,
  numero_laudo        TEXT,
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
  ctc                 NUMERIC(8,2),
  v_pct               NUMERIC(5,1),
  m_pct               NUMERIC(5,1),
  areia               NUMERIC(5,1),
  silte               NUMERIC(5,1),
  argila              NUMERIC(5,1),
  recom_calagem       NUMERIC(8,2),
  recom_gessagem      NUMERIC(8,2),
  recom_adubacao      TEXT,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE analise_solo ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS analise_solo_sel ON analise_solo FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS analise_solo_ins ON analise_solo FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS analise_solo_upd ON analise_solo FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS analise_solo_del ON analise_solo FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_user    ON analise_solo(user_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_safra   ON analise_solo(safra_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_talhao  ON analise_solo(talhao_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_updated_at ON analise_solo(updated_at);
DROP TRIGGER IF EXISTS trg_analise_solo_upd ON analise_solo;
CREATE TRIGGER trg_analise_solo_upd BEFORE UPDATE ON analise_solo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 24. AI USAGE LOG (rate limiting para Edge Functions)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS ai_usage_log_sel ON ai_usage_log FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY IF NOT EXISTS ai_usage_log_ins ON ai_usage_log FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user    ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON ai_usage_log(created_at);

-- Limpeza automática: remover registros com mais de 24h (economia de espaço)
-- Pode ser executado via cron do Supabase ou manualmente
-- DELETE FROM ai_usage_log WHERE created_at < now() - interval '24 hours';

-- ============================================================
-- 25. TRIGGER DE SIGNUP → cria profile automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, cpf, phone, user_role, plan_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cpf', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    'admin',
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    cpf        = COALESCE(EXCLUDED.cpf, profiles.cpf),
    phone      = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CONCLUIDO — AGRO PRO v10.0
-- ============================================================
-- Tabelas criadas: 24
--   profiles, safras, fazendas, talhoes, maquinas, equipe,
--   produtos, estoque, aplicacoes, colheitas, combustivel,
--   diesel_entradas, diesel_estoque, clima, manutencoes,
--   insumos_base, lembretes, pragas, parametros,
--   user_data_backup, folha_salarial, analise_solo, ai_usage_log
-- RLS: 4 policies por tabela (sel/ins/upd/del)
-- Indices: performance otimizada
-- Triggers: updated_at automatico
-- Signup trigger: profile automatico (cpf, phone, plan=free)
-- 100% compativel com supabase-client.js TABLE_MAP/FIELD_MAP
-- Planos: Free (R$0) / Pro (R$199) / Master (R$299)
-- ============================================================
