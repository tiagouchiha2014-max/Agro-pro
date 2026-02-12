/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTIEMPRESA)
   - Estoque de Diesel (S10/S500) com baixa automática ao abastecer
   - Aplicações com 10 linhas de produtos
   - Ops Center (opscenter.html) com KPIs + gráficos (Chart.js)
   ============================================================ */

const LS_KEY = "agropro_db_v1";
const LS_ACTIVE_EMP = "agropro_active_empresa_v1";

const PAGES = [
  { href:"index.html",        label:"Dashboard",         key:"dashboard",    icon:"📊" },
  { href:"opscenter.html",    label:"Operations Center", key:"opscenter",    icon:"🛰️" },
  { href:"empresas.html",     label:"Empresas",          key:"empresas",     icon:"🏢" },
  { href:"fazendas.html",     label:"Fazendas",          key:"fazendas",     icon:"🌾" },
  { href:"talhoes.html",      label:"Talhões",           key:"talhoes",      icon:"🧭" },
  { href:"produtos.html",     label:"Produtos",          key:"produtos",     icon:"🧪" },
  { href:"estoque.html",      label:"Estoque",           key:"estoque",      icon:"📦" },
  { href:"aplicacoes.html",   label:"Aplicações",        key:"aplicacoes",   icon:"🚜" },
  { href:"combustivel.html",  label:"Combustível",       key:"combustivel",  icon:"⛽" },
  { href:"clima.html",        label:"Clima/Chuva",        key:"clima",        icon:"🌧️" },
  { href:"equipe.html",       label:"Equipe",            key:"equipe",       icon:"👷" },
  { href:"maquinas.html",     label:"Máquinas",          key:"maquinas",     icon:"🛠️" },
  { href:"relatorios.html",   label:"Relatórios",        key:"relatorios",   icon:"🧾" },
  { href:"config.html",       label:"Configurações",     key:"config",       icon:"⚙️" },
];

// ---------- Utils ----------
function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
function nowISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function toast(title, msg){
  const host = document.querySelector(".toastHost");
  if(!host) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${escapeHtml(title)}</b><p>${escapeHtml(msg)}</p>`;
  host.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(4px)"; }, 2400);
  setTimeout(()=>{ el.remove(); }, 3100);
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
  const esc = (v)=> `"${String(v??"").replaceAll('"','""')}"`;
  const head = cols.map(esc).join(",");
  const body = rows.map(r=> cols.map(c=>esc(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}
function onlyEmpresa(arr){
  const eid = getEmpresaId();
  return (arr||[]).filter(x => x.empresaId === eid);
}
function findById(arr, id){
  return (arr||[]).find(x => x.id === id);
}
function findNameById(arr, id){
  const o = findById(arr,id);
  if(!o) return "";
  return o.nome || o.nomeCurto || o.titulo || "";
}

// ---------- DB ----------
function getDB(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw){
    const db = seedDB();
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    localStorage.setItem(LS_ACTIVE_EMP, db.empresas[0]?.id || "");
    return db;
  }
  try{
    const db = JSON.parse(raw);
    if(!db.empresas || !db.empresas.length) throw new Error("db inválido");
    return db;
  }catch{
    const db = seedDB();
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    localStorage.setItem(LS_ACTIVE_EMP, db.empresas[0]?.id || "");
    return db;
  }
}
function setDB(db){
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}
function getEmpresaId(){
  const db = getDB();
  let id = localStorage.getItem(LS_ACTIVE_EMP);
  if(!id || !db.empresas.find(e=>e.id===id)){
    id = db.empresas[0]?.id || "";
    localStorage.setItem(LS_ACTIVE_EMP, id);
  }
  return id;
}
function setEmpresaId(id){
  localStorage.setItem(LS_ACTIVE_EMP, id);
}
function resetDemo(){
  const db = seedDB();
  setDB(db);
  setEmpresaId(db.empresas[0]?.id || "");
  location.reload();
}
function backupCSV(){
  const db = getDB();
  downloadText(`agropro-backup-${new Date().toISOString()}.json`, JSON.stringify(db,null,2));
  toast("Backup", "Arquivo .json baixado.");
}

// ---------- Seed ----------
function seedDB(){
  const empresaId = uid("emp");
  const empresaId2 = uid("emp");

  const faz1 = uid("faz");
  const tal1 = uid("tal");

  // Produtos: inclui Diesel S10/S500 como Combustível (unidade L)
  const prdDieselS10 = uid("prd");
  const prdDieselS500 = uid("prd");
  const prdGly = uid("prd");

  const db = {
    empresas: [
      { id: empresaId, nome:"Agro Demo LTDA", cnpj:"", cidade:"", uf:"", obs:"" },
      { id: empresaId2, nome:"Anderson lambert", cnpj:"", cidade:"", uf:"", obs:"" },
    ],
    fazendas: [
      { id: faz1, empresaId, nome:"Fazenda Horizonte", municipio:"", uf:"", obs:"" },
    ],
    talhoes: [
      { id: tal1, empresaId, fazendaId: faz1, nome:"T-12", cultura:"Soja", areaHa: 78.5, obs:"" },
    ],
    produtos: [
      { id: prdGly, empresaId, tipo:"Insumo", nome:"Glifosato 480", unidade:"L", obs:"" },
      { id: prdDieselS10, empresaId, tipo:"Combustível", nome:"Diesel S10", unidade:"L", obs:"" },
      { id: prdDieselS500, empresaId, tipo:"Combustível", nome:"Diesel S500", unidade:"L", obs:"" },
    ],
    estoque: [
      { id: uid("stk"), empresaId, produtoId: prdGly, qtd: 120, unidade:"L", deposito:"Galpão", lote:"", validade:"", obs:"" },
      { id: uid("stk"), empresaId, produtoId: prdDieselS10, qtd: 2500, unidade:"L", deposito:"Tanque", lote:"", validade:"", obs:"Diesel no tanque" },
      { id: uid("stk"), empresaId, produtoId: prdDieselS500, qtd: 900, unidade:"L", deposito:"Tanque", lote:"", validade:"", obs:"Diesel no tanque" },
    ],
    equipe: [
      { id: uid("op"), empresaId, nome:"Operador Demo", funcao:"Aplicador", telefone:"", obs:"" },
    ],
    maquinas: [
      { id: uid("maq"), empresaId, nome:"Pulverizador 01", tipo:"Pulverizador", placa:"", obs:"" },
    ],
    aplicacoes: [
      {
        id: uid("apl"),
        empresaId,
        data: nowISO(),
        fazendaId: faz1,
        talhaoId: tal1,
        areaHa: 10,
        alvo: "Plantas daninhas",
        operacao: "Pulverização terrestre",
        maquinaId: "",
        operadorId: "",
        caldaLHa: 120,
        velocidade: 14,
        pressao: 3,
        bico: "Leque 11002",
        vento: 8,
        temperatura: 30,
        umidade: 60,
        obs: "",
        produtos: [
          { produtoId: prdGly, produtoNome:"Glifosato 480", dosePorHa: 2.0, unidade:"L/ha" }
        ]
      }
    ],
    combustivel: [
      {
        id: uid("cmb"),
        empresaId,
        data: nowISO(),
        produtoId: prdDieselS10,
        tipo: "Diesel S10",
        posto:"Posto Exemplo",
        maquinaId:"",
        operadorId:"",
        fazendaId: faz1,
        talhaoId: tal1,
        litros: 120,
        precoLitro: 6.19,
        kmOuHora: 0,
        obs:"Abastecimento demo"
      }
    ],
    chuva: [
      { id: uid("chv"), empresaId, data: nowISO(), fazendaId: faz1, mm: 12, obs:"" }
    ],
    config: {
      empresaId,
      offlineFirst:true
    }
  };

  // Baixa diesel do demo no estoque
  try{
    const item = db.estoque.find(s => s.empresaId===empresaId && s.produtoId===prdDieselS10);
    if(item) item.qtd = Number(item.qtd||0) - 120;
  }catch{}

  return db;
}

// ---------- UI Shell ----------
function mountShell(pageKey, title, subtitle){
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

        <div class="row" style="justify-content:space-between; margin: 6px 0 10px;">
          <span class="badge"><span class="dot"></span> Ambiente Offline</span>
          <button class="btn" id="btnBackup">Backup</button>
        </div>

        <div class="tenant">
          <small>Empresa ativa</small>
          <div style="height:8px"></div>
          <select class="select" id="selEmpresa"></select>
          <div style="height:10px"></div>
          <div class="row">
            <button class="btn primary" id="btnNovaEmpresa">+ Nova empresa</button>
            <button class="btn danger" id="btnResetDemo">Reset demo</button>
          </div>
          <div style="height:10px"></div>
          <small>Trocar a empresa muda todos os dados exibidos (fazendas, talhões, estoque, aplicações).</small>
        </div>

        <nav class="nav" id="nav"></nav>

        <div style="height:14px"></div>
        <small><b>Dica:</b> Para gerar PDF, vá em Relatórios e use Imprimir.</small>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="title">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          <div class="actions" id="topActions"></div>
        </div>

        <div id="content" style="margin-top:14px"></div>
      </main>

      <div class="toastHost"></div>
    </div>
  `;

  // Populate Empresa select
  const db = getDB();
  const sel = document.getElementById("selEmpresa");
  sel.innerHTML = db.empresas.map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join("");
  sel.value = getEmpresaId();
  sel.addEventListener("change", ()=>{
    setEmpresaId(sel.value);
    toast("Empresa ativa", "Dados atualizados pela empresa selecionada.");
    setTimeout(()=>location.reload(), 200);
  });

  // Nav
  const nav = document.getElementById("nav");
  nav.innerHTML = PAGES.map(p=>{
    const active = p.key === pageKey ? "active" : "";
    return `<a class="${active}" href="${p.href}"><span class="ico">${p.icon}</span>${escapeHtml(p.label)}</a>`;
  }).join("");

  // Buttons
  document.getElementById("btnBackup").addEventListener("click", backupCSV);
  document.getElementById("btnResetDemo").addEventListener("click", resetDemo);
  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if(!nome) return;
    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome, cnpj:"", cidade:"", uf:"", obs:"" });
    setDB(db2);
    setEmpresaId(id);
    toast("Empresa criada", "Agora cadastre fazendas e talhões.");
    setTimeout(()=>location.reload(), 200);
  });
}

function setTopActions(html){
  const el = document.getElementById("topActions");
  if(el) el.innerHTML = html || "";
}

// ---------- CRUD Builder ----------
function crudPage({ title, subtitle, tableKey, columns, formFields, onBeforeSave }){
  const db = getDB();
  const list = onlyEmpresa(db[tableKey] || []);
  const content = document.getElementById("content");

  setTopActions(`
    <button class="btn" id="btnExport">Exportar CSV</button>
  `);

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Novo registro</h3>
        <form id="formCrud">
          <div class="formGrid">
            ${formFields.map(f => renderField(f, db)).join("")}
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar</button>
        </form>
        <div style="height:10px"></div>
        <div class="help">Dica: você pode corrigir depois editando e salvando novamente.</div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>${columns.map(c=>`<th>${escapeHtml(c.label)}</th>`).join("")}<th></th></tr>
          </thead>
          <tbody>
            ${
              list.slice().reverse().map(r=>{
                return `<tr>
                  ${columns.map(c=>{
                    const v = c.render ? c.render(r, db) : (r[c.key] ?? "");
                    const raw = !!c.raw;
                    return raw ? `<td>${v ?? ""}</td>` : `<td>${escapeHtml(v ?? "")}</td>`;
                  }).join("")}
                  <td><button class="btn danger" data-del="${r.id}">Excluir</button></td>
                </tr>`;
              }).join("") || `<tr><td colspan="${columns.length+1}">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // export
  document.getElementById("btnExport").addEventListener("click", ()=>{
    const rows = list.map(x=>({ ...x }));
    downloadText(`${tableKey}-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  // delete
  content.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      if(!confirm("Excluir este registro?")) return;
      const db2 = getDB();
      db2[tableKey] = (db2[tableKey]||[]).filter(x=>x.id!==id);
      setDB(db2);
      toast("Excluído", "Registro removido.");
      setTimeout(()=>location.reload(), 120);
    });
  });

  // submit
  const form = document.getElementById("formCrud");
  form.addEventListener("submit", (ev)=>{
    ev.preventDefault();
    const fd = new FormData(form);
    const obj = { id: uid(tableKey.slice(0,3)), empresaId: getEmpresaId() };

    formFields.forEach(f=>{
      if(f.type==="spacer") return;
      if(f.kind==="select" || f.kind==="input" || f.kind==="number" || f.kind==="date" || f.kind==="textarea"){
        let v = fd.get(f.name);
        if(f.kind==="number") v = Number(v||0);
        obj[f.name] = v ?? "";
      }
    });

    if(onBeforeSave) onBeforeSave(obj, fd);

    const db2 = getDB();
    db2[tableKey] = db2[tableKey] || [];
    db2[tableKey].push(obj);
    setDB(db2);

    toast("Salvo", "Registro adicionado.");
    setTimeout(()=>location.reload(), 120);
  });
}

function renderField(f, db){
  if(f.type==="spacer"){
    return `<div class="full"></div>`;
  }
  const label = `<small>${escapeHtml(f.label || "")}</small>`;
  const cls = f.full ? "full" : "";
  if(f.kind==="input"){
    return `<div class="${cls}">${label}<input class="input" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder||"")}" /></div>`;
  }
  if(f.kind==="date"){
    return `<div class="${cls}">${label}<input class="input" type="date" name="${escapeHtml(f.name)}" value="${escapeHtml(f.value||nowISO())}" /></div>`;
  }
  if(f.kind==="number"){
    return `<div class="${cls}">${label}<input class="input" type="number" step="${escapeHtml(f.step||"0.01")}" name="${escapeHtml(f.name)}" value="${escapeHtml(f.value||"")}" placeholder="${escapeHtml(f.placeholder||"")}" /></div>`;
  }
  if(f.kind==="textarea"){
    return `<div class="${cls}">${label}<textarea class="textarea" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder||"")}"></textarea></div>`;
  }
  if(f.kind==="select"){
    const opts = (f.optionsFn ? f.optionsFn(db) : (f.options||[]));
    const html = opts.map(o=> `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
    return `<div class="${cls}">${label}<select class="select" name="${escapeHtml(f.name)}">${html}</select></div>`;
  }
  return "";
}

// ---------- Pages ----------
function pageDashboard(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas||[]);
  const talhoes = onlyEmpresa(db.talhoes||[]);
  const aplic = onlyEmpresa(db.aplicacoes||[]);
  const chuva = onlyEmpresa(db.chuva||[]);
  const produtos = onlyEmpresa(db.produtos||[]);
  const comb = onlyEmpresa(db.combustivel||[]);

  const hoje = nowISO();
  const aHoje = aplic.filter(a=>a.data===hoje).length;
  const combHoje = comb.filter(c=>c.data===hoje).reduce((s,c)=> s + (Number(c.litros||0)*Number(c.precoLitro||0)), 0);
  const chHoje = chuva.filter(x=>x.data===hoje).reduce((s,x)=> s + Number(x.mm||0), 0);

  const areaTotal = talhoes.reduce((s,t)=> s + Number(t.areaHa||0), 0);

  setTopActions(`
    <button class="btn" onclick="location.href='opscenter.html'">Abrir Ops Center</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card"><h3>Fazendas</h3><div class="big">${fazendas.length}</div><div class="sub">Cadastradas na empresa</div></div>
      <div class="card"><h3>Talhões</h3><div class="big">${talhoes.length}</div><div class="sub">Área total: ${areaTotal.toFixed(1)} ha</div></div>
      <div class="card"><h3>Aplicações (hoje)</h3><div class="big">${aHoje}</div><div class="sub"><span class="pill info">Operações registradas</span></div></div>
      <div class="card"><h3>Combustível (hoje)</h3><div class="big">R$ ${combHoje.toFixed(2)}</div><div class="sub"><span class="pill warn">Custo diário</span></div></div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Resumo rápido</h3>
        <div class="help">
          • Chuva (hoje): <b>${chHoje.toFixed(1)} mm</b><br/>
          • Produtos cadastrados: <b>${produtos.length}</b><br/>
          • Use Aplicações + Estoque para rastreabilidade e controle.
        </div>
        <div style="height:10px"></div>
        <span class="pill ok">Offline-first</span>
        <span class="pill info">Multiempresa</span>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Últimas aplicações</th></tr>
            <tr>
              <th>Produto</th><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área (ha)</th><th>Alvo</th>
            </tr>
          </thead>
          <tbody>
            ${
              aplic.slice().reverse().slice(0,6).map(a=>{
                const faz = findNameById(fazendas, a.fazendaId);
                const tal = findNameById(talhoes, a.talhaoId);
                const p1 = (a.produtos||[])[0]?.produtoNome || "—";
                return `<tr>
                  <td><b>${escapeHtml(p1)}</b></td>
                  <td>${escapeHtml(a.data||"")}</td>
                  <td>${escapeHtml(faz)}</td>
                  <td>${escapeHtml(tal)}</td>
                  <td>${Number(a.areaHa||0).toFixed(2)}</td>
                  <td>${escapeHtml(a.alvo||"")}</td>
                </tr>`;
              }).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function pageEmpresas(){
  // Empresas não é por empresaId — é global
  const db = getDB();
  const content = document.getElementById("content");

  setTopActions(`<button class="btn" id="btnExportEmp">Exportar CSV</button>`);
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova empresa</h3>
        <form id="formEmp">
          <div class="formGrid">
            <div class="full"><small>Nome</small><input class="input" name="nome" placeholder="Ex.: Fazenda Santa Luzia LTDA" required /></div>
            <div><small>CNPJ</small><input class="input" name="cnpj" placeholder="opcional" /></div>
            <div><small>Cidade</small><input class="input" name="cidade" placeholder="opcional" /></div>
            <div><small>UF</small><input class="input" name="uf" placeholder="ex.: MT" /></div>
            <div class="full"><small>Obs</small><textarea class="textarea" name="obs" placeholder="Anotações..."></textarea></div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar</button>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>CNPJ</th><th>Cidade</th><th>UF</th><th></th></tr>
          </thead>
          <tbody>
            ${db.empresas.map(e=>`
              <tr>
                <td><b>${escapeHtml(e.nome)}</b></td>
                <td>${escapeHtml(e.cnpj||"")}</td>
                <td>${escapeHtml(e.cidade||"")}</td>
                <td>${escapeHtml(e.uf||"")}</td>
                <td><button class="btn danger" data-del="${e.id}">Excluir</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btnExportEmp").addEventListener("click", ()=>{
    downloadText(`empresas-${nowISO()}.csv`, toCSV(db.empresas.map(x=>({...x}))));
    toast("Exportado","CSV baixado.");
  });

  content.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      if(!confirm("Excluir empresa? Isso não apaga os dados antigos do histórico (fica no backup).")) return;
      const db2 = getDB();
      db2.empresas = db2.empresas.filter(e=>e.id!==id);
      setDB(db2);
      toast("Excluída","Empresa removida.");
      setTimeout(()=>location.reload(),120);
    });
  });

  document.getElementById("formEmp").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const obj = {
      id: uid("emp"),
      nome: fd.get("nome")||"",
      cnpj: fd.get("cnpj")||"",
      cidade: fd.get("cidade")||"",
      uf: fd.get("uf")||"",
      obs: fd.get("obs")||""
    };
    const db2 = getDB();
    db2.empresas.push(obj);
    setDB(db2);
    toast("Salvo","Empresa criada.");
    setTimeout(()=>location.reload(),120);
  });
}

function pageFazendas(){
  crudPage({
    title:"Fazendas",
    subtitle:"Cadastro de fazendas da empresa",
    tableKey:"fazendas",
    columns:[
      {key:"nome", label:"Nome"},
      {key:"municipio", label:"Município"},
      {key:"uf", label:"UF"},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"input", name:"nome", label:"Nome", placeholder:"Ex.: Fazenda Horizonte", full:true},
      {kind:"input", name:"municipio", label:"Município", placeholder:"opcional"},
      {kind:"input", name:"uf", label:"UF", placeholder:"ex.: MT"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"anotações...", full:true},
    ],
  });
}

function pageTalhoes(){
  crudPage({
    title:"Talhões",
    subtitle:"Talhões por fazenda",
    tableKey:"talhoes",
    columns:[
      {key:"nome", label:"Nome"},
      {key:"fazendaId", label:"Fazenda", render:(r,db)=> findNameById(onlyEmpresa(db.fazendas||[]), r.fazendaId)},
      {key:"cultura", label:"Cultura"},
      {key:"areaHa", label:"Área (ha)", render:(r)=> Number(r.areaHa||0).toFixed(2)},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"select", name:"fazendaId", label:"Fazenda", optionsFn:(db)=>{
        const f = onlyEmpresa(db.fazendas||[]);
        return f.length ? f.map(x=>({value:x.id, label:x.nome})) : [{value:"", label:"Cadastre Fazendas primeiro"}];
      }, full:true},
      {kind:"input", name:"nome", label:"Nome", placeholder:"Ex.: T-12"},
      {kind:"input", name:"cultura", label:"Cultura", placeholder:"Ex.: Soja"},
      {kind:"number", name:"areaHa", label:"Área (ha)", step:"0.01", placeholder:"Ex.: 78.5"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"anotações...", full:true},
    ],
  });
}

function pageProdutos(){
  crudPage({
    title:"Produtos",
    subtitle:"Insumos e combustíveis",
    tableKey:"produtos",
    columns:[
      {key:"tipo", label:"Tipo"},
      {key:"nome", label:"Nome"},
      {key:"unidade", label:"Unid."},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"select", name:"tipo", label:"Tipo", options:[
        {value:"Insumo", label:"Insumo"},
        {value:"Fertilizante", label:"Fertilizante"},
        {value:"Semente", label:"Semente"},
        {value:"Combustível", label:"Combustível"},
        {value:"Outro", label:"Outro"},
      ], full:true},
      {kind:"input", name:"nome", label:"Nome", placeholder:"Ex.: Diesel S10 / Glifosato 480", full:true},
      {kind:"input", name:"unidade", label:"Unidade", placeholder:"Ex.: L, kg, sc"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"informações...", full:true},
    ],
  });
}

function ensureExtraStyles(){
  if(document.getElementById("agroExtraStyles")) return;
  const st = document.createElement("style");
  st.id = "agroExtraStyles";
  st.textContent = `
    .qtyTag{
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 10px; border-radius:999px;
      border:1px solid var(--line);
      background: var(--chip);
      font-weight:800;
    }
    .qtyTag.neg{
      border-color: rgba(239,68,68,.35);
      background: rgba(239,68,68,.10);
      color: #7f1d1d;
    }
    .qtyTag.pos{
      border-color: rgba(22,163,74,.28);
      background: rgba(22,163,74,.10);
      color: #14532d;
    }
  `;
  document.head.appendChild(st);
}

function pageEstoque(){
  ensureExtraStyles();
  const db = getDB();
  const produtos = onlyEmpresa(db.produtos||[]);

  crudPage({
    title:"Estoque",
    subtitle:"Entradas, saldos e furo (negativo permitido)",
    tableKey:"estoque",
    columns:[
      {key:"produtoId", label:"Produto", render:(r,db)=> findNameById(onlyEmpresa(db.produtos||[]), r.produtoId)},
      {key:"deposito", label:"Depósito"},
      {key:"qtd", label:"Qtd", raw:true, render:(r)=>{
        const q = Number(r.qtd||0);
        const cls = q < 0 ? "neg" : "pos";
        return `<span class="qtyTag ${cls}">${q.toFixed(2)}</span>`;
      }},
      {key:"unidade", label:"Unid."},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"select", name:"produtoId", label:"Produto", optionsFn:()=>{
        return produtos.length ? produtos.map(p=>({value:p.id, label:`${p.nome} (${p.tipo})`})) : [{value:"", label:"Cadastre Produtos primeiro"}];
      }, full:true},
      {kind:"input", name:"deposito", label:"Depósito", placeholder:"Ex.: Galpão / Tanque"},
      {kind:"number", name:"qtd", label:"Qtd", step:"0.01", placeholder:"Ex.: 500"},
      {kind:"input", name:"unidade", label:"Unid.", placeholder:"Ex.: L, kg"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"lote/nota/fornecedor...", full:true},
    ],
    onBeforeSave:(obj)=>{
      // auto unidade se vazia
      if(!obj.unidade){
        const p = produtos.find(x=>x.id===obj.produtoId);
        if(p && p.unidade) obj.unidade = p.unidade;
      }
    }
  });
}

function pageEquipe(){
  crudPage({
    title:"Equipe",
    subtitle:"Operadores e equipe de campo",
    tableKey:"equipe",
    columns:[
      {key:"nome", label:"Nome"},
      {key:"funcao", label:"Função"},
      {key:"telefone", label:"Telefone"},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"input", name:"nome", label:"Nome", placeholder:"Ex.: João", full:true},
      {kind:"input", name:"funcao", label:"Função", placeholder:"Ex.: Operador"},
      {kind:"input", name:"telefone", label:"Telefone", placeholder:"opcional"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"anotações...", full:true},
    ],
  });
}

function pageMaquinas(){
  crudPage({
    title:"Máquinas",
    subtitle:"Pulverizadores, tratores, colheitadeiras",
    tableKey:"maquinas",
    columns:[
      {key:"nome", label:"Nome"},
      {key:"tipo", label:"Tipo"},
      {key:"placa", label:"Placa/ID"},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"input", name:"nome", label:"Nome", placeholder:"Ex.: Pulverizador 01", full:true},
      {kind:"input", name:"tipo", label:"Tipo", placeholder:"Ex.: Pulverizador"},
      {kind:"input", name:"placa", label:"Placa/ID", placeholder:"opcional"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"anotações...", full:true},
    ],
  });
}

function pageClima(){
  crudPage({
    title:"Clima/Chuva",
    subtitle:"Registro manual de chuva (mm)",
    tableKey:"chuva",
    columns:[
      {key:"data", label:"Data"},
      {key:"fazendaId", label:"Fazenda", render:(r,db)=> findNameById(onlyEmpresa(db.fazendas||[]), r.fazendaId)},
      {key:"mm", label:"mm", render:(r)=> Number(r.mm||0).toFixed(1)},
      {key:"obs", label:"Obs"},
    ],
    formFields:[
      {kind:"date", name:"data", label:"Data", value: nowISO()},
      {kind:"select", name:"fazendaId", label:"Fazenda", optionsFn:(db)=>{
        const f = onlyEmpresa(db.fazendas||[]);
        return f.length ? f.map(x=>({value:x.id, label:x.nome})) : [{value:"", label:"Cadastre Fazendas primeiro"}];
      }},
      {kind:"number", name:"mm", label:"Chuva (mm)", step:"0.1", placeholder:"Ex.: 12"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"anotações...", full:true},
    ],
  });
}

/* ---------------- Aplicações (10 linhas) + baixa de estoque ---------------- */
function pageAplicacoes(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas||[]);
  const talhoes = onlyEmpresa(db.talhoes||[]);
  const produtos = onlyEmpresa(db.produtos||[]).filter(p=>String(p.tipo||"").toLowerCase()!=="combustível"); // não mistura diesel aqui
  const operadores = onlyEmpresa(db.equipe||[]);
  const maquinas = onlyEmpresa(db.maquinas||[]);

  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Nova aplicação</h3>
        <form id="formApl">
          <div class="formGrid">
            <div><small>Data</small><input class="input" type="date" name="data" value="${nowISO()}" /></div>
            <div><small>Operação</small><input class="input" name="operacao" placeholder="Ex.: Pulverização terrestre" /></div>

            <div><small>Fazenda</small>
              <select class="select" name="fazendaId">
                ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Talhão</small>
              <select class="select" name="talhaoId">
                ${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Área aplicada (ha)</small><input class="input" type="number" step="0.01" name="areaHa" placeholder="Ex.: 10" required /></div>
            <div><small>Alvo</small><input class="input" name="alvo" placeholder="Ex.: Plantas daninhas" /></div>

            <div><small>Máquina</small>
              <select class="select" name="maquinaId">
                <option value="">(opcional)</option>
                ${maquinas.map(m=>`<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Operador</small>
              <select class="select" name="operadorId">
                <option value="">(opcional)</option>
                ${operadores.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Calda (L/ha)</small><input class="input" type="number" step="0.1" name="caldaLHa" placeholder="120" /></div>
            <div><small>Velocidade (km/h)</small><input class="input" type="number" step="0.1" name="velocidade" placeholder="14" /></div>

            <div><small>Pressão (bar)</small><input class="input" type="number" step="0.1" name="pressao" placeholder="3" /></div>
            <div><small>Bico</small><input class="input" name="bico" placeholder="Leque 11002" /></div>

            <div><small>Vento (km/h)</small><input class="input" type="number" step="0.1" name="vento" placeholder="8" /></div>
            <div><small>Temperatura (°C)</small><input class="input" type="number" step="0.1" name="temperatura" placeholder="30" /></div>

            <div><small>Umidade (%)</small><input class="input" type="number" step="0.1" name="umidade" placeholder="60" /></div>
            <div class="full"><small>Produtos (10 linhas) — Dose/ha</small>
              <div class="help">Escolha o produto, informe dose por hectare e unidade (L/ha ou kg/ha).</div>
            </div>

            ${Array.from({length:10}, (_,i)=> i+1).map(i=>`
              <div>
                <small>Produto ${i}</small>
                <select class="select" name="p${i}_id">
                  <option value="">(opcional)</option>
                  ${produtos.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join("")}
                </select>
              </div>
              <div>
                <small>Dose/ha</small>
                <input class="input" type="number" step="0.001" name="p${i}_dose" placeholder="Ex.: 2.0" />
              </div>
              <div>
                <small>Unidade</small>
                <input class="input" name="p${i}_un" placeholder="L/ha ou kg/ha" />
              </div>
            `).join("")}

            <div class="full">
              <small>Observações</small>
              <textarea class="textarea" name="obs" placeholder="Deriva, falhas, reentrada, carência, ocorrências..."></textarea>
            </div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar aplicação</button>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Últimas aplicações</th></tr>
            <tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Alvo</th><th>Produtos</th></tr>
          </thead>
          <tbody>
            ${
              onlyEmpresa(db.aplicacoes||[]).slice().reverse().slice(0,10).map(a=>{
                const faz = findNameById(fazendas, a.fazendaId);
                const tal = findNameById(talhoes, a.talhaoId);
                const prds = (a.produtos||[]).map(p=>`${p.produtoNome} (${p.dosePorHa} ${p.unidade||""})`).join(" + ");
                return `<tr>
                  <td>${escapeHtml(a.data||"")}</td>
                  <td>${escapeHtml(faz)}</td>
                  <td>${escapeHtml(tal)}</td>
                  <td>${Number(a.areaHa||0).toFixed(2)}</td>
                  <td>${escapeHtml(a.alvo||"")}</td>
                  <td>${escapeHtml(prds||"—")}</td>
                </tr>`;
              }).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("formApl").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);

    const areaHa = Number(fd.get("areaHa")||0);
    if(!areaHa || areaHa <= 0){
      toast("Erro","Informe a área aplicada (ha).");
      return;
    }

    const apl = {
      id: uid("apl"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId") || "",
      talhaoId: fd.get("talhaoId") || "",
      areaHa,
      alvo: fd.get("alvo") || "",
      operacao: fd.get("operacao") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      caldaLHa: Number(fd.get("caldaLHa")||0),
      velocidade: Number(fd.get("velocidade")||0),
      pressao: Number(fd.get("pressao")||0),
      bico: fd.get("bico") || "",
      vento: Number(fd.get("vento")||0),
      temperatura: Number(fd.get("temperatura")||0),
      umidade: Number(fd.get("umidade")||0),
      obs: fd.get("obs") || "",
      produtos: []
    };

    // 10 linhas
    Array.from({length:10}, (_,i)=> i+1).forEach(i=>{
      const id = fd.get(`p${i}_id`) || "";
      const dose = Number(fd.get(`p${i}_dose`)||0);
      const un = (fd.get(`p${i}_un`)||"").trim();
      if(!id) return;
      const p = produtos.find(x=>x.id===id);
      apl.produtos.push({
        produtoId: id,
        produtoNome: p ? p.nome : "Produto",
        dosePorHa: dose,
        unidade: un || (p?.unidade ? `${p.unidade}/ha` : "")
      });
    });

    // Salva aplicação
    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes || [];
    db2.aplicacoes.push(apl);

    // ✅ BAIXA AUTOMÁTICA NO ESTOQUE: dose/ha * área
    db2.estoque = db2.estoque || [];
    apl.produtos.forEach(pp=>{
      const dose = Number(pp.dosePorHa||0);
      if(!dose) return;
      const consumo = dose * areaHa; // mesma unidade da dose/ha (ex.: L ou kg)
      // procura a primeira linha de estoque do produto
      let item = onlyEmpresa(db2.estoque).find(s => s.produtoId === pp.produtoId);
      if(!item){
        // cria linha se não existir (vai negativo)
        item = {
          id: uid("stk"),
          empresaId: getEmpresaId(),
          produtoId: pp.produtoId,
          deposito: "Geral",
          lote: "",
          validade: "",
          qtd: 0,
          unidade: (pp.unidade||"").includes("kg") ? "kg" : "L",
          obs: "Criado automaticamente pela baixa de aplicação"
        };
        db2.estoque.push(item);
      }
      item.qtd = Number(item.qtd||0) - consumo; // permite negativo
    });

    setDB(db2);
    toast("Salvo","Aplicação registrada e estoque atualizado.");
    setTimeout(()=>location.reload(), 120);
  });
}

/* ---------------- Combustível: Diesel S10/S500 + baixa estoque ---------------- */
function pageCombustivel(){
  ensureExtraStyles();
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas||[]);
  const talhoes = onlyEmpresa(db.talhoes||[]);
  const maquinas = onlyEmpresa(db.maquinas||[]);
  const operadores = onlyEmpresa(db.equipe||[]);
  const produtos = onlyEmpresa(db.produtos||[]);
  const combustiveis = produtos.filter(p => String(p.tipo||"").toLowerCase().includes("combust"));

  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Novo abastecimento</h3>
        <form id="formCmb">
          <div class="formGrid">
            <div><small>Data</small><input class="input" type="date" name="data" value="${nowISO()}" /></div>

            <div>
              <small>Diesel</small>
              <select class="select" name="produtoId" ${combustiveis.length ? "" : "disabled"}>
                ${
                  combustiveis.length
                    ? combustiveis.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join("")
                    : `<option value="">Cadastre Diesel em Produtos (tipo Combustível)</option>`
                }
              </select>
            </div>

            <div><small>Posto / Origem</small><input class="input" name="posto" placeholder="Ex.: Tanque / Posto XPTO" /></div>
            <div><small>Litros</small><input class="input" type="number" step="0.01" name="litros" placeholder="Ex.: 120" required /></div>

            <div><small>Preço/Litro</small><input class="input" type="number" step="0.01" name="precoLitro" placeholder="Ex.: 6.19" /></div>
            <div><small>KM ou Horímetro</small><input class="input" type="number" step="0.1" name="kmOuHora" placeholder="opcional" /></div>

            <div><small>Máquina</small>
              <select class="select" name="maquinaId">
                <option value="">(opcional)</option>
                ${maquinas.map(m=>`<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Operador</small>
              <select class="select" name="operadorId">
                <option value="">(opcional)</option>
                ${operadores.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Fazenda</small>
              <select class="select" name="fazendaId">
                ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Talhão</small>
              <select class="select" name="talhaoId">
                ${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
              </select>
            </div>

            <div class="full"><small>Observações</small>
              <textarea class="textarea" name="obs" placeholder="Abastecimento, manutenção, ocorrências..."></textarea>
            </div>
          </div>

          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar abastecimento</button>
          <div style="height:8px"></div>
          <div class="help">Ao salvar, o estoque do diesel selecionado é baixado automaticamente (permite saldo negativo).</div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="7">Últimos abastecimentos</th></tr>
            <tr><th>Data</th><th>Diesel</th><th>Litros</th><th>R$</th><th>Máquina</th><th>Fazenda</th><th>Talhão</th></tr>
          </thead>
          <tbody>
            ${
              onlyEmpresa(db.combustivel||[]).slice().reverse().slice(0,12).map(c=>{
                const maq = findNameById(maquinas, c.maquinaId);
                const faz = findNameById(fazendas, c.fazendaId);
                const tal = findNameById(talhoes, c.talhaoId);
                const total = (Number(c.litros||0) * Number(c.precoLitro||0));
                return `<tr>
                  <td>${escapeHtml(c.data||"")}</td>
                  <td><b>${escapeHtml(c.tipo||"")}</b></td>
                  <td>${Number(c.litros||0).toFixed(2)}</td>
                  <td>R$ ${total.toFixed(2)}</td>
                  <td>${escapeHtml(maq||"")}</td>
                  <td>${escapeHtml(faz||"")}</td>
                  <td>${escapeHtml(tal||"")}</td>
                </tr>`;
              }).join("") || `<tr><td colspan="7">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("formCmb").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);

    const produtoId = fd.get("produtoId") || "";
    const litros = Number(fd.get("litros")||0);
    if(!produtoId){
      toast("Erro","Cadastre Diesel S10/S500 em Produtos (tipo Combustível).");
      return;
    }
    if(!litros || litros<=0){
      toast("Erro","Informe os litros abastecidos.");
      return;
    }

    const db2 = getDB();
    const prodFuel = onlyEmpresa(db2.produtos||[]).find(p=>p.id===produtoId);

    const obj = {
      id: uid("cmb"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      produtoId,
      tipo: prodFuel ? prodFuel.nome : "Diesel",
      posto: fd.get("posto") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      fazendaId: fd.get("fazendaId") || "",
      talhaoId: fd.get("talhaoId") || "",
      litros,
      precoLitro: Number(fd.get("precoLitro")||0),
      kmOuHora: Number(fd.get("kmOuHora")||0),
      obs: fd.get("obs") || ""
    };

    db2.combustivel = db2.combustivel || [];
    db2.combustivel.push(obj);

    // ✅ BAIXA AUTOMÁTICA NO ESTOQUE DE DIESEL (permite negativo)
    db2.estoque = db2.estoque || [];
    let item = onlyEmpresa(db2.estoque).find(s => s.produtoId === produtoId);
    if(!item){
      item = {
        id: uid("stk"),
        empresaId: getEmpresaId(),
        produtoId,
        deposito: "Tanque",
        lote: "",
        validade: "",
        qtd: 0,
        unidade: "L",
        obs: "Criado automaticamente pela baixa de abastecimento"
      };
      db2.estoque.push(item);
    }
    item.qtd = Number(item.qtd||0) - litros;

    setDB(db2);
    toast("Salvo", `Abastecimento registrado e estoque baixado: -${litros.toFixed(2)} L`);
    setTimeout(()=>location.reload(),120);
  });
}

/* ---------------- Relatórios ---------------- */
function pageRelatorios(){
  ensureExtraStyles();
  const db = getDB();
  const estoque = onlyEmpresa(db.estoque || []);
  const prods = onlyEmpresa(db.produtos || []);

  const negRows = estoque
    .filter(s => Number(s.qtd||0) < 0)
    .map(s => {
      const p = prods.find(pp => pp.id === s.produtoId);
      const nome = p ? p.nome : "(sem produto)";
      const unidade = (s.unidade || (p?.unidade) || "").trim();
      return { nome, unidade, qtd: Number(s.qtd||0) };
    });

  const negByProduto = Object.values(
    negRows.reduce((acc, r)=>{
      const k = r.nome + "||" + r.unidade;
      acc[k] = acc[k] || { nome:r.nome, unidade:r.unidade, qtd:0 };
      acc[k].qtd += r.qtd;
      return acc;
    }, {})
  ).sort((a,b)=> a.qtd - b.qtd);

  setTopActions(`
    <button class="btn" onclick="window.print()">Imprimir</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Relatórios</h3>
        <div class="help">
          • Use <b>Imprimir</b> do navegador para gerar PDF.<br/>
          • Estoque negativo aparece como furo (permitido).
        </div>
      </div>

      <div class="card">
        <h3>Status</h3>
        <div class="big">${negByProduto.length}</div>
        <div class="sub">Produtos com saldo negativo</div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="3">Furo de estoque por produto (saldo negativo)</th></tr>
            <tr><th>Produto</th><th>Saldo</th><th>Unid.</th></tr>
          </thead>
          <tbody>
            ${
              (negByProduto.length ? negByProduto : [{nome:"Sem furo de estoque", qtd:0, unidade:""}]).map(r=>`
                <tr>
                  <td><b>${escapeHtml(r.nome)}</b></td>
                  <td><span class="qtyTag ${r.qtd < 0 ? "neg" : "pos"}">${Number(r.qtd||0).toFixed(2)}</span></td>
                  <td>${escapeHtml(r.unidade||"")}</td>
                </tr>
              `).join("")
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Recomendação</h3>
        <div class="help">
          • Se o furo for Diesel, lance entrada no Estoque (Tanque).<br/>
          • Se for insumo, revise dose/área das aplicações.
        </div>
      </div>
    </div>
  `;
}

function pageConfig(){
  const content = document.getElementById("content");
  setTopActions(`<button class="btn" onclick="backupCSV()">Backup</button>`);
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Configurações</h3>
        <div class="help">
          Seu sistema é <b>offline-first</b> (salva no navegador).<br/>
          Para multiusuário e nuvem, a evolução natural é <b>Supabase</b>.
        </div>
        <div style="height:12px"></div>
        <button class="btn danger" onclick="resetDemo()">Reset demo</button>
      </div>

      <div class="card">
        <h3>Links</h3>
        <div class="help">
          • Ops Center: <b>opscenter.html</b><br/>
          • Backup: botão no menu lateral
        </div>
      </div>
    </div>
  `;
}

/* ---------------- Ops Center ---------------- */
function pageOpscenter(){
  const db = getDB();

  const fazendas = onlyEmpresa(db.fazendas || []);
  const talhoes = onlyEmpresa(db.talhoes || []);
  const aplicacoes = onlyEmpresa(db.aplicacoes || []);
  const estoque = onlyEmpresa(db.estoque || []);
  const combustivel = onlyEmpresa(db.combustivel || []);
  const produtos = onlyEmpresa(db.produtos || []);

  setTopActions(`
    <button class="btn" id="btnExportOps">Exportar KPIs</button>
    <button class="btn" onclick="location.href='index.html'">Voltar</button>
  `);

  const sum = (arr, fn) => arr.reduce((s,x)=> s + (Number(fn(x))||0), 0);
  const today = new Date();
  const days30 = new Date(today.getTime() - 30*24*60*60*1000);
  const inLast30 = (iso) => {
    const d = new Date(String(iso||"").slice(0,10));
    return !isNaN(d) && d >= days30;
  };

  const areaTotal = sum(talhoes, t=>t.areaHa);

  const apl30 = aplicacoes.filter(a=>inLast30(a.data));
  const comb30 = combustivel.filter(c=>inLast30(c.data));
  const litros30 = sum(comb30, c=>c.litros);
  const custoComb30 = sum(comb30, c => (Number(c.litros||0) * Number(c.precoLitro||0)));

  const itensNeg = estoque.filter(s => Number(s.qtd||0) < 0);
  const qtdItensNeg = itensNeg.length;

  // Top consumos por produto (estimativa: dose/ha * area)
  const consumoPorProduto = {};
  aplicacoes.forEach(a=>{
    const area = Number(a.areaHa||0);
    (a.produtos||[]).forEach(p=>{
      const nome = (p.produtoNome||"").trim();
      const dose = Number(p.dosePorHa||0);
      if(!nome || !dose || !area) return;
      consumoPorProduto[nome] = (consumoPorProduto[nome]||0) + (dose * area);
    });
  });
  const topProdutos = Object.entries(consumoPorProduto)
    .map(([nome, qtd])=>({nome, qtd}))
    .sort((a,b)=> b.qtd - a.qtd)
    .slice(0,6);

  // Aplicações por mês (últimos 12)
  const byMonthApl = {};
  aplicacoes.forEach(a=>{
    const m = String(a.data||"").slice(0,7);
    if(!m) return;
    byMonthApl[m] = (byMonthApl[m]||0) + 1;
  });
  const monthsApl = Object.keys(byMonthApl).sort().slice(-12);
  const valuesApl = monthsApl.map(m=>byMonthApl[m]);

  // Combustível por mês (últimos 12) em R$
  const byMonthFuel = {};
  combustivel.forEach(c=>{
    const m = String(c.data||"").slice(0,7);
    if(!m) return;
    const total = (Number(c.litros||0) * Number(c.precoLitro||0));
    byMonthFuel[m] = (byMonthFuel[m]||0) + total;
  });
  const monthsFuel = Object.keys(byMonthFuel).sort().slice(-12);
  const valuesFuel = monthsFuel.map(m=>byMonthFuel[m]);

  // Diesel no estoque (S10/S500)
  const dieselIds = produtos
    .filter(p=>String(p.tipo||"").toLowerCase().includes("combust"))
    .map(p=>p.id);

  const dieselEst = estoque.filter(s=> dieselIds.includes(s.produtoId));
  const dieselTotal = sum(dieselEst, s=>s.qtd);

  const alertas = [];
  if(qtdItensNeg>0) alertas.push({tag:"Estoque crítico", msg:`${qtdItensNeg} item(ns) negativo(s)`, kind:"bad"});
  if(dieselTotal < 500) alertas.push({tag:"Diesel baixo", msg:`Saldo total: ${dieselTotal.toFixed(0)} L`, kind:"warn"});
  if(custoComb30>0) alertas.push({tag:"Combustível 30d", msg:`R$ ${custoComb30.toFixed(2)} (${litros30.toFixed(0)} L)`, kind:"info"});
  if(!alertas.length) alertas.push({tag:"Tudo certo", msg:"Sem alertas críticos no momento", kind:"ok"});

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Área total (talhões)</h3>
        <div class="big">${areaTotal.toFixed(1)} ha</div>
        <div class="sub">Somatório cadastrado</div>
      </div>
      <div class="card">
        <h3>Aplicações (30 dias)</h3>
        <div class="big">${apl30.length}</div>
        <div class="sub"><span class="pill info">Operações recentes</span></div>
      </div>
      <div class="card">
        <h3>Combustível (30 dias)</h3>
        <div class="big">R$ ${custoComb30.toFixed(2)}</div>
        <div class="sub">${litros30.toFixed(0)} L • <span class="pill warn">Custo</span></div>
      </div>
      <div class="card">
        <h3>Diesel em estoque</h3>
        <div class="big">${dieselTotal.toFixed(0)} L</div>
        <div class="sub"><span class="pill ok">S10/S500</span></div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Alertas</h3>
        <div class="hr"></div>
        ${alertas.map(a=>`
          <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
            <span class="pill ${a.kind}">${a.tag}</span>
            <div class="help">${escapeHtml(a.msg)}</div>
          </div>
        `).join("")}
        <div class="hr"></div>
        <div class="help">Próximo nível: custo/ha por talhão (insumos + diesel).</div>
      </div>

      <div class="card">
        <h3>Top insumos (estimativa)</h3>
        <div class="help">Dose/ha × área aplicada (somado)</div>
        <div class="hr"></div>
        ${
          topProdutos.length
            ? topProdutos.map(p=>`
                <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(2,6,23,.06);">
                  <div><b>${escapeHtml(p.nome)}</b></div>
                  <div>${p.qtd.toFixed(2)}</div>
                </div>
              `).join("")
            : `<div class="help">Sem aplicações suficientes para estimar.</div>`
        }
      </div>
    </div>

    <div class="section" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <h3>Aplicações por mês</h3>
        <canvas id="chartApl" height="140"></canvas>
      </div>

      <div class="card">
        <h3>Combustível por mês (R$)</h3>
        <canvas id="chartFuel" height="140"></canvas>
      </div>
    </div>

    <div class="section" style="grid-template-columns: 1fr;">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Últimas aplicações</th></tr>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área (ha)</th><th>Alvo</th><th>Produtos</th>
            </tr>
          </thead>
          <tbody>
            ${
              aplicacoes.slice().reverse().slice(0,8).map(a=>{
                const faz = findNameById(fazendas, a.fazendaId);
                const tal = findNameById(talhoes, a.talhaoId);
                const prds = (a.produtos||[])
                  .filter(p=>p.produtoNome)
                  .map(p=>`${p.produtoNome} (${p.dosePorHa} ${p.unidade||""})`)
                  .join(" + ");
                return `
                  <tr>
                    <td>${escapeHtml(a.data||"")}</td>
                    <td>${escapeHtml(faz)}</td>
                    <td>${escapeHtml(tal)}</td>
                    <td>${Number(a.areaHa||0).toFixed(2)}</td>
                    <td>${escapeHtml(a.alvo||"")}</td>
                    <td>${escapeHtml(prds||"—")}</td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Charts
  const ctxA = document.getElementById("chartApl");
  if(ctxA && window.Chart){
    new Chart(ctxA, {
      type:"bar",
      data:{ labels: monthsApl, datasets:[{ label:"Aplicações", data: valuesApl }] },
      options:{ responsive:true, plugins:{ legend:{ display:false } } }
    });
  }

  const ctxF = document.getElementById("chartFuel");
  if(ctxF && window.Chart){
    new Chart(ctxF, {
      type:"line",
      data:{ labels: monthsFuel, datasets:[{ label:"R$", data: valuesFuel, fill:true }] },
      options:{ responsive:true, plugins:{ legend:{ display:false } } }
    });
  }

  // Export
  const btn = document.getElementById("btnExportOps");
  if(btn){
    btn.addEventListener("click", ()=>{
      const rows = [{
        data: new Date().toISOString(),
        area_total_ha: areaTotal.toFixed(2),
        aplicacoes_30d: apl30.length,
        diesel_total_l: dieselTotal.toFixed(2),
        combustivel_30d_reais: custoComb30.toFixed(2),
        combustivel_30d_litros: litros30.toFixed(2),
        estoque_itens_negativos: qtdItensNeg
      }];
      downloadText(`opscenter-kpis-${nowISO()}.csv`, toCSV(rows));
      toast("Exportado", "KPIs do Ops Center baixados em CSV.");
    });
  }
}

// ---------- Router ----------
function boot(){
  const titles = {
    dashboard:["Dashboard","Visão geral, indicadores e últimos registros"],
    opscenter:["Operations Center","Painel executivo (nível enterprise)"],
    empresas:["Empresas","Cadastro e gestão multiempresa"],
    fazendas:["Fazendas","Cadastro de fazendas"],
    talhoes:["Talhões","Cadastro de talhões e área"],
    produtos:["Produtos","Cadastro de insumos e combustíveis"],
    estoque:["Estoque","Saldos, entradas e furo (negativo permitido)"],
    aplicacoes:["Aplicações","Registro técnico e baixa automática"],
    combustivel:["Combustível","Abastecimentos com baixa no estoque de diesel"],
    clima:["Clima/Chuva","Registro de chuva (mm)"],
    equipe:["Equipe","Operadores e equipe"],
    maquinas:["Máquinas","Cadastro de máquinas"],
    relatorios:["Relatórios","PDF e análises rápidas"],
    config:["Configurações","Backup, reset e evolução"],
  };

  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const t = titles[pageKey] || ["Agro Pro",""];

  mountShell(pageKey, t[0], t[1]);

  if(pageKey==="dashboard") pageDashboard();
  else if(pageKey==="opscenter") pageOpscenter();
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
  else if(pageKey==="config") pageConfig();
  else pageDashboard();
}

document.addEventListener("DOMContentLoaded", boot);
