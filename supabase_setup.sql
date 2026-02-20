-- ============================================================
-- AGRO PRO — Setup Supabase Completo (v5.0)
-- Tabelas + RLS + Índices + Trigger updated_at
-- ============================================================
-- INSTRUÇÕES: Execute este SQL no Supabase Dashboard → SQL Editor
-- Se der erro de "already exists", execute o bloco de DROP primeiro
-- ============================================================

-- ============================================================
-- 0. LIMPAR POLICIES EXISTENTES (evita conflitos)
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
-- 2. TABELA PROFILES (já existe via auth, garantir estrutura)
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. TABELAS DE DADOS
-- ============================================================

-- SAFRAS
CREATE TABLE IF NOT EXISTS safras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  ativa BOOLEAN DEFAULT true,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_safras_user ON safras(user_id);

-- FAZENDAS
CREATE TABLE IF NOT EXISTS fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cidade TEXT,
  uf TEXT,
  area_ha NUMERIC,
  latitude TEXT,
  longitude TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fazendas_user ON fazendas(user_id);
CREATE INDEX IF NOT EXISTS idx_fazendas_safra ON fazendas(safra_id);

-- TALHÕES
CREATE TABLE IF NOT EXISTS talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area_ha NUMERIC,
  cultura TEXT,
  safra TEXT,
  solo TEXT,
  coordenadas TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talhoes_user ON talhoes(user_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_safra ON talhoes(safra_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_fazenda ON talhoes(fazenda_id);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  tipo_produto TEXT,
  unidade TEXT,
  preco NUMERIC,
  estoque_atual NUMERIC DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produtos_user ON produtos(user_id);

-- ESTOQUE
CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  tipo TEXT,
  quantidade NUMERIC,
  preco_unitario NUMERIC,
  data TEXT,
  nota_fiscal TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estoque_user ON estoque(user_id);

-- APLICAÇÕES
CREATE TABLE IF NOT EXISTS aplicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  data TEXT,
  produto TEXT,
  tipo TEXT,
  dose_ha NUMERIC,
  area_aplicada NUMERIC,
  quantidade_total NUMERIC,
  custo_unitario NUMERIC,
  custo_total NUMERIC,
  volume_calda NUMERIC,
  condicao_clima TEXT,
  maquina TEXT,
  operador TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_user ON aplicacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_safra ON aplicacoes(safra_id);

-- COLHEITAS
CREATE TABLE IF NOT EXISTS colheitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  data TEXT,
  area_colhida NUMERIC,
  producao_total NUMERIC,
  unidade TEXT,
  umidade NUMERIC,
  peso_liquido NUMERIC,
  sacas_ha NUMERIC,
  armazem_1 TEXT,
  ton_armazem_1 NUMERIC,
  frete_1_ton NUMERIC,
  armazem_2 TEXT,
  ton_armazem_2 NUMERIC,
  frete_2_ton NUMERIC,
  preco_venda NUMERIC,
  receita_total NUMERIC,
  observacoes TEXT,
  frete1 JSONB,
  frete2 JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_colheitas_user ON colheitas(user_id);

-- COMBUSTÍVEL
CREATE TABLE IF NOT EXISTS combustivel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  data TEXT,
  tipo TEXT,
  litros NUMERIC,
  preco_litro NUMERIC,
  maquina TEXT,
  maquina_id UUID,
  operador TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_combustivel_user ON combustivel(user_id);

-- DIESEL ENTRADAS
CREATE TABLE IF NOT EXISTS diesel_entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  data TEXT,
  litros NUMERIC,
  preco_litro NUMERIC,
  fornecedor TEXT,
  nota_fiscal TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diesel_entradas_user ON diesel_entradas(user_id);

-- DIESEL ESTOQUE
CREATE TABLE IF NOT EXISTS diesel_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  deposito TEXT,
  litros NUMERIC DEFAULT 0,
  preco_vigente NUMERIC DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diesel_estoque_user ON diesel_estoque(user_id);

-- CLIMA
CREATE TABLE IF NOT EXISTS clima (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  data TEXT,
  temperatura NUMERIC,
  umidade NUMERIC,
  chuva_mm NUMERIC,
  vento_kmh NUMERIC,
  condicao TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clima_user ON clima(user_id);

-- MANUTENÇÕES
CREATE TABLE IF NOT EXISTS manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  maquina_id UUID,
  maquina_nome TEXT,
  tipo TEXT,
  data TEXT,
  horimetro_atual NUMERIC,
  proxima_revisao_horas NUMERIC,
  proxima_revisao_data TEXT,
  servico_realizado TEXT,
  pecas_trocadas TEXT,
  custo_pecas NUMERIC,
  custo_mao_obra NUMERIC,
  custo_total NUMERIC,
  responsavel TEXT,
  status TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manutencoes_user ON manutencoes(user_id);

-- EQUIPE
CREATE TABLE IF NOT EXISTS equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao TEXT,
  telefone TEXT,
  data_admissao TEXT,
  salario NUMERIC,
  status TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipe_user ON equipe(user_id);

-- MÁQUINAS
CREATE TABLE IF NOT EXISTS maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  marca TEXT,
  modelo TEXT,
  ano NUMERIC,
  placa TEXT,
  horimetro NUMERIC,
  status TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maquinas_user ON maquinas(user_id);

-- INSUMOS BASE
CREATE TABLE IF NOT EXISTS insumos_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  produto TEXT,
  tipo TEXT,
  quantidade NUMERIC,
  unidade TEXT,
  custo_unitario NUMERIC,
  custo_total NUMERIC,
  data TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insumos_base_user ON insumos_base(user_id);

-- LEMBRETES
CREATE TABLE IF NOT EXISTS lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  data TEXT,
  prioridade TEXT,
  concluido BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lembretes_user ON lembretes(user_id);

-- PRAGAS
CREATE TABLE IF NOT EXISTS pragas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE CASCADE,
  talhao_id UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  nome TEXT,
  nome_cientifico TEXT,
  tipo TEXT,
  nivel TEXT,
  data TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pragas_user ON pragas(user_id);

-- PARÂMETROS
CREATE TABLE IF NOT EXISTS parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preco_soja NUMERIC DEFAULT 120,
  produtividade_min_soja NUMERIC DEFAULT 65,
  produtividade_max_soja NUMERIC DEFAULT 75,
  preco_milho NUMERIC DEFAULT 60,
  produtividade_min_milho NUMERIC DEFAULT 100,
  produtividade_max_milho NUMERIC DEFAULT 130,
  preco_algodao NUMERIC DEFAULT 150,
  produtividade_min_algodao NUMERIC DEFAULT 250,
  produtividade_max_algodao NUMERIC DEFAULT 300,
  peso_padrao_saca NUMERIC DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- BACKUP JSON
CREATE TABLE IF NOT EXISTS user_data_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. RLS PARA TODAS AS TABELAS DE DADOS
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
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() = user_id)', tbl || '_sel', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl || '_ins', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl || '_upd', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() = user_id)', tbl || '_del', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 5. TRIGGERS updated_at
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
-- 6. TRIGGER PARA CRIAR PROFILE AUTOMATICAMENTE NO SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_role, plan_type, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'admin',
    'trial',
    now() + interval '15 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PRONTO! Todas as tabelas, RLS e triggers criados.
-- ============================================================
