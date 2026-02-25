-- ============================================================
-- AGRO PRO — Setup Supabase Completo (v6.1)
-- COMPATÍVEL COM BANCO EXISTENTE:
--   • CREATE TABLE IF NOT EXISTS → não recria tabelas existentes
--   • ALTER TABLE ADD COLUMN IF NOT EXISTS → adiciona colunas faltando
--   • Índices criados apenas após garantir que as colunas existem
-- ============================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 0. LIMPAR POLICIES EXISTENTES (evita conflitos de nomes)
-- ============================================================
DO $$
DECLARE pol RECORD; tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN ('profiles','safras','fazendas','talhoes','produtos','estoque',
      'aplicacoes','colheitas','combustivel','diesel_entradas','diesel_estoque',
      'clima','manutencoes','equipe','maquinas','insumos_base','lembretes','pragas',
      'parametros','user_data_backup')
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl.tablename
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.tablename);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 1. FUNÇÃO updated_at AUTOMÁTICA
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. TABELA PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  user_role TEXT DEFAULT 'admin',
  plan_type TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Colunas extras caso a tabela já exista sem elas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'admin';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- 3. TABELAS DE DADOS (CREATE + ALTER para colunas faltando)
-- ============================================================

-- ── SAFRAS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS safras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE safras ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE safras ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE safras ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT true;
ALTER TABLE safras ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE safras ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE safras ADD COLUMN IF NOT EXISTS safra_id UUID;
CREATE INDEX IF NOT EXISTS idx_safras_user ON safras(user_id);

-- ── FAZENDAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS area_ha NUMERIC;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS latitude TEXT;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS longitude TEXT;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_fazendas_user ON fazendas(user_id);
CREATE INDEX IF NOT EXISTS idx_fazendas_safra ON fazendas(safra_id);

-- ── TALHÕES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS area_ha NUMERIC;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS cultura TEXT;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS safra TEXT;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS solo TEXT;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS coordenadas TEXT;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_talhoes_user ON talhoes(user_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_safra ON talhoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_fazenda ON talhoes(fazenda_id);

-- ── PRODUTOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_produto TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco NUMERIC;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_atual NUMERIC DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_produtos_user ON produtos(user_id);

-- ── ESTOQUE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS quantidade NUMERIC;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS nota_fiscal TEXT;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_estoque_user ON estoque(user_id);

-- ── APLICAÇÕES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aplicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS produto TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS dose_ha NUMERIC;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS area_aplicada NUMERIC;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS quantidade_total NUMERIC;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS custo_total NUMERIC;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS volume_calda NUMERIC;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS condicao_clima TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS maquina TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS operador TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_aplicacoes_user ON aplicacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_safra ON aplicacoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_talhao ON aplicacoes(talhao_id);

-- ── COLHEITAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colheitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS area_colhida NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS producao_total NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS umidade NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS peso_liquido NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS sacas_ha NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS armazem_1 TEXT;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS ton_armazem_1 NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS frete_1_ton NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS armazem_2 TEXT;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS ton_armazem_2 NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS frete_2_ton NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS preco_venda NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS receita_total NUMERIC;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS frete1 JSONB;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS frete2 JSONB;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS maquinas JSONB;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS data_colheita TEXT;
ALTER TABLE colheitas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_colheitas_user ON colheitas(user_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_talhao ON colheitas(talhao_id);

-- ── COMBUSTÍVEL ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combustivel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE SET NULL;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS maquina_id UUID;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS operador_id UUID;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS deposito TEXT;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS posto TEXT;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS litros NUMERIC;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS preco_litro NUMERIC;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS km_ou_hora NUMERIC;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE combustivel ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- Índices só depois de garantir que as colunas existem
CREATE INDEX IF NOT EXISTS idx_combustivel_user ON combustivel(user_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_talhao ON combustivel(talhao_id);

-- ── DIESEL ENTRADAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diesel_entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS deposito TEXT;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS litros NUMERIC;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS preco_litro NUMERIC;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS nota_fiscal TEXT;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE diesel_entradas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_diesel_entradas_user ON diesel_entradas(user_id);

-- ── DIESEL ESTOQUE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diesel_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE diesel_estoque ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE diesel_estoque ADD COLUMN IF NOT EXISTS deposito TEXT;
ALTER TABLE diesel_estoque ADD COLUMN IF NOT EXISTS litros NUMERIC DEFAULT 0;
ALTER TABLE diesel_estoque ADD COLUMN IF NOT EXISTS preco_vigente NUMERIC DEFAULT 0;
ALTER TABLE diesel_estoque ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE diesel_estoque ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_diesel_estoque_user ON diesel_estoque(user_id);

-- ── CLIMA ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clima (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clima ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS temperatura NUMERIC;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS temp_max NUMERIC;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS temp_min NUMERIC;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS umidade NUMERIC;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS chuva_mm NUMERIC;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS vento_kmh NUMERIC;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS condicao TEXT;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE clima ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_clima_user ON clima(user_id);

-- ── MANUTENÇÕES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS maquina_id UUID;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS maquina_nome TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS tipo_manutencao TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS horimetro_atual NUMERIC;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS intervalo_horas NUMERIC DEFAULT 500;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS proxima_data TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS mecanico TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS oficina TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS servico TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS tempo_parada NUMERIC;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS pecas JSONB;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS custo_pecas NUMERIC DEFAULT 0;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS custo_mao_obra NUMERIC DEFAULT 0;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS outros_custos NUMERIC DEFAULT 0;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS custo_total NUMERIC DEFAULT 0;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_manutencoes_user ON manutencoes(user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_maquina ON manutencoes(maquina_id);

-- ── EQUIPE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS funcao TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS data_admissao TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS salario NUMERIC;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_equipe_user ON equipe(user_id);

-- ── MÁQUINAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS ano NUMERIC;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS placa TEXT;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS horimetro NUMERIC DEFAULT 0;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_maquinas_user ON maquinas(user_id);

-- ── INSUMOS BASE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insumos_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS produto TEXT;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS tipo_insumo TEXT;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS quantidade NUMERIC;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS custo_total NUMERIC;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE insumos_base ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_insumos_base_user ON insumos_base(user_id);
CREATE INDEX IF NOT EXISTS idx_insumos_base_talhao ON insumos_base(talhao_id);

-- ── LEMBRETES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS prioridade TEXT;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS concluido BOOLEAN DEFAULT false;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_lembretes_user ON lembretes(user_id);

-- ── PRAGAS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pragas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES safras(id) ON DELETE CASCADE;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS nome_cientifico TEXT;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS nivel TEXT;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS data TEXT;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE pragas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_pragas_user ON pragas(user_id);

-- ── PARÂMETROS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_soja NUMERIC DEFAULT 120;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_soja NUMERIC DEFAULT 65;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_soja NUMERIC DEFAULT 75;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_milho NUMERIC DEFAULT 60;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_milho NUMERIC DEFAULT 100;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_milho NUMERIC DEFAULT 130;
-- Algodão (mantido para compatibilidade retroativa — não usado na UI v6.3)
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_algodao NUMERIC DEFAULT 150;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_algodao NUMERIC DEFAULT 250;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_algodao NUMERIC DEFAULT 300;
-- Novos grãos v6.3: Canola, Girassol, Amendoim
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_canola NUMERIC DEFAULT 140;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_canola NUMERIC DEFAULT 40;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_canola NUMERIC DEFAULT 65;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_girassol NUMERIC DEFAULT 90;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_girassol NUMERIC DEFAULT 35;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_girassol NUMERIC DEFAULT 55;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_amendoim NUMERIC DEFAULT 220;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_amendoim NUMERIC DEFAULT 60;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_amendoim NUMERIC DEFAULT 100;
-- Outros grãos já existentes (sorgo, feijao, trigo, arroz, cafe)
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_sorgo NUMERIC DEFAULT 42;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_sorgo NUMERIC DEFAULT 70;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_sorgo NUMERIC DEFAULT 100;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_feijao NUMERIC DEFAULT 280;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_feijao NUMERIC DEFAULT 25;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_feijao NUMERIC DEFAULT 40;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_trigo NUMERIC DEFAULT 85;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_trigo NUMERIC DEFAULT 40;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_trigo NUMERIC DEFAULT 60;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_arroz NUMERIC DEFAULT 60;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_arroz NUMERIC DEFAULT 60;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_arroz NUMERIC DEFAULT 80;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS preco_cafe NUMERIC DEFAULT 1200;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_min_cafe NUMERIC DEFAULT 20;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS produtividade_max_cafe NUMERIC DEFAULT 40;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS peso_padrao_saca NUMERIC DEFAULT 60;

-- ── BACKUP JSON ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_data_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_data_backup ADD COLUMN IF NOT EXISTS data JSONB;

-- ============================================================
-- 4. RLS PARA TODAS AS TABELAS
-- (SELECT auth.uid()) → elimina os 225 warnings de performance
-- ============================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'safras','fazendas','talhoes','produtos','estoque','aplicacoes','colheitas',
    'combustivel','diesel_entradas','diesel_estoque','clima','manutencoes',
    'equipe','maquinas','insumos_base','lembretes','pragas','parametros','user_data_backup'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING ((SELECT auth.uid()) = user_id)', tbl || '_sel', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id)', tbl || '_ins', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)', tbl || '_upd', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING ((SELECT auth.uid()) = user_id)', tbl || '_del', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 5. TRIGGERS updated_at (recria para garantir)
-- ============================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','safras','fazendas','talhoes','produtos','estoque','aplicacoes','colheitas',
    'combustivel','diesel_entradas','diesel_estoque','clima','manutencoes',
    'equipe','maquinas','insumos_base','lembretes','pragas','parametros','user_data_backup'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 6. TRIGGER SIGNUP → cria profile automaticamente
-- SECURITY DEFINER: roda com privilégios do owner (bypassa RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_role, plan_type, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin',
    'trial',
    now() + interval '15 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 7. BACKFILL: cria profiles para usuários já existentes
-- ============================================================
INSERT INTO public.profiles (id, full_name, email, user_role, plan_type, trial_ends_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  'admin',
  'trial',
  now() + interval '15 days'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. ÍNDICES COMPOSTOS DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_talhoes_user_safra    ON talhoes(user_id, safra_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_user_safra  ON aplicacoes(user_id, safra_id);
CREATE INDEX IF NOT EXISTS idx_colheitas_user_safra   ON colheitas(user_id, safra_id);
CREATE INDEX IF NOT EXISTS idx_combustivel_user_safra ON combustivel(user_id, safra_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_user_safra ON manutencoes(user_id, safra_id);

-- ============================================================
-- CONCLUÍDO! v6.1 — compatível com banco existente.
-- Todas as tabelas, colunas, RLS, triggers e backfill aplicados.
-- ============================================================
