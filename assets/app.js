/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTIEMPRESA / MULTISAFRA)
   Versão: 3.0 - com suporte a safras
   ============================================================ */

// ==================== FUNÇÕES UTILITÁRIAS ====================
const Storage = {
  key: "agro_pro_v3",
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

// ==================== DB / SEED ====================
function seedDB(){
  const empresaId = uid("emp");
  const safra1Id = uid("saf");
  const safra2Id = uid("saf");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");
  const talhao2Id = uid("tal");
  const maqId = uid("maq");
  const opId = uid("peq");
  const prd1 = uid("prd");
  const prd2 = uid("prd");

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 3 },
    session: { empresaId, safraId: safra1Id },

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

    safras: [
      {
        id: safra1Id,
        empresaId,
        nome: "Safra 2025/26",
        dataInicio: "2025-09-01",
        dataFim: "2026-08-31",
        ativa: true,
        observacoes: "Safra de verão - Soja/Milho"
      },
      {
        id: safra2Id,
        empresaId,
        nome: "Safra 2024/25",
        dataInicio: "2024-09-01",
        dataFim: "2025-08-31",
        ativa: false,
        observacoes: "Safra anterior"
      }
    ],

    fazendas: [
      { 
        id: fazendaId, 
        empresaId, 
        safraId: safra1Id,
        nome:"Fazenda Horizonte", 
        cidade:"Sorriso", 
        uf:"MT", 
        areaHa: 1450, 
        observacoes:"Soja/Milho safrinha" 
      }
    ],

    talhoes: [
      { 
        id: talhaoId, 
        empresaId, 
        safraId: safra1Id,
        fazendaId, 
        nome:"T-12", 
        areaHa: 78.5, 
        cultura:"Soja", 
        safra:"2025/26", 
        solo:"Argiloso", 
        coordenadas:"", 
        observacoes:"" 
      },
      { 
        id: talhao2Id, 
        empresaId, 
        safraId: safra2Id,
        fazendaId, 
        nome:"T-15", 
        areaHa: 120.0, 
        cultura:"Milho", 
        safra:"2024/25", 
        solo:"Argiloso", 
        coordenadas:"", 
        observacoes:"Safra passada" 
      }
    ],

    produtos: [
      { 
        id: prd1, 
        empresaId, 
        safraId: safra1Id,
        tipo:"Herbicida", 
        nome:"Glifosato 480", 
        ingrediente:"Glifosato", 
        fabricante:"Genérico", 
        registro:"", 
        carenciaDias: 7, 
        reentradaHoras: 24, 
        unidade:"L", 
        preco: 45.90, 
        obs:"" 
      },
      { 
        id: prd2, 
        empresaId, 
        safraId: safra1Id,
        tipo:"Fungicida", 
        nome:"Triazol+Estrobilurina", 
        ingrediente:"Mistura", 
        fabricante:"Genérico", 
        registro:"", 
        carenciaDias: 14, 
        reentradaHoras: 24, 
        unidade:"L", 
        preco: 89.90, 
        obs:"" 
      }
    ],

    estoque: [
      { 
        id: uid("stk"), 
        empresaId, 
        safraId: safra1Id,
        produtoId: prd1, 
        deposito:"Central", 
        lote:"", 
        validade:"", 
        qtd: 1200, 
        unidade:"L", 
        obs:"Demo" 
      },
      { 
        id: uid("stk"), 
        empresaId, 
        safraId: safra1Id,
        produtoId: prd2, 
        deposito:"Central", 
        lote:"", 
        validade:"", 
        qtd: 240, 
        unidade:"L", 
        obs:"Demo" 
      }
    ],

    equipe: [
      { 
        id: opId, 
        empresaId, 
        safraId: safra1Id,
        nome:"Operador 1", 
        funcao:"Tratorista", 
        telefone:"", 
        nr:"", 
        obs:"" 
      }
    ],

    maquinas: [
      { 
        id: maqId, 
        empresaId, 
        safraId: safra1Id,
        nome:"Pulverizador Autopropelido", 
        placa:"", 
        horimetro: 0, 
        capacidadeL: 3000, 
        bicos:"", 
        obs:"" 
      }
    ],

    clima: [
      { 
        id: uid("cli"), 
        empresaId, 
        safraId: safra1Id,
        data: nowISO(), 
        fazendaId, 
        talhaoId, 
        chuvaMm: 12, 
        tempMin: 22, 
        tempMax: 33, 
        umidade: 68, 
        vento: 9, 
        obs:"Chuva isolada à tarde" 
      }
    ],

    dieselEstoque: [
      { 
        id: uid("dsl"), 
        empresaId, 
        safraId: safra1Id,
        deposito:"Tanque Principal", 
        litros: 5000, 
        obs:"Saldo pode ficar negativo" 
      }
    ],
    
    combustivel: [
      {
        id: uid("cmb"),
        empresaId,
        safraId: safra1Id,
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
        safraId: safra1Id,
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
        custoTotal: 450.00,
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

  // migrações
  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 3 };
  db.session = db.session || {};
  db.empresas = db.empresas || [];
  db.safras = db.safras || [];
  db.fazendas = db.fazendas || [];
  db.talhoes = db.talhoes || [];
  db.produtos = db.produtos || [];
  db.estoque = db.estoque || [];
  db.equipe = db.equipe || [];
  db.maquinas = db.maquinas || [];
  db.clima = db.clima || [];
  db.aplicacoes = db.aplicacoes || [];
  db.combustivel = db.combustivel || [];
  db.dieselEstoque = db.dieselEstoque || [];

  // Garantir safraId em todos os registros
  const safraId = db.session?.safraId || db.safras[0]?.id;
  
  // Migrar dados antigos para incluir safraId
  const migrarColecao = (colecao) => {
    if(!colecao) return;
    colecao.forEach(item => {
      if(!item.safraId && safraId) item.safraId = safraId;
    });
  };

  migrarColecao(db.fazendas);
  migrarColecao(db.talhoes);
  migrarColecao(db.produtos);
  migrarColecao(db.estoque);
  migrarColecao(db.equipe);
  migrarColecao(db.maquinas);
  migrarColecao(db.clima);
  migrarColecao(db.aplicacoes);
  migrarColecao(db.combustivel);
  migrarColecao(db.dieselEstoque);

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

// ==================== NOVAS FUNÇÕES DE SAFRA ====================
function getSafraId(){
  const db = getDB();
  return db.session?.safraId || (db.safras?.[0]?.id ?? null);
}

function setSafraId(id){
  const db = getDB();
  db.session = db.session || {};
  db.session.safraId = id;
  setDB(db);
}

function getSafraAtual(){
  const db = getDB();
  const sid = getSafraId();
  return db.safras?.find(s => s.id === sid);
}

function onlySafra(arr){
  const sid = getSafraId();
  return (arr||[]).filter(x => x.safraId === sid);
}

function onlyEmpresaESafra(arr){
  const eid = getEmpresaId();
  const sid = getSafraId();
  return (arr||[]).filter(x => x.empresaId === eid && x.safraId === sid);
}

// ==================== UI SHELL ====================
const PAGES = [
  { href:"index.html", label:"Dashboard", key:"dashboard", icon:"📊" },
  { href:"comparativo.html", label:"Comparativo Safras", key:"comparativo", icon:"📈" },
  { href:"planejamento.html", label:"Planejamento", key:"planejamento", icon:"📅" },
  { href:"fazendas.html", label:"Fazendas", key:"fazendas", icon:"🌾" },
  { href:"talhoes.html", label:"Talhões", key:"talhoes", icon:"🧭" },
  { href:"produtos.html", label:"Produtos", key:"produtos", icon:"🧪" },
  { href:"estoque.html", label:"Estoque", key:"estoque", icon:"📦" },
  { href:"aplicacoes.html", label:"Aplicações", key:"aplicacoes", icon:"🚜" },
  { href:"combustivel.html", label:"Combustível", key:"combustivel", icon:"⛽" },
  { href:"clima.html", label:"Clima", key:"clima", icon:"🌧️" },
  { href:"relatorios.html", label:"Relatórios", key:"relatorios", icon:"🧾" },
];

function renderShell(pageKey, title, subtitle){
  const db = getDB();
  const empresaId = getEmpresaId();
  const safraId = getSafraId();
  const safra = getSafraAtual();
  const empresa = db.empresas.find(e=>e.id===empresaId);

  const nav = PAGES.map(p => {
    const active = (p.key===pageKey) ? "active" : "";
    return `<a class="${active}" href="${p.href}"><span class="ico">${p.icon}</span> ${escapeHtml(p.label)}</a>`;
  }).join("");

  const safraOptions = (db.safras || [])
    .filter(s => s.empresaId === empresaId)
    .map(s => {
      const sel = s.id===safraId ? "selected" : "";
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
            <span class="badge"><span class="dot"></span> Offline</span>
            <button class="btn noPrint" id="btnBackup">💾 Backup</button>
          </div>
          <div class="hr"></div>
          
          <small>🌱 Safra ativa</small>
          <select class="select" id="safraSelect">${safraOptions}</select>
          
          <div style="margin-top:10px" class="row">
            <button class="btn primary" id="btnNovaSafra">+ Nova safra</button>
            <button class="btn" id="btnEmpresas">🏢 Empresa</button>
          </div>
          
          <div style="margin-top:5px; font-size:12px; color:#888;">
            ${empresa ? `Empresa: ${escapeHtml(empresa.nome)}` : ''}
          </div>
          
          <div style="margin-top:10px" class="help">
            Trocar safra filtra todos os dados.
          </div>
        </div>

        <nav class="nav">${nav}</nav>
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

  document.getElementById("safraSelect").addEventListener("change", (e)=>{
    setSafraId(e.target.value);
    toast("Safra alterada", "Filtrando dados...");
    setTimeout(()=>location.reload(), 200);
  });

  document.getElementById("btnNovaSafra").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova safra (ex: 2026/27):");
    if(!nome) return;
    const db2 = getDB();
    if(!db2.safras) db2.safras = [];
    const id = uid("saf");
    db2.safras.push({ 
      id, 
      nome, 
      empresaId: getEmpresaId(),
      dataInicio: nowISO(),
      dataFim: "",
      ativa: true,
      observacoes: ""
    });
    setDB(db2);
    setSafraId(id);
    toast("Safra criada", "Nova safra ativada!");
    setTimeout(()=>location.reload(), 200);
  });

  document.getElementById("btnEmpresas").addEventListener("click", ()=>{
    const novaEmpresa = prompt("Trocar para qual empresa? (Digite o nome ou deixe vazio para ver lista)");
    if(novaEmpresa === null) return;
    toast("Empresas", "Funcionalidade em desenvolvimento");
  });

  document.getElementById("btnBackup").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(db2, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });
}

// ==================== HELPERS ====================
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

// ==================== DASHBOARD POR SAFRA ====================
function pageDashboard(){
  const db = getDB();
  const safra = getSafraAtual();
  
  // Dados da safra atual
  const fazendas = onlyEmpresaESafra(db.fazendas);
  const talhoes = onlyEmpresaESafra(db.talhoes);
  const produtos = onlyEmpresaESafra(db.produtos);
  const aplicacoes = onlyEmpresaESafra(db.aplicacoes);
  const clima = onlyEmpresaESafra(db.clima);

  const areaTotal = talhoes.reduce((s,t) => s + Number(t.areaHa||0), 0);
  const areaAplicada = aplicacoes.reduce((s,a) => s + Number(a.areaHaAplicada||0), 0);
  const progresso = areaTotal ? ((areaAplicada / areaTotal) * 100).toFixed(1) : 0;
  
  const custoTotal = aplicacoes.reduce((s,a) => s + Number(a.custoTotal||0), 0);
  const diasRestantes = calcularDiasRestantes(safra);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a=>a.data===hoje).length;
  const chuvaHoje = clima.filter(c=>c.data===hoje).reduce((s,c)=>s+Number(c.chuvaMm||0),0);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card" style="background: linear-gradient(135deg, #00b09b, #96c93d);">
        <h3>🌱 Safra ${escapeHtml(safra?.nome || 'Atual')}</h3>
        <div class="big">${progresso}%</div>
        <div class="sub">${num(areaAplicada,1)} ha de ${num(areaTotal,1)} ha</div>
      </div>
      
      <div class="card">
        <h3>💰 Custo Total</h3>
        <div class="big">${kbrl(custoTotal)}</div>
        <div class="sub">R$ ${areaTotal ? (custoTotal/areaTotal).toFixed(2) : '0'}/ha</div>
      </div>
      
      <div class="card">
        <h3>📅 Dias Restantes</h3>
        <div class="big">${diasRestantes}</div>
        <div class="sub">para fim da safra</div>
      </div>
      
      <div class="card">
        <h3>🚜 Aplicações</h3>
        <div class="big">${aplicacoes.length}</div>
        <div class="sub">${aplHoje} hoje</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>📊 Progresso da Safra</h3>
        <div style="height:20px; background:#2a2a30; border-radius:10px; margin:15px 0;">
          <div style="width:${progresso}%; height:100%; background:#00b09b; border-radius:10px; transition:width 0.3s;"></div>
        </div>
        <div class="row" style="justify-content:space-between">
          <span>${num(areaAplicada,1)} ha aplicados</span>
          <span>${num(areaTotal - areaAplicada,1)} ha restantes</span>
        </div>
      </div>

      <div class="tableWrap">
        <h3 style="margin-bottom:15px;">📋 Últimas aplicações</h3>
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
            ${aplicacoes.slice().reverse().slice(0,5).map(a=>{
              const talhao = findNameById(talhoes, a.talhaoId);
              const produto = a.produtos?.[0]?.produtoNome || '—';
              return `
                <tr>
                  <td>${escapeHtml(a.data||'')}</td>
                  <td>${escapeHtml(talhao)}</td>
                  <td>${num(a.areaHaAplicada||0,1)} ha</td>
                  <td>${escapeHtml(produto)}</td>
                  <td>${kbrl(a.custoTotal||0)}</td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="5">Sem registros</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  function calcularDiasRestantes(safra){
    if(!safra?.dataFim) return 'N/A';
    const fim = new Date(safra.dataFim);
    const hoje = new Date();
    const diff = fim - hoje;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}

// ==================== COMPARATIVO ENTRE SAFRAS ====================
function pageComparativo(){
  const db = getDB();
  const empresaId = getEmpresaId();
  const safras = (db.safras || []).filter(s => s.empresaId === empresaId);
  
  const dados = safras.map(s => {
    const aplicacoesSafra = (db.aplicacoes || []).filter(a => a.safraId === s.id);
    const talhoesSafra = (db.talhoes || []).filter(t => t.safraId === s.id);
    const areaTotal = talhoesSafra.reduce((a,t) => a + Number(t.areaHa||0), 0);
    const custoTotal = aplicacoesSafra.reduce((a,ap) => a + Number(ap.custoTotal||0), 0);
    
    return {
      safra: s.nome,
      ativa: s.ativa,
      area: areaTotal,
      custo: custoTotal,
      aplicacoes: aplicacoesSafra.length,
      custoHa: areaTotal ? custoTotal / areaTotal : 0
    };
  });

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>📊 Total de Safras</h3>
        <div class="big">${safras.length}</div>
        <div class="sub">Registradas</div>
      </div>
      <div class="card">
        <h3>💰 Custo Médio</h3>
        <div class="big">${kbrl(dados.reduce((a,d)=>a+d.custo,0) / (dados.length||1))}</div>
        <div class="sub">Por safra</div>
      </div>
    </div>

    <div class="tableWrap">
      <h3 style="margin-bottom:15px;">📈 Comparativo entre Safras</h3>
      <table>
        <thead>
          <tr>
            <th>Safra</th>
            <th>Status</th>
            <th>Área (ha)</th>
            <th>Aplicações</th>
            <th>Custo Total</th>
            <th>Custo/ha</th>
          </tr>
        </thead>
        <tbody>
          ${dados.map(d => `
            <tr>
              <td><b>${escapeHtml(d.safra)}</b></td>
              <td><span class="pill ${d.ativa ? 'success' : ''}">${d.ativa ? 'Ativa' : 'Encerrada'}</span></td>
              <td>${num(d.area,1)}</td>
              <td>${d.aplicacoes}</td>
              <td>${kbrl(d.custo)}</td>
              <td>${kbrl(d.custoHa)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ==================== PLANEJAMENTO DA SAFRA ====================
function pagePlanejamento(){
  const db = getDB();
  const safra = getSafraAtual();
  const talhoes = onlyEmpresaESafra(db.talhoes);
  
  // Calcular necessidades baseado em dados históricos
  const aplicacoesPassadas = onlyEmpresaESafra(db.aplicacoes);
  const usoMedioPorHa = {};
  
  aplicacoesPassadas.forEach(a => {
    (a.produtos || []).forEach(p => {
      if(!usoMedioPorHa[p.produtoNome]) {
        usoMedioPorHa[p.produtoNome] = { total: 0, area: 0 };
      }
      usoMedioPorHa[p.produtoNome].total += (p.dosePorHa || 0) * (a.areaHaAplicada || 0);
      usoMedioPorHa[p.produtoNome].area += (a.areaHaAplicada || 0);
    });
  });

  const necessidades = Object.entries(usoMedioPorHa).map(([produto, dados]) => ({
    produto,
    doseMediaHa: dados.area ? dados.total / dados.area : 0,
    necessario: dados.area ? (dados.total / dados.area) * talhoes.reduce((a,t)=>a+Number(t.areaHa||0),0) : 0
  }));

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>📅 Safra</h3>
        <div class="big">${escapeHtml(safra?.nome || 'N/A')}</div>
        <div class="sub">Em planejamento</div>
      </div>
      <div class="card">
        <h3>🌾 Área Total</h3>
        <div class="big">${num(talhoes.reduce((a,t)=>a+Number(t.areaHa||0),0),1)} ha</div>
        <div class="sub">${talhoes.length} talhões</div>
      </div>
    </div>

    <div class="card">
      <h3>📋 Previsão de Insumos</h3>
      <table style="width:100%; margin-top:15px;">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Dose Média (ha)</th>
            <th>Necessidade Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${necessidades.map(n => `
            <tr>
              <td><b>${escapeHtml(n.produto)}</b></td>
              <td>${num(n.doseMediaHa,2)} L/ha</td>
              <td>${num(n.necessario,1)} L</td>
              <td><span class="pill info">A planejar</span></td>
            </tr>
          `).join('') || '<tr><td colspan="4">Sem dados históricos</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card" style="margin-top:20px;">
      <h3>📅 Calendário Sugerido</h3>
      <div class="help">
        • Baseado em safras anteriores<br>
        • 30 dias antes: Preparo do solo<br>
        • 15 dias antes: Aquisição de insumos<br>
        • Início da safra: Primeiras aplicações<br>
        • Monitoramento contínuo
      </div>
    </div>
  `;
}

// ==================== PÁGINAS EXISTENTES (adaptadas para safra) ====================
function pageFazendas(){
  const db = getDB();
  const fazendas = onlyEmpresaESafra(db.fazendas);
  
  setTopActions(`<button class="btn primary" onclick="alert('Nova fazenda')">+ Nova</button>`);
  
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="tableWrap">
      <h3>🌾 Fazendas da Safra</h3>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cidade</th>
            <th>UF</th>
            <th>Área (ha)</th>
          </tr>
        </thead>
        <tbody>
          ${fazendas.map(f => `
            <tr>
              <td><b>${escapeHtml(f.nome)}</b></td>
              <td>${escapeHtml(f.cidade||'')}</td>
              <td>${escapeHtml(f.uf||'')}</td>
              <td>${num(f.areaHa||0,1)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Funções placeholder para outras páginas
function pageTalhoes(){ 
  const db = getDB();
  const talhoes = onlyEmpresaESafra(db.talhoes);
  const fazendas = onlyEmpresaESafra(db.fazendas);
  
  document.getElementById("content").innerHTML = `
    <div class="tableWrap">
      <h3>🧭 Talhões da Safra</h3>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Fazenda</th>
            <th>Área (ha)</th>
            <th>Cultura</th>
          </tr>
        </thead>
        <tbody>
          ${talhoes.map(t => {
            const fazenda = findNameById(fazendas, t.fazendaId);
            return `
              <tr>
                <td><b>${escapeHtml(t.nome)}</b></td>
                <td>${escapeHtml(fazenda)}</td>
                <td>${num(t.areaHa||0,1)}</td>
                <td>${escapeHtml(t.cultura||'-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function pageProdutos(){ 
  const db = getDB();
  const produtos = onlyEmpresaESafra(db.produtos);
  
  document.getElementById("content").innerHTML = `
    <div class="tableWrap">
      <h3>🧪 Produtos da Safra</h3>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Unidade</th>
            <th>Preço</th>
          </tr>
        </thead>
        <tbody>
          ${produtos.map(p => `
            <tr>
              <td><b>${escapeHtml(p.nome)}</b></td>
              <td>${escapeHtml(p.tipo||'')}</td>
              <td>${escapeHtml(p.unidade||'')}</td>
              <td>${kbrl(p.preco||0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function pageEstoque(){ 
  const db = getDB();
  const estoque = onlyEmpresaESafra(db.estoque);
  const produtos = onlyEmpresaESafra(db.produtos);
  
  document.getElementById("content").innerHTML = `
    <div class="tableWrap">
      <h3>📦 Estoque da Safra</h3>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Depósito</th>
            <th>Quantidade</th>
            <th>Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${estoque.map(e => {
            const produto = produtos.find(p => p.id === e.produtoId);
            return `
              <tr>
                <td><b>${escapeHtml(produto?.nome||'?')}</b></td>
                <td>${escapeHtml(e.deposito||'')}</td>
                <td>${num(e.qtd||0,1)}</td>
                <td>${escapeHtml(e.unidade||'')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function pageAplicacoes(){ 
  const db = getDB();
  const aplicacoes = onlyEmpresaESafra(db.aplicacoes);
  const talhoes = onlyEmpresaESafra(db.talhoes);
  
  document.getElementById("content").innerHTML = `
    <div class="tableWrap">
      <h3>🚜 Aplicações da Safra</h3>
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
          ${aplicacoes.slice().reverse().map(a => {
            const talhao = findNameById(talhoes, a.talhaoId);
            const produto = a.produtos?.[0]?.produtoNome || '—';
            return `
              <tr>
                <td>${escapeHtml(a.data||'')}</td>
                <td>${escapeHtml(talhao)}</td>
                <td>${num(a.areaHaAplicada||0,1)} ha</td>
                <td>${escapeHtml(produto)}</td>
                <td>${kbrl(a.custoTotal||0)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function pageCombustivel(){ 
  document.getElementById("content").innerHTML = '<div class="card"><h3>⛽ Combustível</h3><p>Em desenvolvimento</p></div>';
}

function pageClima(){ 
  document.getElementById("content").innerHTML = '<div class="card"><h3>🌧️ Clima</h3><p>Em desenvolvimento</p></div>';
}

function pageRelatorios(){ 
  document.getElementById("content").innerHTML = '<div class="card"><h3>🧾 Relatórios</h3><p>Em desenvolvimento</p></div>';
}

// ==================== BOOT ====================
function boot(){
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  
  const titles = {
    dashboard: ["Dashboard", "Visão geral da safra atual"],
    comparativo: ["Comparativo de Safras", "Análise entre safras"],
    planejamento: ["Planejamento", "Previsão de insumos e calendário"],
    fazendas: ["Fazendas", "Unidades produtivas da safra"],
    talhoes: ["Talhões", "Áreas de cultivo da safra"],
    produtos: ["Produtos", "Insumos utilizados na safra"],
    estoque: ["Estoque", "Controle de insumos da safra"],
    aplicacoes: ["Aplicações", "Operações realizadas na safra"],
    combustivel: ["Combustível", "Abastecimentos da safra"],
    clima: ["Clima", "Registros climáticos da safra"],
    relatorios: ["Relatórios", "Exportação de dados da safra"]
  };

  const [t, s] = titles[pageKey] || ["Agro Pro", ""];
  renderShell(pageKey, t, s);

  // Roteamento
  if(pageKey === "dashboard") pageDashboard();
  else if(pageKey === "comparativo") pageComparativo();
  else if(pageKey === "planejamento") pagePlanejamento();
  else if(pageKey === "fazendas") pageFazendas();
  else if(pageKey === "talhoes") pageTalhoes();
  else if(pageKey === "produtos") pageProdutos();
  else if(pageKey === "estoque") pageEstoque();
  else if(pageKey === "aplicacoes") pageAplicacoes();
  else if(pageKey === "combustivel") pageCombustivel();
  else if(pageKey === "clima") pageClima();
  else if(pageKey === "relatorios") pageRelatorios();

  toast("Agro Pro", `Safra: ${getSafraAtual()?.nome || 'N/A'}`);
}

// Inicialização
document.addEventListener("DOMContentLoaded", boot);