  /* ============================================================
   AGRO PRO — supabase-client.js (v4.0 — CORREÇÃO DEFINITIVA)
   Integração com Supabase: Auth + Sync + CRUD
   
   CORREÇÕES v4.0:
   - syncGranular: detecta IDs locais (qualquer ID que NÃO seja UUID)
   - Mapeamento de IDs locais → UUIDs para referências cruzadas
   - Campo "area" → "area_ha" no FIELD_MAP
   - Sync mais robusto e com logs detalhados
   - Testado ao vivo com dados reais
   ============================================================ */

// ============================================================
// CONFIGURAÇÃO — Credenciais do projeto Supabase
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
    console.warn("[Supabase] Credenciais vazias. Modo offline.");
    return false;
  }
  try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } else if (typeof globalThis.supabase !== 'undefined' && globalThis.supabase.createClient) {
      _supabaseClient = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } else {
      console.warn("[Supabase] SDK não encontrado no window/globalThis.");
      return false;
    }
    _supabaseReady = true;
    window._supabaseReady = true;
    window._supabaseClient = _supabaseClient;
    window._cloudConnected = true;
    console.log("[Supabase v4.0] Cliente inicializado com sucesso!");
    return true;
  } catch (e) {
    console.error("[Supabase] Erro ao inicializar:", e.message);
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
// UTILITÁRIO: Verificar se string é UUID válido
// ============================================================
function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
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

// Ordem de sync: tabelas pai primeiro, depois filhas (para referências cruzadas)
var SYNC_ORDER = [
  'safras', 'fazendas', 'talhoes', 'maquinas', 'equipe',
  'produtos', 'estoque', 'aplicacoes', 'colheitas',
  'combustivel', 'dieselEntradas', 'dieselEstoque',
  'clima', 'manutencoes', 'insumosBase', 'lembretes', 'pragas'
];

// Mapeamento de campos: camelCase (JS) → snake_case (SQL)
var FIELD_MAP = {
  safraId: 'safra_id', fazendaId: 'fazenda_id', talhaoId: 'talhao_id',
  maquinaId: 'maquina_id', produtoId: 'produto_id',
  areaHa: 'area_ha', area: 'area_ha',
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
  obs: 'observacoes',
  userId: 'user_id', createdAt: 'created_at', updatedAt: 'updated_at'
};

// Campos que são referências a outras tabelas (IDs locais que precisam ser mapeados)
var REF_FIELDS = ['safraId', 'fazendaId', 'talhaoId', 'maquinaId', 'produtoId'];

// Converter JS (camelCase) → SQL (snake_case)
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var result = {};
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var val = obj[key];
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
    if (!isSupabaseReady()) {
      console.log('[Sync] Supabase não pronto, pulando sync');
      _syncPending = false;
      return false;
    }
    var user = await AuthService.getUser();
    if (!user) {
      console.log('[Sync] Sem usuário autenticado, pulando sync');
      _syncPending = false;
      return false;
    }

    var raw = localStorage.getItem("agro_pro_v10");
    if (!raw) { _syncPending = false; return false; }
    var db;
    try { db = JSON.parse(raw); } catch(e) { _syncPending = false; return false; }

    var hash = quickHash(db);
    if (hash === _lastSyncedHash) {
      console.log('[Sync] Dados não mudaram, pulando');
      _syncPending = false;
      return true;
    }

    console.log('[Sync] Iniciando sincronização...');

    // 1. Backup JSON completo (sempre funciona, é o fallback seguro)
    var backupResult = await _supabaseClient
      .from('user_data_backup')
      .upsert({
        user_id: user.id,
        data: db,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (backupResult.error) {
      console.warn('[Sync] Erro no backup JSON:', backupResult.error.message);
    } else {
      console.log('[Sync] Backup JSON salvo com sucesso');
    }

    // 2. Sync granular por tabela (com mapeamento de IDs)
    await syncGranular(user.id, db);

    _lastSyncedHash = hash;
    _syncPending = false;
    window._cloudConnected = true;
    _updateCloudIndicator(true);

    console.log('[Sync] Sincronização completa!');
    return true;
  } catch (e) {
    console.warn('[Sync] Falha geral:', e.message);
    _syncPending = false;
    _updateCloudIndicator(false);
    return false;
  }
}

// ============================================================
// SYNC GRANULAR — Sincroniza cada tabela individualmente
// Mapeia IDs locais (s1, f1, etc.) para UUIDs do Supabase
// ============================================================
async function syncGranular(userId, db) {
  if (!isSupabaseReady()) return;

  // Mapa global de IDs locais → UUIDs (preenchido durante o sync)
  var idMap = {};

  // Primeiro, buscar IDs que já existem no Supabase para este usuário
  // (para evitar duplicatas em syncs repetidos)
  for (var i = 0; i < SYNC_ORDER.length; i++) {
    var localKey = SYNC_ORDER[i];
    var tableName = TABLE_MAP[localKey];
    if (!tableName) continue;
    var localData = db[localKey];
    if (!localData || !Array.isArray(localData) || localData.length === 0) continue;

    try {
      // Buscar registros existentes do usuário nesta tabela
      var existingResult = await _supabaseClient
        .from(tableName)
        .select('id, nome, created_at')
        .eq('user_id', userId);

      var existingRecords = existingResult.error ? [] : (existingResult.data || []);

      for (var j = 0; j < localData.length; j++) {
        var item = localData[j];
        if (!item || !item.id) continue;

        // Se já é UUID, verificar se existe no remoto
        if (isUUID(item.id)) {
          var found = existingRecords.find(function(r) { return r.id === item.id; });
          if (found) {
            idMap[item.id] = item.id; // UUID já existe, manter
            continue;
          }
          // UUID que não existe no remoto — inserir com o mesmo UUID
          var snakeData = _prepareForInsert(item, userId, idMap);
          snakeData.id = item.id; // manter o UUID original
          var uuidResult = await _supabaseClient.from(tableName).upsert(snakeData, { onConflict: 'id' }).select('id').single();
          if (!uuidResult.error && uuidResult.data) {
            idMap[item.id] = uuidResult.data.id;
            console.log('[Sync] ' + tableName + ': UUID existente inserido → ' + uuidResult.data.id);
          } else if (uuidResult.error) {
            console.warn('[Sync] ' + tableName + ': erro ao inserir UUID:', uuidResult.error.message);
          }
          continue;
        }

        // ID local (não-UUID): verificar se já foi sincronizado antes
        // Tentar encontrar por nome (heurística para evitar duplicatas)
        var alreadySynced = false;
        if (item.nome) {
          var match = existingRecords.find(function(r) { return r.nome === item.nome; });
          if (match) {
            idMap[item.id] = match.id;
            console.log('[Sync] ' + tableName + ': "' + item.nome + '" já existe → ' + match.id);
            alreadySynced = true;
          }
        }

        if (!alreadySynced) {
          // Inserir como novo registro
          var insertData = _prepareForInsert(item, userId, idMap);
          var insertResult = await _supabaseClient
            .from(tableName)
            .insert(insertData)
            .select('id')
            .single();

          if (!insertResult.error && insertResult.data) {
            idMap[item.id] = insertResult.data.id;
            console.log('[Sync] ' + tableName + ': "' + (item.nome || item.id) + '" inserido → ' + insertResult.data.id);
          } else {
            console.warn('[Sync] ' + tableName + ': erro ao inserir "' + (item.nome || item.id) + '":', insertResult.error ? insertResult.error.message : 'unknown');
          }
        }
      }
    } catch (e) {
      console.warn('[Sync] ' + tableName + ': erro geral:', e.message);
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
      console.log('[Sync] Parâmetros sincronizados');
    } catch (e) {
      console.warn('[Sync] Parâmetros: erro:', e.message);
    }
  }

  // Atualizar IDs locais no localStorage com os UUIDs do Supabase
  _updateLocalIdsWithUUIDs(db, idMap);

  console.log('[Sync] Mapa de IDs:', JSON.stringify(idMap));
}

// Preparar registro para inserção no Supabase
function _prepareForInsert(item, userId, idMap) {
  var data = toSnakeCase(item);
  data.user_id = userId;

  // Remover ID local (Supabase gera UUID automaticamente)
  if (data.id && !isUUID(data.id)) {
    delete data.id;
  }

  // Remover timestamps (Supabase gera automaticamente)
  delete data.created_at;
  delete data.updated_at;

  // Mapear referências cruzadas (IDs locais → UUIDs)
  var refSnakeFields = ['safra_id', 'fazenda_id', 'talhao_id', 'maquina_id', 'produto_id'];
  for (var k = 0; k < refSnakeFields.length; k++) {
    var field = refSnakeFields[k];
    if (data[field] && !isUUID(data[field])) {
      if (idMap[data[field]]) {
        data[field] = idMap[data[field]];
      } else {
        // Referência a ID local que ainda não foi mapeado — remover para evitar erro
        console.warn('[Sync] Referência não mapeada: ' + field + ' = ' + data[field]);
        delete data[field];
      }
    }
  }

  // Remover campos undefined ou null que podem causar erros
  for (var key in data) {
    if (data[key] === undefined) delete data[key];
  }

  return data;
}

// Atualizar IDs locais no localStorage com UUIDs do Supabase
function _updateLocalIdsWithUUIDs(db, idMap) {
  var changed = false;

  for (var localKey in TABLE_MAP) {
    if (!TABLE_MAP.hasOwnProperty(localKey)) continue;
    var arr = db[localKey];
    if (!arr || !Array.isArray(arr)) continue;

    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      if (!item || !item.id) continue;

      // Atualizar o ID principal
      if (idMap[item.id] && idMap[item.id] !== item.id) {
        item.id = idMap[item.id];
        changed = true;
      }

      // Atualizar referências cruzadas
      for (var r = 0; r < REF_FIELDS.length; r++) {
        var refField = REF_FIELDS[r];
        if (item[refField] && idMap[item[refField]] && idMap[item[refField]] !== item[refField]) {
          item[refField] = idMap[item[refField]];
          changed = true;
        }
      }
    }
  }

  // Atualizar session.safraId
  if (db.session && db.session.safraId && idMap[db.session.safraId]) {
    db.session.safraId = idMap[db.session.safraId];
    changed = true;
  }

  if (changed) {
    db.meta = db.meta || {};
    db.meta.lastSync = new Date().toISOString();
    db.meta.idsUpdated = true;
    localStorage.setItem("agro_pro_v10", JSON.stringify(db));
    console.log('[Sync] IDs locais atualizados para UUIDs no localStorage');
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

    console.log('[Restore] Iniciando restauração...');

    // Tentar restaurar das tabelas individuais primeiro
    var restoredFromTables = await restoreFromTables(user.id);
    if (restoredFromTables) {
      console.log('[Restore] Dados restaurados das tabelas individuais');
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

    if (result.error || !result.data || !result.data.data) {
      console.log('[Restore] Nenhum backup encontrado na nuvem');
      return false;
    }

    var localRaw = localStorage.getItem("agro_pro_v10");
    var localDB = localRaw ? JSON.parse(localRaw) : null;
    var cloudDB = result.data.data;

    // Restaurar se: não tem dados locais, ou dados locais estão vazios, ou nuvem é mais recente
    var localEmpty = !localDB || !localDB.fazendas || localDB.fazendas.length === 0;
    var cloudHasData = cloudDB.fazendas && cloudDB.fazendas.length > 0;

    if (localEmpty && cloudHasData) {
      console.log('[Restore] Restaurando do backup JSON (local vazio, nuvem tem dados)');
      cloudDB.meta = cloudDB.meta || {};
      cloudDB.meta.lastSync = new Date().toISOString();
      cloudDB.meta.source = 'cloud_backup';
      localStorage.setItem("agro_pro_v10", JSON.stringify(cloudDB));
      window._cloudConnected = true;
      _updateCloudIndicator(true);
      return true;
    }

    console.log('[Restore] Dados locais existem, mantendo (local: ' + (localDB.fazendas ? localDB.fazendas.length : 0) + ' fazendas)');
    return false;
  } catch (e) {
    console.warn('[Restore] Erro:', e.message);
    return false;
  }
}

async function restoreFromTables(userId) {
  if (!isSupabaseReady()) return false;

  try {
    // Verificar se existem dados nas tabelas
    var safraCheck = await _supabaseClient
      .from('safras')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (safraCheck.error || !safraCheck.data || safraCheck.data.length === 0) {
      console.log('[Restore] Nenhuma safra encontrada nas tabelas');
      return false;
    }

    // Se já tem dados locais com conteúdo, não sobrescrever
    var localRaw = localStorage.getItem("agro_pro_v10");
    var localDB = localRaw ? JSON.parse(localRaw) : null;
    if (localDB && localDB.fazendas && localDB.fazendas.length > 0) {
      // Verificar se os IDs locais já são UUIDs (já foi sincronizado)
      var firstId = localDB.fazendas[0].id;
      if (isUUID(firstId)) {
        console.log('[Restore] Dados locais já têm UUIDs, não sobrescrever');
        return false;
      }
    }

    console.log('[Restore] Restaurando das tabelas individuais...');

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

    var safrasData = results[0];
    if (safrasData.length === 0) return false;

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
      fazendas: results[1],
      talhoes: results[2],
      produtos: results[3],
      estoque: results[4],
      aplicacoes: results[5],
      colheitas: results[6],
      combustivel: results[7],
      dieselEntradas: results[8],
      dieselEstoque: results[9],
      clima: results[10],
      manutencoes: results[11],
      equipe: results[12],
      maquinas: results[13],
      insumosBase: results[14],
      lembretes: results[15],
      pragas: results[16],
      parametros: parametros
    };

    localStorage.setItem("agro_pro_v10", JSON.stringify(db));
    console.log('[Restore] Dados restaurados: ' + safrasData.length + ' safras, ' + results[1].length + ' fazendas');
    return true;
  } catch (e) {
    console.warn('[Restore] Erro ao restaurar das tabelas:', e.message);
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
    if (data.id && !isUUID(data.id)) {
      delete data.id;
    }

    try {
      var result = await _supabaseClient
        .from(tableName)
        .insert(data)
        .select()
        .single();

      if (result.error) {
        console.warn('[CRUD] insert ' + tableName + ':', result.error.message);
        return null;
      }
      return toCamelCase(result.data);
    } catch (e) {
      console.warn('[CRUD] insert ' + tableName + ':', e.message);
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
        console.warn('[CRUD] update ' + tableName + ':', result.error.message);
        return null;
      }
      return toCamelCase(result.data);
    } catch (e) {
      console.warn('[CRUD] update ' + tableName + ':', e.message);
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
        console.warn('[CRUD] delete ' + tableName + ':', result.error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[CRUD] delete ' + tableName + ':', e.message);
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
        console.warn('[CRUD] upsertParametros:', result.error.message);
        return null;
      }
      return toCamelCase(result.data);
    } catch (e) {
      console.warn('[CRUD] upsertParametros:', e.message);
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

    console.log('[Seed] Dados iniciais criados no Supabase');
  } catch (e) {
    console.warn('[Seed] Erro:', e.message);
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
window.isUUID = isUUID;
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
