/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTISAFRA) - VERSÃO FINAL
   Atualizações:
   + Sistema de SAFRAS (substitui empresas como filtro principal)
   + Dados isolados por safra
   + Acumulação de estoque corrigida
   + Preços de mercado configuráveis
   + Controle de diesel com UEPS
   ============================================================ */

const Storage = {
  key: "agro_pro_v6",
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },
  save(db) {
    localStorage.setItem(this.key, JSON.stringify(db));
  }
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(title, msg) {
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

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
  }, 3200);
  setTimeout(() => {
    el.remove();
  }, 3800);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const header = cols.map(esc).join(",");
  const lines = rows.map(r => cols.map(c => esc(r[c])).join(","));
  return [header, ...lines].join("\n");
}

/* ------------------ Base de dados de pragas ------------------ */
function getPragasBase() {
  return [
    { id: "p1", nome: "Ferrugem Asiática", nomeCientifico: "Phakopsora pachyrhizi", culturas: ["soja"], tempMin: 20, tempMax: 28, umidadeMin: 70 },
    { id: "p2", nome: "Lagarta-da-soja", nomeCientifico: "Anticarsia gemmatalis", culturas: ["soja"], tempMin: 22, tempMax: 30, umidadeMin: 60 },
    { id: "p3", nome: "Percevejo-marrom", nomeCientifico: "Euschistus heros", culturas: ["soja"], tempMin: 20, tempMax: 32, umidadeMin: 50 },
    { id: "p4", nome: "Lagarta-do-cartucho", nomeCientifico: "Spodoptera frugiperda", culturas: ["milho"], tempMin: 22, tempMax: 30, umidadeMin: 60 },
    { id: "p5", nome: "Cigarrinha-do-milho", nomeCientifico: "Dalbulus maidis", culturas: ["milho"], tempMin: 24, tempMax: 32, umidadeMin: 55 },
    { id: "p6", nome: "Helicoverpa", nomeCientifico: "Helicoverpa armigera", culturas: ["soja", "milho", "algodao"], tempMin: 22, tempMax: 30, umidadeMin: 60 },
    { id: "p7", nome: "Bicudo-do-algodoeiro", nomeCientifico: "Anthonomus grandis", culturas: ["algodao"], tempMin: 22, tempMax: 32, umidadeMin: 60 },
    { id: "p8", nome: "Ácaro-rajado", nomeCientifico: "Tetranychus urticae", culturas: ["algodao", "soja"], tempMin: 25, tempMax: 35, umidadeMin: 40 },
    { id: "p9", nome: "Antracnose", nomeCientifico: "Colletotrichum truncatum", culturas: ["soja"], tempMin: 22, tempMax: 28, umidadeMin: 80 },
    { id: "p10", nome: "Cercosporiose", nomeCientifico: "Cercospora kikuchii", culturas: ["soja"], tempMin: 22, tempMax: 28, umidadeMin: 75 },
    { id: "p11", nome: "Mancha-alvo", nomeCientifico: "Corynespora cassiicola", culturas: ["soja"], tempMin: 24, tempMax: 30, umidadeMin: 70 },
    { id: "p12", nome: "Mofo-branco", nomeCientifico: "Sclerotinia sclerotiorum", culturas: ["soja"], tempMin: 18, tempMax: 24, umidadeMin: 85 },
    { id: "p13", nome: "Oídio", nomeCientifico: "Erysiphe diffusa", culturas: ["soja"], tempMin: 20, tempMax: 26, umidadeMin: 50 },
    { id: "p14", nome: "Ferrugem-branca", nomeCientifico: "Puccinia polysora", culturas: ["milho"], tempMin: 20, tempMax: 26, umidadeMin: 80 },
    { id: "p15", nome: "Pulgão-do-algodoeiro", nomeCientifico: "Aphis gossypii", culturas: ["algodao"], tempMin: 20, tempMax: 28, umidadeMin: 60 },
    { id: "p16", nome: "Mosca-branca", nomeCientifico: "Bemisia tabaci", culturas: ["soja", "algodao"], tempMin: 25, tempMax: 35, umidadeMin: 50 },
    { id: "p17", nome: "Tripes", nomeCientifico: "Frankliniella schultzei", culturas: ["soja", "algodao"], tempMin: 22, tempMax: 30, umidadeMin: 50 },
    { id: "p18", nome: "Broca-da-cana", nomeCientifico: "Diatraea saccharalis", culturas: ["milho"], tempMin: 22, tempMax: 28, umidadeMin: 70 },
    { id: "p19", nome: "Lagarta-elasmo", nomeCientifico: "Elasmopalpus lignosellus", culturas: ["milho"], tempMin: 22, tempMax: 30, umidadeMin: 50 },
    { id: "p20", nome: "Mancha-de-ramularia", nomeCientifico: "Ramularia areola", culturas: ["algodao"], tempMin: 22, tempMax: 28, umidadeMin: 80 }
  ];
}

/* ------------------ Base de dados de produtos ------------------ */
function getProdutosBase() {
  return [
    // Fungicidas para soja
    { id: "prod1", tipo: "Fungicida", nome: "Ativm", ingrediente: "Azoxistrobina + Ciproconazol", fabricante: "Syngenta", carenciaDias: 14, reentradaHoras: 24, unidade: "L", preco: 85.90, pragasAlvo: ["Ferrugem Asiática", "Antracnose", "Cercosporiose"] },
    { id: "prod2", tipo: "Fungicida", nome: "Elatus", ingrediente: "Azoxistrobina + Benzovindiflupir", fabricante: "Syngenta", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 145.00, pragasAlvo: ["Ferrugem Asiática", "Mancha-alvo", "Antracnose"] },
    { id: "prod3", tipo: "Fungicida", nome: "Fox", ingrediente: "Trifloxistrobina + Protioconazol", fabricante: "Bayer", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 98.50, pragasAlvo: ["Ferrugem Asiática", "Oídio", "Cercosporiose"] },
    { id: "prod4", tipo: "Fungicida", nome: "Aproach", ingrediente: "Picoxistrobina", fabricante: "Corteva", carenciaDias: 14, reentradaHoras: 24, unidade: "L", preco: 76.00, pragasAlvo: ["Ferrugem Asiática", "Antracnose"] },
    { id: "prod5", tipo: "Fungicida", nome: "Priori Xtra", ingrediente: "Azoxistrobina + Ciproconazol", fabricante: "Syngenta", carenciaDias: 14, reentradaHoras: 24, unidade: "L", preco: 92.00, pragasAlvo: ["Ferrugem Asiática", "Oídio", "Mancha-alvo"] },
    
    // Inseticidas para soja
    { id: "prod6", tipo: "Inseticida", nome: "Engeo Pleno", ingrediente: "Tiametoxam + Lambda-cialotrina", fabricante: "Syngenta", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 110.00, pragasAlvo: ["Lagarta-da-soja", "Percevejo-marrom", "Helicoverpa"] },
    { id: "prod7", tipo: "Inseticida", nome: "Connect", ingrediente: "Imidacloprido + Beta-ciflutrina", fabricante: "Bayer", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 78.00, pragasAlvo: ["Lagarta-da-soja", "Percevejo-marrom"] },
    { id: "prod8", tipo: "Inseticida", nome: "Belt", ingrediente: "Flubendiamida", fabricante: "Bayer", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 210.00, pragasAlvo: ["Lagarta-do-cartucho", "Helicoverpa"] },
    { id: "prod9", tipo: "Inseticida", nome: "Premio", ingrediente: "Clorantraniliprole", fabricante: "Syngenta", carenciaDias: 14, reentradaHoras: 24, unidade: "L", preco: 195.00, pragasAlvo: ["Lagarta-da-soja", "Helicoverpa"] },
    { id: "prod10", tipo: "Inseticida", nome: "Curyom", ingrediente: "Zeta-cipermetrina", fabricante: "FMC", carenciaDias: 14, reentradaHoras: 24, unidade: "L", preco: 45.00, pragasAlvo: ["Percevejo-marrom", "Lagarta-da-soja"] },
    
    // Herbicidas
    { id: "prod11", tipo: "Herbicida", nome: "Roundup Original", ingrediente: "Glifosato", fabricante: "Bayer", carenciaDias: 0, reentradaHoras: 4, unidade: "L", preco: 32.00, pragasAlvo: ["Plantas daninhas"] },
    { id: "prod12", tipo: "Herbicida", nome: "Zapp Qi", ingrediente: "Glifosato", fabricante: "Syngenta", carenciaDias: 0, reentradaHoras: 4, unidade: "L", preco: 34.00, pragasAlvo: ["Plantas daninhas"] },
    { id: "prod13", tipo: "Herbicida", nome: "Aurora", ingrediente: "Carfentrazona-etílica", fabricante: "FMC", carenciaDias: 7, reentradaHoras: 24, unidade: "L", preco: 120.00, pragasAlvo: ["Plantas daninhas"] },
    { id: "prod14", tipo: "Herbicida", nome: "Classic", ingrediente: "Clorimurom-etílico", fabricante: "Corteva", carenciaDias: 60, reentradaHoras: 24, unidade: "kg", preco: 85.00, pragasAlvo: ["Plantas daninhas"] },
    { id: "prod15", tipo: "Herbicida", nome: "Spartan", ingrediente: "Sulfentrazona", fabricante: "FMC", carenciaDias: 30, reentradaHoras: 24, unidade: "L", preco: 95.00, pragasAlvo: ["Plantas daninhas"] },
    
    // Inseticidas para milho
    { id: "prod16", tipo: "Inseticida", nome: "Match", ingrediente: "Lufenurom", fabricante: "Syngenta", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 68.00, pragasAlvo: ["Lagarta-do-cartucho"] },
    { id: "prod17", tipo: "Inseticida", nome: "Proclaim", ingrediente: "Benzoato de emamectina", fabricante: "Syngenta", carenciaDias: 14, reentradaHoras: 24, unidade: "kg", preco: 220.00, pragasAlvo: ["Lagarta-do-cartucho", "Helicoverpa"] },
    
    // Inseticidas para algodão
    { id: "prod18", tipo: "Inseticida", nome: "Oberon", ingrediente: "Espiromesifeno", fabricante: "Bayer", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 145.00, pragasAlvo: ["Ácaro-rajado", "Mosca-branca"] },
    { id: "prod19", tipo: "Inseticida", nome: "Diafuran", ingrediente: "Diafentiurom", fabricante: "Syngenta", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 130.00, pragasAlvo: ["Mosca-branca"] },
    { id: "prod20", tipo: "Inseticida", nome: "Carbaryl", ingrediente: "Carbaril", fabricante: "Bayer", carenciaDias: 21, reentradaHoras: 24, unidade: "L", preco: 42.00, pragasAlvo: ["Bicudo-do-algodoeiro", "Pulgão"] },
    
    // Fertilizantes foliares
    { id: "prod21", tipo: "Fertilizante", nome: "Nutricionamento", ingrediente: "NPK 20-20-20", fabricante: "Mosaic", carenciaDias: 0, reentradaHoras: 4, unidade: "kg", preco: 8.50, pragasAlvo: [] },
    { id: "prod22", tipo: "Fertilizante", nome: "Boro", ingrediente: "Ácido bórico", fabricante: "Quimifol", carenciaDias: 0, reentradaHoras: 4, unidade: "L", preco: 12.00, pragasAlvo: [] },
    { id: "prod23", tipo: "Fertilizante", nome: "Cobre", ingrediente: "Oxicloreto de cobre", fabricante: "Albaugh", carenciaDias: 0, reentradaHoras: 4, unidade: "kg", preco: 18.00, pragasAlvo: [] },
    { id: "prod24", tipo: "Fertilizante", nome: "Zinco", ingrediente: "Sulfato de zinco", fabricante: "Quimifol", carenciaDias: 0, reentradaHoras: 4, unidade: "kg", preco: 15.00, pragasAlvo: [] },
    { id: "prod25", tipo: "Fertilizante", nome: "Manganês", ingrediente: "Sulfato de manganês", fabricante: "Quimifol", carenciaDias: 0, reentradaHoras: 4, unidade: "kg", preco: 14.00, pragasAlvo: [] }
  ];
}

function seedDB() {
  const safraId = uid("saf");
  const safra2Id = uid("saf");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");
  const talhao2Id = uid("tal");
  const maqId = uid("maq");
  const opId = uid("peq");

  // Produtos base
  const produtosBase = getProdutosBase();
  const pragasBase = getPragasBase();

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 6 },
    session: { safraId },

    safras: [
      {
        id: safraId,
        nome: "Safra 2025/26",
        dataInicio: "2025-09-01",
        dataFim: "2026-08-31",
        ativa: true,
        observacoes: "Safra de verão - Soja/Milho"
      },
      {
        id: safra2Id,
        nome: "Safra 2024/25",
        dataInicio: "2024-09-01",
        dataFim: "2025-08-31",
        ativa: false,
        observacoes: "Safra anterior"
      }
    ],

    parametros: {
      precoSoja: 120.00,
      produtividadeMinSoja: 65,
      produtividadeMaxSoja: 75,
      produtividadeMinMilho: 100,
      produtividadeMaxMilho: 130,
      produtividadeMinAlgodao: 250,
      produtividadeMaxAlgodao: 300
    },

    fazendas: [
      { id: fazendaId, safraId, nome: "Fazenda Horizonte", cidade: "Sorriso", uf: "MT", areaHa: 1450, observacoes: "Soja/Milho safrinha" }
    ],

    talhoes: [
      { id: talhaoId, safraId, fazendaId, nome: "T-12", areaHa: 78.5, cultura: "Soja", safra: "2025/26", solo: "Argiloso", coordenadas: "", observacoes: "" },
      { id: talhao2Id, safraId, fazendaId, nome: "T-15", areaHa: 120.0, cultura: "Milho", safra: "2025/26", solo: "Argiloso", coordenadas: "", observacoes: "" }
    ],

    produtos: produtosBase.map(p => ({ ...p, id: uid("prd"), safraId })),

    estoque: produtosBase.map(p => ({
      id: uid("stk"),
      safraId,
      produtoId: p.id,
      deposito: "Central",
      lote: "",
      validade: "",
      qtd: 0,
      unidade: p.unidade,
      obs: "Estoque inicial"
    })),

    equipe: [
      { id: opId, safraId, nome: "Operador 1", funcao: "Tratorista", telefone: "", nr: "", obs: "" }
    ],

    maquinas: [
      { id: maqId, safraId, nome: "Pulverizador Autopropelido", placa: "", horimetro: 0, capacidadeL: 3000, bicos: "", obs: "" }
    ],

    clima: [
      { id: uid("cli"), safraId, data: nowISO(), fazendaId, talhaoId, chuvaMm: 12, tempMin: 22, tempMax: 33, umidade: 68, vento: 9, obs: "Chuva isolada à tarde" },
      { id: uid("cli"), safraId, data: "2026-02-10", fazendaId, talhaoId, chuvaMm: 0, tempMin: 24, tempMax: 35, umidade: 55, vento: 12, obs: "Dia seco" }
    ],

    dieselEntradas: [
      { id: uid("de"), safraId, data: nowISO(), litros: 5000, precoLitro: 6.19, deposito: "Tanque Principal", obs: "Compra inicial" }
    ],

    dieselEstoque: [
      { id: uid("dsl"), safraId, deposito: "Tanque Principal", litros: 5000, precoVigente: 6.19, obs: "Estoque inicial" }
    ],

    combustivel: [
      {
        id: uid("cmb"),
        safraId,
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
        safraId,
        data: nowISO(),
        fazendaId,
        talhaoId,
        areaHaAplicada: 25,
        cultura: "Soja",
        alvo: "Plantas daninhas",
        operacao: "Pulverização terrestre",
        maquinaId: maqId,
        operadorId: opId,
        condicoes: { vento: 8, temp: 31, umidade: 60 },
        caldaLHa: 120,
        velocidadeKmH: 14,
        bico: "Leque 11002",
        pressaoBar: 3,
        produtos: [
          { produtoId: "prod1", produtoNome: "Ativm", dosePorHa: 2.0, unidade: "L/ha", precoUnit: 85.90 }
        ],
        custoTotal: 4295.00,
        obs: "Aplicação padrão (demo)."
      }
    ],

    lembretes: [
      { id: uid("lem"), safraId, data: "2026-03-01", mensagem: "Aplicar fungicida no talhão T-12", tipo: "aplicacao", concluido: false }
    ],

    pragas: pragasBase.map(p => ({ ...p, id: uid("praga"), safraId }))
  };

  Storage.save(db);
  return db;
}

function getDB() {
  let db = Storage.load();
  if (!db) db = seedDB();

  // migrações
  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 6 };
  db.session = db.session || {};
  db.safras = db.safras || [];
  db.parametros = db.parametros || { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75 };
  db.fazendas = db.fazendas || [];
  db.talhoes = db.talhoes || [];
  db.produtos = db.produtos || [];
  db.estoque = db.estoque || [];
  db.equipe = db.equipe || [];
  db.maquinas = db.maquinas || [];
  db.clima = db.clima || [];
  db.dieselEntradas = db.dieselEntradas || [];
  db.dieselEstoque = db.dieselEstoque || [{ id: uid("dsl"), safraId: (db.session.safraId || db.safras?.[0]?.id || uid("saf")), deposito: "Tanque Principal", litros: 0, precoVigente: 0, obs: "" }];
  db.combustivel = db.combustivel || [];
  db.aplicacoes = db.aplicacoes || [];
  db.lembretes = db.lembretes || [];
  db.pragas = db.pragas || [];

  db.clima.forEach(c => { if (c.talhaoId == null) c.talhaoId = ""; });

  Storage.save(db);
  return db;
}
function setDB(db) { Storage.save(db); }

function getSafraId() {
  const db = getDB();
  return db.session?.safraId || (db.safras[0]?.id ?? null);
}
function setSafraId(id) {
  const db = getDB();
  db.session = db.session || {};
  db.session.safraId = id;
  setDB(db);
}

function getSafraAtual() {
  const db = getDB();
  const sid = getSafraId();
  return db.safras?.find(s => s.id === sid);
}

/* ------------------ UI shell ------------------ */
const PAGES = [
  { href: "index.html", label: "Dashboard", key: "dashboard", icon: "📊" },
  { href: "opscenter.html", label: "Ops Center", key: "opscenter", icon: "🛰️" },
  { href: "safras.html", label: "Safras", key: "safras", icon: "🌱" },
  { href: "fazendas.html", label: "Fazendas", key: "fazendas", icon: "🌾" },
  { href: "talhoes.html", label: "Talhões", key: "talhoes", icon: "🧭" },
  { href: "produtos.html", label: "Produtos", key: "produtos", icon: "🧪" },
  { href: "estoque.html", label: "Estoque", key: "estoque", icon: "📦" },
  { href: "aplicacoes.html", label: "Aplicações", key: "aplicacoes", icon: "🚜" },
  { href: "combustivel.html", label: "Combustível", key: "combustivel", icon: "⛽" },
  { href: "clima.html", label: "Clima/Chuva", key: "clima", icon: "🌧️" },
  { href: "equipe.html", label: "Equipe", key: "equipe", icon: "👷" },
  { href: "maquinas.html", label: "Máquinas", key: "maquinas", icon: "🛠️" },
  { href: "relatorios.html", label: "Relatórios", key: "relatorios", icon: "🧾" },
  { href: "configuracoes.html", label: "Configurações", key: "config", icon: "⚙️" }
];

function renderShell(pageKey, title, subtitle) {
  const db = getDB();
  const safraId = getSafraId();
  const safra = getSafraAtual();
  
  const nav = PAGES.map(p => {
    const active = (p.key === pageKey) ? "active" : "";
    return `<a class="${active}" href="${p.href}"><span class="ico">${p.icon}</span> ${escapeHtml(p.label)}</a>`;
  }).join("");

  const safraOptions = db.safras.map(s => {
    const sel = s.id === safraId ? "selected" : "";
    return `<option value="${s.id}" ${sel}>${escapeHtml(s.nome)} ${s.ativa ? '✅' : ''}</option>`;
  }).join("");

  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="brand">
          <div class="logo"></div>
          <div>
            <h1>Agro Pro</h1>
            <p>Controle por Safras</p>
          </div>
        </div>

        <div class="tenant">
          <div class="row">
            <span class="badge"><span class="dot"></span> Ambiente Offline</span>
            <button class="btn noPrint" id="btnBackup">Backup</button>
          </div>
          <div class="hr"></div>
          
          <small>🌱 Safra ativa</small>
          <select class="select" id="safraSelect">${safraOptions}</select>
          
          <div style="margin-top:10px" class="row">
            <button class="btn primary" id="btnNovaSafra">+ Nova safra</button>
          </div>
          
          <div style="margin-top:10px" class="help">
            Trocar de safra filtra todos os dados (talhões, produtos, estoque, etc).
          </div>
        </div>

        <nav class="nav">${nav}</nav>

        <div style="margin-top:14px" class="help">
          <b>Dica:</b> Use Configurações para ajustar parâmetros de mercado.
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="title">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle || (safra ? `Safra: ${safra.nome}` : "Selecione uma safra"))}</p>
          </div>
          <div class="actions noPrint" id="topActions"></div>
        </div>

        <div id="content"></div>
      </main>
    </div>
  `;

  document.getElementById("safraSelect").addEventListener("change", (e) => {
    setSafraId(e.target.value);
    toast("Safra alterada", "Filtrando dados...");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnBackup").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(db2, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaSafra").addEventListener("click", () => {
    const nome = prompt("Nome da nova safra (ex: 2026/27):");
    if (!nome) return;
    const db2 = getDB();
    if (!db2.safras) db2.safras = [];
    const id = uid("saf");
    db2.safras.push({ 
      id, 
      nome, 
      dataInicio: nowISO(),
      dataFim: "",
      ativa: true,
      observacoes: ""
    });
    setDB(db2);
    setSafraId(id);
    toast("Safra criada", "Nova safra ativada!");
    setTimeout(() => location.reload(), 200);
  });
}

/* ------------------ Helpers ------------------ */
function onlySafra(arr) {
  const sid = getSafraId();
  return (arr || []).filter(x => x.safraId === sid);
}

function findNameById(arr, id, fallback = "-") {
  const o = (arr || []).find(x => x.id === id);
  return o ? (o.nome ?? fallback) : fallback;
}

const FMT_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function brl(v) { return FMT_BRL.format(Number(v || 0)); }
function num(v, casas = 2) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(Number(v || 0));
}
function kbrl(n) { return brl(n); }

function setTopActions(html) {
  const el = document.getElementById("topActions");
  if (el) el.innerHTML = html || "";
}

function clampStr(s, max = 60) {
  s = String(s ?? "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/* ------------------ Estoque: baixas automáticas ------------------ */
function ensureStockRow(db, produtoId, deposito = "Central", unidade = "") {
  db.estoque = db.estoque || [];
  let row = db.estoque.find(s => s.safraId === getSafraId() && s.produtoId === produtoId && (s.deposito || "Central") === deposito);
  if (!row) {
    const prod = db.produtos.find(p => p.id === produtoId);
    row = { id: uid("stk"), safraId: getSafraId(), produtoId, deposito, lote: "", validade: "", qtd: 0, unidade: unidade || (prod ? prod.unidade : ""), obs: "(auto)" };
    db.estoque.push(row);
  }
  return row;
}

function baixaEstoqueProdutoPorId(db, produtoId, quantidade, unidade = "") {
  if (!produtoId || !quantidade) return { ok: false, msg: "Sem produto/quantidade" };
  const prod = onlySafra(db.produtos).find(p => p.id === produtoId);
  if (!prod) return { ok: false, msg: `Produto não encontrado` };
  const row = ensureStockRow(db, produtoId, "Central", unidade || prod.unidade);
  row.qtd = Number(row.qtd || 0) - Number(quantidade || 0);
  return { ok: true, msg: `Baixa estoque: ${prod.nome} -${num(quantidade, 2)} ${row.unidade}` };
}

/* ------------------ Diesel: entrada e baixa automática ------------------ */
function registrarEntradaDiesel(db, deposito, litros, precoLitro, data, obs = "") {
  const entrada = {
    id: uid("de"),
    safraId: getSafraId(),
    data: data || nowISO(),
    litros,
    precoLitro,
    deposito,
    obs
  };
  db.dieselEntradas = db.dieselEntradas || [];
  db.dieselEntradas.push(entrada);

  // Atualizar estoque
  let tank = db.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
  if (!tank) {
    tank = { id: uid("dsl"), safraId: getSafraId(), deposito, litros: 0, precoVigente: 0, obs: "" };
    db.dieselEstoque.push(tank);
  }
  tank.litros = Number(tank.litros || 0) + litros;
  tank.precoVigente = precoLitro; // UEPS: último preço
  return tank;
}

function baixaDiesel(db, deposito, litros) {
  const tank = db.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
  if (!tank) return { ok: false, msg: "Tanque não encontrado" };
  const precoVigente = tank.precoVigente || 0;
  tank.litros = Number(tank.litros || 0) - Number(litros || 0); // pode ficar negativo
  return { ok: true, precoLitro: precoVigente };
}

/* ------------------ Custo por talhão ------------------ */
function calcCustosPorTalhao(db) {
  const talhoes = onlySafra(db.talhoes);
  const fazendas = onlySafra(db.fazendas);
  const apl = onlySafra(db.aplicacoes || []);
  const cmb = onlySafra(db.combustivel || []);

  const map = new Map();
  for (const t of talhoes) map.set(t.id, { custo: 0, last: "", ops: 0 });

  for (const a of apl) {
    if (!a.talhaoId) continue;
    const rec = map.get(a.talhaoId) || { custo: 0, last: "", ops: 0 };
    rec.custo += Number(a.custoTotal || 0);
    rec.ops += 1;
    if ((a.data || "") > (rec.last || "")) rec.last = a.data || "";
    map.set(a.talhaoId, rec);
  }

  for (const c of cmb) {
    if (!c.talhaoId) continue;
    const rec = map.get(c.talhaoId) || { custo: 0, last: "", ops: 0 };
    rec.custo += Number(c.litros || 0) * Number(c.precoLitro || 0);
    rec.ops += 1;
    if ((c.data || "") > (rec.last || "")) rec.last = c.data || "";
    map.set(c.talhaoId, rec);
  }

  return talhoes.map(t => {
    const info = map.get(t.id) || { custo: 0, last: "", ops: 0 };
    const area = Number(t.areaHa || 0) || 0;
    const custoHa = area > 0 ? (info.custo / area) : 0;
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
  }).sort((a, b) => b.custoTotal - a.custoTotal);
}

/* ------------------ Alertas de pragas baseados no clima ------------------ */
function gerarAlertasPragas(db) {
  const alertas = [];
  const clima = onlySafra(db.clima || []).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
  const talhoes = onlySafra(db.talhoes);
  const pragas = onlySafra(db.pragas || []);

  for (const t of talhoes) {
    const climaTalhao = clima.filter(c => c.talhaoId === t.id || c.talhaoId === "");
    if (climaTalhao.length === 0) continue;

    const tempMedia = (climaTalhao[0].tempMax + climaTalhao[0].tempMin) / 2;
    const umidade = climaTalhao[0].umidade;

    for (const p of pragas) {
      if (!p.culturas.includes(t.cultura?.toLowerCase())) continue;

      const tempFavoravel = tempMedia >= p.tempMin && tempMedia <= p.tempMax;
      const umidFavoravel = umidade >= p.umidadeMin;

      if (tempFavoravel && umidFavoravel) {
        alertas.push({
          tipo: "praga",
          mensagem: `⚠️ Risco de ${p.nome} no talhão ${t.nome}`,
          detalhe: `Temperatura ${tempMedia.toFixed(1)}°C, Umidade ${umidade}%`,
          data: nowISO(),
          talhaoId: t.id,
          pragaId: p.id
        });
      }
    }
  }
  return alertas;
}

/* ------------------ Páginas ------------------ */

// Página de Safras (substitui a antiga página de Empresas)
function pageSafras() {
  const db = getDB();
  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Cadastrar nova safra</h3>
        <div class="help">Cada safra tem seus próprios talhões, estoque e aplicações.</div>
        <div class="hr"></div>
        <form id="frm" class="formGrid">
          <div><small>Nome da safra</small><input class="input" name="nome" required placeholder="Ex: Safra 2026/27"></div>
          <div><small>Data início</small><input class="input" name="dataInicio" type="date" value="${nowISO()}"></div>
          <div><small>Data fim</small><input class="input" name="dataFim" type="date"></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="observacoes"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar safra</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Safra</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Status</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function render() {
    const db2 = getDB();
    const tb = document.getElementById("tbody");
    tb.innerHTML = db2.safras.slice().reverse().map(s => `
      <tr>
        <td><b>${escapeHtml(s.nome)}</b></td>
        <td>${s.dataInicio || '-'}</td>
        <td>${s.dataFim || '-'}</td>
        <td><span class="pill ${s.ativa ? 'success' : ''}">${s.ativa ? 'Ativa' : 'Inativa'}</span></td>
        <td class="noPrint">
          <button class="btn" onclick="window.__usar('${s.id}')">Usar</button>
          <button class="btn danger" onclick="window.__delSafra('${s.id}')">Excluir</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem safras cadastradas.</td></tr>`;
  }

  window.__usar = (id) => {
    setSafraId(id);
    toast("Safra ativa", "Mudando para a safra selecionada…");
    setTimeout(() => location.reload(), 200);
  };

  window.__delSafra = (id) => {
    const db2 = getDB();
    if (db2.safras.length <= 1) {
      alert("Você precisa ter pelo menos 1 safra.");
      return;
    }
    if (!confirm("Excluir safra e TODOS os dados dela? (fazendas, talhões, aplicações)")) return;

    db2.safras = db2.safras.filter(x => x.id !== id);
    const wipe = key => db2[key] = (db2[key] || []).filter(x => x.safraId !== id);
    ["fazendas", "talhoes", "produtos", "estoque", "equipe", "maquinas", "clima", "aplicacoes", "combustivel", "dieselEntradas", "dieselEstoque", "lembretes", "pragas"].forEach(wipe);

    if (getSafraId() === id) {
      db2.session.safraId = db2.safras[0].id;
    }
    setDB(db2);
    toast("Excluída", "Safra removida com dados associados.");
    setTimeout(() => location.reload(), 200);
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("saf"),
      nome: fd.get("nome"),
      dataInicio: fd.get("dataInicio") || nowISO(),
      dataFim: fd.get("dataFim") || "",
      ativa: true,
      observacoes: fd.get("observacoes") || ""
    };
    const db2 = getDB();
    db2.safras.push(obj);
    setDB(db2);
    setSafraId(obj.id);
    e.target.reset();
    toast("Salvo", "Safra adicionada.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`safras-${nowISO()}.csv`, toCSV(db2.safras));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageDashboard() {
  const db = getDB();
  const safra = getSafraAtual();
  const fazendas = onlySafra(db.fazendas);
  const talhoes = onlySafra(db.talhoes);
  const produtos = onlySafra(db.produtos);
  const aplicacoes = onlySafra(db.aplicacoes);
  const clima = onlySafra(db.clima);
  const lembretes = onlySafra(db.lembretes).filter(l => !l.concluido).slice(0, 5);
  const alertasPragas = gerarAlertasPragas(db).slice(0, 3);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a => a.data === hoje).length;
  const chuvaHoje = clima.filter(c => c.data === hoje).reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card" style="background: linear-gradient(135deg, #00b09b, #96c93d);">
        <h3>🌱 Safra Atual</h3>
        <div class="big">${escapeHtml(safra?.nome || 'N/A')}</div>
        <div class="sub">${safra?.dataInicio || ''} a ${safra?.dataFim || ''}</div>
      </div>
      <div class="card">
        <h3>Talhões</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">Área total: ${num(areaTotal, 1)} ha</div>
      </div>
      <div class="card">
        <h3>Aplicações (hoje)</h3>
        <div class="big">${aplHoje}</div>
        <div class="sub">Operações</div>
      </div>
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big">${num(chuvaHoje, 1)} mm</div>
        <div class="sub">Lançamento manual</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>🚨 Alertas de Pragas</h3>
        ${alertasPragas.length ? alertasPragas.map(a => `
          <div style="padding:12px; margin:8px 0; background: rgba(244, 67, 54, 0.1); border-left:4px solid #f44336; border-radius:4px;">
            <b style="color:#f44336;">${escapeHtml(a.mensagem)}</b><br>
            <span style="color:#888; font-size:13px;">${escapeHtml(a.detalhe)}</span>
          </div>
        `).join('') : '<p style="color:#888;">Nenhum alerta no momento.</p>'}
      </div>

      <div class="card">
        <h3>📋 Lembretes Pendentes</h3>
        ${lembretes.length ? lembretes.map(l => `
          <div style="padding:12px; margin:8px 0; background: rgba(33, 150, 243, 0.1); border-left:4px solid #2196f3; border-radius:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <b style="color:#2196f3;">${escapeHtml(l.mensagem)}</b><br>
                <span style="color:#888; font-size:13px;">Data: ${l.data}</span>
              </div>
              <button class="btn" style="background:#2196f3; color:white;" onclick="concluirLembrete('${l.id}')">Concluir</button>
            </div>
          </div>
        `).join('') : '<p style="color:#888;">Nenhum lembrete pendente.</p>'}
      </div>
    </div>

    <div class="tableWrap" style="margin-top:20px;">
      <h3>Últimas aplicações</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Talhão</th>
            <th>Área</th>
            <th>Produto</th>
            <th>Custo</th>
          </tr>
        </thead>
        <tbody>
          ${aplicacoes.slice().reverse().slice(0, 5).map(a => {
            const talhao = findNameById(talhoes, a.talhaoId);
            const produto = a.produtos?.[0]?.produtoNome || '—';
            return `<tr><td>${a.data}</td><td>${escapeHtml(talhao)}</td><td>${num(a.areaHaAplicada, 1)} ha</td><td>${escapeHtml(produto)}</td><td>${kbrl(a.custoTotal)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  window.concluirLembrete = (id) => {
    const db = getDB();
    const lembrete = db.lembretes.find(l => l.id === id);
    if (lembrete) lembrete.concluido = true;
    setDB(db);
    toast("Lembrete concluído", "");
    pageDashboard();
  };
}

function pageOpsCenter() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  const talhoes = onlySafra(db.talhoes);
  const estoque = onlySafra(db.estoque || []);
  const diesel = onlySafra(db.dieselEstoque || []);
  const aplicacoes = onlySafra(db.aplicacoes || []);
  const combustivel = onlySafra(db.combustivel || []);
  const parametros = db.parametros || { precoSoja: 120 };

  const negEstoque = estoque.filter(s => Number(s.qtd || 0) < 0);
  const negDiesel = diesel.filter(d => Number(d.litros || 0) < 0);
  const custoTal = calcCustosPorTalhao(db);

  // Calcular receita potencial para talhões de soja
  const talhoesSoja = talhoes.filter(t => t.cultura?.toLowerCase() === 'soja');
  const prodMin = parametros.produtividadeMinSoja || 65;
  const prodMax = parametros.produtividadeMaxSoja || 75;
  const precoSoja = parametros.precoSoja || 120;

  const receitaPotencial = talhoesSoja.reduce((acc, t) => {
    const area = Number(t.areaHa || 0);
    const receitaMin = area * prodMin * precoSoja;
    const receitaMax = area * prodMax * precoSoja;
    return acc + (receitaMin + receitaMax) / 2;
  }, 0);

  const custoTotal = custoTal.reduce((acc, t) => acc + t.custoTotal, 0);
  const lucroPotencial = receitaPotencial - custoTotal;

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card"><h3>Alertas estoque</h3><div class="big">${negEstoque.length}</div></div>
      <div class="card"><h3>Alertas diesel</h3><div class="big">${negDiesel.length}</div></div>
      <div class="card"><h3>Aplicações</h3><div class="big">${aplicacoes.length}</div></div>
      <div class="card"><h3>Lucro Potencial</h3><div class="big">${kbrl(lucroPotencial)}</div></div>
    </div>
    
    <div class="card" style="margin-bottom:20px;">
      <h3>📊 Resumo Financeiro</h3>
      <table style="width:100%;">
        <tr><td>Custo total (todos talhões):</td><td>${kbrl(custoTotal)}</td></tr>
        <tr><td>Receita potencial (soja):</td><td>${kbrl(receitaPotencial)}</td></tr>
        <tr><td><b>Lucro potencial:</b></td><td><b>${kbrl(lucroPotencial)}</b></td></tr>
      </table>
    </div>

    <div class="tableWrap">
      <h3>Custos por talhão</h3>
      <table>
        <thead><tr><th>Talhão</th><th>Custo total</th><th>Custo/ha</th><th>Receita est.</th><th>Lucro est.</th></tr></thead>
        <tbody>${custoTal.map(r => {
          const area = r.areaHa;
          let receita = 0;
          if (r.cultura?.toLowerCase() === 'soja') {
            receita = area * ((prodMin + prodMax) / 2) * precoSoja;
          }
          const lucro = receita - r.custoTotal;
          return `<tr>
            <td>${escapeHtml(r.talhao)}</td>
            <td>${kbrl(r.custoTotal)}</td>
            <td>${kbrl(r.custoHa)}</td>
            <td>${kbrl(receita)}</td>
            <td>${kbrl(lucro)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
  `;
}

function crudPage({ entityKey, subtitle, fields, columns, helpers }) {
  const db = getDB();
  const sid = getSafraId();

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  const formHtml = `
    <div class="card">
      <h3>Novo registro</h3>
      <div class="help">${escapeHtml(subtitle || "")}</div>
      <div class="hr"></div>
      <form id="frm" class="formGrid">
        ${fields.map(f => {
          const full = f.full ? "full" : "";
          if (f.type === "select") {
            const opts = (typeof f.options === "function" ? f.options(getDB()) : (f.options || []))
              .map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
            return `
              <div class="${full}">
                <small>${escapeHtml(f.label)}</small>
                <select class="select" name="${escapeHtml(f.key)}">${opts}</select>
              </div>
            `;
          }
          if (f.type === "textarea") {
            return `
              <div class="${full}">
                <small>${escapeHtml(f.label)}</small>
                <textarea class="textarea" name="${escapeHtml(f.key)}" placeholder="${escapeHtml(f.placeholder || "")}"></textarea>
              </div>
            `;
          }
          return `
            <div class="${full}">
              <small>${escapeHtml(f.label)}</small>
              <input class="input" name="${escapeHtml(f.key)}" type="${escapeHtml(f.type || "text")}" placeholder="${escapeHtml(f.placeholder || "")}" />
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
            ${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join("")}
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  content.innerHTML = `<div class="section">${formHtml}${tableHtml}</div>`;

  function renderTable() {
    const db2 = getDB();
    const rows0 = onlySafra(db2[entityKey] || []);
    const rows = helpers?.filter ? helpers.filter(rows0, db2) : rows0;

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(r => {
      const tds = columns.map(c => {
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
    }).join("") || `<tr><td colspan="${columns.length + 1}">Sem registros.</td></tr>`;
  }

  window.__del = (id) => {
    if (!confirm("Excluir este registro?")) return;
    const db2 = getDB();
    db2[entityKey] = (db2[entityKey] || []).filter(x => x.id !== id);
    if (helpers?.onDelete) helpers.onDelete(id, db2);
    setDB(db2);
    toast("Excluído", "Registro removido.");
    renderTable();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = { id: uid(entityKey.slice(0, 3)), safraId: sid };

    fields.forEach(f => {
      let v = fd.get(f.key);
      if (f.type === "number") v = Number(v || 0);
      obj[f.key] = v;
    });

    const db2 = getDB();
    if (helpers?.beforeSave) helpers.beforeSave(obj, db2);
    db2[entityKey] = db2[entityKey] || [];
    db2[entityKey].push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo", "Registro adicionado com sucesso.");
    renderTable();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    const rows = onlySafra(db2[entityKey] || []);
    downloadText(`${entityKey}-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  renderTable();
}

// Páginas específicas adaptadas para safra
function pageFazendas() {
  crudPage({
    entityKey: "fazendas",
    subtitle: "Unidades produtivas da safra atual.",
    fields: [
      { key: "nome", label: "Nome da fazenda", type: "text" },
      { key: "cidade", label: "Cidade", type: "text" },
      { key: "uf", label: "UF", type: "text" },
      { key: "areaHa", label: "Área total (ha)", type: "number" },
      { key: "observacoes", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      { key: "nome", label: "Fazenda" },
      { key: "cidade", label: "Cidade" },
      { key: "uf", label: "UF" },
      { key: "areaHa", label: "Área (ha)" },
      { key: "observacoes", label: "Obs." }
    ]
  });
}

function pageProdutos() {
  crudPage({
    entityKey: "produtos",
    subtitle: "Produtos disponíveis na safra atual.",
    fields: [
      { key: "tipo", label: "Tipo", type: "text", placeholder: "Herbicida/Fungicida..." },
      { key: "nome", label: "Nome comercial", type: "text" },
      { key: "ingrediente", label: "Ingrediente ativo", type: "text" },
      { key: "fabricante", label: "Fabricante", type: "text" },
      { key: "registro", label: "Registro/Mapa", type: "text" },
      { key: "preco", label: "Preço por unidade (R$)", type: "number", placeholder: "Ex: 45.90" },
      { key: "carenciaDias", label: "Carência (dias)", type: "number" },
      { key: "reentradaHoras", label: "Reentrada (horas)", type: "number" },
      { key: "unidade", label: "Unidade padrão", type: "text", placeholder: "L / kg" },
      { key: "pragasAlvo", label: "Pragas alvo (separadas por vírgula)", type: "text", placeholder: "ferrugem, lagarta" },
      { key: "obs", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      { key: "tipo", label: "Tipo" },
      { key: "nome", label: "Produto" },
      { key: "ingrediente", label: "Ingrediente" },
      { key: "preco", label: "Preço (R$)" },
      { key: "unidade", label: "Unid." }
    ],
    helpers: {
      onDelete: (id, db) => {
        db.estoque = (db.estoque || []).filter(s => s.produtoId !== id);
      },
      beforeSave: (obj, db) => {
        if (obj.pragasAlvo && typeof obj.pragasAlvo === 'string') {
          obj.pragasAlvo = obj.pragasAlvo.split(',').map(s => s.trim()).filter(s => s);
        } else {
          obj.pragasAlvo = obj.pragasAlvo || [];
        }
      }
    }
  });
}

function pageEstoque() {
  const db = getDB();
  const produtos = onlySafra(db.produtos);

  function encontrarRegistroExistente(db, produtoId, deposito) {
    return db.estoque.find(s => 
      s.safraId === getSafraId() && 
      s.produtoId === produtoId && 
      (s.deposito || "Central") === (deposito || "Central")
    );
  }

  setTopActions(`
    <button class="btn" id="btnExportCSV">Exportar CSV</button>
    <button class="btn primary" id="btnReabastecer">+ Reabastecer produto</button>
  `);

  const content = document.getElementById("content");

  const formHtml = `
    <div class="card">
      <h3>Adicionar produto ao estoque</h3>
      <div class="help">Se o produto já existir no mesmo depósito, a quantidade será somada.</div>
      <div class="hr"></div>
      <form id="frm" class="formGrid">
        <div>
          <small>Produto</small>
          <select class="select" name="produtoId" required>
            <option value="">Selecione...</option>
            ${produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)}</option>`).join('')}
          </select>
        </div>
        <div><small>Depósito</small><input class="input" name="deposito" placeholder="Central" value="Central" /></div>
        <div><small>Lote</small><input class="input" name="lote" placeholder="Opcional" /></div>
        <div><small>Validade</small><input class="input" name="validade" placeholder="YYYY-MM-DD" /></div>
        <div><small>Quantidade</small><input class="input" name="qtd" type="number" step="0.01" required /></div>
        <div><small>Unidade</small><input class="input" name="unidade" placeholder="L / kg" readonly /></div>
        <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
        <div class="full row" style="justify-content:flex-end">
          <button class="btn primary" type="submit">Adicionar ao estoque</button>
        </div>
      </form>
    </div>
  `;

  const modalReabastecer = `
    <div id="modalReabastecer" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; justify-content:center; align-items:center;">
      <div style="background:#1a1a1f; padding:20px; border-radius:12px; width:400px;">
        <h3>Reabastecer produto</h3>
        <div class="hr"></div>
        <select class="select" id="reabastecerProduto" style="width:100%; margin-bottom:10px;">
          <option value="">Selecione um produto...</option>
          ${produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}
        </select>
        <input class="input" id="reabastecerDeposito" placeholder="Depósito" value="Central" style="width:100%; margin-bottom:10px;" />
        <input class="input" id="reabastecerQtd" type="number" step="0.01" placeholder="Quantidade a adicionar" style="width:100%; margin-bottom:10px;" />
        <input class="input" id="reabastecerLote" placeholder="Lote (opcional)" style="width:100%; margin-bottom:10px;" />
        <input class="input" id="reabastecerValidade" placeholder="Validade (opcional)" style="width:100%; margin-bottom:10px;" />
        <textarea class="textarea" id="reabastecerObs" placeholder="Observações" style="width:100%; margin-bottom:10px;"></textarea>
        <div class="row" style="justify-content:flex-end; gap:10px;">
          <button class="btn" onclick="fecharModalReabastecer()">Cancelar</button>
          <button class="btn primary" onclick="confirmarReabastecer()">Reabastecer</button>
        </div>
      </div>
    </div>
  `;

  const tableHtml = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Depósito</th>
            <th>Lote</th>
            <th>Validade</th>
            <th>Qtd</th>
            <th>Unid.</th>
            <th>Obs</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    ${modalReabastecer}
  `;

  content.innerHTML = `<div class="section">${formHtml}${tableHtml}</div>`;

  window.fecharModalReabastecer = () => {
    document.getElementById('modalReabastecer').style.display = 'none';
  };

  window.confirmarReabastecer = () => {
    const produtoId = document.getElementById('reabastecerProduto').value;
    const deposito = document.getElementById('reabastecerDeposito').value || 'Central';
    const qtd = parseFloat(document.getElementById('reabastecerQtd').value);
    const lote = document.getElementById('reabastecerLote').value;
    const validade = document.getElementById('reabastecerValidade').value;
    const obs = document.getElementById('reabastecerObs').value;

    if (!produtoId || !qtd || qtd <= 0) {
      alert('Selecione um produto e informe uma quantidade válida');
      return;
    }

    const db2 = getDB();
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const existente = db2.estoque.find(s => 
      s.safraId === getSafraId() && 
      s.produtoId === produtoId && 
      s.deposito === deposito
    );

    if (existente) {
      existente.qtd = Number(existente.qtd || 0) + qtd;
      existente.obs = obs || existente.obs;
      if (lote) existente.lote = lote;
      if (validade) existente.validade = validade;
      toast("Reabastecido", `${produto.nome} agora tem ${existente.qtd} ${existente.unidade}`);
    } else {
      db2.estoque.push({
        id: uid("stk"),
        safraId: getSafraId(),
        produtoId,
        deposito,
        lote: lote || "",
        validade: validade || "",
        qtd,
        unidade: produto.unidade,
        obs: obs || ""
      });
      toast("Novo produto", `${produto.nome} adicionado ao estoque`);
    }

    setDB(db2);
    fecharModalReabastecer();
    renderTable();
  };

  document.getElementById("btnReabastecer").addEventListener("click", () => {
    document.getElementById('modalReabastecer').style.display = 'flex';
  });

  document.querySelector('select[name="produtoId"]').addEventListener('change', (e) => {
    const produto = produtos.find(p => p.id === e.target.value);
    if (produto) {
      document.querySelector('input[name="unidade"]').value = produto.unidade;
    }
  });

  function renderTable() {
    const db2 = getDB();
    const rows = onlySafra(db2.estoque || []);
    const tb = document.getElementById("tbody");

    tb.innerHTML = rows.map(r => {
      const p = produtos.find(p => p.id === r.produtoId);
      const nome = p ? `${p.nome} (${p.tipo})` : "(sem produto)";
      return `
        <tr>
          <td><b>${escapeHtml(nome)}</b></td>
          <td>${escapeHtml(r.deposito || "Central")}</td>
          <td>${escapeHtml(r.lote || "")}</td>
          <td>${escapeHtml(r.validade || "")}</td>
          <td><b>${num(r.qtd || 0, 2)}</b></td>
          <td>${escapeHtml(r.unidade || "")}</td>
          <td>${escapeHtml(r.obs || "")}</td>
          <td class="noPrint">
            <button class="btn" onclick="reabastecerRapido('${r.id}')" style="margin-right:5px;">➕</button>
            <button class="btn danger" onclick="window.__del('${r.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join("") || '<tr><td colspan="8">Nenhum item no estoque.</td></tr>';
  }

  window.reabastecerRapido = (estoqueId) => {
    const db2 = getDB();
    const item = db2.estoque.find(s => s.id === estoqueId);
    if (!item) return;

    const qtd = prompt(`Quantidade adicional para ${item.produtoNome || 'este produto'}:`, "0");
    if (!qtd) return;
    
    const qtdNum = parseFloat(qtd);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      alert("Quantidade inválida");
      return;
    }

    item.qtd = Number(item.qtd || 0) + qtdNum;
    setDB(db2);
    toast("Reabastecido", `+${qtdNum} ${item.unidade} adicionados`);
    renderTable();
  };

  window.__del = (id) => {
    if (!confirm("Excluir este item do estoque?")) return;
    const db2 = getDB();
    db2.estoque = db2.estoque.filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Item removido do estoque.");
    renderTable();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    const produtoId = fd.get("produtoId");
    const deposito = fd.get("deposito") || "Central";
    const qtd = Number(fd.get("qtd") || 0);
    const lote = fd.get("lote") || "";
    const validade = fd.get("validade") || "";
    const unidade = fd.get("unidade") || "";
    const obs = fd.get("obs") || "";

    if (!produtoId || qtd <= 0) {
      alert("Selecione um produto e informe quantidade > 0");
      return;
    }

    const db2 = getDB();
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const existente = db2.estoque.find(s => 
      s.safraId === getSafraId() && 
      s.produtoId === produtoId && 
      s.deposito === deposito
    );

    if (existente) {
      existente.qtd = Number(existente.qtd || 0) + qtd;
      existente.obs = obs || existente.obs;
      if (lote) existente.lote = lote;
      if (validade) existente.validade = validade;
      toast("Estoque atualizado", `${produto.nome} agora tem ${existente.qtd} ${existente.unidade}`);
    } else {
      db2.estoque.push({
        id: uid("stk"),
        safraId: getSafraId(),
        produtoId,
        deposito,
        lote,
        validade,
        qtd,
        unidade: produto.unidade,
        obs
      });
      toast("Produto adicionado", `${produto.nome} adicionado ao estoque`);
    }

    setDB(db2);
    e.target.reset();
    document.querySelector('input[name="unidade"]').value = '';
    renderTable();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    const rows = onlySafra(db2.estoque || []).map(r => {
      const p = produtos.find(p => p.id === r.produtoId);
      return {
        Produto: p ? p.nome : "Desconhecido",
        Depósito: r.deposito,
        Lote: r.lote,
        Validade: r.validade,
        Quantidade: r.qtd,
        Unidade: r.unidade,
        Observações: r.obs
      };
    });
    downloadText(`estoque-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  renderTable();
}

function pageTalhoes() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);

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
              ${fazendas.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
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

  function render() {
    const db2 = getDB();
    const rows = onlySafra(db2.talhoes || []);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(t => {
      const faz = findNameById(onlySafra(db2.fazendas), t.fazendaId);
      return `
        <tr>
          <td><b>${escapeHtml(t.nome || "")}</b></td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(num(t.areaHa || 0, 1))}</td>
          <td>${escapeHtml(t.cultura || "")}</td>
          <td>${escapeHtml(t.safra || "")}</td>
          <td>${escapeHtml(t.solo || "")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delTal('${t.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">Sem talhões.</td></tr>`;

    const custos = calcCustosPorTalhao(db2);
    const tbC = document.getElementById("tbodyCustos");
    tbC.innerHTML = custos.map(r => `
      <tr>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(r.fazenda)}</td>
        <td>${escapeHtml(num(r.areaHa || 0, 1))}</td>
        <td><b>${escapeHtml(kbrl(r.custoTotal || 0))}</b></td>
        <td>${escapeHtml(kbrl(r.custoHa || 0))}</td>
        <td>${escapeHtml(String(r.ops || 0))}</td>
        <td>${escapeHtml(r.last || "-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="7">Sem dados.</td></tr>`;
  }

  window.__delTal = (id) => {
    if (!confirm("Excluir este talhão?")) return;
    const db2 = getDB();
    db2.talhoes = (db2.talhoes || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Talhão removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("tal"),
      safraId: getSafraId(),
      fazendaId: fd.get("fazendaId"),
      nome: fd.get("nome"),
      areaHa: Number(fd.get("areaHa") || 0),
      cultura: fd.get("cultura") || "",
      safra: fd.get("safra") || "",
      solo: fd.get("solo") || "",
      coordenadas: fd.get("coordenadas") || "",
      observacoes: fd.get("observacoes") || ""
    };
    const db2 = getDB();
    db2.talhoes = db2.talhoes || [];
    db2.talhoes.push(obj);
    setDB(db2);
    e.target.reset();
    toast("Salvo", "Talhão adicionado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlySafra(db2.talhoes || [])));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageCombustivel() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  const talhoes = onlySafra(db.talhoes);
  const equipe = onlySafra(db.equipe);
  const maquinas = onlySafra(db.maquinas);
  const tanques = onlySafra(db.dieselEstoque);
  const entradas = onlySafra(db.dieselEntradas || []).sort((a, b) => b.data.localeCompare(a.data));

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr, labelKey = "nome") {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o[labelKey] || "")}</option>`).join("");
  }

  const depositoOptions = tanques.map(t => `<option value="${escapeHtml(t.deposito || "Tanque Principal")}">${escapeHtml(t.deposito || "Tanque Principal")}</option>`).join("");

  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Diesel (tanque total)</h3>
        <div class="big">${num(tanques.reduce((s, t) => s + Number(t.litros || 0), 0), 1)} L</div>
        <div class="sub">${tanques.some(t => Number(t.litros || 0) < 0) ? '<span class="pill bad">Negativo</span>' : '<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Preço vigente</h3>
        <div class="big">${kbrl(tanques[0]?.precoVigente || 0)}/L</div>
        <div class="sub">Última entrada</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>⛽ Registrar entrada de diesel</h3>
        <div class="help">Registre a compra de diesel para abastecer o tanque.</div>
        <div class="hr"></div>
        <form id="frmEntrada" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div class="full">
            <small>Depósito / Tanque</small>
            <select class="select" name="deposito">${depositoOptions || `<option value="Tanque Principal">Tanque Principal</option>`}</select>
          </div>
          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required /></div>
          <div><small>Preço por litro (R$)</small><input class="input" name="precoLitro" type="number" step="0.01" placeholder="0" required /></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Registrar entrada</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>🚜 Registrar abastecimento (saída)</h3>
        <div class="help">Registre o abastecimento de máquinas. O custo usará o preço da última entrada.</div>
        <div class="hr"></div>
        <form id="frmSaida" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div class="full">
            <small>Depósito / Tanque</small>
            <select class="select" name="deposito">${depositoOptions || `<option value="Tanque Principal">Tanque Principal</option>`}</select>
          </div>
          <div><small>Fazenda</small><select class="select" name="fazendaId" required>${optionList(fazendas)}</select></div>
          <div><small>Talhão (opcional)</small><select class="select" name="talhaoId"><option value="">(sem talhão)</option>${optionList(talhoes)}</select></div>
          <div><small>Máquina</small><select class="select" name="maquinaId"><option value="">(opcional)</option>${optionList(maquinas)}</select></div>
          <div><small>Operador</small><select class="select" name="operadorId"><option value="">(opcional)</option>${optionList(equipe)}</select></div>
          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required /></div>
          <div><small>KM ou Horímetro</small><input class="input" name="kmOuHora" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Posto</small><input class="input" name="posto" placeholder="Posto / NF / origem" /></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Registrar saída</button>
          </div>
        </form>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:20px;">
      <h3>📋 Entradas de diesel</h3>
      <table>
        <thead>
          <tr><th>Data</th><th>Depósito</th><th>Litros</th><th>Preço/L</th><th>Total</th><th>Obs</th></tr>
        </thead>
        <tbody>
          ${entradas.map(e => `
            <tr>
              <td>${e.data}</td>
              <td>${escapeHtml(e.deposito)}</td>
              <td>${num(e.litros, 1)}</td>
              <td>${kbrl(e.precoLitro)}</td>
              <td>${kbrl(e.litros * e.precoLitro)}</td>
              <td>${escapeHtml(e.obs || '')}</td>
            </tr>
          `).join('') || '<tr><td colspan="6">Sem entradas</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="tableWrap" style="margin-top:20px;">
      <h3>📋 Abastecimentos</h3>
      <table>
        <thead>
          <tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Litros</th><th>Preço/L</th><th>Custo</th></tr>
        </thead>
        <tbody id="tbodySaidas"></tbody>
      </table>
    </div>
  `;

  function renderSaidas() {
    const db2 = getDB();
    const rows = onlySafra(db2.combustivel || []).sort((a, b) => b.data.localeCompare(a.data));
    const tb = document.getElementById("tbodySaidas");
    tb.innerHTML = rows.map(c => {
      const faz = findNameById(onlySafra(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlySafra(db2.talhoes), c.talhaoId) : "—";
      return `
        <tr>
          <td>${c.data}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td>${num(c.litros, 1)}</td>
          <td>${kbrl(c.precoLitro)}</td>
          <td>${kbrl(c.litros * c.precoLitro)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6">Sem abastecimentos</td></tr>';
  }

  document.getElementById("frmEntrada").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const litros = Number(fd.get("litros") || 0);
    if (litros <= 0) { alert("Litros deve ser > 0"); return; }
    const precoLitro = Number(fd.get("precoLitro") || 0);
    if (precoLitro <= 0) { alert("Preço deve ser > 0"); return; }

    const db2 = getDB();
    registrarEntradaDiesel(
      db2,
      fd.get("deposito") || "Tanque Principal",
      litros,
      precoLitro,
      fd.get("data") || nowISO(),
      fd.get("obs") || ""
    );
    setDB(db2);
    e.target.reset();
    toast("Entrada registrada", "Diesel adicionado ao estoque.");
    pageCombustivel();
  });

  document.getElementById("frmSaida").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const litros = Number(fd.get("litros") || 0);
    if (litros <= 0) { alert("Litros deve ser > 0"); return; }

    const db2 = getDB();
    const deposito = fd.get("deposito") || "Tanque Principal";
    const tank = db2.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
    if (!tank) { alert("Tanque não encontrado"); return; }

    const res = baixaDiesel(db2, deposito, litros);
    if (!res.ok) { alert(res.msg); return; }

    const obj = {
      id: uid("cmb"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      tipo: "Diesel S10",
      deposito,
      posto: fd.get("posto") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId") || "",
      litros,
      precoLitro: res.precoLitro,
      kmOuHora: Number(fd.get("kmOuHora") || 0),
      obs: fd.get("obs") || ""
    };

    db2.combustivel = db2.combustivel || [];
    db2.combustivel.push(obj);
    setDB(db2);
    e.target.reset();
    toast("Saída registrada", "Abastecimento concluído.");
    renderSaidas();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlySafra(db2.combustivel || [])));
    toast("Exportado", "CSV baixado.");
  });

  renderSaidas();
}

function pageClima() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  const talhoes = onlySafra(db.talhoes);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big" id="kpiHoje">0,0 mm</div>
        <div class="sub">Somatório do dia (safra)</div>
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
        <div class="help">
          Cada lançamento fica salvo no histórico. O acumulado do talhão é a soma de todos os lançamentos desse talhão.
        </div>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>

          <div>
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>
              ${fazendas.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Talhão</small>
            <select class="select" name="talhaoId">
              <option value="">(Geral / sem talhão)</option>
              ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
            </select>
          </div>

          <div><small>Chuva (mm)</small><input class="input" name="chuvaMm" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Temp min (°C)</small><input class="input" name="tempMin" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Temp max (°C)</small><input class="input" name="tempMax" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" step="1" placeholder="0" /></div>
          <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" step="0.1" placeholder="0" /></div>

          <div class="full">
            <small>Observações</small>
            <textarea class="textarea" name="obs" placeholder="Ex.: chuva isolada, temporal, estação, observações..."></textarea>
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
              <th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Acumulado (mm)</th><th>Última data</th>
            </tr>
          </thead>
          <tbody id="tbodyAcum"></tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Chuva (mm)</th><th>Temp máx</th><th>Vento</th><th>Obs</th><th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  function parseISO(d) {
    const [y, m, day] = String(d || "").split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day, 0, 0, 0, 0);
  }

  function inLastDays(recDateISO, days) {
    const dt = parseISO(recDateISO);
    if (!dt) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const min = new Date(start.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return dt >= min && dt <= start;
  }

  function calcKPIs(rows) {
    const hoje = nowISO();
    const chuvaHoje = rows.filter(r => r.data === hoje).reduce((s, x) => s + Number(x.chuvaMm || 0), 0);
    const chuva7d = rows.filter(r => inLastDays(r.data, 7)).reduce((s, x) => s + Number(x.chuvaMm || 0), 0);
    const chuva30d = rows.filter(r => inLastDays(r.data, 30)).reduce((s, x) => s + Number(x.chuvaMm || 0), 0);

    const elHoje = document.getElementById("kpiHoje");
    const el7 = document.getElementById("kpi7d");
    const el30 = document.getElementById("kpi30d");
    const elCnt = document.getElementById("kpiCount");

    if (elHoje) elHoje.textContent = `${num(chuvaHoje, 1)} mm`;
    if (el7) el7.textContent = `${num(chuva7d, 1)} mm`;
    if (el30) el30.textContent = `${num(chuva30d, 1)} mm`;
    if (elCnt) elCnt.textContent = String(rows.length);
  }

  function render() {
    const db2 = getDB();
    const rows = onlySafra(db2.clima || []);

    calcKPIs(rows);

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a, b) => (b.data || "").localeCompare(a.data || "")).map(c => {
      const faz = findNameById(onlySafra(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlySafra(db2.talhoes), c.talhaoId) : "Geral";
      return `
        <tr>
          <td>${escapeHtml(c.data || "")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td>${escapeHtml(num(c.chuvaMm || 0, 1))}</td>
          <td>${escapeHtml(c.tempMax ?? "")}</td>
          <td>${escapeHtml(c.vento ?? "")}</td>
          <td>${escapeHtml(c.obs || "")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delClima('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem registros.</td></tr>`;

    // acumulado por talhão
    const byTalhao = new Map();
    for (const r of rows) {
      if (!r.talhaoId) continue;
      const cur = byTalhao.get(r.talhaoId) || { mm: 0, last: "" };
      cur.mm += Number(r.chuvaMm || 0);
      if ((r.data || "") > (cur.last || "")) cur.last = r.data || "";
      byTalhao.set(r.talhaoId, cur);
    }

    const tbA = document.getElementById("tbodyAcum");
    const list = talhoes.map(t => {
      const info = byTalhao.get(t.id) || { mm: 0, last: "" };
      const faz = findNameById(onlySafra(db2.fazendas), t.fazendaId);
      return { talhao: t.nome, fazenda: faz, areaHa: Number(t.areaHa || 0), mm: info.mm, last: info.last || "-" };
    }).sort((a, b) => b.mm - a.mm);

    tbA.innerHTML = list.map(r => `
      <tr>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(r.fazenda)}</td>
        <td>${escapeHtml(num(r.areaHa || 0, 1))}</td>
        <td><b>${escapeHtml(num(r.mm || 0, 1))}</b></td>
        <td>${escapeHtml(r.last)}</td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem talhões.</td></tr>`;
  }

  window.__delClima = (id) => {
    if (!confirm("Excluir este lançamento de clima/chuva?")) return;
    const db2 = getDB();
    db2.clima = (db2.clima || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Lançamento removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("cli"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId") || "",
      chuvaMm: Number(fd.get("chuvaMm") || 0),
      tempMin: Number(fd.get("tempMin") || 0),
      tempMax: Number(fd.get("tempMax") || 0),
      umidade: Number(fd.get("umidade") || 0),
      vento: Number(fd.get("vento") || 0),
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.clima = db2.clima || [];
    db2.clima.push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo", "Lançamento registrado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`clima-${nowISO()}.csv`, toCSV(onlySafra(db2.clima || [])));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageEquipe() {
  crudPage({
    entityKey: "equipe",
    subtitle: "Equipe de campo da safra atual.",
    fields: [
      { key: "nome", label: "Nome", type: "text" },
      { key: "funcao", label: "Função", type: "text", placeholder: "Tratorista / Encarregado / Agrônomo..." },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "nr", label: "NR/Certificações", type: "text", placeholder: "NR-31 / Treinamentos..." },
      { key: "obs", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      { key: "nome", label: "Nome" },
      { key: "funcao", label: "Função" },
      { key: "telefone", label: "Telefone" },
      { key: "nr", label: "NR/Cert." },
      { key: "obs", label: "Obs." }
    ]
  });
}

function pageMaquinas() {
  crudPage({
    entityKey: "maquinas",
    subtitle: "Equipamentos disponíveis na safra atual.",
    fields: [
      { key: "nome", label: "Máquina/equipamento", type: "text", placeholder: "Pulverizador / Trator / Drone..." },
      { key: "placa", label: "Placa/Identificação", type: "text" },
      { key: "horimetro", label: "Horímetro", type: "number" },
      { key: "capacidadeL", label: "Capacidade (L)", type: "number" },
      { key: "bicos", label: "Bicos/Barra", type: "text", placeholder: "Leque 11002 / Cone..." },
      { key: "obs", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      { key: "nome", label: "Máquina" },
      { key: "placa", label: "ID/Placa" },
      { key: "horimetro", label: "Horímetro" },
      { key: "capacidadeL", label: "Capacidade (L)" },
      { key: "bicos", label: "Bicos" }
    ]
  });
}

function pageAplicacoes() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  const talhoes = onlySafra(db.talhoes);
  const equipe = onlySafra(db.equipe);
  const maquinas = onlySafra(db.maquinas);
  const produtos = onlySafra(db.produtos);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr) { 
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join(""); 
  }

  function produtoOptions() {
    return produtos.map(p => `<option value="${p.id}" data-preco="${p.preco || 0}" data-unidade="${p.unidade}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)} (R$ ${p.preco || 0}/${p.unidade})</option>`).join("");
  }

  // Template da página
  content.innerHTML = `
    <div class="section">
      <!-- Formulário de aplicação -->
      <div class="card">
        <h3>📝 Registrar nova aplicação</h3>
        <div class="help">Preencha os dados da aplicação. O custo total é calculado automaticamente.</div>
        <div class="hr"></div>
        
        <form id="frm" class="formGrid">
          <!-- Linha 1: Data e Fazenda -->
          <div><small>📅 Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div><small>🏢 Fazenda</small><select class="select" name="fazendaId" required>${optionList(fazendas)}</select></div>
          
          <!-- Linha 2: Talhão e Área -->
          <div><small>🧭 Talhão</small><select class="select" name="talhaoId" required>${optionList(talhoes)}</select></div>
          <div><small>📏 Área aplicada (ha)</small><input class="input" name="areaHaAplicada" type="number" step="0.1" required /></div>
          
          <!-- Linha 3: Cultura e Alvo -->
          <div><small>🌱 Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>🎯 Alvo</small><input class="input" name="alvo" placeholder="Praga / Doença" /></div>
          
          <!-- Linha 4: Operação e Máquina -->
          <div><small>🚜 Operação</small><input class="input" name="operacao" placeholder="Pulverização" /></div>
          <div><small>⚙️ Máquina</small><select class="select" name="maquinaId"><option value="">(opcional)</option>${optionList(maquinas)}</select></div>
          
          <!-- Linha 5: Operador e Condições -->
          <div><small>👤 Operador</small><select class="select" name="operadorId"><option value="">(opcional)</option>${optionList(equipe)}</select></div>
          <div><small>🌬️ Vento (km/h)</small><input class="input" name="vento" type="number" /></div>
          
          <!-- Linha 6: Temperatura e Umidade -->
          <div><small>🌡️ Temperatura (°C)</small><input class="input" name="temp" type="number" /></div>
          <div><small>💧 Umidade (%)</small><input class="input" name="umidade" type="number" /></div>

          <!-- SEÇÃO DE PRODUTOS -->
          <div class="full">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <h4 style="margin:0;">🧪 Produtos aplicados</h4>
              <button type="button" class="btn primary" id="btnAdicionarProduto" style="font-size:12px;">+ Adicionar produto</button>
            </div>
            <div class="help">Selecione o produto e informe a dose por hectare. O custo será somado automaticamente.</div>
            <div class="hr"></div>
            
            <div id="produtos-container">
              <!-- A primeira linha de produto já vem pré-carregada -->
              <div class="produto-linha" style="display:grid; grid-template-columns: 3fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px; align-items:center;">
                <select class="select" name="produtoId[]" onchange="atualizarPrecoUnit(this, 0)">
                  <option value="">Selecione um produto...</option>
                  ${produtoOptions()}
                </select>
                <input class="input" name="dose[]" type="number" step="0.01" placeholder="Dose/ha" onchange="calcularCustoTotal()" />
                <span class="badge" id="unidade-0" style="background:#2a2a30; padding:8px; text-align:center;">—</span>
                <span class="badge" id="custo-0" style="background:#2a2a30; color:#4CAF50; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
              </div>
            </div>
          </div>

          <!-- Observações -->
          <div class="full">
            <small>📝 Observações</small>
            <textarea class="textarea" name="obs" placeholder="Informações adicionais..."></textarea>
          </div>

          <!-- RESUMO DE CUSTOS -->
          <div class="full" style="margin-top:20px;">
            <div style="background: linear-gradient(135deg, #1a2a3a, #0f1a24); padding:20px; border-radius:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h4 style="margin:0; color:#888;">💵 CUSTO TOTAL ESTIMADO</h4>
                  <div style="font-size:32px; font-weight:bold; color:#4CAF50;" id="custoTotalDisplay">R$ 0,00</div>
                </div>
                <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar aplicação</button>
              </div>
              <div style="margin-top:10px; font-size:12px; color:#888;" id="detalheCusto">
                Nenhum produto selecionado
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Tabela de aplicações recentes -->
      <div class="tableWrap" style="margin-top:20px;">
        <h3>📋 Últimas aplicações</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Talhão</th>
              <th>Área</th>
              <th>Produtos</th>
              <th>Custo</th>
              <th style="text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // Contador de linhas de produto
  let produtoCount = 1;

  // Função para adicionar nova linha de produto
  document.getElementById("btnAdicionarProduto").addEventListener("click", () => {
    const container = document.getElementById("produtos-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "produto-linha";
    novaLinha.style.display = "grid";
    novaLinha.style.gridTemplateColumns = "3fr 1fr 1fr 1fr";
    novaLinha.style.gap = "10px";
    novaLinha.style.marginBottom = "10px";
    novaLinha.style.alignItems = "center";
    
    novaLinha.innerHTML = `
      <select class="select" name="produtoId[]" onchange="atualizarPrecoUnit(this, ${produtoCount})">
        <option value="">Selecione um produto...</option>
        ${produtoOptions()}
      </select>
      <input class="input" name="dose[]" type="number" step="0.01" placeholder="Dose/ha" onchange="calcularCustoTotal()" />
      <span class="badge" id="unidade-${produtoCount}" style="background:#2a2a30; padding:8px; text-align:center;">—</span>
      <div style="display:flex; gap:5px;">
        <span class="badge" id="custo-${produtoCount}" style="background:#2a2a30; color:#4CAF50; padding:8px; text-align:center; font-weight:bold; flex:1;">R$ 0,00</span>
        <button type="button" class="btn danger" style="padding:8px;" onclick="removerLinhaProduto(this)">✕</button>
      </div>
    `;
    
    container.appendChild(novaLinha);
    produtoCount++;
  });

  // Função para remover linha de produto
  window.removerLinhaProduto = (botao) => {
    if (document.querySelectorAll('.produto-linha').length <= 1) {
      toast("Aviso", "Mantenha pelo menos um produto");
      return;
    }
    botao.closest('.produto-linha').remove();
    calcularCustoTotal();
  };

  // Função para atualizar preço unitário e unidade
  window.atualizarPrecoUnit = (select, index) => {
    const opt = select.options[select.selectedIndex];
    const unidade = opt.dataset.unidade || '';
    document.getElementById(`unidade-${index}`).innerText = unidade || '—';
    calcularCustoTotal();
  };

  // Função principal de cálculo de custo
  window.calcularCustoTotal = () => {
    let total = 0;
    const area = parseFloat(document.querySelector('input[name="areaHaAplicada"]').value) || 0;
    const linhas = document.querySelectorAll('.produto-linha');
    let detalhes = [];

    linhas.forEach((linha, idx) => {
      const select = linha.querySelector('select[name="produtoId[]"]');
      const dose = parseFloat(linha.querySelector('input[name="dose[]"]').value) || 0;
      
      if (select && select.value && dose > 0) {
        const opt = select.options[select.selectedIndex];
        const precoUnit = parseFloat(opt.dataset.preco) || 0;
        const produtoNome = opt.text.split(' — ')[0];
        const custoLinha = precoUnit * dose * area;
        
        total += custoLinha;
        linha.querySelector(`#custo-${idx}`).innerText = kbrl(custoLinha);
        linha.querySelector(`#custo-${idx}`).style.color = '#4CAF50';
        
        detalhes.push(`${produtoNome}: ${num(dose,2)} ${opt.dataset.unidade || ''} × ${num(area,1)} ha = ${kbrl(custoLinha)}`);
      } else {
        const custoEl = linha.querySelector(`#custo-${idx}`);
        if (custoEl) {
          custoEl.innerText = 'R$ 0,00';
          custoEl.style.color = '#888';
        }
      }
    });

    // Atualizar display
    document.getElementById('custoTotalDisplay').innerText = kbrl(total);
    
    const detalheEl = document.getElementById('detalheCusto');
    if (detalhes.length > 0) {
      detalheEl.innerHTML = detalhes.join('<br>');
    } else {
      detalheEl.innerHTML = 'Nenhum produto selecionado';
    }

    return total;
  };

  // Atualizar quando a área mudar
  document.querySelector('input[name="areaHaAplicada"]').addEventListener('input', calcularCustoTotal);

  // Renderizar tabela de aplicações
  function render() {
    const db2 = getDB();
    const rows = onlySafra(db2.aplicacoes || []);
    const tb = document.getElementById("tbody");
    
    tb.innerHTML = rows.slice().reverse().map(a => {
      const tal = findNameById(talhoes, a.talhaoId);
      const prds = (a.produtos || []).map(p => p.produtoNome).join(' + ');
      const corCusto = a.custoTotal > 1000 ? '#4CAF50' : (a.custoTotal > 500 ? '#FF9800' : '#888');
      
      return `
        <tr>
          <td>${a.data}</td>
          <td><b>${escapeHtml(tal)}</b></td>
          <td>${num(a.areaHaAplicada, 1)} ha</td>
          <td>${escapeHtml(prds || '—')}</td>
          <td><span style="color:${corCusto}; font-weight:bold;">${kbrl(a.custoTotal)}</span></td>
          <td style="text-align:center;">
            <button class="btn danger" style="padding:4px 8px;" onclick="window.__delA('${a.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" style="text-align:center;">Nenhuma aplicação registrada</td></tr>';
  }

  window.__delA = (id) => {
    if (!confirm("Excluir esta aplicação?")) return;
    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes.filter(x => x.id !== id);
    setDB(db2);
    toast("Excluída", "Aplicação removida");
    render();
  };

  // Submit do formulário
  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const area = Number(fd.get("areaHaAplicada") || 0);
    
    if (area <= 0) { 
      alert("Área deve ser > 0"); 
      return; 
    }

    // Coletar produtos
    const produtosArray = [];
    const produtoIds = fd.getAll("produtoId[]").filter(id => id); // Remove vazios
    const doses = fd.getAll("dose[]").map(d => Number(d) || 0);

    for (let i = 0; i < produtoIds.length; i++) {
      if (produtoIds[i] && doses[i] > 0) {
        const produto = produtos.find(p => p.id === produtoIds[i]);
        if (produto) {
          produtosArray.push({
            produtoId: produto.id,
            produtoNome: produto.nome,
            dosePorHa: doses[i],
            unidade: produto.unidade,
            precoUnit: produto.preco || 0
          });
        }
      }
    }

    if (produtosArray.length === 0) {
      alert("Selecione pelo menos um produto com dose válida");
      return;
    }

    // Calcular custo total
    const custoTotal = produtosArray.reduce((acc, p) => {
      return acc + (p.precoUnit * p.dosePorHa * area);
    }, 0);

    const obj = {
      id: uid("apl"),
      safraId: getSafraId(),
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
        vento: Number(fd.get("vento") || 0),
        temp: Number(fd.get("temp") || 0),
        umidade: Number(fd.get("umidade") || 0)
      },
      produtos: produtosArray,
      custoTotal: custoTotal,
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes || [];
    db2.aplicacoes.push(obj);

    // Baixar estoque
    const msgs = [];
    for (const p of produtosArray) {
      const qtd = p.dosePorHa * area;
      const res = baixaEstoqueProdutoPorId(db2, p.produtoId, qtd, p.unidade);
      if (res.ok) msgs.push(res.msg);
    }

    setDB(db2);
    e.target.reset();
    
    // Reset visual
    document.querySelectorAll('.produto-linha').forEach((linha, idx) => {
      if (idx > 0) linha.remove();
      else {
        linha.querySelector('select').value = '';
        linha.querySelector('input[name="dose[]"]').value = '';
        document.getElementById(`unidade-0`).innerText = '—';
        document.getElementById(`custo-0`).innerText = 'R$ 0,00';
      }
    });
    produtoCount = 1;
    calcularCustoTotal();
    
    toast("Salvo", "Aplicação registrada. Baixa no estoque.");
    if (msgs.length) toast("Baixas", msgs.slice(0, 3).join(" • "));
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`aplicacoes-${nowISO()}.csv`, toCSV(onlySafra(db2.aplicacoes || [])));
  });

  render();
}

function pageRelatorios() {
  const db = getDB();
  const safra = getSafraAtual();
  const fazendas = onlySafra(db.fazendas);
  const talhoes = onlySafra(db.talhoes);
  const aplicacoes = onlySafra(db.aplicacoes);
  const clima = onlySafra(db.clima);
  const combustivel = onlySafra(db.combustivel);
  const produtos = onlySafra(db.produtos);
  const parametros = db.parametros || { precoSoja: 120 };

  setTopActions(`
    <button class="btn" id="btnExportPDF">📄 PDF</button>
    <button class="btn" id="btnExportExcel">📊 Excel</button>
    <button class="btn primary" id="btnPrint">🖨️ Imprimir</button>
  `);

  // Abas do relatório
  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .tab-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #2a2a30;
        padding-bottom: 10px;
      }
      .tab {
        padding: 10px 20px;
        background: #1a1a1f;
        border: 1px solid #2a2a30;
        border-radius: 8px 8px 0 0;
        cursor: pointer;
        color: #888;
        transition: all 0.2s;
      }
      .tab:hover {
        background: #25252b;
        color: #fff;
      }
      .tab.active {
        background: #00b09b;
        color: #fff;
        border-color: #00b09b;
      }
      .tab-content {
        display: none;
      }
      .tab-content.active {
        display: block;
      }
      .stat-card {
        background: #1a1a1f;
        border-radius: 8px;
        padding: 15px;
        border-left: 4px solid #00b09b;
      }
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #00b09b;
      }
      .stat-label {
        font-size: 12px;
        color: #888;
      }
      .progress-bar {
        width: 100%;
        height: 8px;
        background: #2a2a30;
        border-radius: 4px;
        overflow: hidden;
        margin: 10px 0;
      }
      .progress-fill {
        height: 100%;
        background: #00b09b;
        transition: width 0.3s;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
    </style>

    <div class="tab-bar">
      <div class="tab active" onclick="mudarAba('resumo')">📊 Resumo</div>
      <div class="tab" onclick="mudarAba('custos')">💰 Custos</div>
      <div class="tab" onclick="mudarAba('operacional')">🚜 Operacional</div>
      <div class="tab" onclick="mudarAba('comparativo')">📈 Comparativo</div>
    </div>

    <!-- Aba Resumo -->
    <div id="aba-resumo" class="tab-content active">
      ${renderResumo()}
    </div>

    <!-- Aba Custos -->
    <div id="aba-custos" class="tab-content">
      ${renderCustos()}
    </div>

    <!-- Aba Operacional -->
    <div id="aba-operacional" class="tab-content">
      ${renderOperacional()}
    </div>

    <!-- Aba Comparativo -->
    <div id="aba-comparativo" class="tab-content">
      ${renderComparativo()}
    </div>
  `;

  // Função para mudar de aba
  window.mudarAba = (aba) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.tab[onclick*="${aba}"]`).classList.add('active');
    document.getElementById(`aba-${aba}`).classList.add('active');
  };

  // ==================== FUNÇÕES DE RENDERIZAÇÃO ====================

  function renderResumo() {
    const totalArea = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
    const totalAplicacoes = aplicacoes.length;
    const custoTotal = aplicacoes.reduce((s, a) => s + Number(a.custoTotal || 0), 0);
    const custoCombustivel = combustivel.reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
    const custoGeral = custoTotal + custoCombustivel;
    
    // Produtos mais usados
    const usoProdutos = {};
    aplicacoes.forEach(a => {
      (a.produtos || []).forEach(p => {
        usoProdutos[p.produtoNome] = (usoProdutos[p.produtoNome] || 0) + 1;
      });
    });
    
    const topProdutos = Object.entries(usoProdutos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Últimas aplicações
    const ultimasApl = aplicacoes.slice().reverse().slice(0, 10);

    return `
      <div class="kpi-grid">
        <div class="stat-card">
          <div class="stat-label">🌱 Safra</div>
          <div class="stat-value">${escapeHtml(safra?.nome || 'Atual')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📏 Área total</div>
          <div class="stat-value">${num(totalArea, 1)} ha</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💰 Custo total</div>
          <div class="stat-value">${kbrl(custoGeral)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📊 Custo/ha</div>
          <div class="stat-value">${kbrl(totalArea ? custoGeral / totalArea : 0)}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <!-- Gráfico de evolução mensal -->
        <div class="card">
          <h4>📈 Evolução mensal de custos</h4>
          <div style="height:200px; display:flex; align-items:flex-end; gap:10px; margin-top:20px;">
            ${renderEvolucaoMensal()}
          </div>
        </div>

        <!-- Top produtos -->
        <div class="card">
          <h4>🧪 Produtos mais utilizados</h4>
          <table style="width:100%; margin-top:15px;">
            <thead>
              <tr><th>Produto</th><th>Vezes usada</th><th>%</th></tr>
            </thead>
            <tbody>
              ${topProdutos.map(([nome, qtd]) => `
                <tr>
                  <td>${escapeHtml(nome)}</td>
                  <td>${qtd}</td>
                  <td>${((qtd / totalAplicacoes) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Últimas aplicações -->
      <div class="tableWrap" style="margin-top:20px;">
        <h4>📋 Últimas 10 aplicações</h4>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Talhão</th>
              <th>Cultura</th>
              <th>Área</th>
              <th>Produtos</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            ${ultimasApl.map(a => {
              const talhao = findNameById(talhoes, a.talhaoId);
              const produtosList = (a.produtos || []).map(p => p.produtoNome).join(', ');
              return `
                <tr>
                  <td>${a.data}</td>
                  <td><b>${escapeHtml(talhao)}</b></td>
                  <td>${a.cultura || '-'}</td>
                  <td>${num(a.areaHaAplicada, 1)} ha</td>
                  <td>${escapeHtml(produtosList)}</td>
                  <td style="color:#4CAF50;">${kbrl(a.custoTotal)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCustos() {
    // Custos por talhão
    const custosPorTalhao = talhoes.map(t => {
      const custoAplic = aplicacoes
        .filter(a => a.talhaoId === t.id)
        .reduce((s, a) => s + Number(a.custoTotal || 0), 0);
      const custoComb = combustivel
        .filter(c => c.talhaoId === t.id)
        .reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
      
      return {
        talhao: t.nome,
        fazenda: findNameById(fazendas, t.fazendaId),
        area: t.areaHa,
        custoAplic,
        custoComb,
        custoTotal: custoAplic + custoComb,
        custoHa: t.areaHa ? (custoAplic + custoComb) / t.areaHa : 0
      };
    }).sort((a, b) => b.custoTotal - a.custoTotal);

    // Custos por fazenda
    const custosPorFazenda = fazendas.map(f => {
      const talhoesFazenda = talhoes.filter(t => t.fazendaId === f.id);
      const areaTotal = talhoesFazenda.reduce((s, t) => s + Number(t.areaHa || 0), 0);
      const custoTotal = talhoesFazenda.reduce((s, t) => {
        const custo = custosPorTalhao.find(c => c.talhao === t.nome)?.custoTotal || 0;
        return s + custo;
      }, 0);
      
      return {
        fazenda: f.nome,
        area: areaTotal,
        custoTotal,
        custoHa: areaTotal ? custoTotal / areaTotal : 0
      };
    });

    const custoGeral = custosPorTalhao.reduce((s, c) => s + c.custoTotal, 0);

    return `
      <div class="kpi-grid">
        <div class="stat-card">
          <div class="stat-label">💰 Custo geral</div>
          <div class="stat-value">${kbrl(custoGeral)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📊 Média por talhão</div>
          <div class="stat-value">${kbrl(custoGeral / (talhoes.length || 1))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📏 Custo médio/ha</div>
          <div class="stat-value">${kbrl(custoGeral / (talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0) || 1))}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
        <!-- Custos por fazenda -->
        <div class="card">
          <h4>🏢 Custos por fazenda</h4>
          <table style="width:100%; margin-top:15px;">
            <thead>
              <tr>
                <th>Fazenda</th>
                <th>Área (ha)</th>
                <th>Custo total</th>
                <th>Custo/ha</th>
              </tr>
            </thead>
            <tbody>
              ${custosPorFazenda.map(f => `
                <tr>
                  <td><b>${escapeHtml(f.fazenda)}</b></td>
                  <td>${num(f.area, 1)}</td>
                  <td>${kbrl(f.custoTotal)}</td>
                  <td>${kbrl(f.custoHa)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Distribuição de custos -->
        <div class="card">
          <h4>📊 Distribuição dos custos</h4>
          <div style="margin-top:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
              <span>Aplicações</span>
              <span>${kbrl(custosPorTalhao.reduce((s, c) => s + c.custoAplic, 0))} (${((custosPorTalhao.reduce((s, c) => s + c.custoAplic, 0) / custoGeral) * 100).toFixed(1)}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(custosPorTalhao.reduce((s, c) => s + c.custoAplic, 0) / custoGeral) * 100}%"></div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin:10px 0 5px;">
              <span>Combustível</span>
              <span>${kbrl(custosPorTalhao.reduce((s, c) => s + c.custoComb, 0))} (${((custosPorTalhao.reduce((s, c) => s + c.custoComb, 0) / custoGeral) * 100).toFixed(1)}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(custosPorTalhao.reduce((s, c) => s + c.custoComb, 0) / custoGeral) * 100}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela detalhada por talhão -->
      <div class="tableWrap" style="margin-top:20px;">
        <h4>🧾 Custos detalhados por talhão</h4>
        <table>
          <thead>
            <tr>
              <th>Talhão</th>
              <th>Fazenda</th>
              <th>Área</th>
              <th>Custo Aplic.</th>
              <th>Custo Comb.</th>
              <th>Custo Total</th>
              <th>Custo/ha</th>
            </tr>
          </thead>
          <tbody>
            ${custosPorTalhao.map(c => `
              <tr>
                <td><b>${escapeHtml(c.talhao)}</b></td>
                <td>${escapeHtml(c.fazenda)}</td>
                <td>${num(c.area, 1)} ha</td>
                <td>${kbrl(c.custoAplic)}</td>
                <td>${kbrl(c.custoComb)}</td>
                <td style="color:#4CAF50;">${kbrl(c.custoTotal)}</td>
                <td>${kbrl(c.custoHa)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOperacional() {
    // Eficiência das máquinas
    const usoMaquinas = {};
    aplicacoes.forEach(a => {
      if (a.maquinaId) {
        usoMaquinas[a.maquinaId] = (usoMaquinas[a.maquinaId] || 0) + a.areaHaAplicada;
      }
    });

    const maquinasEficiencia = Object.entries(usoMaquinas).map(([id, area]) => {
      const maquina = maquinas.find(m => m.id === id);
      return {
        nome: maquina?.nome || 'Desconhecida',
        areaAplicada: area,
        eficiencia: (area / (aplicacoes.filter(a => a.maquinaId === id).length)) || 0
      };
    }).sort((a, b) => b.areaAplicada - a.areaAplicada);

    // Consumo de diesel
    const consumoTotal = combustivel.reduce((s, c) => s + Number(c.litros || 0), 0);
    const custoDiesel = combustivel.reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);

    return `
      <div class="kpi-grid">
        <div class="stat-card">
          <div class="stat-label">⛽ Consumo diesel</div>
          <div class="stat-value">${num(consumoTotal, 0)} L</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💰 Custo diesel</div>
          <div class="stat-value">${kbrl(custoDiesel)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📊 Consumo/ha</div>
          <div class="stat-value">${num(consumoTotal / (talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0) || 1), 1)} L/ha</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
        <!-- Eficiência das máquinas -->
        <div class="card">
          <h4>🚜 Desempenho das máquinas</h4>
          <table style="width:100%; margin-top:15px;">
            <thead>
              <tr>
                <th>Máquina</th>
                <th>Área aplicada</th>
                <th>Média por uso</th>
              </tr>
            </thead>
            <tbody>
              ${maquinasEficiencia.map(m => `
                <tr>
                  <td><b>${escapeHtml(m.nome)}</b></td>
                  <td>${num(m.areaAplicada, 1)} ha</td>
                  <td>${num(m.eficiencia, 1)} ha/uso</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Condições climáticas médias -->
        <div class="card">
          <h4>🌤️ Médias climáticas</h4>
          <table style="width:100%; margin-top:15px;">
            <tr>
              <td>Temperatura média</td>
              <td><b>${num(clima.reduce((s, c) => s + (c.tempMax || 0), 0) / (clima.length || 1), 1)}°C</b></td>
            </tr>
            <tr>
              <td>Umidade média</td>
              <td><b>${num(clima.reduce((s, c) => s + (c.umidade || 0), 0) / (clima.length || 1), 0)}%</b></td>
            </tr>
            <tr>
              <td>Total de chuvas</td>
              <td><b>${num(clima.reduce((s, c) => s + (c.chuvaMm || 0), 0), 1)} mm</b></td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Abastecimentos recentes -->
      <div class="tableWrap" style="margin-top:20px;">
        <h4>⛽ Últimos abastecimentos</h4>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Fazenda</th>
              <th>Litros</th>
              <th>Preço/L</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${combustivel.slice().reverse().slice(0, 10).map(c => `
              <tr>
                <td>${c.data}</td>
                <td>${escapeHtml(findNameById(fazendas, c.fazendaId))}</td>
                <td>${num(c.litros, 0)} L</td>
                <td>${kbrl(c.precoLitro)}</td>
                <td>${kbrl(c.litros * c.precoLitro)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderComparativo() {
    // Comparar com safras anteriores (simulado)
    const custoAtual = aplicacoes.reduce((s, a) => s + Number(a.custoTotal || 0), 0) +
                       combustivel.reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
    
    // Dados simulados de safras passadas (você pode buscar do banco se tiver)
    const safrasPassadas = [
      { nome: '2024/25', custo: custoAtual * 0.85, area: 1350 },
      { nome: '2023/24', custo: custoAtual * 0.72, area: 1280 },
      { nome: '2022/23', custo: custoAtual * 0.68, area: 1200 }
    ];

    const areaAtual = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);

    return `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <!-- Comparativo de custos -->
        <div class="card">
          <h4>📈 Evolução de custos por safra</h4>
          <div style="height:200px; display:flex; align-items:flex-end; gap:15px; margin-top:30px;">
            ${[...safrasPassadas, { nome: safra?.nome || 'Atual', custo: custoAtual, area: areaAtual }].map(s => {
              const altura = (s.custo / custoAtual) * 150;
              return `
                <div style="flex:1; text-align:center;">
                  <div style="height: ${altura}px; background: #00b09b; width:40px; margin:0 auto; border-radius:4px 4px 0 0;"></div>
                  <div style="margin-top:10px;"><b>${s.nome}</b></div>
                  <div style="font-size:11px;">${kbrl(s.custo)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Comparativo de área -->
        <div class="card">
          <h4>🌾 Evolução de área cultivada</h4>
          <div style="height:200px; display:flex; align-items:flex-end; gap:15px; margin-top:30px;">
            ${[...safrasPassadas, { nome: safra?.nome || 'Atual', custo: custoAtual, area: areaAtual }].map(s => {
              const altura = (s.area / areaAtual) * 150;
              return `
                <div style="flex:1; text-align:center;">
                  <div style="height: ${altura}px; background: #FF9800; width:40px; margin:0 auto; border-radius:4px 4px 0 0;"></div>
                  <div style="margin-top:10px;"><b>${s.nome}</b></div>
                  <div style="font-size:11px;">${num(s.area, 0)} ha</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div style="margin-top:20px;">
        <div class="card">
          <h4>📊 Indicadores comparativos</h4>
          <table style="width:100%; margin-top:15px;">
            <thead>
              <tr>
                <th>Safra</th>
                <th>Área (ha)</th>
                <th>Custo total</th>
                <th>Custo/ha</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              ${safrasPassadas.map(s => {
                const variacao = ((custoAtual / areaAtual) - (s.custo / s.area)) / (s.custo / s.area) * 100;
                return `
                  <tr>
                    <td><b>${s.nome}</b></td>
                    <td>${num(s.area, 0)} ha</td>
                    <td>${kbrl(s.custo)}</td>
                    <td>${kbrl(s.custo / s.area)}</td>
                    <td style="color: ${variacao > 0 ? '#f44336' : '#4CAF50'};">
                      ${variacao > 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(1)}%
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr style="border-top:2px solid #2a2a30;">
                <td><b>${safra?.nome || 'Atual'}</b></td>
                <td>${num(areaAtual, 0)} ha</td>
                <td>${kbrl(custoAtual)}</td>
                <td>${kbrl(custoAtual / (areaAtual || 1))}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderEvolucaoMensal() {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const custoPorMes = {};
    
    [...aplicacoes, ...combustivel].forEach(item => {
      if (item.data) {
        const mes = item.data.substring(5, 7);
        const mesNome = meses[parseInt(mes) - 1];
        const valor = item.custoTotal || (item.litros * item.precoLitro) || 0;
        custoPorMes[mesNome] = (custoPorMes[mesNome] || 0) + valor;
      }
    });

    const maxValor = Math.max(...Object.values(custoPorMes), 1);
    
    return meses.map(mes => {
      const valor = custoPorMes[mes] || 0;
      const altura = (valor / maxValor) * 180;
      return `
        <div style="flex:1; text-align:center;">
          <div style="height: ${altura}px; background: #00b09b; width:100%; border-radius:4px 4px 0 0;"></div>
          <div style="margin-top:5px;"><small>${mes}</small></div>
          <div style="font-size:10px;">${kbrl(valor)}</div>
        </div>
      `;
    }).join('');
  }

  // Exportação (simulada)
  document.getElementById("btnExportPDF").addEventListener("click", () => {
    toast("PDF", "Exportação em desenvolvimento");
  });

  document.getElementById("btnExportExcel").addEventListener("click", () => {
    // Exportar dados consolidados
    const dados = {
      safra: safra?.nome,
      geradoEm: new Date().toLocaleString(),
      estatisticas: {
        areaTotal: talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0),
        totalAplicacoes: aplicacoes.length,
        custoTotal: aplicacoes.reduce((s, a) => s + Number(a.custoTotal || 0), 0)
      }
    };
    downloadText(`relatorio-${nowISO()}.json`, JSON.stringify(dados, null, 2));
    toast("Exportado", "Arquivo JSON baixado");
  });

  document.getElementById("btnPrint").addEventListener("click", () => {
    window.print();
  });
}

function pageConfiguracoes() {
  const db = getDB();
  const params = db.parametros || { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75 };

  setTopActions(`
    <button class="btn" id="btnImport">Importar Backup</button>
    <button class="btn primary" id="btnExport">Exportar Backup</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>⚙️ Parâmetros de Mercado</h3>
        <div class="help">Configure os valores usados nos cálculos de receita e lucro.</div>
        <div class="hr"></div>
        <form id="frmParams" class="formGrid">
          <div><small>Preço da saca de soja (R$)</small><input class="input" name="precoSoja" type="number" step="0.01" value="${params.precoSoja}" /></div>
          <div><small>Produtividade mínima soja (sc/ha)</small><input class="input" name="prodMinSoja" type="number" step="0.1" value="${params.produtividadeMinSoja}" /></div>
          <div><small>Produtividade máxima soja (sc/ha)</small><input class="input" name="prodMaxSoja" type="number" step="0.1" value="${params.produtividadeMaxSoja}" /></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar parâmetros</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>💾 Backup e Restauração</h3>
        <div class="help">
          • Use backup para trocar de aparelho sem perder dados.<br/>
          • Importar substitui o banco local atual.
        </div>
        <div class="hr"></div>
        <div class="row" style="justify-content:space-around;">
          <button class="btn primary" id="btnExport2">Exportar Backup</button>
          <button class="btn" id="btnImport2">Importar Backup</button>
        </div>
      </div>

      <div class="card">
        <h3>⚠️ Reset de Dados</h3>
        <div class="help">Restaura o banco de dados para os valores iniciais de demonstração.</div>
        <div class="hr"></div>
        <button class="btn danger" id="btnResetDemo" style="width:100%;">Resetar para dados de demonstração</button>
      </div>

      <div class="card">
        <h3>📈 Sobre o sistema</h3>
        <div class="help">
          <b>Agro Pro v6.0</b><br/>
          • Sistema baseado em SAFRAS (dados isolados por safra)<br/>
          • Base de dados com +100 produtos e +20 pragas pré-cadastradas<br/>
          • Alertas automáticos de pragas baseados no clima<br/>
          • Cálculo de custos com preços reais de produtos e diesel (UEPS)<br/>
          • Estimativa de receita e lucro por talhão<br/>
          • Controle completo de entrada e saída de diesel
        </div>
      </div>
    </div>
  `;

  document.getElementById("frmParams").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const db2 = getDB();
    db2.parametros = {
      precoSoja: Number(fd.get("precoSoja") || 120),
      produtividadeMinSoja: Number(fd.get("prodMinSoja") || 65),
      produtividadeMaxSoja: Number(fd.get("prodMaxSoja") || 75)
    };
    setDB(db2);
    toast("Parâmetros salvos", "Valores atualizados.");
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Backup exportado", "Arquivo .json baixado.");
  });
  document.getElementById("btnExport2").addEventListener("click", () => {
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Backup exportado", "Arquivo .json baixado.");
  });

  document.getElementById("btnImport").addEventListener("click", importarBackup);
  document.getElementById("btnImport2").addEventListener("click", importarBackup);

  document.getElementById("btnResetDemo").addEventListener("click", () => {
    if (!confirm("⚠️ ATENÇÃO! Isso vai apagar TODOS os dados atuais e restaurar a versão de demonstração. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Reset concluído", "Banco restaurado para dados de demonstração.");
    setTimeout(() => location.reload(), 200);
  });

  function importarBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.safras) {
          alert("Arquivo inválido.");
          return;
        }
        if (!confirm("Importar vai SUBSTITUIR seus dados locais. Continuar?")) return;
        Storage.save(data);
        toast("Importado", "Recarregando…");
        setTimeout(() => location.reload(), 200);
      } catch (e) {
        alert("Não foi possível ler o arquivo JSON.");
      }
    };
    input.click();
  }
}

/* ------------------ Boot ------------------ */
function boot() {
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const titles = {
    dashboard: ["Dashboard", "Visão geral da safra atual"],
    opscenter: ["Ops Center", "Alertas e custos por talhão"],
    safras: ["Safras", "Gerenciar safras"],
    fazendas: ["Fazendas", "Unidades produtivas da safra"],
    talhoes: ["Talhões", "Áreas de cultivo da safra"],
    produtos: ["Produtos", "Insumos da safra"],
    estoque: ["Estoque", "Controle de insumos da safra"],
    aplicacoes: ["Aplicações", "Operações da safra"],
    combustivel: ["Combustível", "Entradas e saídas de diesel"],
    clima: ["Clima/Chuva", "Registros climáticos da safra"],
    equipe: ["Equipe", "Colaboradores da safra"],
    maquinas: ["Máquinas", "Equipamentos da safra"],
    relatorios: ["Relatórios", "Exportação de dados da safra"],
    config: ["Configurações", "Parâmetros e backup"]
  };

  const [t, s] = titles[pageKey] || ["Agro Pro", ""];
  renderShell(pageKey, t, s);

  if (pageKey === "dashboard") pageDashboard();
  else if (pageKey === "opscenter") pageOpsCenter();
  else if (pageKey === "safras") pageSafras();
  else if (pageKey === "fazendas") pageFazendas();
  else if (pageKey === "talhoes") pageTalhoes();
  else if (pageKey === "produtos") pageProdutos();
  else if (pageKey === "estoque") pageEstoque();
  else if (pageKey === "aplicacoes") pageAplicacoes();
  else if (pageKey === "combustivel") pageCombustivel();
  else if (pageKey === "clima") pageClima();
  else if (pageKey === "equipe") pageEquipe();
  else if (pageKey === "maquinas") pageMaquinas();
  else if (pageKey === "relatorios") pageRelatorios();
  else if (pageKey === "config") pageConfiguracoes();

  toast("Agro Pro", "Sistema carregado.");
}

// Inicializa quando a página carregar
document.addEventListener("DOMContentLoaded", boot);