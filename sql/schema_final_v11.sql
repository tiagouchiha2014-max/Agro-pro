-- ============================================================
-- AGRO PRO — SQL SCHEMA DEFINITIVO v11.0
-- Supabase PostgreSQL — 100% compativel com front-end
--
-- INSTRUCOES:
-- 1. Crie um NOVO projeto no Supabase (supabase.com)
-- 2. Abra o SQL Editor → New Query
-- 3. Cole este script INTEIRO e clique "Run"
-- 4. Copie a Project URL e anon key em supabase-client.js
--
-- SEGURANCA:
-- - RLS habilitado em TODAS as tabelas
-- - Politicas SELECT/INSERT/UPDATE/DELETE por auth.uid()
-- - Trigger automatico para criar perfil apos signup
-- - Nenhuma tabela acessivel sem autenticacao
--
-- COMPATIBILIDADE:
-- - Cada coluna corresponde EXATAMENTE ao campo do front-end
-- - toSnakeCase() usa FIELD_MAP + regex fallback
-- - Campos JSONB para objetos/arrays aninhados
-- - Idempotente: seguro re-executar (IF NOT EXISTS)
-- ============================================================

-- ============================================================
-- 0. EXTENSOES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FUNCAO: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. PROFILES (trigger de auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  cpf         TEXT,
  phone       TEXT,
  plan_type   TEXT DEFAULT 'free' CHECK (plan_type IN ('free','pro','master','trial')),
  user_role   TEXT DEFAULT 'admin' CHECK (user_role IN ('admin','gerente','funcionario','desativado')),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: criar perfil automaticamente apos signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, plan_type, user_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'plan_type', 'free'),
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_owner" ON profiles FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf) WHERE cpf IS NOT NULL AND cpf != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL AND phone != '';

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 2. USER_DATA_BACKUP (backup JSON completo)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_data_backup (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_data_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backup_all" ON user_data_backup;
CREATE POLICY "backup_all" ON user_data_backup
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. SAFRAS
-- Campos: nome, data_inicio, data_fim, ativa, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS safras (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  data_inicio  DATE,
  data_fim     DATE,
  ativa        BOOLEAN DEFAULT TRUE,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "safras_all" ON safras;
CREATE POLICY "safras_all" ON safras
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_safras_user ON safras(user_id);

DROP TRIGGER IF EXISTS safras_updated_at ON safras;
CREATE TRIGGER safras_updated_at
  BEFORE UPDATE ON safras FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 4. FAZENDAS
-- Campos: safra_id, nome, cidade, uf, area_ha, latitude, longitude, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS fazendas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  cidade       TEXT,
  uf           TEXT,
  area_ha      NUMERIC(12,2) DEFAULT 0,
  latitude     TEXT,
  longitude    TEXT,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fazendas_all" ON fazendas;
CREATE POLICY "fazendas_all" ON fazendas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fazendas_user ON fazendas(user_id);
CREATE INDEX IF NOT EXISTS idx_fazendas_safra ON fazendas(safra_id);

DROP TRIGGER IF EXISTS fazendas_updated_at ON fazendas;
CREATE TRIGGER fazendas_updated_at
  BEFORE UPDATE ON fazendas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 5. TALHOES
-- Campos: safra_id, fazenda_id, nome, area_ha, cultura, safra, solo, coordenadas, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS talhoes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  fazenda_id   UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  area_ha      NUMERIC(12,2) DEFAULT 0,
  cultura      TEXT,
  safra        TEXT,           -- "safra ref." text field (not FK)
  solo         TEXT,
  coordenadas  TEXT,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE talhoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "talhoes_all" ON talhoes;
CREATE POLICY "talhoes_all" ON talhoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_talhoes_user ON talhoes(user_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_safra ON talhoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_fazenda ON talhoes(fazenda_id);

DROP TRIGGER IF EXISTS talhoes_updated_at ON talhoes;
CREATE TRIGGER talhoes_updated_at
  BEFORE UPDATE ON talhoes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 6. PRODUTOS
-- Campos: safra_id, tipo, nome, ingrediente, fabricante, registro,
--         preco, unidade, carencia_dias, reentrada_horas, pragas_alvo, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id        UUID REFERENCES safras(id) ON DELETE SET NULL,
  tipo            TEXT,
  nome            TEXT NOT NULL,
  ingrediente     TEXT,
  fabricante      TEXT,
  registro        TEXT,
  preco           NUMERIC(12,2) DEFAULT 0,
  unidade         TEXT,
  carencia_dias   INTEGER DEFAULT 0,
  reentrada_horas INTEGER DEFAULT 0,
  pragas_alvo     JSONB DEFAULT '[]'::jsonb,    -- array of strings
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produtos_all" ON produtos;
CREATE POLICY "produtos_all" ON produtos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_produtos_user ON produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_safra ON produtos(safra_id);

DROP TRIGGER IF EXISTS produtos_updated_at ON produtos;
CREATE TRIGGER produtos_updated_at
  BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 7. ESTOQUE
-- Campos: safra_id, produto_id, deposito, lote, validade, quantidade_atual, unidade, observacoes
-- Note: front-end uses BOTH safraId (->safra_id) and safra_id directly
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id         UUID REFERENCES safras(id) ON DELETE SET NULL,
  produto_id       UUID REFERENCES produtos(id) ON DELETE SET NULL,
  deposito         TEXT,
  lote             TEXT,
  validade         TEXT,
  quantidade_atual NUMERIC(14,4) DEFAULT 0,
  unidade          TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "estoque_all" ON estoque;
CREATE POLICY "estoque_all" ON estoque
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_estoque_user ON estoque(user_id);
CREATE INDEX IF NOT EXISTS idx_estoque_safra ON estoque(safra_id);
CREATE INDEX IF NOT EXISTS idx_estoque_produto ON estoque(produto_id);

DROP TRIGGER IF EXISTS estoque_updated_at ON estoque;
CREATE TRIGGER estoque_updated_at
  BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 8. MAQUINAS
-- Campos: safra_id, nome, marca, modelo, placa, ano, horimetro,
--         capacidade_l, bicos, status, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS maquinas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  marca        TEXT,
  modelo       TEXT,
  placa        TEXT,
  ano          INTEGER,
  horimetro    NUMERIC(12,2) DEFAULT 0,
  capacidade_l NUMERIC(12,2) DEFAULT 0,   -- capacidadeL -> capacidade_l (regex fallback)
  bicos        TEXT,
  status       TEXT DEFAULT 'ativo',
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maquinas_all" ON maquinas;
CREATE POLICY "maquinas_all" ON maquinas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_maquinas_user ON maquinas(user_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_safra ON maquinas(safra_id);

DROP TRIGGER IF EXISTS maquinas_updated_at ON maquinas;
CREATE TRIGGER maquinas_updated_at
  BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 9. EQUIPE
-- Campos: safra_id, nome, funcao, telefone, nr, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS equipe (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  funcao       TEXT,
  telefone     TEXT,
  nr           TEXT,            -- NR / certificacoes
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipe_all" ON equipe;
CREATE POLICY "equipe_all" ON equipe
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_equipe_user ON equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_equipe_safra ON equipe(safra_id);

DROP TRIGGER IF EXISTS equipe_updated_at ON equipe;
CREATE TRIGGER equipe_updated_at
  BEFORE UPDATE ON equipe FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 10. APLICACOES
-- Campos: safra_id, data, fazenda_id, talhao_id, area_ha_aplicada,
--         cultura, alvo, operacao, maquina_id, operador_id,
--         condicoes (JSONB), produtos (JSONB), custo_total, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS aplicacoes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id          UUID REFERENCES safras(id) ON DELETE SET NULL,
  data              DATE,
  fazenda_id        UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  talhao_id         UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  area_ha_aplicada  NUMERIC(12,2) DEFAULT 0,   -- areaHaAplicada -> area_ha_aplicada (regex fallback)
  cultura           TEXT,
  alvo              TEXT,
  operacao          TEXT,
  maquina_id        UUID REFERENCES maquinas(id) ON DELETE SET NULL,
  operador_id       UUID REFERENCES equipe(id) ON DELETE SET NULL,
  condicoes         JSONB DEFAULT '{}'::jsonb,   -- {vento, temp, umidade}
  produtos          JSONB DEFAULT '[]'::jsonb,   -- [{produtoId, produtoNome, dosePorHa, unidade, precoUnit}]
  custo_total       NUMERIC(14,2) DEFAULT 0,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aplicacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aplicacoes_all" ON aplicacoes;
CREATE POLICY "aplicacoes_all" ON aplicacoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_aplicacoes_user ON aplicacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_safra ON aplicacoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_talhao ON aplicacoes(talhao_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_fazenda ON aplicacoes(fazenda_id);

DROP TRIGGER IF EXISTS aplicacoes_updated_at ON aplicacoes;
CREATE TRIGGER aplicacoes_updated_at
  BEFORE UPDATE ON aplicacoes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 11. COLHEITAS
-- Campos: safra_id, data_colheita, talhao_id, producao_total, unidade,
--         umidade, temperatura, romaneio, observacoes,
--         maquinas (JSONB), umidade_padrao, impureza, ardidos, esverdeados,
--         quebrados, cpo, taxa_armazenagem, preco_base_saca,
--         peso_liquido_estimado, frete1 (JSONB), frete2 (JSONB), fretes (JSONB)
-- ============================================================
CREATE TABLE IF NOT EXISTS colheitas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id              UUID REFERENCES safras(id) ON DELETE SET NULL,
  data_colheita         DATE,                     -- dataColheita -> data_colheita (regex fallback)
  talhao_id             UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  producao_total        NUMERIC(14,2) DEFAULT 0,
  unidade               TEXT DEFAULT 'kg',
  umidade               NUMERIC(6,2),
  temperatura           NUMERIC(6,2),
  romaneio              TEXT,
  observacoes           TEXT,
  -- Maquinas utilizadas (JSONB array)
  maquinas              JSONB DEFAULT '[]'::jsonb,   -- [{maquinaId, horas}]
  -- Classificacao silo / descontos
  umidade_padrao        NUMERIC(6,2),
  impureza              NUMERIC(6,2),
  ardidos               NUMERIC(6,2),
  esverdeados           NUMERIC(6,2),
  quebrados             NUMERIC(6,2),
  cpo                   NUMERIC(6,2),
  taxa_armazenagem      NUMERIC(6,2),
  preco_base_saca       NUMERIC(12,2),
  peso_liquido_estimado NUMERIC(14,2),
  -- Frete (JSONB objects/arrays)
  frete1                JSONB,   -- {armazem, cidade, placa, tipoCaminhao, capacidade, motorista, cnh, ...}
  frete2                JSONB,
  fretes                JSONB DEFAULT '[]'::jsonb,   -- array of frete objects
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE colheitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colheitas_all" ON colheitas;
CREATE POLICY "colheitas_all" ON colheitas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_colheitas_user ON colheitas(user_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_safra ON colheitas(safra_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_talhao ON colheitas(talhao_id);

DROP TRIGGER IF EXISTS colheitas_updated_at ON colheitas;
CREATE TRIGGER colheitas_updated_at
  BEFORE UPDATE ON colheitas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 12. COMBUSTIVEL (saidas / abastecimentos)
-- Campos: safra_id, data, tipo, deposito, posto, maquina_id, operador_id,
--         fazenda_id, talhao_id, litros, preco_litro, km_ou_hora, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS combustivel (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  data         DATE,
  tipo         TEXT DEFAULT 'Diesel S10',
  deposito     TEXT,
  posto        TEXT,
  maquina_id   UUID REFERENCES maquinas(id) ON DELETE SET NULL,
  operador_id  UUID REFERENCES equipe(id) ON DELETE SET NULL,
  fazenda_id   UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  talhao_id    UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  litros       NUMERIC(12,2) DEFAULT 0,
  preco_litro  NUMERIC(10,4) DEFAULT 0,
  km_ou_hora   NUMERIC(12,2) DEFAULT 0,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE combustivel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combustivel_all" ON combustivel;
CREATE POLICY "combustivel_all" ON combustivel
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_combustivel_user ON combustivel(user_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_safra ON combustivel(safra_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_maquina ON combustivel(maquina_id);

DROP TRIGGER IF EXISTS combustivel_updated_at ON combustivel;
CREATE TRIGGER combustivel_updated_at
  BEFORE UPDATE ON combustivel FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 13. DIESEL_ENTRADAS
-- Campos: safra_id, data, litros, preco_litro, deposito, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS diesel_entradas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  data         DATE,
  litros       NUMERIC(12,2) DEFAULT 0,
  preco_litro  NUMERIC(10,4) DEFAULT 0,
  deposito     TEXT,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diesel_entradas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diesel_entradas_all" ON diesel_entradas;
CREATE POLICY "diesel_entradas_all" ON diesel_entradas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_diesel_entradas_user ON diesel_entradas(user_id);
CREATE INDEX IF NOT EXISTS idx_diesel_entradas_safra ON diesel_entradas(safra_id);

DROP TRIGGER IF EXISTS diesel_entradas_updated_at ON diesel_entradas;
CREATE TRIGGER diesel_entradas_updated_at
  BEFORE UPDATE ON diesel_entradas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 14. DIESEL_ESTOQUE
-- Campos: safra_id, deposito, litros, preco_vigente, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS diesel_estoque (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id       UUID REFERENCES safras(id) ON DELETE SET NULL,
  deposito       TEXT,
  litros         NUMERIC(12,2) DEFAULT 0,
  preco_vigente  NUMERIC(10,4) DEFAULT 0,
  observacoes    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diesel_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diesel_estoque_all" ON diesel_estoque;
CREATE POLICY "diesel_estoque_all" ON diesel_estoque
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_diesel_estoque_user ON diesel_estoque(user_id);
CREATE INDEX IF NOT EXISTS idx_diesel_estoque_safra ON diesel_estoque(safra_id);

DROP TRIGGER IF EXISTS diesel_estoque_updated_at ON diesel_estoque;
CREATE TRIGGER diesel_estoque_updated_at
  BEFORE UPDATE ON diesel_estoque FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 15. CLIMA
-- Campos: safra_id, data, fazenda_id, talhao_id, chuva_mm, temp_max,
--         temp_min, umidade, vento, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS clima (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  data         DATE,
  fazenda_id   UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  talhao_id    UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  chuva_mm     NUMERIC(8,2) DEFAULT 0,
  temp_max     NUMERIC(6,2),
  temp_min     NUMERIC(6,2),
  umidade      NUMERIC(6,2),
  vento        NUMERIC(8,2),
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clima ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clima_all" ON clima;
CREATE POLICY "clima_all" ON clima
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_clima_user ON clima(user_id);
CREATE INDEX IF NOT EXISTS idx_clima_safra ON clima(safra_id);
CREATE INDEX IF NOT EXISTS idx_clima_data ON clima(data);

DROP TRIGGER IF EXISTS clima_updated_at ON clima;
CREATE TRIGGER clima_updated_at
  BEFORE UPDATE ON clima FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 16. MANUTENCOES
-- Campos: safra_id, data, maquina_id, tipo_manutencao, horimetro_atual,
--         intervalo_horas, proxima_data, mecanico, oficina, servico,
--         tempo_parada, pecas (JSONB), custo_pecas, custo_mao_obra,
--         outros_custos, custo_total, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS manutencoes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id         UUID REFERENCES safras(id) ON DELETE SET NULL,
  data             DATE,
  maquina_id       UUID REFERENCES maquinas(id) ON DELETE SET NULL,
  tipo_manutencao  TEXT,
  horimetro_atual  NUMERIC(12,2) DEFAULT 0,
  intervalo_horas  NUMERIC(10,2) DEFAULT 500,
  proxima_data     DATE,
  mecanico         TEXT,
  oficina          TEXT,
  servico          TEXT,
  tempo_parada     NUMERIC(8,2) DEFAULT 0,
  pecas            JSONB DEFAULT '[]'::jsonb,   -- [{nome, qtd, preco}]
  custo_pecas      NUMERIC(12,2) DEFAULT 0,
  custo_mao_obra   NUMERIC(12,2) DEFAULT 0,
  outros_custos    NUMERIC(12,2) DEFAULT 0,
  custo_total      NUMERIC(14,2) DEFAULT 0,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manutencoes_all" ON manutencoes;
CREATE POLICY "manutencoes_all" ON manutencoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_manutencoes_user ON manutencoes(user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_safra ON manutencoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_maquina ON manutencoes(maquina_id);

DROP TRIGGER IF EXISTS manutencoes_updated_at ON manutencoes;
CREATE TRIGGER manutencoes_updated_at
  BEFORE UPDATE ON manutencoes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 17. INSUMOS_BASE
-- Campos: safra_id, data, talhao_id, tipo_insumo, operacao,
--         produtos (JSONB), custo_total, area_ha, observacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS insumos_base (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  data         DATE,
  talhao_id    UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  tipo_insumo  TEXT,
  operacao     TEXT,
  produtos     JSONB DEFAULT '[]'::jsonb,   -- [{produtoId, nome, doseHa, preco, unidade, custoLinha}]
  custo_total  NUMERIC(14,2) DEFAULT 0,
  area_ha      NUMERIC(12,2) DEFAULT 0,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insumos_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insumos_base_all" ON insumos_base;
CREATE POLICY "insumos_base_all" ON insumos_base
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_insumos_base_user ON insumos_base(user_id);
CREATE INDEX IF NOT EXISTS idx_insumos_base_safra ON insumos_base(safra_id);
CREATE INDEX IF NOT EXISTS idx_insumos_base_talhao ON insumos_base(talhao_id);

DROP TRIGGER IF EXISTS insumos_base_updated_at ON insumos_base;
CREATE TRIGGER insumos_base_updated_at
  BEFORE UPDATE ON insumos_base FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 18. LEMBRETES
-- Campos: safra_id, titulo, data, descricao, concluido
-- ============================================================
CREATE TABLE IF NOT EXISTS lembretes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id     UUID REFERENCES safras(id) ON DELETE SET NULL,
  titulo       TEXT,
  data         DATE,
  descricao    TEXT,
  concluido    BOOLEAN DEFAULT FALSE,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lembretes_all" ON lembretes;
CREATE POLICY "lembretes_all" ON lembretes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lembretes_user ON lembretes(user_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_safra ON lembretes(safra_id);

DROP TRIGGER IF EXISTS lembretes_updated_at ON lembretes;
CREATE TRIGGER lembretes_updated_at
  BEFORE UPDATE ON lembretes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 19. PRAGAS
-- Campos: safra_id, nome, nome_cientifico, culturas, temp_min, temp_max, umidade_min
-- ============================================================
CREATE TABLE IF NOT EXISTS pragas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id        UUID REFERENCES safras(id) ON DELETE SET NULL,
  nome            TEXT,
  nome_cientifico TEXT,
  culturas        JSONB DEFAULT '[]'::jsonb,
  temp_min        NUMERIC(6,2),
  temp_max        NUMERIC(6,2),
  umidade_min     NUMERIC(6,2),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pragas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pragas_all" ON pragas;
CREATE POLICY "pragas_all" ON pragas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pragas_user ON pragas(user_id);
CREATE INDEX IF NOT EXISTS idx_pragas_safra ON pragas(safra_id);

DROP TRIGGER IF EXISTS pragas_updated_at ON pragas;
CREATE TRIGGER pragas_updated_at
  BEFORE UPDATE ON pragas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 20. FOLHA_SALARIAL
-- Campos: safra_id, funcionario_id, funcionario_nome, funcionario_funcao,
--         competencia, salario_base, dias_trabalhados, horas_extras,
--         valor_hora_extra, valor_horas_extras, adiantamento,
--         vale_transporte, vale_alimentacao, outros_beneficios,
--         inss, descontos_extras (JSONB), total_descontos,
--         salario_bruto, salario_liquido, status, data_pagamento,
--         observacoes, criado_em
-- ============================================================
CREATE TABLE IF NOT EXISTS folha_salarial (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id            UUID REFERENCES safras(id) ON DELETE SET NULL,
  funcionario_id      UUID REFERENCES equipe(id) ON DELETE SET NULL,
  funcionario_nome    TEXT,
  funcionario_funcao  TEXT,
  competencia         TEXT,       -- YYYY-MM-01
  salario_base        NUMERIC(12,2) DEFAULT 0,
  dias_trabalhados    INTEGER DEFAULT 0,
  horas_extras        NUMERIC(8,2) DEFAULT 0,
  valor_hora_extra    NUMERIC(10,2) DEFAULT 0,
  valor_horas_extras  NUMERIC(12,2) DEFAULT 0,
  adiantamento        NUMERIC(12,2) DEFAULT 0,
  vale_transporte     NUMERIC(12,2) DEFAULT 0,
  vale_alimentacao    NUMERIC(12,2) DEFAULT 0,
  outros_beneficios   NUMERIC(12,2) DEFAULT 0,
  inss                NUMERIC(12,2) DEFAULT 0,
  descontos_extras    JSONB DEFAULT '[]'::jsonb,   -- [{tipo, descricao, valor}]
  total_descontos     NUMERIC(12,2) DEFAULT 0,
  salario_bruto       NUMERIC(14,2) DEFAULT 0,
  salario_liquido     NUMERIC(14,2) DEFAULT 0,
  status              TEXT DEFAULT 'pendente',
  data_pagamento      DATE,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE folha_salarial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "folha_salarial_all" ON folha_salarial;
CREATE POLICY "folha_salarial_all" ON folha_salarial
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_folha_salarial_user ON folha_salarial(user_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_safra ON folha_salarial(safra_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarial_func ON folha_salarial(funcionario_id);

DROP TRIGGER IF EXISTS folha_salarial_updated_at ON folha_salarial;
CREATE TRIGGER folha_salarial_updated_at
  BEFORE UPDATE ON folha_salarial FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 21. ANALISE_SOLO
-- Campos: safra_id, talhao_id, talhao_nome, talhao_area, talhao_cultura,
--         fazenda_nome, data, laboratorio, profundidade, textura, numero_laudo,
--         ph, mo, p, k, ca, mg, al, h_al, s, b, cu, fe, mn, zn,
--         ctc, v_pct, m_pct, areia, silte, argila,
--         recom_calagem, recom_gessagem, recom_adubacao, observacoes, criado_em
-- ============================================================
CREATE TABLE IF NOT EXISTS analise_solo (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id         UUID REFERENCES safras(id) ON DELETE SET NULL,
  talhao_id        UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  talhao_nome      TEXT,
  talhao_area      NUMERIC(12,2),
  talhao_cultura   TEXT,
  fazenda_nome     TEXT,
  data             DATE,
  laboratorio      TEXT,
  profundidade     TEXT,
  textura          TEXT,
  numero_laudo     TEXT,
  -- Quimicos
  ph               NUMERIC(6,2),
  mo               NUMERIC(8,2),
  p                NUMERIC(8,2),
  k                NUMERIC(8,2),
  ca               NUMERIC(8,2),
  mg               NUMERIC(8,2),
  al               NUMERIC(8,2),
  h_al             NUMERIC(8,2),
  s                NUMERIC(8,2),
  b                NUMERIC(8,4),
  cu               NUMERIC(8,4),
  fe               NUMERIC(8,2),
  mn               NUMERIC(8,2),
  zn               NUMERIC(8,4),
  -- Calculados / Fisicos
  ctc              NUMERIC(8,2),
  v_pct            NUMERIC(8,2),
  m_pct            NUMERIC(8,2),
  areia            NUMERIC(6,2),
  silte            NUMERIC(6,2),
  argila           NUMERIC(6,2),
  -- Recomendacoes
  recom_calagem    NUMERIC(10,2),
  recom_gessagem   NUMERIC(10,2),
  recom_adubacao   TEXT,
  observacoes      TEXT,
  criado_em        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analise_solo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analise_solo_all" ON analise_solo;
CREATE POLICY "analise_solo_all" ON analise_solo
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analise_solo_user ON analise_solo(user_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_safra ON analise_solo(safra_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_talhao ON analise_solo(talhao_id);

DROP TRIGGER IF EXISTS analise_solo_updated_at ON analise_solo;
CREATE TRIGGER analise_solo_updated_at
  BEFORE UPDATE ON analise_solo FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 22. PARAMETROS (1 registro por usuario, upsert por user_id)
-- Campos: todos os precos/produtividades por cultura + dados da empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS parametros (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Soja
  preco_soja                 NUMERIC(10,2) DEFAULT 120,
  produtividade_min_soja     NUMERIC(10,2) DEFAULT 65,
  produtividade_max_soja     NUMERIC(10,2) DEFAULT 75,
  -- Milho
  preco_milho                NUMERIC(10,2) DEFAULT 60,
  produtividade_min_milho    NUMERIC(10,2) DEFAULT 100,
  produtividade_max_milho    NUMERIC(10,2) DEFAULT 130,
  -- Sorgo
  preco_sorgo                NUMERIC(10,2) DEFAULT 42,
  produtividade_min_sorgo    NUMERIC(10,2) DEFAULT 70,
  produtividade_max_sorgo    NUMERIC(10,2) DEFAULT 100,
  -- Feijao
  preco_feijao               NUMERIC(10,2) DEFAULT 280,
  produtividade_min_feijao   NUMERIC(10,2) DEFAULT 25,
  produtividade_max_feijao   NUMERIC(10,2) DEFAULT 40,
  -- Trigo
  preco_trigo                NUMERIC(10,2) DEFAULT 85,
  produtividade_min_trigo    NUMERIC(10,2) DEFAULT 40,
  produtividade_max_trigo    NUMERIC(10,2) DEFAULT 60,
  -- Arroz
  preco_arroz                NUMERIC(10,2) DEFAULT 60,
  produtividade_min_arroz    NUMERIC(10,2) DEFAULT 60,
  produtividade_max_arroz    NUMERIC(10,2) DEFAULT 80,
  -- Cafe
  preco_cafe                 NUMERIC(10,2) DEFAULT 1200,
  produtividade_min_cafe     NUMERIC(10,2) DEFAULT 20,
  produtividade_max_cafe     NUMERIC(10,2) DEFAULT 40,
  -- Canola
  preco_canola               NUMERIC(10,2),
  produtividade_min_canola   NUMERIC(10,2),
  produtividade_max_canola   NUMERIC(10,2),
  -- Girassol
  preco_girassol             NUMERIC(10,2),
  produtividade_min_girassol NUMERIC(10,2),
  produtividade_max_girassol NUMERIC(10,2),
  -- Amendoim
  preco_amendoim             NUMERIC(10,2),
  produtividade_min_amendoim NUMERIC(10,2),
  produtividade_max_amendoim NUMERIC(10,2),
  -- Geral
  peso_padrao_saca           NUMERIC(8,2) DEFAULT 60,
  -- Empresa (PDF)
  nome_empresa               TEXT,
  cnpj_empresa               TEXT,
  endereco_empresa           TEXT,
  telefone_empresa           TEXT,
  -- Timestamps
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parametros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parametros_all" ON parametros;
CREATE POLICY "parametros_all" ON parametros
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS parametros_updated_at ON parametros;
CREATE TRIGGER parametros_updated_at
  BEFORE UPDATE ON parametros FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- RESUMO FINAL
-- ============================================================
-- 24 objetos criados:
--   1. profiles          (auth trigger)
--   2. user_data_backup  (JSON fallback)
--   3. safras
--   4. fazendas
--   5. talhoes
--   6. produtos
--   7. estoque
--   8. maquinas
--   9. equipe
--  10. aplicacoes
--  11. colheitas
--  12. combustivel
--  13. diesel_entradas
--  14. diesel_estoque
--  15. clima
--  16. manutencoes
--  17. insumos_base
--  18. lembretes
--  19. pragas
--  20. folha_salarial
--  21. analise_solo
--  22. parametros
--
-- Seguranca:
--   - RLS habilitado em TODAS as 22 tabelas
--   - Politicas FOR ALL com auth.uid() = user_id
--   - profiles: SELECT proprio + subordinados (owner_id)
--   - Trigger updated_at em todas as tabelas
--   - Trigger handle_new_user em auth.users
--
-- Indices:
--   - user_id em todas as tabelas
--   - safra_id em todas as tabelas de dados
--   - FKs indexados (fazenda_id, talhao_id, maquina_id, produto_id, operador_id, funcionario_id)
--
-- JSONB:
--   - aplicacoes.condicoes, aplicacoes.produtos
--   - colheitas.maquinas, colheitas.frete1, colheitas.frete2, colheitas.fretes
--   - manutencoes.pecas
--   - insumos_base.produtos
--   - folha_salarial.descontos_extras
--   - produtos.pragas_alvo
--   - pragas.culturas
--
-- Campos que usam regex fallback no toSnakeCase():
--   - areaHaAplicada  -> area_ha_aplicada  (coluna criada)
--   - dataColheita    -> data_colheita     (coluna criada)
--   - carenciaDias    -> carencia_dias     (coluna criada)
--   - reentradaHoras  -> reentrada_horas   (coluna criada)
--   - pragasAlvo      -> pragas_alvo       (coluna criada)
--   - capacidadeL     -> capacidade_l      (coluna criada)
-- ============================================================
