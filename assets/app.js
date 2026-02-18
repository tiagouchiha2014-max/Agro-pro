/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTISAFRA) - VERSÃO FINAL COM COLHEITAS
   ============================================================ */

let planoAtual = localStorage.getItem("agro_plano") || "Master";
let fazendaAtual = localStorage.getItem("agro_fazenda_filtro") || null;  // Filtro global de fazenda (persistido)

const Storage = {
  key: "agro_pro_v10",
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
  // Produtos base removidos - cadastre seus próprios produtos na página Produtos
  return [];
}

function seedDB() {
  const safraId = uid("saf");
  const safra2Id = uid("saf");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");
  const talhao2Id = uid("tal");
  const maqId = uid("maq");
  const maq2Id = uid("maq");
  const opId = uid("peq");

  const pragasBase = getPragasBase();

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 9 },
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
      precoMilho: 60.00,
      produtividadeMinMilho: 100,
      produtividadeMaxMilho: 130,
      precoAlgodao: 150.00,
      produtividadeMinAlgodao: 250,
      produtividadeMaxAlgodao: 300,
      pesoPadraoSaca: 60 // kg por saca (usado na conversão)
    },

    fazendas: [
      { id: fazendaId, safraId, nome: "Fazenda Horizonte", cidade: "Sorriso", uf: "MT", areaHa: 1450, latitude: "-12.5489", longitude: "-55.7256", observacoes: "Soja/Milho safrinha" }
    ],

    talhoes: [
      { id: talhaoId, safraId, fazendaId, nome: "T-12", areaHa: 78.5, cultura: "Soja", safra: "2025/26", solo: "Argiloso", coordenadas: "", observacoes: "" },
      { id: talhao2Id, safraId, fazendaId, nome: "T-15", areaHa: 120.0, cultura: "Milho", safra: "2025/26", solo: "Argiloso", coordenadas: "", observacoes: "" }
    ],

    produtos: [],  // Cadastre seus produtos na página Produtos

    estoque: [],  // Estoque começa vazio

    equipe: [
      { id: opId, safraId, nome: "Operador 1", funcao: "Tratorista", telefone: "", nr: "", obs: "" }
    ],

    maquinas: [
      { id: maqId, safraId, nome: "Pulverizador Autopropelido", placa: "", horimetro: 0, capacidadeL: 3000, bicos: "", obs: "" },
      { id: maq2Id, safraId, nome: "Colheitadeira John Deere S760", placa: "", horimetro: 0, capacidadeL: 12000, bicos: "", obs: "Colheitadeira" }
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

    aplicacoes: [],

    colheitas: [
      {
        id: uid("col"),
        safraId,
        talhaoId,
        dataColheita: "2026-03-15",
        producaoTotal: 5200,
        unidade: "kg",
        umidade: 13.5,
        observacoes: "Colheita finalizada",
        maquinas: [
          { maquinaId: maq2Id, quantidade: 2800 },
          { maquinaId: maqId, quantidade: 2400 }
        ]
      }
    ],

    lembretes: [
      { id: uid("lem"), safraId, data: "2026-03-01", mensagem: "Aplicar fungicida no talhão T-12", tipo: "aplicacao", concluido: false }
    ],

    pragas: pragasBase.map(p => ({ ...p, id: uid("praga"), safraId })),

    manutencoes: [],
    insumosBase: []
  };

  Storage.save(db);
  return db;
}

function getDB() {
  let db = Storage.load();
  if (!db) db = seedDB();

  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 9 };
  db.session = db.session || {};
  db.safras = db.safras || [];
  db.parametros = db.parametros || { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75, pesoPadraoSaca: 60 };
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
  db.colheitas = db.colheitas || [];
  db.lembretes = db.lembretes || [];
  db.pragas = db.pragas || [];
  db.manutencoes = db.manutencoes || [];
  db.insumosBase = db.insumosBase || [];

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
  { href: "copilot.html", label: "Agro-Copilot (IA)", key: "copilot", icon: "🤖" },
  { href: "centralgestao.html", label: "Central de Gestão", key: "centralgestao", icon: "🛰️" },
  { href: "safras.html", label: "Safras", key: "safras", icon: "🌱" },
  { href: "fazendas.html", label: "Fazendas", key: "fazendas", icon: "🌾" },
  { href: "talhoes.html", label: "Talhões", key: "talhoes", icon: "🧭" },
  { href: "produtos.html", label: "Produtos", key: "produtos", icon: "🧪" },
  { href: "estoque.html", label: "Estoque", key: "estoque", icon: "📦" },
  { href: "insumosbase.html", label: "Insumos Base", key: "insumosbase", icon: "🌱" },
  { href: "aplicacoes.html", label: "Aplicações", key: "aplicacoes", icon: "🚜" },
  { href: "combustivel.html", label: "Combustível", key: "combustivel", icon: "⛽" },
  { href: "clima.html", label: "Clima/Chuva", key: "clima", icon: "🌧️" },
  { href: "colheitas.html", label: "Colheitas", key: "colheitas", icon: "🌾" },
  { href: "manutencao.html", label: "Manutenção", key: "manutencao", icon: "🔧" },
  { href: "equipe.html", label: "Equipe", key: "equipe", icon: "👷" },
  { href: "maquinas.html", label: "Máquinas", key: "maquinas", icon: "🛠️" },
  { href: "relatorios.html", label: "Relatórios", key: "relatorios", icon: "🧾" },
  { href: "configuracoes.html", label: "Configurações", key: "config", icon: "⚙️" },
  { href: "ajuda.html", label: "Ajuda & Suporte", key: "ajuda", icon: "❓" }
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
      <button class="menu-toggle noPrint" id="menuToggle">☰</button>
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="logo"></div>
          <div>
            <h1>Agro Pro <span class="plan-badge plan-${planoAtual.toLowerCase()}">${planoAtual}</span></h1>
            <p>Gestão Agrícola Inteligente</p>
          </div>
        </div>

        <div class="tenant">
          <div class="row">
            <span class="badge"><span class="dot"></span> ${planoAtual}</span>
            <button class="btn noPrint" id="btnBackup">Backup</button>
          </div>
          <div class="hr"></div>
          
          <small>🌱 Safra ativa</small>
          <select class="select" id="safraSelect">${safraOptions}</select>
          
          <small style="margin-top:10px; display:block;">🏡 Filtrar por Fazenda</small>
          <select class="select" id="fazendaSelect">
            <option value="">Todas as Fazendas</option>
            ${db.fazendas.filter(f => f.safraId === safraId).map(f => `<option value="${f.id}" ${fazendaAtual === f.id ? 'selected' : ''}>${escapeHtml(f.nome)}</option>`).join('')}
          </select>
          
          <div style="margin-top:10px" class="row">
            <button class="btn primary" id="btnNovaSafra">+ Nova safra</button>
          </div>
        </div>

        <nav class="nav">${nav}</nav>

        <div style="margin: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 12px;">
           <b>Plano ${planoAtual}</b><br>
           <a href="configuracoes.html" style="color: #4ade80; text-decoration: none;">Fazer Upgrade →</a>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <div style="display:flex; align-items:center; gap:15px;">
            <button class="menu-toggle noPrint" id="menuToggleMain">☰</button>
            <div class="title">
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(subtitle || (safra ? `Safra: ${safra.nome}` : "Selecione uma safra"))}</p>
            </div>
          </div>
          <div class="actions noPrint" id="topActions"></div>
        </div>

        <div id="content" class="content"></div>
      </main>
    </div>
  `;

  // Listeners Mobile
  const toggle = () => document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("menuToggleMain")?.addEventListener("click", toggle);
  if(document.getElementById("menuToggle")) document.getElementById("menuToggle").addEventListener("click", toggle);

  document.getElementById("safraSelect").addEventListener("change", (e) => {
    setSafraId(e.target.value);
    toast("Safra alterada", "Filtrando dados...");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("fazendaSelect").addEventListener("change", (e) => {
    fazendaAtual = e.target.value || null;
    if (fazendaAtual) localStorage.setItem("agro_fazenda_filtro", fazendaAtual);
    else localStorage.removeItem("agro_fazenda_filtro");
    toast("Fazenda filtrada", "Recarregando...");
    setTimeout(() => location.reload(), 300);
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

  let tank = db.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
  if (!tank) {
    tank = { id: uid("dsl"), safraId: getSafraId(), deposito, litros: 0, precoVigente: 0, obs: "" };
    db.dieselEstoque.push(tank);
  }
  tank.litros = Number(tank.litros || 0) + litros;
  tank.precoVigente = precoLitro;
  return tank;
}

function baixaDiesel(db, deposito, litros) {
  const tank = db.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
  if (!tank) return { ok: false, msg: "Tanque não encontrado" };
  const precoVigente = tank.precoVigente || 0;
  tank.litros = Number(tank.litros || 0) - Number(litros || 0);
  return { ok: true, precoLitro: precoVigente };
}

/* ------------------ Custo por talhão ------------------ */
function calcCustosPorTalhao(db) {
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas);
  const apl = onlySafra(db.aplicacoes || []);
  const cmb = onlySafra(db.combustivel || []);
  const inb = onlySafra(db.insumosBase || []);
  const col = onlySafra(db.colheitas || []);
  const manut = onlySafra(db.manutencoes || []);
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoManutTotal = manut.reduce((s, m) => s + Number(m.custoTotal || 0), 0);

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

  // Insumos Base por talhão
  for (const i of inb) {
    if (!i.talhaoId) continue;
    const rec = map.get(i.talhaoId) || { custo: 0, last: "", ops: 0 };
    rec.custo += Number(i.custoTotal || 0);
    rec.ops += 1;
    if ((i.data || "") > (rec.last || "")) rec.last = i.data || "";
    map.set(i.talhaoId, rec);
  }

  // Frete por talhão (da colheita)
  for (const c of col) {
    if (!c.talhaoId) continue;
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    if (frete > 0) {
      const rec = map.get(c.talhaoId) || { custo: 0, last: "", ops: 0 };
      rec.custo += frete;
      map.set(c.talhaoId, rec);
    }
  }

  // Manutenção: rateio proporcional à área
  for (const t of talhoes) {
    if (areaTotal > 0 && custoManutTotal > 0) {
      const rec = map.get(t.id) || { custo: 0, last: "", ops: 0 };
      rec.custo += custoManutTotal * (Number(t.areaHa || 0) / areaTotal);
      map.set(t.id, rec);
    }
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
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
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

/* ------------------ CRUD genérico ------------------ */
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

// ============================================================================
// PÁGINAS ESPECÍFICAS
// ============================================================================

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
        <td><span class="pill ${s.ativa ? 'ok' : ''}">${s.ativa ? 'Ativa' : 'Inativa'}</span></td>
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
    ["fazendas", "talhoes", "produtos", "estoque", "equipe", "maquinas", "clima", "aplicacoes", "combustivel", "dieselEntradas", "dieselEstoque", "lembretes", "pragas", "colheitas"].forEach(wipe);

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
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const produtos = onlySafra(db.produtos);
  const aplicacoes = onlySafra(db.aplicacoes);
  const clima = onlySafra(db.clima);
  const lembretes = onlySafra(db.lembretes).filter(l => !l.concluido).slice(0, 5);
  const alertasPragas = gerarAlertasPragas(db).slice(0, 3);
  const colheitas = onlySafra(db.colheitas);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a => a.data === hoje).length;
  const chuvaHoje = clima.filter(c => c.data === hoje).reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const totalColhido = colheitas.reduce((s, c) => s + c.producaoTotal, 0);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card" style="background: linear-gradient(135deg, #3b82f6, #1e3a8a); color:white;">
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
        <h3>Produção Colhida</h3>
        <div class="big">${num(totalColhido, 0)} kg</div>
        <div class="sub">${colheitas.length} talhões colhidos</div>
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
          <div style="padding:12px; margin:8px 0; background: rgba(59, 130, 246, 0.1); border-left:4px solid #3b82f6; border-radius:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <b style="color:#3b82f6;">${escapeHtml(l.mensagem)}</b><br>
                <span style="color:#888; font-size:13px;">Data: ${l.data}</span>
              </div>
              <button class="btn" style="background:#3b82f6; color:white;" onclick="concluirLembrete('${l.id}')">Concluir</button>
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

function pageCentralGestao() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const estoque = onlySafra(db.estoque || []);
  const diesel = onlySafra(db.dieselEstoque || []);
  const aplicacoes = onlySafra(db.aplicacoes || []);
  const combustivel = onlySafra(db.combustivel || []);
  const colheitas = onlySafra(db.colheitas || []);
  const params = db.parametros || { 
    precoSoja: 120, 
    produtividadeMinSoja: 65, 
    produtividadeMaxSoja: 75,
    precoMilho: 60,
    produtividadeMinMilho: 100,
    produtividadeMaxMilho: 130,
    precoAlgodao: 150,
    produtividadeMinAlgodao: 250,
    produtividadeMaxAlgodao: 300,
    pesoPadraoSaca: 60
  };

  const negEstoque = estoque.filter(s => Number(s.qtd || 0) < 0);
  const negDiesel = diesel.filter(d => Number(d.litros || 0) < 0);
  const custoTal = calcCustosPorTalhao(db);

  // Função para converter kg para sacas
  const kgParaSacas = (kg) => kg / (params.pesoPadraoSaca || 60);

  // Mapa de colheitas por talhão
  const colheitaPorTalhao = new Map();
  colheitas.forEach(c => {
    colheitaPorTalhao.set(c.talhaoId, c);
  });

  // Calcular receita e lucro por talhão (estimado e real)
  const talhoesComLucro = talhoes.map(t => {
    const area = Number(t.areaHa || 0);
    const custo = custoTal.find(ct => ct.talhaoId === t.id)?.custoTotal || 0;
    
    // Receita estimada (baseada na produtividade configurada)
    let receitaEstimada = 0;
    let prodMin = 0, prodMax = 0, preco = 0;
    const cultura = t.cultura?.toLowerCase() || '';

    if (cultura === 'soja') {
      prodMin = params.produtividadeMinSoja;
      prodMax = params.produtividadeMaxSoja;
      preco = params.precoSoja;
    } else if (cultura === 'milho') {
      prodMin = params.produtividadeMinMilho;
      prodMax = params.produtividadeMaxMilho;
      preco = params.precoMilho;
    } else if (cultura === 'algodao') {
      prodMin = params.produtividadeMinAlgodao;
      prodMax = params.produtividadeMaxAlgodao;
      preco = params.precoAlgodao;
    }

    if (prodMin && prodMax && preco) {
      const producaoMedia = (prodMin + prodMax) / 2;
      receitaEstimada = area * producaoMedia * preco;
    }

    // Receita real (baseada na colheita)
    const colheita = colheitaPorTalhao.get(t.id);
    let receitaReal = 0;
    let producaoRealKg = 0;
    if (colheita) {
      if (colheita.unidade === 'kg') {
        producaoRealKg = colheita.producaoTotal;
        receitaReal = kgParaSacas(colheita.producaoTotal) * preco;
      } else {
        // unidade já em sacas
        receitaReal = colheita.producaoTotal * preco;
      }
    }

    return {
      ...t,
      custo,
      receitaEstimada,
      receitaReal,
      lucroEstimado: receitaEstimada - custo,
      lucroReal: receitaReal - custo,
      producaoRealKg,
      colheitaRegistrada: !!colheita
    };
  });

  const receitaEstimadaTotal = talhoesComLucro.reduce((s, t) => s + t.receitaEstimada, 0);
  const receitaRealTotal = talhoesComLucro.reduce((s, t) => s + t.receitaReal, 0);
  const custoTotal = talhoesComLucro.reduce((s, t) => s + t.custo, 0);
  const lucroEstimadoTotal = receitaEstimadaTotal - custoTotal;
  const lucroRealTotal = receitaRealTotal - custoTotal;

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .ops-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .ops-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .ops-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .ops-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .ops-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .dual-table {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 20px;
      }
      .destaque-positivo { color: #059669; }
      .destaque-negativo { color: #b91c1c; }
    </style>

    <div class="ops-kpi-grid">
      <div class="ops-kpi-card">
        <h3>📦 Alertas Estoque</h3>
        <div class="ops-kpi-valor">${negEstoque.length}</div>
        <div class="ops-kpi-label">itens com saldo negativo</div>
      </div>
      <div class="ops-kpi-card">
        <h3>⛽ Alertas Diesel</h3>
        <div class="ops-kpi-valor">${negDiesel.length}</div>
        <div class="ops-kpi-label">tanques negativos</div>
      </div>
      <div class="ops-kpi-card">
        <h3>💰 Receita Total</h3>
        <div class="ops-kpi-valor ${receitaRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(receitaRealTotal)}</div>
        <div class="ops-kpi-label">vs. estimada ${kbrl(receitaEstimadaTotal)}</div>
      </div>
      <div class="ops-kpi-card">
        <h3>📊 Margem Real</h3>
        <div class="ops-kpi-valor">${custoTotal ? ((lucroRealTotal / custoTotal) * 100).toFixed(1) : 0}%</div>
        <div class="ops-kpi-label">sobre o custo</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h3>📈 Resumo Financeiro</h3>
      <table style="width:100%;">
        <tr>
          <td><b>Custo total:</b></td>
          <td style="text-align:right">${kbrl(custoTotal)}</td>
        </tr>
        <tr>
          <td><b>Receita estimada:</b></td>
          <td style="text-align:right">${kbrl(receitaEstimadaTotal)}</td>
        </tr>
        <tr>
          <td><b>Lucro estimado:</b></td>
          <td style="text-align:right"><span class="${lucroEstimadoTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(lucroEstimadoTotal)}</span></td>
        </tr>
        <tr style="border-top:2px solid #e2e8f0;">
          <td><b>Receita real:</b></td>
          <td style="text-align:right">${kbrl(receitaRealTotal)}</td>
        </tr>
        <tr>
          <td><b>Lucro real:</b></td>
          <td style="text-align:right"><b class="${lucroRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(lucroRealTotal)}</b></td>
        </tr>
        <tr>
          <td><b>Diferença:</b></td>
          <td style="text-align:right">
            <span class="${(lucroRealTotal - lucroEstimadoTotal) >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">
              ${kbrl(lucroRealTotal - lucroEstimadoTotal)}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <div class="tableWrap">
      <h3>📋 Custos e Rentabilidade por Talhão</h3>
      <table>
        <thead>
          <tr>
            <th>Talhão</th>
            <th>Cultura</th>
            <th>Área (ha)</th>
            <th>Custo</th>
            <th>Produção (kg)</th>
            <th>Receita Estimada</th>
            <th>Receita Real</th>
            <th>Receita Líquida</th>
            <th class="noPrint">IA Manejo</th>
          </tr>
        </thead>
        <tbody>
          ${talhoesComLucro.map(t => {
            const lucroClass = t.lucroReal >= 0 ? 'destaque-positivo' : 'destaque-negativo';
            return `<tr>
              <td><b>${escapeHtml(t.nome)}</b></td>
              <td>${escapeHtml(t.cultura || '-')}</td>
              <td>${num(t.areaHa, 1)}</td>
              <td>${kbrl(t.custo)}</td>
              <td>${t.colheitaRegistrada ? num(t.producaoRealKg, 0) : '-'}</td>
              <td>${kbrl(t.receitaEstimada)}</td>
              <td>${t.colheitaRegistrada ? kbrl(t.receitaReal) : '-'}</td>
              <td class="${lucroClass}">${t.colheitaRegistrada ? kbrl(t.lucroReal) : '-'}</td>
              <td class="noPrint"><button class="btn primary" style="font-size:11px; padding:6px 10px;" onclick="window.__sugerirManejo('${t.id}')">🤖 Sugerir</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Seção Cotação de Grãos -->
    <div class="card" style="margin-top:20px; background:linear-gradient(135deg, #fef3c7, #fde68a); border:1px solid #f59e0b;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0; color:#b45309;">💰 Cotação de Grãos — Preço por Região</h3>
      </div>
      <div class="help" style="margin-bottom:15px; color:#92400e;">Busque o preço atual da soja ou milho baseado na localização da sua fazenda.</div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <select class="select" id="selectCulturaPreco" style="max-width:200px;">
          <option value="Soja">Soja</option>
          <option value="Milho">Milho</option>
        </select>
        <button class="btn primary" id="btnBuscarPreco" style="font-size:14px; padding:10px 20px; background:#b45309;">
          💰 Buscar Cotação
        </button>
      </div>
      <div id="precoResultado" style="margin-top:15px;"></div>
    </div>

    <!-- Seção IA Prescritiva -->
    <div class="card" style="margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0;">🤖 IA Prescritiva — Assistente de Manejo</h3>
      </div>
      <div class="help" style="margin-bottom:15px;">
        Selecione um talhão e clique em <b>"Sugerir Manejo"</b> para receber recomendações de manejo baseadas em IA, considerando o clima atual, previsão do tempo, histórico de aplicações e dados do talhão.
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <select class="select" id="selectTalhaoIA" style="max-width:300px;">
          <option value="">Selecione um talhão...</option>
          ${talhoes.map(t => '<option value="' + t.id + '">' + escapeHtml(t.nome) + ' (' + (t.cultura || '-') + ') — ' + num(t.areaHa, 1) + ' ha</option>').join('')}
        </select>
        <button class="btn primary" id="btnSugerirManejo" style="font-size:14px; padding:10px 20px;">
          🤖 Sugerir Manejo
        </button>
      </div>
      <div id="iaResultado" style="margin-top:20px;"></div>
    </div>

  `;

  // Carregar API key salva (global)
  const savedKey = localStorage.getItem("agro_pro_openai_key") || "";
  if (savedKey) { window.__OPENAI_KEY = savedKey; }

  // Botão buscar cotação de grãos
  document.getElementById("btnBuscarPreco").addEventListener("click", async () => {
    const cultura = document.getElementById("selectCulturaPreco").value;
    const db2 = getDB();
    const fazendas2 = onlySafra(db2.fazendas);
    
    if (fazendas2.length === 0) {
      toast("Erro", "Cadastre uma fazenda com coordenadas.");
      return;
    }
    
    const faz = fazendaAtual ? fazendas2.find(f => f.id === fazendaAtual) : fazendas2[0];
    if (!faz || !faz.latitude || !faz.longitude) {
      toast("Erro", "Cadastre latitude/longitude na fazenda.");
      return;
    }
    
    const resultado = await buscarPrecoGraos(cultura, parseFloat(faz.latitude), parseFloat(faz.longitude));
    
    if (resultado.ok) {
      document.getElementById("precoResultado").innerHTML = `
        <div style="background:white; border-radius:8px; padding:15px; border:2px solid #f59e0b;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; color:#64748b;">Cultura: <b>${resultado.cultura}</b></div>
              <div style="font-size:12px; color:#64748b;">Região: <b>${resultado.regiao}</b></div>
              <div style="font-size:12px; color:#64748b;">Atualizado: <b>${new Date().toLocaleDateString('pt-BR')}</b></div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:32px; font-weight:700; color:#b45309;">R$ ${resultado.preco.toFixed(2)}</div>
              <div style="font-size:12px; color:#64748b;">${resultado.moeda}</div>
            </div>
          </div>
          <div style="margin-top:10px; font-size:11px; color:#78350f; background:#fef3c7; padding:8px; border-radius:4px;">
            ℹ️ Cotação aproximada baseada na região mais próxima. Consulte a bolsa local para valores exatos.
          </div>
        </div>
      `;
    } else {
      document.getElementById("precoResultado").innerHTML = `
        <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:10px; color:#991b1b;">
          <b>Erro:</b> Não foi possível buscar a cotação.
        </div>
      `;
    }
  });

  // Botão sugerir manejo (dropdown)
  document.getElementById("btnSugerirManejo").addEventListener("click", async () => {
    const talhaoId = document.getElementById("selectTalhaoIA").value;
    if (!talhaoId) {
      toast("Selecione", "Escolha um talhão para análise.");
      return;
    }
    await executarAnaliseIA(talhaoId);
  });

  // Botão sugerir manejo (inline na tabela)
  window.__sugerirManejo = async (talhaoId) => {
    document.getElementById("selectTalhaoIA").value = talhaoId;
    await executarAnaliseIA(talhaoId);
    // Scroll até o resultado
    document.getElementById("iaResultado").scrollIntoView({ behavior: 'smooth' });
  };

  async function executarAnaliseIA(talhaoId) {
    if (!window.__OPENAI_KEY) {
      toast("Erro", "Configure sua chave da API OpenAI em Configurações.");
      if (confirm("Deseja ir para Configurações para configurar a chave?")) { location.href = "configuracoes.html"; }
      return;
    }

    const resultado = document.getElementById("iaResultado");
    resultado.innerHTML = '<div style="text-align:center; padding:30px;"><div style="font-size:24px;">🤖</div><div style="margin-top:10px; color:#64748b;">Analisando dados e gerando recomendações...<br>Isso pode levar alguns segundos.</div></div>';

    const resp = await gerarRecomendacaoIA(talhaoId);
    
    if (resp.ok) {
      // Converter markdown simples para HTML
      let html = resp.texto
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.+?)\*/g, '<i>$1</i>')
        .replace(/^### (.+)$/gm, '<h4 style="color:#3b82f6; margin:15px 0 8px;">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="color:#1e40af; margin:20px 0 10px;">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 style="color:#0f172a; margin:20px 0 10px;">$1</h2>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');

      resultado.innerHTML = `
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); border-radius:12px; padding:20px; color:white;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#60a5fa;">🤖 Recomendação de Manejo — ${escapeHtml(resp.talhao)} (${escapeHtml(resp.cultura || '-')})</h3>
            <span style="font-size:11px; color:#94a3b8;">${new Date().toLocaleString('pt-BR')}</span>
          </div>
          <div style="line-height:1.8; font-size:14px;">${html}</div>
          <div style="margin-top:15px; padding-top:15px; border-top:1px solid #334155; font-size:11px; color:#94a3b8;">
            ⚠️ Esta é uma recomendação gerada por IA e deve ser validada por um agrônomo responsável. Não substitui a receita agronômica.
          </div>
        </div>
      `;
    } else {
      resultado.innerHTML = `
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:15px; color:#991b1b;">
          <b>Erro:</b> ${escapeHtml(resp.msg)}<br>
          <small>Verifique se a chave da API está correta e se há créditos disponíveis.</small>
        </div>
      `;
    }
  }
}

function pageFazendas() {
  crudPage({
    entityKey: "fazendas",
    subtitle: "Unidades produtivas da safra atual.",
    fields: [
      { key: "nome", label: "Nome da fazenda", type: "text" },
      { key: "cidade", label: "Cidade", type: "text" },
      { key: "uf", label: "UF", type: "text" },
      { key: "areaHa", label: "Área total (ha)", type: "number" },
      { key: "latitude", label: "Latitude", type: "text", placeholder: "Ex: -12.5489" },
      { key: "longitude", label: "Longitude", type: "text", placeholder: "Ex: -55.7256" },
      { key: "observacoes", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      { key: "nome", label: "Fazenda" },
      { key: "cidade", label: "Cidade" },
      { key: "uf", label: "UF" },
      { key: "areaHa", label: "Área (ha)" },
      { key: "latitude", label: "Lat." },
      { key: "longitude", label: "Lon." },
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
    let rows = onlySafra(db2.talhoes || []);
    if (fazendaAtual) rows = rows.filter(t => t.fazendaId === fazendaAtual);
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
    
    const limitesT = { 'Básico': 10, 'Pro': 15, 'Master': 9999 };
    if (db2.talhoes.filter(t => t.fazendaId === obj.fazendaId).length >= limitesT[planoAtual]) {
      alert(`Limite de ${limitesT[planoAtual]} talhões por fazenda atingido para o plano ${planoAtual}.`);
      return;
    }
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
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const equipe = onlySafra(db.equipe);
  const maquinas = onlySafra(db.maquinas);
  const tanques = onlySafra(db.dieselEstoque);
  const entradas = onlySafra(db.dieselEntradas || []).sort((a, b) => b.data.localeCompare(a.data));
  const saidas = onlySafra(db.combustivel || []).sort((a, b) => b.data.localeCompare(a.data));

  setTopActions(`<button class="btn" id="btnExportCSV">📥 Exportar CSV</button>`);

  const content = document.getElementById("content");

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const consumoPorMes = new Array(12).fill(0);
  const entradasPorMes = new Array(12).fill(0);

  saidas.forEach(s => {
    if (s.data) {
      const mes = parseInt(s.data.substring(5, 7)) - 1;
      consumoPorMes[mes] += Number(s.litros || 0);
    }
  });

  entradas.forEach(e => {
    if (e.data) {
      const mes = parseInt(e.data.substring(5, 7)) - 1;
      entradasPorMes[mes] += Number(e.litros || 0);
    }
  });

  const maxConsumo = Math.max(...consumoPorMes, 1);
  const maxEntrada = Math.max(...entradasPorMes, 1);
  const estoqueAtual = tanques.reduce((s, t) => s + Number(t.litros || 0), 0);
  const precoVigente = tanques[0]?.precoVigente || 0;

  function optionList(arr, labelKey = "nome") {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o[labelKey] || "")}</option>`).join("");
  }

  const depositoOptions = tanques.map(t => `<option value="${escapeHtml(t.deposito || "Tanque Principal")}">${escapeHtml(t.deposito || "Tanque Principal")}</option>`).join("");

  content.innerHTML = `
    <style>
      .combustivel-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }
      .combustivel-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .combustivel-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .combustivel-valor {
        font-size: 32px;
        font-weight: bold;
        color: #0f172a;
      }
      .combustivel-label {
        color: #475569;
        font-size: 12px;
      }
      .grafico-barras {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 150px;
        margin: 15px 0;
      }
      .barra {
        flex: 1;
        background: #3b82f6;
        border-radius: 4px 4px 0 0;
        min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label {
        text-align: center;
        font-size: 10px;
        color: #475569;
        margin-top: 5px;
      }
    </style>

    <div class="combustivel-grid">
      <div class="combustivel-card">
        <h3>⛽ Estoque Atual</h3>
        <div class="combustivel-valor">${num(estoqueAtual, 1)} L</div>
        <div class="combustivel-label">${tanques.some(t => t.litros < 0) ? '<span style="color:#f44336;">Negativo</span>' : 'Disponível'}</div>
      </div>
      <div class="combustivel-card">
        <h3>💰 Preço Vigente</h3>
        <div class="combustivel-valor">${kbrl(precoVigente)}/L</div>
        <div class="combustivel-label">Última entrada</div>
      </div>
      <div class="combustivel-card">
        <h3>📊 Total Abastecido</h3>
        <div class="combustivel-valor">${num(saidas.reduce((s, c) => s + Number(c.litros || 0), 0), 1)} L</div>
        <div class="combustivel-label">${saidas.length} operações</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      <div class="card">
        <h4>📉 Consumo Mensal de Diesel</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (consumoPorMes[i] / maxConsumo) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(consumoPorMes[i], 0)} L</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <h4>📈 Entradas de Diesel</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (entradasPorMes[i] / maxEntrada) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px; background: #4CAF50;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(entradasPorMes[i], 0)} L</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>⛽ Registrar entrada de diesel</h3>
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

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top:20px;">
      <div class="tableWrap">
        <h4>📋 Entradas de diesel</h4>
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

      <div class="tableWrap">
        <h4>📋 Abastecimentos</h4>
        <table>
          <thead>
            <tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Litros</th><th>Preço/L</th><th>Custo</th></tr>
          </thead>
          <tbody id="tbodySaidas">
            ${saidas.map(c => {
              const faz = findNameById(fazendas, c.fazendaId);
              const tal = c.talhaoId ? findNameById(talhoes, c.talhaoId) : "—";
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
            }).join('') || '<tr><td colspan="6">Sem abastecimentos</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

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
    pageCombustivel();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlySafra(db2.combustivel || [])));
    toast("Exportado", "CSV baixado.");
  });
}

function pageClima() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const clima = onlySafra(db.clima || []).sort((a, b) => b.data.localeCompare(a.data));

  setTopActions(`
    <button class="btn primary" id="btnImportClima">🌤️ Ver Previsão do Tempo</button>
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  const totalChuva = clima.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const diasComChuva = clima.filter(c => c.chuvaMm > 0).length;
  const mediaChuva = clima.length ? totalChuva / clima.length : 0;
  const tempMaxMedia = clima.reduce((s, c) => s + Number(c.tempMax || 0), 0) / (clima.length || 1);
  const tempMinMedia = clima.reduce((s, c) => s + Number(c.tempMin || 0), 0) / (clima.length || 1);
  const tempMedia = (tempMaxMedia + tempMinMedia) / 2;
  const umidadeMedia = clima.reduce((s, c) => s + Number(c.umidade || 0), 0) / (clima.length || 1);
  const ventoMedio = clima.reduce((s, c) => s + Number(c.vento || 0), 0) / (clima.length || 1);

  const climaPorTalhao = talhoes.map(t => {
    const registros = clima.filter(c => c.talhaoId === t.id);
    const total = registros.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
    const ultimo = registros.sort((a, b) => b.data.localeCompare(a.data))[0];
    return {
      talhao: t.nome,
      fazenda: findNameById(fazendas, t.fazendaId),
      totalChuva: total,
      media: registros.length ? total / registros.length : 0,
      ultimaData: ultimo?.data || '-',
      ultimaChuva: ultimo?.chuvaMm || 0,
      registros: registros.length
    };
  }).sort((a, b) => b.totalChuva - a.totalChuva);

  const climaPorFazenda = fazendas.map(f => {
    const talhoesDaFazenda = talhoes.filter(t => t.fazendaId === f.id);
    let totalChuva = 0, totalRegistros = 0;
    talhoesDaFazenda.forEach(t => {
      const registros = clima.filter(c => c.talhaoId === t.id);
      totalChuva += registros.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
      totalRegistros += registros.length;
    });
    const registrosGeral = clima.filter(c => c.fazendaId === f.id && !c.talhaoId);
    totalChuva += registrosGeral.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
    totalRegistros += registrosGeral.length;
    return {
      fazenda: f.nome,
      totalChuva,
      media: totalRegistros ? totalChuva / totalRegistros : 0,
      registros: totalRegistros
    };
  }).sort((a, b) => b.totalChuva - a.totalChuva);

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chuvaPorMes = new Array(12).fill(0);
  clima.forEach(c => {
    if (c.data) {
      const mes = parseInt(c.data.substring(5, 7)) - 1;
      chuvaPorMes[mes] += Number(c.chuvaMm || 0);
    }
  });
  const maxChuvaMensal = Math.max(...chuvaPorMes, 1);

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .clima-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .clima-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .clima-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .clima-kpi-valor {
        font-size: 36px;
        font-weight: 700;
        color: #0f172a;
      }
      .clima-kpi-unidade {
        font-size: 16px;
        color: #64748b;
        margin-left: 5px;
      }
      .clima-kpi-label {
        color: #475569;
        font-size: 13px;
        margin-top: 8px;
      }
      .form-clima {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 30px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .form-clima h3 { color: #3b82f6; }
      .grafico-barras {
        display: flex; align-items: flex-end; gap: 8px; height: 200px; margin: 20px 0;
      }
      .barra {
        flex: 1; background: #3b82f6; border-radius: 4px 4px 0 0; min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label { text-align: center; font-size: 11px; margin-top: 5px; color: #475569; }
    </style>

    <div class="clima-kpi-grid">
      <div class="clima-kpi-card">
        <h3>🌧️ Total de Chuvas</h3>
        <div><span class="clima-kpi-valor">${num(totalChuva, 1)}</span><span class="clima-kpi-unidade">mm</span></div>
        <div class="clima-kpi-label">${diasComChuva} dia(s) com chuva</div>
      </div>
      <div class="clima-kpi-card">
        <h3>📊 Média por Registro</h3>
        <div><span class="clima-kpi-valor">${num(mediaChuva, 1)}</span><span class="clima-kpi-unidade">mm</span></div>
        <div class="clima-kpi-label">${clima.length} registro(s)</div>
      </div>
      <div class="clima-kpi-card">
        <h3>🌡️ Temperatura Média</h3>
        <div><span class="clima-kpi-valor">${num(tempMedia, 1)}</span><span class="clima-kpi-unidade">°C</span></div>
        <div class="clima-kpi-label">Mín ${num(tempMinMedia,1)}°C / Máx ${num(tempMaxMedia,1)}°C</div>
      </div>
      <div class="clima-kpi-card">
        <h3>💧 Umidade Média</h3>
        <div><span class="clima-kpi-valor">${umidadeMedia ? num(umidadeMedia,0) : '-'}</span><span class="clima-kpi-unidade">%</span></div>
        <div class="clima-kpi-label">Vento médio: ${ventoMedio ? num(ventoMedio,1)+' km/h' : '-'}</div>
      </div>
    </div>

    <div class="form-clima">
      <h3>📝 Novo Registro Climático</h3>
      <form id="frmClima" class="formGrid">
        <div><small>Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
        <div><small>Fazenda</small><select class="select" name="fazendaId" required><option value="">Selecione...</option>${fazendas.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('')}</select></div>
        <div><small>Talhão (opcional)</small><select class="select" name="talhaoId"><option value="">Geral</option>${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div>
        <div><small>Chuva (mm)</small><input class="input" name="chuvaMm" type="number" step="0.1" placeholder="0"></div>
        <div><small>Temp Máx (°C)</small><input class="input" name="tempMax" type="number" step="0.1"></div>
        <div><small>Temp Mín (°C)</small><input class="input" name="tempMin" type="number" step="0.1"></div>
        <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" step="1"></div>
        <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" step="0.1"></div>
        <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
        <div class="full row" style="justify-content:flex-end">
          <button class="btn primary" type="submit">Salvar Registro</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h4>📈 Distribuição Mensal de Chuvas</h4>
      <div class="grafico-barras">
        ${meses.map((mes, i) => {
          const altura = (chuvaPorMes[i] / maxChuvaMensal) * 180;
          return `<div style="flex:1;text-align:center;"><div class="barra" style="height:${altura}px;"></div><div class="barra-label">${mes}</div><div style="font-size:10px;color:#475569;">${num(chuvaPorMes[i],1)} mm</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="secao-tabela">
      <div class="card">
        <h4>📋 Últimos 10 Registros</h4>
        <div class="tableWrap">
          <table>
            <thead><tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Chuva (mm)</th><th>Temp (°C)</th><th>Umidade (%)</th><th>Ações</th></tr></thead>
            <tbody>${clima.slice(0,10).map(c => {
              const fazenda = findNameById(fazendas, c.fazendaId);
              const talhao = c.talhaoId ? findNameById(talhoes, c.talhaoId) : 'Geral';
              return `<tr><td>${c.data}</td><td>${escapeHtml(fazenda)}</td><td>${escapeHtml(talhao)}</td><td><span class="valor-com-unidade">${num(c.chuvaMm||0,1)}</span><span class="unidade-tabela">mm</span></td><td>${c.tempMax ? num(c.tempMax,1)+'°C' : '-'}</td><td>${c.umidade ? num(c.umidade,0)+'%' : '-'}</td><td class="noPrint"><button class="btn danger" style="padding:4px 8px;" onclick="window.__delClima('${c.id}')">Excluir</button></td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="secao-tabela">
      <div class="card">
        <h4>🌱 Acumulado por Talhão</h4>
        <div class="tableWrap">
          <table>
            <thead><tr><th>Talhão</th><th>Fazenda</th><th>Total Chuva (mm)</th><th>Média (mm)</th><th>Última Chuva (mm)</th><th>Registros</th></tr></thead>
            <tbody>${climaPorTalhao.map(t => `<tr><td><b>${escapeHtml(t.talhao)}</b></td><td>${escapeHtml(t.fazenda)}</td><td><span class="valor-com-unidade">${num(t.totalChuva,1)}</span><span class="unidade-tabela">mm</span></td><td>${num(t.media,1)} mm</td><td>${t.ultimaChuva > 0 ? num(t.ultimaChuva,1)+' mm' : '-'}</td><td>${t.registros}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="secao-tabela">
      <div class="card">
        <h4>🏢 Acumulado por Fazenda</h4>
        <div class="tableWrap">
          <table>
            <thead><tr><th>Fazenda</th><th>Total Chuva (mm)</th><th>Média (mm)</th><th>Registros</th></tr></thead>
            <tbody>${climaPorFazenda.map(f => `<tr><td><b>${escapeHtml(f.fazenda)}</b></td><td><span class="valor-com-unidade">${num(f.totalChuva,1)}</span><span class="unidade-tabela">mm</span></td><td>${num(f.media,1)} mm</td><td>${f.registros}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById("frmClima").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = fd.get("data");
    const fazendaId = fd.get("fazendaId");
    if (!fazendaId) { alert("Selecione uma fazenda"); return; }
    const obj = {
      id: uid("cli"),
      safraId: getSafraId(),
      data,
      fazendaId,
      talhaoId: fd.get("talhaoId") || "",
      chuvaMm: Number(fd.get("chuvaMm") || 0),
      tempMax: fd.get("tempMax") ? Number(fd.get("tempMax")) : null,
      tempMin: fd.get("tempMin") ? Number(fd.get("tempMin")) : null,
      umidade: fd.get("umidade") ? Number(fd.get("umidade")) : null,
      vento: fd.get("vento") ? Number(fd.get("vento")) : null,
      obs: fd.get("obs") || ""
    };
    const db2 = getDB();
    db2.clima = db2.clima || [];
    db2.clima.push(obj);
    setDB(db2);
    toast("Registro salvo", "Dados climáticos adicionados");
    pageClima();
  });

  window.__delClima = (id) => {
    if (!confirm("Excluir este registro climático?")) return;
    const db2 = getDB();
    db2.clima = (db2.clima || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Registro removido");
    pageClima();
  };

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = clima.map(c => ({
      Data: c.data,
      Fazenda: findNameById(fazendas, c.fazendaId),
      Talhão: c.talhaoId ? findNameById(talhoes, c.talhaoId) : 'Geral',
      Chuva_mm: c.chuvaMm || 0,
      Temp_Max: c.tempMax || '',
      Temp_Min: c.tempMin || '',
      Umidade: c.umidade || '',
      Vento_kmh: c.vento || '',
      Observacoes: c.obs || ''
    }));
    downloadText(`clima-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado");
  });

  // Botão ver previsão do tempo (APENAS INFORMATIVO - não importa dados)
  document.getElementById("btnImportClima").addEventListener("click", async () => {
    const db2 = getDB();
    const fazendas2 = onlySafra(db2.fazendas);
    
    if (fazendas2.length === 0) {
      toast("Erro", "Cadastre pelo menos uma fazenda primeiro.");
      return;
    }

    toast("Carregando...", "Buscando previsão do tempo...");
    let previsaoHtml = '';
    
    for (const faz of fazendas2) {
      if (!faz.latitude || !faz.longitude) {
        continue;
      }
      const previsao = await buscarPrevisaoClima(faz.id);
      if (previsao && previsao.length > 0) {
        previsaoHtml += `<div style="background:#f0f9ff; border:1px solid #0284c7; border-radius:8px; padding:15px; margin-top:15px;">
          <h4 style="margin:0 0 10px 0; color:#0284c7;">🌤️ Previsão do Tempo — ${escapeHtml(faz.nome)}</h4>
          <p style="font-size:11px; color:#64748b; margin:0 0 10px 0;">📍 Lat: ${faz.latitude} | Lon: ${faz.longitude} — Dados: Open-Meteo (apenas consulta)</p>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr style="background:#e0f2fe;">
              <th style="padding:8px; text-align:left;">Data</th>
              <th style="padding:8px; text-align:center;">Temp Min</th>
              <th style="padding:8px; text-align:center;">Temp Max</th>
              <th style="padding:8px; text-align:center;">Chuva</th>
              <th style="padding:8px; text-align:center;">Umidade</th>
              <th style="padding:8px; text-align:center;">Vento</th>
            </tr>`;
        previsao.slice(0, 7).forEach(p => {
          previsaoHtml += `<tr style="border-bottom:1px solid #e0f2fe;">
            <td style="padding:6px 8px;">${p.data}</td>
            <td style="padding:6px 8px; text-align:center;">${p.tempMin?.toFixed(1) || '-'}°C</td>
            <td style="padding:6px 8px; text-align:center;">${p.tempMax?.toFixed(1) || '-'}°C</td>
            <td style="padding:6px 8px; text-align:center;">${p.chuva?.toFixed(1) || '0'}mm</td>
            <td style="padding:6px 8px; text-align:center;">${p.umidade?.toFixed(0) || '-'}%</td>
            <td style="padding:6px 8px; text-align:center;">${p.vento?.toFixed(1) || '-'}km/h</td>
          </tr>`;
        });
        previsaoHtml += `</table>
          <p style="font-size:11px; color:#b45309; margin:10px 0 0 0; background:#fef3c7; padding:6px 10px; border-radius:4px;">⚠️ Dados apenas para consulta. Registre a chuva e temperatura observadas manualmente em cada talhão.</p>
        </div>`;
      }
    }
    
    if (previsaoHtml) {
      // Mostrar previsão em um modal ou área dedicada
      const container = document.createElement('div');
      container.id = 'previsaoContainer';
      container.innerHTML = `<div class="card" style="margin-top:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0;">🌤️ Previsão do Tempo (Próximos 7 dias)</h3>
          <button class="btn" onclick="document.getElementById('previsaoContainer').remove()" style="font-size:12px;">✕ Fechar</button>
        </div>
        ${previsaoHtml}
      </div>`;
      const existente = document.getElementById('previsaoContainer');
      if (existente) existente.remove();
      document.getElementById('content').prepend(container);
      toast("Previsão carregada", "Dados apenas para consulta. Registre manualmente.");
    } else {
      toast("Aviso", "Nenhuma fazenda com coordenadas cadastradas.");
    }
  });
}

// ============================================================================
// PÁGINA COLHEITAS — ATUALIZADA COM FRETE DUPLO E 2 ARMAZÉNS
// ============================================================================

function pageColheitas() {
  const db = getDB();
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas);
  const maquinas = onlySafra(db.maquinas);
  const colheitas = onlySafra(db.colheitas || []).sort((a, b) => (b.dataColheita || "").localeCompare(a.dataColheita || ""));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  // ==================== CÁLCULOS ====================
  const producaoTotalKg = colheitas.reduce((s, c) => s + Number(c.producaoTotal || 0), 0);
  const custoFreteTotal = colheitas.reduce((s, c) => {
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    return s + frete;
  }, 0);
  const toneladas = producaoTotalKg / 1000;
  const custoFretePorTon = toneladas > 0 ? custoFreteTotal / toneladas : 0;

  // Custo de frete por talhão
  const fretePorTalhao = new Map();
  colheitas.forEach(c => {
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    const atual = fretePorTalhao.get(c.talhaoId) || 0;
    fretePorTalhao.set(c.talhaoId, atual + frete);
  });

  const content = document.getElementById("content");

  content.innerHTML = `
    <style>
      .colheita-form {
        background: #ffffff;
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 30px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .colheita-form h3 {
        margin-top: 0;
        color: #3b82f6;
      }
      .maquina-linha {
        display: grid;
        grid-template-columns: 2fr 1fr 0.5fr;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
      }
      .maquina-linha .btn-remove {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
      }
      .colheita-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .colheita-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #f59e0b;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .colheita-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #f59e0b;
        font-size: 16px;
      }
      .colheita-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .colheita-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .frete-section {
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 10px;
        padding: 16px;
        margin-top: 10px;
      }
      .frete-section h4 {
        margin: 0 0 12px 0;
        color: #b45309;
      }
      .frete-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .frete-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
      }
      .frete-box h5 {
        margin: 0 0 10px 0;
        color: #92400e;
        font-size: 14px;
      }
      .frete-resumo {
        background: linear-gradient(135deg, #78350f, #451a03);
        border-radius: 8px;
        padding: 15px;
        margin-top: 12px;
        color: white;
      }
      .frete-resumo .valor { font-size: 24px; font-weight: bold; color: #fbbf24; }
      @media (max-width: 768px) {
        .frete-grid { grid-template-columns: 1fr; }
      }
    </style>

    <!-- KPIs -->
    <div class="colheita-kpi-grid">
      <div class="colheita-kpi-card">
        <h3>🌾 Produção Total</h3>
        <div class="colheita-kpi-valor">${num(producaoTotalKg, 0)} kg</div>
        <div class="colheita-kpi-label">${num(toneladas, 2)} toneladas</div>
      </div>
      <div class="colheita-kpi-card">
        <h3>📋 Colheitas</h3>
        <div class="colheita-kpi-valor">${colheitas.length}</div>
        <div class="colheita-kpi-label">registros</div>
      </div>
      <div class="colheita-kpi-card">
        <h3>🚛 Custo Total Frete</h3>
        <div class="colheita-kpi-valor">${kbrl(custoFreteTotal)}</div>
        <div class="colheita-kpi-label">${kbrl(custoFretePorTon)}/ton</div>
      </div>
      <div class="colheita-kpi-card">
        <h3>🏢 Entregas</h3>
        <div class="colheita-kpi-valor">${colheitas.filter(c => c.frete1?.armazem || c.frete2?.armazem).length}</div>
        <div class="colheita-kpi-label">colheitas com frete</div>
      </div>
    </div>

    <!-- Formulário de Colheita -->
    <div class="colheita-form">
      <h3>🌾 Registrar Colheita</h3>
      <form id="frmColheita" class="formGrid">
        <div><small>📅 Data</small><input class="input" name="dataColheita" type="date" value="${nowISO()}" required></div>
        <div><small>🧭 Talhão</small>
          <select class="select" name="talhaoId" required>
            <option value="">Selecione...</option>
            ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)} (${t.cultura || 'Sem cultura'}) — ${num(t.areaHa,1)} ha</option>`).join('')}
          </select>
        </div>
        <div><small>📦 Produção Total</small><input class="input" name="producaoTotal" type="number" step="0.01" required placeholder="Quantidade"></div>
        <div><small>📏 Unidade</small>
          <select class="select" name="unidade">
            <option value="kg">kg</option>
            <option value="sc">sacas</option>
          </select>
        </div>
        <div><small>💧 Umidade (%)</small><input class="input" name="umidade" type="number" step="0.1" placeholder="Opcional"></div>
        <div><small>📝 Observações</small><input class="input" name="obs" placeholder="Opcional"></div>

        <!-- Máquinas -->
        <div class="full">
          <h4 style="margin-bottom:10px;">🚜 Máquinas utilizadas (opcional)</h4>
          <div id="maquinas-container">
            <div class="maquina-linha">
              <select class="select" name="maquinaId[]">
                <option value="">Selecione uma máquina</option>
                ${maquinas.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('')}
              </select>
              <input class="input" name="quantidade[]" type="number" step="0.01" placeholder="Quantidade colhida">
              <button type="button" class="btn-remove" onclick="removerLinhaMaquina(this)">✕</button>
            </div>
          </div>
          <button type="button" class="btn primary" id="btnAdicionarMaquina" style="margin-top:10px; font-size:12px;">+ Adicionar máquina</button>
        </div>

        <!-- ========== SEÇÃO DE FRETE ========== -->
        <div class="full">
          <div class="frete-section">
            <h4>🚛 Frete e Entrega em Armazéns</h4>
            <div class="help" style="margin-bottom:12px;">Configure até 2 fretes para armazéns diferentes. Informe a quantidade entregue (em toneladas) e o preço por tonelada de cada frete.</div>

            <div class="frete-grid">
              <!-- FRETE 1 -->
              <div class="frete-box">
                <h5>🚛 Frete 1 — Armazém 1</h5>
                <div style="display:grid; gap:8px;">
                  <div><small>🏢 Nome do Armazém 1</small><input class="input" name="frete1_armazem" placeholder="Ex: Armazém Cargill"></div>
                  <div><small>📍 Cidade/Local</small><input class="input" name="frete1_cidade" placeholder="Ex: Sorriso - MT"></div>
                  <div><small>🚛 Transportadora</small><input class="input" name="frete1_transportadora" placeholder="Ex: Transp. Norte"></div>
                  <div><small>📦 Quantidade entregue (ton)</small><input class="input" name="frete1_toneladas" type="number" step="0.01" placeholder="0" onchange="window.__calcularFretes()"></div>
                  <div><small>💰 Preço por tonelada (R$)</small><input class="input" name="frete1_precoTon" type="number" step="0.01" placeholder="0.00" onchange="window.__calcularFretes()"></div>
                  <div style="text-align:right; font-weight:bold; color:#b45309;">
                    Custo Frete 1: <span id="custoFrete1">R$ 0,00</span>
                  </div>
                </div>
              </div>

              <!-- FRETE 2 -->
              <div class="frete-box">
                <h5>🚛 Frete 2 — Armazém 2</h5>
                <div style="display:grid; gap:8px;">
                  <div><small>🏢 Nome do Armazém 2</small><input class="input" name="frete2_armazem" placeholder="Ex: Armazém Bunge"></div>
                  <div><small>📍 Cidade/Local</small><input class="input" name="frete2_cidade" placeholder="Ex: Lucas do Rio Verde - MT"></div>
                  <div><small>🚛 Transportadora</small><input class="input" name="frete2_transportadora" placeholder="Ex: Transp. Sul"></div>
                  <div><small>📦 Quantidade entregue (ton)</small><input class="input" name="frete2_toneladas" type="number" step="0.01" placeholder="0" onchange="window.__calcularFretes()"></div>
                  <div><small>💰 Preço por tonelada (R$)</small><input class="input" name="frete2_precoTon" type="number" step="0.01" placeholder="0.00" onchange="window.__calcularFretes()"></div>
                  <div style="text-align:right; font-weight:bold; color:#b45309;">
                    Custo Frete 2: <span id="custoFrete2">R$ 0,00</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resumo de frete -->
            <div class="frete-resumo">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-size:12px; opacity:0.7;">CUSTO TOTAL DE FRETE</div>
                  <div class="valor" id="custoFreteTotal">R$ 0,00</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12px; opacity:0.7;">TOTAL ENTREGUE</div>
                  <div class="valor" id="totalEntregue">0 ton</div>
                </div>
              </div>
              <div style="margin-top:8px; font-size:11px; opacity:0.6;" id="detalheFretes">Preencha os dados de frete acima</div>
            </div>
          </div>
        </div>

        <div class="full row" style="justify-content:flex-end; margin-top:20px;">
          <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar Colheita</button>
        </div>
      </form>
    </div>

    <!-- Custo de frete por talhão -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🚛 Custo de Frete por Talhão</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Talhão</th><th>Fazenda</th><th>Cultura</th><th>Área (ha)</th><th>Custo Frete</th><th>Frete/ha</th></tr></thead>
          <tbody>
            ${talhoes.map(t => {
              const frete = fretePorTalhao.get(t.id) || 0;
              const freteHa = Number(t.areaHa || 0) > 0 ? frete / t.areaHa : 0;
              return `<tr>
                <td><b>${escapeHtml(t.nome)}</b></td>
                <td>${escapeHtml(findNameById(fazendas, t.fazendaId))}</td>
                <td>${escapeHtml(t.cultura || '-')}</td>
                <td>${num(t.areaHa, 1)}</td>
                <td><b>${kbrl(frete)}</b></td>
                <td>${kbrl(freteHa)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabela de colheitas -->
    <div class="tableWrap">
      <h3>📋 Colheitas Registradas</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Talhão</th>
            <th>Produção</th>
            <th>Unidade</th>
            <th>Umidade</th>
            <th>Frete 1</th>
            <th>Frete 2</th>
            <th>Custo Frete Total</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbodyColheitas"></tbody>
      </table>
    </div>
  `;

  // ==================== CÁLCULO DE FRETES ====================
  window.__calcularFretes = () => {
    const ton1 = Number(document.querySelector('input[name="frete1_toneladas"]').value) || 0;
    const preco1 = Number(document.querySelector('input[name="frete1_precoTon"]').value) || 0;
    const custo1 = ton1 * preco1;

    const ton2 = Number(document.querySelector('input[name="frete2_toneladas"]').value) || 0;
    const preco2 = Number(document.querySelector('input[name="frete2_precoTon"]').value) || 0;
    const custo2 = ton2 * preco2;

    const total = custo1 + custo2;
    const totalTon = ton1 + ton2;

    document.getElementById("custoFrete1").innerText = kbrl(custo1);
    document.getElementById("custoFrete2").innerText = kbrl(custo2);
    document.getElementById("custoFreteTotal").innerText = kbrl(total);
    document.getElementById("totalEntregue").innerText = `${num(totalTon, 2)} ton`;

    let detalhes = [];
    if (ton1 > 0) {
      const arm1 = document.querySelector('input[name="frete1_armazem"]').value || "Armazém 1";
      detalhes.push(`${arm1}: ${num(ton1, 2)} ton × ${kbrl(preco1)}/ton = ${kbrl(custo1)}`);
    }
    if (ton2 > 0) {
      const arm2 = document.querySelector('input[name="frete2_armazem"]').value || "Armazém 2";
      detalhes.push(`${arm2}: ${num(ton2, 2)} ton × ${kbrl(preco2)}/ton = ${kbrl(custo2)}`);
    }
    document.getElementById("detalheFretes").innerHTML = detalhes.length > 0 ? detalhes.join(' | ') : 'Preencha os dados de frete acima';
  };

  // ==================== MÁQUINAS ====================
  let maquinaCount = 1;
  document.getElementById("btnAdicionarMaquina").addEventListener("click", () => {
    const container = document.getElementById("maquinas-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "maquina-linha";
    novaLinha.innerHTML = `
      <select class="select" name="maquinaId[]">
        <option value="">Selecione uma máquina</option>
        ${maquinas.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('')}
      </select>
      <input class="input" name="quantidade[]" type="number" step="0.01" placeholder="Quantidade colhida">
      <button type="button" class="btn-remove" onclick="removerLinhaMaquina(this)">✕</button>
    `;
    container.appendChild(novaLinha);
    maquinaCount++;
  });

  window.removerLinhaMaquina = (botao) => {
    if (document.querySelectorAll('.maquina-linha').length <= 1) {
      toast("Aviso", "Mantenha pelo menos uma linha");
      return;
    }
    botao.closest('.maquina-linha').remove();
  };

  // ==================== RENDERIZAR TABELA ====================
  function renderTabela() {
    const db2 = getDB();
    let rows = onlySafra(db2.colheitas || []).sort((a, b) => (b.dataColheita || "").localeCompare(a.dataColheita || ""));
    // Filtrar colheitas pelos talhões da fazenda selecionada
    if (fazendaAtual) {
      const talhoesFazenda = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rows = rows.filter(c => talhoesFazenda.includes(c.talhaoId));
    }
    const tb = document.getElementById("tbodyColheitas");
    tb.innerHTML = rows.map(c => {
      const talhao = findNameById(talhoes, c.talhaoId);
      const maquinasStr = (c.maquinas || []).map(m => {
        const maq = maquinas.find(q => q.id === m.maquinaId);
        return maq ? `${maq.nome}: ${num(m.quantidade, 0)}` : '';
      }).filter(s => s).join(', ');

      const f1 = c.frete1 || {};
      const f2 = c.frete2 || {};
      const custoF1 = Number(f1.custoFrete || 0);
      const custoF2 = Number(f2.custoFrete || 0);
      const custoFreteCol = custoF1 + custoF2;

      const frete1Str = f1.armazem ? `${escapeHtml(f1.armazem)}<br>${num(f1.toneladas || 0, 2)} ton × ${kbrl(f1.precoTon || 0)}<br><b>${kbrl(custoF1)}</b>` : '-';
      const frete2Str = f2.armazem ? `${escapeHtml(f2.armazem)}<br>${num(f2.toneladas || 0, 2)} ton × ${kbrl(f2.precoTon || 0)}<br><b>${kbrl(custoF2)}</b>` : '-';

      return `
        <tr>
          <td>${c.dataColheita}</td>
          <td><b>${escapeHtml(talhao)}</b></td>
          <td>${num(c.producaoTotal, 0)}</td>
          <td>${c.unidade}</td>
          <td>${c.umidade ? c.umidade + '%' : '-'}</td>
          <td style="font-size:12px;">${frete1Str}</td>
          <td style="font-size:12px;">${frete2Str}</td>
          <td><b style="color:#b45309;">${kbrl(custoFreteCol)}</b></td>
          <td class="noPrint">
            <button class="btn danger" onclick="window.__delColheita('${c.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="9">Nenhuma colheita registrada</td></tr>';
  }

  // ==================== EXCLUIR ====================
  window.__delColheita = (id) => {
    if (!confirm("Excluir este registro de colheita?")) return;
    const db2 = getDB();
    db2.colheitas = (db2.colheitas || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Registro removido");
    pageColheitas();
  };

  // ==================== SUBMIT ====================
  document.getElementById("frmColheita").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const talhaoId = fd.get("talhaoId");
    if (!talhaoId) { alert("Selecione um talhão"); return; }

    const producaoTotal = Number(fd.get("producaoTotal") || 0);
    if (producaoTotal <= 0) { alert("Produção deve ser > 0"); return; }

    // Coletar máquinas
    const maquinaIds = fd.getAll("maquinaId[]").filter(id => id);
    const quantidades = fd.getAll("quantidade[]").map(q => Number(q) || 0);
    const maquinasArray = [];
    for (let i = 0; i < maquinaIds.length; i++) {
      if (maquinaIds[i] && quantidades[i] > 0) {
        maquinasArray.push({
          maquinaId: maquinaIds[i],
          quantidade: quantidades[i]
        });
      }
    }

    // Coletar dados de frete 1
    const frete1_armazem = fd.get("frete1_armazem") || "";
    const frete1_cidade = fd.get("frete1_cidade") || "";
    const frete1_transportadora = fd.get("frete1_transportadora") || "";
    const frete1_toneladas = Number(fd.get("frete1_toneladas") || 0);
    const frete1_precoTon = Number(fd.get("frete1_precoTon") || 0);
    const frete1_custo = frete1_toneladas * frete1_precoTon;

    // Coletar dados de frete 2
    const frete2_armazem = fd.get("frete2_armazem") || "";
    const frete2_cidade = fd.get("frete2_cidade") || "";
    const frete2_transportadora = fd.get("frete2_transportadora") || "";
    const frete2_toneladas = Number(fd.get("frete2_toneladas") || 0);
    const frete2_precoTon = Number(fd.get("frete2_precoTon") || 0);
    const frete2_custo = frete2_toneladas * frete2_precoTon;

    const obj = {
      id: uid("col"),
      safraId: getSafraId(),
      dataColheita: fd.get("dataColheita") || nowISO(),
      talhaoId,
      producaoTotal,
      unidade: fd.get("unidade") || "kg",
      umidade: fd.get("umidade") ? Number(fd.get("umidade")) : null,
      observacoes: fd.get("obs") || "",
      maquinas: maquinasArray,
      // Frete 1
      frete1: frete1_armazem || frete1_toneladas > 0 ? {
        armazem: frete1_armazem,
        cidade: frete1_cidade,
        transportadora: frete1_transportadora,
        toneladas: frete1_toneladas,
        precoTon: frete1_precoTon,
        custoFrete: frete1_custo
      } : null,
      // Frete 2
      frete2: frete2_armazem || frete2_toneladas > 0 ? {
        armazem: frete2_armazem,
        cidade: frete2_cidade,
        transportadora: frete2_transportadora,
        toneladas: frete2_toneladas,
        precoTon: frete2_precoTon,
        custoFrete: frete2_custo
      } : null
    };

    const db2 = getDB();
    db2.colheitas = db2.colheitas || [];
    db2.colheitas.push(obj);
    setDB(db2);

    toast("Colheita registrada", `Produção: ${num(producaoTotal, 0)} ${obj.unidade}${(frete1_custo + frete2_custo) > 0 ? ` | Frete: ${kbrl(frete1_custo + frete2_custo)}` : ''}`);
    pageColheitas();
  });

  // ==================== EXPORT CSV ====================
  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = colheitas.map(c => {
      const talhao = findNameById(talhoes, c.talhaoId);
      const f1 = c.frete1 || {};
      const f2 = c.frete2 || {};
      return {
        Data: c.dataColheita,
        Talhão: talhao,
        Produção: c.producaoTotal,
        Unidade: c.unidade,
        Umidade: c.umidade || '',
        Frete1_Armazém: f1.armazem || '',
        Frete1_Cidade: f1.cidade || '',
        Frete1_Transportadora: f1.transportadora || '',
        Frete1_Toneladas: f1.toneladas || 0,
        Frete1_Preço_Ton: f1.precoTon || 0,
        Frete1_Custo: f1.custoFrete || 0,
        Frete2_Armazém: f2.armazem || '',
        Frete2_Cidade: f2.cidade || '',
        Frete2_Transportadora: f2.transportadora || '',
        Frete2_Toneladas: f2.toneladas || 0,
        Frete2_Preço_Ton: f2.precoTon || 0,
        Frete2_Custo: f2.custoFrete || 0,
        Custo_Frete_Total: (f1.custoFrete || 0) + (f2.custoFrete || 0),
        Observações: c.observacoes
      };
    });
    downloadText(`colheitas-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado");
  });

  renderTabela();
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
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
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

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>📝 Registrar nova aplicação</h3>
        <div class="help">Preencha os dados da aplicação. O custo total é calculado automaticamente.</div>
        <div class="hr"></div>
        
        <form id="frm" class="formGrid">
          <div><small>📅 Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div><small>🏢 Fazenda</small><select class="select" name="fazendaId" required>${optionList(fazendas)}</select></div>
          <div><small>🧭 Talhão</small><select class="select" name="talhaoId" required>${optionList(talhoes)}</select></div>
          <div><small>📏 Área aplicada (ha)</small><input class="input" name="areaHaAplicada" type="number" step="0.1" required /></div>
          <div><small>🌱 Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>🎯 Alvo</small><input class="input" name="alvo" placeholder="Praga / Doença" /></div>
          <div><small>🚜 Operação</small><input class="input" name="operacao" placeholder="Pulverização" /></div>
          <div><small>⚙️ Máquina</small><select class="select" name="maquinaId"><option value="">(opcional)</option>${optionList(maquinas)}</select></div>
          <div><small>👤 Operador</small><select class="select" name="operadorId"><option value="">(opcional)</option>${optionList(equipe)}</select></div>
          <div><small>🌬️ Vento (km/h)</small><input class="input" name="vento" type="number" /></div>
          <div><small>🌡️ Temperatura (°C)</small><input class="input" name="temp" type="number" /></div>
          <div><small>💧 Umidade (%)</small><input class="input" name="umidade" type="number" /></div>

          <div class="full">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <h4 style="margin:0;">🧪 Produtos aplicados</h4>
              <button type="button" class="btn primary" id="btnAdicionarProduto" style="font-size:12px;">+ Adicionar produto</button>
            </div>
            <div class="help">Selecione o produto e informe a dose por hectare. O custo será somado automaticamente.</div>
            <div class="hr"></div>
            
            <div id="produtos-container">
              <div class="produto-linha" style="display:grid; grid-template-columns: 3fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px; align-items:center;">
                <select class="select" name="produtoId[]" onchange="window.atualizarPrecoUnit(this, 0)">
                  <option value="">Selecione um produto...</option>
                  ${produtoOptions()}
                </select>
                <input class="input" name="dose[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.calcularCustoTotal()" />
                <span class="badge" id="unidade-0" style="background:#2a2a30; padding:8px; text-align:center;">—</span>
                <span class="badge" id="custo-0" style="background:#2a2a30; color:#4CAF50; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
              </div>
            </div>
          </div>

          <div class="full"><small>📝 Observações</small><textarea class="textarea" name="obs"></textarea></div>

          <div class="full" style="margin-top:20px;">
            <div style="background: linear-gradient(135deg, #1a2a3a, #0f1a24); padding:20px; border-radius:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h4 style="margin:0; color:#888;">💵 CUSTO TOTAL ESTIMADO</h4>
                  <div style="font-size:32px; font-weight:bold; color:#4CAF50;" id="custoTotalDisplay">R$ 0,00</div>
                </div>
                <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar aplicação</button>
              </div>
              <div style="margin-top:10px; font-size:12px; color:#888;" id="detalheCusto">Nenhum produto selecionado</div>
            </div>
          </div>
        </form>
      </div>

      <div class="tableWrap" style="margin-top:20px;">
        <h3>📋 Últimas aplicações</h3>
        <table>
          <thead><tr><th>Data</th><th>Talhão</th><th>Área</th><th>Produtos</th><th>Custo</th><th style="text-align:center;">Ações</th></tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  let produtoCount = 1;
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
      <select class="select" name="produtoId[]" onchange="window.atualizarPrecoUnit(this, ${produtoCount})">
        <option value="">Selecione um produto...</option>
        ${produtoOptions()}
      </select>
      <input class="input" name="dose[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.calcularCustoTotal()" />
      <span class="badge" id="unidade-${produtoCount}" style="background:#2a2a30; padding:8px; text-align:center;">—</span>
      <div style="display:flex; gap:5px;">
        <span class="badge" id="custo-${produtoCount}" style="background:#2a2a30; color:#4CAF50; padding:8px; text-align:center; font-weight:bold; flex:1;">R$ 0,00</span>
        <button type="button" class="btn danger" style="padding:8px;" onclick="removerLinhaProduto(this)">✕</button>
      </div>
    `;
    container.appendChild(novaLinha);
    produtoCount++;
  });

  window.removerLinhaProduto = (botao) => {
    if (document.querySelectorAll('.produto-linha').length <= 1) {
      toast("Aviso", "Mantenha pelo menos um produto");
      return;
    }
    botao.closest('.produto-linha').remove();
    window.calcularCustoTotal();
  };

  window.atualizarPrecoUnit = (select, index) => {
    const opt = select.options[select.selectedIndex];
    const unidade = opt.dataset.unidade || '';
    document.getElementById(`unidade-${index}`).innerText = unidade || '—';
    window.calcularCustoTotal();
  };

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

    document.getElementById('custoTotalDisplay').innerText = kbrl(total);
    document.getElementById('detalheCusto').innerHTML = detalhes.length > 0 ? detalhes.join('<br>') : 'Nenhum produto selecionado';
    return total;
  };

  document.querySelector('input[name="areaHaAplicada"]').addEventListener('input', window.calcularCustoTotal);

  function render() {
    const db2 = getDB();
    let rows = onlySafra(db2.aplicacoes || []);
    // Filtrar aplicações pelos talhões da fazenda selecionada
    if (fazendaAtual) {
      const talhoesFazenda = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rows = rows.filter(a => talhoesFazenda.includes(a.talhaoId));
    }
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(a => {
      const tal = findNameById(talhoes, a.talhaoId);
      const prds = (a.produtos || []).map(p => p.produtoNome).join(' + ');
      return `<tr><td>${a.data}</td><td><b>${escapeHtml(tal)}</b></td><td>${num(a.areaHaAplicada,1)} ha</td><td>${escapeHtml(prds||'—')}</td><td style="color:#4CAF50;">${kbrl(a.custoTotal)}</td><td style="text-align:center;"><button class="btn danger" style="padding:4px 8px;" onclick="window.__delA('${a.id}')">Excluir</button></td></tr>`;
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

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const area = Number(fd.get("areaHaAplicada") || 0);
    if (area <= 0) { alert("Área deve ser > 0"); return; }

    const produtosArray = [];
    const produtoIds = fd.getAll("produtoId[]").filter(id => id);
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

    const custoTotal = produtosArray.reduce((acc, p) => acc + (p.precoUnit * p.dosePorHa * area), 0);

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

    const msgs = [];
    for (const p of produtosArray) {
      const qtd = p.dosePorHa * area;
      const res = baixaEstoqueProdutoPorId(db2, p.produtoId, qtd, p.unidade);
      if (res.ok) msgs.push(res.msg);
    }

    setDB(db2);
    e.target.reset();

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
    window.calcularCustoTotal();

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

// pageRelatorios stub removido - função real abaixo

window.setPlano = (p) => { localStorage.setItem("agro_plano", p); location.reload(); };
function pageConfiguracoes() {
  const db = getDB();
  const params = db.parametros || { 
    precoSoja: 120, 
    produtividadeMinSoja: 65, 
    produtividadeMaxSoja: 75,
    precoMilho: 60,
    produtividadeMinMilho: 100,
    produtividadeMaxMilho: 130,
    precoAlgodao: 150,
    produtividadeMinAlgodao: 250,
    produtividadeMaxAlgodao: 300,
    pesoPadraoSaca: 60
  };

  setTopActions(`
    <button class="btn" id="btnImport">📥 Importar Backup</button>
    <button class="btn primary" id="btnExport">📤 Exportar Backup</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .config-section { margin-bottom: 30px; }
      .config-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        margin-bottom: 20px;
      }
      .config-card h3 { margin-top: 0; color: #3b82f6; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
      .reset-buttons { display: flex; gap: 15px; margin-top: 15px; flex-wrap: wrap; }
      .btn.warning { background: #f59e0b; color: white; }
    </style>

    <div class="config-section">
      <div class="config-card">
        <h3>💎 Planos e Assinatura</h3>
        <p>Seu plano atual: <b>${planoAtual}</b></p>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-top:15px;">
          <div style="padding:15px; border-radius:8px; border: ${planoAtual==='Básico'?'3px solid #4CAF50':'1px solid #e2e8f0'}; background:white;">
            <h4 style="margin:0 0 5px 0;">Básico</h4>
            <p style="font-size:20px; font-weight:bold; margin:5px 0;">R$ 290<small>/mês</small></p>
            <small>2 fazendas, 10 talhões/fazenda</small><br>
            <button class="btn" style="margin-top:10px;" onclick="setPlano('Básico')">Selecionar</button>
          </div>
          <div style="padding:15px; border-radius:8px; border: ${planoAtual==='Pro'?'3px solid #4CAF50':'1px solid #e2e8f0'}; background:white;">
            <h4 style="margin:0 0 5px 0;">Pro</h4>
            <p style="font-size:20px; font-weight:bold; margin:5px 0;">R$ 450<small>/mês</small></p>
            <small>4 fazendas, 15 talhões/fazenda, IA</small><br>
            <button class="btn" style="margin-top:10px;" onclick="setPlano('Pro')">Selecionar</button>
          </div>
          <div style="padding:15px; border-radius:8px; border: ${planoAtual==='Master'?'3px solid #4CAF50':'1px solid #e2e8f0'}; background:white;">
            <h4 style="margin:0 0 5px 0;">Master</h4>
            <p style="font-size:20px; font-weight:bold; margin:5px 0;">R$ 790<small>/mês</small></p>
            <small>5 fazendas, Talhões ilimitados, IA Ilimitada</small><br>
            <button class="btn" style="margin-top:10px;" onclick="setPlano('Master')">Selecionar</button>
          </div>
        </div>
      </div>

      <div class="config-card">
        <h3>🔑 Configuração da IA (API Key)</h3>
        <p style="color:#64748b; font-size:13px;">Para usar o Agro-Copilot e a IA Prescritiva, informe sua chave da API OpenAI. A chave é armazenada apenas localmente no seu navegador.</p>
        <div style="display:flex; gap:10px; align-items:center; margin-top:10px;">
          <input class="input" id="inputApiKeyConfig" type="password" placeholder="sk-..." style="max-width:400px;" value="">
          <button class="btn primary" id="btnSalvarKeyConfig">Salvar Chave</button>
        </div>
        <div style="margin-top:8px; font-size:12px; color:#64748b;" id="statusKeyConfig"></div>
      </div>

      <div class="config-card">
        <h3>⚙️ Parâmetros de Mercado</h3>
        <form id="frmParams" class="formGrid">
          <div><small>Preço da saca de soja (R$)</small><input class="input" name="precoSoja" value="${params.precoSoja}"></div>
          <div><small>Produtividade mínima soja (sc/ha)</small><input class="input" name="prodMinSoja" value="${params.produtividadeMinSoja}"></div>
          <div><small>Produtividade máxima soja (sc/ha)</small><input class="input" name="prodMaxSoja" value="${params.produtividadeMaxSoja}"></div>
          <div><small>Preço do milho (R$/sc)</small><input class="input" name="precoMilho" value="${params.precoMilho||60}"></div>
          <div><small>Produtividade mínima milho (sc/ha)</small><input class="input" name="prodMinMilho" value="${params.produtividadeMinMilho||100}"></div>
          <div><small>Produtividade máxima milho (sc/ha)</small><input class="input" name="prodMaxMilho" value="${params.produtividadeMaxMilho||130}"></div>
          <div><small>Preço do algodão (R$/sc)</small><input class="input" name="precoAlgodao" value="${params.precoAlgodao||150}"></div>
          <div><small>Produtividade mínima algodão (sc/ha)</small><input class="input" name="prodMinAlgodao" value="${params.produtividadeMinAlgodao||250}"></div>
          <div><small>Produtividade máxima algodão (sc/ha)</small><input class="input" name="prodMaxAlgodao" value="${params.produtividadeMaxAlgodao||300}"></div>
          <div><small>Peso padrão da saca (kg)</small><input class="input" name="pesoPadraoSaca" value="${params.pesoPadraoSaca||60}"></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar parâmetros</button></div>
        </form>
      </div>
      <div class="config-card">
        <h3>💾 Backup e Restauração</h3>
        <div class="row" style="gap:10px;"><button class="btn primary" id="btnExport2">📤 Exportar Backup</button><button class="btn" id="btnImport2">📥 Importar Backup</button></div>
      </div>
      <div class="config-card">
        <h3>⚠️ Reset de Dados</h3>
        <div class="reset-buttons"><button class="btn warning" id="btnZerarDados">🧹 Zerar todos os dados</button><button class="btn primary" id="btnRestaurarDemo">🔄 Restaurar dados de demonstração</button></div>
        <p style="margin-top:15px; color:#64748b; font-size:13px;"><strong>Zerar dados:</strong> remove todas as fazendas, talhões, produtos, estoque, etc., mantendo apenas a safra atual.<br><strong>Restaurar demo:</strong> recria o banco com os dados de exemplo.</p>
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
      produtividadeMaxSoja: Number(fd.get("prodMaxSoja") || 75),
      precoMilho: Number(fd.get("precoMilho") || 60),
      produtividadeMinMilho: Number(fd.get("prodMinMilho") || 100),
      produtividadeMaxMilho: Number(fd.get("prodMaxMilho") || 130),
      precoAlgodao: Number(fd.get("precoAlgodao") || 150),
      produtividadeMinAlgodao: Number(fd.get("prodMinAlgodao") || 250),
      produtividadeMaxAlgodao: Number(fd.get("prodMaxAlgodao") || 300),
      pesoPadraoSaca: Number(fd.get("pesoPadraoSaca") || 60)
    };
    setDB(db2);
    toast("Parâmetros salvos", "Valores atualizados.");
  });

  const exportBackup = () => { downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2)); toast("Backup exportado", "Arquivo .json baixado."); };
  document.getElementById("btnExport").addEventListener("click", exportBackup);
  document.getElementById("btnExport2").addEventListener("click", exportBackup);

  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.safras) { alert("Arquivo inválido (não contém safras)."); return; }
        if (!confirm("Importar vai SUBSTITUIR todos os dados locais. Continuar?")) return;
        Storage.save(data);
        toast("Importado", "Recarregando…");
        setTimeout(() => location.reload(), 200);
      } catch (e) { alert("Não foi possível ler o arquivo JSON."); }
    };
    input.click();
  };
  document.getElementById("btnImport").addEventListener("click", importBackup);
  document.getElementById("btnImport2").addEventListener("click", importBackup);

  document.getElementById("btnZerarDados").addEventListener("click", () => {
    if (!confirm("⚠️ Isso vai APAGAR todas as fazendas, talhões, produtos, estoque, aplicações, colheitas, etc. Deseja continuar?")) return;
    const db2 = getDB();
    const safraAtualId = getSafraId();
    db2.fazendas = []; db2.talhoes = []; db2.produtos = []; db2.estoque = []; db2.equipe = []; db2.maquinas = []; db2.clima = []; db2.dieselEntradas = []; db2.dieselEstoque = []; db2.combustivel = []; db2.aplicacoes = []; db2.lembretes = []; db2.pragas = []; db2.colheitas = []; db2.manutencoes = []; db2.insumosBase = [];
    db2.dieselEstoque.push({ id: uid("dsl"), safraId: safraAtualId, deposito: "Tanque Principal", litros: 0, precoVigente: 0, obs: "Estoque zerado" });
    setDB(db2);
    toast("Dados zerados", "Todos os registros foram removidos.");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnRestaurarDemo").addEventListener("click", () => {
    if (!confirm("⚠️ Isso vai SUBSTITUIR todos os dados atuais pelos dados de demonstração. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Demonstração restaurada", "Banco de dados recriado.");
    setTimeout(() => location.reload(), 200);
  });

  // Listeners da API Key na Configuração
  const savedKeyConfig = localStorage.getItem("agro_pro_openai_key") || "";
  if (savedKeyConfig) {
    document.getElementById("inputApiKeyConfig").value = savedKeyConfig;
    document.getElementById("statusKeyConfig").innerHTML = '✅ Chave configurada';
    window.__OPENAI_KEY = savedKeyConfig;
  }
  document.getElementById("btnSalvarKeyConfig").addEventListener("click", () => {
    const key = document.getElementById("inputApiKeyConfig").value.trim();
    if (!key) { toast("Erro", "Informe uma chave válida."); return; }
    localStorage.setItem("agro_pro_openai_key", key);
    window.__OPENAI_KEY = key;
    document.getElementById("statusKeyConfig").innerHTML = '✅ Chave salva com sucesso!';
    toast("Chave salva", "API Key configurada.");
  });
}

// ============================================================================
// PÁGINA RELATÓRIOS — ATUALIZADA COM MANUTENÇÃO, INSUMOS BASE E FRETE
// ============================================================================

function pageRelatorios() {
  const db = getDB();
  const safra = getSafraAtual();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const aplicacoes = onlySafra(db.aplicacoes);
  const clima = onlySafra(db.clima);
  const combustivel = onlySafra(db.combustivel);
  const colheitas = onlySafra(db.colheitas);
  const produtos = onlySafra(db.produtos);
  const manutencoes = onlySafra(db.manutencoes || []);
  const insumosBase = onlySafra(db.insumosBase || []);
  const maquinas = onlySafra(db.maquinas);
  const params = db.parametros || { 
    precoSoja: 120, 
    precoMilho: 60, 
    precoAlgodao: 150,
    produtividadeMinSoja: 65,
    produtividadeMaxSoja: 75,
    produtividadeMinMilho: 100,
    produtividadeMaxMilho: 130,
    produtividadeMinAlgodao: 250,
    produtividadeMaxAlgodao: 300,
    pesoPadraoSaca: 60
  };

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
    <button class="btn primary" id="btnPrint">🖨️ Imprimir</button>
  `);

  // ==================== CÁLCULOS GERAIS ====================

  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoAplicacoes = aplicacoes.reduce((s, a) => s + Number(a.custoTotal || 0), 0);
  const custoCombustivel = combustivel.reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
  const custoManutencao = manutencoes.reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  const custoInsumosBase = insumosBase.reduce((s, i) => s + Number(i.custoTotal || 0), 0);
  const custoFrete = colheitas.reduce((s, c) => {
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    return s + frete;
  }, 0);
  const custoTotal = custoAplicacoes + custoCombustivel + custoManutencao + custoInsumosBase + custoFrete;
  const custoPorHa = areaTotal > 0 ? custoTotal / areaTotal : 0;

  // Produção e receita real
  let producaoTotalKg = 0;
  let receitaRealTotal = 0;
  const colheitaMap = new Map();
  colheitas.forEach(c => {
    colheitaMap.set(c.talhaoId, c);
    producaoTotalKg += c.producaoTotal;
    const talhao = talhoes.find(t => t.id === c.talhaoId);
    if (talhao) {
      const cultura = talhao.cultura?.toLowerCase() || '';
      let preco = params.precoSoja;
      if (cultura === 'milho') preco = params.precoMilho;
      if (cultura === 'algodao') preco = params.precoAlgodao;
      const sacas = c.unidade === 'kg' ? c.producaoTotal / params.pesoPadraoSaca : c.producaoTotal;
      receitaRealTotal += sacas * preco;
    }
  });

  // Receita estimada total
  const produtividadeMedia = {
    soja: (params.produtividadeMinSoja + params.produtividadeMaxSoja) / 2,
    milho: (params.produtividadeMinMilho + params.produtividadeMaxMilho) / 2,
    algodao: (params.produtividadeMinAlgodao + params.produtividadeMaxAlgodao) / 2
  };
  let receitaEstimadaTotal = 0;
  talhoes.forEach(t => {
    const cultura = t.cultura?.toLowerCase() || '';
    let preco = params.precoSoja;
    let prodMedia = produtividadeMedia.soja;
    if (cultura === 'milho') {
      preco = params.precoMilho;
      prodMedia = produtividadeMedia.milho;
    } else if (cultura === 'algodao') {
      preco = params.precoAlgodao;
      prodMedia = produtividadeMedia.algodao;
    }
    receitaEstimadaTotal += (t.areaHa || 0) * prodMedia * preco;
  });

  const lucroEstimadoTotal = receitaEstimadaTotal - custoTotal;
  const lucroRealTotal = receitaRealTotal - custoTotal;

  // ==================== DADOS CLIMÁTICOS ====================

  const totalChuva = clima.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const diasComChuva = clima.filter(c => c.chuvaMm > 0).length;
  const mediaChuva = clima.length ? totalChuva / clima.length : 0;
  const tempMaxMedia = clima.reduce((s, c) => s + Number(c.tempMax || 0), 0) / (clima.length || 1);
  const tempMinMedia = clima.reduce((s, c) => s + Number(c.tempMin || 0), 0) / (clima.length || 1);

  // ==================== DADOS DE COMBUSTÍVEL ====================

  const totalDieselComprado = (onlySafra(db.dieselEntradas || [])).reduce((s, e) => s + Number(e.litros || 0), 0);
  const totalDieselConsumido = combustivel.reduce((s, c) => s + Number(c.litros || 0), 0);
  const dieselPorHa = areaTotal > 0 ? totalDieselConsumido / areaTotal : 0;
  const mediaPrecoDiesel = (onlySafra(db.dieselEntradas || [])).reduce((s, e) => s + Number(e.precoLitro || 0), 0) / ((onlySafra(db.dieselEntradas || [])).length || 1);

  // ==================== DADOS DE APLICAÇÕES ====================

  const totalAplicacoes = aplicacoes.length;
  const areaTotalAplicada = aplicacoes.reduce((s, a) => s + Number(a.areaHaAplicada || 0), 0);
  const mediaCustoPorAplicacao = totalAplicacoes ? custoAplicacoes / totalAplicacoes : 0;

  // Produtos mais usados
  const usoProdutos = {};
  aplicacoes.forEach(a => {
    (a.produtos || []).forEach(p => {
      usoProdutos[p.produtoNome] = (usoProdutos[p.produtoNome] || 0) + 1;
    });
  });
  const topProdutos = Object.entries(usoProdutos).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ==================== DADOS DE MANUTENÇÃO ====================

  const totalManutencoes = manutencoes.length;
  const manutPreventivas = manutencoes.filter(m => m.tipoManutencao === "Preventiva").length;
  const manutCorretivas = manutencoes.filter(m => m.tipoManutencao === "Corretiva").length;
  const manutPreditivas = manutencoes.filter(m => m.tipoManutencao === "Preditiva").length;
  const manutCustoPorHa = areaTotal > 0 ? custoManutencao / areaTotal : 0;

  // Custo manutenção por máquina
  const custoManutPorMaquina = new Map();
  manutencoes.forEach(m => {
    const atual = custoManutPorMaquina.get(m.maquinaId) || { custo: 0, qtd: 0 };
    atual.custo += Number(m.custoTotal || 0);
    atual.qtd += 1;
    custoManutPorMaquina.set(m.maquinaId, atual);
  });

  // ==================== DADOS DE INSUMOS BASE ====================

  const totalInsumosBase = insumosBase.length;
  const insumoCustoPorHa = areaTotal > 0 ? custoInsumosBase / areaTotal : 0;

  // Custo insumos base por tipo
  const custoInsumoPorTipo = {};
  insumosBase.forEach(i => {
    const tipo = i.tipoInsumo || "Outros";
    custoInsumoPorTipo[tipo] = (custoInsumoPorTipo[tipo] || 0) + Number(i.custoTotal || 0);
  });

  // ==================== DADOS DE FRETE ====================

  const toneladasTotal = colheitas.reduce((s, c) => {
    let ton = 0;
    if (c.frete1) ton += Number(c.frete1.toneladas || 0);
    if (c.frete2) ton += Number(c.frete2.toneladas || 0);
    return s + ton;
  }, 0);
  const fretePorTon = toneladasTotal > 0 ? custoFrete / toneladasTotal : 0;
  const fretePorHa = areaTotal > 0 ? custoFrete / areaTotal : 0;

  // ==================== DADOS POR TALHÃO (DETALHADO) ====================

  const dadosTalhoes = talhoes.map(t => {
    const custoApl = aplicacoes.filter(a => a.talhaoId === t.id).reduce((s, a) => s + Number(a.custoTotal || 0), 0);
    const custoComb = combustivel.filter(c => c.talhaoId === t.id).reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
    const custoInsumo = insumosBase.filter(i => i.talhaoId === t.id).reduce((s, i) => s + Number(i.custoTotal || 0), 0);
    const custoFreteT = colheitas.filter(c => c.talhaoId === t.id).reduce((s, c) => {
      let f = 0;
      if (c.frete1) f += Number(c.frete1.custoFrete || 0);
      if (c.frete2) f += Number(c.frete2.custoFrete || 0);
      return s + f;
    }, 0);
    // Manutenção: rateio proporcional à área (não é por talhão diretamente)
    const custoManutRateio = areaTotal > 0 ? custoManutencao * (Number(t.areaHa || 0) / areaTotal) : 0;
    const custo = custoApl + custoComb + custoInsumo + custoFreteT + custoManutRateio;
    const colheita = colheitaMap.get(t.id);
    const producaoKg = colheita ? colheita.producaoTotal : 0;
    const cultura = t.cultura?.toLowerCase() || '';
    let preco = params.precoSoja;
    let prodMedia = produtividadeMedia.soja;
    if (cultura === 'milho') {
      preco = params.precoMilho;
      prodMedia = produtividadeMedia.milho;
    } else if (cultura === 'algodao') {
      preco = params.precoAlgodao;
      prodMedia = produtividadeMedia.algodao;
    }
    const receitaEstimada = (t.areaHa || 0) * prodMedia * preco;
    const receitaReal = colheita ? (colheita.unidade === 'kg' ? (colheita.producaoTotal / params.pesoPadraoSaca) * preco : colheita.producaoTotal * preco) : 0;
    const lucroReal = receitaReal - custo;

    return {
      talhao: t.nome,
      fazenda: findNameById(fazendas, t.fazendaId),
      cultura: t.cultura || '-',
      area: t.areaHa || 0,
      custo,
      custoApl,
      custoComb,
      custoInsumo,
      custoFreteT,
      custoManutRateio,
      producaoKg,
      receitaEstimada,
      receitaReal,
      lucroReal,
      temColheita: !!colheita
    };
  }).sort((a, b) => b.custo - a.custo);

  // ==================== DADOS MENSAIS PARA GRÁFICOS ====================

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chuvaPorMes = new Array(12).fill(0);
  const custoPorMes = new Array(12).fill(0);
  const consumoDieselPorMes = new Array(12).fill(0);

  clima.forEach(c => {
    if (c.data) {
      const mes = parseInt(c.data.substring(5, 7)) - 1;
      chuvaPorMes[mes] += Number(c.chuvaMm || 0);
    }
  });

  [...aplicacoes, ...combustivel].forEach(item => {
    if (item.data) {
      const mes = parseInt(item.data.substring(5, 7)) - 1;
      const valor = item.custoTotal || (item.litros * item.precoLitro) || 0;
      custoPorMes[mes] += valor;
      if (item.litros) consumoDieselPorMes[mes] += Number(item.litros);
    }
  });

  const maxChuva = Math.max(...chuvaPorMes, 1);
  const maxCusto = Math.max(...custoPorMes, 1);
  const maxConsumo = Math.max(...consumoDieselPorMes, 1);

  // Comparativo com safras passadas (simulado)
  const safrasPassadas = [
    { nome: '2024/25', custo: custoTotal * 0.85, receita: receitaRealTotal * 0.8, area: areaTotal * 0.93 },
    { nome: '2023/24', custo: custoTotal * 0.72, receita: receitaRealTotal * 0.65, area: areaTotal * 0.88 },
    { nome: '2022/23', custo: custoTotal * 0.68, receita: receitaRealTotal * 0.6, area: areaTotal * 0.82 }
  ];

  // ==================== LAYOUT DA PÁGINA ====================

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .relatorio-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .relatorio-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .relatorio-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .relatorio-kpi-valor {
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
      }
      .relatorio-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .destaque-positivo { color: #059669; }
      .destaque-negativo { color: #b91c1c; }
      .grafico-barras {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 150px;
        margin: 15px 0;
      }
      .barra {
        flex: 1;
        background: #3b82f6;
        border-radius: 4px 4px 0 0;
        min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label {
        text-align: center;
        font-size: 10px;
        color: #475569;
        margin-top: 5px;
      }
      .secao-titulo {
        margin: 30px 0 15px;
        font-size: 20px;
        font-weight: 600;
        color: #0f172a;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 5px;
      }
      .composicao-custo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      @media (max-width: 768px) {
        .composicao-custo { grid-template-columns: 1fr; }
      }
    </style>

    <!-- ========== CABEÇALHO ========== -->
    <div style="margin-bottom:20px;">
      <h2>📊 Relatório Completo - ${escapeHtml(safra?.nome || 'Safra Atual')}</h2>
      <p style="color:#475569;">Período: ${safra?.dataInicio || 'N/A'} a ${safra?.dataFim || 'N/A'}</p>
    </div>

    <!-- ========== KPIs PRINCIPAIS ========== -->
    <div class="relatorio-kpi-grid">
      <div class="relatorio-kpi-card">
        <h3>📏 Área Total</h3>
        <div class="relatorio-kpi-valor">${num(areaTotal, 1)} ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoTotal)}</div>
        <div class="relatorio-kpi-label">R$ ${num(custoPorHa, 2)}/ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>🌾 Produção Total</h3>
        <div class="relatorio-kpi-valor">${num(producaoTotalKg, 0)} kg</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📊 Receita Total</h3>
        <div class="relatorio-kpi-valor ${receitaRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(receitaRealTotal)}</div>
        <div class="relatorio-kpi-label">vs estimado ${kbrl(lucroEstimadoTotal)}</div>
      </div>
    </div>

    <!-- ========== COMPOSIÇÃO DE CUSTOS (NOVO) ========== -->
    <div class="secao-titulo">💰 Composição de Custos da Safra</div>
    <div class="composicao-custo">
      <div class="card">
        <h4>📊 Custos por Categoria</h4>
        <table style="width:100%;">
          <tr><td><b>Aplicações (defensivos)</b></td><td style="text-align:right">${kbrl(custoAplicacoes)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoAplicacoes/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Insumos Base (adubação)</b></td><td style="text-align:right">${kbrl(custoInsumosBase)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoInsumosBase/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Combustível</b></td><td style="text-align:right">${kbrl(custoCombustivel)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoCombustivel/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Manutenção</b></td><td style="text-align:right">${kbrl(custoManutencao)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoManutencao/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Frete</b></td><td style="text-align:right">${kbrl(custoFrete)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoFrete/custoTotal)*100, 1) : 0}%</td></tr>
          <tr style="border-top:2px solid #e2e8f0; font-weight:bold;"><td><b>TOTAL</b></td><td style="text-align:right"><b>${kbrl(custoTotal)}</b></td><td style="text-align:right">100%</td></tr>
        </table>
      </div>
      <div class="card">
        <h4>📏 Custos por Hectare</h4>
        <table style="width:100%;">
          <tr><td>Aplicações/ha</td><td style="text-align:right">${kbrl(areaTotal > 0 ? custoAplicacoes/areaTotal : 0)}</td></tr>
          <tr><td>Insumos Base/ha</td><td style="text-align:right">${kbrl(areaTotal > 0 ? custoInsumosBase/areaTotal : 0)}</td></tr>
          <tr><td>Combustível/ha</td><td style="text-align:right">${kbrl(areaTotal > 0 ? custoCombustivel/areaTotal : 0)}</td></tr>
          <tr><td>Manutenção/ha</td><td style="text-align:right">${kbrl(manutCustoPorHa)}</td></tr>
          <tr><td>Frete/ha</td><td style="text-align:right">${kbrl(fretePorHa)}</td></tr>
          <tr style="border-top:2px solid #e2e8f0;"><td><b>TOTAL/ha</b></td><td style="text-align:right"><b>${kbrl(custoPorHa)}</b></td></tr>
        </table>
      </div>
    </div>

    <!-- ========== COMPARATIVO RECEITA ========== -->
    <div class="card" style="margin-bottom:20px;">
      <h3>📈 Comparativo Receita</h3>
      <table style="width:100%;">
        <tr>
          <td><b>Receita estimada:</b></td>
          <td style="text-align:right">${kbrl(receitaEstimadaTotal)}</td>
        </tr>
        <tr>
          <td><b>Receita real:</b></td>
          <td style="text-align:right">${kbrl(receitaRealTotal)}</td>
        </tr>
        <tr>
          <td><b>Custo total (com manutenção + insumos + frete):</b></td>
          <td style="text-align:right">${kbrl(custoTotal)}</td>
        </tr>
        <tr style="border-top:2px solid #e2e8f0;">
          <td><b>Lucro real:</b></td>
          <td style="text-align:right"><b class="${lucroRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(lucroRealTotal)}</b></td>
        </tr>
        <tr>
          <td><b>Diferença (real vs estimado):</b></td>
          <td style="text-align:right">
            <span class="${(lucroRealTotal - lucroEstimadoTotal) >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">
              ${kbrl(lucroRealTotal - lucroEstimadoTotal)}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- ========== GRÁFICOS MENSAIS ========== -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div class="card">
        <h4>🌧️ Chuva Mensal (mm)</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (chuvaPorMes[i] / maxChuva) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(chuvaPorMes[i], 1)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <h4>⛽ Consumo Diesel Mensal (L)</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (consumoDieselPorMes[i] / maxConsumo) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px; background:#f97316;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(consumoDieselPorMes[i], 0)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- ========== SEÇÃO CLIMA ========== -->
    <div class="secao-titulo">🌤️ Resumo Climático</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🌧️ Total de Chuvas</h3>
        <div class="relatorio-kpi-valor">${num(totalChuva, 1)} mm</div>
        <div class="relatorio-kpi-label">${diasComChuva} dias com chuva</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📊 Média por Registro</h3>
        <div class="relatorio-kpi-valor">${num(mediaChuva, 1)} mm</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>🌡️ Temperatura Média</h3>
        <div class="relatorio-kpi-valor">${num((tempMaxMedia + tempMinMedia) / 2, 1)}°C</div>
        <div class="relatorio-kpi-label">Mín ${num(tempMinMedia,1)}°C / Máx ${num(tempMaxMedia,1)}°C</div>
      </div>
    </div>

    <!-- ========== SEÇÃO COMBUSTÍVEL ========== -->
    <div class="secao-titulo">⛽ Resumo de Combustível</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🛢️ Diesel Comprado</h3>
        <div class="relatorio-kpi-valor">${num(totalDieselComprado, 0)} L</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>🚜 Diesel Consumido</h3>
        <div class="relatorio-kpi-valor">${num(totalDieselConsumido, 0)} L</div>
        <div class="relatorio-kpi-label">${num(dieselPorHa, 1)} L/ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Preço Médio</h3>
        <div class="relatorio-kpi-valor">${kbrl(mediaPrecoDiesel)}/L</div>
      </div>
    </div>

    <!-- ========== SEÇÃO MANUTENÇÃO (NOVO) ========== -->
    <div class="secao-titulo">🔧 Resumo de Manutenção</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🔧 Total Manutenções</h3>
        <div class="relatorio-kpi-valor">${totalManutencoes}</div>
        <div class="relatorio-kpi-label">P: ${manutPreventivas} | C: ${manutCorretivas} | Pd: ${manutPreditivas}</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoManutencao)}</div>
        <div class="relatorio-kpi-label">${kbrl(manutCustoPorHa)}/ha</div>
      </div>
    </div>
    ${maquinas.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h4>🚜 Custo de Manutenção por Máquina</h4>
      <table style="width:100%;">
        <thead><tr><th>Máquina</th><th>Manutenções</th><th>Custo Total</th></tr></thead>
        <tbody>
          ${maquinas.map(maq => {
            const info = custoManutPorMaquina.get(maq.id) || { custo: 0, qtd: 0 };
            return `<tr><td><b>${escapeHtml(maq.nome)}</b></td><td>${info.qtd}</td><td>${kbrl(info.custo)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ========== SEÇÃO INSUMOS BASE (NOVO) ========== -->
    <div class="secao-titulo">🌱 Resumo de Insumos Base</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🌱 Total Lançamentos</h3>
        <div class="relatorio-kpi-valor">${totalInsumosBase}</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoInsumosBase)}</div>
        <div class="relatorio-kpi-label">${kbrl(insumoCustoPorHa)}/ha</div>
      </div>
    </div>
    ${Object.keys(custoInsumoPorTipo).length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h4>📊 Custo por Tipo de Insumo</h4>
      <table style="width:100%;">
        <thead><tr><th>Tipo</th><th>Custo Total</th><th>%</th></tr></thead>
        <tbody>
          ${Object.entries(custoInsumoPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, custo]) => `
            <tr><td><b>${escapeHtml(tipo)}</b></td><td>${kbrl(custo)}</td><td>${custoInsumosBase > 0 ? num((custo/custoInsumosBase)*100, 1) : 0}%</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ========== SEÇÃO FRETE (NOVO) ========== -->
    <div class="secao-titulo">🚛 Resumo de Frete</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🚛 Custo Total Frete</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoFrete)}</div>
        <div class="relatorio-kpi-label">${kbrl(fretePorHa)}/ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📦 Total Entregue</h3>
        <div class="relatorio-kpi-valor">${num(toneladasTotal, 2)} ton</div>
        <div class="relatorio-kpi-label">${kbrl(fretePorTon)}/ton</div>
      </div>
    </div>

    <!-- ========== SEÇÃO APLICAÇÕES ========== -->
    <div class="secao-titulo">🧪 Resumo de Aplicações</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>📋 Total de Aplicações</h3>
        <div class="relatorio-kpi-valor">${totalAplicacoes}</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📏 Área Total Aplicada</h3>
        <div class="relatorio-kpi-valor">${num(areaTotalAplicada, 1)} ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Médio/Aplicação</h3>
        <div class="relatorio-kpi-valor">${kbrl(mediaCustoPorAplicacao)}</div>
      </div>
    </div>

    <!-- Top 5 produtos mais usados -->
    ${topProdutos.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h4>🧪 Top 5 Produtos Mais Utilizados</h4>
      <table style="width:100%;">
        <thead>
          <tr><th>Produto</th><th>Vezes</th><th>%</th></tr>
        </thead>
        <tbody>
          ${topProdutos.map(([nome, qtd]) => `
            <tr>
              <td><b>${escapeHtml(nome)}</b></td>
              <td>${qtd}</td>
              <td>${((qtd / totalAplicacoes) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ========== DETALHAMENTO POR TALHÃO ========== -->
    <div class="secao-titulo">🌱 Detalhamento por Talhão (Custo Completo)</div>
    <div class="tableWrap" style="margin-bottom:30px;">
      <table>
        <thead>
          <tr>
            <th>Talhão</th>
            <th>Fazenda</th>
            <th>Cultura</th>
            <th>Área (ha)</th>
            <th>Apl.</th>
            <th>Insumos</th>
            <th>Comb.</th>
            <th>Manut.</th>
            <th>Frete</th>
            <th>Custo Total</th>
            <th>Prod. (kg)</th>
            <th>Rec. Est.</th>
            <th>Rec. Real</th>
            <th>Receita Líquida</th>
          </tr>
        </thead>
        <tbody>
          ${dadosTalhoes.map(d => {
            const lucroClass = d.lucroReal >= 0 ? 'destaque-positivo' : 'destaque-negativo';
            return `<tr>
              <td><b>${escapeHtml(d.talhao)}</b></td>
              <td>${escapeHtml(d.fazenda)}</td>
              <td>${escapeHtml(d.cultura)}</td>
              <td>${num(d.area, 1)}</td>
              <td>${kbrl(d.custoApl)}</td>
              <td>${kbrl(d.custoInsumo)}</td>
              <td>${kbrl(d.custoComb)}</td>
              <td>${kbrl(d.custoManutRateio)}</td>
              <td>${kbrl(d.custoFreteT)}</td>
              <td><b>${kbrl(d.custo)}</b></td>
              <td>${d.temColheita ? num(d.producaoKg, 0) : '-'}</td>
              <td>${kbrl(d.receitaEstimada)}</td>
              <td>${d.temColheita ? kbrl(d.receitaReal) : '-'}</td>
              <td class="${lucroClass}">${d.temColheita ? kbrl(d.lucroReal) : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- ========== COMPARATIVO COM SAFRAS PASSADAS ========== -->
    <div class="secao-titulo">📈 Comparativo com Safras Anteriores</div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Safra</th>
            <th>Área (ha)</th>
            <th>Custo Total</th>
            <th>Receita</th>
            <th>Lucro</th>
            <th>Variação (custo/ha)</th>
          </tr>
        </thead>
        <tbody>
          ${safrasPassadas.map(s => {
            const custoHaPassado = s.area > 0 ? s.custo / s.area : 0;
            const variacao = custoHaPassado > 0 ? ((custoPorHa - custoHaPassado) / custoHaPassado) * 100 : 0;
            return `<tr>
              <td><b>${s.nome}</b></td>
              <td>${num(s.area, 0)} ha</td>
              <td>${kbrl(s.custo)}</td>
              <td>${kbrl(s.receita)}</td>
              <td>${kbrl(s.receita - s.custo)}</td>
              <td><span class="${variacao > 0 ? 'destaque-negativo' : 'destaque-positivo'}">${variacao > 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(1)}%</span></td>
            </tr>`;
          }).join('')}
          <tr style="border-top:2px solid #e2e8f0;">
            <td><b>${safra?.nome || 'Atual'}</b></td>
            <td>${num(areaTotal, 0)} ha</td>
            <td>${kbrl(custoTotal)}</td>
            <td>${kbrl(receitaRealTotal)}</td>
            <td>${kbrl(lucroRealTotal)}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // ==================== EXPORTAÇÃO E IMPRESSÃO ====================

  document.getElementById("btnPrint").addEventListener("click", () => window.print());

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = dadosTalhoes.map(d => ({
      Talhão: d.talhao,
      Fazenda: d.fazenda,
      Cultura: d.cultura,
      Área_ha: d.area,
      Custo_Aplicações_R$: d.custoApl,
      Custo_Insumos_Base_R$: d.custoInsumo,
      Custo_Combustível_R$: d.custoComb,
      Custo_Manutenção_R$: d.custoManutRateio,
      Custo_Frete_R$: d.custoFreteT,
      Custo_Total_R$: d.custo,
      Produção_kg: d.producaoKg,
      Receita_Estimada_R$: d.receitaEstimada,
      Receita_Real_R$: d.receitaReal,
      Lucro_Real_R$: d.lucroReal
    }));
    downloadText(`relatorio-completo-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado.");
  });
}




// ============================================================================
// NOVA PÁGINA: MANUTENÇÃO DE MÁQUINAS
// ============================================================================

function pageManutencao() {
  const db = getDB();
  const maquinas = onlySafra(db.maquinas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const manutencoes = onlySafra(db.manutencoes || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  // ==================== CÁLCULOS ====================
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoTotalManut = manutencoes.reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  const custoPorHa = areaTotal > 0 ? custoTotalManut / areaTotal : 0;
  const totalPreventivas = manutencoes.filter(m => m.tipoManutencao === "Preventiva").length;
  const totalCorretivas = manutencoes.filter(m => m.tipoManutencao === "Corretiva").length;
  const totalPreditivas = manutencoes.filter(m => m.tipoManutencao === "Preditiva").length;

  // Alertas de manutenção vencida por horímetro
  const alertasVencidas = [];
  maquinas.forEach(maq => {
    const ultimaManut = manutencoes
      .filter(m => m.maquinaId === maq.id && m.tipoManutencao === "Preventiva")
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0];

    if (ultimaManut) {
      const horimetroAtual = Number(maq.horimetro || 0);
      const horimetroUltima = Number(ultimaManut.horimetroAtual || 0);
      const intervalo = Number(ultimaManut.intervaloHoras || 500);
      const proximaEm = horimetroUltima + intervalo;

      if (horimetroAtual >= proximaEm) {
        alertasVencidas.push({
          maquina: maq.nome,
          maquinaId: maq.id,
          horimetroAtual,
          proximaEm,
          excedido: horimetroAtual - proximaEm,
          ultimaData: ultimaManut.data
        });
      }
    } else if (Number(maq.horimetro || 0) > 0) {
      alertasVencidas.push({
        maquina: maq.nome,
        maquinaId: maq.id,
        horimetroAtual: Number(maq.horimetro || 0),
        proximaEm: 0,
        excedido: 0,
        ultimaData: "Nunca"
      });
    }
  });

  // Custos por máquina
  const custosPorMaquina = new Map();
  manutencoes.forEach(m => {
    const atual = custosPorMaquina.get(m.maquinaId) || { custo: 0, qtd: 0 };
    atual.custo += Number(m.custoTotal || 0);
    atual.qtd += 1;
    custosPorMaquina.set(m.maquinaId, atual);
  });

  // Custos por mês
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const custoPorMes = new Array(12).fill(0);
  manutencoes.forEach(m => {
    if (m.data) {
      const mes = parseInt(m.data.substring(5, 7)) - 1;
      custoPorMes[mes] += Number(m.custoTotal || 0);
    }
  });
  const maxCustoMes = Math.max(...custoPorMes, 1);

  function optionList(arr) {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .manut-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .manut-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .manut-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .manut-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .manut-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .alerta-vencida {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-left: 4px solid #ef4444;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 10px;
      }
      .alerta-vencida b { color: #b91c1c; }
      .peca-linha {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 0.3fr;
        gap: 10px;
        margin-bottom: 8px;
        align-items: center;
      }
      .grafico-barras {
        display: flex; align-items: flex-end; gap: 8px; height: 150px; margin: 15px 0;
      }
      .barra {
        flex: 1; background: #f97316; border-radius: 4px 4px 0 0; min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label { text-align: center; font-size: 10px; color: #475569; margin-top: 5px; }
      .filtro-maquina { margin-bottom: 15px; }
    </style>

    <!-- KPIs -->
    <div class="manut-kpi-grid">
      <div class="manut-kpi-card">
        <h3>🔧 Total Manutenções</h3>
        <div class="manut-kpi-valor">${manutencoes.length}</div>
        <div class="manut-kpi-label">P: ${totalPreventivas} | C: ${totalCorretivas} | Pd: ${totalPreditivas}</div>
      </div>
      <div class="manut-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="manut-kpi-valor">${kbrl(custoTotalManut)}</div>
        <div class="manut-kpi-label">em manutenções</div>
      </div>
      <div class="manut-kpi-card">
        <h3>📏 Custo/ha</h3>
        <div class="manut-kpi-valor">${kbrl(custoPorHa)}</div>
        <div class="manut-kpi-label">sobre ${num(areaTotal, 1)} ha</div>
      </div>
      <div class="manut-kpi-card">
        <h3>⚠️ Vencidas</h3>
        <div class="manut-kpi-valor" style="color: ${alertasVencidas.length > 0 ? '#ef4444' : '#059669'}">${alertasVencidas.length}</div>
        <div class="manut-kpi-label">máquinas com manutenção vencida</div>
      </div>
    </div>

    <!-- Alertas de manutenção vencida -->
    ${alertasVencidas.length > 0 ? `
      <div class="card" style="margin-bottom:20px;">
        <h3>⚠️ Alertas de Manutenção Vencida</h3>
        ${alertasVencidas.map(a => `
          <div class="alerta-vencida">
            <b>🚜 ${escapeHtml(a.maquina)}</b> — Horímetro atual: <b>${num(a.horimetroAtual, 0)}h</b>
            ${a.proximaEm > 0 ? `| Próxima prevista em: ${num(a.proximaEm, 0)}h | Excedido: <b style="color:#ef4444">${num(a.excedido, 0)}h</b>` : '| <b>Nenhuma manutenção preventiva registrada</b>'}
            | Última: ${a.ultimaData}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Gráfico mensal -->
    <div class="card" style="margin-bottom:20px;">
      <h4>📊 Custo de Manutenção por Mês</h4>
      <div class="grafico-barras">
        ${meses.map((mes, i) => {
          const altura = (custoPorMes[i] / maxCustoMes) * 130;
          return `<div style="flex:1;text-align:center;"><div class="barra" style="height:${altura}px;"></div><div class="barra-label">${mes}</div><div style="font-size:9px;color:#475569;">${kbrl(custoPorMes[i])}</div></div>`;
        }).join('')}
      </div>
    </div>

    <!-- Formulário -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🔧 Registrar Manutenção</h3>
      <div class="help">Registre manutenções preventivas, corretivas ou preditivas.</div>
      <div class="hr"></div>
      <form id="frmManut" class="formGrid">
        <div><small>📅 Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
        <div><small>🚜 Máquina</small>
          <select class="select" name="maquinaId" required>
            <option value="">Selecione...</option>
            ${optionList(maquinas)}
          </select>
        </div>
        <div><small>🔧 Tipo de Manutenção</small>
          <select class="select" name="tipoManutencao" required>
            <option value="Preventiva">Preventiva</option>
            <option value="Corretiva">Corretiva</option>
            <option value="Preditiva">Preditiva</option>
          </select>
        </div>
        <div><small>📊 Horímetro Atual</small><input class="input" name="horimetroAtual" type="number" step="0.1" placeholder="Horas atuais"></div>
        <div><small>⏱️ Intervalo Próxima (horas)</small><input class="input" name="intervaloHoras" type="number" step="1" placeholder="Ex: 500" value="500"></div>
        <div><small>📅 Próxima Manutenção (data)</small><input class="input" name="proximaData" type="date"></div>
        <div><small>👤 Mecânico/Responsável</small><input class="input" name="mecanico" type="text" placeholder="Nome do mecânico"></div>
        <div><small>🏢 Oficina/Local</small><input class="input" name="oficina" type="text" placeholder="Oficina ou local"></div>
        <div><small>📋 Serviço Realizado</small><input class="input" name="servico" type="text" placeholder="Descrição do serviço"></div>
        <div><small>⏱️ Tempo de Parada (horas)</small><input class="input" name="tempoParada" type="number" step="0.5" placeholder="Horas parada"></div>

        <div class="full">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0;">🔩 Peças Trocadas</h4>
            <button type="button" class="btn primary" id="btnAdicionarPeca" style="font-size:12px;">+ Adicionar peça</button>
          </div>
          <div id="pecas-container">
            <div class="peca-linha">
              <input class="input" name="pecaNome[]" placeholder="Nome da peça">
              <input class="input" name="pecaQtd[]" type="number" step="1" placeholder="Qtd" value="1">
              <input class="input" name="pecaPreco[]" type="number" step="0.01" placeholder="Preço unit.">
              <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerPeca(this)">✕</button>
            </div>
          </div>
        </div>

        <div><small>💰 Custo Mão de Obra (R$)</small><input class="input" name="custoMaoObra" type="number" step="0.01" placeholder="0.00"></div>
        <div><small>💰 Outros Custos (R$)</small><input class="input" name="outrosCustos" type="number" step="0.01" placeholder="0.00"></div>
        <div class="full"><small>📝 Observações</small><textarea class="textarea" name="obs"></textarea></div>

        <div class="full" style="margin-top:15px;">
          <div style="background: linear-gradient(135deg, #1a2a3a, #0f1a24); padding:20px; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="margin:0; color:#888;">💵 CUSTO TOTAL DA MANUTENÇÃO</h4>
                <div style="font-size:32px; font-weight:bold; color:#f97316;" id="custoManutDisplay">R$ 0,00</div>
              </div>
              <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar Manutenção</button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Custo por máquina -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🚜 Custo de Manutenção por Máquina</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Máquina</th><th>Manutenções</th><th>Custo Total</th><th>Custo/ha</th><th>Horímetro Atual</th></tr></thead>
          <tbody>
            ${maquinas.map(maq => {
              const info = custosPorMaquina.get(maq.id) || { custo: 0, qtd: 0 };
              const custoHaMaq = areaTotal > 0 ? info.custo / areaTotal : 0;
              return `<tr>
                <td><b>${escapeHtml(maq.nome)}</b></td>
                <td>${info.qtd}</td>
                <td>${kbrl(info.custo)}</td>
                <td>${kbrl(custoHaMaq)}</td>
                <td>${num(maq.horimetro || 0, 0)}h</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Filtro e histórico -->
    <div class="card">
      <h3>📋 Histórico de Manutenções</h3>
      <div class="filtro-maquina">
        <small>Filtrar por máquina:</small>
        <select class="select" id="filtroMaquina" style="max-width:300px;">
          <option value="">Todas as máquinas</option>
          ${optionList(maquinas)}
        </select>
      </div>
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Máquina</th>
              <th>Tipo</th>
              <th>Serviço</th>
              <th>Peças</th>
              <th>Horímetro</th>
              <th>Custo Total</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyManut"></tbody>
        </table>
      </div>
    </div>
  `;

  // Adicionar peça
  document.getElementById("btnAdicionarPeca").addEventListener("click", () => {
    const container = document.getElementById("pecas-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "peca-linha";
    novaLinha.innerHTML = `
      <input class="input" name="pecaNome[]" placeholder="Nome da peça">
      <input class="input" name="pecaQtd[]" type="number" step="1" placeholder="Qtd" value="1">
      <input class="input" name="pecaPreco[]" type="number" step="0.01" placeholder="Preço unit.">
      <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerPeca(this)">✕</button>
    `;
    container.appendChild(novaLinha);
    calcularCustoManut();
  });

  window.__removerPeca = (btn) => {
    if (document.querySelectorAll('.peca-linha').length <= 1) return;
    btn.closest('.peca-linha').remove();
    calcularCustoManut();
  };

  // Calcular custo total
  function calcularCustoManut() {
    let custoPecas = 0;
    const linhas = document.querySelectorAll('.peca-linha');
    linhas.forEach(linha => {
      const qtd = Number(linha.querySelector('input[name="pecaQtd[]"]').value) || 0;
      const preco = Number(linha.querySelector('input[name="pecaPreco[]"]').value) || 0;
      custoPecas += qtd * preco;
    });
    const maoObra = Number(document.querySelector('input[name="custoMaoObra"]').value) || 0;
    const outros = Number(document.querySelector('input[name="outrosCustos"]').value) || 0;
    const total = custoPecas + maoObra + outros;
    document.getElementById("custoManutDisplay").innerText = kbrl(total);
    return total;
  }

  // Listeners para recalcular
  document.querySelectorAll('input[name="pecaQtd[]"], input[name="pecaPreco[]"], input[name="custoMaoObra"], input[name="outrosCustos"]').forEach(el => {
    el.addEventListener("input", calcularCustoManut);
  });

  // Observar novas peças
  const observer = new MutationObserver(() => {
    document.querySelectorAll('input[name="pecaQtd[]"], input[name="pecaPreco[]"]').forEach(el => {
      el.removeEventListener("input", calcularCustoManut);
      el.addEventListener("input", calcularCustoManut);
    });
  });
  observer.observe(document.getElementById("pecas-container"), { childList: true });

  // Renderizar tabela
  function renderTabela(filtroMaqId = "") {
    const db2 = getDB();
    let rows = onlySafra(db2.manutencoes || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    if (filtroMaqId) rows = rows.filter(m => m.maquinaId === filtroMaqId);
    // Filtrar manutenções (não depende de talhão, mas pode filtrar por fazenda se necessário)

    const tb = document.getElementById("tbodyManut");
    tb.innerHTML = rows.map(m => {
      const maq = maquinas.find(q => q.id === m.maquinaId);
      const pecasStr = (m.pecas || []).map(p => `${p.nome} (${p.qtd}x)`).join(', ');
      const tipoCor = m.tipoManutencao === 'Corretiva' ? '#ef4444' : m.tipoManutencao === 'Preditiva' ? '#8b5cf6' : '#059669';
      return `<tr>
        <td>${m.data}</td>
        <td><b>${escapeHtml(maq?.nome || '-')}</b></td>
        <td><span style="color:${tipoCor}; font-weight:600;">${escapeHtml(m.tipoManutencao)}</span></td>
        <td>${escapeHtml(clampStr(m.servico || '-', 40))}</td>
        <td>${escapeHtml(clampStr(pecasStr || '-', 40))}</td>
        <td>${num(m.horimetroAtual || 0, 0)}h</td>
        <td><b>${kbrl(m.custoTotal)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delManut('${m.id}')">Excluir</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="8">Nenhuma manutenção registrada.</td></tr>';
  }

  // Filtro
  document.getElementById("filtroMaquina").addEventListener("change", (e) => {
    renderTabela(e.target.value);
  });

  // Excluir
  window.__delManut = (id) => {
    if (!confirm("Excluir esta manutenção?")) return;
    const db2 = getDB();
    db2.manutencoes = (db2.manutencoes || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Manutenção removida.");
    pageManutencao();
  };

  // Submit
  document.getElementById("frmManut").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const maquinaId = fd.get("maquinaId");
    if (!maquinaId) { alert("Selecione uma máquina"); return; }

    // Coletar peças
    const pecasNomes = fd.getAll("pecaNome[]");
    const pecasQtds = fd.getAll("pecaQtd[]");
    const pecasPrecos = fd.getAll("pecaPreco[]");
    const pecas = [];
    let custoPecas = 0;
    for (let i = 0; i < pecasNomes.length; i++) {
      if (pecasNomes[i]) {
        const qtd = Number(pecasQtds[i]) || 0;
        const preco = Number(pecasPrecos[i]) || 0;
        pecas.push({ nome: pecasNomes[i], qtd, preco });
        custoPecas += qtd * preco;
      }
    }

    const custoMaoObra = Number(fd.get("custoMaoObra") || 0);
    const outrosCustos = Number(fd.get("outrosCustos") || 0);
    const custoTotal = custoPecas + custoMaoObra + outrosCustos;

    const obj = {
      id: uid("man"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      maquinaId,
      tipoManutencao: fd.get("tipoManutencao"),
      horimetroAtual: Number(fd.get("horimetroAtual") || 0),
      intervaloHoras: Number(fd.get("intervaloHoras") || 500),
      proximaData: fd.get("proximaData") || "",
      mecanico: fd.get("mecanico") || "",
      oficina: fd.get("oficina") || "",
      servico: fd.get("servico") || "",
      tempoParada: Number(fd.get("tempoParada") || 0),
      pecas,
      custoPecas,
      custoMaoObra,
      outrosCustos,
      custoTotal,
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.manutencoes = db2.manutencoes || [];
    db2.manutencoes.push(obj);

    // Atualizar horímetro da máquina
    if (obj.horimetroAtual > 0) {
      const maq = db2.maquinas.find(m => m.id === maquinaId);
      if (maq && obj.horimetroAtual > Number(maq.horimetro || 0)) {
        maq.horimetro = obj.horimetroAtual;
      }
    }

    setDB(db2);
    toast("Manutenção registrada", `Custo: ${kbrl(custoTotal)}`);
    pageManutencao();
  });

  // Export CSV
  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = manutencoes.map(m => {
      const maq = maquinas.find(q => q.id === m.maquinaId);
      return {
        Data: m.data,
        Máquina: maq?.nome || '-',
        Tipo: m.tipoManutencao,
        Serviço: m.servico,
        Mecânico: m.mecanico,
        Oficina: m.oficina,
        Horímetro: m.horimetroAtual,
        Peças: (m.pecas || []).map(p => `${p.nome}(${p.qtd}x)`).join('; '),
        Custo_Peças: m.custoPecas,
        Custo_MãoObra: m.custoMaoObra,
        Outros_Custos: m.outrosCustos,
        Custo_Total: m.custoTotal,
        Tempo_Parada_h: m.tempoParada,
        Observações: m.obs
      };
    });
    downloadText(`manutencoes-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado.");
  });

  renderTabela();
}

// ============================================================================
// NOVA PÁGINA: INSUMOS BASE (ADUBAÇÃO POR TALHÃO)
// ============================================================================

function pageInsumosBase() {
  const db = getDB();
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas);
  const produtos = onlySafra(db.produtos);
  const insumosBase = onlySafra(db.insumosBase || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  // ==================== CÁLCULOS ====================
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoTotalInsumos = insumosBase.reduce((s, i) => s + Number(i.custoTotal || 0), 0);
  const custoPorHa = areaTotal > 0 ? custoTotalInsumos / areaTotal : 0;

  // Custo por talhão
  const custosPorTalhao = new Map();
  insumosBase.forEach(i => {
    const atual = custosPorTalhao.get(i.talhaoId) || { custo: 0, qtd: 0 };
    atual.custo += Number(i.custoTotal || 0);
    atual.qtd += 1;
    custosPorTalhao.set(i.talhaoId, atual);
  });

  // Custo por tipo de insumo
  const custosPorTipo = {};
  insumosBase.forEach(i => {
    const tipo = i.tipoInsumo || "Outros";
    custosPorTipo[tipo] = (custosPorTipo[tipo] || 0) + Number(i.custoTotal || 0);
  });

  function optionList(arr) {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  function produtoOptions() {
    return produtos.map(p => `<option value="${p.id}" data-preco="${p.preco || 0}" data-unidade="${p.unidade}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)} (R$ ${p.preco || 0}/${p.unidade})</option>`).join("");
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .insumo-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .insumo-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #10b981;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .insumo-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #10b981;
        font-size: 16px;
      }
      .insumo-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .insumo-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .insumo-linha {
        display: grid;
        grid-template-columns: 3fr 1fr 1fr 1fr 0.3fr;
        gap: 10px;
        margin-bottom: 8px;
        align-items: center;
      }
    </style>

    <!-- KPIs -->
    <div class="insumo-kpi-grid">
      <div class="insumo-kpi-card">
        <h3>🌱 Total Lançamentos</h3>
        <div class="insumo-kpi-valor">${insumosBase.length}</div>
        <div class="insumo-kpi-label">registros de insumos base</div>
      </div>
      <div class="insumo-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="insumo-kpi-valor">${kbrl(custoTotalInsumos)}</div>
        <div class="insumo-kpi-label">em insumos base</div>
      </div>
      <div class="insumo-kpi-card">
        <h3>📏 Custo/ha</h3>
        <div class="insumo-kpi-valor">${kbrl(custoPorHa)}</div>
        <div class="insumo-kpi-label">sobre ${num(areaTotal, 1)} ha</div>
      </div>
      <div class="insumo-kpi-card">
        <h3>🧭 Talhões Atendidos</h3>
        <div class="insumo-kpi-valor">${custosPorTalhao.size}</div>
        <div class="insumo-kpi-label">de ${talhoes.length} talhões</div>
      </div>
    </div>

    <!-- Formulário -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🌱 Lançar Insumo Base por Talhão</h3>
      <div class="help">Registre adubação, calcário, gesso, sementes e outros insumos de base aplicados por talhão. O custo será somado ao custo total do talhão.</div>
      <div class="hr"></div>
      <form id="frmInsumoBase" class="formGrid">
        <div><small>📅 Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
        <div><small>🧭 Talhão</small>
          <select class="select" name="talhaoId" required>
            <option value="">Selecione...</option>
            ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)} (${t.cultura || '-'}) — ${num(t.areaHa,1)} ha</option>`).join('')}
          </select>
        </div>
        <div><small>📦 Tipo de Insumo</small>
          <select class="select" name="tipoInsumo" required>
            <option value="Adubo">Adubo</option>
            <option value="Calcário">Calcário</option>
            <option value="Gesso">Gesso</option>
            <option value="Semente">Semente</option>
            <option value="Tratamento de Semente">Tratamento de Semente</option>
            <option value="Inoculante">Inoculante</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div><small>📋 Operação</small><input class="input" name="operacao" placeholder="Ex: Adubação de base, Calagem..."></div>

        <div class="full">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0;">🧪 Produtos/Insumos Utilizados</h4>
            <button type="button" class="btn primary" id="btnAdicionarInsumo" style="font-size:12px;">+ Adicionar produto</button>
          </div>
          <div class="help">Selecione o produto do cadastro ou digite manualmente. Informe a dose por hectare.</div>
          <div class="hr"></div>
          <div id="insumos-container">
            <div class="insumo-linha">
              <select class="select" name="produtoId[]" onchange="window.__atualizarInsumo(this, 0)">
                <option value="">Selecione um produto...</option>
                <option value="__manual">Digitar manualmente...</option>
                ${produtoOptions()}
              </select>
              <input class="input" name="doseHa[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.__calcularCustoInsumos()">
              <input class="input" name="precoManual[]" type="number" step="0.01" placeholder="Preço unit." onchange="window.__calcularCustoInsumos()">
              <span class="badge" id="custoInsumo-0" style="background:#2a2a30; color:#10b981; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
              <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerInsumo(this)">✕</button>
            </div>
          </div>
        </div>

        <div class="full"><small>📝 Observações</small><textarea class="textarea" name="obs"></textarea></div>

        <div class="full" style="margin-top:15px;">
          <div style="background: linear-gradient(135deg, #064e3b, #0f1a24); padding:20px; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="margin:0; color:#888;">💵 CUSTO TOTAL DO LANÇAMENTO</h4>
                <div style="font-size:32px; font-weight:bold; color:#10b981;" id="custoInsumoDisplay">R$ 0,00</div>
                <div style="font-size:12px; color:#888; margin-top:5px;" id="detalheInsumo">Nenhum produto selecionado</div>
              </div>
              <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar Lançamento</button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Custo por talhão -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🧭 Custo de Insumos Base por Talhão</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Talhão</th><th>Fazenda</th><th>Cultura</th><th>Área (ha)</th><th>Lançamentos</th><th>Custo Total</th><th>Custo/ha</th></tr></thead>
          <tbody>
            ${talhoes.map(t => {
              const info = custosPorTalhao.get(t.id) || { custo: 0, qtd: 0 };
              const custoHaTal = Number(t.areaHa || 0) > 0 ? info.custo / t.areaHa : 0;
              return `<tr>
                <td><b>${escapeHtml(t.nome)}</b></td>
                <td>${escapeHtml(findNameById(fazendas, t.fazendaId))}</td>
                <td>${escapeHtml(t.cultura || '-')}</td>
                <td>${num(t.areaHa, 1)}</td>
                <td>${info.qtd}</td>
                <td><b>${kbrl(info.custo)}</b></td>
                <td>${kbrl(custoHaTal)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Custo por tipo -->
    <div class="card" style="margin-bottom:20px;">
      <h3>📊 Custo por Tipo de Insumo</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Tipo</th><th>Custo Total</th><th>% do Total</th></tr></thead>
          <tbody>
            ${Object.entries(custosPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, custo]) => `
              <tr>
                <td><b>${escapeHtml(tipo)}</b></td>
                <td>${kbrl(custo)}</td>
                <td>${custoTotalInsumos > 0 ? num((custo / custoTotalInsumos) * 100, 1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Histórico -->
    <div class="card">
      <h3>📋 Histórico de Lançamentos</h3>
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Talhão</th>
              <th>Tipo</th>
              <th>Produtos</th>
              <th>Custo Total</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyInsumos"></tbody>
        </table>
      </div>
    </div>
  `;

  let insumoCount = 1;

  // Adicionar linha de insumo
  document.getElementById("btnAdicionarInsumo").addEventListener("click", () => {
    const container = document.getElementById("insumos-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "insumo-linha";
    novaLinha.innerHTML = `
      <select class="select" name="produtoId[]" onchange="window.__atualizarInsumo(this, ${insumoCount})">
        <option value="">Selecione um produto...</option>
        <option value="__manual">Digitar manualmente...</option>
        ${produtoOptions()}
      </select>
      <input class="input" name="doseHa[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.__calcularCustoInsumos()">
      <input class="input" name="precoManual[]" type="number" step="0.01" placeholder="Preço unit." onchange="window.__calcularCustoInsumos()">
      <span class="badge" id="custoInsumo-${insumoCount}" style="background:#2a2a30; color:#10b981; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
      <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerInsumo(this)">✕</button>
    `;
    container.appendChild(novaLinha);
    insumoCount++;
  });

  window.__removerInsumo = (btn) => {
    if (document.querySelectorAll('.insumo-linha').length <= 1) return;
    btn.closest('.insumo-linha').remove();
    window.__calcularCustoInsumos();
  };

  window.__atualizarInsumo = (select, index) => {
    const opt = select.options[select.selectedIndex];
    const precoInput = select.closest('.insumo-linha').querySelector('input[name="precoManual[]"]');
    if (select.value && select.value !== "__manual") {
      precoInput.value = opt.dataset.preco || 0;
    } else {
      precoInput.value = "";
    }
    window.__calcularCustoInsumos();
  };

  window.__calcularCustoInsumos = () => {
    const talhaoId = document.querySelector('select[name="talhaoId"]').value;
    const talhao = talhoes.find(t => t.id === talhaoId);
    const area = talhao ? Number(talhao.areaHa || 0) : 0;

    let total = 0;
    let detalhes = [];
    const linhas = document.querySelectorAll('.insumo-linha');

    linhas.forEach((linha, idx) => {
      const select = linha.querySelector('select[name="produtoId[]"]');
      const dose = Number(linha.querySelector('input[name="doseHa[]"]').value) || 0;
      const preco = Number(linha.querySelector('input[name="precoManual[]"]').value) || 0;

      if (dose > 0 && preco > 0 && area > 0) {
        const custoLinha = preco * dose * area;
        total += custoLinha;
        const custoEl = linha.querySelector(`#custoInsumo-${idx}`);
        if (custoEl) custoEl.innerText = kbrl(custoLinha);

        const nome = select.value === "__manual" ? "Manual" : (select.options[select.selectedIndex]?.text?.split(' — ')[0] || "Produto");
        detalhes.push(`${nome}: ${num(dose, 2)} × ${num(area, 1)} ha = ${kbrl(custoLinha)}`);
      }
    });

    document.getElementById("custoInsumoDisplay").innerText = kbrl(total);
    document.getElementById("detalheInsumo").innerHTML = detalhes.length > 0 ? detalhes.join('<br>') : 'Nenhum produto selecionado';
    return total;
  };

  // Recalcular ao trocar talhão
  document.querySelector('select[name="talhaoId"]').addEventListener("change", window.__calcularCustoInsumos);

  // Renderizar tabela
  function renderTabela() {
    const db2 = getDB();
    let rows = onlySafra(db2.insumosBase || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    // Filtrar insumos base pelos talhões da fazenda selecionada
    if (fazendaAtual) {
      const talhoesFazenda = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rows = rows.filter(i => talhoesFazenda.includes(i.talhaoId));
    }
    const tb = document.getElementById("tbodyInsumos");
    tb.innerHTML = rows.map(i => {
      const talhao = findNameById(talhoes, i.talhaoId);
      const produtosStr = (i.produtos || []).map(p => p.nome).join(', ');
      return `<tr>
        <td>${i.data}</td>
        <td><b>${escapeHtml(talhao)}</b></td>
        <td>${escapeHtml(i.tipoInsumo)}</td>
        <td>${escapeHtml(clampStr(produtosStr || '-', 50))}</td>
        <td><b>${kbrl(i.custoTotal)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delInsumoBase('${i.id}')">Excluir</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">Nenhum lançamento registrado.</td></tr>';
  }

  window.__delInsumoBase = (id) => {
    if (!confirm("Excluir este lançamento?")) return;
    const db2 = getDB();
    db2.insumosBase = (db2.insumosBase || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Lançamento removido.");
    pageInsumosBase();
  };

  // Submit
  document.getElementById("frmInsumoBase").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const talhaoId = fd.get("talhaoId");
    if (!talhaoId) { alert("Selecione um talhão"); return; }

    const talhao = talhoes.find(t => t.id === talhaoId);
    const area = talhao ? Number(talhao.areaHa || 0) : 0;

    // Coletar produtos
    const produtoIds = fd.getAll("produtoId[]");
    const doses = fd.getAll("doseHa[]");
    const precos = fd.getAll("precoManual[]");
    const produtosArray = [];
    let custoTotal = 0;

    for (let i = 0; i < produtoIds.length; i++) {
      const dose = Number(doses[i]) || 0;
      const preco = Number(precos[i]) || 0;
      if (dose > 0 && preco > 0) {
        let nome = "Manual";
        let unidade = "un";
        if (produtoIds[i] && produtoIds[i] !== "__manual") {
          const prod = produtos.find(p => p.id === produtoIds[i]);
          if (prod) { nome = prod.nome; unidade = prod.unidade; }
        }
        const custoLinha = preco * dose * area;
        custoTotal += custoLinha;
        produtosArray.push({
          produtoId: produtoIds[i] !== "__manual" ? produtoIds[i] : "",
          nome,
          doseHa: dose,
          preco,
          unidade,
          custoLinha
        });
      }
    }

    if (produtosArray.length === 0) {
      alert("Adicione pelo menos um produto com dose e preço válidos");
      return;
    }

    const obj = {
      id: uid("inb"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      talhaoId,
      tipoInsumo: fd.get("tipoInsumo"),
      operacao: fd.get("operacao") || "",
      produtos: produtosArray,
      custoTotal,
      areaHa: area,
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.insumosBase = db2.insumosBase || [];
    db2.insumosBase.push(obj);

    // Baixa no estoque para produtos do cadastro
    for (const p of produtosArray) {
      if (p.produtoId) {
        const qtd = p.doseHa * area;
        baixaEstoqueProdutoPorId(db2, p.produtoId, qtd, p.unidade);
      }
    }

    setDB(db2);
    toast("Insumo Base registrado", `Custo: ${kbrl(custoTotal)}`);
    pageInsumosBase();
  });

  // Export CSV
  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = insumosBase.map(i => {
      const talhao = findNameById(talhoes, i.talhaoId);
      return {
        Data: i.data,
        Talhão: talhao,
        Tipo: i.tipoInsumo,
        Operação: i.operacao,
        Produtos: (i.produtos || []).map(p => p.nome).join('; '),
        Área_ha: i.areaHa,
        Custo_Total: i.custoTotal,
        Observações: i.obs
      };
    });
    downloadText(`insumos-base-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado.");
  });

  renderTabela();
}



// ============================================================================
// INTEGRAÇÃO OPEN-METEO — CLIMA REAL
// ============================================================================

async function buscarClimaOpenMeteo(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=America/Sao_Paulo&past_days=7&forecast_days=7`;
  
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Erro na API Open-Meteo");
    const data = await resp.json();
    return data;
  } catch (e) {
    console.error("Erro ao buscar clima:", e);
    return null;
  }
}

async function importarClimaAutomatico(fazendaId) {
  const db = getDB();
  const fazenda = db.fazendas.find(f => f.id === fazendaId);
  if (!fazenda || !fazenda.latitude || !fazenda.longitude) {
    toast("Erro", "Cadastre latitude e longitude na fazenda primeiro.");
    return { ok: false, msg: "Sem coordenadas" };
  }

  const lat = parseFloat(fazenda.latitude);
  const lon = parseFloat(fazenda.longitude);
  if (isNaN(lat) || isNaN(lon)) {
    toast("Erro", "Latitude ou longitude inválida.");
    return { ok: false, msg: "Coordenadas inválidas" };
  }

  toast("Buscando...", "Consultando dados climáticos via Open-Meteo...");
  const dados = await buscarClimaOpenMeteo(lat, lon);
  if (!dados || !dados.daily) {
    toast("Erro", "Não foi possível obter dados climáticos.");
    return { ok: false, msg: "API indisponível" };
  }

  const daily = dados.daily;
  const db2 = getDB();
  let importados = 0;
  const climaExistente = new Set((db2.clima || []).map(c => `${c.fazendaId}_${c.data}`));

  for (let i = 0; i < daily.time.length; i++) {
    const dataStr = daily.time[i];
    const chave = `${fazendaId}_${dataStr}`;
    
    // Não importar se já existe registro para essa fazenda nessa data
    if (climaExistente.has(chave)) continue;
    
    // Só importar dados passados (não previsão futura)
    if (new Date(dataStr) > new Date()) continue;

    db2.clima = db2.clima || [];
    db2.clima.push({
      id: uid("cli"),
      safraId: getSafraId(),
      data: dataStr,
      fazendaId: fazendaId,
      talhaoId: "",
      chuvaMm: Number(daily.precipitation_sum[i] || 0),
      tempMin: Number(daily.temperature_2m_min[i] || 0),
      tempMax: Number(daily.temperature_2m_max[i] || 0),
      umidade: Number(daily.relative_humidity_2m_mean?.[i] || 0),
      vento: Number(daily.wind_speed_10m_max?.[i] || 0),
      obs: "Importado automaticamente via Open-Meteo"
    });
    importados++;
  }

  setDB(db2);
  return { ok: true, importados, previsao: daily };
}

async function buscarPrevisaoClima(fazendaId) {
  const db = getDB();
  const fazenda = db.fazendas.find(f => f.id === fazendaId);
  if (!fazenda || !fazenda.latitude || !fazenda.longitude) {
    return null;
  }

  const lat = parseFloat(fazenda.latitude);
  const lon = parseFloat(fazenda.longitude);
  if (isNaN(lat) || isNaN(lon)) return null;

  const dados = await buscarClimaOpenMeteo(lat, lon);
  if (!dados || !dados.daily) return null;

  const daily = dados.daily;
  const hoje = new Date().toISOString().substring(0, 10);
  const previsao = [];

  for (let i = 0; i < daily.time.length; i++) {
    if (daily.time[i] >= hoje) {
      previsao.push({
        data: daily.time[i],
        tempMin: daily.temperature_2m_min[i],
        tempMax: daily.temperature_2m_max[i],
        chuva: daily.precipitation_sum[i],
        umidade: daily.relative_humidity_2m_mean?.[i] || 0,
        vento: daily.wind_speed_10m_max?.[i] || 0
      });
    }
  }
  return previsao;
}



// ============================================================================
// IA PRESCRITIVA — GPT-4.1-MINI
// ============================================================================

async function gerarRecomendacaoIA(talhaoId) {
  const db = getDB();
  const talhao = db.talhoes.find(t => t.id === talhaoId);
  if (!talhao) return { ok: false, msg: "Talhão não encontrado" };

  const fazenda = db.fazendas.find(f => f.id === talhao.fazendaId);
  const aplicacoes = onlySafra(db.aplicacoes || []).filter(a => a.talhaoId === talhaoId);
  const climaRecente = onlySafra(db.clima || [])
    .filter(c => c.fazendaId === talhao.fazendaId)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 7);
  const pragas = onlySafra(db.pragas || []);
  const colheitas = onlySafra(db.colheitas || []).filter(c => c.talhaoId === talhaoId);
  const insumosBase = onlySafra(db.insumosBase || []).filter(i => i.talhaoId === talhaoId);
  const manutencoes = onlySafra(db.manutencoes || []);

  // Buscar previsão do tempo se possível
  let previsao = [];
  if (fazenda && fazenda.latitude && fazenda.longitude) {
    previsao = await buscarPrevisaoClima(fazenda.id) || [];
  }

  // Montar contexto para a IA
  const ultimasAplicacoes = aplicacoes.slice(0, 5).map(a => 
    `${a.data}: ${a.operacao || 'Aplicação'} - ${(a.produtos || []).map(p => p.produtoNome).join(', ')} - Alvo: ${a.alvo || 'N/I'}`
  ).join('\n');

  const climaStr = climaRecente.map(c => 
    `${c.data}: Chuva ${c.chuvaMm}mm, Temp ${c.tempMin}-${c.tempMax}°C, Umid ${c.umidade}%, Vento ${c.vento}km/h`
  ).join('\n');

  const previsaoStr = previsao.slice(0, 7).map(p => 
    `${p.data}: Chuva prev. ${p.chuva}mm, Temp ${p.tempMin}-${p.tempMax}°C, Umid ${p.umidade}%, Vento ${p.vento}km/h`
  ).join('\n');

  const insumosStr = insumosBase.map(i => 
    `${i.data}: ${i.tipoInsumo} - ${(i.produtos || []).map(p => p.nome).join(', ')}`
  ).join('\n');

  const prompt = `Você é um agrônomo especialista em agricultura tropical brasileira. Analise os dados abaixo e forneça recomendações de manejo para este talhão.

DADOS DO TALHÃO:
- Nome: ${talhao.nome}
- Fazenda: ${fazenda?.nome || 'N/I'} (${fazenda?.cidade || ''}-${fazenda?.uf || ''})
- Cultura: ${talhao.cultura || 'N/I'}
- Área: ${talhao.areaHa || 0} ha
- Solo: ${talhao.solo || 'N/I'}

CLIMA DOS ÚLTIMOS 7 DIAS:
${climaStr || 'Sem dados de clima registrados'}

PREVISÃO DO TEMPO (PRÓXIMOS 7 DIAS):
${previsaoStr || 'Sem previsão disponível (cadastre lat/lon na fazenda)'}

ÚLTIMAS APLICAÇÕES:
${ultimasAplicacoes || 'Nenhuma aplicação registrada'}

INSUMOS DE BASE APLICADOS:
${insumosStr || 'Nenhum insumo de base registrado'}

COLHEITAS: ${colheitas.length > 0 ? colheitas.map(c => `${c.dataColheita}: ${c.producaoTotal} ${c.unidade}`).join(', ') : 'Nenhuma colheita registrada'}

BASE DE CONHECIMENTO DE DEFENSIVOS (use como referência):
FUNGICIDAS: Fox (Ferrugem Asiática, 0.75-1.0 L/ha, Nufarm), Opera (Ferrugem Asiática, 0.5-0.75 L/ha, BASF), Viovan (Ferrugem Asiática, 0.5-0.75 L/ha, Corteva), Elatus (Ferrugem Asiática, 0.5-0.75 L/ha, Syngenta), Sugoy (Ferrugem Asiática, 0.6-0.8 L/ha, Ihara), Mancozebe (Mancha-alvo, 1.5-2.0 kg/ha), Tessior (Ferrugem, 0.5-0.75 L/ha, Bayer), Priori (Ferrugem, 0.5-0.75 L/ha, Syngenta), Sphere Max (Ferrugem, 0.5-0.75 L/ha, Corteva), Nativo (Ferrugem, 0.6-0.8 L/ha, Bayer), Folicur (Ferrugem, 0.5-0.75 L/ha, Bayer), Amistar (Ferrugem, 0.5-0.75 L/ha, Syngenta), Headline (Mancha-alvo, 0.5-0.75 L/ha, BASF).
INSETICIDAS: Engeo Pleno (Lagarta, 0.5-1.0 L/ha, Syngenta), Ampligo (Lagarta, 0.4-0.8 L/ha, Syngenta), Orthene (Percevejos, 0.75-1.5 kg/ha, UPL), Lannate (Lagarta, 0.5-1.0 L/ha, DuPont), Decis (Lagarta, 0.3-0.5 L/ha, Bayer), Actara (Mosca-branca, 0.2-0.4 kg/ha, Syngenta), Karate (Lagarta, 0.3-0.5 L/ha, Syngenta), Fastac (Lagarta, 0.2-0.4 L/ha, BASF), Sumidan (Percevejos, 0.5-1.0 L/ha, Sumitomo), Regent (Lagarta, 0.2-0.4 L/ha, BASF), Confidor (Pulgão, 0.3-0.5 L/ha, Bayer).

IMPORTANTE: Fungicidas NÃO funcionam contra pragas (lagartas, percevejos). Inseticidas NÃO funcionam contra doenças fúngicas. Se o usuário aplicou um produto errado (ex: Fox para lagarta), ALERTE sobre o erro.

Com base nesses dados, forneça:

1. **ANÁLISE DE RISCO**: Avalie o risco de doenças (ferrugem asiática, mancha-alvo, antracnose, etc.) e pragas (lagarta, percevejo, mosca-branca, etc.) considerando o clima atual e a previsão.

2. **VALIDAÇÃO DAS APLICAÇÕES**: Se o usuário aplicou algum produto incorreto (ex: fungicida para praga ou inseticida para doença), ALERTE com ❌ e explique o erro.

3. **RECOMENDAÇÃO DE MANEJO**: Sugira ações específicas para os próximos 7-14 dias, incluindo:
   - Necessidade de aplicação de fungicida/inseticida/herbicida
   - Produtos específicos recomendados (da base acima)
   - Janela ideal de pulverização (considerando chuva e vento)
   - Dose sugerida por hectare

4. **ALERTAS**: Destaque qualquer situação crítica que exija atenção imediata.

5. **OBSERVAÇÕES GERAIS**: Dicas de manejo considerando o estágio provável da cultura e as condições climáticas.

⚠️ AVISO OBRIGATÓRIO: Sempre inclua ao final: "Esta é uma sugestão gerada por IA. SEMPRE consulte um agrônomo responsável antes de tomar decisões. Não substitui a receita agronômica profissional."

Responda de forma objetiva e prática, como um consultor agronômico falaria com o produtor. Use linguagem clara e direta.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + window.__OPENAI_KEY
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "Você é um agrônomo consultor especialista em agricultura tropical brasileira, com foco em soja, milho e algodão. Responda sempre em português brasileiro." },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content || "Sem resposta da IA.";
    return { ok: true, texto, talhao: talhao.nome, cultura: talhao.cultura };
  } catch (e) {
    console.error("Erro IA:", e);
    return { ok: false, msg: "Erro ao consultar IA: " + e.message };
  }
}



// ============================================================================
// BASE DE CONHECIMENTO — FUNGICIDAS E INSETICIDAS
// ============================================================================

const defensivosDB = {
  fungicidas: [
    { nome: "Fox", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.75-1.0 L/ha", estágio: ["V4-V8"] },
    { nome: "Opera", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"] },
    { nome: "Viovan", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"] }
  ],
  inseticidas: [
    { nome: "Engeo Pleno", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.5-1.0 L/ha", estágio: ["V4-V8"] },
    { nome: "Ampligo", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.4-0.8 L/ha", estágio: ["V4-V8"] },
    { nome: "Orthene", tipo: "Inseticida", alvo: "Percevejos", dose: "0.75-1.5 kg/ha", estágio: ["V6-R2"] }
  ]
};


// INTEGRAÇÃO DE PREÇOS DE GRÃOS
async function buscarPrecoGraos(cultura, latitude, longitude) {
  const regioes = [
    { lat: -12.55, lon: -55.73, nome: "Sorriso-MT", soja: 128.50, milho: 58.30 },
    { lat: -13.55, lon: -54.72, nome: "Lucas do Rio Verde-MT", soja: 127.80, milho: 57.90 },
    { lat: -15.89, lon: -54.37, nome: "Rondonópolis-MT", soja: 130.20, milho: 59.10 },
    { lat: -17.88, lon: -51.72, nome: "Rio Verde-GO", soja: 131.00, milho: 60.00 },
    { lat: -15.60, lon: -46.65, nome: "Unaí-MG", soja: 129.50, milho: 58.80 },
    { lat: -12.14, lon: -44.99, nome: "Barreiras-BA", soja: 126.80, milho: 56.50 },
    { lat: -12.25, lon: -45.95, nome: "Luís Eduardo Magalhães-BA", soja: 127.20, milho: 57.00 },
    { lat: -28.26, lon: -52.41, nome: "Passo Fundo-RS", soja: 133.00, milho: 62.00 },
    { lat: -24.96, lon: -53.46, nome: "Cascavel-PR", soja: 132.50, milho: 61.50 },
    { lat: -22.23, lon: -49.94, nome: "Marília-SP", soja: 131.80, milho: 60.80 },
    { lat: -21.17, lon: -51.39, nome: "Assis-SP", soja: 130.90, milho: 60.20 },
    { lat: -14.87, lon: -40.84, nome: "Vitória da Conquista-BA", soja: 125.50, milho: 55.80 },
    { lat: -7.53, lon: -46.04, nome: "Balsas-MA", soja: 124.80, milho: 55.20 },
    { lat: -8.08, lon: -49.36, nome: "Palmas-TO", soja: 125.20, milho: 55.50 },
    { lat: -5.09, lon: -42.80, nome: "Teresina-PI", soja: 123.50, milho: 54.00 }
  ];
  
  let regiaoMaisProxima = regioes[0];
  let menorDistancia = 999;
  
  for (const regiao of regioes) {
    const distancia = Math.sqrt(Math.pow(regiao.lat - latitude, 2) + Math.pow(regiao.lon - longitude, 2));
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      regiaoMaisProxima = regiao;
    }
  }
  
  const preco = cultura === "Soja" ? regiaoMaisProxima.soja : regiaoMaisProxima.milho;
  return { ok: true, cultura, regiao: regiaoMaisProxima.nome, preco, moeda: "R$/sc" };
}


function pageAjuda() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h2>❓ Ajuda & Suporte</h2>
        <p>Bem-vindo ao centro de ajuda do Agro Pro. Aqui você encontra orientações sobre como utilizar a plataforma e avisos importantes.</p>
        
        <div class="hr"></div>
        
        <h3>📖 Guia Rápido</h3>
        <div class="grid">
          <div class="card" style="border-left: 4px solid #4CAF50;">
            <h4>Lançar Aplicações</h4>
            <p>Vá em <b>Aplicações</b>, selecione o talhão, os produtos e a dose. O sistema calcula o custo e dá baixa no estoque automaticamente.</p>
          </div>
          <div class="card" style="border-left: 4px solid #2196F3;">
            <h4>Controle de Clima</h4>
            <p>Na página <b>Clima</b>, você pode ver a previsão real ou registrar manualmente a chuva observada em cada talhão.</p>
          </div>
          <div class="card" style="border-left: 4px solid #FF9800;">
            <h4>Gestão de Planos</h4>
            <p>O limite de fazendas e talhões depende do seu plano. Verifique em <b>Configurações</b> para fazer o upgrade.</p>
          </div>
        </div>

        <div class="hr"></div>

        <div style="background: #fff4e5; padding: 20px; border-radius: 8px; border-left: 6px solid #ff9800; margin-top: 20px;">
          <h3>⚖️ Termos e Avisos Jurídicos (IA)</h3>
          <p>O <b>Agro-Copilot</b> e a <b>IA Validadora</b> são ferramentas de auxílio à decisão baseadas em modelos de inteligência artificial generativa.</p>
          <ul>
            <li>As recomendações são sugestões estatísticas e não substituem o diagnóstico de campo.</li>
            <li><b>AVISO OBRIGATÓRIO:</b> Sempre consulte um Engenheiro Agrônomo responsável antes de qualquer aplicação ou manejo.</li>
            <li>O Agro Pro não se responsabiliza por perdas de safra ou danos causados por decisões baseadas exclusivamente na IA.</li>
            <li>Os dados climáticos são providos pela Open-Meteo e podem apresentar variações em relação à realidade local.</li>
          </ul>
        </div>

        <div class="hr"></div>
        
        <h3>📞 Suporte Técnico</h3>
        <p>Dúvidas ou problemas? Entre em contato pelo e-mail: <b>suporte@agropro.com.br</b></p>
      </div>
    </div>
  `;
}


function pageCopilot() {
  if (planoAtual === "Básico") {
    document.getElementById("content").innerHTML = `
      <div class="card" style="text-align:center; padding: 50px;">
        <h2>🤖 Agro-Copilot (IA)</h2>
        <p>A IA Avançada está disponível apenas nos planos <b>PRO</b> e <b>MASTER</b>.</p>
        <button class="btn primary" onclick="location.href='configuracoes.html'">Fazer Upgrade Agora</button>
      </div>
    `;
    return;
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2>🤖 Agro-Copilot</h2>
            <p>Converse com seus dados. Pergunte sobre custos, clima, estoque ou recomendações.</p>
          </div>
          <div class="plan-badge plan-${planoAtual.toLowerCase()}">Uso Ilimitado</div>
        </div>
        
        <div class="chat-container">
          <div class="chat-messages" id="chatMsgs">
            <div class="msg bot">Olá! Sou seu assistente Agro Pro. Como posso ajudar você hoje? Você pode perguntar sobre seus talhões, custos ou pedir recomendações de manejo.</div>
          </div>
          <form class="chat-input" id="chatFrm">
            <input type="text" class="input" id="chatInp" placeholder="Digite sua pergunta aqui..." style="flex:1" required>
            <button class="btn primary" type="submit">Enviar</button>
          </form>
        </div>
        
        <p style="font-size:11px; color:#888; margin-top:10px;">⚠️ As respostas são geradas por IA e devem ser validadas por um profissional. <a href="ajuda.html">Saiba mais</a>.</p>
      </div>
    </div>
  `;

  const chatMsgs = document.getElementById("chatMsgs");
  const chatFrm = document.getElementById("chatFrm");

  chatFrm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = document.getElementById("chatInp").value;
    if (!q) return;

    // Adicionar msg do usuário
    const uEl = document.createElement("div");
    uEl.className = "msg user";
    uEl.innerText = q;
    chatMsgs.appendChild(uEl);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    document.getElementById("chatInp").value = "";

    // Msg de carregando
    const bEl = document.createElement("div");
    bEl.className = "msg bot";
    bEl.innerText = "...";
    chatMsgs.appendChild(bEl);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    // Chamar IA
    const db = getDB();
    const context = `
      CONTEXTO DO SISTEMA AGRO PRO:
      Fazendas: ${db.fazendas.length}, Talhões: ${db.talhoes.length}, Safra: ${getSafraAtual()?.nome}
      Resumo Financeiro: Receita Total ${brl(onlySafra(db.colheitas).reduce((s,c)=>s+c.producaoTotal*130,0))} (est.)
      Estoque: ${db.estoque.length} itens.
    `;
    
    // Simulação ou chamada real se houver chave
    if (!window.__OPENAI_KEY) {
      setTimeout(() => {
        bEl.innerText = "Chave da API não configurada. Por favor, configure sua chave nas Configurações para usar o Agro-Copilot.";
      }, 1000);
      return;
    }

    const res = await callIA(q, context);
    bEl.innerText = res;
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  });
}

async function callIA(question, context) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + window.__OPENAI_KEY },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é o Agro-Copilot, um assistente inteligente do sistema Agro Pro. Você tem acesso aos dados da fazenda e ajuda o produtor com análises e recomendações. Seja prático e direto. " + context },
          { role: "user", content: question }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    return "Erro ao conectar com a IA: " + e.message;
  }
}

function boot() {
  if (!document.getElementById("globalStyles")) {
    const s = document.createElement("style");
    s.id = "globalStyles";
    s.innerHTML = `
      :root {
        --primary: #2e7d32;
        --primary-dark: #1b5e20;
        --bg: #f8fafc;
        --sidebar-bg: #1e293b;
        --text: #334155;
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); overflow-x: hidden; }
      
      .app { display: flex; min-height: 100vh; }
      
      /* Sidebar Responsiva */
      .sidebar { 
        width: 260px; background: var(--sidebar-bg); color: white; display: flex; flex-direction: column; 
        transition: transform 0.3s ease; z-index: 1000;
      }
      .sidebar.hidden { transform: translateX(-260px); position: absolute; height: 100%; }
      
      .brand { padding: 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .logo { width: 32px; height: 32px; background: #4ade80; border-radius: 8px; }
      .brand h1 { font-size: 18px; margin: 0; }
      .brand p { font-size: 11px; margin: 0; opacity: 0.6; }
      
      .nav { flex: 1; padding: 10px; overflow-y: auto; }
      .nav a { 
        display: flex; align-items: center; gap: 10px; padding: 10px 15px; color: #cbd5e1; 
        text-decoration: none; border-radius: 8px; font-size: 14px; margin-bottom: 2px;
      }
      .nav a:hover { background: rgba(255,255,255,0.05); color: white; }
      .nav a.active { background: var(--primary); color: white; font-weight: 600; }
      
      .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .topbar { 
        background: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #e2e8f0; sticky; top: 0; z-index: 100;
      }
      .topbar h2 { margin: 0; font-size: 20px; color: #0f172a; }
      
      .content { padding: 25px; max-width: 1400px; margin: 0 auto; width: 100%; }
      
      /* Mobile Menu Button */
      .menu-toggle { display: none; background: none; border: none; font-size: 24px; cursor: pointer; padding: 5px; }
      
      /* Cards e Layout */
      .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; border: 1px solid #e2e8f0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
      
      /* Tabelas Responsivas */
      @media (max-width: 768px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; height: auto; position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
        .menu-toggle { display: block; }
        .topbar { padding: 15px; }
        .content { padding: 15px; }
        
        .tableWrap { border: none; }
        table, thead, tbody, th, td, tr { display: block; }
        thead tr { position: absolute; top: -9999px; left: -9999px; }
        tr { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; background: white; padding: 10px; }
        td { border: none; position: relative; padding-left: 50%; text-align: right; min-height: 30px; display: flex; align-items: center; justify-content: flex-end; }
        td:before { content: attr(data-label); position: absolute; left: 10px; width: 45%; padding-right: 10px; white-space: nowrap; text-align: left; font-weight: bold; color: #64748b; }
      }
      
      /* IA Chat Styles */
      .chat-container { height: 500px; display: flex; flex-direction: column; background: #f1f5f9; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
      .msg { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
      .msg.user { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 2px; }
      .msg.bot { align-self: flex-start; background: white; color: var(--text); border-bottom-left-radius: 2px; border: 1px solid #e2e8f0; }
      .chat-input { padding: 15px; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; }
      
      .plan-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
      .plan-basic { background: #e2e8f0; color: #475569; }
      .plan-pro { background: #dcfce7; color: #166534; }
      .plan-master { background: #fef9c3; color: #854d0e; }
`;
    document.head.appendChild(s);
  }
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const titles = {
    dashboard: ["Dashboard", "Visão geral da safra atual"],
    centralgestao: ["Central de Gestão", "Alertas, custos e IA prescritiva"],
    safras: ["Safras", "Gerenciar safras"],
    fazendas: ["Fazendas", "Unidades produtivas da safra"],
    talhoes: ["Talhões", "Áreas de cultivo da safra"],
    produtos: ["Produtos", "Insumos da safra"],
    estoque: ["Estoque", "Controle de insumos da safra"],
    insumosbase: ["Insumos Base", "Adubação e insumos de base por talhão"],
    aplicacoes: ["Aplicações", "Operações da safra"],
    combustivel: ["Combustível", "Entradas e saídas de diesel"],
    clima: ["Clima/Chuva", "Registros climáticos da safra"],
    colheitas: ["Colheitas", "Produção real e frete da safra"],
    manutencao: ["Manutenção", "Manutenção de máquinas e equipamentos"],
    equipe: ["Equipe", "Colaboradores da safra"],
    maquinas: ["Máquinas", "Equipamentos da safra"],
    relatorios: ["Relatórios", "Exportação de dados da safra"],
    config: ["Configurações", "Parâmetros e backup"],
    copilot: ["Agro-Copilot", "Assistente de IA para sua fazenda"],
    ajuda: ["Ajuda & Suporte", "Centro de Ajuda e Documentação"]
  };

  const [t, s] = titles[pageKey] || ["Agro Pro", ""];
  renderShell(pageKey, t, s);

  if (pageKey === "dashboard") pageDashboard();
  else if (pageKey === "centralgestao") pageCentralGestao();
  else if (pageKey === "safras") pageSafras();
  else if (pageKey === "fazendas") pageFazendas();
  else if (pageKey === "talhoes") pageTalhoes();
  else if (pageKey === "produtos") pageProdutos();
  else if (pageKey === "estoque") pageEstoque();
  else if (pageKey === "insumosbase") pageInsumosBase();
  else if (pageKey === "aplicacoes") pageAplicacoes();
  else if (pageKey === "combustivel") pageCombustivel();
  else if (pageKey === "clima") pageClima();
  else if (pageKey === "colheitas") pageColheitas();
  else if (pageKey === "manutencao") pageManutencao();
  else if (pageKey === "equipe") pageEquipe();
  else if (pageKey === "maquinas") pageMaquinas();
  else if (pageKey === "relatorios") pageRelatorios();
  else if (pageKey === "copilot") pageCopilot();
  else if (pageKey === "ajuda") pageAjuda();
  else if (pageKey === "config") pageConfiguracoes();

  toast("Agro Pro", "Sistema carregado.");
}

document.addEventListener("DOMContentLoaded", boot);// ============================================================================
// BASE DE CONHECIMENTO EXPANDIDA — FUNGICIDAS E INSETICIDAS
// Mercado Brasileiro 2024-2025
// ============================================================================

const defensivosDBExpandida = {
  // ========== 15 FUNGICIDAS ==========
  fungicidas: [
    { nome: "Fox", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.75-1.0 L/ha", estágio: ["V4-V8"], fabricante: "Nufarm", preço: 85.90 },
    { nome: "Opera", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 120.50 },
    { nome: "Viovan", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Corteva", preço: 135.00 },
    { nome: "Elatus", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 110.00 },
    { nome: "Sugoy", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.6-0.8 L/ha", estágio: ["V4-V8"], fabricante: "Ihara", preço: 115.00 },
    { nome: "Mancozebe", tipo: "Fungicida", alvo: "Mancha-alvo", dose: "1.5-2.0 kg/ha", estágio: ["V4-V8"], fabricante: "Vários", preço: 45.00 },
    { nome: "Tessior", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 125.00 },
    { nome: "Priori", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 105.00 },
    { nome: "Sphere Max", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Corteva", preço: 130.00 },
    { nome: "Nativo", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.6-0.8 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 118.00 },
    { nome: "Folicur", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 95.00 },
    { nome: "Embrex", tipo: "Fungicida", alvo: "Mancha-alvo", dose: "1.0-1.5 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 88.00 },
    { nome: "Flint", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.4-0.6 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 140.00 },
    { nome: "Amistar", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 112.00 },
    { nome: "Headline", tipo: "Fungicida", alvo: "Mancha-alvo", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 98.00 }
  ],

  // ========== 15 INSETICIDAS ==========
  inseticidas: [
    { nome: "Engeo Pleno", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.5-1.0 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 145.00 },
    { nome: "Ampligo", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.4-0.8 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 130.00 },
    { nome: "Orthene", tipo: "Inseticida", alvo: "Percevejos", dose: "0.75-1.5 kg/ha", estágio: ["V6-R2"], fabricante: "UPL", preço: 35.00 },
    { nome: "Lannate", tipo: "Inseticida", alvo: "Lagarta", dose: "0.5-1.0 L/ha", estágio: ["V4-V8"], fabricante: "DuPont", preço: 85.00 },
    { nome: "Decis", tipo: "Inseticida", alvo: "Lagarta", dose: "0.3-0.5 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 65.00 },
    { nome: "Actara", tipo: "Inseticida", alvo: "Mosca-branca", dose: "0.2-0.4 kg/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 120.00 },
    { nome: "Fortenza", tipo: "Inseticida", alvo: "Lagarta-rosca", dose: "0.5-1.0 L/100kg", estágio: ["Tratamento Sementes"], fabricante: "Syngenta", preço: 200.00 },
    { nome: "Cruiser", tipo: "Inseticida", alvo: "Pragas iniciais", dose: "0.5-1.0 L/100kg", estágio: ["Tratamento Sementes"], fabricante: "Syngenta", preço: 180.00 },
    { nome: "Poncho", tipo: "Inseticida", alvo: "Pragas iniciais", dose: "0.5-1.0 L/100kg", estágio: ["Tratamento Sementes"], fabricante: "Bayer", preço: 175.00 },
    { nome: "Karate", tipo: "Inseticida", alvo: "Lagarta", dose: "0.3-0.5 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 72.00 },
    { nome: "Fastac", tipo: "Inseticida", alvo: "Lagarta", dose: "0.2-0.4 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 68.00 },
    { nome: "Sumidan", tipo: "Inseticida", alvo: "Percevejos", dose: "0.5-1.0 L/ha", estágio: ["V6-R2"], fabricante: "Sumitomo", preço: 78.00 },
    { nome: "Regent", tipo: "Inseticida", alvo: "Lagarta", dose: "0.2-0.4 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 92.00 },
    { nome: "Confidor", tipo: "Inseticida", alvo: "Pulgão", dose: "0.3-0.5 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 88.00 },
    { nome: "Imidacloprido", tipo: "Inseticida", alvo: "Mosca-branca", dose: "0.2-0.4 L/ha", estágio: ["V4-V8"], fabricante: "Vários", preço: 55.00 }
  ],

  // ========== VALIDAÇÕES ==========
  validacoes: {
    fungicidaParaPraga: "❌ ERRO: Fungicida não funciona contra pragas (lagartas, percevejos). Use um INSETICIDA.",
    inseticidaParaDoenca: "❌ ERRO: Inseticida não funciona contra doenças fúngicas. Use um FUNGICIDA.",
    doseAlta: "⚠️ AVISO: Dose acima do recomendado. Risco de fitotoxidez.",
    doseBaixa: "⚠️ AVISO: Dose abaixo do recomendado. Risco de ineficácia.",
    ventoForte: "⚠️ AVISO: Vento acima do recomendado. Risco de deriva."
  }
};

// Função de validação
function validarAplicacaoCompleta(aplicacao) {
  const erros = [];
  const avisos = [];
  const sugestoes = [];

  const fungicida = defensivosDBExpandida.fungicidas.find(f => f.nome === aplicacao.produtoNome);
  const inseticida = defensivosDBExpandida.inseticidas.find(i => i.nome === aplicacao.produtoNome);
  const produto = fungicida || inseticida;

  if (!produto) {
    avisos.push("⚠️ Produto não encontrado na base de dados.");
    return { erros, avisos, sugestoes };
  }

  // Validação 1: Fungicida para praga?
  if (fungicida && ["Lagarta", "Lagarta-da-soja", "Percevejo", "Percevejos", "Mosca-branca", "Ácaro", "Tripes", "Pulgão"].includes(aplicacao.alvo)) {
    erros.push(defensivosDBExpandida.validacoes.fungicidaParaPraga);
  }

  // Validação 2: Inseticida para doença?
  if (inseticida && ["Ferrugem", "Ferrugem Asiática", "Mancha-alvo", "Oídio", "Antracnose"].includes(aplicacao.alvo)) {
    erros.push(defensivosDBExpandida.validacoes.inseticidaParaDoenca);
  }

  // Sugestões
  sugestoes.push(`✅ Produto: ${produto.nome}`);
  sugestoes.push(`✅ Fabricante: ${produto.fabricante}`);
  sugestoes.push(`✅ Dose: ${produto.dose}`);
  sugestoes.push(`✅ Melhor estágio: ${produto.estágio.join(", ")}`);

  return { erros, avisos, sugestoes, produto };
}
