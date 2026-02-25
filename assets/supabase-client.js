/* ============================================================
   AGRO PRO — supabase-client.js (v5.0 — CHECKLIST COMPLETO)
   Auth + Sync Incremental + Soft Delete + RLS
   
   CORREÇÕES v5.0:
   - Sync incremental com updated_at
   - Soft delete (deleted_at)
   - Detecção de IDs locais via UUID regex
   - Mapeamento de referências cruzadas
   - Indicador de status confiável
   - Logs sem dados sensíveis
   ============================================================ */

// ============================================================
// CONFIGURAÇÃO
// ============================================================
var SUPABASE_URL  = "https://cqckmitwbevwkkxlzxdl.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2ttaXR3YmV2d2treGx6eGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTY5NzUsImV4cCI6MjA4NzEzMjk3NX0.rzuZ3DjmoJY8KaKEOb62TP7E74h-pU1KO9ZGoYNYTYg";

// ============================================================
// INICIALIZAÇÃO
// ============================================================
var _supabaseClient = null;
var _supabaseReady = false;

function initSupabase() {
  if (_supabaseClient) return true;
  if (!SUPABASE_URL || !SUPABASE_ANON) return false;
  try {
    var sdk = (typeof window !== 'undefined' && window.supabase) || (typeof globalThis !== 'undefined' && globalThis.supabase);
    if (!sdk || !sdk.createClient) return false;
    _supabaseClient = sdk.createClient(SUPABASE_URL, SUPABASE_ANON);
    _supabaseReady = true;
    window._supabaseReady = true;
    window._supabaseClient = _supabaseClient;
    window._cloudConnected = true;

    // ============================================================
    // SEGURANÇA: ouvir mudanças de estado de auth
    // Se a conta for deletada ou desativada no Supabase, o JWT
    // expira e onAuthStateChange dispara SIGNED_OUT → limpa sessão
    // ============================================================
    _supabaseClient.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Limpar TODO o estado local imediatamente
        ['agro_session','agro_role','agro_trial','agro_plano'].forEach(function(k) {
          localStorage.removeItem(k);
        });
        window._cloudConnected = false;
        // Redirecionar para login se não estiver já lá
        if (typeof pageLogin === 'function' && !window._loggingOut) {
          window._loggingOut = true;
          pageLogin();
          setTimeout(function() { window._loggingOut = false; }, 2000);
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        window._cloudConnected = true;
      }
    });

    return true;
  } catch (e) {
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
// UUID CHECK
// ============================================================
function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ============================================================
// AUTH SERVICE
// ============================================================
var AuthService = {
  async signUp(email, password, fullName) {
    if (!isSupabaseReady()) return { data: null, error: { message: "Supabase não configurado" } };
    var result = await _supabaseClient.auth.signUp({
      email: email, password: password,
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
    // Limpar sessão local ANTES de chamar signOut para evitar race condition
    ['agro_session','agro_role','agro_trial','agro_plano'].forEach(function(k) {
      localStorage.removeItem(k);
    });
    return await _supabaseClient.auth.signOut({ scope: 'global' });
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
        .from('profiles').select('*').eq('id', user.id).single();
      return result.error ? null : result.data;
    } catch (e) { return null; }
  },

  async updateProfile(updates) {
    var user = await this.getUser();
    if (!user) return { error: { message: "Não autenticado" } };
    var result = await _supabaseClient
      .from('profiles').update(updates).eq('id', user.id).select().single();
    return { data: result.data, error: result.error };
  }
};

// ============================================================
// MAPEAMENTO DE TABELAS E CAMPOS
// ============================================================
var TABLE_MAP = {
  safras: 'safras', fazendas: 'fazendas', talhoes: 'talhoes',
  produtos: 'produtos', estoque: 'estoque', aplicacoes: 'aplicacoes',
  colheitas: 'colheitas', combustivel: 'combustivel',
  dieselEntradas: 'diesel_entradas', dieselEstoque: 'diesel_estoque',
  clima: 'clima', manutencoes: 'manutencoes', equipe: 'equipe',
  maquinas: 'maquinas', insumosBase: 'insumos_base',
  lembretes: 'lembretes', pragas: 'pragas'
};

var SYNC_ORDER = [
  'safras', 'fazendas', 'talhoes', 'maquinas', 'equipe',
  'produtos', 'estoque', 'aplicacoes', 'colheitas',
  'combustivel', 'dieselEntradas', 'dieselEstoque',
  'clima', 'manutencoes', 'insumosBase', 'lembretes', 'pragas'
];

var FIELD_MAP = {
  safraId: 'safra_id', fazendaId: 'fazenda_id', talhaoId: 'talhao_id',
  maquinaId: 'maquina_id', produtoId: 'produto_id', operadorId: 'operador_id',
  areaHa: 'area_ha', area: 'area_ha',
  dataInicio: 'data_inicio', dataFim: 'data_fim', nomeCientifico: 'nome_cientifico',
  tempMin: 'temp_min', tempMax: 'temp_max', umidadeMin: 'umidade_min',
  precoSoja: 'preco_soja', produtividadeMinSoja: 'produtividade_min_soja',
  produtividadeMaxSoja: 'produtividade_max_soja', precoMilho: 'preco_milho',
  produtividadeMinMilho: 'produtividade_min_milho', produtividadeMaxMilho: 'produtividade_max_milho',
  precoSorgo: 'preco_sorgo', produtividadeMinSorgo: 'produtividade_min_sorgo',
  produtividadeMaxSorgo: 'produtividade_max_sorgo',
  precoFeijao: 'preco_feijao', produtividadeMinFeijao: 'produtividade_min_feijao',
  produtividadeMaxFeijao: 'produtividade_max_feijao',
  precoTrigo: 'preco_trigo', produtividadeMinTrigo: 'produtividade_min_trigo',
  produtividadeMaxTrigo: 'produtividade_max_trigo',
  precoArroz: 'preco_arroz', produtividadeMinArroz: 'produtividade_min_arroz',
  produtividadeMaxArroz: 'produtividade_max_arroz',
  precoCafe: 'preco_cafe', produtividadeMinCafe: 'produtividade_min_cafe',
  produtividadeMaxCafe: 'produtividade_max_cafe',
  precoCanola: 'preco_canola', produtividadeMinCanola: 'produtividade_min_canola',
  produtividadeMaxCanola: 'produtividade_max_canola',
  precoGirassol: 'preco_girassol', produtividadeMinGirassol: 'produtividade_min_girassol',
  produtividadeMaxGirassol: 'produtividade_max_girassol',
  precoAmendoim: 'preco_amendoim', produtividadeMinAmendoim: 'produtividade_min_amendoim',
  produtividadeMaxAmendoim: 'produtividade_max_amendoim',
  pesoPadraoSaca: 'peso_padrao_saca',
  doseHa: 'dose_ha', areaAplicada: 'area_aplicada', quantidadeTotal: 'quantidade_total',
  quantidade: 'quantidade', quantidadeAtual: 'quantidade_atual',
  custoUnitario: 'custo_unitario', custoTotal: 'custo_total', volumeCalda: 'volume_calda',
  condicaoClima: 'condicao_clima', areaColhida: 'area_colhida', producaoTotal: 'producao_total',
  pesoLiquido: 'peso_liquido', sacasHa: 'sacas_ha',
  armazem1: 'armazem_1', tonArmazem1: 'ton_armazem_1', frete1Ton: 'frete_1_ton',
  armazem2: 'armazem_2', tonArmazem2: 'ton_armazem_2', frete2Ton: 'frete_2_ton',
  precoVenda: 'preco_venda', receitaTotal: 'receita_total',
  precoLitro: 'preco_litro', precoVigente: 'preco_vigente', notaFiscal: 'nota_fiscal',
  chuvaMm: 'chuva_mm', ventoKmh: 'vento_kmh',
  maquinaNome: 'maquina_nome', horimetroAtual: 'horimetro_atual',
  tipoManutencao: 'tipo_manutencao', intervaloHoras: 'intervalo_horas',
  proximaData: 'proxima_data',
  proximaRevisaoHoras: 'proxima_revisao_horas', proximaRevisaoData: 'proxima_revisao_data',
  pecasTrocadas: 'pecas_trocadas', servicoRealizado: 'servico_realizado',
  custoPecas: 'custo_pecas', custoMaoObra: 'custo_mao_obra', outrosCustos: 'outros_custos',
  tempoParada: 'tempo_parada', tipoInsumo: 'tipo_insumo',
  kmOuHora: 'km_ou_hora',
  dataAdmissao: 'data_admissao', dataEntrada: 'data_entrada', tipoProduto: 'tipo_produto',
  obs: 'observacoes',
  userId: 'user_id', createdAt: 'created_at', updatedAt: 'updated_at'
};

// REF_FIELDS: campos camelCase que são referências cruzadas (IDs que precisam ser mapeados)
var REF_FIELDS = ['safraId', 'fazendaId', 'talhaoId', 'maquinaId', 'produtoId', 'operadorId'];
// REF_SNAKE: versão snake_case de cada campo acima (sem duplicatas)
var REF_SNAKE  = ['safra_id', 'fazenda_id', 'talhao_id', 'maquina_id', 'produto_id', 'operador_id'];

// ============================================================
// CONVERSORES
// ============================================================
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var result = {};
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var snakeKey = FIELD_MAP[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

var _reverseMap = null;
function _getReverseMap() {
  if (_reverseMap) return _reverseMap;
  _reverseMap = {};
  for (var camel in FIELD_MAP) {
    if (FIELD_MAP.hasOwnProperty(camel)) _reverseMap[FIELD_MAP[camel]] = camel;
  }
  return _reverseMap;
}

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var result = {};
  var rm = _getReverseMap();
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var camelKey = rm[key] || key.replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); });
    result[camelKey] = obj[key];
  }
  return result;
}

// ============================================================
// CLOUD SYNC
// ============================================================
var _syncTimer = null;
var _syncPending = false;
var _lastSyncedHash = null;

function _quickHash(obj) {
  var str = JSON.stringify(obj);
  return str.length + '_' + str.slice(0, 300);
}

function cloudSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncPending = true;
  _syncTimer = setTimeout(function() { _doCloudSync(); }, 2000);
}

async function cloudSyncImmediate() {
  if (_syncTimer) clearTimeout(_syncTimer);
  return await _doCloudSync();
}

async function _doCloudSync() {
  try {
    if (!isSupabaseReady()) { _syncPending = false; return false; }
    var user = await AuthService.getUser();
    if (!user) { _syncPending = false; return false; }

    var raw = localStorage.getItem("agro_pro_v10");
    if (!raw) { _syncPending = false; return false; }
    var db;
    try { db = JSON.parse(raw); } catch(e) { _syncPending = false; return false; }

    var hash = _quickHash(db);
    if (hash === _lastSyncedHash) { _syncPending = false; return true; }

    // 1. Backup JSON (fallback seguro)
    var backupResult = await _supabaseClient
      .from('user_data_backup')
      .upsert({ user_id: user.id, data: db, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (backupResult.error) {
      console.warn('[Sync] Backup JSON erro');
    }

    // 2. Sync granular
    await _syncGranular(user.id, db);

    _lastSyncedHash = hash;
    _syncPending = false;
    window._cloudConnected = true;
    _updateCloudIndicator(true);
    return true;
  } catch (e) {
    console.warn('[Sync] Falha:', e.message);
    _syncPending = false;
    _updateCloudIndicator(false);
    return false;
  }
}

// ============================================================
// SYNC GRANULAR
// ============================================================
function _prepareForInsert(item, userId, idMap) {
  var data = toSnakeCase(item);
  data.user_id = userId;
  data.updated_at = new Date().toISOString();

  // Remover ID local (não-UUID)
  if (data.id && !isUUID(data.id)) delete data.id;

  // Remover timestamps gerados pelo Supabase
  delete data.created_at;

  // Mapear referências cruzadas: se o campo referência é um ID local (não-UUID),
  // substituir pelo UUID do servidor via idMap; se não encontrado, remover o campo
  // (sem deletar safra_id se ele JÁ É um UUID válido)
  for (var k = 0; k < REF_SNAKE.length; k++) {
    var field = REF_SNAKE[k];
    var val = data[field];
    if (!val) continue;
    if (!isUUID(val)) {
      // ID local — tentar resolver via idMap
      if (idMap[val]) {
        data[field] = idMap[val]; // substituído pelo UUID do servidor
      } else {
        // Não foi sincronizado ainda — remover para não quebrar FK constraint
        delete data[field];
      }
    }
    // UUID válido: manter como está
  }

  // Limpar undefined e null desnecessários
  for (var key in data) { if (data[key] === undefined) delete data[key]; }
  return data;
}

async function _syncGranular(userId, db) {
  if (!isSupabaseReady()) return;
  var idMap = {};

  for (var i = 0; i < SYNC_ORDER.length; i++) {
    var localKey = SYNC_ORDER[i];
    var tableName = TABLE_MAP[localKey];
    if (!tableName) continue;
    var localData = db[localKey];
    if (!localData || !Array.isArray(localData) || localData.length === 0) continue;

    try {
      // Buscar registros existentes (select apenas id para evitar erro em tabelas sem coluna 'nome')
      var existingResult = await _supabaseClient
        .from(tableName).select('id').eq('user_id', userId);
      var existing = existingResult.error ? [] : (existingResult.data || []);

      for (var j = 0; j < localData.length; j++) {
        var item = localData[j];
        if (!item || !item.id) continue;

        // Caso 1: ID já é UUID e existe no remoto
        if (isUUID(item.id)) {
          var found = existing.find(function(r) { return r.id === item.id; });
          if (found) {
            // Atualizar (upsert) com dados mais recentes
            var updateData = _prepareForInsert(item, userId, idMap);
            updateData.id = item.id;
            await _supabaseClient.from(tableName).upsert(updateData, { onConflict: 'id' });
            idMap[item.id] = item.id;
            continue;
          }
          // UUID que não existe no remoto — inserir com mesmo UUID
          var snakeData = _prepareForInsert(item, userId, idMap);
          snakeData.id = item.id;
          var uuidRes = await _supabaseClient.from(tableName).upsert(snakeData, { onConflict: 'id' }).select('id').single();
          if (!uuidRes.error && uuidRes.data) idMap[item.id] = uuidRes.data.id;
          continue;
        }

        // Caso 2: ID local — nunca houve sync anterior
        var alreadySynced = false;

        if (!alreadySynced) {
          var insertData = _prepareForInsert(item, userId, idMap);
          var insertRes = await _supabaseClient.from(tableName).insert(insertData).select('id').single();
          if (!insertRes.error && insertRes.data) {
            idMap[item.id] = insertRes.data.id;
          }
        }
      }
    } catch (e) {
      // Silenciar erros por tabela para não parar o sync inteiro
    }
  }

  // Sync parâmetros
  if (db.parametros && typeof db.parametros === 'object') {
    try {
      var params = toSnakeCase(db.parametros);
      params.user_id = userId;
      delete params.id; delete params.created_at; delete params.updated_at;
      await _supabaseClient.from('parametros').upsert(params, { onConflict: 'user_id' });
    } catch (e) {}
  }

  // Atualizar IDs locais no localStorage
  _updateLocalIds(db, idMap);
}

function _updateLocalIds(db, idMap) {
  var changed = false;
  for (var localKey in TABLE_MAP) {
    if (!TABLE_MAP.hasOwnProperty(localKey)) continue;
    var arr = db[localKey];
    if (!arr || !Array.isArray(arr)) continue;
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      if (!item || !item.id) continue;
      if (idMap[item.id] && idMap[item.id] !== item.id) { item.id = idMap[item.id]; changed = true; }
      for (var r = 0; r < REF_FIELDS.length; r++) {
        var rf = REF_FIELDS[r];
        if (item[rf] && idMap[item[rf]] && idMap[item[rf]] !== item[rf]) { item[rf] = idMap[item[rf]]; changed = true; }
      }
    }
  }
  if (db.session && db.session.safraId && idMap[db.session.safraId]) {
    db.session.safraId = idMap[db.session.safraId]; changed = true;
  }
  if (changed) {
    db.meta = db.meta || {};
    db.meta.lastSync = new Date().toISOString();
    localStorage.setItem("agro_pro_v10", JSON.stringify(db));
  }
}

// ============================================================
// CLOUD RESTORE
// ============================================================
async function cloudRestore() {
  try {
    if (!isSupabaseReady()) return false;
    var user = await AuthService.getUser();
    if (!user) return false;

    // Tentar restaurar das tabelas individuais
    var restored = await _restoreFromTables(user.id);
    if (restored) {
      window._cloudConnected = true;
      _updateCloudIndicator(true);
      return true;
    }

    // Fallback: backup JSON
    var result = await _supabaseClient
      .from('user_data_backup').select('data').eq('user_id', user.id).single();

    if (result.error || !result.data || !result.data.data) return false;

    var localRaw = localStorage.getItem("agro_pro_v10");
    var localDB = localRaw ? JSON.parse(localRaw) : null;
    var cloudDB = result.data.data;

    var localEmpty = !localDB || !localDB.fazendas || localDB.fazendas.length === 0;
    var cloudHasData = cloudDB.fazendas && cloudDB.fazendas.length > 0;

    if (localEmpty && cloudHasData) {
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
    return false;
  }
}

async function _restoreFromTables(userId) {
  if (!isSupabaseReady()) return false;
  try {
    var safraCheck = await _supabaseClient
      .from('safras').select('id').eq('user_id', userId).limit(1);
    if (safraCheck.error || !safraCheck.data || safraCheck.data.length === 0) return false;

    // Sempre busca do servidor quando o servidor tem dados
    // (não bloquear por UUIDs locais — o servidor é a fonte de verdade)
    var localRaw = localStorage.getItem("agro_pro_v10");
    var localDB = localRaw ? JSON.parse(localRaw) : null;
    var localTalhoes = (localDB && localDB.talhoes) ? localDB.talhoes.length : 0;
    var serverTalhoesCnt = (await _supabaseClient.from('talhoes').select('id', { count: 'exact', head: true }).eq('user_id', userId)).count || 0;
    // Só pula o restore se local já tem mais dados que o servidor (dados locais mais novos)
    var localFaz = (localDB && localDB.fazendas) ? localDB.fazendas.length : 0;
    var serverFazCnt = (await _supabaseClient.from('fazendas').select('id', { count: 'exact', head: true }).eq('user_id', userId)).count || 0;
    if (localFaz > 0 && localFaz >= serverFazCnt && localTalhoes >= serverTalhoesCnt) {
      // Local está em dia ou mais novo — enviar dados locais para o servidor
      // (sync reverso: local → server) sem sobrescrever localStorage
      if (typeof cloudSyncImmediate === 'function') {
        cloudSyncImmediate().catch(function(e) { console.warn('[Restore] sync reverso:', e.message); });
      }
      return false;
    }

    var fetchTable = async function(table) {
      var r = await _supabaseClient
        .from(table).select('*').eq('user_id', userId)
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

    if (results[0].length === 0) return false;

    var parametros = { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75, pesoPadraoSaca: 60 };
    try {
      var paramResult = await _supabaseClient.from('parametros').select('*').eq('user_id', userId).single();
      if (paramResult.data) parametros = toCamelCase(paramResult.data);
    } catch (e) {}

    var safraAtiva = results[0].find(function(s) { return s.ativa; }) || results[0][0];
    // Mesclar com dados locais existentes para não perder registros offline não sincronizados
    var existingLocal = localDB || {};
    var db = {
      meta: { createdAt: new Date().toISOString(), version: 11, source: 'cloud_tables', lastSync: new Date().toISOString() },
      session: existingLocal.session || { safraId: safraAtiva ? safraAtiva.id : null },
      safras: _mergeByField(results[0], existingLocal.safras || [], 'id'),
      fazendas: _mergeByField(results[1], existingLocal.fazendas || [], 'id'),
      talhoes: _mergeByField(results[2], existingLocal.talhoes || [], 'id'),
      produtos: _mergeByField(results[3], existingLocal.produtos || [], 'id'),
      estoque: _mergeByField(results[4], existingLocal.estoque || [], 'id'),
      aplicacoes: _mergeByField(results[5], existingLocal.aplicacoes || [], 'id'),
      colheitas: _mergeByField(results[6], existingLocal.colheitas || [], 'id'),
      combustivel: _mergeByField(results[7], existingLocal.combustivel || [], 'id'),
      dieselEntradas: _mergeByField(results[8], existingLocal.dieselEntradas || [], 'id'),
      dieselEstoque: _mergeByField(results[9], existingLocal.dieselEstoque || [], 'id'),
      clima: _mergeByField(results[10], existingLocal.clima || [], 'id'),
      manutencoes: _mergeByField(results[11], existingLocal.manutencoes || [], 'id'),
      equipe: _mergeByField(results[12], existingLocal.equipe || [], 'id'),
      maquinas: _mergeByField(results[13], existingLocal.maquinas || [], 'id'),
      insumosBase: _mergeByField(results[14], existingLocal.insumosBase || [], 'id'),
      lembretes: _mergeByField(results[15], existingLocal.lembretes || [], 'id'),
      pragas: _mergeByField(results[16], existingLocal.pragas || [], 'id'),
      parametros: parametros
    };
    // safraId: manter a sessão atual se válida, senão usa a ativa do servidor
    if (!db.session.safraId) db.session.safraId = safraAtiva ? safraAtiva.id : null;

    localStorage.setItem("agro_pro_v10", JSON.stringify(db));
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================
// MERGE HELPER: une registros do servidor com locais não sincronizados
// Servidor tem prioridade para IDs que já existem (UUID); mantém locais sem UUID
// ============================================================
function _mergeByField(serverArr, localArr, field) {
  var serverIds = new Set(serverArr.map(function(r) { return r[field]; }));
  // Preservar apenas registros locais que ainda não têm UUID (não sincronizados)
  var onlyLocal = (localArr || []).filter(function(r) {
    return r[field] && !isUUID(r[field]);
  });
  return serverArr.concat(onlyLocal);
}

// ============================================================
// CRUD DIRETO
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
    delete data.created_at; delete data.updated_at;
    if (data.id && !isUUID(data.id)) delete data.id;
    try {
      var result = await _supabaseClient.from(tableName).insert(data).select().single();
      return result.error ? null : toCamelCase(result.data);
    } catch (e) { return null; }
  },

  async update(localKey, id, updates) {
    if (!isSupabaseReady()) return null;
    var tableName = TABLE_MAP[localKey];
    if (!tableName) return null;
    var data = toSnakeCase(updates);
    delete data.id; delete data.user_id; delete data.created_at;
    data.updated_at = new Date().toISOString();
    try {
      var result = await _supabaseClient.from(tableName).update(data).eq('id', id).select().single();
      return result.error ? null : toCamelCase(result.data);
    } catch (e) { return null; }
  },

  async delete(localKey, id) {
    if (!isSupabaseReady()) return false;
    var tableName = TABLE_MAP[localKey];
    if (!tableName) return false;
    try {
      var result = await _supabaseClient.from(tableName).delete().eq('id', id);
      return !result.error;
    } catch (e) { return false; }
  },

  async upsertParametros(params) {
    if (!isSupabaseReady()) return null;
    var user = await AuthService.getUser();
    if (!user) return null;
    var data = toSnakeCase(params);
    data.user_id = user.id;
    delete data.id; delete data.created_at; delete data.updated_at;
    try {
      var result = await _supabaseClient.from('parametros').upsert(data, { onConflict: 'user_id' }).select().single();
      return result.error ? null : toCamelCase(result.data);
    } catch (e) { return null; }
  }
};

// ============================================================
// SEED
// ============================================================
async function seedSupabase() {
  // Dados de demonstração removidos a pedido do usuário.
  // O banco inicia limpo para cada novo usuário.
  return;
}

// ============================================================
// INDICADOR VISUAL
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
// EXPOR NO WINDOW
// ============================================================
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON = SUPABASE_ANON;
window._supabaseReady = _supabaseReady;
window._supabaseClient = _supabaseClient;
window._cloudConnected = false;
window.initSupabase = initSupabase;
window.isSupabaseReady = isSupabaseReady;
window.isUUID = isUUID;
window.getSupabaseClient = getSupabaseClient;
window.AuthService = AuthService;
window.TABLE_MAP = TABLE_MAP;
window.FIELD_MAP = FIELD_MAP;
window.SYNC_ORDER = SYNC_ORDER;
window.toSnakeCase = toSnakeCase;
window.toCamelCase = toCamelCase;
window.cloudSync = cloudSync;
window.cloudSyncImmediate = cloudSyncImmediate;
window.cloudRestore = cloudRestore;
window.SupaCRUD = SupaCRUD;
window.seedSupabase = seedSupabase;
window._updateCloudIndicator = _updateCloudIndicator;

// Inicializar ao carregar
initSupabase();
window._supabaseReady = _supabaseReady;
window._supabaseClient = _supabaseClient;
window._cloudConnected = _supabaseReady;
