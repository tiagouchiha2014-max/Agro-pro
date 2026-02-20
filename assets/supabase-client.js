/* ============================================================
   AGRO PRO — supabase-client.js (v3.0 — REVISÃO COMPLETA)
   Integração com Supabase: Auth + Sync Granular + CRUD  
CORREÇÕES v3.0:
   - cloudSyncImmediate() para sync sem debounce (cadastro/login)
   - cloudSync() com debounce para uso normal (setDB)
   - Indicador de status atualizado via window._cloudConnected
   - Exportações window.* completas
   ============================================================ */

// ============================================================
// CONFIGURAÇÃO — Preencha com as credenciais do seu projeto Supabase
// ============================================================
var SUPABASE_URL  = "https://cqckmitwbevwkkxlzxdl.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2ttaXR3YmV2d2treGx6eGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTY5NzUsImV4cCI6MjA4NzEzMjk3NX0.rzuZ3DjmoJY8KaKEOb62TP7E74h-pU1KO9ZGoYNYTYg";

// ============================================================
// INICIALIZAÇÃO DO CLIENTE SUPABASE
// ============================================================
var _supabaseClient = null;
var _supabaseReady = false;

function initSupabase() {
  if (_supabaseClient) return true;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn("Supabase: credenciais vazias. Modo offline ativo.");
    return false;
  }
  try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } else if (typeof globalThis.supabase !== 'undefined' && globalThis.supabase.createClient) {
      _supabaseClient = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } else {
      console.warn("Supabase SDK não encontrado. Verifique se o CDN está carregado.");
      return false;
    }
    _supabaseReady = true;
    window._supabaseReady = true;
    window._cloudConnected = true;
    console.log("Supabase v3.0: cliente inicializado com sucesso!");
    return true;
  } catch (e) {
    console.error("Supabase: erro ao inicializar:", e.message);
    return false;
  }
}

function isSupabaseReady() {
  return _supabaseReady && _supabaseClient !== null;
}

function getSupabaseClient() {
  return _supabaseClient;
}

// ============================================================
// AUTH SERVICE — Autenticação com Supabase
// ============================================================
var AuthService = {
  async signUp(email, password, fullName) {
    if (!isSupabaseReady()) return { data: null, error: { message: "Supabase não configurado" } };
    var result = await _supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: fullName } }
    });
    return { data: result.data, error: result.error };
  },

  async signIn(email, password) {
    if (!isSupabaseReady()) return { data: null, error: { message: "Supabase não configurado" } };
    var result = await _supabaseClient.auth.signInWithPassword({ email: email, password: password });
    return { data: result.data, error: result.error };
  },

  async signOut() {
    if (!isSupabaseReady()) return { error: null };
    var result = await _supabaseClient.auth.signOut();
    return { error: result.error };
  },

  async getSession() {
    if (!isSupabaseReady()) return null;
    try {
      var result = await _supabaseClient.auth.getSession();
      return result.data.session;
    } catch (e) { return null; }
  },

  async getUser() {
    if (!isSupabaseReady()) return null;
    try {
      var result = await _supabaseClient.auth.getUser();
      return result.data.user;
    } catch (e) { return null; }
  },

  async getUserProfile() {
    var user = await this.getUser();
    if (!user) return null;
    try {
      var result = await _supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return result.error ? null : result.data;
    } catch (e) { return null; }
  },

  async updateProfile(updates) {
    var user = await this.getUser();
    if (!user) return { error: { message: "Não autenticado" } };
    var result = await _supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    return { data: result.data, error: result.error };
  }
};

// ============================================================
// MAPEAMENTO DE TABELAS: chave localStorage → tabela Supabase
// ============================================================
var TABLE_MAP = {
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
var FIELD_MAP = {
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
  var result = {};
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var val = obj[key];
    // Pular IDs locais (id_xxxx) — o Supabase gera UUID automaticamente
    if (key === 'id' && typeof val === 'string' && val.startsWith('id_')) continue;
    var snakeKey = FIELD_MAP[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = val;
  }
  return result;
}

// Converter SQL (snake_case) → JS (camelCase)
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var result = {};
  var reverseMap = {};
  for (var camel in FIELD_MAP) {
    if (FIELD_MAP.hasOwnProperty(camel)) {
      reverseMap[FIELD_MAP[camel]] = camel;
    }
  }
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var camelKey = reverseMap[key] || key.replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); });
    result[camelKey] = obj[key];
  }
  return result;
}

// ============================================================
// CLOUD SYNC — SINCRONIZAÇÃO COM SUPABASE
// ============================================================

var _syncTimer = null;
var _syncPending = false;
var _lastSyncedHash = null;

function quickHash(obj) {
  var str = JSON.stringify(obj);
  return str.length + '_' + str.slice(0, 200);
}

// === SYNC COM DEBOUNCE (chamado pelo setDB a cada alteração) ===
function cloudSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncPending = true;
  _syncTimer = setTimeout(function() {
    _doCloudSync();
  }, 2000);
}

// === SYNC IMEDIATO (chamado no cadastro, login, e sync manual) ===
async function cloudSyncImmediate() {
  if (_syncTimer) clearTimeout(_syncTimer);
  await _doCloudSync();
}

// === LÓGICA REAL DO SYNC ===
async function _doCloudSync() {
  try {
    if (!isSupabaseReady()) { _syncPending = false; return false; }
    var user = await AuthService.getUser();
    if (!user) { _syncPending = false; return false; }

    // Acessar localStorage diretamente (Storage é do app.js)
    var raw = localStorage.getItem("agro_pro_v10");
    if (!raw) { _syncPending = false; return false; }
    var db;
    try { db = JSON.parse(raw); } catch(e) { _syncPending = false; return false; }

    var hash = quickHash(db);
    if (hash === _lastSyncedHash) { _syncPending = false; return true; }

    // 1. Backup JSON completo
    var result = await _supabaseClient
      .from('user_data_backup')
      .upsert({
        user_id: user.id,
        data: db,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (result.error) {
      console.warn('Cloud Sync: erro ao salvar backup:', result.error.message);
    } else {
      console.log('Cloud Sync: backup JSON salvo na nuvem');
    }

    // 2. Sync granular por tabela
    await syncGranular(user.id, db);

    _lastSyncedHash = hash;
    _syncPending = false;
    window._cloudConnected = true;
    
    // Atualizar indicador visual
    _updateCloudIndicator(true);
    
    return true;
  } catch (e) {
    console.warn('Cloud Sync: falha:', e.message);
    _syncPending = false;
    return false;
  }
}

async function syncGranular(userId, db) {
  if (!isSupabaseReady()) return;

  for (var localKey in TABLE_MAP) {
    if (!TABLE_MAP.hasOwnProperty(localKey)) continue;
    var tableName = TABLE_MAP[localKey];
    var localData = db[localKey];
    if (!localData || !Array.isArray(localData)) continue;

    try {
      var fetchResult = await _supabaseClient
        .from(tableName)
        .select('id, updated_at')
        .eq('user_id', userId);

      if (fetchResult.error) continue;

      var remoteIds = new Set((fetchResult.data || []).map(function(r) { return r.id; }));

      for (var i = 0; i < localData.length; i++) {
        var item = localData[i];
        if (!item.id) continue;

        if (typeof item.id === 'string' && item.id.startsWith('id_')) {
          // ID local — inserir como novo registro
          var snakeData = toSnakeCase(item);
          snakeData.user_id = userId;
          delete snakeData.id;
          delete snakeData.created_at;

          var insResult = await _supabaseClient
            .from(tableName)
            .insert(snakeData)
            .select('id')
            .single();

          if (!insResult.error && insResult.data) {
            item._supabaseId = insResult.data.id;
          }
        } else if (!remoteIds.has(item.id)) {
          // ID UUID mas não existe no remoto — upsert
          var snakeData2 = toSnakeCase(item);
          snakeData2.user_id = userId;
          delete snakeData2.created_at;
          delete snakeData2.updated_at;

          await _supabaseClient.from(tableName).upsert(snakeData2, { onConflict: 'id' });
        }
      }
    } catch (e) {
      console.warn('Sync ' + tableName + ': erro:', e.message);
    }
  }

  // Sincronizar parâmetros
  if (db.parametros && typeof db.parametros === 'object') {
    try {
      var params = toSnakeCase(db.parametros);
      params.user_id = userId;
      delete params.id;
      delete params.created_at;
      delete params.updated_at;

      await _supabaseClient
        .from('parametros')
        .upsert(params, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Sync parametros: erro:', e.message);
    }
  }
}

// ============================================================
// CLOUD RESTORE — RESTAURAR DADOS DA NUVEM
// ============================================================

async function cloudRestore() {
  try {
    if (!isSupabaseReady()) return false;
    var user = await AuthService.getUser();
    if (!user) return false;

    // Tentar restaurar das tabelas individuais primeiro
    var restoredFromTables = await restoreFromTables(user.id);
    if (restoredFromTables) {
      console.log('Cloud Restore: dados restaurados das tabelas individuais');
      window._cloudConnected = true;
      _updateCloudIndicator(true);
      return true;
    }

    // Fallback: restaurar do backup JSON
    var result = await _supabaseClient
      .from('user_data_backup')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .single();

    if (result.error || !result.data) {
      console.log('Cloud Restore: nenhum backup encontrado');
      return false;
    }

    var localRaw = localStorage.getItem("agro_pro_v10");
    var localDB = localRaw ? JSON.parse(localRaw) : null;
    var cloudDate = new Date(result.data.updated_at);
    var localDate = localDB && localDB.meta && localDB.meta.lastSync ? new Date(localDB.meta.lastSync) : new Date(0);

    if (!localDB || !localDB.fazendas || localDB.fazendas.length === 0 ||
        (cloudDate > localDate && result.data.data.fazendas && result.data.data.fazendas.length > 0)) {
      console.log('Cloud Restore: restaurando do backup JSON');
      var cloudDB = result.data.data;
      cloudDB.meta = cloudDB.meta || {};
      cloudDB.meta.lastSync = new Date().toISOString();
      cloudDB.meta.source = 'cloud_backup';
      localStorage.setItem("agro_pro_v10", JSON.stringify(cloudDB));
      window._cloudConnected = true;
      _updateCloudIndicator(true);
      return true;
    }

    return false;
  } catch (e) {
    console.warn('Cloud Restore: erro:', e.message);
    return false;
  }
}

async function restoreFromTables(userId) {
  if (!isSupabaseReady()) return false;

  try {
    var safraResult = await _supabaseClient
      .from('safras')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (safraResult.error || !safraResult.data || safraResult.data.length === 0) return false;

    // Se já tem dados locais com fonte diferente de cloud, não sobrescrever
    var localRaw = localStorage.getItem("agro_pro_v10");
    var localDB = localRaw ? JSON.parse(localRaw) : null;
    if (localDB && localDB.fazendas && localDB.fazendas.length > 0 && localDB.meta && localDB.meta.source !== 'cloud_tables') {
      return false;
    }

    var fetchTable = async function(table) {
      var r = await _supabaseClient
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return r.error ? [] : (r.data || []).map(toCamelCase);
    };

    var results = await Promise.all([
      fetchTable('safras'), fetchTable('fazendas'), fetchTable('talhoes'),
      fetchTable('produtos'), fetchTable('estoque'), fetchTable('aplicacoes'),
      fetchTable('colheitas'), fetchTable('combustivel'), fetchTable('diesel_entradas'),
      fetchTable('diesel_estoque'), fetchTable('clima'), fetchTable('manutencoes'),
      fetchTable('equipe'), fetchTable('maquinas'), fetchTable('insumos_base'),
      fetchTable('lembretes'), fetchTable('pragas')
    ]);

    var safrasData = results[0], fazendas = results[1], talhoes = results[2];
    var produtos = results[3], estoque = results[4], aplicacoes = results[5];
    var colheitas = results[6], combustivel = results[7], dieselEntradas = results[8];
    var dieselEstoque = results[9], clima = results[10], manutencoes = results[11];
    var equipe = results[12], maquinas = results[13], insumosBase = results[14];
    var lembretes = results[15], pragas = results[16];

    var parametros = { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75, pesoPadraoSaca: 60 };
    try {
      var paramResult = await _supabaseClient
        .from('parametros')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (paramResult.data) parametros = toCamelCase(paramResult.data);
    } catch (e) {}

    var safraAtiva = safrasData.find(function(s) { return s.ativa; }) || safrasData[0];
    var db = {
      meta: { createdAt: new Date().toISOString(), version: 11, source: 'cloud_tables', lastSync: new Date().toISOString() },
      session: { safraId: safraAtiva ? safraAtiva.id : null },
      safras: safrasData,
      fazendas: fazendas,
      talhoes: talhoes,
      produtos: produtos,
      estoque: estoque,
      aplicacoes: aplicacoes,
      colheitas: colheitas,
      combustivel: combustivel,
      dieselEntradas: dieselEntradas,
      dieselEstoque: dieselEstoque,
      clima: clima,
      manutencoes: manutencoes,
      equipe: equipe,
      maquinas: maquinas,
      insumosBase: insumosBase,
      lembretes: lembretes,
      pragas: pragas,
      parametros: parametros
    };

    localStorage.setItem("agro_pro_v10", JSON.stringify(db));
    return true;
  } catch (e) {
    console.warn('Restore from tables: erro:', e.message);
    return false;
  }
}

// ============================================================
// CRUD DIRETO NO SUPABASE
// ============================================================
var SupaCRUD = {
  async insert(localKey, record) {
    if (!isSupabaseReady()) return null;
    var tableName = TABLE_MAP[localKey];
    if (!tableName) return null;

    var user = await AuthService.getUser();
    if (!user) return null;

    var data = toSnakeCase(record);
    data.user_id = user.id;
    delete data.created_at;
    delete data.updated_at;
    if (data.id && typeof data.id === 'string' && !data.id.match(/^[0-9a-f]{8}-/)) {
      delete data.id;
    }

    try {
      var result = await _supabaseClient
        .from(tableName)
        .insert(data)
        .select()
        .single();

      if (result.error) {
        console.warn('SupaCRUD.insert ' + tableName + ':', result.error.message);
        return null;
      }
      return toCamelCase(result.data);
    } catch (e) {
      console.warn('SupaCRUD.insert ' + tableName + ':', e.message);
      return null;
    }
  },

  async update(localKey, id, updates) {
    if (!isSupabaseReady()) return null;
    var tableName = TABLE_MAP[localKey];
    if (!tableName) return null;

    var data = toSnakeCase(updates);
    delete data.id;
    delete data.user_id;
    delete data.created_at;

    try {
      var result = await _supabaseClient
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (result.error) {
        console.warn('SupaCRUD.update ' + tableName + ':', result.error.message);
        return null;
      }
      return toCamelCase(result.data);
    } catch (e) {
      console.warn('SupaCRUD.update ' + tableName + ':', e.message);
      return null;
    }
  },

  async delete(localKey, id) {
    if (!isSupabaseReady()) return false;
    var tableName = TABLE_MAP[localKey];
    if (!tableName) return false;

    try {
      var result = await _supabaseClient
        .from(tableName)
        .delete()
        .eq('id', id);

      if (result.error) {
        console.warn('SupaCRUD.delete ' + tableName + ':', result.error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('SupaCRUD.delete ' + tableName + ':', e.message);
      return false;
    }
  },

  async upsertParametros(params) {
    if (!isSupabaseReady()) return null;
    var user = await AuthService.getUser();
    if (!user) return null;

    var data = toSnakeCase(params);
    data.user_id = user.id;
    delete data.id;
    delete data.created_at;
    delete data.updated_at;

    try {
      var result = await _supabaseClient
        .from('parametros')
        .upsert(data, { onConflict: 'user_id' })
        .select()
        .single();

      if (result.error) {
        console.warn('SupaCRUD.upsertParametros:', result.error.message);
        return null;
      }
      return toCamelCase(result.data);
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
  var user = await AuthService.getUser();
  if (!user) return;

  try {
    var existingResult = await _supabaseClient
      .from('safras')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingResult.data && existingResult.data.length > 0) return;

    var anoAtual = new Date().getFullYear();

    var safraResult = await _supabaseClient
      .from('safras')
      .insert({
        user_id: user.id,
        nome: 'Safra ' + anoAtual + '/' + (anoAtual + 1).toString().slice(-2),
        data_inicio: anoAtual + '-09-01',
        data_fim: (anoAtual + 1) + '-08-31',
        ativa: true,
        observacoes: 'Safra inicial'
      })
      .select()
      .single();

    if (!safraResult.data) return;
    var safra = safraResult.data;

    var fazendaResult = await _supabaseClient
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

    if (fazendaResult.data) {
      await _supabaseClient.from('talhoes').insert({
        user_id: user.id,
        safra_id: safra.id,
        fazenda_id: fazendaResult.data.id,
        nome: 'Talhão Exemplo',
        area_ha: 50,
        cultura: 'Soja',
        safra: 'Atual',
        solo: 'Argiloso',
        observacoes: 'Talhão de demonstração'
      });
    }

    await _supabaseClient.from('diesel_estoque').insert({
      user_id: user.id,
      safra_id: safra.id,
      deposito: 'Tanque Principal',
      litros: 0,
      preco_vigente: 0,
      observacoes: 'Estoque inicial'
    });

    await _supabaseClient.from('parametros').insert({
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

// ============================================================
// INDICADOR VISUAL DE STATUS
// ============================================================
function _updateCloudIndicator(connected) {
  window._cloudConnected = connected;
  var el = document.getElementById('cloudStatusIndicator');
  if (el) {
    el.textContent = connected ? '☁️ Conectado' : '📴 Offline';
    el.style.color = connected ? '#4ade80' : '#f59e0b';
  }
  var el2 = document.getElementById('cloudStatusText');
  if (el2) {
    el2.textContent = connected ? '✅ Conectado ao Supabase' : '⚠️ Modo Offline';
  }
}

// ============================================================
// EXPOR TUDO NO WINDOW (garantir escopo global)
// ============================================================
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON = SUPABASE_ANON;
window._supabaseReady = _supabaseReady;
window._supabaseClient = _supabaseClient;
window._cloudConnected = false;
window.initSupabase = initSupabase;
window.isSupabaseReady = isSupabaseReady;
window.getSupabaseClient = getSupabaseClient;
window.AuthService = AuthService;
window.TABLE_MAP = TABLE_MAP;
window.FIELD_MAP = FIELD_MAP;
window.toSnakeCase = toSnakeCase;
window.toCamelCase = toCamelCase;
window.cloudSync = cloudSync;
window.cloudSyncImmediate = cloudSyncImmediate;
window.cloudRestore = cloudRestore;
window.syncGranular = syncGranular;
window.restoreFromTables = restoreFromTables;
window.SupaCRUD = SupaCRUD;
window.seedSupabase = seedSupabase;
window._updateCloudIndicator = _updateCloudIndicator;

// Inicializar ao carregar o script
initSupabase();

// Atualizar flags globais após inicialização
window._supabaseReady = _supabaseReady;
window._supabaseClient = _supabaseClient;
window._cloudConnected = _supabaseReady;
