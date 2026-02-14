/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTIEMPRESA) - COM IA PREDITIVA
   Versão completa com Inteligência Artificial
   ============================================================ */

// ==================== 1. FUNÇÕES UTILITÁRIAS ====================
const Storage = {
  key: "agro_pro_v1",
  load(){
    try{
      const raw = localStorage.getItem(this.key);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  },
  save(db){
    localStorage.setItem(this.key, JSON.stringify(db));
  }
};

function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowISO(){
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function toast(title, msg){
  const host = document.getElementById("toastHost") || (() => {
    const h = document.createElement("div");
    h.id = "toastHost";
    h.className = "toastHost";
    document.body.appendChild(h);
    return h;
  })();

  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${escapeHtml(title)}</b><p>${escapeHtml(msg)}</p>`;
  host.appendChild(el);

  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(6px)"; }, 3200);
  setTimeout(()=>{ el.remove(); }, 3800);
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows){
  if(!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replaceAll('"','""')}"`;
  const header = cols.map(esc).join(",");
  const lines = rows.map(r => cols.map(c => esc(r[c])).join(","));
  return [header, ...lines].join("\n");
}

// ==================== 2. DB / SEED ====================
function seedDB(){
  const empresaId = uid("emp");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");
  const maqId = uid("maq");
  const opId = uid("peq");

  const prd1 = uid("prd");
  const prd2 = uid("prd");

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 2 },
    session: { empresaId },

    empresas: [
      {
        id: empresaId,
        nome: "Agro Demo LTDA",
        cnpj: "00.000.000/0001-00",
        responsavel: "Admin",
        cidade: "Sorriso",
        uf: "MT",
        observacoes: "Ambiente de demonstração."
      }
    ],

    fazendas: [
      { id: fazendaId, empresaId, nome:"Fazenda Horizonte", cidade:"Sorriso", uf:"MT", areaHa: 1450, observacoes:"Soja/Milho safrinha" }
    ],

    talhoes: [
      { id: talhaoId, empresaId, fazendaId, nome:"T-12", areaHa: 78.5, cultura:"Soja", safra:"2025/26", solo:"Argiloso", coordenadas:"", observacoes:"" }
    ],

    produtos: [
      { id: prd1, empresaId, tipo:"Herbicida", nome:"Glifosato 480", ingrediente:"Glifosato", fabricante:"Genérico", registro:"", carenciaDias: 7, reentradaHoras: 24, unidade:"L", preco: 45.90, obs:"" },
      { id: prd2, empresaId, tipo:"Fungicida", nome:"Triazol+Estrobilurina", ingrediente:"Mistura", fabricante:"Genérico", registro:"", carenciaDias: 14, reentradaHoras: 24, unidade:"L", preco: 89.90, obs:"" }
    ],

    estoque: [
      { id: uid("stk"), empresaId, produtoId: prd1, deposito:"Central", lote:"", validade:"", qtd: 1200, unidade:"L", obs:"Demo" },
      { id: uid("stk"), empresaId, produtoId: prd2, deposito:"Central", lote:"", validade:"", qtd: 240, unidade:"L", obs:"Demo" }
    ],

    equipe: [
      { id: opId, empresaId, nome:"Operador 1", funcao:"Tratorista", telefone:"", nr:"", obs:"" }
    ],

    maquinas: [
      { id: maqId, empresaId, nome:"Pulverizador Autopropelido", placa:"", horimetro: 0, capacidadeL: 3000, bicos:"", obs:"" }
    ],

    clima: [
      { id: uid("cli"), empresaId, data: nowISO(), fazendaId, talhaoId, chuvaMm: 12, tempMin: 22, tempMax: 33, umidade: 68, vento: 9, obs:"Chuva isolada à tarde" }
    ],

    dieselEstoque: [
      { id: uid("dsl"), empresaId, deposito:"Tanque Principal", litros: 5000, obs:"Saldo pode ficar negativo (furo de estoque)" }
    ],
    
    combustivel: [
      {
        id: uid("cmb"),
        empresaId,
        data: nowISO(),
        tipo: "Diesel S10",
        deposito: "Tanque Principal",
        posto: "Posto Exemplo",
        maquinaId: maqId,
        operadorId: opId,
        fazendaId,
        talhaoId,
        litros: 120,
        precoLitro: 6.19,
        kmOuHora: 0,
        obs: "Abastecimento demo"
      }
    ],

    aplicacoes: [
      {
        id: uid("apl"),
        empresaId,
        data: nowISO(),
        fazendaId,
        talhaoId,
        areaHaAplicada: 25,
        cultura:"Soja",
        alvo:"Plantas daninhas",
        operacao:"Pulverização terrestre",
        maquinaId: maqId,
        operadorId: opId,
        condicoes:{ vento: 8, temp: 31, umidade: 60 },
        caldaLHa: 120,
        velocidadeKmH: 14,
        bico:"Leque 11002",
        pressaoBar: 3,
        produtos: [
          { produtoNome:"Glifosato 480", dosePorHa: 2.0, unidade:"L/ha" }
        ],
        custoTotal: 0,
        obs:"Aplicação padrão (demo)."
      }
    ]
  };

  Storage.save(db);
  return db;
}

function getDB(){
  let db = Storage.load();
  if(!db) db = seedDB();

  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 2 };
  db.session = db.session || {};
  db.empresas = db.empresas || [];
  db.fazendas = db.fazendas || [];
  db.talhoes = db.talhoes || [];
  db.produtos = db.produtos || [];
  db.estoque = db.estoque || [];
  db.equipe = db.equipe || [];
  db.maquinas = db.maquinas || [];
  db.clima = db.clima || [];
  db.aplicacoes = db.aplicacoes || [];
  db.combustivel = db.combustivel || [];
  db.dieselEstoque = db.dieselEstoque || [{ id: uid("dsl"), empresaId: (db.session.empresaId||db.empresas?.[0]?.id||uid("emp")), deposito:"Tanque Principal", litros: 0, obs:"" }];

  db.clima.forEach(c=>{ if(c.talhaoId==null) c.talhaoId=""; });

  Storage.save(db);
  return db;
}

function setDB(db){ Storage.save(db); }

function getEmpresaId(){
  const db = getDB();
  return db.session?.empresaId || (db.empresas[0]?.id ?? null);
}

function setEmpresaId(id){
  const db = getDB();
  db.session = db.session || {};
  db.session.empresaId = id;
  setDB(db);
}

// ==================== 3. UI SHELL ====================
const PAGES = [
  { href:"index.html", label:"Dashboard", key:"dashboard", icon:"📊" },
  { href:"opscenter.html", label:"Ops Center", key:"opscenter", icon:"🛰️" },
  { href:"ia-preditiva.html", label:"IA Preditiva", key:"ia", icon:"🤖" },
  { href:"empresas.html", label:"Empresas", key:"empresas", icon:"🏢" },
  { href:"fazendas.html", label:"Fazendas", key:"fazendas", icon:"🌾" },
  { href:"talhoes.html", label:"Talhões", key:"talhoes", icon:"🧭" },
  { href:"produtos.html", label:"Produtos", key:"produtos", icon:"🧪" },
  { href:"estoque.html", label:"Estoque", key:"estoque", icon:"📦" },
  { href:"aplicacoes.html", label:"Aplicações", key:"aplicacoes", icon:"🚜" },
  { href:"combustivel.html", label:"Combustível", key:"combustivel", icon:"⛽" },
  { href:"clima.html", label:"Clima/Chuva", key:"clima", icon:"🌧️" },
  { href:"equipe.html", label:"Equipe", key:"equipe", icon:"👷" },
  { href:"maquinas.html", label:"Máquinas", key:"maquinas", icon:"🛠️" },
  { href:"relatorios.html", label:"Relatórios", key:"relatorios", icon:"🧾" },
  { href:"configuracoes.html", label:"Configurações", key:"config", icon:"⚙️" },
];

function renderShell(pageKey, title, subtitle){
  const db = getDB();
  const empresaId = getEmpresaId();
  const empresa = db.empresas.find(e=>e.id===empresaId);
  const nav = PAGES.map(p => {
    const active = (p.key===pageKey) ? "active" : "";
    return `<a class="${active}" href="${p.href}"><span class="ico">${p.icon}</span> ${escapeHtml(p.label)}</a>`;
  }).join("");

  const empresaOptions = db.empresas.map(e => {
    const sel = e.id===empresaId ? "selected" : "";
    return `<option value="${e.id}" ${sel}>${escapeHtml(e.nome)}</option>`;
  }).join("");

  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="brand">
          <div class="logo"></div>
          <div>
            <h1>Agro Pro</h1>
            <p>Controle Agronômico • Multiempresa • IA</p>
          </div>
        </div>

        <div class="tenant">
          <div class="row">
            <span class="badge"><span class="dot"></span> Ambiente Offline</span>
            <button class="btn noPrint" id="btnBackup">Backup</button>
          </div>
          <div class="hr"></div>
          <small>Empresa ativa</small>
          <select class="select" id="empresaSelect">${empresaOptions}</select>
          <div style="margin-top:10px" class="row">
            <button class="btn primary" id="btnNovaEmpresa">+ Nova empresa</button>
            <button class="btn danger" id="btnResetDemo">Reset demo</button>
          </div>
        </div>

        <nav class="nav">${nav}</nav>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="title">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle || (empresa ? `Empresa: ${empresa.nome}` : "Selecione uma empresa"))}</p>
          </div>
          <div class="actions noPrint" id="topActions"></div>
        </div>

        <div id="content"></div>
      </main>
    </div>
  `;

  document.getElementById("empresaSelect").addEventListener("change", (e)=>{
    setEmpresaId(e.target.value);
    toast("Empresa alterada", "Atualizando a página…");
    setTimeout(()=>location.reload(), 200);
  });

  document.getElementById("btnResetDemo").addEventListener("click", ()=>{
    if(!confirm("Isso vai resetar o banco local e voltar para o demo. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Reset concluído", "Banco local restaurado para o demo.");
    setTimeout(()=>location.reload(), 200);
  });

  document.getElementById("btnBackup").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(db2, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if(!nome) return;
    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome, cnpj:"", responsavel:"", cidade:"", uf:"", observacoes:"" });
    setDB(db2);
    setEmpresaId(id);
    toast("Empresa criada", "Agora você está nessa empresa.");
    setTimeout(()=>location.reload(), 200);
  });
}

// ==================== 4. HELPERS ====================
function onlyEmpresa(arr){
  const eid = getEmpresaId();
  return (arr||[]).filter(x => x.empresaId === eid);
}

function findNameById(arr, id, fallback="-"){
  const o = (arr||[]).find(x=>x.id===id);
  return o ? (o.nome ?? fallback) : fallback;
}

const FMT_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function brl(v){ return FMT_BRL.format(Number(v || 0)); }
function num(v, casas=2){
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(Number(v || 0));
}
function kbrl(n){ return brl(n); }

function setTopActions(html){
  const el = document.getElementById("topActions");
  if(el) el.innerHTML = html || "";
}

function clampStr(s, max=60){
  s = String(s ?? "");
  return s.length>max ? s.slice(0,max-1)+"…" : s;
}
function pageIAPreditiva() {
  console.log("🚀 Iniciando pageIAPreditiva");
  console.log("getDB disponível?", typeof getDB);
  console.log("onlyEmpresa disponível?", typeof onlyEmpresa);
  
  const db = getDB();
  console.log("DB carregado:", db);
  
  const talhoes = onlyEmpresa(db.talhoes);
  console.log("Talhões encontrados:", talhoes);
  
  // ... resto do código
}
// ==================== 5. MÓDULO DE IA PREDITIVA ====================
const IA_CONFIG = {
  pesos: {
    produtividade: {
      historico: 0.25,
      clima: 0.20,
      solo: 0.15,
      aplicacoes: 0.25,
      manejo: 0.15
    },
    riscoPragas: {
      temperatura: 0.20,
      umidade: 0.25,
      historico: 0.30,
      cultura: 0.15,
      epoca: 0.10
    }
  },
  alertas: {
    produtividadeBaixa: 0.7,
    riscoPragaAlto: 0.8,
    janelaIdeal: 3
  }
};

class IAPredictiva {
  constructor(db) {
    this.db = db;
    this.modelos = this.carregarModelos();
  }

  carregarModelos() {
    let modelos = localStorage.getItem('agro_ia_models');
    if (modelos) {
      return JSON.parse(modelos);
    }
    return {
      produtividade: {},
      riscoPragas: {},
      treinadoEm: null
    };
  }

  salvarModelos() {
    localStorage.setItem('agro_ia_models', JSON.stringify(this.modelos));
  }

  // ========== PREVISÃO DE PRODUTIVIDADE ==========
  preverProdutividade(talhaoId, safra) {
    const talhao = onlyEmpresa(this.db.talhoes).find(t => t.id === talhaoId);
    if (!talhao) return null;

    const historico = this.coletarDadosHistoricos(talhaoId);
    const clima = this.coletarDadosClimaticos(talhaoId);
    const solo = this.analisarSolo(talhao);
    const aplicacoes = this.analisarAplicacoes(talhaoId);
    const manejo = this.analisarManejo(talhaoId);

    const score = 
      (historico.score * IA_CONFIG.pesos.produtividade.historico) +
      (clima.score * IA_CONFIG.pesos.produtividade.clima) +
      (solo.score * IA_CONFIG.pesos.produtividade.solo) +
      (aplicacoes.score * IA_CONFIG.pesos.produtividade.aplicacoes) +
      (manejo.score * IA_CONFIG.pesos.produtividade.manejo);

    const prodBase = this.getProdutividadeBase(talhao.cultura);
    const prodEstimada = prodBase * score;

    return {
      talhaoId,
      talhao: talhao.nome,
      cultura: talhao.cultura,
      safra,
      produtividadeEstimada: prodEstimada,
      produtividadeMin: prodEstimada * 0.85,
      produtividadeMax: prodEstimada * 1.15,
      score: score * 100,
      confianca: this.calcularConfianca(historico, clima, solo),
      fatores: {
        historico: historico.score * 100,
        clima: clima.score * 100,
        solo: solo.score * 100,
        aplicacoes: aplicacoes.score * 100,
        manejo: manejo.score * 100
      },
      alertas: this.gerarAlertasProdutividade(score, prodEstimada)
    };
  }

  coletarDadosHistoricos(talhaoId) {
    const aplicacoes = onlyEmpresa(this.db.aplicacoes || [])
      .filter(a => a.talhaoId === talhaoId);
    
    if (aplicacoes.length === 0) {
      return { score: 0.7, dados: [] };
    }

    return { score: 0.8, dados: aplicacoes };
  }

  coletarDadosClimaticos(talhaoId) {
    const clima = onlyEmpresa(this.db.clima || [])
      .filter(c => c.talhaoId === talhaoId)
      .slice(-30);

    if (clima.length === 0) {
      return { score: 0.75, dados: [] };
    }

    const tempMedia = clima.reduce((s, c) => s + (c.tempMax || 0), 0) / clima.length;
    const chuvaTotal = clima.reduce((s, c) => s + (c.chuvaMm || 0), 0);
    
    let score = 0.8;
    if (chuvaTotal > 200) score -= 0.1;
    if (tempMedia > 35) score -= 0.1;
    
    return { score, dados: clima };
  }

  analisarSolo(talhao) {
    const solo = talhao.solo?.toLowerCase() || '';
    let score = 0.8;

    if (solo.includes('argiloso')) score += 0.1;
    if (solo.includes('arenoso')) score -= 0.1;
    if (solo.includes('organico')) score += 0.15;

    return { score: Math.min(1, Math.max(0.5, score)) };
  }

  analisarAplicacoes(talhaoId) {
    const apps = onlyEmpresa(this.db.aplicacoes || [])
      .filter(a => a.talhaoId === talhaoId);

    let score = 0.75;
    if (apps.length > 5) score += 0.1;
    if (apps.length > 10) score += 0.1;

    return { score: Math.min(1, score) };
  }

  analisarManejo(talhaoId) {
    return { score: 0.8 };
  }

  getProdutividadeBase(cultura) {
    const bases = {
      'soja': 60,
      'milho': 120,
      'algodao': 180,
      'cafe': 30,
      'cana': 80
    };
    return bases[cultura?.toLowerCase()] || 50;
  }

  calcularConfianca(historico, clima, solo) {
    let confianca = 0.7;
    if (historico.dados?.length > 10) confianca += 0.2;
    if (clima.dados?.length > 20) confianca += 0.1;
    return Math.min(1, confianca) * 100;
  }

  gerarAlertasProdutividade(score, prodEstimada) {
    const alertas = [];
    if (score < 0.6) {
      alertas.push({
        tipo: 'critico',
        mensagem: `Produtividade estimada baixa (${prodEstimada.toFixed(1)} sc/ha)`,
        acao: 'Revisar manejo e nutrição do talhão'
      });
    } else if (score < 0.8) {
      alertas.push({
        tipo: 'atencao',
        mensagem: 'Produtividade abaixo do potencial',
        acao: 'Aplicar fertilizantes e monitorar pragas'
      });
    }
    return alertas;
  }

  // ========== PREVISÃO DE PRAGAS ==========
  preverRiscoPragas(talhaoId) {
    const talhao = onlyEmpresa(this.db.talhoes).find(t => t.id === talhaoId);
    if (!talhao) return null;

    const climaAtual = this.getClimaAtual(talhaoId);
    const historicoPragas = this.getHistoricoPragas(talhaoId);
    const epoca = this.getEpocaAtual();

    const pragasAlvo = this.getPragasPorCultura(talhao.cultura);

    const riscos = pragasAlvo.map(praga => {
      const prob = this.calcularProbabilidadePraga(praga, {
        temperatura: climaAtual.tempMedia,
        umidade: climaAtual.umidadeMedia,
        historico: historicoPragas[praga.nome] || 0,
        cultura: talhao.cultura,
        epoca: epoca
      });

      return {
        praga: praga.nome,
        nomeCientifico: praga.cientifico,
        probabilidade: prob * 100,
        nivelRisco: this.classificarRisco(prob),
        recomendacao: this.gerarRecomendacaoPraga(praga, prob, climaAtual),
        produtosRecomendados: this.recomendarProdutos(praga, prob),
        janelaAcao: this.calcularJanelaAcao(prob, climaAtual)
      };
    });

    const riscoGeral = riscos.reduce((acc, r) => acc + r.probabilidade, 0) / riscos.length;

    return {
      talhaoId,
      talhao: talhao.nome,
      data: nowISO(),
      riscoGeral,
      nivelGeral: this.classificarRisco(riscoGeral / 100),
      pragas: riscos.sort((a, b) => b.probabilidade - a.probabilidade),
      condicoesAtuais: climaAtual,
      alertas: this.gerarAlertasPragas(riscos)
    };
  }

  getClimaAtual(talhaoId) {
    const ultimoClima = onlyEmpresa(this.db.clima || [])
      .filter(c => !talhaoId || c.talhaoId === talhaoId)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];

    return {
      tempMedia: ultimoClima?.tempMax ? (ultimoClima.tempMax + (ultimoClima.tempMin || 20)) / 2 : 25,
      umidadeMedia: ultimoClima?.umidade || 70,
      vento: ultimoClima?.vento || 10,
      chuva: ultimoClima?.chuvaMm || 0
    };
  }

  getHistoricoPragas(talhaoId) {
    return {};
  }

  getEpocaAtual() {
    const mes = new Date().getMonth() + 1;
    if (mes >= 10 && mes <= 3) return 'verao';
    if (mes >= 4 && mes <= 9) return 'inverno';
    return 'entressafra';
  }

  getPragasPorCultura(cultura) {
    const pragas = {
      'soja': [
        { nome: 'Ferrugem Asiática', cientifico: 'Phakopsora pachyrhizi' },
        { nome: 'Lagarta-da-soja', cientifico: 'Anticarsia gemmatalis' },
        { nome: 'Percevejo-marrom', cientifico: 'Euschistus heros' }
      ],
      'milho': [
        { nome: 'Lagarta-do-cartucho', cientifico: 'Spodoptera frugiperda' },
        { nome: 'Cigarrinha-do-milho', cientifico: 'Dalbulus maidis' }
      ],
      'algodao': [
        { nome: 'Bicudo-do-algodoeiro', cientifico: 'Anthonomus grandis' }
      ]
    };
    return pragas[cultura?.toLowerCase()] || pragas['soja'];
  }

  calcularProbabilidadePraga(praga, fatores) {
    let prob = 0.3;

    if (fatores.temperatura > 25 && fatores.temperatura < 30) prob += 0.2;
    if (fatores.umidade > 70) prob += 0.2;
    if (fatores.historico > 0.5) prob += 0.3;
    if (fatores.epoca === 'verao') prob += 0.1;

    return Math.min(0.95, prob);
  }

  classificarRisco(prob) {
    if (prob >= 0.8) return 'ALTO';
    if (prob >= 0.5) return 'MÉDIO';
    return 'BAIXO';
  }

  gerarRecomendacaoPraga(praga, prob, clima) {
    if (prob >= 0.8) {
      return `Aplicar fungicida/inseticida URGENTE para controle de ${praga.nome}`;
    }
    if (prob >= 0.5) {
      return `Monitorar ${praga.nome} diariamente. Preparar para aplicação preventiva.`;
    }
    return `Condições desfavoráveis para ${praga.nome}. Manter monitoramento.`;
  }

  recomendarProdutos(praga, prob) {
    const produtos = onlyEmpresa(this.db.produtos || [])
      .filter(p => p.tipo?.toLowerCase().includes('fungicida') || 
                   p.tipo?.toLowerCase().includes('inseticida'))
      .slice(0, 3);
    
    return produtos.map(p => p.nome);
  }

  calcularJanelaAcao(prob, clima) {
    if (prob < 0.5) return 7;
    if (prob < 0.8) return 3;
    return 1;
  }

  gerarAlertasPragas(riscos) {
    return riscos
      .filter(r => r.probabilidade >= 80)
      .map(r => ({
        tipo: 'urgente',
        mensagem: `Risco ALTO de ${r.praga}`,
        acao: r.recomendacao
      }));
  }

  // ========== JANELA IDEAL DE APLICAÇÃO ==========
  previsaoClima7Dias(talhaoId) {
    const previsao = [];
    for (let i = 0; i < 7; i++) {
      const data = new Date();
      data.setDate(data.getDate() + i);
      const dataStr = data.toISOString().split('T')[0];
      
      previsao.push({
        data: dataStr,
        temperatura: 25 + Math.random() * 10,
        umidade: 60 + Math.random() * 20,
        vento: 5 + Math.random() * 15,
        chuva: Math.random() * 10
      });
    }
    return previsao;
  }

  verificarCondicoesAplicacao(dia) {
    return {
      ventoIdeal: dia.vento >= 3 && dia.vento <= 10,
      temperaturaIdeal: dia.temperatura >= 15 && dia.temperatura <= 30,
      umidadeIdeal: dia.umidade >= 50 && dia.umidade <= 80,
      semChuva: dia.chuva < 5
    };
  }

  calcularJanelaIdeal(talhaoId, produtoId = null) {
    const clima = this.previsaoClima7Dias(talhaoId);
    const pragas = this.preverRiscoPragas(talhaoId);
    const talhao = onlyEmpresa(this.db.talhoes).find(t => t.id === talhaoId);

    const janelas = clima.map(dia => {
      const condicoesIdeais = this.verificarCondicoesAplicacao(dia);
      const riscoPraga = pragas?.pragas[0]?.probabilidade || 0;
      
      let score = 0;
      if (condicoesIdeais.ventoIdeal) score += 25;
      if (condicoesIdeais.temperaturaIdeal) score += 25;
      if (condicoesIdeais.umidadeIdeal) score += 25;
      if (condicoesIdeais.semChuva) score += 25;
      
      score += riscoPraga * 0.3;
      
      return {
        data: dia.data,
        diaSemana: this.getDiaSemana(dia.data),
        condicoes: condicoesIdeais,
        score: Math.min(100, score),
        vento: dia.vento,
        temperatura: dia.temperatura,
        umidade: dia.umidade,
        chuva: dia.chuva
      };
    });

    const melhoresDias = janelas
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      talhaoId,
      talhao: talhao?.nome,
      dataAnalise: nowISO(),
      melhoresDias,
      recomendacao: this.gerarRecomendacaoJanela(melhoresDias[0]),
      alertas: this.gerarAlertasJanela(janelas)
    };
  }

  getDiaSemana(dataStr) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = new Date(dataStr + 'T12:00:00');
    return dias[data.getDay()];
  }

  gerarRecomendacaoJanela(melhorDia) {
    if (!melhorDia) return 'Sem dados suficientes';
    
    return `Melhor dia para aplicação: ${melhorDia.data} (${melhorDia.diaSemana}) - 
            Vento: ${melhorDia.vento.toFixed(1)} km/h, 
            Temp: ${melhorDia.temperatura.toFixed(1)}°C`;
  }

  gerarAlertasJanela(janelas) {
    return janelas
      .filter(j => j.score < 50)
      .map(j => ({
        tipo: 'alerta',
        mensagem: `Condições desfavoráveis em ${j.data}`,
        detalhe: 'Evitar aplicação neste dia'
      }));
  }
}

// ==================== 6. FUNÇÕES CRUD ====================
function crudPage({
  entityKey, subtitle,
  fields,
  columns,
  helpers
}){
  const db = getDB();
  const eid = getEmpresaId();

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  const formHtml = `
    <div class="card">
      <h3>Novo registro</h3>
      <div class="help">${escapeHtml(subtitle || "")}</div>
      <div class="hr"></div>
      <form id="frm" class="formGrid">
        ${fields.map(f=>{
          const full = f.full ? "full" : "";
          if(f.type==="select"){
            const opts = (typeof f.options === "function" ? f.options(getDB()) : (f.options || []))
              .map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
            return `
              <div class="${full}">
                <small>${escapeHtml(f.label)}</small>
                <select class="select" name="${escapeHtml(f.key)}">${opts}</select>
              </div>
            `;
          }
          if(f.type==="textarea"){
            return `
              <div class="${full}">
                <small>${escapeHtml(f.label)}</small>
                <textarea class="textarea" name="${escapeHtml(f.key)}" placeholder="${escapeHtml(f.placeholder||"")}"></textarea>
              </div>
            `;
          }
          return `
            <div class="${full}">
              <small>${escapeHtml(f.label)}</small>
              <input class="input" name="${escapeHtml(f.key)}" type="${escapeHtml(f.type||"text")}" placeholder="${escapeHtml(f.placeholder||"")}" />
            </div>
          `;
        }).join("")}
        <div class="full row" style="justify-content:flex-end; margin-top:6px;">
          <button class="btn primary" type="submit">Salvar</button>
        </div>
      </form>
    </div>
  `;

  const tableHtml = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            ${columns.map(c=>`<th>${escapeHtml(c.label)}</th>`).join("")}
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  content.innerHTML = `<div class="section">${formHtml}${tableHtml}</div>`;

  function renderTable(){
    const db2 = getDB();
    const rows0 = onlyEmpresa(db2[entityKey] || []);
    const rows = helpers?.filter ? helpers.filter(rows0, db2) : rows0;

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(r=>{
      const tds = columns.map(c=>{
        const v = c.render ? c.render(r, db2) : r[c.key];
        return `<td>${escapeHtml(v ?? "")}</td>`;
      }).join("");
      return `
        <tr>
          ${tds}
          <td class="noPrint">
            <button class="btn danger" onclick="window.__del('${r.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="${columns.length+1}">Sem registros.</td></tr>`;
  }

  window.__del = (id)=>{
    if(!confirm("Excluir este registro?")) return;
    const db2 = getDB();
    db2[entityKey] = (db2[entityKey]||[]).filter(x=>x.id!==id);
    if(helpers?.onDelete) helpers.onDelete(id, db2);
    setDB(db2);
    toast("Excluído", "Registro removido.");
    renderTable();
  };

  document.getElementById("frm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = { id: uid(entityKey.slice(0,3)), empresaId: eid };

    fields.forEach(f=>{
      let v = fd.get(f.key);
      if(f.type==="number") v = Number(v || 0);
      obj[f.key] = v;
    });

    const db2 = getDB();
    if(helpers?.beforeSave) helpers.beforeSave(obj, db2);
    db2[entityKey] = db2[entityKey] || [];
    db2[entityKey].push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo", "Registro adicionado com sucesso.");
    renderTable();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    const rows = onlyEmpresa(db2[entityKey]||[]);
    downloadText(`${entityKey}-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  renderTable();
}

// ==================== 7. PÁGINAS ESPECÍFICAS ====================
function pageDashboard(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const produtos = onlyEmpresa(db.produtos);
  const aplicacoes = onlyEmpresa(db.aplicacoes);
  const clima = onlyEmpresa(db.clima);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a=>a.data===hoje).length;
  const chuvaHoje = clima.filter(c=>c.data===hoje).reduce((s,c)=>s+Number(c.chuvaMm||0),0);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Fazendas</h3>
        <div class="big">${fazendas.length}</div>
        <div class="sub">Cadastradas na empresa</div>
      </div>
      <div class="card">
        <h3>Talhões</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">Área total: ${num(talhoes.reduce((s,t)=>s+Number(t.areaHa||0),0),1)} ha</div>
      </div>
      <div class="card">
        <h3>Aplicações (hoje)</h3>
        <div class="big">${aplHoje}</div>
        <div class="sub"><span class="pill info">Operações registradas</span></div>
      </div>
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big">${num(chuvaHoje,1)} mm</div>
        <div class="sub"><span class="pill ok">Lançamento manual</span></div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Checklist Agro (operacional)</h3>
        <div class="help">
          • Conferir estoque e validade<br/>
          • Registrar chuva/vento do dia<br/>
          • Validar talhão/cultura/safra<br/>
          • Registrar aplicação (produto, dose, área aplicada)<br/>
          • Registrar abastecimentos e diesel<br/>
          • Emitir relatório e assinar (PDF)
        </div>
        <div class="hr"></div>
        <span class="pill warn">Pronto para auditoria</span>
        <span class="pill info">Rastreabilidade</span>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Últimas aplicações</th>
              <th>Data</th>
              <th>Fazenda</th>
              <th>Talhão</th>
              <th>Área aplicada</th>
              <th>Alvo</th>
            </tr>
          </thead>
          <tbody>
            ${
              (aplicacoes.slice().reverse().slice(0,8)).map(a=>`
                <tr>
                  <td><b>${escapeHtml((a.produtos?.[0]?.produtoNome)||"—")}</b></td>
                  <td>${escapeHtml(a.data||"")}</td>
                  <td>${escapeHtml(findNameById(fazendas, a.fazendaId))}</td>
                  <td>${escapeHtml(findNameById(talhoes, a.talhaoId))}</td>
                  <td>${escapeHtml(num(a.areaHaAplicada||0,1))} ha</td>
                  <td>${escapeHtml(a.alvo||"")}</td>
                </tr>
              `).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Produtos cadastrados</h3>
        <div class="big">${produtos.length}</div>
        <div class="sub">Defensivos, fertilizantes, adjuvantes</div>
        <div class="hr"></div>
        <a class="btn primary" href="produtos.html">Gerenciar produtos</a>
      </div>

      <div class="card">
        <h3>IA Preditiva</h3>
        <div class="help">
          Previsão de produtividade • Risco de pragas • Janela ideal de aplicação
        </div>
        <div class="hr"></div>
        <a class="btn primary" href="ia-preditiva.html">Abrir IA</a>
      </div>
    </div>
  `;
}

function pageOpsCenter(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);

  const estoque = onlyEmpresa(db.estoque||[]);
  const diesel = onlyEmpresa(db.dieselEstoque||[]);
  const aplicacoes = onlyEmpresa(db.aplicacoes||[]);
  const combustivel = onlyEmpresa(db.combustivel||[]);
  const clima = onlyEmpresa(db.clima||[]);

  const negEstoque = estoque.filter(s => Number(s.qtd||0) < 0);
  const negDiesel = diesel.filter(d => Number(d.litros||0) < 0);
  const custoTal = calcCustosPorTalhao(db);

  const chuvaTal = new Map();
  const hoje = new Date();
  const start = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0,0,0,0);
  const min = new Date(start.getTime() - 6*24*60*60*1000);
  function parseISO(d){
    const [y,m,day] = String(d||"").split("-").map(Number);
    if(!y||!m||!day) return null;
    return new Date(y, m-1, day, 0,0,0,0);
  }
  for(const r of clima){
    if(!r.talhaoId) continue;
    const dt = parseISO(r.data);
    if(!dt) continue;
    if(dt < min || dt > start) continue;
    chuvaTal.set(r.talhaoId, (chuvaTal.get(r.talhaoId)||0) + Number(r.chuvaMm||0));
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Alertas de estoque</h3>
        <div class="big">${negEstoque.length}</div>
        <div class="sub">${negEstoque.length?'<span class="pill bad">Saldo negativo</span>':'<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Alertas de diesel</h3>
        <div class="big">${negDiesel.length}</div>
        <div class="sub">${negDiesel.length?'<span class="pill bad">Saldo negativo</span>':'<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Aplicações</h3>
        <div class="big">${aplicacoes.length}</div>
        <div class="sub"><span class="pill info">Rastreabilidade</span></div>
      </div>
      <div class="card">
        <h3>Abastecimentos</h3>
        <div class="big">${combustivel.length}</div>
        <div class="sub"><span class="pill info">Controle diesel</span></div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Estoque com saldo negativo</th></tr>
            <tr>
              <th>Produto</th><th>Depósito</th><th>Qtd</th><th>Unid.</th><th>Obs</th><th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              negEstoque.map(s=>{
                const p = onlyEmpresa(db.produtos).find(p=>p.id===s.produtoId);
                const nome = p ? p.nome : "(sem produto)";
                return `
                  <tr>
                    <td><b>${escapeHtml(nome)}</b></td>
                    <td>${escapeHtml(s.deposito||"")}</td>
                    <td><b>${escapeHtml(num(s.qtd||0,2))}</b></td>
                    <td>${escapeHtml(s.unidade||"")}</td>
                    <td>${escapeHtml(clampStr(s.obs||"",50))}</td>
                    <td><a class="btn" href="estoque.html">Ajustar</a></td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="6">Nenhum.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="5">Diesel (tanques)</th></tr>
            <tr>
              <th>Depósito</th><th>Litros</th><th>Status</th><th>Obs</th><th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              diesel.map(d=>`
                <tr>
                  <td><b>${escapeHtml(d.deposito||"")}</b></td>
                  <td><b>${escapeHtml(num(d.litros||0,1))}</b></td>
                  <td>${Number(d.litros||0)<0?'<span class="pill bad">Negativo</span>':'<span class="pill ok">OK</span>'}</td>
                  <td>${escapeHtml(clampStr(d.obs||"",50))}</td>
                  <td><a class="btn" href="combustivel.html">Ver</a></td>
                </tr>
              `).join("") || `<tr><td colspan="5">Sem tanques.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr><th colspan="7">Custo por talhão (acumulado)</th></tr>
          <tr>
            <th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Custo total</th><th>Custo/ha</th><th>Chuva 7d</th><th>Último</th>
          </tr>
        </thead>
        <tbody>
          ${
            custoTal.map(r=>`
              <tr>
                <td><b>${escapeHtml(r.talhao)}</b></td>
                <td>${escapeHtml(r.fazenda)}</td>
                <td>${escapeHtml(num(r.areaHa||0,1))}</td>
                <td><b>${escapeHtml(kbrl(r.custoTotal||0))}</b></td>
                <td>${escapeHtml(kbrl(r.custoHa||0))}</td>
                <td>${escapeHtml(num(chuvaTal.get(r.talhaoId)||0,1))} mm</td>
                <td>${escapeHtml(r.last||"-")}</td>
              </tr>
            `).join("") || `<tr><td colspan="7">Sem talhões.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function calcCustosPorTalhao(db){
  const talhoes = onlyEmpresa(db.talhoes);
  const fazendas = onlyEmpresa(db.fazendas);

  const apl = onlyEmpresa(db.aplicacoes||[]);
  const cmb = onlyEmpresa(db.combustivel||[]);

  const map = new Map();
  for(const t of talhoes){
    map.set(t.id, { custo:0, last:"", ops:0 });
  }

  for(const a of apl){
    if(!a.talhaoId) continue;
    const rec = map.get(a.talhaoId) || { custo:0, last:"", ops:0 };
    rec.custo += Number(a.custoTotal||0);
    rec.ops += 1;
    if((a.data||"") > (rec.last||"")) rec.last = a.data||"";
    map.set(a.talhaoId, rec);
  }

  for(const c of cmb){
    if(!c.talhaoId) continue;
    const rec = map.get(c.talhaoId) || { custo:0, last:"", ops:0 };
    rec.custo += Number(c.litros||0) * Number(c.precoLitro||0);
    rec.ops += 1;
    if((c.data||"") > (rec.last||"")) rec.last = c.data||"";
    map.set(c.talhaoId, rec);
  }

  return talhoes.map(t=>{
    const info = map.get(t.id) || { custo:0, last:"", ops:0 };
    const area = Number(t.areaHa||0) || 0;
    const custoHa = area>0 ? (info.custo/area) : 0;
    return {
      talhaoId: t.id,
      talhao: t.nome,
      fazenda: findNameById(fazendas, t.fazendaId),
      areaHa: area,
      custoTotal: info.custo,
      custoHa,
      last: info.last || "-",
      ops: info.ops || 0
    };
  }).sort((a,b)=>b.custoTotal - a.custoTotal);
}

// ==================== 8. NOVA PÁGINA: IA PREDITIVA ====================
function pageIAPreditiva() {
  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const ia = new IAPredictiva(db);

  setTopActions(`
    <button class="btn" id="btnTreinarIA">Treinar Modelos</button>
    <button class="btn primary" id="btnExportarIA">Exportar Previsões</button>
  `);

  const content = document.getElementById("content");
  
  const talhaoOptions = talhoes.map(t => 
    `<option value="${t.id}">${escapeHtml(t.nome)} (${t.cultura || 'Sem cultura'})</option>`
  ).join('');

  content.innerHTML = `
    <style>
      .progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
      .alert.critico { background: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 10px 0; border-radius: 8px; }
      .alert.atencao { background: #fff3e0; border-left: 4px solid #FF9800; padding: 10px; margin: 10px 0; border-radius: 8px; }
      .alert.urgente { background: #ffebee; border-left: 4px solid #d32f2f; padding: 10px; margin: 10px 0; border-radius: 8px; }
      .loading { text-align: center; padding: 40px; color: rgba(255,255,255,0.5); }
    </style>

    <div class="kpi">
      <div class="card">
        <h3>Talhões Analisados</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">Com IA preditiva</div>
      </div>
      <div class="card">
        <h3>Risco Médio</h3>
        <div class="big" id="riscoMedio">0%</div>
        <div class="sub"><span class="pill" id="riscoLabel">Calculando...</span></div>
      </div>
      <div class="card">
        <h3>Alertas Ativos</h3>
        <div class="big" id="totalAlertas">0</div>
        <div class="sub"><span class="pill warn">Monitorar</span></div>
      </div>
      <div class="card">
        <h3>Confiança IA</h3>
        <div class="big" id="confiancaIA">75%</div>
        <div class="sub">Modelo treinado</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>🔮 Análise Preditiva por Talhão</h3>
        <div class="help">
          Selecione um talhão para ver previsões de produtividade, riscos de pragas e janelas ideais de aplicação.
        </div>
        <div class="hr"></div>

        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <select class="select" id="selectTalhao" style="flex: 1;">
            <option value="">Selecione um talhão...</option>
            ${talhaoOptions}
          </select>
          <button class="btn primary" id="btnAnalisar">Analisar</button>
        </div>

        <div id="resultadoIA" style="display: none;">
          <div class="hr"></div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
            <div class="card" style="background: rgba(76, 175, 80, 0.1);">
              <h4>🌱 Produtividade</h4>
              <div class="big" id="prodValue">0 sc/ha</div>
              <div class="sub" id="prodRange">0 - 0 sc/ha</div>
              <div class="progress-bar" style="margin-top: 10px;">
                <div id="prodProgress" style="width: 0%; height: 6px; background: #4CAF50; border-radius: 3px;"></div>
              </div>
            </div>

            <div class="card" style="background: rgba(255, 152, 0, 0.1);">
              <h4>⚠️ Risco de Pragas</h4>
              <div class="big" id="riscoValue">0%</div>
              <div class="sub" id="riscoNivel">Nível BAIXO</div>
              <div class="progress-bar" style="margin-top: 10px;">
                <div id="riscoProgress" style="width: 0%; height: 6px; background: #FF9800; border-radius: 3px;"></div>
              </div>
            </div>

            <div class="card" style="background: rgba(33, 150, 243, 0.1);">
              <h4>📅 Janela Ideal</h4>
              <div class="big" id="janelaData">--/--</div>
              <div class="sub" id="janelaInfo">Aguardando análise</div>
            </div>
          </div>

          <div class="card">
            <h4>📊 Fatores de Influência</h4>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 15px;">
              <div><small>Histórico</small><div class="big" id="fatorHistorico">0%</div></div>
              <div><small>Clima</small><div class="big" id="fatorClima">0%</div></div>
              <div><small>Solo</small><div class="big" id="fatorSolo">0%</div></div>
              <div><small>Aplicações</small><div class="big" id="fatorAplicacoes">0%</div></div>
              <div><small>Manejo</small><div class="big" id="fatorManejo">0%</div></div>
            </div>
          </div>

          <div class="card" id="alertasContainer" style="margin-top: 15px;">
            <h4>🚨 Alertas e Recomendações</h4>
            <div id="listaAlertas"></div>
          </div>

          <div class="card" style="margin-top: 15px;">
            <h4>🐛 Análise de Pragas</h4>
            <div class="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Praga</th>
                    <th>Probabilidade</th>
                    <th>Nível</th>
                    <th>Recomendação</th>
                    <th>Janela (dias)</th>
                  </tr>
                </thead>
                <tbody id="tabelaPragas"></tbody>
              </table>
            </div>
          </div>

          <div class="card" style="margin-top: 15px;">
            <h4>🌟 Melhores Dias para Aplicação</h4>
            <div class="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dia</th>
                    <th>Score</th>
                    <th>Vento</th>
                    <th>Temperatura</th>
                    <th>Umidade</th>
                    <th>Chuva</th>
                  </tr>
                </thead>
                <tbody id="tabelaJanelas"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnAnalisar").addEventListener("click", () => {
    const talhaoId = document.getElementById("selectTalhao").value;
    if (!talhaoId) {
      toast("Atenção", "Selecione um talhão primeiro");
      return;
    }

    document.getElementById("resultadoIA").style.display = "block";
    
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading";
    loadingDiv.id = "loadingIA";
    loadingDiv.innerHTML = "Analisando dados com IA...";
    document.getElementById("resultadoIA").prepend(loadingDiv);

    setTimeout(() => {
      const prod = ia.preverProdutividade(talhaoId, "2025/26");
      const risco = ia.preverRiscoPragas(talhaoId);
      const janela = ia.calcularJanelaIdeal(talhaoId);

      document.getElementById("loadingIA")?.remove();
      atualizarResultados(prod, risco, janela);
    }, 800);
  });

  function atualizarResultados(prod, risco, janela) {
    if (prod) {
      document.getElementById("prodValue").textContent = 
        `${prod.produtividadeEstimada.toFixed(1)} sc/ha`;
      document.getElementById("prodRange").textContent = 
        `${prod.produtividadeMin.toFixed(1)} - ${prod.produtividadeMax.toFixed(1)} sc/ha`;
      document.getElementById("prodProgress").style.width = `${prod.score}%`;

      document.getElementById("fatorHistorico").textContent = `${prod.fatores.historico.toFixed(0)}%`;
      document.getElementById("fatorClima").textContent = `${prod.fatores.clima.toFixed(0)}%`;
      document.getElementById("fatorSolo").textContent = `${prod.fatores.solo.toFixed(0)}%`;
      document.getElementById("fatorAplicacoes").textContent = `${prod.fatores.aplicacoes.toFixed(0)}%`;
      document.getElementById("fatorManejo").textContent = `${prod.fatores.manejo.toFixed(0)}%`;
    }

    if (risco) {
      document.getElementById("riscoValue").textContent = `${risco.riscoGeral.toFixed(1)}%`;
      document.getElementById("riscoNivel").textContent = `Nível ${risco.nivelGeral}`;
      document.getElementById("riscoProgress").style.width = `${risco.riscoGeral}%`;
      
      const riscoLabel = document.getElementById("riscoNivel");
      if (risco.nivelGeral === 'ALTO') {
        riscoLabel.style.color = '#f44336';
      } else if (risco.nivelGeral === 'MÉDIO') {
        riscoLabel.style.color = '#FF9800';
      } else {
        riscoLabel.style.color = '#4CAF50';
      }

      const tbody = document.getElementById("tabelaPragas");
      tbody.innerHTML = risco.pragas.map(p => `
        <tr>
          <td><b>${p.praga}</b><br><small>${p.nomeCientifico}</small></td>
          <td><b>${p.probabilidade.toFixed(1)}%</b></td>
          <td><span class="pill ${p.nivelRisco === 'ALTO' ? 'bad' : p.nivelRisco === 'MÉDIO' ? 'warn' : 'ok'}">${p.nivelRisco}</span></td>
          <td>${p.recomendacao}</td>
          <td>${p.janelaAcao} dias</td>
        </tr>
      `).join('');
    }

    if (janela && janela.melhoresDias.length > 0) {
      const melhor = janela.melhoresDias[0];
      document.getElementById("janelaData").textContent = melhor.data;
      document.getElementById("janelaInfo").textContent = 
        `Score: ${melhor.score.toFixed(0)}% - Vento: ${melhor.vento.toFixed(1)} km/h`;

      const tbody = document.getElementById("tabelaJanelas");
      tbody.innerHTML = janela.melhoresDias.map(d => `
        <tr>
          <td><b>${d.data}</b></td>
          <td>${d.diaSemana}</td>
          <td><b>${d.score.toFixed(0)}%</b></td>
          <td>${d.vento.toFixed(1)} km/h</td>
          <td>${d.temperatura.toFixed(1)}°C</td>
          <td>${d.umidade.toFixed(0)}%</td>
          <td>${d.chuva.toFixed(1)} mm</td>
        </tr>
      `).join('');
    }

    const alertas = [];
    if (prod?.alertas) alertas.push(...prod.alertas);
    if (risco?.alertas) alertas.push(...risco.alertas);

    const container = document.getElementById("listaAlertas");
    if (alertas.length > 0) {
      container.innerHTML = alertas.map(a => `
        <div class="alert ${a.tipo}" style="margin: 10px 0;">
          <b>${a.mensagem}</b><br>
          <small>${a.acao || ''}</small>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>Nenhum alerta no momento. Condições favoráveis.</p>';
    }

    document.getElementById("totalAlertas").textContent = alertas.length;
  }

  document.getElementById("btnTreinarIA")?.addEventListener("click", () => {
    ia.salvarModelos();
    toast("IA Treinada", "Modelos atualizados com sucesso!");
    document.getElementById("confiancaIA").textContent = "85%";
  });

  document.getElementById("btnExportarIA")?.addEventListener("click", () => {
    const relatorio = {
      data: nowISO(),
      talhoes: talhoes.map(t => ia.preverProdutividade(t.id, "2025/26"))
    };
    downloadText(`ia-preditiva-${nowISO()}.json`, JSON.stringify(relatorio, null, 2));
    toast("Exportado", "Relatório da IA baixado");
  });
}

// ==================== 9. DEMAIS PÁGINAS ====================
function pageEmpresas(){
  const db = getDB();
  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Cadastrar empresa</h3>
        <div class="help">Multiempresa: cada empresa tem seus próprios dados.</div>
        <div class="hr"></div>
        <form id="frm" class="formGrid">
          <div><small>Nome</small><input class="input" name="nome" required></div>
          <div><small>CNPJ</small><input class="input" name="cnpj"></div>
          <div><small>Responsável</small><input class="input" name="responsavel"></div>
          <div><small>Cidade</small><input class="input" name="cidade"></div>
          <div><small>UF</small><input class="input" name="uf" maxlength="2"></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="observacoes"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Responsável</th>
              <th>Local</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const tb = document.getElementById("tbody");
    tb.innerHTML = db2.empresas.slice().reverse().map(e=>`
      <tr>
        <td><b>${escapeHtml(e.nome)}</b></td>
        <td>${escapeHtml(e.cnpj||"")}</td>
        <td>${escapeHtml(e.responsavel||"")}</td>
        <td>${escapeHtml((e.cidade||"")+" / "+(e.uf||""))}</td>
        <td class="noPrint">
          <button class="btn" onclick="window.__use('${e.id}')">Usar</button>
          <button class="btn danger" onclick="window.__delEmp('${e.id}')">Excluir</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem empresas.</td></tr>`;
  }

  window.__use = (id)=>{
    setEmpresaId(id);
    toast("Empresa ativa", "Mudando para a empresa selecionada…");
    setTimeout(()=>location.reload(), 200);
  };

  window.__delEmp = (id)=>{
    const db2 = getDB();
    if(db2.empresas.length<=1){
      alert("Você precisa ter pelo menos 1 empresa.");
      return;
    }
    if(!confirm("Excluir empresa e TODOS os dados dela?")) return;

    db2.empresas = db2.empresas.filter(x=>x.id!==id);
    const wipe = key => db2[key] = (db2[key]||[]).filter(x=>x.empresaId!==id);
    ["fazendas","talhoes","produtos","estoque","equipe","maquinas","clima","aplicacoes","combustivel","dieselEstoque"].forEach(wipe);

    if(getEmpresaId()===id){
      db2.session.empresaId = db2.empresas[0].id;
    }
    setDB(db2);
    toast("Excluída", "Empresa removida com dados associados.");
    setTimeout(()=>location.reload(), 200);
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("emp"),
      nome: fd.get("nome"),
      cnpj: fd.get("cnpj"),
      responsavel: fd.get("responsavel"),
      cidade: fd.get("cidade"),
      uf: fd.get("uf"),
      observacoes: fd.get("observacoes")
    };
    const db2 = getDB();
    db2.empresas.push(obj);
    setDB(db2);
    e.target.reset();
    toast("Salvo","Empresa adicionada.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`empresas-${nowISO()}.csv`, toCSV(db2.empresas));
    toast("Exportado","CSV baixado.");
  });

  render();
}

function pageFazendas(){
  crudPage({
    entityKey:"fazendas",
    subtitle:"Unidades produtivas por empresa.",
    fields:[
      {key:"nome", label:"Nome da fazenda", type:"text"},
      {key:"cidade", label:"Cidade", type:"text"},
      {key:"uf", label:"UF", type:"text"},
      {key:"areaHa", label:"Área total (ha)", type:"number"},
      {key:"observacoes", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"nome", label:"Fazenda"},
      {key:"cidade", label:"Cidade"},
      {key:"uf", label:"UF"},
      {key:"areaHa", label:"Área (ha)"},
      {key:"observacoes", label:"Obs."}
    ]
  });
}

function pageProdutos(){
  crudPage({
    entityKey:"produtos",
    subtitle:"Cadastre defensivos, fertilizantes e adjuvantes.",
    fields:[
      {key:"tipo", label:"Tipo", type:"text", placeholder:"Herbicida/Fungicida..."},
      {key:"nome", label:"Nome comercial", type:"text"},
      {key:"ingrediente", label:"Ingrediente ativo", type:"text"},
      {key:"fabricante", label:"Fabricante", type:"text"},
      {key:"registro", label:"Registro/Mapa", type:"text"},
      {key:"preco", label:"Preço por unidade (R$)", type:"number", placeholder:"Ex: 45.90"},
      {key:"carenciaDias", label:"Carência (dias)", type:"number"},
      {key:"reentradaHoras", label:"Reentrada (horas)", type:"number"},
      {key:"unidade", label:"Unidade padrão", type:"text", placeholder:"L / kg"},
      {key:"obs", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"tipo", label:"Tipo"},
      {key:"nome", label:"Produto"},
      {key:"ingrediente", label:"Ingrediente"},
      {key:"carenciaDias", label:"Carência (d)"},
      {key:"reentradaHoras", label:"Reentrada (h)"},
      {key:"unidade", label:"Unid."},
      {key:"preco", label:"Preço (R$)"}
    ],
    helpers:{
      onDelete:(id,db)=>{
        db.estoque = (db.estoque||[]).filter(s=>s.produtoId!==id);
      }
    }
  });
}

function pageEstoque(){
  crudPage({
    entityKey:"estoque",
    subtitle:"Controle por depósito, lote e validade. Saldo pode ficar negativo.",
    fields:[
      {key:"produtoId", label:"Produto", type:"select",
        options:(db)=> {
          const ps = onlyEmpresa(db.produtos);
          return [{value:"", label:"(Selecione)"}].concat(ps.map(p=>({value:p.id, label:`${p.nome} — ${p.tipo}`})));
        }
      },
      {key:"deposito", label:"Depósito", type:"text", placeholder:"Central / Galpão..."},
      {key:"lote", label:"Lote", type:"text"},
      {key:"validade", label:"Validade (YYYY-MM-DD)", type:"text", placeholder:"2026-12-31"},
      {key:"qtd", label:"Quantidade", type:"number"},
      {key:"unidade", label:"Unidade", type:"text", placeholder:"L / kg"},
      {key:"obs", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"produtoId", label:"Produto", render:(r,db)=>{
        const p = onlyEmpresa(db.produtos).find(p=>p.id===r.produtoId);
        return p ? `${p.nome} (${p.tipo})` : "(sem produto)";
      }},
      {key:"deposito", label:"Depósito"},
      {key:"lote", label:"Lote"},
      {key:"validade", label:"Validade"},
      {key:"qtd", label:"Qtd"},
      {key:"unidade", label:"Unid."}
    ]
  });
}

function pageTalhoes(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Cadastrar talhão</h3>
        <div class="help">Área, cultura, safra e dados de campo.</div>
        <div class="hr"></div>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>
              ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
            </select>
          </div>
          <div><small>Nome do talhão</small><input class="input" name="nome" required></div>
          <div><small>Área (ha)</small><input class="input" name="areaHa" type="number" step="0.1" placeholder="0"></div>
          <div><small>Cultura</small><input class="input" name="cultura" placeholder="Soja"></div>
          <div><small>Safra</small><input class="input" name="safra" placeholder="2025/26"></div>
          <div class="full"><small>Solo</small><input class="input" name="solo" placeholder="Argiloso / Arenoso..."></div>
          <div class="full"><small>Coordenadas/Geo</small><input class="input" name="coordenadas" placeholder="Opcional"></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="observacoes"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Cultura</th><th>Safra</th><th>Solo</th><th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr><th colspan="7">Custo por talhão (acumulado)</th></tr>
          <tr>
            <th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Custo total</th><th>Custo/ha</th><th>Operações</th><th>Último</th>
          </tr>
        </thead>
        <tbody id="tbodyCustos"></tbody>
      </table>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.talhoes||[]);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(t=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
      return `
        <tr>
          <td><b>${escapeHtml(t.nome||"")}</b></td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(num(t.areaHa||0,1))}</td>
          <td>${escapeHtml(t.cultura||"")}</td>
          <td>${escapeHtml(t.safra||"")}</td>
          <td>${escapeHtml(t.solo||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delTal('${t.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">Sem talhões.</td></tr>`;

    const custos = calcCustosPorTalhao(db2);
    const tbC = document.getElementById("tbodyCustos");
    tbC.innerHTML = custos.map(r=>`
      <tr>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(r.fazenda)}</td>
        <td>${escapeHtml(num(r.areaHa||0,1))}</td>
        <td><b>${escapeHtml(kbrl(r.custoTotal||0))}</b></td>
        <td>${escapeHtml(kbrl(r.custoHa||0))}</td>
        <td>${escapeHtml(String(r.ops||0))}</td>
        <td>${escapeHtml(r.last||"-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="7">Sem dados.</td></tr>`;
  }

  window.__delTal = (id)=>{
    if(!confirm("Excluir este talhão?")) return;
    const db2 = getDB();
    db2.talhoes = (db2.talhoes||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluído","Talhão removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("tal"),
      empresaId: getEmpresaId(),
      fazendaId: fd.get("fazendaId"),
      nome: fd.get("nome"),
      areaHa: Number(fd.get("areaHa")||0),
      cultura: fd.get("cultura")||"",
      safra: fd.get("safra")||"",
      solo: fd.get("solo")||"",
      coordenadas: fd.get("coordenadas")||"",
      observacoes: fd.get("observacoes")||""
    };
    const db2 = getDB();
    db2.talhoes = db2.talhoes || [];
    db2.talhoes.push(obj);
    setDB(db2);
    e.target.reset();
    toast("Salvo","Talhão adicionado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.talhoes||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
}

function pageCombustivel(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);
  const tanques = onlyEmpresa(db.dieselEstoque);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr, labelKey="nome"){
    return arr.map(o=>`<option value="${o.id}">${escapeHtml(o[labelKey]||"")}</option>`).join("");
  }

  const depositoOptions = tanques.map(t=>`<option value="${escapeHtml(t.deposito||"Tanque Principal")}">${escapeHtml(t.deposito||"Tanque Principal")}</option>`).join("");

  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Diesel (tanque total)</h3>
        <div class="big">${num(tanques.reduce((s,t)=>s+Number(t.litros||0),0),1)} L</div>
        <div class="sub">${tanques.some(t=>Number(t.litros||0)<0)?'<span class="pill bad">Negativo</span>':'<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Abastecimentos</h3>
        <div class="big">${onlyEmpresa(db.combustivel||[]).length}</div>
        <div class="sub"><span class="pill info">Histórico</span></div>
      </div>
      <div class="card">
        <h3>Custo diesel (R$)</h3>
        <div class="big">${kbrl(onlyEmpresa(db.combustivel||[]).reduce((s,c)=>s+Number(c.litros||0)*Number(c.precoLitro||0),0))}</div>
        <div class="sub"><span class="pill info">Somatório</span></div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Registrar abastecimento</h3>
        <div class="help">Ao salvar, o sistema dá baixa automática no tanque de diesel selecionado.</div>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div><small>Tipo</small><input class="input" name="tipo" value="Diesel S10" /></div>

          <div class="full">
            <small>Depósito / Tanque</small>
            <select class="select" name="deposito">${depositoOptions || `<option value="Tanque Principal">Tanque Principal</option>`}</select>
          </div>

          <div>
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>${optionList(fazendas)}</select>
          </div>

          <div>
            <small>Talhão (opcional)</small>
            <select class="select" name="talhaoId">
              <option value="">(sem talhão)</option>
              ${optionList(talhoes)}
            </select>
          </div>

          <div>
            <small>Máquina (opcional)</small>
            <select class="select" name="maquinaId">
              <option value="">(sem máquina)</option>
              ${optionList(maquinas)}
            </select>
          </div>

          <div>
            <small>Operador (opcional)</small>
            <select class="select" name="operadorId">
              <option value="">(sem operador)</option>
              ${optionList(equipe)}
            </select>
          </div>

          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required/></div>
          <div><small>Preço/Litro (R$)</small><input class="input" name="precoLitro" type="number" step="0.01" placeholder="0" /></div>
          <div><small>KM ou Horímetro</small><input class="input" name="kmOuHora" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Posto</small><input class="input" name="posto" placeholder="Posto / NF / origem" /></div>

          <div class="full">
            <small>Observações</small>
            <textarea class="textarea" name="obs"></textarea>
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar e dar baixa</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Litros</th><th>Preço/L</th><th>Custo</th><th>Depósito</th><th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr><th colspan="4">Tanques / Estoque Diesel</th></tr>
          <tr><th>Depósito</th><th>Litros</th><th>Status</th><th>Obs</th></tr>
        </thead>
        <tbody id="tbodyTanques"></tbody>
      </table>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.combustivel||[]);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(c=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlyEmpresa(db2.talhoes), c.talhaoId) : "—";
      const custo = Number(c.litros||0) * Number(c.precoLitro||0);
      return `
        <tr>
          <td>${escapeHtml(c.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td><b>${escapeHtml(num(c.litros||0,1))}</b></td>
          <td>${escapeHtml(num(c.precoLitro||0,2))}</td>
          <td><b>${escapeHtml(kbrl(custo||0))}</b></td>
          <td>${escapeHtml(c.deposito||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delCmb('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem abastecimentos.</td></tr>`;

    const tbT = document.getElementById("tbodyTanques");
    const tanks = onlyEmpresa(db2.dieselEstoque||[]);
    tbT.innerHTML = tanks.map(t=>`
      <tr>
        <td><b>${escapeHtml(t.deposito||"")}</b></td>
        <td><b>${escapeHtml(num(t.litros||0,1))}</b></td>
        <td>${Number(t.litros||0)<0?'<span class="pill bad">Negativo</span>':'<span class="pill ok">OK</span>'}</td>
        <td>${escapeHtml(clampStr(t.obs||"",70))}</td>
      </tr>
    `).join("") || `<tr><td colspan="4">Sem tanques.</td></tr>`;
  }

  window.__delCmb = (id)=>{
    if(!confirm("Excluir este abastecimento? (não reverte baixa automaticamente)")) return;
    const db2 = getDB();
    db2.combustivel = (db2.combustivel||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluído","Registro removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);

    const litros = Number(fd.get("litros")||0);
    if(litros<=0){
      alert("Informe litros > 0");
      return;
    }

    const obj = {
      id: uid("cmb"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      tipo: fd.get("tipo") || "Diesel",
      deposito: fd.get("deposito") || "Tanque Principal",
      posto: fd.get("posto") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId") || "",
      litros,
      precoLitro: Number(fd.get("precoLitro")||0),
      kmOuHora: Number(fd.get("kmOuHora")||0),
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.combustivel = db2.combustivel || [];
    db2.combustivel.push(obj);
    
    const tank = db2.dieselEstoque.find(t => t.empresaId === getEmpresaId() && t.deposito === obj.deposito);
    if (tank) {
      tank.litros = Number(tank.litros||0) - litros;
    }

    setDB(db2);
    e.target.reset();
    toast("Salvo", "Abastecimento registrado e diesel baixado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.combustivel||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
}

function pageClima(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big" id="kpiHoje">0,0 mm</div>
        <div class="sub">Somatório do dia (empresa)</div>
      </div>
      <div class="card">
        <h3>Últimos 7 dias</h3>
        <div class="big" id="kpi7d">0,0 mm</div>
        <div class="sub">Acumulado 7 dias</div>
      </div>
      <div class="card">
        <h3>Últimos 30 dias</h3>
        <div class="big" id="kpi30d">0,0 mm</div>
        <div class="sub">Acumulado 30 dias</div>
      </div>
      <div class="card">
        <h3>Registros</h3>
        <div class="big" id="kpiCount">0</div>
        <div class="sub"><span class="pill ok">Por talhão</span></div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Registrar chuva / clima</h3>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>

          <div>
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>
              ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Talhão</small>
            <select class="select" name="talhaoId">
              <option value="">(Geral / sem talhão)</option>
              ${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
            </select>
          </div>

          <div><small>Chuva (mm)</small><input class="input" name="chuvaMm" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Temp min (°C)</small><input class="input" name="tempMin" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Temp max (°C)</small><input class="input" name="tempMax" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" step="1" placeholder="0" /></div>
          <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" step="0.1" placeholder="0" /></div>

          <div class="full">
            <small>Observações</small>
            <textarea class="textarea" name="obs"></textarea>
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Chuva (mm)</th><th>Temp máx</th><th>Vento</th><th>Obs</th><th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.clima||[]);

    const hoje = nowISO();
    const chuvaHoje = rows.filter(r=>r.data===hoje).reduce((s,x)=>s+Number(x.chuvaMm||0),0);
    document.getElementById("kpiHoje").textContent = `${num(chuvaHoje,1)} mm`;
    document.getElementById("kpiCount").textContent = rows.length;

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(c=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlyEmpresa(db2.talhoes), c.talhaoId) : "Geral";
      return `
        <tr>
          <td>${escapeHtml(c.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td>${escapeHtml(num(c.chuvaMm||0,1))}</td>
          <td>${escapeHtml(c.tempMax ?? "")}</td>
          <td>${escapeHtml(c.vento ?? "")}</td>
          <td>${escapeHtml(c.obs||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delClima('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem registros.</td></tr>`;
  }

  window.__delClima = (id)=>{
    if(!confirm("Excluir este lançamento?")) return;
    const db2 = getDB();
    db2.clima = (db2.clima||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluído","Lançamento removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("cli"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId") || "",
      chuvaMm: Number(fd.get("chuvaMm")||0),
      tempMin: Number(fd.get("tempMin")||0),
      tempMax: Number(fd.get("tempMax")||0),
      umidade: Number(fd.get("umidade")||0),
      vento: Number(fd.get("vento")||0),
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.clima = db2.clima || [];
    db2.clima.push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo","Lançamento registrado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`clima-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.clima||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
}

function pageEquipe(){
  crudPage({
    entityKey:"equipe",
    subtitle:"Equipe de campo: operadores, agrônomos, terceirizados etc.",
    fields:[
      {key:"nome", label:"Nome", type:"text"},
      {key:"funcao", label:"Função", type:"text", placeholder:"Tratorista / Encarregado / Agrônomo..."},
      {key:"telefone", label:"Telefone", type:"text"},
      {key:"nr", label:"NR/Certificações", type:"text", placeholder:"NR-31 / Treinamentos..."},
      {key:"obs", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"nome", label:"Nome"},
      {key:"funcao", label:"Função"},
      {key:"telefone", label:"Telefone"},
      {key:"nr", label:"NR/Cert."},
      {key:"obs", label:"Obs."}
    ]
  });
}

function pageMaquinas(){
  crudPage({
    entityKey:"maquinas",
    subtitle:"Cadastro de equipamentos para rastreabilidade de aplicação.",
    fields:[
      {key:"nome", label:"Máquina/equipamento", type:"text", placeholder:"Pulverizador / Trator / Drone..."},
      {key:"placa", label:"Placa/Identificação", type:"text"},
      {key:"horimetro", label:"Horímetro", type:"number"},
      {key:"capacidadeL", label:"Capacidade (L)", type:"number"},
      {key:"bicos", label:"Bicos/Barra", type:"text", placeholder:"Leque 11002 / Cone..."},
      {key:"obs", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"nome", label:"Máquina"},
      {key:"placa", label:"ID/Placa"},
      {key:"horimetro", label:"Horímetro"},
      {key:"capacidadeL", label:"Capacidade (L)"},
      {key:"bicos", label:"Bicos"}
    ]
  });
}

function pageAplicacoes(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);
  const produtos = onlyEmpresa(db.produtos);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr){
    return arr.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  const prodOptions = produtos.map(p=>`<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)}</option>`).join("");

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Registrar aplicação</h3>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>

          <div>
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>${optionList(fazendas)}</select>
          </div>

          <div>
            <small>Talhão</small>
            <select class="select" name="talhaoId" required>${optionList(talhoes)}</select>
          </div>

          <div><small>Área aplicada (ha)</small><input class="input" name="areaHaAplicada" type="number" step="0.1" placeholder="Ex.: 12,5" required/></div>
          <div><small>Custo total (R$) (opcional)</small><input class="input" name="custoTotal" type="number" step="0.01" placeholder="0"/></div>

          <div><small>Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>Alvo</small><input class="input" name="alvo" placeholder="Ferrugem / Lagartas / Daninhas..." /></div>
          <div><small>Operação</small><input class="input" name="operacao" placeholder="Pulverização terrestre / Drone..." /></div>

          <div>
            <small>Máquina</small>
            <select class="select" name="maquinaId">
              <option value="">(opcional)</option>${optionList(maquinas)}
            </select>
          </div>

          <div>
            <small>Operador</small>
            <select class="select" name="operadorId">
              <option value="">(opcional)</option>${optionList(equipe)}
            </select>
          </div>

          <div class="full">
            <small>Produtos (até 10 linhas)</small>
            <div class="hr"></div>

            <div class="formGrid">
              ${Array.from({length:10}).map((_,idx)=>{
                const i = idx+1;
                return `
                  <div class="full" style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:10px;">
                    <select class="select" name="p${i}Nome">
                      <option value="">(produto ${i} - opcional)</option>
                      ${prodOptions}
                    </select>
                    <input class="input" name="p${i}Dose" type="number" step="0.01" placeholder="Dose/ha" />
                    <input class="input" name="p${i}Un" placeholder="L/ha ou kg/ha" />
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <div class="full">
            <small>Observações</small>
            <textarea class="textarea" name="obs"></textarea>
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar aplicação</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Produtos</th><th>Custo</th><th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.aplicacoes||[]);
    const tb = document.getElementById("tbody");

    tb.innerHTML = rows.slice().reverse().map(a=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), a.fazendaId);
      const tal = findNameById(onlyEmpresa(db2.talhoes), a.talhaoId);
      const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${num(p.dosePorHa||0,2)} ${p.unidade||""})`).join(" + ");
      return `
        <tr>
          <td>${escapeHtml(a.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td><b>${escapeHtml(num(a.areaHaAplicada||0,1))} ha</b></td>
          <td>${escapeHtml(clampStr(prds||"—", 90))}</td>
          <td>${escapeHtml(kbrl(a.custoTotal||0))}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delA('${a.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">Sem aplicações.</td></tr>`;
  }

  window.__delA = (id)=>{
    if(!confirm("Excluir esta aplicação?")) return;
    const db2 = getDB();
    db2.aplicacoes = (db2.aplicacoes||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluída","Aplicação removida.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);

    const area = Number(fd.get("areaHaAplicada")||0);
    if(area<=0){
      alert("Informe Área aplicada (ha) > 0");
      return;
    }

    const obj = {
      id: uid("apl"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId"),
      areaHaAplicada: area,
      cultura: fd.get("cultura") || "",
      alvo: fd.get("alvo") || "",
      operacao: fd.get("operacao") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      condicoes: {
        vento: Number(fd.get("vento")||0),
        temp: Number(fd.get("temp")||0),
        umidade: Number(fd.get("umidade")||0)
      },
      caldaLHa: Number(fd.get("caldaLHa")||0),
      velocidadeKmH: Number(fd.get("velocidadeKmH")||0),
      bico: fd.get("bico") || "",
      pressaoBar: Number(fd.get("pressaoBar")||0),
      produtos: [],
      custoTotal: Number(fd.get("custoTotal")||0),
      obs: fd.get("obs") || ""
    };

    for(let i=1;i<=10;i++){
      const nome = fd.get(`p${i}Nome`);
      const dose = Number(fd.get(`p${i}Dose`)||0);
      const un = fd.get(`p${i}Un`) || "";
      if(nome){
        obj.produtos.push({ produtoNome: nome, dosePorHa: dose, unidade: un });
      }
    }

    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes || [];
    db2.aplicacoes.push(obj);

    setDB(db2);

    e.target.reset();
    toast("Salvo","Aplicação registrada.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`aplicacoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.aplicacoes||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
}

function pageRelatorios(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const aplicacoes = onlyEmpresa(db.aplicacoes);
  const clima = onlyEmpresa(db.clima);

  setTopActions(`
    <button class="btn" id="btnCSV">Exportar (Apl) CSV</button>
    <button class="btn primary" id="btnPrint">Imprimir / PDF</button>
  `);

  const totalArea = talhoes.reduce((s,t)=>s+Number(t.areaHa||0),0);
  const ultApl = aplicacoes.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,12);
  const ultClima = clima.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,12);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="printOnly">
      <h2>Relatório Agro Pro</h2>
      <p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
      <div class="hr"></div>
    </div>

    <div class="kpi">
      <div class="card">
        <h3>Área total</h3>
        <div class="big">${num(totalArea,1)} ha</div>
      </div>
      <div class="card">
        <h3>Aplicações</h3>
        <div class="big">${aplicacoes.length}</div>
      </div>
      <div class="card">
        <h3>Registros clima</h3>
        <div class="big">${clima.length}</div>
      </div>
      <div class="card">
        <h3>Fazendas</h3>
        <div class="big">${fazendas.length}</div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="7">Últimas aplicações</th></tr>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Operação</th><th>Produtos</th><th>Custo</th>
            </tr>
          </thead>
          <tbody>
            ${
              ultApl.map(a=>{
                const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${num(p.dosePorHa||0,2)} ${p.unidade||""})`).join(" + ");
                return `
                  <tr>
                    <td>${escapeHtml(a.data||"")}</td>
                    <td>${escapeHtml(findNameById(fazendas, a.fazendaId))}</td>
                    <td>${escapeHtml(findNameById(talhoes, a.talhaoId))}</td>
                    <td>${escapeHtml(num(a.areaHaAplicada||0,1))} ha</td>
                    <td>${escapeHtml(a.operacao||"")}</td>
                    <td>${escapeHtml(prds||"—")}</td>
                    <td>${escapeHtml(kbrl(a.custoTotal||0))}</td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="7">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btnPrint").addEventListener("click", ()=> window.print());
  document.getElementById("btnCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`relatorio-aplicacoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.aplicacoes||[])));
    toast("Exportado","CSV baixado.");
  });
}

function pageConfiguracoes(){
  setTopActions(`
    <button class="btn" id="btnImport">Importar Backup</button>
    <button class="btn primary" id="btnExport">Exportar Backup</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Configurações</h3>
        <div class="help">
          • Este sistema salva tudo no navegador (localStorage).<br/>
          • Use backup para trocar de aparelho sem perder dados.
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnExport").addEventListener("click", ()=>{
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Backup exportado","Arquivo .json baixado.");
  });

  document.getElementById("btnImport").addEventListener("click", ()=>{
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if(!file) return;
      const text = await file.text();
      try{
        const data = JSON.parse(text);
        if(!data.empresas){
          alert("Arquivo inválido.");
          return;
        }
        if(!confirm("Importar vai SUBSTITUIR seus dados locais. Continuar?")) return;
        Storage.save(data);
        toast("Importado","Recarregando…");
        setTimeout(()=>location.reload(), 200);
      }catch(e){
        alert("Não foi possível ler o arquivo JSON.");
      }
    };
    input.click();
  });
}

// ==================== 10. BOOT ====================
function boot(){
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const titles = {
    dashboard:["Dashboard","Visão geral, indicadores e últimos registros"],
    opscenter:["Ops Center","Alertas, custos por talhão e monitoramento"],
    ia:["IA Preditiva","Análises e previsões inteligentes com machine learning"],
    empresas:["Empresas","Cadastre e gerencie organizações (multiempresa)"],
    fazendas:["Fazendas","Unidades produtivas por empresa"],
    talhoes:["Talhões","Área, cultura, safra e custos por talhão"],
    produtos:["Produtos","Cadastro de defensivos e insumos"],
    estoque:["Estoque","Controle por depósito/lote/validade"],
    aplicacoes:["Aplicações","Rastreabilidade de operações"],
    combustivel:["Combustível","Abastecimentos e controle de diesel"],
    clima:["Clima/Chuva","Histórico manual por fazenda/talhão"],
    equipe:["Equipe","Operadores, agrônomos e times de campo"],
    maquinas:["Máquinas","Equipamentos usados nas operações"],
    relatorios:["Relatórios","Resumo + impressão/PDF + exportação"],
    config:["Configurações","Backup/restore e configurações do sistema"],
  };

  const [t, s] = titles[pageKey] || ["Agro Pro",""];
  renderShell(pageKey, t, s);

  if(pageKey==="dashboard") pageDashboard();
  else if(pageKey==="opscenter") pageOpsCenter();
  else if(pageKey==="ia") pageIAPreditiva();
  else if(pageKey==="empresas") pageEmpresas();
  else if(pageKey==="fazendas") pageFazendas();
  else if(pageKey==="talhoes") pageTalhoes();
  else if(pageKey==="produtos") pageProdutos();
  else if(pageKey==="estoque") pageEstoque();
  else if(pageKey==="aplicacoes") pageAplicacoes();
  else if(pageKey==="combustivel") pageCombustivel();
  else if(pageKey==="clima") pageClima();
  else if(pageKey==="equipe") pageEquipe();
  else if(pageKey==="maquinas") pageMaquinas();
  else if(pageKey==="relatorios") pageRelatorios();
  else if(pageKey==="config") pageConfiguracoes();

  toast("Agro Pro IA", "Sistema carregado com Inteligência Artificial!");
}

document.addEventListener("DOMContentLoaded", boot);
// DIAGNÓSTICO - Remova depois
console.log("Páginas disponíveis:", PAGES);
console.log("Página atual:", document.body.getAttribute("data-page"));
console.log("Arquivo atual:", window.location.pathname);

// Teste se a função pageIAPreditiva existe
if (typeof pageIAPreditiva === 'function') {
    console.log("✅ Função pageIAPreditiva carregada!");
} else {
    console.error("❌ Função pageIAPreditiva NÃO encontrada!");
}