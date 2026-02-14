/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTIEMPRESA) - VERSÃO COMPLETA
   Atualizações:
   + Cálculo automático de custos por aplicação
   + Estimativa de produtividade por talhão
   + Biblioteca de produtos e pragas com recomendações
   + Lembretes e alertas inteligentes
   + IA preditiva básica
   ============================================================ */

const Storage = {
  key: "agro_pro_v3",
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

/* ------------------ DB / Seed ------------------ */
function seedDB() {
  const empresaId = uid("emp");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");
  const talhao2Id = uid("tal");
  const maqId = uid("maq");
  const opId = uid("peq");

  const prd1 = uid("prd");
  const prd2 = uid("prd");
  const prd3 = uid("prd");

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 3 },
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
      { id: fazendaId, empresaId, nome: "Fazenda Horizonte", cidade: "Sorriso", uf: "MT", areaHa: 1450, observacoes: "Soja/Milho safrinha" }
    ],

    talhoes: [
      { id: talhaoId, empresaId, fazendaId, nome: "T-12", areaHa: 78.5, cultura: "Soja", safra: "2025/26", solo: "Argiloso", coordenadas: "", observacoes: "" },
      { id: talhao2Id, empresaId, fazendaId, nome: "T-15", areaHa: 120.0, cultura: "Milho", safra: "2025/26", solo: "Argiloso", coordenadas: "", observacoes: "" }
    ],

    produtos: [
      { id: prd1, empresaId, tipo: "Herbicida", nome: "Glifosato 480", ingrediente: "Glifosato", fabricante: "Genérico", registro: "", carenciaDias: 7, reentradaHoras: 24, unidade: "L", preco: 45.90, pragasAlvo: ["plantas daninhas"], obs: "" },
      { id: prd2, empresaId, tipo: "Fungicida", nome: "Triazol+Estrobilurina", ingrediente: "Mistura", fabricante: "Genérico", registro: "", carenciaDias: 14, reentradaHoras: 24, unidade: "L", preco: 89.90, pragasAlvo: ["ferrugem", "oidio"], obs: "" },
      { id: prd3, empresaId, tipo: "Inseticida", nome: "Metomil", ingrediente: "Metomil", fabricante: "Genérico", registro: "", carenciaDias: 10, reentradaHoras: 48, unidade: "L", preco: 120.00, pragasAlvo: ["lagarta", "pulgão"], obs: "" }
    ],

    estoque: [
      { id: uid("stk"), empresaId, produtoId: prd1, deposito: "Central", lote: "", validade: "", qtd: 1200, unidade: "L", obs: "Demo" },
      { id: uid("stk"), empresaId, produtoId: prd2, deposito: "Central", lote: "", validade: "", qtd: 240, unidade: "L", obs: "Demo" },
      { id: uid("stk"), empresaId, produtoId: prd3, deposito: "Central", lote: "", validade: "", qtd: 500, unidade: "L", obs: "Demo" }
    ],

    equipe: [
      { id: opId, empresaId, nome: "Operador 1", funcao: "Tratorista", telefone: "", nr: "", obs: "" }
    ],

    maquinas: [
      { id: maqId, empresaId, nome: "Pulverizador Autopropelido", placa: "", horimetro: 0, capacidadeL: 3000, bicos: "", obs: "" }
    ],

    clima: [
      { id: uid("cli"), empresaId, data: nowISO(), fazendaId, talhaoId, chuvaMm: 12, tempMin: 22, tempMax: 33, umidade: 68, vento: 9, obs: "Chuva isolada à tarde" },
      { id: uid("cli"), empresaId, data: "2026-02-10", fazendaId, talhaoId, chuvaMm: 0, tempMin: 24, tempMax: 35, umidade: 55, vento: 12, obs: "Dia seco" }
    ],

    dieselEstoque: [
      { id: uid("dsl"), empresaId, deposito: "Tanque Principal", litros: 5000, obs: "Saldo pode ficar negativo" }
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
          { produtoId: prd1, produtoNome: "Glifosato 480", dosePorHa: 2.0, unidade: "L/ha", precoUnit: 45.90 }
        ],
        custoTotal: 2295.00, // calculado: 2.0 * 25 * 45.90
        obs: "Aplicação padrão (demo)."
      }
    ],

    lembretes: [
      { id: uid("lem"), empresaId, data: "2026-03-01", mensagem: "Aplicar fungicida no talhão T-12", tipo: "aplicacao", concluido: false }
    ],

    pragas: [
      { id: uid("praga"), nome: "Ferrugem Asiática", nomeCientifico: "Phakopsora pachyrhizi", culturas: ["soja"] },
      { id: uid("praga"), nome: "Lagarta-do-cartucho", nomeCientifico: "Spodoptera frugiperda", culturas: ["milho"] },
      { id: uid("praga"), nome: "Plantas daninhas", nomeCientifico: "", culturas: ["soja", "milho"] }
    ]
  };

  Storage.save(db);
  return db;
}

function getDB() {
  let db = Storage.load();
  if (!db) db = seedDB();

  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 3 };
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
  db.dieselEstoque = db.dieselEstoque || [{ id: uid("dsl"), empresaId: (db.session.empresaId || db.empresas?.[0]?.id || uid("emp")), deposito: "Tanque Principal", litros: 0, obs: "" }];
  db.lembretes = db.lembretes || [];
  db.pragas = db.pragas || [];

  db.clima.forEach(c => { if (c.talhaoId == null) c.talhaoId = ""; });

  Storage.save(db);
  return db;
}
function setDB(db) { Storage.save(db); }

function getEmpresaId() {
  const db = getDB();
  return db.session?.empresaId || (db.empresas[0]?.id ?? null);
}
function setEmpresaId(id) {
  const db = getDB();
  db.session = db.session || {};
  db.session.empresaId = id;
  setDB(db);
}

/* ------------------ UI shell ------------------ */
const PAGES = [
  { href: "index.html", label: "Dashboard", key: "dashboard", icon: "📊" },
  { href: "opscenter.html", label: "Ops Center", key: "opscenter", icon: "🛰️" },
  { href: "empresas.html", label: "Empresas", key: "empresas", icon: "🏢" },
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
  { href: "configuracoes.html", label: "Configurações", key: "config", icon: "⚙️" },
  { href: "biblioteca.html", label: "Biblioteca", key: "biblioteca", icon: "📚" },
  { href: "ia.html", label: "IA Preditiva", key: "ia", icon: "🤖" }
];

function renderShell(pageKey, title, subtitle) {
  const db = getDB();
  const empresaId = getEmpresaId();
  const empresa = db.empresas.find(e => e.id === empresaId);
  const nav = PAGES.map(p => {
    const active = (p.key === pageKey) ? "active" : "";
    return `<a class="${active}" href="${p.href}"><span class="ico">${p.icon}</span> ${escapeHtml(p.label)}</a>`;
  }).join("");

  const empresaOptions = db.empresas.map(e => {
    const sel = e.id === empresaId ? "selected" : "";
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
            <p>Controle Agronômico • Multiempresa</p>
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
          <div style="margin-top:10px" class="help">
            Trocar a empresa muda todos os dados exibidos.
          </div>
        </div>

        <nav class="nav">${nav}</nav>

        <div style="margin-top:14px" class="help">
          <b>Dica:</b> Use a Biblioteca para consultar produtos e pragas.
        </div>
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

  document.getElementById("empresaSelect").addEventListener("change", (e) => {
    setEmpresaId(e.target.value);
    toast("Empresa alterada", "Atualizando a página…");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnResetDemo").addEventListener("click", () => {
    if (!confirm("Isso vai resetar o banco local e voltar para o demo. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Reset concluído", "Banco local restaurado para o demo.");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnBackup").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(db2, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaEmpresa").addEventListener("click", () => {
    const nome = prompt("Nome da nova empresa:");
    if (!nome) return;
    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome, cnpj: "", responsavel: "", cidade: "", uf: "", observacoes: "" });
    setDB(db2);
    setEmpresaId(id);
    toast("Empresa criada", "Agora você está nessa empresa.");
    setTimeout(() => location.reload(), 200);
  });
}

/* ------------------ Helpers ------------------ */
function onlyEmpresa(arr) {
  const eid = getEmpresaId();
  return (arr || []).filter(x => x.empresaId === eid);
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

function safeNumber(v) { return Number(v || 0); }

function talhaoArea(db, talhaoId) {
  const t = onlyEmpresa(db.talhoes).find(x => x.id === talhaoId);
  return t ? Number(t.areaHa || 0) : 0;
}

/* ------------------ Estoque: baixas automáticas ------------------ */
function ensureStockRow(db, produtoId, deposito = "Central", unidade = "") {
  db.estoque = db.estoque || [];
  let row = db.estoque.find(s => s.empresaId === getEmpresaId() && s.produtoId === produtoId && (s.deposito || "Central") === deposito);
  if (!row) {
    row = { id: uid("stk"), empresaId: getEmpresaId(), produtoId, deposito, lote: "", validade: "", qtd: 0, unidade, obs: "(auto)" };
    db.estoque.push(row);
  }
  return row;
}

function baixaEstoqueProdutoPorId(db, produtoId, quantidade, unidade = "") {
  if (!produtoId || !quantidade) return { ok: false, msg: "Sem produto/quantidade" };
  const prod = onlyEmpresa(db.produtos).find(p => p.id === produtoId);
  if (!prod) return { ok: false, msg: `Produto não encontrado` };
  const row = ensureStockRow(db, produtoId, "Central", unidade || prod.unidade);
  row.qtd = Number(row.qtd || 0) - Number(quantidade || 0);
  return { ok: true, msg: `Baixa estoque: ${prod.nome} -${num(quantidade, 2)} ${row.unidade}` };
}

/* ------------------ Diesel: baixa automática ------------------ */
function ensureDieselTank(db, deposito = "Tanque Principal") {
  db.dieselEstoque = db.dieselEstoque || [];
  let t = db.dieselEstoque.find(x => x.empresaId === getEmpresaId() && (x.deposito || "Tanque Principal") === deposito);
  if (!t) {
    t = { id: uid("dsl"), empresaId: getEmpresaId(), deposito, litros: 0, obs: "(auto)" };
    db.dieselEstoque.push(t);
  }
  return t;
}
function baixaDiesel(db, deposito, litros) {
  const tank = ensureDieselTank(db, deposito || "Tanque Principal");
  tank.litros = Number(tank.litros || 0) - Number(litros || 0);
  return tank;
}

/* ------------------ Custo por talhão (acumulado) ------------------ */
function calcCustosPorTalhao(db) {
  const talhoes = onlyEmpresa(db.talhoes);
  const fazendas = onlyEmpresa(db.fazendas);

  const apl = onlyEmpresa(db.aplicacoes || []);
  const cmb = onlyEmpresa(db.combustivel || []);

  const map = new Map(); // talhaoId -> {custo: number, last: string, ops: number}
  for (const t of talhoes) {
    map.set(t.id, { custo: 0, last: "", ops: 0 });
  }

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

/* ------------------ Estimativa de produtividade ------------------ */
function estimarProdutividade(talhaoId) {
  const db = getDB();
  const talhao = onlyEmpresa(db.talhoes).find(t => t.id === talhaoId);
  if (!talhao) return null;

  const aplicacoes = onlyEmpresa(db.aplicacoes).filter(a => a.talhaoId === talhaoId);
  const clima = onlyEmpresa(db.clima).filter(c => c.talhaoId === talhaoId);

  // Fatores simples
  let fator = 1.0;
  if (aplicacoes.length > 5) fator += 0.1;
  if (aplicacoes.length > 10) fator += 0.1;

  const chuvas = clima.reduce((acc, c) => acc + Number(c.chuvaMm || 0), 0);
  if (chuvas > 500) fator += 0.1;
  else if (chuvas < 200) fator -= 0.1;

  // Produtividade base por cultura (sacas/ha)
  const bases = { 'soja': 60, 'milho': 120, 'algodao': 180, 'cafe': 30, 'cana': 80 };
  const base = bases[talhao.cultura?.toLowerCase()] || 50;
  const estimada = base * fator;

  return {
    talhao: talhao.nome,
    cultura: talhao.cultura,
    estimativa: estimada,
    minimo: estimada * 0.9,
    maximo: estimada * 1.1,
    confianca: Math.min(100, 50 + aplicacoes.length * 5 + clima.length * 2)
  };
}

/* ------------------ Páginas ------------------ */
function pageDashboard() {
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const produtos = onlyEmpresa(db.produtos);
  const aplicacoes = onlyEmpresa(db.aplicacoes);
  const clima = onlyEmpresa(db.clima);
  const lembretes = onlyEmpresa(db.lembretes).filter(l => !l.concluido).slice(0, 5);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a => a.data === hoje).length;
  const chuvaHoje = clima.filter(c => c.data === hoje).reduce((s, c) => s + Number(c.chuvaMm || 0), 0);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Fazendas</h3>
        <div class="big">${fazendas.length}</div>
        <div class="sub">Cadastradas</div>
      </div>
      <div class="card">
        <h3>Talhões</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">Área total: ${num(talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0), 1)} ha</div>
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
        <h3>📋 Lembretes Pendentes</h3>
        ${lembretes.length ? lembretes.map(l => `
          <div style="padding:8px; margin:5px 0; background:#2a2a30; border-radius:4px;">
            <b>${escapeHtml(l.mensagem)}</b><br>
            <small>Data: ${l.data} - ${l.tipo}</small>
            <button class="btn" style="margin-top:5px;" onclick="concluirLembrete('${l.id}')">Concluir</button>
          </div>
        `).join('') : '<p>Nenhum lembrete pendente.</p>'}
      </div>

      <div class="tableWrap">
        <h3>Últimas aplicações</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Talhão</th>
              <th>Área</th>
              <th>Produto</th>
            </tr>
          </thead>
          <tbody>
            ${aplicacoes.slice().reverse().slice(0, 5).map(a => {
              const talhao = findNameById(talhoes, a.talhaoId);
              const produto = a.produtos?.[0]?.produtoNome || '—';
              return `<tr><td>${a.data}</td><td>${escapeHtml(talhao)}</td><td>${num(a.areaHaAplicada, 1)} ha</td><td>${escapeHtml(produto)}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
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
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);

  const estoque = onlyEmpresa(db.estoque || []);
  const diesel = onlyEmpresa(db.dieselEstoque || []);
  const aplicacoes = onlyEmpresa(db.aplicacoes || []);
  const combustivel = onlyEmpresa(db.combustivel || []);
  const clima = onlyEmpresa(db.clima || []);

  const negEstoque = estoque.filter(s => Number(s.qtd || 0) < 0);
  const negDiesel = diesel.filter(d => Number(d.litros || 0) < 0);
  const custoTal = calcCustosPorTalhao(db);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card"><h3>Alertas estoque</h3><div class="big">${negEstoque.length}</div></div>
      <div class="card"><h3>Alertas diesel</h3><div class="big">${negDiesel.length}</div></div>
      <div class="card"><h3>Aplicações</h3><div class="big">${aplicacoes.length}</div></div>
      <div class="card"><h3>Abastecimentos</h3><div class="big">${combustivel.length}</div></div>
    </div>
    <div class="tableWrap">
      <h3>Custos por talhão</h3>
      <table>
        <thead><tr><th>Talhão</th><th>Custo total</th><th>Custo/ha</th></tr></thead>
        <tbody>${custoTal.map(r => `<tr><td>${escapeHtml(r.talhao)}</td><td>${kbrl(r.custoTotal)}</td><td>${kbrl(r.custoHa)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}

function crudPage({ entityKey, subtitle, fields, columns, helpers }) {
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
    const rows0 = onlyEmpresa(db2[entityKey] || []);
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
    const obj = { id: uid(entityKey.slice(0, 3)), empresaId: eid };

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
    const rows = onlyEmpresa(db2[entityKey] || []);
    downloadText(`${entityKey}-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  renderTable();
}

/* --------- Páginas específicas --------- */
function pageEmpresas() {
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

  function render() {
    const db2 = getDB();
    const tb = document.getElementById("tbody");
    tb.innerHTML = db2.empresas.slice().reverse().map(e => `
      <tr>
        <td><b>${escapeHtml(e.nome)}</b></td>
        <td>${escapeHtml(e.cnpj || "")}</td>
        <td>${escapeHtml(e.responsavel || "")}</td>
        <td>${escapeHtml((e.cidade || "") + " / " + (e.uf || ""))}</td>
        <td class="noPrint">
          <button class="btn" onclick="window.__use('${e.id}')">Usar</button>
          <button class="btn danger" onclick="window.__delEmp('${e.id}')">Excluir</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem empresas.</td></tr>`;
  }

  window.__use = (id) => {
    setEmpresaId(id);
    toast("Empresa ativa", "Mudando para a empresa selecionada…");
    setTimeout(() => location.reload(), 200);
  };

  window.__delEmp = (id) => {
    const db2 = getDB();
    if (db2.empresas.length <= 1) {
      alert("Você precisa ter pelo menos 1 empresa.");
      return;
    }
    if (!confirm("Excluir empresa e TODOS os dados dela?")) return;

    db2.empresas = db2.empresas.filter(x => x.id !== id);
    const wipe = key => db2[key] = (db2[key] || []).filter(x => x.empresaId !== id);
    ["fazendas", "talhoes", "produtos", "estoque", "equipe", "maquinas", "clima", "aplicacoes", "combustivel", "dieselEstoque", "lembretes"].forEach(wipe);

    if (getEmpresaId() === id) {
      db2.session.empresaId = db2.empresas[0].id;
    }
    setDB(db2);
    toast("Excluída", "Empresa removida com dados associados.");
    setTimeout(() => location.reload(), 200);
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
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
    toast("Salvo", "Empresa adicionada.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`empresas-${nowISO()}.csv`, toCSV(db2.empresas));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageFazendas() {
  crudPage({
    entityKey: "fazendas",
    subtitle: "Unidades produtivas por empresa.",
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
    subtitle: "Cadastre defensivos, fertilizantes e adjuvantes.",
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
  crudPage({
    entityKey: "estoque",
    subtitle: "Controle por depósito, lote e validade. Saldo pode ficar negativo.",
    fields: [
      {
        key: "produtoId", label: "Produto", type: "select",
        options: (db) => {
          const ps = onlyEmpresa(db.produtos);
          return [{ value: "", label: "(Selecione)" }].concat(ps.map(p => ({ value: p.id, label: `${p.nome} — ${p.tipo}` })));
        }
      },
      { key: "deposito", label: "Depósito", type: "text", placeholder: "Central / Galpão..." },
      { key: "lote", label: "Lote", type: "text" },
      { key: "validade", label: "Validade (YYYY-MM-DD)", type: "text", placeholder: "2026-12-31" },
      { key: "qtd", label: "Quantidade", type: "number" },
      { key: "unidade", label: "Unidade", type: "text", placeholder: "L / kg" },
      { key: "obs", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      {
        key: "produtoId", label: "Produto", render: (r, db) => {
          const p = onlyEmpresa(db.produtos).find(p => p.id === r.produtoId);
          return p ? `${p.nome} (${p.tipo})` : "(sem produto)";
        }
      },
      { key: "deposito", label: "Depósito" },
      { key: "lote", label: "Lote" },
      { key: "validade", label: "Validade" },
      { key: "qtd", label: "Qtd" },
      { key: "unidade", label: "Unid." }
    ]
  });
}

function pageTalhoes() {
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
    const rows = onlyEmpresa(db2.talhoes || []);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(t => {
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
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
      empresaId: getEmpresaId(),
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
    downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.talhoes || [])));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageCombustivel() {
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);
  const tanques = onlyEmpresa(db.dieselEstoque);

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
        <h3>Abastecimentos</h3>
        <div class="big">${onlyEmpresa(db.combustivel || []).length}</div>
        <div class="sub"><span class="pill info">Histórico</span></div>
      </div>
      <div class="card">
        <h3>Custo diesel (R$)</h3>
        <div class="big">${kbrl(onlyEmpresa(db.combustivel || []).reduce((s, c) => s + Number(c.litros || 0) * Number(c.precoLitro || 0), 0))}</div>
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

          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required /></div>
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

  function render() {
    const db2 = getDB();
    const rows = onlyEmpresa(db2.combustivel || []);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a, b) => (b.data || "").localeCompare(a.data || "")).map(c => {
      const faz = findNameById(onlyEmpresa(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlyEmpresa(db2.talhoes), c.talhaoId) : "—";
      const custo = Number(c.litros || 0) * Number(c.precoLitro || 0);
      return `
        <tr>
          <td>${escapeHtml(c.data || "")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td><b>${escapeHtml(num(c.litros || 0, 1))}</b></td>
          <td>${escapeHtml(num(c.precoLitro || 0, 2))}</td>
          <td><b>${escapeHtml(kbrl(custo || 0))}</b></td>
          <td>${escapeHtml(c.deposito || "")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delCmb('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem abastecimentos.</td></tr>`;

    const tbT = document.getElementById("tbodyTanques");
    const tanks = onlyEmpresa(db2.dieselEstoque || []);
    tbT.innerHTML = tanks.map(t => `
      <tr>
        <td><b>${escapeHtml(t.deposito || "")}</b></td>
        <td><b>${escapeHtml(num(t.litros || 0, 1))}</b></td>
        <td>${Number(t.litros || 0) < 0 ? '<span class="pill bad">Negativo</span>' : '<span class="pill ok">OK</span>'}</td>
        <td>${escapeHtml(clampStr(t.obs || "", 70))}</td>
      </tr>
    `).join("") || `<tr><td colspan="4">Sem tanques.</td></tr>`;
  }

  window.__delCmb = (id) => {
    if (!confirm("Excluir este abastecimento? (não reverte baixa automaticamente)")) return;
    const db2 = getDB();
    db2.combustivel = (db2.combustivel || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Registro removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const litros = Number(fd.get("litros") || 0);
    if (litros <= 0) {
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
      precoLitro: Number(fd.get("precoLitro") || 0),
      kmOuHora: Number(fd.get("kmOuHora") || 0),
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.combustivel = db2.combustivel || [];
    db2.combustivel.push(obj);

    // BAIXA automática no diesel
    baixaDiesel(db2, obj.deposito, litros);

    setDB(db2);
    e.target.reset();
    toast("Salvo", "Abastecimento registrado e diesel baixado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.combustivel || [])));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageClima() {
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
    const rows = onlyEmpresa(db2.clima || []);

    calcKPIs(rows);

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a, b) => (b.data || "").localeCompare(a.data || "")).map(c => {
      const faz = findNameById(onlyEmpresa(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlyEmpresa(db2.talhoes), c.talhaoId) : "Geral";
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
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
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
      empresaId: getEmpresaId(),
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
    downloadText(`clima-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.clima || [])));
    toast("Exportado", "CSV baixado.");
  });

  render();
}

function pageEquipe() {
  crudPage({
    entityKey: "equipe",
    subtitle: "Equipe de campo: operadores, agrônomos, terceirizados etc.",
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
    subtitle: "Cadastro de equipamentos para rastreabilidade de aplicação.",
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
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);
  const produtos = onlyEmpresa(db.produtos);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr) { return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join(""); }

  function produtoOptions() {
    return produtos.map(p => `<option value="${p.id}" data-preco="${p.preco || 0}" data-unidade="${p.unidade}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)} (R$ ${p.preco || 0}/${p.unidade})</option>`).join("");
  }

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Registrar aplicação</h3>
        <div class="help">O custo total é calculado automaticamente com base nos produtos e área.</div>
        <div class="hr"></div>
        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div><small>Fazenda</small><select class="select" name="fazendaId" required>${optionList(fazendas)}</select></div>
          <div><small>Talhão</small><select class="select" name="talhaoId" required>${optionList(talhoes)}</select></div>
          <div><small>Área aplicada (ha)</small><input class="input" name="areaHaAplicada" type="number" step="0.1" required /></div>
          <div><small>Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>Alvo</small><input class="input" name="alvo" placeholder="Praga" /></div>
          <div><small>Operação</small><input class="input" name="operacao" placeholder="Pulverização" /></div>
          <div><small>Máquina</small><select class="select" name="maquinaId"><option value="">(opcional)</option>${optionList(maquinas)}</select></div>
          <div><small>Operador</small><select class="select" name="operadorId"><option value="">(opcional)</option>${optionList(equipe)}</select></div>
          <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" /></div>
          <div><small>Temperatura (°C)</small><input class="input" name="temp" type="number" /></div>
          <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" /></div>

          <div class="full">
            <small>Produtos (até 10 linhas)</small>
            <div class="help">Selecione o produto, informe a dose por hectare. O custo será somado.</div>
            <div class="hr"></div>
            <div class="formGrid" id="produtos-lista">
              ${Array.from({ length: 10 }).map((_, idx) => {
                const i = idx + 1;
                return `
                  <div class="full" style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:5px; margin-bottom:5px;">
                    <select class="select" name="p${i}Id" onchange="atualizarPrecoUnit(this, ${i})">
                      <option value="">(produto ${i})</option>
                      ${produtoOptions()}
                    </select>
                    <input class="input" name="p${i}Dose" type="number" step="0.01" placeholder="Dose/ha" onchange="calcularCustoTotal()" />
                    <input class="input" name="p${i}Unidade" placeholder="Unid." readonly />
                    <span class="input" style="background:#2a2a30;" id="p${i}Custo">R$ 0,00</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="full">
            <small>Observações</small><textarea class="textarea" name="obs"></textarea>
          </div>
          <div class="full row" style="justify-content:flex-end">
            <span style="margin-right:20px;"><b>Custo total estimado: </b><span id="custoTotalDisplay">R$ 0,00</span></span>
            <button class="btn primary" type="submit">Salvar aplicação e dar baixa</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Data</th><th>Talhão</th><th>Área</th><th>Produtos</th><th>Custo</th><th>Ações</th></tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  window.atualizarPrecoUnit = (select, idx) => {
    const opt = select.options[select.selectedIndex];
    const preco = opt.dataset.preco || 0;
    const unidade = opt.dataset.unidade || '';
    document.querySelector(`input[name="p${idx}Unidade"]`).value = unidade;
    calcularCustoTotal();
  };

  window.calcularCustoTotal = () => {
    let total = 0;
    const area = parseFloat(document.querySelector('input[name="areaHaAplicada"]').value) || 0;
    for (let i = 1; i <= 10; i++) {
      const select = document.querySelector(`select[name="p${i}Id"]`);
      const dose = parseFloat(document.querySelector(`input[name="p${i}Dose"]`).value) || 0;
      if (select && select.value && dose) {
        const opt = select.options[select.selectedIndex];
        const precoUnit = parseFloat(opt.dataset.preco) || 0;
        const custoLinha = precoUnit * dose * area;
        total += custoLinha;
        document.getElementById(`p${i}Custo`).innerText = kbrl(custoLinha);
      } else {
        document.getElementById(`p${i}Custo`).innerText = 'R$ 0,00';
      }
    }
    document.getElementById('custoTotalDisplay').innerText = kbrl(total);
  };

  document.querySelector('input[name="areaHaAplicada"]').addEventListener('input', calcularCustoTotal);

  function render() {
    const db2 = getDB();
    const rows = onlyEmpresa(db2.aplicacoes || []);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(a => {
      const tal = findNameById(talhoes, a.talhaoId);
      const prds = (a.produtos || []).map(p => p.produtoNome).join(' + ');
      return `<tr><td>${a.data}</td><td>${escapeHtml(tal)}</td><td>${num(a.areaHaAplicada, 1)} ha</td><td>${escapeHtml(prds)}</td><td>${kbrl(a.custoTotal)}</td><td><button class="btn danger" onclick="window.__delA('${a.id}')">Excluir</button></td></tr>`;
    }).join('') || '<tr><td colspan="6">Sem registros</td></tr>';
  }

  window.__delA = (id) => {
    if (!confirm("Excluir esta aplicação?")) return;
    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes.filter(x => x.id !== id);
    setDB(db2);
    toast("Excluída", "");
    render();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const area = Number(fd.get("areaHaAplicada") || 0);
    if (area <= 0) { alert("Área deve ser > 0"); return; }

    const produtosArray = [];
    let custoTotalCalc = 0;
    for (let i = 1; i <= 10; i++) {
      const prodId = fd.get(`p${i}Id`);
      const dose = Number(fd.get(`p${i}Dose`) || 0);
      if (prodId && dose) {
        const produto = produtos.find(p => p.id === prodId);
        if (produto) {
          const precoUnit = produto.preco || 0;
          const custoLinha = precoUnit * dose * area;
          custoTotalCalc += custoLinha;
          produtosArray.push({
            produtoId: prodId,
            produtoNome: produto.nome,
            dosePorHa: dose,
            unidade: produto.unidade,
            precoUnit: precoUnit
          });
        }
      }
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
        vento: Number(fd.get("vento") || 0),
        temp: Number(fd.get("temp") || 0),
        umidade: Number(fd.get("umidade") || 0)
      },
      produtos: produtosArray,
      custoTotal: custoTotalCalc,
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
    toast("Salvo", "Aplicação registrada. Baixa no estoque.");
    if (msgs.length) toast("Baixas", msgs.slice(0, 3).join(" • "));
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`aplicacoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.aplicacoes || [])));
  });

  render();
}

function pageRelatorios() {
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const aplicacoes = onlyEmpresa(db.aplicacoes);
  const clima = onlyEmpresa(db.clima);

  setTopActions(`
    <button class="btn" id="btnCSV">Exportar (Apl) CSV</button>
    <button class="btn primary" id="btnPrint">Imprimir / PDF</button>
  `);

  const totalArea = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const ultApl = aplicacoes.slice().sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 12);
  const ultClima = clima.slice().sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 12);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="printOnly">
      <h2>Relatório Agro Pro</h2>
      <p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
      <div class="hr"></div>
    </div>

    <div class="kpi">
      <div class="card">
        <h3>Área total (talhões)</h3>
        <div class="big">${num(totalArea, 1)} ha</div>
        <div class="sub">Somatório da empresa ativa</div>
      </div>
      <div class="card">
        <h3>Aplicações</h3>
        <div class="big">${aplicacoes.length}</div>
        <div class="sub"><span class="pill info">Rastreabilidade</span></div>
      </div>
      <div class="card">
        <h3>Registros de clima</h3>
        <div class="big">${clima.length}</div>
        <div class="sub"><span class="pill ok">Histórico</span></div>
      </div>
      <div class="card">
        <h3>Fazendas</h3>
        <div class="big">${fazendas.length}</div>
        <div class="sub"><span class="pill warn">Multiunidade</span></div>
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
            ${ultApl.map(a => {
              const prds = (a.produtos || []).filter(p => p.produtoNome).map(p => `${p.produtoNome} (${num(p.dosePorHa || 0, 2)} ${p.unidade || ""})`).join(" + ");
              return `
                <tr>
                  <td>${escapeHtml(a.data || "")}</td>
                  <td>${escapeHtml(findNameById(fazendas, a.fazendaId))}</td>
                  <td>${escapeHtml(findNameById(talhoes, a.talhaoId))}</td>
                  <td>${escapeHtml(num(a.areaHaAplicada || 0, 1))} ha</td>
                  <td>${escapeHtml(a.operacao || "")}</td>
                  <td>${escapeHtml(prds || "—")}</td>
                  <td>${escapeHtml(kbrl(a.custoTotal || 0))}</td>
                </tr>
              `;
            }).join("") || `<tr><td colspan="7">Sem registros.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Últimos registros de clima</th></tr>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Chuva (mm)</th><th>Temp máx</th><th>Vento</th>
            </tr>
          </thead>
          <tbody>
            ${ultClima.map(c => `
                <tr>
                  <td>${escapeHtml(c.data || "")}</td>
                  <td>${escapeHtml(findNameById(fazendas, c.fazendaId))}</td>
                  <td>${escapeHtml(c.talhaoId ? findNameById(talhoes, c.talhaoId) : "Geral")}</td>
                  <td>${escapeHtml(num(c.chuvaMm || 0, 1))}</td>
                  <td>${escapeHtml(c.tempMax)}</td>
                  <td>${escapeHtml(c.vento)}</td>
                </tr>
              `).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <h3>Observações e assinatura</h3>
      <div class="help">
        Ao imprimir em PDF, assine manualmente ou utilize assinatura digital.
      </div>
      <div class="hr"></div>
      <div style="height:90px;border:1px dashed rgba(255,255,255,.20); border-radius:16px; padding:12px" class="noPrint">
        (campo livre — versão offline)
      </div>
    </div>
  `;

  document.getElementById("btnPrint").addEventListener("click", () => window.print());
  document.getElementById("btnCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`relatorio-aplicacoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.aplicacoes || [])));
    toast("Exportado", "CSV baixado.");
  });
}

function pageConfiguracoes() {
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
          • Use backup para trocar de aparelho sem perder dados.<br/>
          • Importar substitui o banco local atual.
        </div>
        <div class="hr"></div>
        <div class="help">
          <b>Boas práticas (Agro):</b><br/>
          • Registrar clima no dia de aplicação (vento/umidade/temperatura).<br/>
          • Registrar máquina/operador quando possível.<br/>
          • Guardar relatórios em PDF por safra e por talhão.
        </div>
      </div>

      <div class="card">
        <h3>Como evoluir para Supabase</h3>
        <div class="help">
          Próximo upgrade:<br/>
          • Login por e-mail • Multiusuário • Permissões • Postgres<br/>
          • Logs de auditoria • Upload de documentos • API
        </div>
        <div class="hr"></div>
        <span class="pill info">Pronto para backend</span>
        <span class="pill ok">Offline-first</span>
      </div>
    </div>
  `;

  document.getElementById("btnExport").addEventListener("click", () => {
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Backup exportado", "Arquivo .json baixado.");
  });

  document.getElementById("btnImport").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.empresas) {
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
  });
}

/* ------------------ NOVA PÁGINA: BIBLIOTECA ------------------ */
function pageBiblioteca() {
  const db = getDB();
  const produtos = onlyEmpresa(db.produtos);
  const pragas = onlyEmpresa(db.pragas);

  setTopActions(`<button class="btn" id="btnAddPraga">+ Nova Praga</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="tableWrap">
        <h3>📦 Produtos</h3>
        <table>
          <thead><tr><th>Nome</th><th>Tipo</th><th>Preço</th><th>Pragas Alvo</th></tr></thead>
          <tbody>
            ${produtos.map(p => `
              <tr>
                <td><b>${escapeHtml(p.nome)}</b></td>
                <td>${escapeHtml(p.tipo)}</td>
                <td>${kbrl(p.preco || 0)}</td>
                <td>${(p.pragasAlvo || []).join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="tableWrap">
        <h3>🐛 Pragas</h3>
        <table>
          <thead><tr><th>Nome</th><th>Nome Científico</th><th>Culturas</th></tr></thead>
          <tbody>
            ${pragas.map(p => `
              <tr>
                <td><b>${escapeHtml(p.nome)}</b></td>
                <td>${escapeHtml(p.nomeCientifico || '')}</td>
                <td>${(p.culturas || []).join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btnAddPraga").addEventListener("click", () => {
    const nome = prompt("Nome da praga:");
    if (!nome) return;
    const db2 = getDB();
    db2.pragas.push({ id: uid("praga"), nome, nomeCientifico: "", culturas: [] });
    setDB(db2);
    toast("Praga adicionada", "");
    pageBiblioteca();
  });
}

/* ------------------ NOVA PÁGINA: IA PREDITIVA ------------------ */
function pageIA() {
  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const clima = onlyEmpresa(db.clima);
  const aplicacoes = onlyEmpresa(db.aplicacoes);
  const produtos = onlyEmpresa(db.produtos);
  const pragas = onlyEmpresa(db.pragas);

  // Estimar produtividade para cada talhão
  const estimativas = talhoes.map(t => estimarProdutividade(t.id));

  // Gerar recomendações simples
  const recomendacoes = [];
  const hoje = new Date();

  // Verificar talhões sem aplicação recente (últimos 30 dias)
  talhoes.forEach(t => {
    const ultimaApl = aplicacoes.filter(a => a.talhaoId === t.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    if (ultimaApl) {
      const dias = Math.floor((hoje - new Date(ultimaApl.data)) / (1000 * 60 * 60 * 24));
      if (dias > 30) recomendacoes.push(`⚠️ Talhão ${t.nome} está há ${dias} dias sem aplicação.`);
    } else {
      recomendacoes.push(`🌱 Talhão ${t.nome} nunca recebeu aplicação.`);
    }
  });

  // Alertas climáticos
  const ultimoClima = clima.sort((a, b) => b.data.localeCompare(a.data))[0];
  if (ultimoClima) {
    if (ultimoClima.vento > 15) recomendacoes.push(`💨 Vento forte (${ultimoClima.vento} km/h) registrado. Evite aplicar.`);
    if (ultimoClima.umidade < 40) recomendacoes.push(`🔥 Umidade baixa (${ultimoClima.umidade}%). Risco de deriva.`);
    if (ultimoClima.chuvaMm > 10) recomendacoes.push(`🌧️ Chuva recente (${ultimoClima.chuvaMm} mm). Aguarde para aplicar.`);
  }

  // Sugerir produtos com base em pragas alvo (simulação)
  const sugestoes = [];
  pragas.forEach(p => {
    const produtosSugeridos = produtos.filter(prod => (prod.pragasAlvo || []).some(alvo => p.nome.toLowerCase().includes(alvo.toLowerCase())));
    if (produtosSugeridos.length > 0) {
      sugestoes.push(`Para ${p.nome}, produtos recomendados: ${produtosSugeridos.map(pr => pr.nome).join(', ')}`);
    }
  });

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card"><h3>Talhões</h3><div class="big">${talhoes.length}</div></div>
      <div class="card"><h3>Recomendações</h3><div class="big">${recomendacoes.length}</div></div>
      <div class="card"><h3>Sugestões de produtos</h3><div class="big">${sugestoes.length}</div></div>
    </div>
    <div class="section">
      <div class="tableWrap">
        <h3>📈 Estimativa de Produtividade</h3>
        <table>
          <thead><tr><th>Talhão</th><th>Cultura</th><th>Estimativa (sc/ha)</th><th>Confiança</th></tr></thead>
          <tbody>
            ${estimativas.map(e => `
              <tr>
                <td>${escapeHtml(e.talhao)}</td>
                <td>${escapeHtml(e.cultura)}</td>
                <td>${num(e.estimativa, 1)} (${num(e.minimo, 1)}-${num(e.maximo, 1)})</td>
                <td>${e.confianca}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>💡 Recomendações da IA</h3>
        <ul>${recomendacoes.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="card" style="margin-top:20px;">
      <h3>🛒 Sugestões de produtos por praga</h3>
      <ul>${sugestoes.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>
  `;
}

/* ------------------ Boot ------------------ */
function boot() {
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const titles = {
    dashboard: ["Dashboard", "Visão geral, indicadores e últimos registros"],
    opscenter: ["Ops Center", "Alertas, custos por talhão e monitoramento"],
    empresas: ["Empresas", "Cadastre e gerencie organizações (multiempresa)"],
    fazendas: ["Fazendas", "Unidades produtivas por empresa"],
    talhoes: ["Talhões", "Área, cultura, safra e custos por talhão"],
    produtos: ["Produtos", "Cadastro de defensivos e insumos"],
    estoque: ["Estoque", "Controle por depósito/lote/validade (saldo pode negativo)"],
    aplicacoes: ["Aplicações", "Rastreabilidade + baixa automática no estoque"],
    combustivel: ["Combustível", "Abastecimentos + baixa automática no diesel"],
    clima: ["Clima/Chuva", "Histórico manual por fazenda/talhão (acumulado)"],
    equipe: ["Equipe", "Operadores, agrônomos e times de campo"],
    maquinas: ["Máquinas", "Equipamentos usados nas operações"],
    relatorios: ["Relatórios", "Resumo + impressão/PDF + exportação"],
    config: ["Configurações", "Backup/restore e preparação para backend"],
    biblioteca: ["Biblioteca", "Produtos e pragas cadastrados"],
    ia: ["IA Preditiva", "Estimativas e recomendações inteligentes"]
  };

  const [t, s] = titles[pageKey] || ["Agro Pro", ""];
  renderShell(pageKey, t, s);

  if (pageKey === "dashboard") pageDashboard();
  else if (pageKey === "opscenter") pageOpsCenter();
  else if (pageKey === "empresas") pageEmpresas();
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
  else if (pageKey === "biblioteca") pageBiblioteca();
  else if (pageKey === "ia") pageIA();

  toast("Agro Pro", "Sistema carregado. Dados salvos no navegador.");
}

// Inicializa quando a página carregar
document.addEventListener("DOMContentLoaded", boot);