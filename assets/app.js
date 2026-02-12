/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTIEMPRESA)
   + Safras (separação por safra)
   + Financeiro completo + Custo/ha
   + Integrações: Combustível -> Despesa / Aplicação -> Insumos (estimado)
   ============================================================ */

const LS_KEY = "agropro_db_v2";
const LS_ACTIVE_EMP = "agropro_active_empresa_v1";
const LS_ACTIVE_SAFRA = "agropro_active_safra_v1";

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
  { href:"clima.html",        label:"Clima/Chuva",        key:"clima",        icon:"🌧️" },
  { href:"equipe.html",       label:"Equipe",            key:"equipe",       icon:"👷" },
  { href:"maquinas.html",     label:"Máquinas",          key:"maquinas",     icon:"🛠️" },
  { href:"relatorios.html",   label:"Relatórios",        key:"relatorios",   icon:"🧾" },
  { href:"config.html",       label:"Configurações",     key:"config",       icon:"⚙️" },
];

// ---------- Utils ----------
function uid(prefix="id"){ return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }
function nowISO(){
  const d = new Date(); const yyyy=d.getFullYear();
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function toast(title,msg){
  const host=document.querySelector(".toastHost"); if(!host) return;
  const el=document.createElement("div");
  el.className="toast";
  el.innerHTML=`<b>${escapeHtml(title)}</b><p>${escapeHtml(msg)}</p>`;
  host.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(4px)"; },2400);
  setTimeout(()=>{ el.remove(); },3100);
}
function downloadText(filename,text){
  const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function toCSV(rows){
  if(!rows.length) return "";
  const cols=Object.keys(rows[0]);
  const esc=(v)=> `"${String(v??"").replaceAll('"','""')}"`;
  return cols.map(esc).join(",") + "\n" + rows.map(r=>cols.map(c=>esc(r[c])).join(",")).join("\n");
}
function onlyEmpresa(arr){ const eid=getEmpresaId(); return (arr||[]).filter(x=>x.empresaId===eid); }
function onlySafra(arr){
  const sid=getSafraId();
  return (arr||[]).filter(x => (x.safraId||sid) === sid);
}
function findById(arr,id){ return (arr||[]).find(x=>x.id===id); }
function findNameById(arr,id){ const o=findById(arr,id); return o ? (o.nome||o.nomeCurto||o.titulo||"") : ""; }
function sum(arr, fn){ return (arr||[]).reduce((s,x)=> s + (Number(fn(x))||0), 0); }
function inLastNDays(iso, n){
  const today=new Date(); const from=new Date(today.getTime()-n*24*60*60*1000);
  const d=new Date(String(iso||"").slice(0,10));
  return !isNaN(d) && d>=from;
}

// ---------- DB ----------
function getDB(){
  const raw=localStorage.getItem(LS_KEY);
  if(!raw){
    const db=seedDB(); localStorage.setItem(LS_KEY,JSON.stringify(db));
    localStorage.setItem(LS_ACTIVE_EMP, db.empresas[0]?.id || "");
    localStorage.setItem(LS_ACTIVE_SAFRA, db.safras.find(s=>s.empresaId===db.empresas[0].id)?.id || "");
    return db;
  }
  try{
    const db=JSON.parse(raw);
    if(!db.empresas?.length) throw new Error("db inválido");
    // migração leve: garantir arrays
    db.safras = db.safras || [];
    db.financeiro = db.financeiro || [];
    db.produtos = db.produtos || [];
    return db;
  }catch{
    const db=seedDB(); localStorage.setItem(LS_KEY,JSON.stringify(db));
    localStorage.setItem(LS_ACTIVE_EMP, db.empresas[0]?.id || "");
    localStorage.setItem(LS_ACTIVE_SAFRA, db.safras.find(s=>s.empresaId===db.empresas[0].id)?.id || "");
    return db;
  }
}
function setDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function getEmpresaId(){
  const db=getDB();
  let id=localStorage.getItem(LS_ACTIVE_EMP);
  if(!id || !db.empresas.find(e=>e.id===id)){
    id=db.empresas[0]?.id || "";
    localStorage.setItem(LS_ACTIVE_EMP,id);
  }
  // garantir safra ativa dessa empresa
  ensureSafraForEmpresa();
  return id;
}
function setEmpresaId(id){ localStorage.setItem(LS_ACTIVE_EMP,id); ensureSafraForEmpresa(); }

function ensureSafraForEmpresa(){
  const db=getDB();
  const eid=localStorage.getItem(LS_ACTIVE_EMP) || db.empresas[0]?.id || "";
  if(!eid) return;
  db.safras = db.safras || [];
  let saf = db.safras.find(s=>s.empresaId===eid && s.ativa);
  if(!saf){
    // tenta pegar a mais recente
    const list = db.safras.filter(s=>s.empresaId===eid).sort((a,b)=> String(b.inicio||"").localeCompare(String(a.inicio||"")));
    saf = list[0];
  }
  if(!saf){
    const id=uid("saf");
    saf = { id, empresaId:eid, nome:"Safra Atual", cultura:"Soja", inicio:nowISO(), fim:"", ativa:true, obs:"" };
    db.safras.push(saf);
    setDB(db);
  }
  const cur = localStorage.getItem(LS_ACTIVE_SAFRA);
  if(!cur || !db.safras.find(s=>s.id===cur && s.empresaId===eid)){
    localStorage.setItem(LS_ACTIVE_SAFRA, saf.id);
  }
}

function getSafraId(){
  const db=getDB();
  const eid=getEmpresaId();
  let sid=localStorage.getItem(LS_ACTIVE_SAFRA);
  if(!sid || !db.safras.find(s=>s.id===sid && s.empresaId===eid)){
    ensureSafraForEmpresa();
    sid=localStorage.getItem(LS_ACTIVE_SAFRA);
  }
  return sid || "";
}
function setSafraId(id){ localStorage.setItem(LS_ACTIVE_SAFRA, id); }

function resetDemo(){
  const db=seedDB(); setDB(db);
  localStorage.setItem(LS_ACTIVE_EMP, db.empresas[0]?.id || "");
  localStorage.setItem(LS_ACTIVE_SAFRA, db.safras.find(s=>s.empresaId===db.empresas[0].id)?.id || "");
  location.reload();
}
function backupJSON(){
  const db=getDB();
  downloadText(`agropro-backup-${new Date().toISOString()}.json`, JSON.stringify(db,null,2));
  toast("Backup", "Arquivo .json baixado.");
}

// ---------- Seed ----------
function seedDB(){
  const empresaId=uid("emp");
  const empresaId2=uid("emp");

  const safra1=uid("saf");
  const safra2=uid("saf");

  const faz1=uid("faz");
  const tal1=uid("tal");

  const prdDieselS10=uid("prd");
  const prdDieselS500=uid("prd");
  const prdGly=uid("prd");

  const db={
    empresas:[
      { id:empresaId, nome:"Agro Demo LTDA", cnpj:"", cidade:"", uf:"", obs:"" },
      { id:empresaId2, nome:"Anderson lambert", cnpj:"", cidade:"", uf:"", obs:"" },
    ],
    safras:[
      { id:safra1, empresaId, nome:"Soja 2026", cultura:"Soja", inicio: nowISO(), fim:"", ativa:true, obs:"" },
      { id:safra2, empresaId2, nome:"Safra Atual", cultura:"Soja", inicio: nowISO(), fim:"", ativa:true, obs:"" },
    ],
    fazendas:[
      { id:faz1, empresaId, nome:"Fazenda Horizonte", municipio:"", uf:"", obs:"" },
    ],
    talhoes:[
      { id:tal1, empresaId, fazendaId:faz1, nome:"T-12", cultura:"Soja", areaHa:78.5, obs:"" },
    ],
    produtos:[
      // ✅ adicione preçoUnit (R$ por unidade) pra custo de insumo estimado
      { id:prdGly, empresaId, tipo:"Insumo", nome:"Glifosato 480", unidade:"L", precoUnit: 32.90, obs:"" },
      { id:prdDieselS10, empresaId, tipo:"Combustível", nome:"Diesel S10", unidade:"L", precoUnit: 6.19, obs:"" },
      { id:prdDieselS500, empresaId, tipo:"Combustível", nome:"Diesel S500", unidade:"L", precoUnit: 5.99, obs:"" },
    ],
    estoque:[
      { id:uid("stk"), empresaId, safraId:safra1, produtoId:prdGly, qtd:120, unidade:"L", deposito:"Galpão", lote:"", validade:"", obs:"" },
      { id:uid("stk"), empresaId, safraId:safra1, produtoId:prdDieselS10, qtd:2500, unidade:"L", deposito:"Tanque", lote:"", validade:"", obs:"Diesel no tanque" },
      { id:uid("stk"), empresaId, safraId:safra1, produtoId:prdDieselS500, qtd:900, unidade:"L", deposito:"Tanque", lote:"", validade:"", obs:"Diesel no tanque" },
    ],
    equipe:[
      { id:uid("op"), empresaId, nome:"Operador Demo", funcao:"Aplicador", telefone:"", obs:"" },
    ],
    maquinas:[
      { id:uid("maq"), empresaId, nome:"Pulverizador 01", tipo:"Pulverizador", placa:"", obs:"" },
    ],
    aplicacoes:[
      {
        id:uid("apl"),
        empresaId,
        safraId:safra1,
        data:nowISO(),
        fazendaId:faz1,
        talhaoId:tal1,
        areaHa:10,
        alvo:"Plantas daninhas",
        operacao:"Pulverização terrestre",
        maquinaId:"",
        operadorId:"",
        caldaLHa:120,
        velocidade:14,
        pressao:3,
        bico:"Leque 11002",
        vento:8,
        temperatura:30,
        umidade:60,
        obs:"",
        produtos:[
          { produtoId: prdGly, produtoNome:"Glifosato 480", dosePorHa:2.0, unidade:"L/ha" }
        ]
      }
    ],
    combustivel:[
      {
        id:uid("cmb"),
        empresaId,
        safraId:safra1,
        data:nowISO(),
        produtoId: prdDieselS10,
        tipo:"Diesel S10",
        posto:"Posto Exemplo",
        maquinaId:"",
        operadorId:"",
        fazendaId:faz1,
        talhaoId:tal1,
        litros:120,
        precoLitro:6.19,
        kmOuHora:0,
        obs:"Abastecimento demo"
      }
    ],
    chuva:[
      { id:uid("chv"), empresaId, safraId:safra1, data:nowISO(), fazendaId:faz1, mm:12, obs:"" }
    ],
    financeiro:[], // ✅ módulo financeiro
    config:{ empresaId, offlineFirst:true }
  };

  // cria financeiro demo: combustível
  const totalComb = 120 * 6.19;
  db.financeiro.push({
    id: uid("fin"),
    empresaId,
    safraId: safra1,
    data: nowISO(),
    tipo: "Despesa",
    categoria: "Combustível",
    subcategoria: "Diesel S10",
    valor: Number(totalComb.toFixed(2)),
    forma: "—",
    centroTipo: "Máquina",
    fazendaId: faz1,
    talhaoId: tal1,
    maquinaId: "",
    descricao: "Abastecimento demo (gerado automaticamente)",
    origem: "combustivel",
    origemId: db.combustivel[0].id
  });

  // baixa diesel do demo no estoque
  const item = db.estoque.find(s => s.produtoId===prdDieselS10 && s.empresaId===empresaId && s.safraId===safra1);
  if(item) item.qtd = Number(item.qtd||0) - 120;

  // cria custo insumo demo pela aplicação
  const custoInsumo = 2.0 * 10 * 32.90; // dose*area*preco
  db.financeiro.push({
    id: uid("fin"),
    empresaId,
    safraId: safra1,
    data: nowISO(),
    tipo: "Despesa",
    categoria: "Insumos",
    subcategoria: "Glifosato 480",
    valor: Number(custoInsumo.toFixed(2)),
    forma: "—",
    centroTipo: "Talhão",
    fazendaId: faz1,
    talhaoId: tal1,
    maquinaId: "",
    descricao: "Insumos estimados da aplicação demo",
    origem: "aplicacoes",
    origemId: db.aplicacoes[0].id
  });

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
          <small>Safra ativa</small>
          <div style="height:8px"></div>
          <select class="select" id="selSafra"></select>

          <div style="height:10px"></div>
          <div class="row">
            <button class="btn primary" id="btnNovaEmpresa">+ Nova empresa</button>
            <button class="btn danger" id="btnResetDemo">Reset demo</button>
          </div>
          <div style="height:10px"></div>
          <small>Empresa e safra filtram dados exibidos e relatórios.</small>
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

  const db = getDB();

  // empresa
  const selE = document.getElementById("selEmpresa");
  selE.innerHTML = db.empresas.map(e=>`<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join("");
  selE.value = getEmpresaId();
  selE.addEventListener("change", ()=>{
    setEmpresaId(selE.value);
    toast("Empresa ativa","Empresa alterada.");
    setTimeout(()=>location.reload(), 120);
  });

  // safra
  const selS = document.getElementById("selSafra");
  const safrasDaEmpresa = (db.safras||[]).filter(s=>s.empresaId===getEmpresaId());
  selS.innerHTML = safrasDaEmpresa.map(s=>`<option value="${s.id}">${escapeHtml(s.nome)} • ${escapeHtml(s.cultura||"")}</option>`).join("")
    || `<option value="">Sem safra (crie em Safras)</option>`;
  selS.value = getSafraId();
  selS.addEventListener("change", ()=>{
    setSafraId(selS.value);
    toast("Safra ativa","Safra alterada.");
    setTimeout(()=>location.reload(), 120);
  });

  // nav
  const nav = document.getElementById("nav");
  nav.innerHTML = PAGES.map(p=>{
    const active = p.key===pageKey ? "active" : "";
    return `<a class="${active}" href="${p.href}"><span class="ico">${p.icon}</span>${escapeHtml(p.label)}</a>`;
  }).join("");

  // buttons
  document.getElementById("btnBackup").addEventListener("click", backupJSON);
  document.getElementById("btnResetDemo").addEventListener("click", resetDemo);
  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if(!nome) return;
    const db2=getDB();
    const id=uid("emp");
    db2.empresas.push({ id, nome, cnpj:"", cidade:"", uf:"", obs:"" });

    // cria safra inicial
    const sid=uid("saf");
    db2.safras = db2.safras || [];
    db2.safras.push({ id:sid, empresaId:id, nome:"Safra Atual", cultura:"Soja", inicio:nowISO(), fim:"", ativa:true, obs:"" });

    setDB(db2);
    localStorage.setItem(LS_ACTIVE_EMP, id);
    localStorage.setItem(LS_ACTIVE_SAFRA, sid);
    toast("Empresa criada","Safra inicial criada.");
    setTimeout(()=>location.reload(), 160);
  });
}

function setTopActions(html){ const el=document.getElementById("topActions"); if(el) el.innerHTML = html || ""; }

// ---------- Estilos extras pequenos ----------
function ensureExtraStyles(){
  if(document.getElementById("agroExtraStyles")) return;
  const st=document.createElement("style");
  st.id="agroExtraStyles";
  st.textContent=`
    .qtyTag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid var(--line);background: var(--chip);font-weight:800;}
    .qtyTag.neg{border-color: rgba(239,68,68,.35);background: rgba(239,68,68,.10);color:#7f1d1d;}
    .qtyTag.pos{border-color: rgba(22,163,74,.28);background: rgba(22,163,74,.10);color:#14532d;}
    .kpi3{margin-top:14px;display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:12px;}
    @media (max-width: 900px){.kpi3{grid-template-columns:1fr;}}
  `;
  document.head.appendChild(st);
}

// ---------- Páginas básicas (dashboard/ops center mantém) ----------
function pageDashboard(){
  const db=getDB();
  const fazendas=onlyEmpresa(db.fazendas||[]);
  const talhoes=onlyEmpresa(db.talhoes||[]);
  const aplic=onlySafra(onlyEmpresa(db.aplicacoes||[]));
  const chuva=onlySafra(onlyEmpresa(db.chuva||[]));
  const produtos=onlyEmpresa(db.produtos||[]);
  const comb=onlySafra(onlyEmpresa(db.combustivel||[]));
  const fin=onlySafra(onlyEmpresa(db.financeiro||[]));

  const hoje=nowISO();
  const aHoje=aplic.filter(a=>a.data===hoje).length;
  const combHoje=comb.filter(c=>c.data===hoje).reduce((s,c)=> s + (Number(c.litros||0)*Number(c.precoLitro||0)), 0);
  const chHoje=chuva.filter(x=>x.data===hoje).reduce((s,x)=> s + Number(x.mm||0), 0);
  const areaTotal=talhoes.reduce((s,t)=> s + Number(t.areaHa||0), 0);

  const despMes = fin.filter(x=>x.tipo==="Despesa" && String(x.data||"").slice(0,7)===String(hoje).slice(0,7))
    .reduce((s,x)=>s+Number(x.valor||0),0);

  setTopActions(`
    <button class="btn" onclick="location.href='opscenter.html'">Abrir Ops Center</button>
    <button class="btn" onclick="location.href='financeiro.html'">Financeiro</button>
  `);

  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="kpi">
      <div class="card"><h3>Fazendas</h3><div class="big">${fazendas.length}</div><div class="sub">Cadastradas</div></div>
      <div class="card"><h3>Talhões</h3><div class="big">${talhoes.length}</div><div class="sub">Área total: ${areaTotal.toFixed(1)} ha</div></div>
      <div class="card"><h3>Aplicações (hoje)</h3><div class="big">${aHoje}</div><div class="sub"><span class="pill info">Operações</span></div></div>
      <div class="card"><h3>Despesa (mês)</h3><div class="big">R$ ${despMes.toFixed(2)}</div><div class="sub"><span class="pill warn">Financeiro</span></div></div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Resumo rápido</h3>
        <div class="help">
          • Chuva (hoje): <b>${chHoje.toFixed(1)} mm</b><br/>
          • Produtos cadastrados: <b>${produtos.length}</b><br/>
          • Combustível (hoje): <b>R$ ${combHoje.toFixed(2)}</b><br/>
          • Safra ativa filtra seus relatórios.
        </div>
        <div style="height:10px"></div>
        <span class="pill ok">Offline-first</span>
        <span class="pill info">Por safra</span>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Últimas aplicações</th></tr>
            <tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Alvo</th><th>Produtos</th></tr>
          </thead>
          <tbody>
            ${
              aplic.slice().reverse().slice(0,6).map(a=>{
                const faz=findNameById(fazendas,a.fazendaId);
                const tal=findNameById(talhoes,a.talhaoId);
                const prds=(a.produtos||[]).map(p=>`${p.produtoNome} (${p.dosePorHa} ${p.unidade||""})`).join(" + ");
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
}

// ---------- CRUD simples usado por várias páginas ----------
function crudPage({ tableKey, columns, formFields, onBeforeSave }){
  const db=getDB();
  const list=onlySafra(onlyEmpresa(db[tableKey] || []));
  const content=document.getElementById("content");

  setTopActions(`<button class="btn" id="btnExport">Exportar CSV</button>`);

  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Novo registro</h3>
        <form id="formCrud">
          <div class="formGrid">
            ${formFields.map(f=>renderField(f,db)).join("")}
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar</button>
        </form>
        <div style="height:10px"></div>
        <div class="help">Safra ativa: registros serão associados à safra atual.</div>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr>${columns.map(c=>`<th>${escapeHtml(c.label)}</th>`).join("")}<th></th></tr></thead>
          <tbody>
            ${
              list.slice().reverse().map(r=>{
                return `<tr>
                  ${columns.map(c=>{
                    const v=c.render ? c.render(r,db) : (r[c.key] ?? "");
                    const raw=!!c.raw;
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

  document.getElementById("btnExport").addEventListener("click", ()=>{
    downloadText(`${tableKey}-${nowISO()}.csv`, toCSV(list.map(x=>({...x}))));
    toast("Exportado","CSV baixado.");
  });

  content.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=btn.getAttribute("data-del");
      if(!confirm("Excluir este registro?")) return;
      const db2=getDB();
      db2[tableKey]=(db2[tableKey]||[]).filter(x=>x.id!==id);
      setDB(db2);
      toast("Excluído","Registro removido.");
      setTimeout(()=>location.reload(),120);
    });
  });

  document.getElementById("formCrud").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd=new FormData(ev.target);
    const obj={ id:uid(tableKey.slice(0,3)), empresaId:getEmpresaId(), safraId:getSafraId() };

    formFields.forEach(f=>{
      if(f.type==="spacer") return;
      let v=fd.get(f.name);
      if(f.kind==="number") v=Number(v||0);
      obj[f.name]=v ?? "";
    });

    if(onBeforeSave) onBeforeSave(obj,fd);

    const db2=getDB();
    db2[tableKey]=db2[tableKey]||[];
    db2[tableKey].push(obj);
    setDB(db2);
    toast("Salvo","Registro adicionado.");
    setTimeout(()=>location.reload(),120);
  });
}
function renderField(f, db){
  if(f.type==="spacer") return `<div class="full"></div>`;
  const label=`<small>${escapeHtml(f.label||"")}</small>`;
  const cls=f.full?"full":"";
  if(f.kind==="input") return `<div class="${cls}">${label}<input class="input" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder||"")}" /></div>`;
  if(f.kind==="date") return `<div class="${cls}">${label}<input class="input" type="date" name="${escapeHtml(f.name)}" value="${escapeHtml(f.value||nowISO())}" /></div>`;
  if(f.kind==="number") return `<div class="${cls}">${label}<input class="input" type="number" step="${escapeHtml(f.step||"0.01")}" name="${escapeHtml(f.name)}" value="${escapeHtml(f.value||"")}" placeholder="${escapeHtml(f.placeholder||"")}" /></div>`;
  if(f.kind==="textarea") return `<div class="${cls}">${label}<textarea class="textarea" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder||"")}"></textarea></div>`;
  if(f.kind==="select"){
    const opts=(f.optionsFn ? f.optionsFn(db) : (f.options||[]));
    return `<div class="${cls}">${label}<select class="select" name="${escapeHtml(f.name)}">${opts.map(o=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")}</select></div>`;
  }
  return "";
}

// ---------- Safras ----------
function pageSafras(){
  const db=getDB();
  const content=document.getElementById("content");
  const eid=getEmpresaId();
  db.safras=db.safras||[];
  const list=db.safras.filter(s=>s.empresaId===eid).slice().reverse();

  setTopActions(`<button class="btn" id="btnExportSaf">Exportar CSV</button>`);

  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Nova safra</h3>
        <form id="formSaf">
          <div class="formGrid">
            <div class="full"><small>Nome</small><input class="input" name="nome" placeholder="Ex.: Soja 2026" required></div>
            <div><small>Cultura</small><input class="input" name="cultura" placeholder="Ex.: Soja"></div>
            <div><small>Início</small><input class="input" type="date" name="inicio" value="${nowISO()}"></div>
            <div><small>Fim</small><input class="input" type="date" name="fim" value=""></div>
            <div class="full"><small>Obs</small><textarea class="textarea" name="obs" placeholder="anotações..."></textarea></div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar safra</button>
        </form>
        <div style="height:10px"></div>
        <div class="help">Dica: mantenha uma safra ativa por vez. A seleção ao lado define a safra usada no sistema.</div>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th>Cultura</th><th>Início</th><th>Fim</th><th>Ativa</th><th></th></tr></thead>
          <tbody>
            ${
              list.map(s=>`
                <tr>
                  <td><b>${escapeHtml(s.nome)}</b></td>
                  <td>${escapeHtml(s.cultura||"")}</td>
                  <td>${escapeHtml(s.inicio||"")}</td>
                  <td>${escapeHtml(s.fim||"")}</td>
                  <td>${s.ativa ? "✅" : "—"}</td>
                  <td>
                    <button class="btn" data-ativar="${s.id}">Ativar</button>
                    <button class="btn danger" data-del="${s.id}">Excluir</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="6">Sem safras.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btnExportSaf").addEventListener("click", ()=>{
    downloadText(`safras-${nowISO()}.csv`, toCSV(list.map(x=>({...x}))));
    toast("Exportado","CSV baixado.");
  });

  content.querySelectorAll("[data-ativar]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id=b.getAttribute("data-ativar");
      const db2=getDB();
      db2.safras=db2.safras||[];
      db2.safras.forEach(s=>{ if(s.empresaId===eid) s.ativa = (s.id===id); });
      setDB(db2);
      setSafraId(id);
      toast("Safra ativa","Safra ativada.");
      setTimeout(()=>location.reload(),120);
    });
  });

  content.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id=b.getAttribute("data-del");
      if(!confirm("Excluir safra? (Os registros antigos continuam no backup JSON)")) return;
      const db2=getDB();
      db2.safras=(db2.safras||[]).filter(s=>s.id!==id);
      setDB(db2);
      toast("Excluída","Safra removida.");
      setTimeout(()=>location.reload(),120);
    });
  });

  document.getElementById("formSaf").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd=new FormData(ev.target);
    const obj={
      id: uid("saf"),
      empresaId: eid,
      nome: fd.get("nome")||"",
      cultura: fd.get("cultura")||"",
      inicio: fd.get("inicio")||nowISO(),
      fim: fd.get("fim")||"",
      ativa:false,
      obs: fd.get("obs")||""
    };
    const db2=getDB();
    db2.safras=db2.safras||[];
    db2.safras.push(obj);
    setDB(db2);
    toast("Salvo","Safra criada.");
    setTimeout(()=>location.reload(),120);
  });
}

// ---------- Produtos (com preço unitário para custo) ----------
function pageProdutos(){
  crudPage({
    tableKey:"produtos",
    columns:[
      {key:"tipo", label:"Tipo"},
      {key:"nome", label:"Nome"},
      {key:"unidade", label:"Unid."},
      {key:"precoUnit", label:"Preço (R$ / unid)", render:(r)=> Number(r.precoUnit||0).toFixed(2)},
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
      {kind:"number", name:"precoUnit", label:"Preço por unidade (R$)", step:"0.01", placeholder:"Ex.: 32.90"},
      {kind:"textarea", name:"obs", label:"Obs", placeholder:"informações...", full:true},
    ],
  });
}

// ---------- Estoque ----------
function pageEstoque(){
  ensureExtraStyles();
  const db=getDB();
  const produtos=onlyEmpresa(db.produtos||[]);
  crudPage({
    tableKey:"estoque",
    columns:[
      {key:"produtoId", label:"Produto", render:(r,db)=> findNameById(onlyEmpresa(db.produtos||[]), r.produtoId)},
      {key:"deposito", label:"Depósito"},
      {key:"qtd", label:"Qtd", raw:true, render:(r)=>{
        const q=Number(r.qtd||0); return `<span class="qtyTag ${q<0?"neg":"pos"}">${q.toFixed(2)}</span>`;
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
      if(!obj.unidade){
        const p=produtos.find(x=>x.id===obj.produtoId);
        if(p?.unidade) obj.unidade=p.unidade;
      }
    }
  });
}

// ---------- Fazendas / Talhões / Equipe / Máquinas / Chuva ----------
function pageFazendas(){ crudPage({
  tableKey:"fazendas",
  columns:[{key:"nome",label:"Nome"},{key:"municipio",label:"Município"},{key:"uf",label:"UF"},{key:"obs",label:"Obs"}],
  formFields:[
    {kind:"input",name:"nome",label:"Nome",placeholder:"Ex.: Fazenda Horizonte",full:true},
    {kind:"input",name:"municipio",label:"Município",placeholder:"opcional"},
    {kind:"input",name:"uf",label:"UF",placeholder:"ex.: MT"},
    {kind:"textarea",name:"obs",label:"Obs",placeholder:"anotações...",full:true},
  ],
});}
function pageTalhoes(){
  const db=getDB();
  crudPage({
    tableKey:"talhoes",
    columns:[
      {key:"nome",label:"Nome"},
      {key:"fazendaId",label:"Fazenda",render:(r,db)=>findNameById(onlyEmpresa(db.fazendas||[]),r.fazendaId)},
      {key:"cultura",label:"Cultura"},
      {key:"areaHa",label:"Área (ha)",render:(r)=>Number(r.areaHa||0).toFixed(2)},
      {key:"obs",label:"Obs"},
    ],
    formFields:[
      {kind:"select",name:"fazendaId",label:"Fazenda",optionsFn:(db)=>{
        const f=onlyEmpresa(db.fazendas||[]);
        return f.length ? f.map(x=>({value:x.id,label:x.nome})) : [{value:"",label:"Cadastre Fazendas primeiro"}];
      },full:true},
      {kind:"input",name:"nome",label:"Nome",placeholder:"Ex.: T-12"},
      {kind:"input",name:"cultura",label:"Cultura",placeholder:"Ex.: Soja"},
      {kind:"number",name:"areaHa",label:"Área (ha)",step:"0.01",placeholder:"Ex.: 78.5"},
      {kind:"textarea",name:"obs",label:"Obs",placeholder:"anotações...",full:true},
    ],
  });
}
function pageEquipe(){ crudPage({
  tableKey:"equipe",
  columns:[{key:"nome",label:"Nome"},{key:"funcao",label:"Função"},{key:"telefone",label:"Telefone"},{key:"obs",label:"Obs"}],
  formFields:[
    {kind:"input",name:"nome",label:"Nome",placeholder:"Ex.: João",full:true},
    {kind:"input",name:"funcao",label:"Função",placeholder:"Ex.: Operador"},
    {kind:"input",name:"telefone",label:"Telefone",placeholder:"opcional"},
    {kind:"textarea",name:"obs",label:"Obs",placeholder:"anotações...",full:true},
  ],
});}
function pageMaquinas(){ crudPage({
  tableKey:"maquinas",
  columns:[{key:"nome",label:"Nome"},{key:"tipo",label:"Tipo"},{key:"placa",label:"Placa/ID"},{key:"obs",label:"Obs"}],
  formFields:[
    {kind:"input",name:"nome",label:"Nome",placeholder:"Ex.: Pulverizador 01",full:true},
    {kind:"input",name:"tipo",label:"Tipo",placeholder:"Ex.: Pulverizador"},
    {kind:"input",name:"placa",label:"Placa/ID",placeholder:"opcional"},
    {kind:"textarea",name:"obs",label:"Obs",placeholder:"anotações...",full:true},
  ],
});}
function pageClima(){ crudPage({
  tableKey:"chuva",
  columns:[
    {key:"data",label:"Data"},
    {key:"fazendaId",label:"Fazenda",render:(r,db)=>findNameById(onlyEmpresa(db.fazendas||[]),r.fazendaId)},
    {key:"mm",label:"mm",render:(r)=>Number(r.mm||0).toFixed(1)},
    {key:"obs",label:"Obs"},
  ],
  formFields:[
    {kind:"date",name:"data",label:"Data",value:nowISO()},
    {kind:"select",name:"fazendaId",label:"Fazenda",optionsFn:(db)=>{
      const f=onlyEmpresa(db.fazendas||[]);
      return f.length ? f.map(x=>({value:x.id,label:x.nome})) : [{value:"",label:"Cadastre Fazendas primeiro"}];
    }},
    {kind:"number",name:"mm",label:"Chuva (mm)",step:"0.1",placeholder:"Ex.: 12"},
    {kind:"textarea",name:"obs",label:"Obs",placeholder:"anotações...",full:true},
  ],
});}

// ---------- Aplicações (10 linhas) + baixa estoque + financeiro insumos ----------
function pageAplicacoes(){
  const db=getDB();
  const fazendas=onlyEmpresa(db.fazendas||[]);
  const talhoes=onlyEmpresa(db.talhoes||[]);
  const produtos=onlyEmpresa(db.produtos||[]).filter(p=>String(p.tipo||"").toLowerCase()!=="combustível");
  const operadores=onlyEmpresa(db.equipe||[]);
  const maquinas=onlyEmpresa(db.maquinas||[]);

  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const list=onlySafra(onlyEmpresa(db.aplicacoes||[]));

  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Nova aplicação</h3>
        <form id="formApl">
          <div class="formGrid">
            <div><small>Data</small><input class="input" type="date" name="data" value="${nowISO()}" /></div>
            <div><small>Operação</small><input class="input" name="operacao" placeholder="Ex.: Pulverização terrestre" /></div>

            <div><small>Fazenda</small>
              <select class="select" name="fazendaId">${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}</select>
            </div>
            <div><small>Talhão</small>
              <select class="select" name="talhaoId">${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}</select>
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
              <div class="help">A aplicação dará baixa no estoque. Se Produto tiver preço (Produtos → preço), gera despesa estimada.</div>
            </div>

            ${Array.from({length:10},(_,i)=>i+1).map(i=>`
              <div>
                <small>Produto ${i}</small>
                <select class="select" name="p${i}_id">
                  <option value="">(opcional)</option>
                  ${produtos.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join("")}
                </select>
              </div>
              <div><small>Dose/ha</small><input class="input" type="number" step="0.001" name="p${i}_dose" placeholder="Ex.: 2.0" /></div>
              <div><small>Unidade</small><input class="input" name="p${i}_un" placeholder="L/ha ou kg/ha" /></div>
            `).join("")}

            <div class="full"><small>Observações</small><textarea class="textarea" name="obs" placeholder="Deriva, falhas, reentrada, carência..."></textarea></div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar aplicação</button>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Últimas aplicações (safra ativa)</th></tr>
            <tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Alvo</th><th>Produtos</th></tr>
          </thead>
          <tbody>
            ${
              list.slice().reverse().slice(0,10).map(a=>{
                const faz=findNameById(fazendas,a.fazendaId);
                const tal=findNameById(talhoes,a.talhaoId);
                const prds=(a.produtos||[]).map(p=>`${p.produtoNome} (${p.dosePorHa} ${p.unidade||""})`).join(" + ");
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
    const fd=new FormData(ev.target);
    const areaHa=Number(fd.get("areaHa")||0);
    if(!areaHa || areaHa<=0){ toast("Erro","Informe a área aplicada (ha)."); return; }

    const apl={
      id:uid("apl"),
      empresaId:getEmpresaId(),
      safraId:getSafraId(),
      data:fd.get("data")||nowISO(),
      fazendaId:fd.get("fazendaId")||"",
      talhaoId:fd.get("talhaoId")||"",
      areaHa,
      alvo:fd.get("alvo")||"",
      operacao:fd.get("operacao")||"",
      maquinaId:fd.get("maquinaId")||"",
      operadorId:fd.get("operadorId")||"",
      caldaLHa:Number(fd.get("caldaLHa")||0),
      velocidade:Number(fd.get("velocidade")||0),
      pressao:Number(fd.get("pressao")||0),
      bico:fd.get("bico")||"",
      vento:Number(fd.get("vento")||0),
      temperatura:Number(fd.get("temperatura")||0),
      umidade:Number(fd.get("umidade")||0),
      obs:fd.get("obs")||"",
      produtos:[]
    };

    Array.from({length:10},(_,i)=>i+1).forEach(i=>{
      const id=fd.get(`p${i}_id`)||"";
      if(!id) return;
      const dose=Number(fd.get(`p${i}_dose`)||0);
      const un=(fd.get(`p${i}_un`)||"").trim();
      const p=produtos.find(x=>x.id===id);
      apl.produtos.push({
        produtoId:id,
        produtoNome:p? p.nome : "Produto",
        dosePorHa:dose,
        unidade: un || (p?.unidade ? `${p.unidade}/ha` : "")
      });
    });

    const db2=getDB();
    db2.aplicacoes=db2.aplicacoes||[];
    db2.estoque=db2.estoque||[];
    db2.financeiro=db2.financeiro||[];
    db2.aplicacoes.push(apl);

    // baixa estoque + custo estimado
    let custoTotal=0;
    let temPreco=false;

    apl.produtos.forEach(pp=>{
      const dose=Number(pp.dosePorHa||0);
      if(!dose) return;
      const consumo = dose * areaHa;

      // baixa estoque
      let item = db2.estoque.find(s=>s.empresaId===apl.empresaId && s.safraId===apl.safraId && s.produtoId===pp.produtoId);
      if(!item){
        item = { id:uid("stk"), empresaId:apl.empresaId, safraId:apl.safraId, produtoId:pp.produtoId, deposito:"Geral", lote:"", validade:"", qtd:0, unidade:(pp.unidade||"").includes("kg")?"kg":"L", obs:"Criado automaticamente pela baixa de aplicação" };
        db2.estoque.push(item);
      }
      item.qtd = Number(item.qtd||0) - consumo; // permite negativo

      // custo estimado
      const prod = db2.produtos.find(p=>p.id===pp.produtoId && p.empresaId===apl.empresaId);
      const preco = Number(prod?.precoUnit||0);
      if(preco>0){
        temPreco=true;
        custoTotal += (consumo * preco);
      }
    });

    // lança financeiro (insumos estimado)
    db2.financeiro.push({
      id: uid("fin"),
      empresaId: apl.empresaId,
      safraId: apl.safraId,
      data: apl.data,
      tipo: "Despesa",
      categoria: "Insumos",
      subcategoria: temPreco ? "Estimado por aplicação" : "Sem preço (ajustar em Produtos)",
      valor: Number((custoTotal||0).toFixed(2)),
      forma: "—",
      centroTipo: "Talhão",
      fazendaId: apl.fazendaId,
      talhaoId: apl.talhaoId,
      maquinaId: apl.maquinaId,
      descricao: temPreco ? "Gerado automaticamente pela aplicação (preço unitário do produto)." : "Gerado com valor 0. Preencha preço nos Produtos.",
      origem: "aplicacoes",
      origemId: apl.id
    });

    setDB(db2);
    toast("Salvo","Aplicação registrada + estoque atualizado + financeiro lançado.");
    setTimeout(()=>location.reload(), 140);
  });
}

// ---------- Combustível (diesel S10/S500 + baixa estoque + financeiro) ----------
function pageCombustivel(){
  ensureExtraStyles();
  const db=getDB();
  const fazendas=onlyEmpresa(db.fazendas||[]);
  const talhoes=onlyEmpresa(db.talhoes||[]);
  const maquinas=onlyEmpresa(db.maquinas||[]);
  const operadores=onlyEmpresa(db.equipe||[]);
  const produtos=onlyEmpresa(db.produtos||[]);
  const combustiveis=produtos.filter(p=>String(p.tipo||"").toLowerCase().includes("combust"));

  const list=onlySafra(onlyEmpresa(db.combustivel||[]));

  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Novo abastecimento</h3>
        <form id="formCmb">
          <div class="formGrid">
            <div><small>Data</small><input class="input" type="date" name="data" value="${nowISO()}" /></div>
            <div>
              <small>Diesel</small>
              <select class="select" name="produtoId" ${combustiveis.length?"":"disabled"}>
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

            <div><small>Fazenda</small><select class="select" name="fazendaId">${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}</select></div>
            <div><small>Talhão</small><select class="select" name="talhaoId">${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}</select></div>

            <div class="full"><small>Observações</small><textarea class="textarea" name="obs" placeholder="Abastecimento, manutenção, ocorrências..."></textarea></div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar abastecimento</button>
          <div style="height:8px"></div>
          <div class="help">Ao salvar: baixa diesel no estoque + cria despesa no financeiro automaticamente.</div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="7">Últimos abastecimentos (safra ativa)</th></tr>
            <tr><th>Data</th><th>Diesel</th><th>Litros</th><th>R$</th><th>Máquina</th><th>Fazenda</th><th>Talhão</th></tr>
          </thead>
          <tbody>
            ${
              list.slice().reverse().slice(0,12).map(c=>{
                const maq=findNameById(maquinas,c.maquinaId);
                const faz=findNameById(fazendas,c.fazendaId);
                const tal=findNameById(talhoes,c.talhaoId);
                const total=(Number(c.litros||0)*Number(c.precoLitro||0));
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
    const fd=new FormData(ev.target);
    const produtoId=fd.get("produtoId")||"";
    const litros=Number(fd.get("litros")||0);
    if(!produtoId){ toast("Erro","Cadastre Diesel S10/S500 em Produtos (tipo Combustível)."); return; }
    if(!litros || litros<=0){ toast("Erro","Informe os litros abastecidos."); return; }

    const db2=getDB();
    db2.combustivel=db2.combustivel||[];
    db2.estoque=db2.estoque||[];
    db2.financeiro=db2.financeiro||[];

    const prodFuel = db2.produtos.find(p=>p.id===produtoId && p.empresaId===getEmpresaId());
    const precoLitro = Number(fd.get("precoLitro")||0) || Number(prodFuel?.precoUnit||0) || 0;

    const obj={
      id:uid("cmb"),
      empresaId:getEmpresaId(),
      safraId:getSafraId(),
      data:fd.get("data")||nowISO(),
      produtoId,
      tipo: prodFuel ? prodFuel.nome : "Diesel",
      posto:fd.get("posto")||"",
      maquinaId:fd.get("maquinaId")||"",
      operadorId:fd.get("operadorId")||"",
      fazendaId:fd.get("fazendaId")||"",
      talhaoId:fd.get("talhaoId")||"",
      litros,
      precoLitro,
      kmOuHora:Number(fd.get("kmOuHora")||0),
      obs:fd.get("obs")||""
    };

    db2.combustivel.push(obj);

    // baixa estoque diesel (por safra)
    let item = db2.estoque.find(s=>s.empresaId===obj.empresaId && s.safraId===obj.safraId && s.produtoId===produtoId);
    if(!item){
      item = { id:uid("stk"), empresaId:obj.empresaId, safraId:obj.safraId, produtoId, deposito:"Tanque", lote:"", validade:"", qtd:0, unidade:"L", obs:"Criado automaticamente pela baixa de abastecimento" };
      db2.estoque.push(item);
    }
    item.qtd = Number(item.qtd||0) - litros;

    // financeiro: despesa combustível
    const total = litros * precoLitro;
    db2.financeiro.push({
      id: uid("fin"),
      empresaId: obj.empresaId,
      safraId: obj.safraId,
      data: obj.data,
      tipo: "Despesa",
      categoria: "Combustível",
      subcategoria: obj.tipo,
      valor: Number(total.toFixed(2)),
      forma: "—",
      centroTipo: obj.maquinaId ? "Máquina" : "Fazenda",
      fazendaId: obj.fazendaId,
      talhaoId: obj.talhaoId,
      maquinaId: obj.maquinaId,
      descricao: "Gerado automaticamente pelo abastecimento.",
      origem: "combustivel",
      origemId: obj.id
    });

    setDB(db2);
    toast("Salvo", "Abastecimento + estoque + financeiro atualizados.");
    setTimeout(()=>location.reload(), 140);
  });
}

// ---------- Financeiro (módulo completo) ----------
function pageFinanceiro(){
  ensureExtraStyles();
  const db=getDB();
  const fazendas=onlyEmpresa(db.fazendas||[]);
  const talhoes=onlyEmpresa(db.talhoes||[]);
  const maquinas=onlyEmpresa(db.maquinas||[]);
  db.financeiro=db.financeiro||[];

  const fin = onlySafra(onlyEmpresa(db.financeiro)).slice();

  // KPIs
  const desp = fin.filter(x=>x.tipo==="Despesa");
  const rec  = fin.filter(x=>x.tipo==="Receita");

  const totalDesp = sum(desp, x=>x.valor);
  const totalRec  = sum(rec, x=>x.valor);
  const saldo = totalRec - totalDesp;

  // custo/ha baseado em área aplicada
  const apl = onlySafra(onlyEmpresa(db.aplicacoes||[]));
  const areaAplicada = sum(apl, a=>a.areaHa);
  const custoHa = areaAplicada>0 ? (totalDesp / areaAplicada) : 0;

  // despesas por categoria
  const byCat = {};
  desp.forEach(x=>{
    const k = x.categoria || "Outros";
    byCat[k] = (byCat[k]||0) + Number(x.valor||0);
  });
  const cats = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]).slice(0,8);
  const catVals = cats.map(c=>Number(byCat[c]||0));

  // ranking por talhão (despesa)
  const byTal = {};
  desp.forEach(x=>{
    const tid = x.talhaoId || "";
    if(!tid) return;
    byTal[tid] = (byTal[tid]||0) + Number(x.valor||0);
  });
  const rankTal = Object.entries(byTal)
    .map(([id,v])=>({ id, nome: findNameById(talhoes,id), v }))
    .sort((a,b)=>b.v-a.v)
    .slice(0,8);

  // ranking por fazenda
  const byFaz = {};
  desp.forEach(x=>{
    const fid = x.fazendaId || "";
    if(!fid) return;
    byFaz[fid] = (byFaz[fid]||0) + Number(x.valor||0);
  });
  const rankFaz = Object.entries(byFaz)
    .map(([id,v])=>({ id, nome: findNameById(fazendas,id), v }))
    .sort((a,b)=>b.v-a.v)
    .slice(0,8);

  // últimos lançamentos
  const last = fin.slice().sort((a,b)=>String(b.data||"").localeCompare(String(a.data||""))).slice(0,15);

  setTopActions(`
    <button class="btn" id="btnExportFin">Exportar CSV</button>
    <button class="btn" onclick="window.print()">Imprimir</button>
  `);

  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="kpi">
      <div class="card"><h3>Despesas (safra)</h3><div class="big">R$ ${totalDesp.toFixed(2)}</div><div class="sub"><span class="pill bad">Saída</span></div></div>
      <div class="card"><h3>Receitas (safra)</h3><div class="big">R$ ${totalRec.toFixed(2)}</div><div class="sub"><span class="pill ok">Entrada</span></div></div>
      <div class="card"><h3>Saldo (safra)</h3><div class="big">R$ ${saldo.toFixed(2)}</div><div class="sub"><span class="pill info">Resultado</span></div></div>
      <div class="card"><h3>Custo por hectare</h3><div class="big">R$ ${custoHa.toFixed(2)}</div><div class="sub">${areaAplicada.toFixed(2)} ha aplicados</div></div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Novo lançamento</h3>
        <form id="formFin">
          <div class="formGrid">
            <div><small>Data</small><input class="input" type="date" name="data" value="${nowISO()}" /></div>
            <div><small>Tipo</small>
              <select class="select" name="tipo">
                <option value="Despesa">Despesa</option>
                <option value="Receita">Receita</option>
              </select>
            </div>

            <div><small>Categoria</small>
              <select class="select" name="categoria">
                <option>Combustível</option>
                <option>Insumos</option>
                <option>Manutenção</option>
                <option>Mão de obra</option>
                <option>Frete</option>
                <option>Peças</option>
                <option>Serviços</option>
                <option>Outros</option>
              </select>
            </div>
            <div><small>Subcategoria</small><input class="input" name="subcategoria" placeholder="Ex.: Diesel S10 / Herbicidas" /></div>

            <div><small>Valor (R$)</small><input class="input" type="number" step="0.01" name="valor" required /></div>
            <div><small>Forma</small><input class="input" name="forma" placeholder="Pix / Boleto / Cartão" /></div>

            <div><small>Centro de custo</small>
              <select class="select" name="centroTipo">
                <option value="Talhão">Talhão</option>
                <option value="Fazenda">Fazenda</option>
                <option value="Máquina">Máquina</option>
                <option value="Geral">Geral</option>
              </select>
            </div>
            <div><small>Fazenda</small>
              <select class="select" name="fazendaId">
                <option value="">(opcional)</option>
                ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
              </select>
            </div>

            <div><small>Talhão</small>
              <select class="select" name="talhaoId">
                <option value="">(opcional)</option>
                ${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
              </select>
            </div>
            <div><small>Máquina</small>
              <select class="select" name="maquinaId">
                <option value="">(opcional)</option>
                ${maquinas.map(m=>`<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join("")}
              </select>
            </div>

            <div class="full"><small>Descrição</small><textarea class="textarea" name="descricao" placeholder="Nota, fornecedor, observações..."></textarea></div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar lançamento</button>
        </form>
      </div>

      <div class="card">
        <h3>Despesas por categoria</h3>
        <canvas id="chartCat" height="150"></canvas>
        <div class="hr"></div>
        <div class="help">
          Para custo/ha mais real: cadastre preço unitário em Produtos e mantenha abastecimentos com preço/litro.
        </div>
      </div>
    </div>

    <div class="section" style="grid-template-columns:1fr 1fr;">
      <div class="card">
        <h3>Ranking por talhão</h3>
        ${rankTal.length ? rankTal.map(r=>`
          <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(2,6,23,.06);">
            <div><b>${escapeHtml(r.nome||"(sem nome)")}</b></div>
            <div>R$ ${Number(r.v||0).toFixed(2)}</div>
          </div>
        `).join("") : `<div class="help">Sem dados suficientes.</div>`}
      </div>

      <div class="card">
        <h3>Ranking por fazenda</h3>
        ${rankFaz.length ? rankFaz.map(r=>`
          <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(2,6,23,.06);">
            <div><b>${escapeHtml(r.nome||"(sem nome)")}</b></div>
            <div>R$ ${Number(r.v||0).toFixed(2)}</div>
          </div>
        `).join("") : `<div class="help">Sem dados suficientes.</div>`}
      </div>
    </div>

    <div class="section" style="grid-template-columns:1fr;">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="9">Últimos lançamentos (safra ativa)</th></tr>
            <tr>
              <th>Data</th><th>Tipo</th><th>Categoria</th><th>Sub</th><th>Valor</th><th>Centro</th><th>Fazenda</th><th>Talhão</th><th>Máquina</th>
            </tr>
          </thead>
          <tbody>
            ${
              last.map(x=>{
                return `<tr>
                  <td>${escapeHtml(x.data||"")}</td>
                  <td>${escapeHtml(x.tipo||"")}</td>
                  <td>${escapeHtml(x.categoria||"")}</td>
                  <td>${escapeHtml(x.subcategoria||"")}</td>
                  <td>R$ ${Number(x.valor||0).toFixed(2)}</td>
                  <td>${escapeHtml(x.centroTipo||"")}</td>
                  <td>${escapeHtml(findNameById(fazendas,x.fazendaId)||"")}</td>
                  <td>${escapeHtml(findNameById(talhoes,x.talhaoId)||"")}</td>
                  <td>${escapeHtml(findNameById(maquinas,x.maquinaId)||"")}</td>
                </tr>`;
              }).join("") || `<tr><td colspan="9">Sem lançamentos.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // export
  document.getElementById("btnExportFin").addEventListener("click", ()=>{
    downloadText(`financeiro-${nowISO()}.csv`, toCSV(fin.map(x=>({...x}))));
    toast("Exportado","CSV baixado.");
  });

  // salvar lançamento manual
  document.getElementById("formFin").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd=new FormData(ev.target);
    const valor=Number(fd.get("valor")||0);
    if(!valor || valor<=0){ toast("Erro","Informe o valor."); return; }

    const obj={
      id: uid("fin"),
      empresaId: getEmpresaId(),
      safraId: getSafraId(),
      data: fd.get("data")||nowISO(),
      tipo: fd.get("tipo")||"Despesa",
      categoria: fd.get("categoria")||"Outros",
      subcategoria: fd.get("subcategoria")||"",
      valor: Number(valor.toFixed(2)),
      forma: fd.get("forma")||"",
      centroTipo: fd.get("centroTipo")||"Geral",
      fazendaId: fd.get("fazendaId")||"",
      talhaoId: fd.get("talhaoId")||"",
      maquinaId: fd.get("maquinaId")||"",
      descricao: fd.get("descricao")||"",
      origem: "manual",
      origemId: ""
    };

    const db2=getDB();
    db2.financeiro=db2.financeiro||[];
    db2.financeiro.push(obj);
    setDB(db2);
    toast("Salvo","Lançamento registrado.");
    setTimeout(()=>location.reload(),120);
  });

  // gráfico categoria
  const ctx=document.getElementById("chartCat");
  if(ctx && window.Chart){
    new Chart(ctx,{
      type:"bar",
      data:{ labels:cats, datasets:[{ label:"R$", data:catVals }] },
      options:{ responsive:true, plugins:{ legend:{ display:false } } }
    });
  }
}

// ---------- Ops Center (agora inclui KPI financeiro / custo/ha) ----------
function pageOpscenter(){
  const db=getDB();
  const talhoes=onlyEmpresa(db.talhoes||[]);
  const aplicacoes=onlySafra(onlyEmpresa(db.aplicacoes||[]));
  const combustivel=onlySafra(onlyEmpresa(db.combustivel||[]));
  const estoque=onlySafra(onlyEmpresa(db.estoque||[]));
  const produtos=onlyEmpresa(db.produtos||[]);
  const fin=onlySafra(onlyEmpresa(db.financeiro||[]));

  const areaTotal = sum(talhoes, t=>t.areaHa);
  const areaAplicada = sum(aplicacoes, a=>a.areaHa);

  const desp = fin.filter(x=>x.tipo==="Despesa");
  const totalDesp = sum(desp, x=>x.valor);
  const custoHa = areaAplicada>0 ? totalDesp/areaAplicada : 0;

  const litros30 = sum(combustivel.filter(c=>inLastNDays(c.data,30)), c=>c.litros);
  const custoComb30 = sum(combustivel.filter(c=>inLastNDays(c.data,30)), c=>Number(c.litros||0)*Number(c.precoLitro||0));

  const dieselIds = produtos.filter(p=>String(p.tipo||"").toLowerCase().includes("combust")).map(p=>p.id);
  const dieselTotal = sum(estoque.filter(s=>dieselIds.includes(s.produtoId)), s=>s.qtd);

  setTopActions(`
    <button class="btn" onclick="location.href='financeiro.html'">Financeiro</button>
    <button class="btn" onclick="location.href='index.html'">Voltar</button>
  `);

  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="kpi">
      <div class="card"><h3>Área total</h3><div class="big">${areaTotal.toFixed(1)} ha</div><div class="sub">Talhões cadastrados</div></div>
      <div class="card"><h3>Área aplicada</h3><div class="big">${areaAplicada.toFixed(1)} ha</div><div class="sub">Base custo/ha</div></div>
      <div class="card"><h3>Despesas (safra)</h3><div class="big">R$ ${totalDesp.toFixed(2)}</div><div class="sub"><span class="pill warn">Financeiro</span></div></div>
      <div class="card"><h3>Custo/ha</h3><div class="big">R$ ${custoHa.toFixed(2)}</div><div class="sub">Por área aplicada</div></div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Alertas</h3>
        <div class="hr"></div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
          <span class="pill ${dieselTotal<500 ? "warn":"ok"}">Diesel</span>
          <div class="help">Saldo total: ${dieselTotal.toFixed(0)} L</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
          <span class="pill info">Combustível 30d</span>
          <div class="help">R$ ${custoComb30.toFixed(2)} • ${litros30.toFixed(0)} L</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <span class="pill ${estoque.some(s=>Number(s.qtd||0)<0) ? "bad":"ok"}">Estoque</span>
          <div class="help">${estoque.filter(s=>Number(s.qtd||0)<0).length} item(ns) negativos</div>
        </div>
      </div>

      <div class="card">
        <h3>Atalho estratégico</h3>
        <div class="help">
          Para custo/ha virar “real”:<br/>
          1) Preencha <b>preço unitário</b> nos Produtos<br/>
          2) Cadastre despesas de manutenção e mão de obra no Financeiro
        </div>
      </div>
    </div>
  `;
}

// ---------- Relatórios / Config ----------
function pageRelatorios(){
  ensureExtraStyles();
  const db=getDB();
  const estoque=onlySafra(onlyEmpresa(db.estoque||[]));
  const prods=onlyEmpresa(db.produtos||[]);
  const neg = estoque.filter(s=>Number(s.qtd||0)<0).map(s=>{
    const p=prods.find(pp=>pp.id===s.produtoId);
    return { produto:(p?p.nome:"(sem produto)"), saldo:Number(s.qtd||0), unidade:(s.unidade||p?.unidade||"") };
  });

  setTopActions(`<button class="btn" onclick="window.print()">Imprimir</button>`);

  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Relatórios</h3>
        <div class="help">Use <b>Imprimir</b> do navegador para gerar PDF.</div>
      </div>

      <div class="card">
        <h3>Furo de estoque</h3>
        <div class="big">${neg.length}</div>
        <div class="sub">Itens negativos na safra</div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead><tr><th>Produto</th><th>Saldo</th><th>Unid.</th></tr></thead>
          <tbody>
            ${
              (neg.length?neg:[{produto:"Sem furo",saldo:0,unidade:""}]).map(r=>`
                <tr>
                  <td><b>${escapeHtml(r.produto)}</b></td>
                  <td><span class="qtyTag ${r.saldo<0?"neg":"pos"}">${Number(r.saldo||0).toFixed(2)}</span></td>
                  <td>${escapeHtml(r.unidade||"")}</td>
                </tr>
              `).join("")
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Financeiro</h3>
        <div class="help">Use Financeiro para custo/ha e resultado por safra.</div>
      </div>
    </div>
  `;
}
function pageConfig(){
  setTopActions(`<button class="btn" onclick="backupJSON()">Backup</button>`);
  const content=document.getElementById("content");
  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Configurações</h3>
        <div class="help">
          Offline-first (salva no navegador).<br/>
          Evolução natural: Supabase para multiusuário e nuvem.
        </div>
        <div style="height:12px"></div>
        <button class="btn danger" onclick="resetDemo()">Reset demo</button>
      </div>
      <div class="card">
        <h3>Safra</h3>
        <div class="help">
          A safra ativa filtra dados e relatórios.<br/>
          Crie e ative safras em <b>Safras</b>.
        </div>
      </div>
    </div>
  `;
}

// ---------- Empresas (mantém simples) ----------
function pageEmpresas(){
  const db=getDB();
  const content=document.getElementById("content");
  setTopActions(`<button class="btn" id="btnExportEmp">Exportar CSV</button>`);
  content.innerHTML=`
    <div class="section">
      <div class="card">
        <h3>Nova empresa</h3>
        <form id="formEmp">
          <div class="formGrid">
            <div class="full"><small>Nome</small><input class="input" name="nome" required /></div>
            <div><small>CNPJ</small><input class="input" name="cnpj" /></div>
            <div><small>Cidade</small><input class="input" name="cidade" /></div>
            <div><small>UF</small><input class="input" name="uf" /></div>
            <div class="full"><small>Obs</small><textarea class="textarea" name="obs"></textarea></div>
          </div>
          <div style="height:10px"></div>
          <button class="btn primary" type="submit">Salvar</button>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th>CNPJ</th><th>Cidade</th><th>UF</th><th></th></tr></thead>
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
      const id=btn.getAttribute("data-del");
      if(!confirm("Excluir empresa?")) return;
      const db2=getDB();
      db2.empresas=db2.empresas.filter(e=>e.id!==id);
      setDB(db2);
      toast("Excluída","Empresa removida.");
      setTimeout(()=>location.reload(),120);
    });
  });

  document.getElementById("formEmp").addEventListener("submit",(ev)=>{
    ev.preventDefault();
    const fd=new FormData(ev.target);
    const obj={ id:uid("emp"), nome:fd.get("nome")||"", cnpj:fd.get("cnpj")||"", cidade:fd.get("cidade")||"", uf:fd.get("uf")||"", obs:fd.get("obs")||"" };
    const db2=getDB();
    db2.empresas.push(obj);
    setDB(db2);
    toast("Salvo","Empresa criada.");
    setTimeout(()=>location.reload(),120);
  });
}

// ---------- Router ----------
function boot(){
  const titles={
    dashboard:["Dashboard","Visão geral da safra ativa"],
    opscenter:["Operations Center","Painel executivo por safra"],
    financeiro:["Financeiro","Custo/ha, despesas e resultado por safra"],
    safras:["Safras","Cadastro e ativação de safras"],
    empresas:["Empresas","Cadastro e gestão multiempresa"],
    fazendas:["Fazendas","Cadastro de fazendas"],
    talhoes:["Talhões","Cadastro de talhões e área"],
    produtos:["Produtos","Cadastro com preço por unidade"],
    estoque:["Estoque","Saldos e furo (negativo permitido)"],
    aplicacoes:["Aplicações","Baixa estoque + insumos no financeiro"],
    combustivel:["Combustível","Baixa diesel + despesa automática"],
    clima:["Clima/Chuva","Registro de chuva (mm)"],
    equipe:["Equipe","Operadores e equipe"],
    maquinas:["Máquinas","Cadastro de máquinas"],
    relatorios:["Relatórios","PDF e análises rápidas"],
    config:["Configurações","Backup e reset"],
  };

  const pageKey=document.body.getAttribute("data-page") || "dashboard";
  const t=titles[pageKey] || ["Agro Pro",""];

  mountShell(pageKey, t[0], t[1]);

  if(pageKey==="dashboard") pageDashboard();
  else if(pageKey==="opscenter") pageOpscenter();
  else if(pageKey==="financeiro") pageFinanceiro();
  else if(pageKey==="safras") pageSafras();
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
