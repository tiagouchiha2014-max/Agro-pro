-- ============================================================
-- AGRO PRO — Setup Supabase COMPLETO v8.0
-- ✅ PROJETO NOVO — rode apenas uma vez
-- ✅ Sem ALTER TABLE (tabelas criadas completas)
-- ✅ Uma policy por operação por tabela (sem duplicatas)
-- ✅ RLS com (SELECT auth.uid()) — sem warnings de performance
-- ✅ Trigger auto-profile no cadastro (cpf + phone + plan=free)
-- ✅ Todos os grãos: soja, milho, sorgo, feijão, trigo,
--    arroz, café, canola, girassol, amendoim
-- ✅ pragas: temp_min, temp_max, umidade_min incluídos
-- ✅ 100% compatível com FIELD_MAP do supabase-client.js
-- ✅ profiles: cpf, phone, plan_type DEFAULT 'free' (sem trial)
-- ✅ Planos: Free (R$0) / Pro (R$199) / Master (R$299)
-- ============================================================
-- Como usar:
--   1. Crie um novo projeto no supabase.com
--   2. Vá em SQL Editor → New Query
--   3. Cole TODO este bloco e clique em Run
-- ============================================================

-- ============================================================
-- 1. FUNÇÃO updated_at
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
CREATE TABLE profiles (
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
CREATE POLICY profiles_sel ON profiles FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_ins ON profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_upd ON profiles FOR UPDATE USING ((SELECT auth.uid()) = id);
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. SAFRAS
-- ============================================================
CREATE TABLE safras (
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
CREATE POLICY safras_sel ON safras FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY safras_ins ON safras FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY safras_upd ON safras FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY safras_del ON safras FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_safras_user ON safras(user_id);
CREATE TRIGGER trg_safras_upd BEFORE UPDATE ON safras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. FAZENDAS
-- ============================================================
CREATE TABLE fazendas (
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
CREATE POLICY fazendas_sel ON fazendas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY fazendas_ins ON fazendas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY fazendas_upd ON fazendas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY fazendas_del ON fazendas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_fazendas_user  ON fazendas(user_id);
CREATE INDEX idx_fazendas_safra ON fazendas(safra_id);
CREATE TRIGGER trg_fazendas_upd BEFORE UPDATE ON fazendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. TALHÕES
-- ============================================================
CREATE TABLE talhoes (
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
CREATE POLICY talhoes_sel ON talhoes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY talhoes_ins ON talhoes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY talhoes_upd ON talhoes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY talhoes_del ON talhoes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_talhoes_user    ON talhoes(user_id);
CREATE INDEX idx_talhoes_safra   ON talhoes(safra_id);
CREATE INDEX idx_talhoes_fazenda ON talhoes(fazenda_id);
CREATE INDEX idx_talhoes_user_safra ON talhoes(user_id, safra_id);
CREATE TRIGGER trg_talhoes_upd BEFORE UPDATE ON talhoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. MÁQUINAS
-- ============================================================
CREATE TABLE maquinas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id    UUID        REFERENCES safras(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  tipo        TEXT,
  marca       TEXT,
  modelo      TEXT,
  ano         NUMERIC,
  placa       TEXT,
  horimetro   NUMERIC     DEFAULT 0,
  capacidade_l NUMERIC,
  bicos       TEXT,
  status      TEXT        DEFAULT 'ativo',
  observacoes TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY maquinas_sel ON maquinas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY maquinas_ins ON maquinas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY maquinas_upd ON maquinas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY maquinas_del ON maquinas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_maquinas_user  ON maquinas(user_id);
CREATE INDEX idx_maquinas_safra ON maquinas(safra_id);
CREATE TRIGGER trg_maquinas_upd BEFORE UPDATE ON maquinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. EQUIPE
-- ============================================================
CREATE TABLE equipe (
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
CREATE POLICY equipe_sel ON equipe FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY equipe_ins ON equipe FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY equipe_upd ON equipe FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY equipe_del ON equipe FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_equipe_user ON equipe(user_id);
CREATE TRIGGER trg_equipe_upd BEFORE UPDATE ON equipe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. PRODUTOS
-- ============================================================
CREATE TABLE produtos (
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
CREATE POLICY produtos_sel ON produtos FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY produtos_ins ON produtos FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY produtos_upd ON produtos FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY produtos_del ON produtos FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_produtos_user ON produtos(user_id);
CREATE TRIGGER trg_produtos_upd BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. ESTOQUE
-- ============================================================
CREATE TABLE estoque (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id        UUID        REFERENCES safras(id) ON DELETE CASCADE,
  produto_id      UUID        REFERENCES produtos(id) ON DELETE SET NULL,
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
CREATE POLICY estoque_sel ON estoque FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY estoque_ins ON estoque FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY estoque_upd ON estoque FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY estoque_del ON estoque FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_estoque_user ON estoque(user_id);
CREATE TRIGGER trg_estoque_upd BEFORE UPDATE ON estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. APLICAÇÕES
-- ============================================================
CREATE TABLE aplicacoes (
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
CREATE POLICY aplicacoes_sel ON aplicacoes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY aplicacoes_ins ON aplicacoes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY aplicacoes_upd ON aplicacoes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY aplicacoes_del ON aplicacoes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_aplicacoes_user       ON aplicacoes(user_id);
CREATE INDEX idx_aplicacoes_safra      ON aplicacoes(safra_id);
CREATE INDEX idx_aplicacoes_talhao     ON aplicacoes(talhao_id);
CREATE INDEX idx_aplicacoes_user_safra ON aplicacoes(user_id, safra_id);
CREATE TRIGGER trg_aplicacoes_upd BEFORE UPDATE ON aplicacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. COLHEITAS
-- ============================================================
CREATE TABLE colheitas (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id       UUID        REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id      UUID        REFERENCES talhoes(id) ON DELETE SET NULL,
  data           TEXT,
  area_colhida   NUMERIC,
  producao_total NUMERIC,
  unidade        TEXT,
  umidade        NUMERIC,
  peso_liquido   NUMERIC,
  sacas_ha       NUMERIC,
  armazem_1      TEXT,
  ton_armazem_1  NUMERIC,
  frete_1_ton    NUMERIC,
  armazem_2      TEXT,
  ton_armazem_2  NUMERIC,
  frete_2_ton    NUMERIC,
  preco_venda    NUMERIC,
  receita_total  NUMERIC,
  observacoes    TEXT,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE colheitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY colheitas_sel ON colheitas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY colheitas_ins ON colheitas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY colheitas_upd ON colheitas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY colheitas_del ON colheitas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_colheitas_user       ON colheitas(user_id);
CREATE INDEX idx_colheitas_talhao     ON colheitas(talhao_id);
CREATE INDEX idx_colheitas_user_safra ON colheitas(user_id, safra_id);
CREATE TRIGGER trg_colheitas_upd BEFORE UPDATE ON colheitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. COMBUSTÍVEL
-- ============================================================
CREATE TABLE combustivel (
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
CREATE POLICY combustivel_sel ON combustivel FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY combustivel_ins ON combustivel FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY combustivel_upd ON combustivel FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY combustivel_del ON combustivel FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_combustivel_user       ON combustivel(user_id);
CREATE INDEX idx_combustivel_talhao     ON combustivel(talhao_id);
CREATE INDEX idx_combustivel_user_safra ON combustivel(user_id, safra_id);
CREATE TRIGGER trg_combustivel_upd BEFORE UPDATE ON combustivel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. DIESEL ENTRADAS
-- ============================================================
CREATE TABLE diesel_entradas (
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
CREATE POLICY diesel_entradas_sel ON diesel_entradas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY diesel_entradas_ins ON diesel_entradas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY diesel_entradas_upd ON diesel_entradas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY diesel_entradas_del ON diesel_entradas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_diesel_entradas_user ON diesel_entradas(user_id);
CREATE TRIGGER trg_diesel_entradas_upd BEFORE UPDATE ON diesel_entradas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 14. DIESEL ESTOQUE
-- ============================================================
CREATE TABLE diesel_estoque (
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
CREATE POLICY diesel_estoque_sel ON diesel_estoque FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY diesel_estoque_ins ON diesel_estoque FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY diesel_estoque_upd ON diesel_estoque FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY diesel_estoque_del ON diesel_estoque FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_diesel_estoque_user ON diesel_estoque(user_id);
CREATE TRIGGER trg_diesel_estoque_upd BEFORE UPDATE ON diesel_estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 15. CLIMA
-- ============================================================
CREATE TABLE clima (
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
CREATE POLICY clima_sel ON clima FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY clima_ins ON clima FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY clima_upd ON clima FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY clima_del ON clima FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_clima_user ON clima(user_id);
CREATE TRIGGER trg_clima_upd BEFORE UPDATE ON clima
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 16. MANUTENÇÕES
-- ============================================================
CREATE TABLE manutencoes (
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
CREATE POLICY manutencoes_sel ON manutencoes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY manutencoes_ins ON manutencoes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY manutencoes_upd ON manutencoes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY manutencoes_del ON manutencoes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_manutencoes_user        ON manutencoes(user_id);
CREATE INDEX idx_manutencoes_maquina     ON manutencoes(maquina_id);
CREATE INDEX idx_manutencoes_user_safra  ON manutencoes(user_id, safra_id);
CREATE TRIGGER trg_manutencoes_upd BEFORE UPDATE ON manutencoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 17. INSUMOS BASE
-- ============================================================
CREATE TABLE insumos_base (
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
CREATE POLICY insumos_base_sel ON insumos_base FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY insumos_base_ins ON insumos_base FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY insumos_base_upd ON insumos_base FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY insumos_base_del ON insumos_base FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_insumos_base_user   ON insumos_base(user_id);
CREATE INDEX idx_insumos_base_talhao ON insumos_base(talhao_id);
CREATE TRIGGER trg_insumos_base_upd BEFORE UPDATE ON insumos_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 18. LEMBRETES
-- ============================================================
CREATE TABLE lembretes (
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
CREATE POLICY lembretes_sel ON lembretes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY lembretes_ins ON lembretes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY lembretes_upd ON lembretes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY lembretes_del ON lembretes FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_lembretes_user ON lembretes(user_id);
CREATE TRIGGER trg_lembretes_upd BEFORE UPDATE ON lembretes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 19. PRAGAS
-- ============================================================
CREATE TABLE pragas (
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
CREATE POLICY pragas_sel ON pragas FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY pragas_ins ON pragas FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY pragas_upd ON pragas FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY pragas_del ON pragas FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_pragas_user ON pragas(user_id);
CREATE TRIGGER trg_pragas_upd BEFORE UPDATE ON pragas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 20. PARÂMETROS DE MERCADO
-- ============================================================
CREATE TABLE parametros (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Soja
  preco_soja                 NUMERIC     DEFAULT 120,
  produtividade_min_soja     NUMERIC     DEFAULT 65,
  produtividade_max_soja     NUMERIC     DEFAULT 75,
  -- Milho
  preco_milho                NUMERIC     DEFAULT 60,
  produtividade_min_milho    NUMERIC     DEFAULT 100,
  produtividade_max_milho    NUMERIC     DEFAULT 130,
  -- Sorgo
  preco_sorgo                NUMERIC     DEFAULT 42,
  produtividade_min_sorgo    NUMERIC     DEFAULT 70,
  produtividade_max_sorgo    NUMERIC     DEFAULT 100,
  -- Feijão
  preco_feijao               NUMERIC     DEFAULT 280,
  produtividade_min_feijao   NUMERIC     DEFAULT 25,
  produtividade_max_feijao   NUMERIC     DEFAULT 40,
  -- Trigo
  preco_trigo                NUMERIC     DEFAULT 85,
  produtividade_min_trigo    NUMERIC     DEFAULT 40,
  produtividade_max_trigo    NUMERIC     DEFAULT 60,
  -- Arroz
  preco_arroz                NUMERIC     DEFAULT 60,
  produtividade_min_arroz    NUMERIC     DEFAULT 60,
  produtividade_max_arroz    NUMERIC     DEFAULT 80,
  -- Café
  preco_cafe                 NUMERIC     DEFAULT 1200,
  produtividade_min_cafe     NUMERIC     DEFAULT 20,
  produtividade_max_cafe     NUMERIC     DEFAULT 40,
  -- Canola
  preco_canola               NUMERIC     DEFAULT 140,
  produtividade_min_canola   NUMERIC     DEFAULT 40,
  produtividade_max_canola   NUMERIC     DEFAULT 65,
  -- Girassol
  preco_girassol             NUMERIC     DEFAULT 90,
  produtividade_min_girassol NUMERIC     DEFAULT 35,
  produtividade_max_girassol NUMERIC     DEFAULT 55,
  -- Amendoim
  preco_amendoim             NUMERIC     DEFAULT 220,
  produtividade_min_amendoim NUMERIC     DEFAULT 60,
  produtividade_max_amendoim NUMERIC     DEFAULT 100,
  -- Algodão (retrocompatibilidade)
  preco_algodao              NUMERIC     DEFAULT 150,
  produtividade_min_algodao  NUMERIC     DEFAULT 250,
  produtividade_max_algodao  NUMERIC     DEFAULT 300,
  -- Geral
  peso_padrao_saca           NUMERIC     DEFAULT 60,
  created_at                 TIMESTAMPTZ DEFAULT now(),
  updated_at                 TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY parametros_sel ON parametros FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY parametros_ins ON parametros FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY parametros_upd ON parametros FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY parametros_del ON parametros FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE INDEX idx_parametros_user ON parametros(user_id);
CREATE TRIGGER trg_parametros_upd BEFORE UPDATE ON parametros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 21. BACKUP JSON
-- ============================================================
CREATE TABLE user_data_backup (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_data_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_data_backup_sel ON user_data_backup FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_data_backup_ins ON user_data_backup FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_data_backup_upd ON user_data_backup FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_data_backup_del ON user_data_backup FOR DELETE USING ((SELECT auth.uid()) = user_id);
CREATE TRIGGER trg_user_data_backup_upd BEFORE UPDATE ON user_data_backup
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 22. TRIGGER DE SIGNUP → cria profile automaticamente
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
-- CONCLUÍDO — AGRO PRO v8.0
-- Tabelas criadas: 21
-- Profiles: cpf + phone adicionados, plan_type DEFAULT 'free'
-- Trigger signup: salva cpf, phone, plan='free' (sem trial)
-- Policies por tabela: 4 (sel/ins/upd/del) — sem duplicatas
-- Todos os grãos configurados com DEFAULT
-- pragas: temp_min, temp_max, umidade_min ✅
-- 100% compatível com FIELD_MAP (supabase-client.js)
-- Planos: Free (R$0) / Pro (R$199) / Master (R$299)
-- ============================================================
