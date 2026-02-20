/* ============================================================
   AGRO PRO — supabase-client.js (v2.2 — FIX FINAL CACHE)
   Integração com Supabase: Auth + Sync Granular + CRUD
   ============================================================ */
// ============================================================
// CONFIGURAÇÃO — Preencha com as credenciais do seu projeto Supabase
// ============================================================
const SUPABASE_URL  = "https://cqckmitwbevwkkxlzxdl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2ttaXR3YmV2d2treGx6eGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTY5NzUsImV4cCI6MjA4NzEzMjk3NX0.rzuZ3DjmoJY8KaKEOb62TP7E74h-pU1KO9ZGoYNYTYg";

// ============================================================
// INICIALIZAÇÃO DO CLIENTE SUPABASE
// ============================================================
let supabase = null;
let _supabaseReady = false;

function initSupabase() {
  if (supabase) return true;
  // v2.2: Conexão direta — sem travas de validação
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn("Supabase: credenciais vazias. Modo offline ativo.");
    return false;
  }
  try {
    // O Supabase JS SDK é carregado via CDN no HTML
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } else if (typeof globalThis.supabase !== 'undefined' && globalThis.supabase.createClient) {
      supabase = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } else {
      console.warn("Supabase SDK não encontrado. Verifique se o CDN está carregado.");
      return false;
    }
    _supabaseReady = true;
    console.log("Supabase v2.2: cliente inicializado com sucesso!");
    return true;
  } catch (e) {
    console.error("Supabase: erro ao inicializar:", e.message);
    return false;
  }
}

function isSupabaseReady() {
  return _supabaseReady && supabase !== null;
}

// ============================================================
// AUTH SERVICE — Autenticação com Supabase
// ============================================================
const AuthService = {
  async signUp(email, password, fullName) {
    if (!isSupabaseReady()) return { data: null, error: { message: "Supabase não configurado" } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    return { data, error };
  },

  async signIn(email, password) {
    if (!isSupabaseReady()) return { data: null, error: { message: "Supabase não configurado" } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signOut() {
    if (!isSupabaseReady()) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    if (!isSupabaseReady()) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (e) { return null; }
  },

  async getUser() {
    if (!isSupabaseReady()) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (e) { return null; }
  },

  async getUserProfile() {
    const user = await this.getUser();
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return error ? null : data;
    } catch (e) { return null; }
  },

  async updateProfile(updates) {
    const user = await this.getUser();
    if (!user) return { error: { message: "Não autenticado" } };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================================
// MAPEAMENTO DE TABELAS: chave localStorage → tabela Supabase
// ============================================================
const TABLE_MAP = {
  safras:         'safras',
  fazendas:       'fazendas',
  talhoes:        'talhoes',
  produtos:       'produtos',
  estoque:        'estoque',
  aplicacoes:     'aplicacoes',
  colheitas:      'colheitas',
  combustivel:    'combustivel',
  dieselEntradas: 'diesel_entradas',
  dieselEstoque:  'diesel_estoque',
  clima:          'clima',
  manutencoes:    'manutencoes',
  equipe:         'equipe',
  maquinas:       'maquinas',
  insumosBase:    'insumos_base',
  lembretes:      'lembretes',
  pragas:         'pragas'
};

// Mapeamento de campos: camelCase (JS) → snake_case (SQL)
const FIELD_MAP = {
  safraId: 'safra_id', fazendaId: 'fazenda_id', talhaoId: 'talhao_id',
  maquinaId: 'maquina_id', produtoId: 'produto_id', areaHa: 'area_ha',
  dataInicio: 'data_inicio', dataFim: 'data_fim', nomeCientifico: 'nome_cientifico',
  tempMin: 'temp_min', tempMax: 'temp_max', umidadeMin: 'umidade_min',
  precoSoja: 'preco_soja', produtividadeMinSoja: 'produtividade_min_soja',
  produtividadeMaxSoja: 'produtividade_max_soja', precoMilho: 'preco_milho',
  produtividadeMinMilho: 'produtividade_min_milho', produtividadeMaxMilho: 'produtividade_max_milho',
  precoAlgodao: 'preco_algodao', produtividadeMinAlgodao: 'produtividade_min_algodao',
  produtividadeMaxAlgodao: 'produtividade_max_algodao', pesoPadraoSaca: 'peso_padrao_saca',
  doseHa: 'dose_ha', areaAplicada: 'area_aplicada', quantidadeTotal: 'quantidade_total',
  custoUnitario: 'custo_unitario', custoTotal: 'custo_total', volumeCalda: 'volume_calda',
  condicaoClima: 'condicao_clima', areaColhida: 'area_colhida', producaoTotal: 'producao_total',
  pesoLiquido: 'peso_liquido', sacasHa: 'sacas_ha',
  armazem1: 'armazem_1', tonArmazem1: 'ton_armazem_1', frete1Ton: 'frete_1_ton',
  armazem2: 'armazem_2', tonArmazem2: 'ton_armazem_2', frete2Ton: 'frete_2_ton',
  precoVenda: 'preco_venda', receitaTotal: 'receita_total',
  precoLitro: 'preco_litro', precoVigente: 'preco_vigente', notaFiscal: 'nota_fiscal',
  chuvaMm: 'chuva_mm', ventoKmh: 'vento_kmh',
  maquinaNome: 'maquina_nome', horimetroAtual: 'horimetro_atual',
  proximaRevisaoHoras: 'proxima_revisao_horas', proximaRevisaoData: 'proxima_revisao_data',
  pecasTrocadas: 'pecas_trocadas', servicoRealizado: 'servico_realizado',
  custoPecas: 'custo_pecas', custoMaoObra: 'custo_mao_obra',
  dataAdmissao: 'data_admissao', dataEntrada: 'data_entrada', tipoProduto: 'tipo_produto',
  userId: 'user_id', createdAt: 'created_at', updatedAt: 'updated_at'
};

// Converter JS (camelCase) → SQL (snake_case)
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'id' && typeof val === 'string' && val.startsWith('id_')) continue; // IDs locais
    const snakeKey = FIELD_MAP[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = val;
  }
  return result;
}

// Converter SQL (snake_case) → JS (camelCase)
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  const reverseMap = {};
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    reverseMap[snake] = camel;
  }
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = reverseMap[key] || key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = val;
  }
  return result;
}

// ============================================================
// CLOUD SYNC — SINCRONIZAÇÃO BIDIRECIONAL COM SUPABASE
// ============================================================

let _syncTimer = null;
let _syncPending = false;
let _lastSyncedHash = null;

// Hash simples para detectar mudanças
function quickHash(obj) {
  return JSON.stringify(obj).length + '_' + JSON.stringify(obj).slice(0, 200);
}

// SYNC COMPLETO: Salva todo o db como JSON na tabela user_data_backup
// Isso é o "safety net" — funciona mesmo se as tabelas individuais falharem
function cloudSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncPending = true;
  _syncTimer = setTimeout(async () => {
    try {
      if (!isSupabaseReady()) { _syncPending = false; return; }
      const user = await AuthService.getUser();
      if (!user) { _syncPending = false; return; }

      const db = Storage.load();
      if (!db) { _syncPending = false; return; }

      const hash = quickHash(db);
      if (hash === _lastSyncedHash) { _syncPending = false; return; } // Sem mudanças

      const { error } = await supabase
        .from('user_data_backup')
        .upsert({
          user_id: user.id,
          data: db,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.warn('Cloud Sync: erro ao salvar:', error.message);
      } else {
        _lastSyncedHash = hash;
        console.log('Cloud Sync: backup salvo na nuvem');
      }

      // === SYNC GRANULAR: Sincronizar tabelas individuais ===
      await syncGranular(user.id, db);

    } catch (e) {
      console.warn('Cloud Sync: falha silenciosa:', e.message);
    }
    _syncPending = false;
  }, 2000); // 2 segundos de debounce
}

// SYNC GRANULAR: Sincroniza cada tabela individualmente
async function syncGranular(userId, db) {
  if (!isSupabaseReady()) return;

  for (const [localKey, tableName] of Object.entries(TABLE_MAP)) {
    const localData = db[localKey];
    if (!localData || !Array.isArray(localData)) continue;

    try {
      // Buscar IDs existentes no Supabase
      const { data: remoteData, error: fetchErr } = await supabase
        .from(tableName)
        .select('id, updated_at')
        .eq('user_id', userId);

      if (fetchErr) continue;

      const remoteIds = new Set((remoteData || []).map(r => r.id));

      // Inserir registros que existem localmente mas não no Supabase
      for (const item of localData) {
        if (!item.id) continue;
        // IDs locais (id_xxx) precisam ser inseridos como novos registros
        if (typeof item.id === 'string' && item.id.startsWith('id_')) {
          const snakeData = toSnakeCase(item);
          snakeData.user_id = userId;
          delete snakeData.id; // Deixar o Supabase gerar UUID
          delete snakeData.created_at;

          const { data: inserted, error: insErr } = await supabase
            .from(tableName)
            .insert(snakeData)
            .select('id')
            .single();

          if (!insErr && inserted) {
            // Atualizar o ID local com o UUID do Supabase
            item._supabaseId = inserted.id;
          }
        }
        // IDs UUID já existem — verificar se precisa atualizar
        else if (!remoteIds.has(item.id)) {
          const snakeData = toSnakeCase(item);
          snakeData.user_id = userId;
          delete snakeData.created_at;
          delete snakeData.updated_at;

          await supabase.from(tableName).upsert(snakeData, { onConflict: 'id' });
        }
      }
    } catch (e) {
      console.warn(`Sync ${tableName}: erro:`, e.message);
    }
  }

  // Sync parâmetros (tabela especial — upsert por user_id)
  if (db.parametros && typeof db.parametros === 'object') {
    try {
      const params = toSnakeCase(db.parametros);
      params.user_id = userId;
      delete params.id;
      delete params.created_at;
      delete params.updated_at;

      await supabase
        .from('parametros')
        .upsert(params, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Sync parametros: erro:', e.message);
    }
  }
}

// RESTORE: Restaurar dados da nuvem (chamado no login/boot)
async function cloudRestore() {
  try {
    if (!isSupabaseReady()) return false;
    const user = await AuthService.getUser();
    if (!user) return false;

    // Primeiro tentar restaurar das tabelas individuais (dados mais recentes)
    const restoredFromTables = await restoreFromTables(user.id);
    if (restoredFromTables) {
      console.log('Cloud Restore: dados restaurados das tabelas individuais');
      return true;
    }

    // Fallback: restaurar do backup JSON completo
    const { data, error } = await supabase
      .from('user_data_backup')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.log('Cloud Restore: nenhum backup encontrado');
      return false;
    }

    const localDB = Storage.load();
    const cloudDate = new Date(data.updated_at);
    const localDate = localDB?.meta?.lastSync ? new Date(localDB.meta.lastSync) : new Date(0);

    // Restaurar se local vazio OU nuvem mais recente
    if (!localDB || !localDB.fazendas || localDB.fazendas.length === 0 ||
        (cloudDate > localDate && data.data.fazendas && data.data.fazendas.length > 0)) {
      console.log('Cloud Restore: restaurando do backup JSON');
      const cloudDB = data.data;
      cloudDB.meta = cloudDB.meta || {};
      cloudDB.meta.lastSync = new Date().toISOString();
      cloudDB.meta.source = 'cloud_backup';
      Storage.save(cloudDB);
      return true;
    }

    return false;
  } catch (e) {
    console.warn('Cloud Restore: erro:', e.message);
    return false;
  }
}

// Restaurar dados das tabelas individuais do Supabase
async function restoreFromTables(userId) {
  if (!isSupabaseReady()) return false;

  try {
    // Verificar se existem dados nas tabelas
    const { data: safras, error: safraErr } = await supabase
      .from('safras')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (safraErr || !safras || safras.length === 0) return false;

    // Verificar se o localStorage está vazio ou desatualizado
    const localDB = Storage.load();
    if (localDB && localDB.fazendas && localDB.fazendas.length > 0 && localDB.meta?.source !== 'cloud_tables') {
      // Local tem dados e não veio das tabelas — não sobrescrever
      // (o cloudSync vai enviar os dados locais para as tabelas)
      return false;
    }

    // Buscar todas as tabelas em paralelo
    const fetchTable = async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return error ? [] : (data || []).map(toCamelCase);
    };

    const [
      safrasData, fazendas, talhoes, produtos, estoque,
      aplicacoes, colheitas, combustivel, dieselEntradas, dieselEstoque,
      clima, manutencoes, equipe, maquinas, insumosBase,
      lembretes, pragas
    ] = await Promise.all([
      fetchTable('safras'), fetchTable('fazendas'), fetchTable('talhoes'),
      fetchTable('produtos'), fetchTable('estoque'), fetchTable('aplicacoes'),
      fetchTable('colheitas'), fetchTable('combustivel'), fetchTable('diesel_entradas'),
      fetchTable('diesel_estoque'), fetchTable('clima'), fetchTable('manutencoes'),
      fetchTable('equipe'), fetchTable('maquinas'), fetchTable('insumos_base'),
      fetchTable('lembretes'), fetchTable('pragas')
    ]);

    // Buscar parâmetros
    let parametros = { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75, pesoPadraoSaca: 60 };
    try {
      const { data: paramData } = await supabase
        .from('parametros')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (paramData) parametros = toCamelCase(paramData);
    } catch (e) {}

    // Montar o db no formato do localStorage
    const safraAtiva = safrasData.find(s => s.ativa) || safrasData[0];
    const db = {
      meta: { createdAt: new Date().toISOString(), version: 11, source: 'cloud_tables', lastSync: new Date().toISOString() },
      session: { safraId: safraAtiva?.id || null },
      safras: safrasData,
      fazendas,
      talhoes,
      produtos,
      estoque,
      aplicacoes,
      colheitas,
      combustivel,
      dieselEntradas,
      dieselEstoque,
      clima,
      manutencoes,
      equipe,
      maquinas,
      insumosBase,
      lembretes,
      pragas,
      parametros
    };

    Storage.save(db);
    return true;
  } catch (e) {
    console.warn('Restore from tables: erro:', e.message);
    return false;
  }
}

// ============================================================
// CRUD DIRETO NO SUPABASE (para operações individuais)
// ============================================================
const SupaCRUD = {
  async insert(localKey, record) {
    if (!isSupabaseReady()) return null;
    const tableName = TABLE_MAP[localKey];
    if (!tableName) return null;

    const user = await AuthService.getUser();
    if (!user) return null;

    const data = toSnakeCase(record);
    data.user_id = user.id;
    delete data.created_at;
    delete data.updated_at;
    // Remover IDs locais
    if (data.id && typeof data.id === 'string' && !data.id.match(/^[0-9a-f]{8}-/)) {
      delete data.id;
    }

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        console.warn(`SupaCRUD.insert ${tableName}:`, error.message);
        return null;
      }
      return toCamelCase(result);
    } catch (e) {
      console.warn(`SupaCRUD.insert ${tableName}:`, e.message);
      return null;
    }
  },

  async update(localKey, id, updates) {
    if (!isSupabaseReady()) return null;
    const tableName = TABLE_MAP[localKey];
    if (!tableName) return null;

    const data = toSnakeCase(updates);
    delete data.id;
    delete data.user_id;
    delete data.created_at;

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn(`SupaCRUD.update ${tableName}:`, error.message);
        return null;
      }
      return toCamelCase(result);
    } catch (e) {
      console.warn(`SupaCRUD.update ${tableName}:`, e.message);
      return null;
    }
  },

  async delete(localKey, id) {
    if (!isSupabaseReady()) return false;
    const tableName = TABLE_MAP[localKey];
    if (!tableName) return false;

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.warn(`SupaCRUD.delete ${tableName}:`, error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn(`SupaCRUD.delete ${tableName}:`, e.message);
      return false;
    }
  },

  async upsertParametros(params) {
    if (!isSupabaseReady()) return null;
    const user = await AuthService.getUser();
    if (!user) return null;

    const data = toSnakeCase(params);
    data.user_id = user.id;
    delete data.id;
    delete data.created_at;
    delete data.updated_at;

    try {
      const { data: result, error } = await supabase
        .from('parametros')
        .upsert(data, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.warn('SupaCRUD.upsertParametros:', error.message);
        return null;
      }
      return toCamelCase(result);
    } catch (e) {
      console.warn('SupaCRUD.upsertParametros:', e.message);
      return null;
    }
  }
};

// ============================================================
// SEED: Criar dados iniciais no Supabase para novo usuário
// ============================================================
async function seedSupabase() {
  if (!isSupabaseReady()) return;
  const user = await AuthService.getUser();
  if (!user) return;

  try {
    const { data: existingSafras } = await supabase
      .from('safras')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingSafras && existingSafras.length > 0) return; // Já tem dados

    const anoAtual = new Date().getFullYear();

    // Criar safra inicial
    const { data: safra } = await supabase
      .from('safras')
      .insert({
        user_id: user.id,
        nome: `Safra ${anoAtual}/${(anoAtual + 1).toString().slice(-2)}`,
        data_inicio: `${anoAtual}-09-01`,
        data_fim: `${anoAtual + 1}-08-31`,
        ativa: true,
        observacoes: 'Safra inicial'
      })
      .select()
      .single();

    if (!safra) return;

    // Criar fazenda de demonstração
    const { data: fazenda } = await supabase
      .from('fazendas')
      .insert({
        user_id: user.id,
        safra_id: safra.id,
        nome: 'Fazenda de Demonstração',
        cidade: 'Cidade',
        uf: 'UF',
        area_ha: 100,
        observacoes: 'Dados de exemplo para demonstração.'
      })
      .select()
      .single();

    if (fazenda) {
      await supabase.from('talhoes').insert({
        user_id: user.id,
        safra_id: safra.id,
        fazenda_id: fazenda.id,
        nome: 'Talhão Exemplo',
        area_ha: 50,
        cultura: 'Soja',
        safra: 'Atual',
        solo: 'Argiloso',
        observacoes: 'Talhão de demonstração'
      });
    }

    // Diesel estoque
    await supabase.from('diesel_estoque').insert({
      user_id: user.id,
      safra_id: safra.id,
      deposito: 'Tanque Principal',
      litros: 0,
      preco_vigente: 0,
      observacoes: 'Estoque inicial'
    });

    // Parâmetros padrão
    await supabase.from('parametros').insert({
      user_id: user.id,
      preco_soja: 120.00,
      produtividade_min_soja: 65,
      produtividade_max_soja: 75,
      preco_milho: 60.00,
      produtividade_min_milho: 100,
      produtividade_max_milho: 130,
      preco_algodao: 150.00,
      produtividade_min_algodao: 250,
      produtividade_max_algodao: 300,
      peso_padrao_saca: 60
    });

    console.log('Seed: dados iniciais criados no Supabase');
  } catch (e) {
    console.warn('Seed: erro:', e.message);
  }
}

// Inicializar ao carregar o script
initSupabase();
