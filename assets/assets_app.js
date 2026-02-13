/* ============================================================
   AGRO PRO — assets/app.js (OFFLINE / MULTIEMPRESA / SAFRAS)
   UPDATE: MÓDULO PLANTIO (SACOS/HA) + BAIXA NO ESTOQUE
   - Plantio por talhão e por safra
   - Área plantada parcial (ha)
   - Consumo automático: taxa (sacos/ha) × área (ha)
   - Estoque permite saldo negativo (furo de estoque)
   ============================================================ */

const LS_KEY = "agropro_db_v5";
const LS_ACTIVE_EMP = "agropro_active_empresa_v3";
const LS_ACTIVE_SAFRA = "agropro_active_safra_v3";

const PAGES = [
  { href:"index.html",      label:"Dashboard",     key:"dashboard",  icon:"📊" },
  { href:"plantio.html",    label:"Plantio",       key:"plantio",    icon:"🌱" },
  { href:"empresas.html",   label:"Empresas",      key:"empresas",   icon:"🏢" },
  { href:"safras.html",     label:"Safras",        key:"safras",     icon:"🗓️" },
  { href:"fazendas.html",   label:"Fazendas",      key:"fazendas",   icon:"🌾" },
  { href:"talhoes.html",    label:"Talhões",       key:"talhoes",    icon:"🧭" },
  { href:"produtos.html",   label:"Produtos",      key:"produtos",   icon:"🧪" },
  { href:"estoque.html",    label:"Estoque",       key:"estoque",    icon:"📦" },
  { href:"config.html",     label:"Configurações", key:"config",     icon:"⚙️" },
];

// ----------------- Formatação BR -----------------
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
  // aceita "1.234,56" e "1234.56"
  const norm = s.replace(/\./g,"").replace(",",".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

// ----------------- Utils -----------------
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

// ----------------- DB -----------------
function getDB(){
  const raw = localStorage.getItem(LS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  const db = seedDB();
  setDB(db);
  return db;
}
function setDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function seedDB(){
  const empId = uid("emp");
  const safId = uid("saf");
  const fazId = uid("faz");
  const tal1 = uid("tal");
  const tal2 = uid("tal");

  const semente = uid("prd");
  const adubo = uid("prd");

  return {
    version: 5,
    empresas: [{ id: empId, nome:"Agro Demo LTDA", createdAt: Date.now() }],
    safras: [{ id: safId, empresaId: empId, nome:"Safra Atual • Soja", inicio: nowISO(), fim:"", ativa:true }],
    fazendas: [{ id: fazId, empresaId: empId, nome:"Fazenda Horizonte" }],
    talhoes: [
      { id: tal1, empresaId: empId, fazendaId: fazId, nome:"T-12", areaHa: 78.5 },
      { id: tal2, empresaId: empId, fazendaId: fazId, nome:"T-20", areaHa: 42.0 },
    ],
    produtos: [
      { id: semente, empresaId: empId, nome:"Semente Soja (50kg)", unidade:"saco", categoria:"Semente" },
      { id: adubo,   empresaId: empId, nome:"Adubo 02-20-20", unidade:"saco", categoria:"Fertilizante" },
    ],
    estoqueMov: [],
    plantios: [],
  };
}

// ----------------- Filtros ativos -----------------
function getEmpresaId(){
  const id = localStorage.getItem(LS_ACTIVE_EMP);
  const db = getDB();
  if (id && (db.empresas||[]).some(e=>e.id===id)) return id;
  const first = db.empresas?.[0]?.id || "";
  if (first) localStorage.setItem(LS_ACTIVE_EMP, first);
  return first;
}
function setEmpresaId(id){ localStorage.setItem(LS_ACTIVE_EMP, id); }

function getSafraId(){
  const id = localStorage.getItem(LS_ACTIVE_SAFRA);
  const db = getDB();
  const empId = getEmpresaId();
  const list = (db.safras||[]).filter(s=>s.empresaId===empId);
  if (id && list.some(s=>s.id===id)) return id;
  const active = list.find(s=>s.ativa) || list[0];
  if (active) localStorage.setItem(LS_ACTIVE_SAFRA, active.id);
  return active?.id || "";
}
function setSafraId(id){ localStorage.setItem(LS_ACTIVE_SAFRA, id); }

function onlyEmpresa(arr){
  const empId = getEmpresaId();
  return (arr||[]).filter(x => x.empresaId === empId);
}
function onlySafra(arr){
  const safraId = getSafraId();
  return (arr||[]).filter(x => x.safraId === safraId);
}

// ----------------- Estoque -----------------
function saldoEstoque(db, produtoId){
  const movs = onlySafra(onlyEmpresa(db.estoqueMov)).filter(m => m.produtoId === produtoId);
  const ins  = movs.filter(m=>m.tipo==="IN").reduce((a,b)=>a+Number(b.qtd||0), 0);
  const outs = movs.filter(m=>m.tipo==="OUT").reduce((a,b)=>a+Number(b.qtd||0), 0);
  return ins - outs;
}
function nomeFazenda(db, id){ return (db.fazendas||[]).find(f=>f.id===id)?.nome || "-"; }
function nomeTalhao(db, id){ return (db.talhoes||[]).find(t=>t.id===id)?.nome || "-"; }
function nomeProduto(db, id){ return (db.produtos||[]).find(p=>p.id===id)?.nome || "-"; }

// ----------------- Shell UI -----------------
function pageKey(){ return document.body.getAttribute("data-page") || "dashboard"; }

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
            <p>Gestão agrícola • Offline</p>
          </div>
        </div>

        <div class="tenant">
          <div class="row">
            <span class="badge"><span class="dot"></span> <b>Offline</b></span>
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
            <button class="btn primary" id="btnNovaEmpresa">+ Nova</button>
            <button class="btn danger" id="btnReset">Reset</button>
          </div>

          <div style="margin-top:10px" class="help">
            Dados filtrados por empresa e safra.
          </div>
        </div>

        <nav class="nav">${nav}</nav>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="title">
            <h2 id="pageTitle">Agro Pro</h2>
            <p id="pageSub">Módulos agrícolas integrados</p>
          </div>
          <div class="actions" id="topActions"></div>
        </div>

        <div id="content"></div>
      </main>
    </div>

    <div class="toastHost"></div>
  `;

  document.getElementById("selEmpresa").addEventListener("change", (e)=>{
    setEmpresaId(e.target.value);
    setSafraId(getSafraId());
    location.reload();
  });

  document.getElementById("selSafra").addEventListener("change", (e)=>{
    setSafraId(e.target.value);
    location.reload();
  });

  document.getElementById("btnBackup").addEventListener("click", ()=>{
    downloadText(`agropro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if (!nome) return;
    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome: nome.trim(), createdAt: Date.now() });
    const safId2 = uid("saf");
    db2.safras.push({ id: safId2, empresaId: id, nome:"Safra Atual • Soja", inicio: nowISO(), fim:"", ativa:true });
    setDB(db2);
    setEmpresaId(id);
    setSafraId(safId2);
    location.reload();
  });

  document.getElementById("btnReset").addEventListener("click", ()=>{
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
function setTopActions(html){ document.getElementById("topActions").innerHTML = html || ""; }

// ----------------- Router -----------------
function boot(){
  buildShell();
  const key = pageKey();
  if (key==="dashboard") pageDashboard();
  else if (key==="plantio") pagePlantio();
  else if (key==="empresas") pageEmpresas();
  else if (key==="safras") pageSafras();
  else if (key==="fazendas") pageFazendas();
  else if (key==="talhoes") pageTalhoes();
  else if (key==="produtos") pageProdutos();
  else if (key==="estoque") pageEstoque();
  else if (key==="config") pageConfig();
  else pageDashboard();
}
document.addEventListener("DOMContentLoaded", boot);

// ============================================================
// PÁGINAS
// ============================================================

function pageDashboard(){
  setTop("Dashboard", "Resumo rápido do plantio e estoque");
  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const areaTotal = talhoes.reduce((a,b)=>a+Number(b.areaHa||0),0);

  const plantios = onlySafra(onlyEmpresa(db.plantios));
  const areaPlantada = plantios.reduce((a,b)=>a+Number(b.areaHa||0),0);
  const perc = areaTotal>0 ? (areaPlantada/areaTotal*100) : 0;

  const sementes = onlyEmpresa(db.produtos).filter(p => (p.categoria||"").toLowerCase().includes("semente") || (p.unidade||"")==="saco");
  const seedSaldo = sementes.slice(0,3).map(p=>({ nome:p.nome, saldo: saldoEstoque(db,p.id) }));

  document.getElementById("content").innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Área total (talhões)</h3>
        <div class="big">${num(areaTotal,1)} ha</div>
        <div class="sub">${talhoes.length} talhões</div>
      </div>
      <div class="card">
        <h3>Área plantada (safra)</h3>
        <div class="big">${num(areaPlantada,1)} ha</div>
        <div class="sub">${num(perc,1)}% do total</div>
      </div>
      <div class="card">
        <h3>Registros de plantio</h3>
        <div class="big">${plantios.length}</div>
        <div class="sub">Safra ativa</div>
      </div>
      <div class="card">
        <h3>Sementes (saldo)</h3>
        <div class="big">${seedSaldo.length?num(seedSaldo[0].saldo,1):"—"}</div>
        <div class="sub">${seedSaldo.length?esc(seedSaldo[0].nome):"Cadastre sementes em Produtos"}</div>
      </div>
    </div>

    <div class="card">
      <h3>Atalhos</h3>
      <div class="row">
        <a class="btn primary" href="plantio.html">+ Lançar plantio</a>
        <a class="btn" href="estoque.html">Abrir estoque</a>
        <a class="btn" href="talhoes.html">Gerenciar talhões</a>
      </div>
      <div class="hr"></div>
      <div class="help">
        Dica: em Plantio você lança área parcial e o sistema dá baixa automática em <b>sacos</b>.
      </div>
    </div>
  `;
}

/* ============================================================
   PLANTIO — COMPLETO (sacos/ha)
   ============================================================ */
function pagePlantio(){
  setTop("Plantio", "Sacos/ha • Área parcial • Baixa automática no estoque");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);

  const db = getDB();
  const talhoes = onlyEmpresa(db.talhoes);
  const sementes = onlyEmpresa(db.produtos).filter(p => (p.categoria||"").toLowerCase().includes("semente") || (p.unidade||"")==="saco");

  const rows = onlySafra(onlyEmpresa(db.plantios));
  const areaPlantada = rows.reduce((a,b)=>a+Number(b.areaHa||0),0);

  // consumo total (sacos)
  const sacosTotal = rows.reduce((a,b)=>a+Number(b.sacosTotal||0),0);

  document.getElementById("content").innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Área plantada (safra)</h3>
        <div class="big">${num(areaPlantada,1)} ha</div>
        <div class="sub">Somatório</div>
      </div>
      <div class="card">
        <h3>Sementes consumidas</h3>
        <div class="big">${num(sacosTotal,1)} sacos</div>
        <div class="sub">Taxa × área (safra)</div>
      </div>
      <div class="card">
        <h3>Registros</h3>
        <div class="big">${rows.length}</div>
        <div class="sub">Plantios lançados</div>
      </div>
      <div class="card">
        <h3>Saldo semente</h3>
        <div class="big">${sementes[0] ? num(saldoEstoque(db, sementes[0].id),1) : "—"}</div>
        <div class="sub">${sementes[0] ? esc(sementes[0].nome) : "Cadastre semente em Produtos"}</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Novo plantio</h3>
        <form id="frm" class="formGrid">
          <div>
            <small>Data</small>
            <input class="input" name="data" type="date" value="${nowISO()}" required>
          </div>
          <div>
            <small>Status</small>
            <select class="select" name="status">
              <option>Planejado</option>
              <option selected>Em andamento</option>
              <option>Concluído</option>
            </select>
          </div>

          <div class="full">
            <small>Talhão</small>
            <select class="select" name="talhaoId" required>
              ${talhoes.map(t=>`<option value="${t.id}">${esc(nomeFazenda(db,t.fazendaId))} • ${esc(t.nome)} (${num(t.areaHa,1)} ha)</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Área plantada (ha)</small>
            <input class="input" name="areaHa" type="number" step="0.1" placeholder="Ex.: 12,5" required>
          </div>

          <div>
            <small>Cultura</small>
            <input class="input" name="cultura" value="Soja" required>
          </div>

          <div class="full">
            <small>Semente</small>
            <select class="select" name="sementeId" required>
              ${sementes.length
                ? sementes.map(p=>`<option value="${p.id}">${esc(p.nome)} • saldo ${num(saldoEstoque(db,p.id),1)} sacos</option>`).join("")
                : `<option value="">Cadastre uma semente em Produtos</option>`
              }
            </select>
          </div>

          <div>
            <small>Taxa (sacos/ha)</small>
            <input class="input" name="taxaSacoHa" type="number" step="0.01" placeholder="Ex.: 1,20" required>
          </div>

          <div>
            <small>Consumo (auto)</small>
            <input class="input" name="sacosTotal" type="text" value="0" readonly>
          </div>

          <div class="full">
            <small>Variedade / Cultivar (opcional)</small>
            <input class="input" name="variedade" placeholder="Ex.: BMX Zeus / 64I64 etc">
          </div>

          <div>
            <small>Espaçamento (cm)</small>
            <input class="input" name="espacamentoCm" type="number" step="0.1" placeholder="Ex.: 45">
          </div>
          <div>
            <small>População (plantas/ha)</small>
            <input class="input" name="populacao" type="number" step="1" placeholder="Ex.: 280000">
          </div>

          <div class="full">
            <small>Máquina/Operador (opcional)</small>
            <input class="input" name="operador" placeholder="Ex.: Plantadeira 12 linhas • João">
          </div>

          <div class="full">
            <small>Observações</small>
            <input class="input" name="obs" placeholder="Condições, umidade do solo, replantio...">
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar plantio</button>
          </div>
        </form>

        <div class="help">
          ✔ Ao salvar, o sistema cria automaticamente um movimento de estoque <b>Saída</b> (sacos) para a semente selecionada.<br/>
          ✔ Pode ficar negativo para você enxergar furo de estoque.
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Talhão</th><th>Área</th><th>Sacos</th><th>Taxa</th><th>Status</th></tr>
          </thead>
          <tbody id="tbSum"></tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Talhão</th><th>Cultura</th><th>Semente</th>
            <th>Área (ha)</th><th>Taxa</th><th>Sacos</th><th>Status</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tb"></tbody>
      </table>
    </div>
  `;

  // auto-cálculo consumo
  const frm = document.getElementById("frm");
  const inArea = frm.querySelector('[name="areaHa"]');
  const inTaxa = frm.querySelector('[name="taxaSacoHa"]');
  const outSacos = frm.querySelector('[name="sacosTotal"]');

  function calc(){
    const area = parseNum(inArea.value);
    const taxa = parseNum(inTaxa.value);
    const sacos = area * taxa;
    outSacos.value = num(sacos, 2);
  }
  inArea.addEventListener("input", calc);
  inTaxa.addEventListener("input", calc);

  function render(){
    const db2 = getDB();
    const list = onlySafra(onlyEmpresa(db2.plantios)).slice().sort(byDateDesc);

    // Sumário por talhão (acumula área e sacos)
    const map = new Map();
    list.forEach(r=>{
      const k = r.talhaoId;
      const cur = map.get(k) || { talhaoId:k, area:0, sacos:0 };
      cur.area += Number(r.areaHa||0);
      cur.sacos += Number(r.sacosTotal||0);
      map.set(k, cur);
    });
    const sums = Array.from(map.values()).sort((a,b)=>b.area-a.area);

    document.getElementById("tbSum").innerHTML = sums.map(s=>{
      const taxa = s.area>0 ? (s.sacos/s.area) : 0;
      return `<tr>
        <td><b>${esc(nomeTalhao(db2,s.talhaoId))}</b></td>
        <td>${num(s.area,1)} ha</td>
        <td><b>${num(s.sacos,1)}</b> sacos</td>
        <td>${num(taxa,2)} sac/ha</td>
        <td><span class="pill info">Acumulado</span></td>
      </tr>`;
    }).join("") || `<tr><td colspan="5">Sem dados.</td></tr>`;

    document.getElementById("tb").innerHTML = list.map(r=>{
      return `<tr>
        <td>${esc(r.data)}</td>
        <td><b>${esc(nomeTalhao(db2,r.talhaoId))}</b></td>
        <td>${esc(r.cultura||"-")}</td>
        <td>${esc(nomeProduto(db2,r.sementeId))}</td>
        <td>${num(r.areaHa,1)}</td>
        <td>${num(r.taxaSacoHa,2)} sac/ha</td>
        <td><b>${num(r.sacosTotal,2)}</b></td>
        <td>${r.status==="Concluído"
          ? `<span class="pill ok">Concluído</span>`
          : r.status==="Planejado"
            ? `<span class="pill warn">Planejado</span>`
            : `<span class="pill info">Em andamento</span>`
        }</td>
        <td class="noPrint">
          <button class="btn danger" onclick="window.__delPlantio('${r.id}')">Excluir</button>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="9">Sem registros.</td></tr>`;
  }

  window.__delPlantio = (id)=>{
    if (!confirm("Excluir este plantio? (Atenção: não reverte estoque automaticamente)")) return;
    const db2 = getDB();
    db2.plantios = db2.plantios.filter(x=>x.id!==id);
    setDB(db2);
    toast("Removido", "Plantio removido.");
    location.reload();
  };

  frm.addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(frm);

    const data = String(fd.get("data")||nowISO());
    const talhaoId = String(fd.get("talhaoId")||"");
    const sementeId = String(fd.get("sementeId")||"");
    if (!talhaoId || !sementeId) return toast("Erro", "Selecione talhão e semente.");

    const areaHa = parseNum(fd.get("areaHa"));
    const taxaSacoHa = parseNum(fd.get("taxaSacoHa"));
    const sacosTotal = areaHa * taxaSacoHa;

    const db2 = getDB();

    // salva plantio
    db2.plantios.push({
      id: uid("plt"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data,
      status: String(fd.get("status")||"Em andamento"),
      fazendaId: (db2.talhoes||[]).find(t=>t.id===talhaoId)?.fazendaId || "",
      talhaoId,
      cultura: String(fd.get("cultura")||"Soja"),
      sementeId,
      areaHa,
      taxaSacoHa,
      sacosTotal,
      variedade: String(fd.get("variedade")||""),
      espacamentoCm: parseNum(fd.get("espacamentoCm")),
      populacao: parseNum(fd.get("populacao")),
      operador: String(fd.get("operador")||""),
      obs: String(fd.get("obs")||"")
    });

    // baixa automática no estoque (OUT)
    db2.estoqueMov.push({
      id: uid("mov"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data,
      tipo: "OUT",
      produtoId: sementeId,
      qtd: sacosTotal,
      valorTotal: 0,
      obs: `Baixa automática • Plantio • ${nomeTalhao(db2,talhaoId)} • ${num(areaHa,1)} ha`
    });

    setDB(db2);
    toast("Plantio salvo", `Baixa no estoque: ${num(sacosTotal,2)} sacos.`);
    location.reload();
  });

  document.getElementById("btnCSV").addEventListener("click", ()=>{
    downloadText(`plantio-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(getDB().plantios))));
  });

  render();
}

// ----------------- CRUD simples -----------------
function pageEmpresas(){
  setTop("Empresas","Cadastre e selecione no topo");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);
  const db=getDB();
  document.getElementById("content").innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Nova empresa</h3>
        <form id="frm" class="formGrid">
          <div class="full"><small>Nome</small><input class="input" name="nome" required></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar</button></div>
        </form>
      </div>
      <div class="tableWrap"><table><thead><tr><th>Nome</th><th>Criada</th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>
  `;
  function render(){
    const db2=getDB();
    document.getElementById("tb").innerHTML=(db2.empresas||[]).map(e=>`<tr><td><b>${esc(e.nome)}</b></td><td>${e.createdAt?new Date(e.createdAt).toLocaleString("pt-BR"):"-"}</td></tr>`).join("") || `<tr><td colspan="2">Sem empresas.</td></tr>`;
  }
  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const nome=String(new FormData(e.target).get("nome")||"").trim();
    if(!nome) return;
    const db2=getDB();
    const id=uid("emp");
    db2.empresas.push({id,nome,createdAt:Date.now()});
    const safId=uid("saf");
    db2.safras.push({id:safId,empresaId:id,nome:"Safra Atual • Soja",inicio:nowISO(),fim:"",ativa:true});
    setDB(db2);
    toast("Empresa criada","Selecione no topo.");
    e.target.reset();
    render();
  });
  document.getElementById("btnCSV").addEventListener("click",()=>downloadText(`empresas-${nowISO()}.csv`, toCSV(getDB().empresas||[])));
  render();
}

function pageSafras(){
  setTop("Safras","Separação por safra (empresa ativa)");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);
  const db=getDB();
  const empId=getEmpresaId();
  const rows=(db.safras||[]).filter(s=>s.empresaId===empId);

  document.getElementById("content").innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Nova safra</h3>
        <form id="frm" class="formGrid">
          <div class="full"><small>Nome</small><input class="input" name="nome" required></div>
          <div><small>Início</small><input class="input" name="inicio" type="date" value="${nowISO()}" required></div>
          <div><small>Fim</small><input class="input" name="fim" type="date"></div>
          <div class="full"><label class="row" style="gap:8px"><input type="checkbox" name="ativa" checked><small>Marcar como ativa</small></label></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar</button></div>
        </form>
      </div>
      <div class="tableWrap">
        <table><thead><tr><th>Nome</th><th>Início</th><th>Fim</th><th>Ativa</th><th class="noPrint">Ações</th></tr></thead><tbody id="tb"></tbody></table>
      </div>
    </div>
  `;

  function render(){
    const db2=getDB();
    const list=(db2.safras||[]).filter(s=>s.empresaId===empId);
    document.getElementById("tb").innerHTML=list.map(s=>`
      <tr>
        <td><b>${esc(s.nome)}</b></td><td>${esc(s.inicio||"-")}</td><td>${esc(s.fim||"-")}</td>
        <td>${s.ativa?`<span class="pill ok">Ativa</span>`:`<span class="pill">-</span>`}</td>
        <td class="noPrint">
          <button class="btn" onclick="window.__ativarSafra('${s.id}')">Ativar</button>
          <button class="btn danger" onclick="window.__delSafra('${s.id}')">Excluir</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem safras.</td></tr>`;
  }

  window.__ativarSafra=(id)=>{
    const db2=getDB();
    db2.safras.forEach(s=>{ if(s.empresaId===empId) s.ativa = (s.id===id); });
    setDB(db2);
    setSafraId(id);
    toast("Safra ativa","Ok.");
    location.reload();
  };

  window.__delSafra=(id)=>{
    if(!confirm("Excluir safra?")) return;
    const db2=getDB();
    db2.safras = db2.safras.filter(s=>s.id!==id);
    setDB(db2);
    toast("Safra removida","Ok.");
    location.reload();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const ativa=!!fd.get("ativa");
    const db2=getDB();
    const id=uid("saf");
    if(ativa) db2.safras.forEach(s=>{ if(s.empresaId===empId) s.ativa=false; });
    db2.safras.push({ id, empresaId: empId, nome:String(fd.get("nome")||"").trim(), inicio:String(fd.get("inicio")||nowISO()), fim:String(fd.get("fim")||""), ativa });
    setDB(db2);
    if(ativa) setSafraId(id);
    toast("Safra salva","Ok.");
    location.reload();
  });

  document.getElementById("btnCSV").addEventListener("click",()=>downloadText(`safras-${nowISO()}.csv`, toCSV((getDB().safras||[]).filter(s=>s.empresaId===empId))));
  render();
}

function pageFazendas(){
  setTop("Fazendas","Cadastro da empresa ativa");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);
  document.getElementById("content").innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Nova fazenda</h3>
        <form id="frm" class="formGrid">
          <div class="full"><small>Nome</small><input class="input" name="nome" required></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar</button></div>
        </form>
      </div>
      <div class="tableWrap"><table><thead><tr><th>Nome</th><th class="noPrint">Ações</th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>
  `;
  function render(){
    const db=getDB();
    const rows=onlyEmpresa(db.fazendas);
    document.getElementById("tb").innerHTML=rows.map(f=>`
      <tr>
        <td><b>${esc(f.nome)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delFaz('${f.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="2">Sem fazendas.</td></tr>`;
  }
  window.__delFaz=(id)=>{
    if(!confirm("Excluir fazenda?")) return;
    const db=getDB();
    db.fazendas=db.fazendas.filter(x=>x.id!==id);
    setDB(db);
    location.reload();
  };
  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const nome=String(new FormData(e.target).get("nome")||"").trim();
    if(!nome) return;
    const db=getDB();
    db.fazendas.push({id:uid("faz"),empresaId:getEmpresaId(),nome});
    setDB(db);
    toast("Fazenda salva","Ok.");
    location.reload();
  });
  document.getElementById("btnCSV").addEventListener("click",()=>downloadText(`fazendas-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().fazendas))));
  render();
}

function pageTalhoes(){
  setTop("Talhões","Cadastro e área (ha)");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);
  const db=getDB();
  const faz=onlyEmpresa(db.fazendas);
  document.getElementById("content").innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Novo talhão</h3>
        <form id="frm" class="formGrid">
          <div class="full"><small>Fazenda</small>
            <select class="select" name="fazendaId" required>
              ${faz.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join("")}
            </select>
          </div>
          <div><small>Nome</small><input class="input" name="nome" required></div>
          <div><small>Área (ha)</small><input class="input" name="areaHa" type="number" step="0.1" required></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar</button></div>
        </form>
      </div>
      <div class="tableWrap"><table><thead><tr><th>Talhão</th><th>Fazenda</th><th>Área</th><th class="noPrint">Ações</th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>
  `;
  function render(){
    const db2=getDB();
    const rows=onlyEmpresa(db2.talhoes);
    document.getElementById("tb").innerHTML=rows.map(t=>`
      <tr>
        <td><b>${esc(t.nome)}</b></td>
        <td>${esc(nomeFazenda(db2,t.fazendaId))}</td>
        <td>${num(t.areaHa,1)} ha</td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delTal('${t.id}')">Excluir</button></td>
      </tr>
    `).join("") || `<tr><td colspan="4">Sem talhões.</td></tr>`;
  }
  window.__delTal=(id)=>{
    if(!confirm("Excluir talhão?")) return;
    const db2=getDB();
    db2.talhoes=db2.talhoes.filter(x=>x.id!==id);
    setDB(db2);
    location.reload();
  };
  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const db2=getDB();
    db2.talhoes.push({
      id: uid("tal"),
      empresaId: getEmpresaId(),
      fazendaId: String(fd.get("fazendaId")),
      nome: String(fd.get("nome")||"").trim(),
      areaHa: parseNum(fd.get("areaHa"))
    });
    setDB(db2);
    toast("Talhão salvo","Ok.");
    location.reload();
  });
  document.getElementById("btnCSV").addEventListener("click",()=>downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().talhoes))));
  render();
}

function pageProdutos(){
  setTop("Produtos","Cadastre sementes e insumos");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button>`);
  document.getElementById("content").innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Novo produto</h3>
        <form id="frm" class="formGrid">
          <div class="full"><small>Nome</small><input class="input" name="nome" required></div>
          <div><small>Unidade</small>
            <select class="select" name="unidade">
              <option value="saco">saco</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="un">un</option>
            </select>
          </div>
          <div><small>Categoria</small>
            <select class="select" name="categoria">
              <option>Semente</option>
              <option>Fertilizante</option>
              <option>Defensivo</option>
              <option>Outros</option>
            </select>
          </div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar</button></div>
        </form>
        <div class="help">Para Plantio, use categoria <b>Semente</b> e unidade <b>saco</b>.</div>
      </div>
      <div class="tableWrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Unid.</th><th>Saldo</th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>
  `;
  function render(){
    const db=getDB();
    const rows=onlyEmpresa(db.produtos);
    document.getElementById("tb").innerHTML=rows.map(p=>`
      <tr>
        <td><b>${esc(p.nome)}</b></td>
        <td>${esc(p.categoria||"-")}</td>
        <td>${esc(p.unidade||"-")}</td>
        <td><b>${num(saldoEstoque(db,p.id),2)}</b> ${esc(p.unidade||"")}</td>
      </tr>
    `).join("") || `<tr><td colspan="4">Sem produtos.</td></tr>`;
  }
  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const nome=String(fd.get("nome")||"").trim();
    if(!nome) return;
    const db=getDB();
    db.produtos.push({ id: uid("prd"), empresaId: getEmpresaId(), nome, unidade: String(fd.get("unidade")), categoria: String(fd.get("categoria")) });
    setDB(db);
    toast("Produto salvo","Ok.");
    location.reload();
  });
  document.getElementById("btnCSV").addEventListener("click",()=>downloadText(`produtos-${nowISO()}.csv`, toCSV(onlyEmpresa(getDB().produtos))));
  render();
}

function pageEstoque(){
  setTop("Estoque","Entradas e saídas (saldo pode ficar negativo)");
  setTopActions(`<button class="btn" id="btnCSV">Exportar CSV</button> <button class="btn" onclick="window.print()">Imprimir</button>`);
  const db=getDB();
  const produtos=onlyEmpresa(db.produtos);

  document.getElementById("content").innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Movimento</h3>
        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
          <div><small>Tipo</small>
            <select class="select" name="tipo">
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
            </select>
          </div>
          <div class="full"><small>Produto</small>
            <select class="select" name="produtoId" required>
              ${produtos.map(p=>`<option value="${p.id}">${esc(p.nome)} (${esc(p.unidade||"")}) • saldo ${num(saldoEstoque(db,p.id),2)}</option>`).join("")}
            </select>
          </div>
          <div><small>Qtd</small><input class="input" name="qtd" type="number" step="0.01" required></div>
          <div class="full"><small>Obs</small><input class="input" name="obs"></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar</button></div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Obs</th></tr></thead>
          <tbody id="tb"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2=getDB();
    const rows=onlySafra(onlyEmpresa(db2.estoqueMov)).slice().sort(byDateDesc);
    document.getElementById("tb").innerHTML = rows.map(m=>`
      <tr>
        <td>${esc(m.data)}</td>
        <td>${m.tipo==="IN"?`<span class="pill ok">Entrada</span>`:`<span class="pill warn">Saída</span>`}</td>
        <td><b>${esc(nomeProduto(db2,m.produtoId))}</b></td>
        <td>${num(m.qtd,2)}</td>
        <td>${esc(m.obs||"")}</td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem movimentos.</td></tr>`;
  }

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const db2=getDB();
    db2.estoqueMov.push({
      id: uid("mov"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: String(fd.get("data")||nowISO()),
      tipo: String(fd.get("tipo")||"IN"),
      produtoId: String(fd.get("produtoId")),
      qtd: parseNum(fd.get("qtd")),
      valorTotal: 0,
      obs: String(fd.get("obs")||"")
    });
    setDB(db2);
    toast("Movimento salvo","Ok.");
    location.reload();
  });

  document.getElementById("btnCSV").addEventListener("click",()=>downloadText(`estoque-${nowISO()}.csv`, toCSV(onlySafra(onlyEmpresa(getDB().estoqueMov)))));
  render();
}

function pageConfig(){
  setTop("Configurações","Backup e limpeza");
  setTopActions(`<button class="btn" id="btnExport">Exportar DB</button>`);
  document.getElementById("content").innerHTML=`
    <div class="card">
      <h3>Manutenção</h3>
      <div class="help">Exporta um JSON com tudo do localStorage.</div>
      <div class="hr"></div>
      <div class="row">
        <button class="btn" id="btnExport2">Exportar DB</button>
        <button class="btn danger" id="btnClear">Limpar tudo</button>
      </div>
      <div class="hr"></div>
      <div class="help">
        Se o site não atualiza: no link do CSS/JS use <b>?v=1</b>, e aumente para <b>?v=2</b> quando atualizar.
      </div>
    </div>
  `;
  const exp=()=>downloadText(`agropro-db-${nowISO()}.json`, JSON.stringify(getDB(),null,2));
  document.getElementById("btnExport").addEventListener("click", exp);
  document.getElementById("btnExport2").addEventListener("click", exp);
  document.getElementById("btnClear").addEventListener("click", ()=>{
    if(!confirm("Apagar todos os dados locais?")) return;
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_ACTIVE_EMP);
    localStorage.removeItem(LS_ACTIVE_SAFRA);
    location.reload();
  });
}
