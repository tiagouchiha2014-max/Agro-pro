/* ============================================================
   AGRO PRO — app.js (DO ZERO)
   OFFLINE / MULTIEMPRESA / SAFRAS
   - Estoque (L e kg) com saldo negativo permitido
   - Aplicações (10 linhas) com baixa automática no estoque
   - Combustível com estoque de Diesel (compra/abastecimento)
   - Clima/Chuva por talhão (acumulativo)
   - Financeiro por safra (despesas/receitas/saldo + custo/ha)
   - Operations Center (base)
   ============================================================ */

const LS_KEY = "agropro_db_v3";
const LS_ACTIVE_EMP = "agropro_active_empresa_v2";
const LS_ACTIVE_SAFRA = "agropro_active_safra_v2";

const PAGES = [
  { href:"index.html",        label:"Dashboard",         key:"dashboard",    icon:"📊" },
  { href:"opscenter.html",    label:"Operations Center", key:"opscenter",    icon:"🛰️" },
  { href:"financeiro.html",   label:"Financeiro",        key:"financeiro",   icon:"💰" },
  { href:"safras.html",       label:"Safras",            key:"safras",       icon:"🌱" },
  { href:"empresas.html",     label:"Empresas",          key:"empresas",     icon:"🏢" },
  { href:"fazendas.html",     label:"Fazendas",          key:"fazendas",     icon:"🌾" },
  { href:"talhoes.html",      label:"Talhões",           key:"talhoes",      icon:"🧭" },
  { href:"produtos.html",     label:"Produtos",          key:"produtos",     icon:"🧪" },
  { href:"estoque.html",      label:"Estoque",           key:"estoque",      icon:"📦" },
  { href:"aplicacoes.html",   label:"Aplicações",        key:"aplicacoes",   icon:"🚜" },
  { href:"combustivel.html",  label:"Combustível",       key:"combustivel",  icon:"⛽" },
  { href:"clima.html",        label:"Clima/Chuva",       key:"clima",        icon:"🌧️" },
  { href:"equipe.html",       label:"Equipe",            key:"equipe",       icon:"👷" },
  { href:"maquinas.html",     label:"Máquinas",          key:"maquinas",     icon:"🛠️" },
  { href:"relatorios.html",   label:"Relatórios",        key:"relatorios",   icon:"🧾" },
  { href:"config.html",       label:"Configurações",     key:"config",       icon:"⚙️" },
];

// ===================== Formatação BR =====================
const FMT_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function brl(v){ return FMT_BRL.format(Number(v || 0)); }
function num(v, casas=2){
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })
    .format(Number(v || 0));
}
function parseNum(v){
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  // aceita "1.234,56" ou "1234.56"
  const norm = s.replace(/\./g,"").replace(",",".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

// ===================== Utils =====================
function uid(prefix="id"){ return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }
function nowISO(){
  const d = new Date();
  const yyyy=d.getFullYear();
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function byDateDesc(a,b){ return String(b.data||"").localeCompare(String(a.data||"")); }
function esc(s){ return String(s??"").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

function toast(title, msg=""){
  const host = document.querySelector(".toastHost");
  if (!host) return alert(`${title}\n${msg}`);
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${esc(title)}</b><p>${esc(msg)}</p>`;
  host.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; }, 2400);
  setTimeout(()=>{ el.remove(); }, 3200);
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

function toCSV(rows){
  if (!rows || !rows.length) return "";
  const cols = Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows.map(r => cols.map(c => `"${String(r[c]??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  return head + "\n" + body;
}

// ===================== DB =====================
function getDB(){
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  const db = seedDB();
  setDB(db);
  return db;
}
function setDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function seedDB(){
  const empId = uid("emp");
  const fazId = uid("faz");
  const tal1 = uid("tal");
  const tal2 = uid("tal");
  const safId = uid("saf");

  return {
    version: 3,
    empresas: [{ id: empId, nome:"Agro Demo LTDA", createdAt: Date.now() }],
    safras: [{ id: safId, empresaId: empId, nome:"Safra Atual • Soja", inicio: nowISO(), fim:"", ativa:true }],
    fazendas: [{ id: fazId, empresaId: empId, nome:"Fazenda Horizonte" }],
    talhoes: [
      { id: tal1, empresaId: empId, fazendaId: fazId, nome:"T-12", areaHa: 78.5 },
      { id: tal2, empresaId: empId, fazendaId: fazId, nome:"T-20", areaHa: 42.0 },
    ],
    equipe: [],
    maquinas: [],
    produtos: [
      { id: uid("prd"), empresaId: empId, nome:"Glifosato 480", unidade:"L" },
      { id: uid("prd"), empresaId: empId, nome:"Óleo Mineral", unidade:"L" },
      { id: uid("prd"), empresaId: empId, nome:"Ureia", unidade:"kg" },
    ],
    estoqueMov: [
      // entrada exemplo
      { id: uid("mov"), empresaId: empId, safraId: safId, data: nowISO(), produtoId: null, tipo:"IN", qtd:0, valorTotal:0, obs:"" }
    ].filter(x=>x.produtoId), // remove dummy
    aplicacoes: [],
    combustivel: [],          // abastecimentos
    dieselMov: [],            // IN (compra) / OUT (abastecimento)
    chuvas: [],               // registros por talhão
    financeiro: []            // lançamentos manuais (receita/despesa)
  };
}

// ===================== Ativos =====================
function getEmpresaId(){
  const id = localStorage.getItem(LS_ACTIVE_EMP);
  const db = getDB();
  if (id && db.empresas.some(e=>e.id===id)) return id;
  // fallback: primeira
  const first = db.empresas[0]?.id || "";
  if (first) localStorage.setItem(LS_ACTIVE_EMP, first);
  return first;
}
function setEmpresaId(id){
  localStorage.setItem(LS_ACTIVE_EMP, id);
}
function getSafraId(){
  const id = localStorage.getItem(LS_ACTIVE_SAFRA);
  const db = getDB();
  const empId = getEmpresaId();
  const list = db.safras.filter(s=>s.empresaId===empId);
  if (id && list.some(s=>s.id===id)) return id;
  const active = list.find(s=>s.ativa) || list[0];
  if (active) localStorage.setItem(LS_ACTIVE_SAFRA, active.id);
  return active?.id || "";
}
function setSafraId(id){
  localStorage.setItem(LS_ACTIVE_SAFRA, id);
}

function onlyEmpresa(arr){
  const empId = getEmpresaId();
  return (arr||[]).filter(x => x.empresaId === empId);
}
function onlySafra(arr){
  const safraId = getSafraId();
  return (arr||[]).filter(x => x.safraId === safraId);
}

// ===================== Custos médios (para estimativas) =====================
function custoMedioProduto(db, produtoId){
  const movsIn = onlySafra(onlyEmpresa(db.estoqueMov)).filter(m => m.produtoId===produtoId && m.tipo==="IN");
  const totalQtd = movsIn.reduce((a,b)=>a + Number(b.qtd||0), 0);
  const totalVal = movsIn.reduce((a,b)=>a + Number(b.valorTotal||0), 0);
  if (totalQtd <= 0) return 0;
  return totalVal / totalQtd;
}
function custoMedioDiesel(db){
  const movsIn = onlySafra(onlyEmpresa(db.dieselMov)).filter(m => m.tipo==="IN");
  const totalL = movsIn.reduce((a,b)=>a + Number(b.litros||0), 0);
  const totalVal = movsIn.reduce((a,b)=>a + Number(b.valorTotal||0), 0);
  if (totalL <= 0) return 0;
  return totalVal / totalL;
}
function saldoEstoque(db, produtoId){
  const movs = onlySafra(onlyEmpresa(db.estoqueMov)).filter(m => m.produtoId===produtoId);
  const inQtd  = movs.filter(m=>m.tipo==="IN").reduce((a,b)=>a+Number(b.qtd||0),0);
  const outQtd = movs.filter(m=>m.tipo==="OUT").reduce((a,b)=>a+Number(b.qtd||0),0);
  return inQtd - outQtd;
}
function saldoDiesel(db){
  const movs = onlySafra(onlyEmpresa(db.dieselMov));
  const inL  = movs.filter(m=>m.tipo==="IN").reduce((a,b)=>a+Number(b.litros||0),0);
  const outL = movs.filter(m=>m.tipo==="OUT").reduce((a,b)=>a+Number(b.litros||0),0);
  return inL - outL;
}

// ===================== Shell UI =====================
function pageKey(){
  return document.body.getAttribute("data-page") || "dashboard";
}

function buildShell(){
  const db = getDB();
  const empId = getEmpresaId();
  const safId = getSafraId();
  const empList = db.empresas || [];
  const safList = (db.safras||[]).filter(s=>s.empresaId===empId);

  const activePage = pageKey();
  const nav = PAGES.map(p=>{
    const cls = p.key===activePage ? "active" : "";
    return `<a class="${cls}" href="${p.href}"><span class="ico">${p.icon}</span> <span>${esc(p.label)}</span></a>`;
  }).join("");

  document.getElementById("app").innerHTML = `
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
            <span class="badge"><span class="dot"></span> <b>Ambiente Offline</b></span>
            <button class="btn" id="btnBackup">Backup</button>
          </div>

          <div class="hr"></div>

          <small>Empresa ativa</small>
          <select class="select" id="selEmpresa">
            ${empList.map(e=>`<option value="${e.id}" ${e.id===empId?"selected":""}>${esc(e.nome)}</option>`).join("")}
          </select>

          <div style="height:10px"></div>

          <small>Safra ativa</small>
          <select class="select" id="selSafra">
            ${safList.map(s=>`<option value="${s.id}" ${s.id===safId?"selected":""}>${esc(s.nome)}</option>`).join("")}
          </select>

          <div style="height:10px"></div>

          <div class="row" style="justify-content:space-between">
            <button class="btn primary" id="btnNovaEmpresa">+ Nova empresa</button>
            <button class="btn danger" id="btnResetDemo">Reset demo</button>
          </div>

          <div style="margin-top:10px" class="help">
            Empresa e safra filtram dados exibidos e relatórios.
          </div>
        </div>

        <nav class="nav">${nav}</nav>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="title">
            <h2 id="pageTitle">Agro Pro</h2>
            <p id="pageSub">Gestão agrícola offline • rápido e seguro</p>
          </div>
          <div class="actions" id="topActions"></div>
        </div>

        <div id="content"></div>
      </main>
    </div>

    <div class="toastHost"></div>
  `;

  // Actions
  document.getElementById("selEmpresa").addEventListener("change", (e)=>{
    setEmpresaId(e.target.value);
    // ao trocar empresa, recalcula safra ativa
    setSafraId(getSafraId());
    location.reload();
  });

  document.getElementById("selSafra").addEventListener("change", (e)=>{
    setSafraId(e.target.value);
    location.reload();
  });

  document.getElementById("btnBackup").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`agropro-backup-${nowISO()}.json`, JSON.stringify(db2, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if (!nome) return;
    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome: nome.trim(), createdAt: Date.now() });
    // cria safra padrão
    const safId2 = uid("saf");
    db2.safras.push({ id: safId2, empresaId: id, nome:"Safra Atual • Soja", inicio: nowISO(), fim:"", ativa:true });
    setDB(db2);
    setEmpresaId(id);
    setSafraId(safId2);
    location.reload();
  });

  document.getElementById("btnResetDemo").addEventListener("click", ()=>{
    if (!confirm("Resetar tudo? Isso apaga os dados locais.")) return;
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_ACTIVE_EMP);
    localStorage.removeItem(LS_ACTIVE_SAFRA);
    location.reload();
  });
}

function setTop(title, sub=""){
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageSub").textContent = sub;
}
function setTopActions(html){
  document.getElementById("topActions").innerHTML = html || "";
}

// ===================== Router =====================
function boot(){
  buildShell();

  const key = pageKey();
  if (key==="dashboard") pageDashboard();
  else if (key==="opscenter") pageOpsCenter();
  else if (key==="financeiro") pageFinanceiro();
  else if (key==="safras") pageSafras();
  else if (key==="empresas") pageEmpresas();
  else if (key==="fazendas") pageFazendas();
  else if (key==="talhoes") pageTalhoes();
  else if (key==="produtos") pageProdutos();
  else if (key==="estoque") pageEstoque();
  else if (key==="aplicacoes") pageAplicacoes();
  else if (key==="combustivel") pageCombustivel();
  else if (key==="clima") pageClima();
  else if (key==="equipe") pageEquipe();
  else if (key==="maquinas") pageMaquinas();
  else if (key==="relatorios") pageRelatorios();
  else if (key==="config") pageConfig();
  else pageDashboard();
}

document.addEventListener("DOMContentLoaded", boot);

// ===================== Pages =====================

// ---------- Dashboard ----------
function pageDashboard(){
  setTop("Dashboard", "Visão geral, indicadores e últimos registros");
  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const aplicacoesHoje = onlySafra(onlyEmpresa(db.aplicacoes)).filter(a=>a.data===nowISO()).length;

  const chuvaHoje = onlySafra(onlyEmpresa(db.chuvas)).filter(c=>c.data===nowISO()).reduce((a,b)=>a+Number(b.mm||0),0);
  const dieselHoje = onlySafra(onlyEmpresa(db.combustivel)).filter(c=>c.data===nowISO()).reduce((a,b)=>a+(Number(b.litros||0)*Number(b.precoLitro||0)),0);

  document.getElementById("content").innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Fazendas</h3>
        <div class="big">${fazendas.length}</div>
        <div class="sub">Cadastradas na empresa</div>
      </div>
      <div class="card">
        <h3>Talhões</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">Área total: ${num(talhoes.reduce((a,b)=>a+Number(b.areaHa||0),0),1)} ha</div>
      </div>
      <div class="card">
        <h3>Aplicações (hoje)</h3>
        <div class="big">${aplicacoesHoje}</div>
        <div class="sub">Operações registradas</div>
      </div>
      <div class="card">
        <h3>Combustível (hoje)</h3>
        <div class="big">${brl(dieselHoje)}</div>
        <div class="sub">Custo diário</div>
      </div>
    </div>

    <div class="card">
      <h3>Resumo rápido</h3>
      <div class="sub">
        • Chuva (hoje): <b>${num(chuvaHoje,1)} mm</b><br/>
        • Saldo Diesel (safra): <b>${num(saldoDiesel(db),1)} L</b><br/>
        • Use Aplicações + Estoque para rastreabilidade e controle.
      </div>
      <div style="margin-top:10px">
        <span class="pill info">Offline-first</span>
        <span class="pill ok">Multiempresa</span>
        <span class="pill warn">Safras</span>
      </div>
    </div>
  `;
}

// ---------- Operations Center (base) ----------
function pageOpsCenter(){
  setTop("Operations Center", "Operação diária, alertas e visão executiva");
  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const db = getDB();
  const apps = onlySafra(onlyEmpresa(db.aplicacoes)).slice().sort(byDateDesc).slice(0,8);
  const chuvas = onlySafra(onlyEmpresa(db.chuvas)).slice().sort(byDateDesc).slice(0,8);
  const diesel = onlySafra(onlyEmpresa(db.combustivel)).slice().sort(byDateDesc).slice(0,8);

  const talhoes = onlyEmpresa(db.talhoes);
  const fazendas = onlyEmpresa(db.fazendas);
  const produtos = onlyEmpresa(db.produtos);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Alertas</h3>
        <div class="big">${apps.length ? 1 : 0}</div>
        <div class="sub">Base pronta para regras (vento/umidade/chuva)</div>
      </div>
      <div class="card">
        <h3>Atividades recentes</h3>
        <div class="big">${apps.length + chuvas.length + diesel.length}</div>
        <div class="sub">Aplicações • Chuva • Abastecimentos</div>
      </div>
      <div class="card">
        <h3>Talhões</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">${fazendas.length} fazendas</div>
      </div>
      <div class="card">
        <h3>Produtos</h3>
        <div class="big">${produtos.length}</div>
        <div class="sub">Insumos cadastrados</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Painel (nível Ops Center)</h3>
        <div class="help">
          Aqui entra mapa, telemetria, cronograma de operações e alertas.
          Próximo passo: integrar GPS/Excel/Supabase.
        </div>
        <div class="hr"></div>
        <div class="pill info">Mapa (placeholder)</div>
        <div style="height:12px"></div>
        <div style="border:1px dashed var(--line); border-radius:16px; height:240px; background:var(--panel2)"></div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Tipo</th><th>Data</th><th>Detalhe</th></tr>
          </thead>
          <tbody>
            ${apps.map(a=>`<tr><td>Aplicação</td><td>${a.data}</td><td>${esc(a.operacao||"-")} • ${esc(nomeTalhao(db,a.talhaoId))}</td></tr>`).join("")}
            ${chuvas.map(c=>`<tr><td>Chuva</td><td>${c.data}</td><td>${num(c.mm,1)} mm • ${esc(nomeTalhao(db,c.talhaoId))}</td></tr>`).join("")}
            ${diesel.map(d=>`<tr><td>Diesel</td><td>${d.data}</td><td>${num(d.litros,1)} L • ${brl(d.litros*d.precoLitro)}</td></tr>`).join("")}
            ${(!apps.length && !chuvas.length && !diesel.length) ? `<tr><td colspan="3">Sem registros.</td></tr>` : ""}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function nomeTalhao(db, id){
  return (db.talhoes||[]).find(t=>t.id===id)?.nome || "-";
}
function nomeFazenda(db, id){
  return (db.fazendas||[]).find(f=>f.id===id)?.nome || "-";
}
function nomeProduto(db, id){
  return (db.produtos||[]).find(p=>p.id===id)?.nome || "-";
}

// ---------- Safras ----------
function pageSafras(){
  setTop("Safras", "Separação de custos, chuva, estoque e resultados por safra");
  const db = getDB();
  const list = onlyEmpresa(db.safras);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova safra</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Nome</small>
            <input class="input" name="nome" placeholder="Safra 2025/26 • Soja" required>
          </div>
          <div>
            <small>Início</small>
            <input class="input" name="inicio" type="date" value="${nowISO()}" required>
          </div>
          <div>
            <small>Fim (opcional)</small>
            <input class="input" name="fim" type="date">
          </div>
          <div class="full">
            <label class="row" style="gap:8px">
              <input type="checkbox" name="ativa" checked />
              <small>Marcar como safra ativa</small>
            </label>
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
        <div class="help">A safra ativa filtra financeiro, estoque, aplicações, combustível e chuva.</div>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th>Início</th><th>Fim</th><th>Ativa</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.safras);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(s=>`
      <tr>
        <td><b>${esc(s.nome)}</b></td>
        <td>${esc(s.inicio||"-")}</td>
        <td>${esc(s.fim||"-")}</td>
        <td>${s.ativa ? `<span class="pill ok">Ativa</span>` : `<span class="pill">-</span>`}</td>
        <td class="noPrint">
          <button class="btn" onclick="window.__ativarSafra('${s.id}')">Ativar</button>
          <button class="btn danger" onclick="window.__delSafra('${s.id}')">Excluir</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem safras.</td></tr>`;
  }

  window.__ativarSafra = (id)=>{
    const db2 = getDB();
    const empId = getEmpresaId();
    db2.safras.forEach(s=>{
      if (s.empresaId===empId) s.ativa = (s.id===id);
    });
    setDB(db2);
    setSafraId(id);
    toast("Safra ativa", "Atualizada.");
    location.reload();
  };

  window.__delSafra = (id)=>{
    if (!confirm("Excluir safra? (não apaga dados, mas você perde o filtro)")) return;
    const db2 = getDB();
    db2.safras = db2.safras.filter(s=>s.id!==id);
    setDB(db2);
    toast("Safra removida", "Ok.");
    location.reload();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const empId = getEmpresaId();
    const id = uid("saf");
    const ativa = !!fd.get("ativa");
    const db2 = getDB();
    if (ativa) db2.safras.forEach(s=>{ if (s.empresaId===empId) s.ativa=false; });
    db2.safras.push({
      id, empresaId: empId,
      nome: String(fd.get("nome")||"").trim(),
      inicio: String(fd.get("inicio")||nowISO()),
      fim: String(fd.get("fim")||""),
      ativa
    });
    setDB(db2);
    if (ativa){ setSafraId(id); }
    toast("Safra salva", "Ok.");
    location.reload();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    const rows = onlyEmpresa(getDB().safras);
    downloadText(`safras-${nowISO()}.csv`, toCSV(rows));
  });

  render();
}

// ---------- Empresas ----------
function pageEmpresas(){
  setTop("Empresas", "Cadastre e gerencie empresas (multiempresa)");
  const db = getDB();
  const list = db.empresas || [];

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova empresa</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Nome</small>
            <input class="input" name="nome" placeholder="Ex.: Fazenda X LTDA" required>
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th>Criada</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = db2.empresas || [];
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(e=>`
      <tr>
        <td><b>${esc(e.nome)}</b></td>
        <td>${e.createdAt ? new Date(e.createdAt).toLocaleString("pt-BR") : "-"}</td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delEmp('${e.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="3">Sem empresas.</td></tr>`;
  }

  window.__delEmp = (id)=>{
    if (!confirm("Excluir empresa? Isso não apaga tudo automaticamente, mas remove do cadastro.")) return;
    const db2 = getDB();
    db2.empresas = db2.empresas.filter(x=>x.id!==id);
    // limpa também safras associadas
    db2.safras = (db2.safras||[]).filter(s=>s.empresaId!==id);
    setDB(db2);
    toast("Empresa removida", "Ok.");
    location.reload();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const nome = String(fd.get("nome")||"").trim();
    if (!nome) return;

    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome, createdAt: Date.now() });
    // safra padrão
    const safId = uid("saf");
    db2.safras.push({ id: safId, empresaId: id, nome:"Safra Atual • Soja", inicio: nowISO(), fim:"", ativa:true });
    setDB(db2);

    toast("Empresa criada", "Selecione ela no menu.");
    e.target.reset();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`empresas-${nowISO()}.csv`, toCSV(getDB().empresas||[]));
  });

  render();
}

// ---------- Fazendas ----------
function pageFazendas(){
  setTop("Fazendas", "Cadastre fazendas por empresa");
  const db = getDB();
  const list = onlyEmpresa(db.fazendas);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova fazenda</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Nome</small>
            <input class="input" name="nome" placeholder="Ex.: Fazenda Primavera" required>
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.fazendas);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(f=>`
      <tr>
        <td><b>${esc(f.nome)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delFaz('${f.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="2">Sem fazendas.</td></tr>`;
  }

  window.__delFaz = (id)=>{
    if (!confirm("Excluir fazenda?")) return;
    const db2 = getDB();
    db2.fazendas = db2.fazendas.filter(x=>x.id!==id);
    // Talhões ficam órfãos, mas tudo bem. (Você pode apagar manualmente depois)
    setDB(db2);
    toast("Fazenda removida", "Ok.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const nome = String(new FormData(e.target).get("nome")||"").trim();
    if (!nome) return;
    const db2 = getDB();
    db2.fazendas.push({ id: uid("faz"), empresaId: getEmpresaId(), nome });
    setDB(db2);
    toast("Fazenda salva", "Ok.");
    e.target.reset();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`fazendas-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().fazendas)));
  });

  render();
}

// ---------- Talhões ----------
function pageTalhoes(){
  setTop("Talhões", "Cadastre talhões por fazenda");
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Novo talhão</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>
              ${fazendas.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join("")}
            </select>
          </div>
          <div>
            <small>Nome do talhão</small>
            <input class="input" name="nome" placeholder="Ex.: T-12" required>
          </div>
          <div>
            <small>Área (ha)</small>
            <input class="input" name="areaHa" type="number" step="0.1" placeholder="Ex.: 78.5" required>
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.talhoes);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(t=>`
      <tr>
        <td><b>${esc(t.nome)}</b></td>
        <td>${esc(nomeFazenda(db2, t.fazendaId))}</td>
        <td>${num(t.areaHa,1)}</td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delTal('${t.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="4">Sem talhões.</td></tr>`;
  }

  window.__delTal = (id)=>{
    if (!confirm("Excluir talhão?")) return;
    const db2 = getDB();
    db2.talhoes = db2.talhoes.filter(x=>x.id!==id);
    setDB(db2);
    toast("Talhão removido", "Ok.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const db2 = getDB();
    db2.talhoes.push({
      id: uid("tal"),
      empresaId: getEmpresaId(),
      fazendaId: fd.get("fazendaId"),
      nome: String(fd.get("nome")||"").trim(),
      areaHa: parseNum(fd.get("areaHa"))
    });
    setDB(db2);
    toast("Talhão salvo", "Ok.");
    e.target.reset();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().talhoes)));
  });

  render();
}

// ---------- Produtos ----------
function pageProdutos(){
  setTop("Produtos", "Cadastre insumos (unidade em L ou kg)");
  const db = getDB();

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Novo produto</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Nome</small>
            <input class="input" name="nome" placeholder="Ex.: Glifosato 480" required>
          </div>
          <div>
            <small>Unidade</small>
            <select class="select" name="unidade">
              <option value="L">L (litros)</option>
              <option value="kg">kg (quilos)</option>
            </select>
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
        <div class="help">O estoque e aplicações usam esta unidade.</div>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Produto</th><th>Unid.</th><th>Saldo (safra)</th><th>Custo médio</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.produtos);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(p=>{
      const s = saldoEstoque(db2, p.id);
      const cm = custoMedioProduto(db2, p.id);
      return `
        <tr>
          <td><b>${esc(p.nome)}</b></td>
          <td>${esc(p.unidade||"-")}</td>
          <td>${num(s,2)} ${esc(p.unidade||"")}</td>
          <td>${brl(cm)} / ${esc(p.unidade||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delPrd('${p.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="5">Sem produtos.</td></tr>`;
  }

  window.__delPrd = (id)=>{
    if (!confirm("Excluir produto?")) return;
    const db2 = getDB();
    db2.produtos = db2.produtos.filter(x=>x.id!==id);
    setDB(db2);
    toast("Produto removido", "Ok.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const nome = String(fd.get("nome")||"").trim();
    if (!nome) return;
    const db2 = getDB();
    db2.produtos.push({ id: uid("prd"), empresaId: getEmpresaId(), nome, unidade: fd.get("unidade") });
    setDB(db2);
    toast("Produto salvo", "Ok.");
    e.target.reset();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`produtos-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().produtos)));
  });

  render();
}

// ---------- Estoque ----------
function pageEstoque(){
  setTop("Estoque", "Entradas e saídas por safra (saldo pode ficar negativo)");
  const db = getDB();
  const produtos = onlyEmpresa(db.produtos);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Movimento de estoque</h3>
        <form id="frm" class="formGrid">
          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${nowISO()}" required>
          </div>
          <div>
            <small>Tipo</small>
            <select class="select" name="tipo">
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
            </select>
          </div>

          <div class="full">
            <small>Produto</small>
            <select class="select" name="produtoId" required>
              ${produtos.map(p=>`<option value="${p.id}">${esc(p.nome)} (${esc(p.unidade)})</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Quantidade</small>
            <input class="input" name="qtd" type="number" step="0.01" required>
          </div>

          <div>
            <small>Valor total (R$) <span style="color:var(--muted)">(somente para Entrada)</span></small>
            <input class="input" name="valorTotal" type="number" step="0.01" value="0">
          </div>

          <div class="full">
            <small>Observação</small>
            <input class="input" name="obs" placeholder="NF, lote, fornecedor...">
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Valor</th><th class="noPrint">Ações</th></tr>
          </thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlySafra(onlyEmpresa(db2.estoqueMov)).slice().sort(byDateDesc);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(m=>{
      const p = (db2.produtos||[]).find(x=>x.id===m.produtoId);
      return `
        <tr>
          <td>${esc(m.data)}</td>
          <td>${m.tipo==="IN" ? `<span class="pill ok">Entrada</span>` : `<span class="pill warn">Saída</span>`}</td>
          <td>${esc(p?.nome||"-")}</td>
          <td>${num(m.qtd,2)} ${esc(p?.unidade||"")}</td>
          <td>${m.tipo==="IN" ? brl(m.valorTotal) : `<span class="pill">—</span>`}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delMov('${m.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6">Sem movimentos.</td></tr>`;
  }

  window.__delMov = (id)=>{
    if (!confirm("Excluir movimento?")) return;
    const db2 = getDB();
    db2.estoqueMov = db2.estoqueMov.filter(x=>x.id!==id);
    setDB(db2);
    toast("Movimento removido", "Ok.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const tipo = String(fd.get("tipo"));
    const obj = {
      id: uid("mov"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      tipo,
      produtoId: fd.get("produtoId"),
      qtd: parseNum(fd.get("qtd")),
      valorTotal: tipo==="IN" ? parseNum(fd.get("valorTotal")) : 0,
      obs: String(fd.get("obs")||"")
    };
    const db2 = getDB();
    db2.estoqueMov.push(obj);
    setDB(db2);
    toast("Estoque salvo", "Ok.");
    e.target.reset();
    e.target.querySelector('[name="data"]').value = nowISO();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`estoque-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(getDB().estoqueMov))));
  });

  render();
}

// ---------- Aplicações (10 linhas + baixa estoque) ----------
function pageAplicacoes(){
  setTop("Aplicações", "Registro operacional com baixa automática de insumos no estoque");
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const produtos = onlyEmpresa(db.produtos);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);

  const content = document.getElementById("content");

  const productLines = Array.from({length:10}).map((_,i)=>{
    return `
      <div class="row" style="gap:10px; align-items:flex-end">
        <div style="flex:2">
          <small>Produto ${i+1}</small>
          <select class="select" name="p_${i}">
            <option value="">(opcional)</option>
            ${produtos.map(p=>`<option value="${p.id}">${esc(p.nome)} (${esc(p.unidade)})</option>`).join("")}
          </select>
        </div>
        <div style="flex:1">
          <small>Dose/ha</small>
          <input class="input" name="dose_${i}" type="number" step="0.01" placeholder="0">
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova aplicação</h3>
        <form id="frm" class="formGrid">

          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${nowISO()}" required>
          </div>

          <div>
            <small>Operação</small>
            <input class="input" name="operacao" placeholder="Ex.: Pulverização terrestre" required>
          </div>

          <div class="full">
            <small>Talhão</small>
            <select class="select" name="talhaoId" required>
              ${talhoes.map(t=>`<option value="${t.id}">${esc(nomeFazenda(db,t.fazendaId))} • ${esc(t.nome)} (${num(t.areaHa,1)} ha)</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Área aplicada (ha)</small>
            <input class="input" name="areaHa" type="number" step="0.1" placeholder="Ex.: 10" required>
          </div>

          <div>
            <small>Máquina (opcional)</small>
            <select class="select" name="maquinaId">
              <option value="">(opcional)</option>
              ${maquinas.map(m=>`<option value="${m.id}">${esc(m.nome||m.placa||m.id)}</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Operador (opcional)</small>
            <select class="select" name="operadorId">
              <option value="">(opcional)</option>
              ${equipe.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Calda (L/ha)</small>
            <input class="input" name="calda" type="number" step="0.1" value="120">
          </div>

          <div class="full">
            <h3 style="margin-top:10px">Produtos (até 10 linhas)</h3>
            <div class="help">Preencha produto e dose/ha. O sistema fará baixa automática no estoque (L ou kg).</div>
            <div class="hr"></div>
            <div style="display:flex; flex-direction:column; gap:10px">
              ${productLines}
            </div>
          </div>

          <div class="full">
            <small>Observações</small>
            <textarea class="textarea" name="obs" placeholder="Deriva, falhas, reentrada, carência, ocorrências..."></textarea>
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar aplicação</button>
          </div>
        </form>

        <div class="help">
          A baixa no estoque é estimada: <b>Quantidade = dose/ha × área aplicada</b>.
          O saldo pode ficar negativo (para visualizar furo de estoque).
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Talhão</th><th>Área (ha)</th><th>Operação</th><th>Insumos</th><th class="noPrint">Ações</th></tr>
          </thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlySafra(onlyEmpresa(db2.aplicacoes)).slice().sort(byDateDesc);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(a=>{
      const items = (a.itens||[]).filter(x=>x.produtoId).map(x=>{
        const pr = (db2.produtos||[]).find(p=>p.id===x.produtoId);
        const qtd = Number(x.qtdTotal||0);
        return `${esc(pr?.nome||"-")} (${num(qtd,2)} ${esc(pr?.unidade||"")})`;
      }).join("; ");
      return `
        <tr>
          <td>${esc(a.data)}</td>
          <td>${esc(nomeFazenda(db2,a.fazendaId))} • <b>${esc(nomeTalhao(db2,a.talhaoId))}</b></td>
          <td>${num(a.areaHa,1)}</td>
          <td>${esc(a.operacao||"-")}</td>
          <td>${esc(items||"-")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delApp('${a.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6">Sem aplicações.</td></tr>`;
  }

  window.__delApp = (id)=>{
    if (!confirm("Excluir aplicação? (não reverte estoque automaticamente)")) return;
    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes.filter(x=>x.id!==id);
    setDB(db2);
    toast("Aplicação removida", "Ok.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const talhaoId = String(fd.get("talhaoId"));
    const db2 = getDB();
    const tal = (db2.talhoes||[]).find(t=>t.id===talhaoId);
    const areaHa = parseNum(fd.get("areaHa"));

    const itens = [];
    for (let i=0;i<10;i++){
      const produtoId = String(fd.get(`p_${i}`)||"");
      const dose = parseNum(fd.get(`dose_${i}`));
      if (!produtoId || dose<=0) continue;
      const qtdTotal = dose * areaHa;
      itens.push({ produtoId, doseHa: dose, qtdTotal });
    }

    const app = {
      id: uid("app"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      fazendaId: tal?.fazendaId || "",
      talhaoId,
      areaHa,
      operacao: String(fd.get("operacao")||""),
      maquinaId: String(fd.get("maquinaId")||"") || null,
      operadorId: String(fd.get("operadorId")||"") || null,
      caldaLha: parseNum(fd.get("calda")),
      obs: String(fd.get("obs")||""),
      itens
    };

    // baixa automática no estoque (OUT)
    itens.forEach(it=>{
      db2.estoqueMov.push({
        id: uid("mov"),
        empresaId: getEmpresaId(),
        safraId: getSafraId(),
        data: app.data,
        tipo: "OUT",
        produtoId: it.produtoId,
        qtd: it.qtdTotal,
        valorTotal: 0,
        obs: `Baixa automática • Aplicação ${app.operacao} • ${nomeTalhao(db2, talhaoId)}`
      });
    });

    db2.aplicacoes.push(app);
    setDB(db2);
    toast("Aplicação salva", "Estoque baixado automaticamente.");
    e.target.reset();
    e.target.querySelector('[name="data"]').value = nowISO();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`aplicacoes-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(db2.aplicacoes))));
  });

  render();
}

// ---------- Combustível + Estoque Diesel ----------
function pageCombustivel(){
  setTop("Combustível", "Controle de compras e abastecimentos (com estoque de Diesel)");
  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const maquinas = onlyEmpresa(db.maquinas);
  const equipe = onlyEmpresa(db.equipe);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Saldo Diesel (safra)</h3>
        <div class="big">${num(saldoDiesel(db),1)} L</div>
        <div class="sub">Saldo pode ficar negativo</div>
      </div>
      <div class="card">
        <h3>Custo médio Diesel</h3>
        <div class="big">${brl(custoMedioDiesel(db))}</div>
        <div class="sub">Estimado por compras</div>
      </div>
      <div class="card">
        <h3>Abastecimentos (safra)</h3>
        <div class="big">${onlySafra(onlyEmpresa(db.combustivel)).length}</div>
        <div class="sub">Registros</div>
      </div>
      <div class="card">
        <h3>Gasto (safra)</h3>
        <div class="big">${brl(onlySafra(onlyEmpresa(db.combustivel)).reduce((a,b)=>a + (Number(b.litros||0)*Number(b.precoLitro||0)), 0))}</div>
        <div class="sub">Total</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Compra de Diesel (Entrada no estoque)</h3>
        <form id="frmCompra" class="formGrid">
          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${nowISO()}" required>
          </div>
          <div>
            <small>Litros</small>
            <input class="input" name="litros" type="number" step="0.1" required>
          </div>
          <div>
            <small>Preço/L (R$)</small>
            <input class="input" name="preco" type="number" step="0.01" required>
          </div>
          <div class="full">
            <small>Fornecedor/Obs</small>
            <input class="input" name="obs" placeholder="NF, fornecedor, tanque...">
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar compra</button>
          </div>
        </form>

        <div class="hr"></div>

        <h3>Abastecimento (Saída do estoque)</h3>
        <form id="frmAbast" class="formGrid">
          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${nowISO()}" required>
          </div>
          <div>
            <small>Tipo</small>
            <select class="select" name="tipo">
              <option>Diesel S10</option>
              <option>Diesel S500</option>
            </select>
          </div>
          <div class="full">
            <small>Talhão (opcional)</small>
            <select class="select" name="talhaoId">
              <option value="">(opcional)</option>
              ${talhoes.map(t=>`<option value="${t.id}">${esc(nomeFazenda(db,t.fazendaId))} • ${esc(t.nome)}</option>`).join("")}
            </select>
          </div>
          <div>
            <small>Máquina (opcional)</small>
            <select class="select" name="maquinaId">
              <option value="">(opcional)</option>
              ${maquinas.map(m=>`<option value="${m.id}">${esc(m.nome||m.placa||m.id)}</option>`).join("")}
            </select>
          </div>
          <div>
            <small>Operador (opcional)</small>
            <select class="select" name="operadorId">
              <option value="">(opcional)</option>
              ${equipe.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join("")}
            </select>
          </div>
          <div>
            <small>Litros</small>
            <input class="input" name="litros" type="number" step="0.1" required>
          </div>
          <div>
            <small>Preço/L (R$)</small>
            <input class="input" name="precoLitro" type="number" step="0.01" required>
          </div>
          <div>
            <small>KM ou Horímetro</small>
            <input class="input" name="kmOuHora" type="number" step="0.1" value="0">
          </div>
          <div class="full">
            <small>Obs</small>
            <input class="input" name="obs" placeholder="Posto / tanque / ocorrência...">
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar abastecimento</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Litros</th><th>Preço/L</th><th>Total</th><th>Talhão</th><th class="noPrint">Ações</th></tr>
          </thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlySafra(onlyEmpresa(db2.combustivel)).slice().sort(byDateDesc);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(r=>{
      const total = Number(r.litros||0) * Number(r.precoLitro||0);
      return `
        <tr>
          <td>${esc(r.data)}</td>
          <td>${esc(r.tipo||"Diesel")}</td>
          <td>${num(r.litros,1)} L</td>
          <td>${brl(r.precoLitro)}</td>
          <td><b>${brl(total)}</b></td>
          <td>${r.talhaoId ? esc(nomeTalhao(db2, r.talhaoId)) : "-"}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delCmb('${r.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">Sem abastecimentos.</td></tr>`;
  }

  window.__delCmb = (id)=>{
    if (!confirm("Excluir abastecimento? (não reverte diesel automaticamente)")) return;
    const db2 = getDB();
    db2.combustivel = db2.combustivel.filter(x=>x.id!==id);
    setDB(db2);
    toast("Removido", "Ok.");
    render();
  };

  // Compra (IN)
  document.getElementById("frmCompra").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const litros = parseNum(fd.get("litros"));
    const preco = parseNum(fd.get("preco"));
    const db2 = getDB();
    db2.dieselMov.push({
      id: uid("dsl"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      tipo: "IN",
      litros,
      valorTotal: litros * preco,
      obs: String(fd.get("obs")||"Compra Diesel")
    });
    setDB(db2);
    toast("Compra salva", "Diesel entrou no estoque.");
    location.reload();
  });

  // Abastecimento (OUT + registro)
  document.getElementById("frmAbast").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const litros = parseNum(fd.get("litros"));
    const precoLitro = parseNum(fd.get("precoLitro"));

    const db2 = getDB();
    const rec = {
      id: uid("cmb"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      tipo: String(fd.get("tipo")||"Diesel S10"),
      talhaoId: String(fd.get("talhaoId")||"") || null,
      maquinaId: String(fd.get("maquinaId")||"") || null,
      operadorId: String(fd.get("operadorId")||"") || null,
      litros,
      precoLitro,
      kmOuHora: parseNum(fd.get("kmOuHora")),
      obs: String(fd.get("obs")||"")
    };
    db2.combustivel.push(rec);

    // baixa do estoque diesel
    db2.dieselMov.push({
      id: uid("dsl"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: rec.data,
      tipo: "OUT",
      litros: rec.litros,
      valorTotal: 0,
      obs: `Abastecimento • ${rec.tipo}`
    });

    setDB(db2);
    toast("Abastecimento salvo", "Diesel baixado do estoque.");
    e.target.reset();
    e.target.querySelector('[name="data"]').value = nowISO();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(getDB().combustivel))));
  });

  render();
}

// ---------- Clima/Chuva (acumulativo por talhão) ----------
function pageClima(){
  setTop("Clima/Chuva", "Registre chuva por talhão e acompanhe acumulados");
  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);

  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);

  const content = document.getElementById("content");

  const chuvas = onlySafra(onlyEmpresa(db.chuvas));
  const hoje = nowISO();

  const mmHoje = chuvas.filter(c=>c.data===hoje).reduce((a,b)=>a+Number(b.mm||0),0);
  const mm7 = sumPeriodo(chuvas, 7);
  const mm30 = sumPeriodo(chuvas, 30);

  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big">${num(mmHoje,1)} mm</div>
        <div class="sub">Somatório geral</div>
      </div>
      <div class="card">
        <h3>Últimos 7 dias</h3>
        <div class="big">${num(mm7,1)} mm</div>
        <div class="sub">Somatório geral</div>
      </div>
      <div class="card">
        <h3>Últimos 30 dias</h3>
        <div class="big">${num(mm30,1)} mm</div>
        <div class="sub">Somatório geral</div>
      </div>
      <div class="card">
        <h3>Registros (safra)</h3>
        <div class="big">${chuvas.length}</div>
        <div class="sub">Lançamentos</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Novo registro de chuva</h3>
        <form id="frm" class="formGrid">
          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${hoje}" required>
          </div>
          <div>
            <small>Chuva (mm)</small>
            <input class="input" name="mm" type="number" step="0.1" required>
          </div>
          <div class="full">
            <small>Talhão</small>
            <select class="select" name="talhaoId" required>
              ${talhoes.map(t=>`<option value="${t.id}">${esc(nomeFazenda(db,t.fazendaId))} • ${esc(t.nome)}</option>`).join("")}
            </select>
          </div>
          <div class="full">
            <small>Obs (opcional)</small>
            <input class="input" name="obs" placeholder="Pluviômetro, estação, ocorrência...">
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>

        <div class="help">
          O talhão acumula automaticamente: o sistema soma todos os lançamentos daquele talhão na safra.
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Talhão</th><th>Acumulado (mm)</th><th>Registros</th></tr>
          </thead>
          <tbody id="tbSum"></tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr><th>Data</th><th>Talhão</th><th>mm</th><th>Obs</th><th class="noPrint">Ações</th></tr>
        </thead>
        <tbody id="tb"></tbody>
      </table>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlySafra(onlyEmpresa(db2.chuvas)).slice().sort(byDateDesc);

    // acumulado por talhão
    const map = new Map();
    rows.forEach(r=>{
      const key = r.talhaoId;
      const prev = map.get(key) || { talhaoId:key, mm:0, n:0 };
      prev.mm += Number(r.mm||0);
      prev.n += 1;
      map.set(key, prev);
    });
    const sums = Array.from(map.values()).sort((a,b)=>b.mm-a.mm);

    document.getElementById("tbSum").innerHTML = sums.map(s=>`
      <tr>
        <td><b>${esc(nomeTalhao(db2,s.talhaoId))}</b></td>
        <td>${num(s.mm,1)} mm</td>
        <td>${s.n}</td>
      </tr>
    `).join("") || `<tr><td colspan="3">Sem dados.</td></tr>`;

    document.getElementById("tb").innerHTML = rows.map(r=>`
      <tr>
        <td>${esc(r.data)}</td>
        <td>${esc(nomeTalhao(db2,r.talhaoId))}</td>
        <td><b>${num(r.mm,1)}</b></td>
        <td>${esc(r.obs||"")}</td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delChuva('${r.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem registros.</td></tr>`;
  }

  window.__delChuva = (id)=>{
    if (!confirm("Excluir registro de chuva?")) return;
    const db2 = getDB();
    db2.chuvas = db2.chuvas.filter(x=>x.id!==id);
    setDB(db2);
    toast("Chuva removida", "Ok.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const db2 = getDB();
    db2.chuvas.push({
      id: uid("chv"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      talhaoId: String(fd.get("talhaoId")),
      mm: parseNum(fd.get("mm")),
      obs: String(fd.get("obs")||"")
    });
    setDB(db2);
    toast("Chuva salva", "Acumulado atualizado.");
    e.target.reset();
    e.target.querySelector('[name="data"]').value = nowISO();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`chuvas-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(getDB().chuvas))));
  });

  render();
}

function sumPeriodo(rows, dias){
  const end = new Date(nowISO());
  const start = new Date(end);
  start.setDate(start.getDate() - (dias-1));
  return (rows||[]).filter(r=>{
    const d = new Date(r.data);
    return d>=start && d<=end;
  }).reduce((a,b)=>a+Number(b.mm||0),0);
}

// ---------- Financeiro (por safra + custo/ha) ----------
function pageFinanceiro(){
  setTop("Financeiro", "Custo/ha, despesas e resultado por safra");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);

  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const areaTotal = talhoes.reduce((a,b)=>a+Number(b.areaHa||0),0);

  // Lançamentos manuais
  const fin = onlySafra(onlyEmpresa(db.financeiro));
  const despesasManuais = fin.filter(x=>x.tipo==="Despesa").reduce((a,b)=>a+Number(b.valor||0),0);
  const receitasManuais = fin.filter(x=>x.tipo==="Receita").reduce((a,b)=>a+Number(b.valor||0),0);

  // Integração: combustível (despesa)
  const diesel = onlySafra(onlyEmpresa(db.combustivel));
  const despDiesel = diesel.reduce((a,b)=>a + (Number(b.litros||0)*Number(b.precoLitro||0)), 0);

  // Integração: aplicações -> insumos consumidos estimados pelo custo médio
  const movOut = onlySafra(onlyEmpresa(db.estoqueMov)).filter(m=>m.tipo==="OUT");
  const despInsumosEstimado = movOut.reduce((a,m)=>{
    const cm = custoMedioProduto(db, m.produtoId);
    return a + (Number(m.qtd||0) * cm);
  }, 0);

  const despesas = despesasManuais + despDiesel + despInsumosEstimado;
  const receitas = receitasManuais;
  const saldo = receitas - despesas;
  const custoHa = areaTotal>0 ? (despesas/areaTotal) : 0;

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Despesas (safra)</h3>
        <div class="big">${brl(despesas)}</div>
        <div class="sub">Inclui Diesel + Insumos estimados + Lançamentos</div>
      </div>
      <div class="card">
        <h3>Receitas (safra)</h3>
        <div class="big">${brl(receitas)}</div>
        <div class="sub">Lançamentos manuais</div>
      </div>
      <div class="card">
        <h3>Saldo (safra)</h3>
        <div class="big">${brl(saldo)}</div>
        <div class="sub">Resultado</div>
      </div>
      <div class="card">
        <h3>Custo por hectare</h3>
        <div class="big">${brl(custoHa)}</div>
        <div class="sub">${num(areaTotal,1)} ha cadastrados</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Novo lançamento</h3>
        <form id="frm" class="formGrid">
          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${nowISO()}" required>
          </div>
          <div>
            <small>Tipo</small>
            <select class="select" name="tipo">
              <option>Despesa</option>
              <option>Receita</option>
            </select>
          </div>
          <div class="full">
            <small>Categoria</small>
            <select class="select" name="categoria">
              <option>Insumos</option>
              <option>Combustível</option>
              <option>Mão de obra</option>
              <option>Manutenção</option>
              <option>Serviços</option>
              <option>Arrendamento</option>
              <option>Outros</option>
            </select>
          </div>
          <div class="full">
            <small>Descrição</small>
            <input class="input" name="descricao" placeholder="Ex.: Serviço terceirizado / Nota / Frete">
          </div>
          <div>
            <small>Valor (R$)</small>
            <input class="input" name="valor" type="number" step="0.01" required>
          </div>
          <div>
            <small>Forma</small>
            <input class="input" name="forma" placeholder="Pix / Boleto / Cartão">
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>

        <div class="hr"></div>

        <div class="help">
          <b>Integrações automáticas:</b><br>
          • Diesel: soma dos abastecimentos (Combustível).<br>
          • Insumos: consumo do estoque nas aplicações × custo médio das entradas (estimado).
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <h3>Detalhamento (estimativas)</h3>
      <div class="sub">
        • Diesel: <b>${brl(despDiesel)}</b><br/>
        • Insumos (estimado): <b>${brl(despInsumosEstimado)}</b><br/>
        • Lançamentos manuais: <b>${brl(despesasManuais)}</b>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlySafra(onlyEmpresa(db2.financeiro)).slice().sort(byDateDesc);
    const tb = document.getElementById("tb");
    tb.innerHTML = rows.map(r=>`
      <tr>
        <td>${esc(r.data)}</td>
        <td>${r.tipo==="Receita" ? `<span class="pill ok">Receita</span>` : `<span class="pill warn">Despesa</span>`}</td>
        <td>${esc(r.categoria||"-")}</td>
        <td>${esc(r.descricao||"")}</td>
        <td><b>${brl(r.valor)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delFin('${r.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="6">Sem lançamentos.</td></tr>`;
  }

  window.__delFin = (id)=>{
    if (!confirm("Excluir lançamento?")) return;
    const db2 = getDB();
    db2.financeiro = db2.financeiro.filter(x=>x.id!==id);
    setDB(db2);
    toast("Lançamento removido", "Ok.");
    location.reload();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("fin"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      tipo: String(fd.get("tipo")||"Despesa"),
      categoria: String(fd.get("categoria")||"Outros"),
      descricao: String(fd.get("descricao")||""),
      valor: parseNum(fd.get("valor")),
      forma: String(fd.get("forma")||"")
    };
    const db2 = getDB();
    db2.financeiro.push(obj);
    setDB(db2);
    toast("Lançamento salvo", "Ok.");
    location.reload();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`financeiro-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(getDB().financeiro))));
  });

  render();
}

// ---------- Equipe ----------
function pageEquipe(){
  setTop("Equipe", "Cadastre funcionários e operadores");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Novo membro</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Nome</small>
            <input class="input" name="nome" required>
          </div>
          <div class="full">
            <small>Função</small>
            <input class="input" name="funcao" placeholder="Ex.: Operador / Agrônomo">
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th>Função</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.equipe);
    document.getElementById("tb").innerHTML = rows.map(p=>`
      <tr>
        <td><b>${esc(p.nome)}</b></td>
        <td>${esc(p.funcao||"-")}</td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delEq('${p.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="3">Sem equipe.</td></tr>`;
  }

  window.__delEq = (id)=>{
    if (!confirm("Excluir membro?")) return;
    const db2 = getDB();
    db2.equipe = db2.equipe.filter(x=>x.id!==id);
    setDB(db2);
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const db2 = getDB();
    db2.equipe.push({ id: uid("eqp"), empresaId: getEmpresaId(), nome: String(fd.get("nome")||""), funcao: String(fd.get("funcao")||"") });
    setDB(db2);
    toast("Equipe salva", "Ok.");
    e.target.reset();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`equipe-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().equipe)));
  });

  render();
}

// ---------- Máquinas ----------
function pageMaquinas(){
  setTop("Máquinas", "Cadastro de tratores, pulverizadores e implementos");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova máquina</h3>
        <form id="frm" class="formGrid">
          <div class="full">
            <small>Nome</small>
            <input class="input" name="nome" placeholder="Ex.: JD 6130M" required>
          </div>
          <div class="full">
            <small>Identificação (placa/serie)</small>
            <input class="input" name="ident" placeholder="Opcional">
          </div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Máquina</th><th>ID</th><th class="noPrint">Ações</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.maquinas);
    document.getElementById("tb").innerHTML = rows.map(m=>`
      <tr>
        <td><b>${esc(m.nome)}</b></td>
        <td>${esc(m.ident||"-")}</td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delMaq('${m.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="3">Sem máquinas.</td></tr>`;
  }

  window.__delMaq = (id)=>{
    if (!confirm("Excluir máquina?")) return;
    const db2 = getDB();
    db2.maquinas = db2.maquinas.filter(x=>x.id!==id);
    setDB(db2);
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const db2 = getDB();
    db2.maquinas.push({ id: uid("maq"), empresaId: getEmpresaId(), nome: String(fd.get("nome")||""), ident: String(fd.get("ident")||"") });
    setDB(db2);
    toast("Máquina salva", "Ok.");
    e.target.reset();
    render();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`maquinas-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().maquinas)));
  });

  render();
}

// ---------- Relatórios ----------
function pageRelatorios(){
  setTop("Relatórios", "Exportações e impressão (PDF via navegador)");
  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const areaTotal = talhoes.reduce((a,b)=>a+Number(b.areaHa||0),0);
  const apps = onlySafra(onlyEmpresa(db.aplicacoes)).length;
  const chuvas = onlySafra(onlyEmpresa(db.chuvas)).length;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <h3>Resumo (safra)</h3>
      <div class="sub">
        • Talhões: <b>${talhoes.length}</b><br/>
        • Área total: <b>${num(areaTotal,1)} ha</b><br/>
        • Aplicações: <b>${apps}</b><br/>
        • Chuvas: <b>${chuvas}</b><br/>
      </div>
      <div class="hr"></div>
      <div class="help">
        Para salvar PDF: clique em <b>Imprimir</b> e selecione “Salvar como PDF”.
      </div>
    </div>
  `;
}

// ---------- Config ----------
function pageConfig(){
  setTop("Configurações", "Ajustes, manutenção e utilidades");
  setTopActions(`<button class="btn" id="btnExport">Exportar DB</button>`);

  document.getElementById("content").innerHTML = `
    <div class="card">
      <h3>Manutenção</h3>
      <div class="help">
        • Exportar DB salva um JSON completo dos dados locais.<br>
        • Para migrar para Supabase no futuro: exporte, suba e importe.
      </div>
      <div class="hr"></div>
      <div class="row">
        <button class="btn danger" id="btnClear">Limpar tudo (reset)</button>
      </div>
    </div>
  `;

  document.getElementById("btnExport").addEventListener("click", ()=>{
    downloadText(`agropro-db-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Exportado", "DB em JSON baixado.");
  });

  document.getElementById("btnClear").addEventListener("click", ()=>{
    if (!confirm("Apagar todos os dados locais?")) return;
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_ACTIVE_EMP);
    localStorage.removeItem(LS_ACTIVE_SAFRA);
    location.reload();
  });
}
