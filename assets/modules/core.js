/* ============================================================
   AGRO PRO — app.js (v8.0 — Planos Free/Pro/Master + CPF/Telefone)
   Sem trial. Plano Free extremamente limitado (só visualização).
   ============================================================ */

let planoAtual = localStorage.getItem("agro_plano") || "Free";
let fazendaAtual = localStorage.getItem("agro_fazenda_filtro") || null;
let userSession = null;
let userProfile = null;
let trialInfo = null; // mantido por compatibilidade, não usado
let userRole = localStorage.getItem("agro_role") || "admin";

// ============================================================
// SISTEMA DE PERMISSÕES POR PERFIL (ROLES)
// ============================================================

// Páginas BLOQUEADAS por plano (não aparecem na sidebar nem podem ser acessadas)
const PLAN_BLOCKED_PAGES = {
  'Free':   ['colheitas','manutencao','clima','relatorios','centralgestao','copilot','combustivel','aplicacoes','insumos','estoque','equipe','maquinas','insumosbase','config','folhasalarial','analisesolo'],
  'Pro':    [],
  'Master': [],
  'Trial':  [] // legado — tratar como Free se aparecer
};

// Limites de cadastro por plano
const PLAN_LIMITS = {
  'Free':   { fazendas: 1, talhoes: 1, maquinas: 0, funcionarios: 0, admins: 1 },
  'Pro':    { fazendas: 5, talhoes: 9999, maquinas: 9999, funcionarios: 15, admins: 3 },
  'Master': { fazendas: 9999, talhoes: 9999, maquinas: 9999, funcionarios: 9999, admins: 9999 },
  'Trial':  { fazendas: 1, talhoes: 1, maquinas: 0, funcionarios: 0, admins: 1 } // legado → Free
};

function getPlanLimits() {
  // Sempre lê do localStorage para capturar o plano atualizado pelo Supabase
  const plano = localStorage.getItem("agro_plano") || planoAtual || "Free";
  return PLAN_LIMITS[plano] || PLAN_LIMITS['Free'];
}

function getPlanBlockedPages() {
  // Sempre lê do localStorage para capturar o plano atualizado pelo Supabase
  const plano = localStorage.getItem("agro_plano") || planoAtual || "Free";
  return PLAN_BLOCKED_PAGES[plano] || PLAN_BLOCKED_PAGES['Free'];
}

const ROLE_PERMISSIONS = {
  admin: {
    pages: ['dashboard','copilot','centralgestao','propriedade','insumos','insumosbase','aplicacoes','combustivel','clima','colheitas','manutencao','equipe','folhasalarial','analisesolo','maquinas','relatorios','config','ajuda'],
    canCreate: true,
    canDelete: true,
    canSeeFinanceiro: true,
    label: 'Administrador'
  },
  gerente: {
    pages: ['dashboard','copilot','centralgestao','propriedade','insumos','insumosbase','aplicacoes','combustivel','clima','colheitas','manutencao','equipe','analisesolo','maquinas','relatorios','ajuda'],
    canCreate: true,
    canDelete: false,
    canSeeFinanceiro: false,
    label: 'Gerente'
  },
  funcionario: {
    pages: ['dashboard','propriedade','aplicacoes','combustivel','clima','colheitas','manutencao','maquinas','ajuda'],
    canCreate: false, // default false, override por pagina
    canDelete: false,
    canSeeFinanceiro: false,
    label: 'Funcion\u00e1rio',
    // Permissões específicas por página para funcionário
    pagePerms: {
      dashboard:    { view: true, create: false, delete: false, simplified: true },
      propriedade:  { view: true, create: false, delete: false },
      aplicacoes:   { view: true, create: true,  delete: false },  // Registrar aplicações
      combustivel:  { view: true, create: true,  delete: false },  // Registrar abastecimento
      clima:        { view: true, create: false, delete: false },
      colheitas:    { view: true, create: false, delete: false },  // Apenas visualizar
      manutencao:   { view: true, create: true,  delete: false },  // Registrar manutenção
      maquinas:     { view: true, create: false, delete: false },
      ajuda:        { view: true, create: false, delete: false }
    }
  }
};

function getUserRole() {
  return userRole || 'admin';
}

function getRolePerms() {
  return ROLE_PERMISSIONS[getUserRole()] || ROLE_PERMISSIONS.funcionario;
}

function canAccessPage(pageKey) {
  const perms = getRolePerms();
  if (!perms.pages.includes(pageKey)) return false;
  // Bloquear páginas conforme o plano
  const blocked = getPlanBlockedPages();
  if (blocked.includes(pageKey)) return false;
  return true;
}

function canCreateOnPage(pageKey) {
  const role = getUserRole();
  if (role === 'admin') return true;
  if (role === 'gerente') return true;
  if (role === 'funcionario') {
    const pp = ROLE_PERMISSIONS.funcionario.pagePerms[pageKey];
    return pp ? pp.create : false;
  }
  return true;
}

function canDeleteOnPage(pageKey) {
  const role = getUserRole();
  if (role === 'admin') return true;
  if (role === 'gerente') return true;
  if (role === 'funcionario') {
    const pp = ROLE_PERMISSIONS.funcionario.pagePerms[pageKey];
    return pp ? pp.delete : false;
  }
  return true;
}

function canSeeFinanceiro() {
  return getRolePerms().canSeeFinanceiro;
}

function isSimplifiedDashboard() {
  const role = getUserRole();
  if (role === 'funcionario') return true;
  return false;
}

function getRoleBadgeColor() {
  const role = getUserRole();
  if (role === 'admin') return 'background: #dcfce7; color: #166534;';
  if (role === 'gerente') return 'background: #dbeafe; color: #1e40af;';
  return 'background: #fef3c7; color: #92400e;';
}

function getRoleLabel() {
  return getRolePerms().label;
}

// ============================================================
// SISTEMA DE PLANOS v8.0 (Free / Pro / Master — sem trial)
// ============================================================

function getTrialInfo() { return null; } // mantido por compatibilidade
function iniciarTrial(email, nome) {
  // Trial removido — novo usuário inicia no plano Free
  localStorage.setItem("agro_plano", "Free");
  planoAtual = "Free";
}
function isTrialExpirado() { return false; }
function getPlanoEfetivo() {
  return localStorage.getItem("agro_plano") || "Free";
}

// Banner de aviso somente no plano Free
function renderTrialBanner() {
  const p = planoAtual;
  if (p === 'Free' || p === 'Trial') {
    return `
      <div class="free-banner">
        🔒 <strong>Plano Free</strong> — apenas visualização, 1 fazenda, 1 talhão.
        <button onclick="pageUpgrade()" class="btn" style="padding:4px 12px; font-size:11.5px; background:var(--warning); color:#fff; border:none; box-shadow:none;">Ver Planos</button>
      </div>
    `;
  }
  return '';
}

// ============================================================
// CLOUD SYNC — BACKUP AUTOMÁTICO NA NUVEM (SUPABASE)
// ============================================================
if (typeof cloudSync === 'undefined') {
  function cloudSync() { /* Supabase não configurado — modo offline */ }
}
if (typeof cloudRestore === 'undefined') {
  async function cloudRestore() { return false; /* Supabase não configurado */ }
}

function pageTrialExpirado() { pageUpgrade(); }

// ============================================================
// PÁGINA DE UPGRADE DE PLANO
// ============================================================
function pageUpgrade() {
  const root = document.getElementById("app");
  const isMain = document.getElementById("content");
  const target = isMain || root;
  const wrapper = isMain ? '' : '';

  const html = `
    <div style="min-height:${isMain ? '80vh' : '100vh'}; background:${isMain ? '#f8fafc' : 'linear-gradient(135deg,#0f172a,#1e293b)'}; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:720px; width:100%; background:white; border-radius:16px; padding:36px 32px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="font-size:48px; margin-bottom:10px;">🌾</div>
        <h1 style="color:#1e293b; margin-bottom:6px; font-size:24px; font-weight:800;">Agro Pro — Escolha seu Plano</h1>
        <p style="color:#64748b; font-size:14px; line-height:1.6; margin-bottom:28px;">
          O plano <b>Free</b> permite apenas visualizar dados existentes.<br>
          Para cadastrar e usar todas as ferramentas, assine Pro ou Master.
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; margin-bottom:28px; text-align:left;">

          <!-- FREE -->
          <div style="padding:18px; border-radius:12px; border:2px solid #e2e8f0; background:#f8fafc;">
            <h3 style="margin:0 0 4px; color:#94a3b8; font-size:14px; font-weight:700;">FREE</h3>
            <p style="font-size:26px; font-weight:800; margin:4px 0; color:#1e293b;">R$ 0<small style="font-size:11px; font-weight:400; color:#94a3b8;">/mês</small></p>
            <ul style="margin:10px 0 0; padding-left:16px; color:#94a3b8; font-size:12px; line-height:1.9;">
              <li>1 fazenda, 1 talhão</li>
              <li>Apenas visualização</li>
              <li>Sem máquinas ou estoque</li>
              <li>Sem aplicações ou colheitas</li>
              <li>Sem relatórios ou IA</li>
            </ul>
            <div style="margin-top:14px; padding:7px; background:#e2e8f0; border-radius:6px; text-align:center; color:#94a3b8; font-size:11px; font-weight:700; letter-spacing:.5px;">PLANO ATUAL</div>
          </div>

          <!-- PRO -->
          <div style="padding:18px; border-radius:12px; border:3px solid #10b981; background:#ecfdf5; position:relative;">
            <div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:#10b981; color:white; padding:3px 14px; border-radius:12px; font-size:10px; font-weight:700; white-space:nowrap; letter-spacing:.5px;">⭐ MAIS POPULAR</div>
            <h3 style="margin:0 0 4px; color:#065f46; font-size:14px; font-weight:700;">PRO</h3>
            <p style="font-size:26px; font-weight:800; margin:4px 0; color:#1e293b;">R$ 199<small style="font-size:11px; font-weight:400; color:#047857;">/mês</small></p>
            <ul style="margin:10px 0 0; padding-left:16px; color:#374151; font-size:12px; line-height:1.9;">
              <li>5 fazendas, talhões ilimitados</li>
              <li>Máquinas e equipe (até 15)</li>
              <li>Aplicações, estoque, combustível</li>
              <li>Colheitas, clima, manutenções</li>
              <li>Relatórios completos</li>
              <li>IA Prescritiva (Copilot)</li>
            </ul>
            <a href="https://wa.me/5599991360547?text=Olá!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Pro%20R%24199%2Fmês)" target="_blank"
               style="display:block; margin-top:14px; padding:10px; background:#10b981; color:white; border-radius:8px; font-weight:700; font-size:13px; text-decoration:none; text-align:center;">
              💬 Assinar Pro — R$199/mês
            </a>
          </div>

          <!-- MASTER -->
          <div style="padding:18px; border-radius:12px; border:2px solid #f59e0b; background:#fffbeb;">
            <h3 style="margin:0 0 4px; color:#92400e; font-size:14px; font-weight:700;">MASTER</h3>
            <p style="font-size:26px; font-weight:800; margin:4px 0; color:#1e293b;">R$ 299<small style="font-size:11px; font-weight:400; color:#b45309;">/mês</small></p>
            <ul style="margin:10px 0 0; padding-left:16px; color:#374151; font-size:12px; line-height:1.9;">
              <li>Fazendas <b>ilimitadas</b></li>
              <li>Equipe e admins ilimitados</li>
              <li>Tudo do Pro incluso</li>
              <li>Suporte prioritário 24h</li>
              <li>Sem nenhum limite</li>
              <li>Multiusuários ilimitados</li>
            </ul>
            <a href="https://wa.me/5599991360547?text=Olá!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Master%20R%24299%2Fmês)" target="_blank"
               style="display:block; margin-top:14px; padding:10px; background:#f59e0b; color:#1e293b; border-radius:8px; font-weight:700; font-size:13px; text-decoration:none; text-align:center;">
              💬 Assinar Master — R$299/mês
            </a>
          </div>
        </div>

        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="mailto:suporteagropro@gmail.com?subject=Assinatura Agro Pro" style="padding:11px 22px; background:#3b82f6; color:white; border-radius:8px; font-weight:600; font-size:13px; text-decoration:none;">📧 E-mail</a>
          <button onclick="navigate('dashboard')" style="padding:11px 22px; background:#e2e8f0; color:#374151; border:none; border-radius:8px; font-size:13px; cursor:pointer; font-weight:600;">← Voltar</button>
          <button onclick="localStorage.removeItem('agro_session'); localStorage.removeItem('agro_plano'); localStorage.removeItem('agro_role'); localStorage.removeItem('agro_trial'); location.reload();" style="padding:11px 22px; background:transparent; color:#94a3b8; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; cursor:pointer;">Sair da conta</button>
        </div>
        <p style="margin-top:16px; font-size:11px; color:#94a3b8;">suporteagropro@gmail.com · WhatsApp: (99) 99136-0547 · Tiago Santos — Fundador</p>
      </div>
    </div>
  `;

  if (isMain) {
    isMain.innerHTML = html;
  } else {
    root.innerHTML = html;
  }
}

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
  // Se o navegador suportar crypto.randomUUID (maioria dos modernos), usamos ele.
  // Caso contrário, usamos um fallback compatível com o formato UUID v4.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function nowISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Hash de senha com SHA-256 (substitui armazenamento em texto puro)
async function _hashPassword(pass) {
  const data = new TextEncoder().encode(pass);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(title, msg, duration) {
  const dur = (typeof duration === 'number') ? duration : 3200;
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
    el.classList.add('opacity-0', 'translate-y-6');
  }, dur);
  setTimeout(() => {
    el.remove();
  }, dur + 600);
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
  // Criamos apenas a estrutura básica vazia, sem dados de demonstração.
  // O usuário deve cadastrar sua própria safra e fazenda para começar.
  const db = {
    meta: { createdAt: new Date().toISOString(), version: 10 },
    session: { safraId: null, fazendaId: null },

    safras: [],
    fazendas: [],
    talhoes: [],
    produtos: [],
    estoque: [],
    equipe: [],
    maquinas: [],
    clima: [],
    dieselEntradas: [],
    dieselEstoque: [],
    combustivel: [],
    aplicacoes: [],
    colheitas: [],
    lembretes: [],
    pragas: [],
    manutencoes: [],
    insumosBase: [],
    parametros: {
      precoSoja: 120.00,
      produtividadeMinSoja: 65,
      produtividadeMaxSoja: 75,
      precoMilho: 60.00,
      produtividadeMinMilho: 100,
      produtividadeMaxMilho: 130,
      precoSorgo: 42.00,
      produtividadeMinSorgo: 70,
      produtividadeMaxSorgo: 100,
      precoFeijao: 280.00,
      produtividadeMinFeijao: 25,
      produtividadeMaxFeijao: 40,
      precoTrigo: 85.00,
      produtividadeMinTrigo: 40,
      produtividadeMaxTrigo: 60,
      precoArroz: 60.00,
      produtividadeMinArroz: 60,
      produtividadeMaxArroz: 80,
      precoCafe: 1200.00,
      produtividadeMinCafe: 20,
      produtividadeMaxCafe: 40,
      pesoPadraoSaca: 60
    }
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
  db.parametros = db.parametros || { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75, precoMilho: 60, produtividadeMinMilho: 100, produtividadeMaxMilho: 130, precoSorgo: 42, produtividadeMinSorgo: 70, produtividadeMaxSorgo: 100, precoFeijao: 280, produtividadeMinFeijao: 25, produtividadeMaxFeijao: 40, precoTrigo: 85, produtividadeMinTrigo: 40, produtividadeMaxTrigo: 60, precoArroz: 60, produtividadeMinArroz: 60, produtividadeMaxArroz: 80, precoCafe: 1200, produtividadeMinCafe: 20, produtividadeMaxCafe: 40, pesoPadraoSaca: 60 };
  db.fazendas = db.fazendas || [];
  db.talhoes = db.talhoes || [];
  db.produtos = db.produtos || [];
  db.estoque = db.estoque || [];
  db.equipe = db.equipe || [];
  db.maquinas = db.maquinas || [];
  db.clima = db.clima || [];
  db.dieselEntradas = db.dieselEntradas || [];

  // Se há um safraId na sessão mas a safra não existe localmente (ex: Supabase offline),
  // criar uma safra placeholder para o select não ficar vazio
  if (db.session.safraId && db.safras.length === 0) {
    const anoAtual = new Date().getFullYear();
    db.safras.push({
      id: db.session.safraId,
      nome: `Safra ${anoAtual}/${String(anoAtual + 1).slice(2)}`,
      dataInicio: nowISO(),
      dataFim: "",
      ativa: true,
      observacoes: "(criada automaticamente - sincronize para restaurar dados)"
    });
  }
  db.dieselEstoque = db.dieselEstoque || [{ id: uid("dsl"), safraId: (db.session.safraId || db.safras?.[0]?.id || uid("saf")), deposito: "Tanque Principal", litros: 0, precoVigente: 0, obs: "" }];
  db.combustivel = db.combustivel || [];
  db.aplicacoes = db.aplicacoes || [];
  db.colheitas = db.colheitas || [];
  db.lembretes = db.lembretes || [];
  db.pragas = db.pragas || [];
  db.manutencoes = db.manutencoes || [];
  db.insumosBase = db.insumosBase || [];
  db.folhaSalarial = db.folhaSalarial || [];
  db.analiseSolo = db.analiseSolo || [];

  db.clima.forEach(c => { if (c.talhaoId == null) c.talhaoId = ""; });

  Storage.save(db);
  return db;
}
function setDB(db) {
  // Marcar timestamp de última alteração
  db.meta = db.meta || {};
  db.meta.lastSync = new Date().toISOString();
  Storage.save(db);
  // Disparar backup automático na nuvem (debounced)
  // cloudSync() está definido em supabase-client.js (sync granular + backup JSON)
  // Usa debounce de 2s para não sobrecarregar o Supabase a cada alteração
  if (typeof window.cloudSync === 'function') window.cloudSync();
}

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
  { href: "index.html",         label: "Dashboard",          key: "dashboard",     icon: "📊" },
  { href: "copilot.html",       label: "Agro-Copilot (IA)",  key: "copilot",       icon: "🤖", badge: "EM BREVE" },
  { href: "centralgestao.html", label: "Central de Gestão",  key: "centralgestao", icon: "🛰️" },
  { href: "propriedade.html",   label: "Minha Propriedade",  key: "propriedade",   icon: "🏡" },
  { href: "insumos.html",       label: "Produtos & Estoque", key: "insumos",       icon: "🧪" },
  { href: "insumosbase.html",   label: "Insumos Base",       key: "insumosbase",   icon: "🌱" },
  { href: "aplicacoes.html",    label: "Aplicações",         key: "aplicacoes",    icon: "🚜" },
  { href: "combustivel.html",   label: "Combustível",        key: "combustivel",   icon: "⛽" },
  { href: "clima.html",         label: "Clima/Chuva",        key: "clima",         icon: "🌧️" },
  { href: "colheitas.html",     label: "Colheitas",          key: "colheitas",     icon: "🌾" },
  { href: "manutencao.html",    label: "Manutenção",         key: "manutencao",    icon: "🔧" },
  { href: "equipe.html",        label: "Equipe",             key: "equipe",        icon: "👷" },
  { href: "folhasalarial.html", label: "Folha Salarial",     key: "folhasalarial", icon: "💰" },
  { href: "analisesolo.html",   label: "Análise de Solo",    key: "analisesolo",   icon: "🔬" },
  { href: "maquinas.html",      label: "Máquinas",           key: "maquinas",      icon: "🛠️" },
  { href: "relatorios.html",    label: "Relatórios",         key: "relatorios",    icon: "🧾" },
  { href: "configuracoes.html", label: "Configurações",      key: "config",        icon: "⚙️" },
  { href: "ajuda.html",         label: "Ajuda & Suporte",    key: "ajuda",         icon: "❓" }
];

// ============================================================
// IA COMING SOON — tela de retenção para funcionalidades IA
// ============================================================
function _renderIAComingSoon(titulo, descricao, features) {
  const cards = features.map(f => `
    <div style="background:var(--bg-card, #f8fafc); border-radius:12px; padding:20px; text-align:center; border:1px solid var(--border, #e2e8f0);">
      <div style="font-size:36px; margin-bottom:10px;">${f.icon}</div>
      <h4 style="margin:0 0 6px; font-size:14px; font-weight:700;">${escapeHtml(f.title)}</h4>
      <p style="margin:0; font-size:12px; color:var(--text-muted, #64748b); line-height:1.4;">${escapeHtml(f.desc)}</p>
    </div>
  `).join('');

  return `
    <div style="max-width:700px; margin:0 auto;">
      <div class="card" style="text-align:center; padding:40px 30px; background:linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2d6a4f 100%); color:white; border:none; border-radius:16px; position:relative; overflow:hidden;">
        <div style="position:absolute; top:-40px; right:-40px; width:120px; height:120px; background:rgba(255,255,255,0.05); border-radius:50%;"></div>
        <div style="position:absolute; bottom:-30px; left:-30px; width:80px; height:80px; background:rgba(255,255,255,0.03); border-radius:50%;"></div>

        <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(251,191,36,0.2); padding:6px 16px; border-radius:20px; font-size:12px; font-weight:700; color:#fbbf24; margin-bottom:20px; letter-spacing:1px;">
          <span style="display:inline-block; width:8px; height:8px; background:#fbbf24; border-radius:50%; animation:pulse 2s infinite;"></span>
          EM DESENVOLVIMENTO
        </div>

        <h2 style="margin:0 0 12px; font-size:28px; font-weight:800;">${escapeHtml(titulo)}</h2>
        <p style="margin:0 auto 24px; max-width:500px; opacity:0.85; line-height:1.6; font-size:15px;">${escapeHtml(descricao)}</p>

        <div style="display:inline-flex; align-items:center; gap:10px; background:rgba(255,255,255,0.1); padding:10px 20px; border-radius:10px; font-size:13px;">
          <span style="font-size:20px;">🚀</span>
          <span>Previsão de lançamento: <b>em breve</b></span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-top:16px;">
        ${cards}
      </div>

      <div class="card" style="margin-top:16px; text-align:center; padding:24px; border:2px dashed var(--primary, #2d6a4f); background:var(--bg-card, #f0fdf4);">
        <h3 style="margin:0 0 8px; font-size:16px; color:var(--primary, #2d6a4f);">Quer ser avisado quando lançar?</h3>
        <p style="margin:0 0 16px; font-size:13px; color:var(--text-muted, #64748b);">Assine o plano Pro e seja o primeiro a ter acesso quando a IA for ativada.</p>
        <a href="https://wa.me/5599991360547?text=Ol%C3%A1!%20Quero%20saber%20quando%20a%20IA%20do%20Agro%20Pro%20ser%C3%A1%20lan%C3%A7ada!"
           target="_blank"
           style="display:inline-block; background:#25d366; color:white; padding:12px 28px; border-radius:10px; font-weight:700; text-decoration:none; font-size:14px; transition:transform 0.2s;"
           onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          💬 Quero ser avisado pelo WhatsApp
        </a>
      </div>
    </div>
    <style>
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
    </style>
  `;
}

// ============================================================
// DARK MODE — inicializar antes do primeiro render
// ============================================================
(function initTheme() {
  const saved = localStorage.getItem('agro_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

// ============================================================
// EMPTY STATE HELPER — nunca mostrar "0" vazio sem contexto
// ============================================================
/**
 * emptyState(icon, title, description, actionHtml)
 * Retorna HTML de estado vazio amigável.
 */
function emptyState(icon, title, description, actionHtml = '') {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      ${actionHtml}
    </div>
  `;
}

/**
 * kpiValue(n, unit, emptyMsg)
 * Formata um valor de KPI — se for 0 retorna msg de estado vazio
 * em vez de "0" solto.
 */
function kpiValue(n, unit = '', emptyMsg = 'Nenhum registro') {
  const v = Number(n || 0);
  if (v === 0) return `<span class="text-muted" style="font-size:14px; font-weight:500;">${emptyMsg}</span>`;
  return `${num(v)}${unit ? ` <span style="font-size:13px;font-weight:400;">${unit}</span>` : ''}`;
}

