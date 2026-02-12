/* Agro Pro — Multiempresa / Offline-first (localStorage)
   ✅ Página Combustível
   ✅ Baixa automática de estoque nas Aplicações (pode ficar negativo)
   ✅ Área aplicada (ha) por aplicação (não usa o talhão inteiro)
*/

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

/* ------------------ DB / Seed ------------------ */
function seedDB(){
  const empresaId = uid("emp");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");

  const prd1 = uid("prd");
  const prd2 = uid("prd");

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 1 },
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
      { id: prd1, empresaId, tipo:"Herbicida", nome:"Glifosato 480", ingrediente:"Glifosato", fabricante:"Genérico", registro:"", carenciaDias: 7, reentradaHoras: 24, unidade:"L", obs:"" },
      { id: prd2, empresaId, tipo:"Fungicida", nome:"Triazol+Estrobilurina", ingrediente:"Mistura", fabricante:"Genérico", registro:"", carenciaDias: 14, reentradaHoras: 24, unidade:"L", obs:"" }
    ],
    // ✅ estoque demo já com produtoId e quantidades, para testar baixa
    estoque: [
      { id: uid("stk"), empresaId, produtoId: prd1, deposito:"Central", lote:"A1", validade:"2027-12-31", qtd: 800, unidade:"L", obs:"Demo" },
      { id: uid("stk"), empresaId, produtoId: prd2, deposito:"Central", lote:"B1", validade:"2027-12-31", qtd: 300, unidade:"L", obs:"Demo" }
    ],
    equipe: [
      { id: uid("peq"), empresaId, nome:"Operador 1", funcao:"Tratorista", telefone:"", nr:"", obs:"" }
    ],
    maquinas: [
      { id: uid("maq"), empresaId, nome:"Pulverizador Autopropelido", placa:"", horimetro: 0, capacidadeL: 3000, bicos:"", obs:"" }
    ],
    clima: [
      { id: uid("cli"), empresaId, data: nowISO(), fazendaId, talhaoId, chuvaMm: 12, tempMin: 22, tempMax: 33, umidade: 68, vento: 9, obs:"Chuva isolada à tarde" }
    ],
    aplicacoes: [
      {
        id: uid("apl"),
        empresaId,
        data: nowISO(),
        fazendaId,
        talhaoId,
        areaHa: 10, // ✅ demo: área aplicada separada
        cultura:"Soja",
        alvo:"Plantas daninhas",
        operacao:"Pulverização terrestre",
        maquinaId: "",
        operadorId: "",
        condicoes:{ vento: 8, temp: 31, umidade: 60 },
        caldaLHa: 120,
        velocidadeKmH: 14,
        bico:"Leque 11002",
        pressaoBar: 3,
        produtos: [
          { produtoNome:"Glifosato 480", dosePorHa: 2.0, unidade:"L/ha" }
        ],
        obs:"Aplicação padrão (demo)."
      }
    ],
    combustivel: [
      {
        id: uid("cmb"),
        empresaId,
        data: nowISO(),
        tipo: "Diesel S10",
        posto: "Posto Exemplo",
        maquinaId: "",
        operadorId: "",
        fazendaId,
        talhaoId,
        litros: 120,
        precoLitro: 6.19,
        kmOuHora: 0,
        obs: "Abastecimento demo"
      }
    ]
  };

  Storage.save(db);
  return db;
}

function getDB(){
  let db = Storage.load();
  if(!db) db = seedDB();
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

/* ------------------ UI shell ------------------ */
const PAGES = [
  { href:"index.html", label:"Dashboard", key:"dashboard", icon:"📊" },
  { href:"empresas.html", label:"Empresas", key:"empresas", icon:"🏢" },
  { href:"fazendas.html", label:"Fazendas", key:"fazendas", icon:"🌾" },
  { href:"talhoes.html", label:"Talhões", key:"talhoes", icon:"🧭" },
  { href:"produtos.html", label:"Produtos", key:"produtos", icon:"🧪" },
  { href:"estoque.html", label:"Estoque", key:"estoque", icon:"📦" },
  { href:"aplicacoes.html", label:"Aplicações", key:"aplicacoes", icon:"🚜" },
  { href:"clima.html", label:"Clima/Chuva", key:"clima", icon:"🌧️" },
  { href:"equipe.html", label:"Equipe", key:"equipe", icon:"👷" },
  { href:"maquinas.html", label:"Máquinas", key:"maquinas", icon:"🛠️" },
  { href:"combustivel.html", label:"Combustível", key:"combustivel", icon:"⛽" },
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
            Trocar a empresa muda todos os dados exibidos (fazendas, talhões, estoque, aplicações).
          </div>
        </div>

        <nav class="nav">${nav}</nav>

        <div style="margin-top:14px" class="help">
          <b>Dica:</b> Para gerar PDF, vá em Relatórios e use <b>Imprimir</b>.
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

  document.getElementById("empresaSelect").addEventListener("change", (e)=>{
    setEmpresaId(e.target.value);
    toast("Empresa alterada", "Atualizando a página…");
    setTimeout(()=>location.reload(), 250);
  });

  document.getElementById("btnResetDemo").addEventListener("click", ()=>{
    if(!confirm("Isso vai resetar o banco local e voltar para o demo. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Reset concluído", "Banco local restaurado para o demo.");
    setTimeout(()=>location.reload(), 250);
  });

  document.getElementById("btnBackup").addEventListener("click", ()=>{
    const db = getDB();
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(db, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if(!nome) return;
    const db = getDB();
    const id = uid("emp");
    db.empresas.push({ id, nome, cnpj:"", responsavel:"", cidade:"", uf:"", observacoes:"" });
    setDB(db);
    setEmpresaId(id);
    toast("Empresa criada", "Agora você está nessa empresa.");
    setTimeout(()=>location.reload(), 250);
  });
}

/* ------------------ Helpers ------------------ */
function onlyEmpresa(arr){
  const eid = getEmpresaId();
  return (arr||[]).filter(x => x.empresaId === eid);
}
function findNameById(arr, id, fallback="-"){
  const o = (arr||[]).find(x=>x.id===id);
  return o ? o.nome : fallback;
}
function setTopActions(html){
  const el = document.getElementById("topActions");
  if(el) el.innerHTML = html || "";
}

/* ------------------ Pages ------------------ */
function pageDashboard(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const produtos = onlyEmpresa(db.produtos);
  const aplicacoes = onlyEmpresa(db.aplicacoes);
  const clima = onlyEmpresa(db.clima);
  const combustivel = onlyEmpresa(db.combustivel || []);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a=>a.data===hoje).length;
  const chuvaHoje = clima.filter(c=>c.data===hoje).reduce((s,c)=>s+Number(c.chuvaMm||0),0);
  const combHoje = combustivel.filter(c=>c.data===hoje).reduce((s,c)=>s+(Number(c.litros||0)*Number(c.precoLitro||0)),0);

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
        <div class="sub">Área total: ${talhoes.reduce((s,t)=>s+Number(t.areaHa||0),0).toFixed(1)} ha</div>
      </div>
      <div class="card">
        <h3>Aplicações (hoje)</h3>
        <div class="big">${aplHoje}</div>
        <div class="sub"><span class="pill info">Operações registradas</span></div>
      </div>
      <div class="card">
        <h3>Combustível (hoje)</h3>
        <div class="big">R$ ${combHoje.toFixed(2)}</div>
        <div class="sub"><span class="pill ok">Custo diário</span></div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Resumo rápido</h3>
        <div class="help">
          • Chuva (hoje): <b>${chuvaHoje.toFixed(1)} mm</b><br/>
          • Produtos cadastrados: <b>${produtos.length}</b><br/>
          • Use Aplicações + Estoque para rastreabilidade e controle.
        </div>
        <div class="hr"></div>
        <span class="pill warn">Offline-first</span>
        <span class="pill info">Multiempresa</span>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Últimas aplicações</th>
              <th>Data</th>
              <th>Fazenda</th>
              <th>Talhão</th>
              <th>Área (ha)</th>
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
                  <td>${Number(a.areaHa||0).toFixed(2)}</td>
                  <td>${escapeHtml(a.alvo||"")}</td>
                </tr>
              `).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function crudPage({ entityKey, subtitle, fields, columns, helpers }){
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

  content.innerHTML = `
    <div class="section">
      ${formHtml}
      ${tableHtml}
    </div>
  `;

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

/* --------- Páginas --------- */
function pageEmpresas(){
  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Cadastrar empresa</h3>
        <div class="help">Multiempresa: cada empresa tem seus próprios talhões, estoque e aplicações.</div>
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
    setTimeout(()=>location.reload(), 250);
  };

  window.__delEmp = (id)=>{
    const db2 = getDB();
    if(db2.empresas.length<=1){
      alert("Você precisa ter pelo menos 1 empresa.");
      return;
    }
    if(!confirm("Excluir empresa e TODOS os dados dela (fazendas, talhões, aplicações etc.)?")) return;

    db2.empresas = db2.empresas.filter(x=>x.id!==id);
    const wipe = key => db2[key] = (db2[key]||[]).filter(x=>x.empresaId!==id);

    ["fazendas","talhoes","produtos","estoque","equipe","maquinas","clima","aplicacoes","combustivel"].forEach(wipe);

    if(getEmpresaId()===id){
      db2.session.empresaId = db2.empresas[0].id;
    }
    setDB(db2);
    toast("Excluída", "Empresa removida com dados associados.");
    setTimeout(()=>location.reload(), 250);
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

function pageTalhoes(){
  crudPage({
    entityKey:"talhoes",
    fields:[
      {
        key:"fazendaId", label:"Fazenda", type:"select",
        options:(db)=> onlyEmpresa(db.fazendas).map(f=>({value:f.id, label:f.nome}))
      },
      {key:"nome", label:"Nome do talhão", type:"text"},
      {key:"areaHa", label:"Área (ha)", type:"number"},
      {key:"cultura", label:"Cultura", type:"text", placeholder:"Soja / Milho / Algodão..."},
      {key:"safra", label:"Safra", type:"text", placeholder:"2025/26"},
      {key:"solo", label:"Solo", type:"text", placeholder:"Argiloso / Arenoso..."},
      {key:"coordenadas", label:"Coordenadas/Geo", type:"text", placeholder:"Opcional"},
      {key:"observacoes", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"nome", label:"Talhão"},
      {key:"fazendaId", label:"Fazenda", render:(r,db)=>findNameById(onlyEmpresa(db.fazendas), r.fazendaId)},
      {key:"areaHa", label:"Área (ha)"},
      {key:"cultura", label:"Cultura"},
      {key:"safra", label:"Safra"},
      {key:"solo", label:"Solo"}
    ]
  });
}

function pageProdutos(){
  crudPage({
    entityKey:"produtos",
    subtitle:"Cadastre defensivos, fertilizantes e adjuvantes com carência e reentrada.",
    fields:[
      {key:"tipo", label:"Tipo", type:"text", placeholder:"Herbicida/Fungicida/Inseticida/Fertilizante/Adjuvante"},
      {key:"nome", label:"Nome comercial", type:"text"},
      {key:"ingrediente", label:"Ingrediente ativo", type:"text"},
      {key:"fabricante", label:"Fabricante", type:"text"},
      {key:"registro", label:"Registro/Mapa", type:"text"},
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
      {key:"unidade", label:"Unid."}
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
    subtitle:"Controle por depósito, lote e validade. (Pode ficar negativo se baixar em aplicações).",
    fields:[
      {key:"produtoId", label:"Produto", type:"select",
        options:(db)=> {
          const ps = onlyEmpresa(db.produtos);
          return [{value:"", label:"(Selecione)"}].concat(ps.map(p=>({value:p.id, label:`${p.nome} — ${p.tipo}`})));
        }
      },
      {key:"deposito", label:"Depósito", type:"text", placeholder:"Central / Galpão / Unidade..."},
      {key:"lote", label:"Lote", type:"text"},
      {key:"validade", label:"Validade (YYYY-MM-DD)", type:"text", placeholder:"2027-12-31"},
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

function pageClima(){
  crudPage({
    entityKey:"clima",
    subtitle:"Lançamento manual de chuva e condições (útil para justificar janelas de aplicação).",
    fields:[
      {key:"data", label:"Data", type:"text", placeholder: nowISO()},
      {
        key:"fazendaId", label:"Fazenda", type:"select",
        options:(db)=> onlyEmpresa(db.fazendas).map(f=>({value:f.id, label:f.nome}))
      },
      {
        key:"talhaoId", label:"Talhão (opcional)", type:"select",
        options:(db)=> [{value:"", label:"(Todos/geral)"}].concat(
          onlyEmpresa(db.talhoes).map(t=>({value:t.id, label:t.nome}))
        )
      },
      {key:"chuvaMm", label:"Chuva (mm)", type:"number"},
      {key:"tempMin", label:"Temp min (°C)", type:"number"},
      {key:"tempMax", label:"Temp max (°C)", type:"number"},
      {key:"umidade", label:"Umidade (%)", type:"number"},
      {key:"vento", label:"Vento (km/h)", type:"number"},
      {key:"obs", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"data", label:"Data"},
      {key:"fazendaId", label:"Fazenda", render:(r,db)=>findNameById(onlyEmpresa(db.fazendas), r.fazendaId)},
      {key:"talhaoId", label:"Talhão", render:(r,db)=> r.talhaoId ? findNameById(onlyEmpresa(db.talhoes), r.talhaoId) : "Geral"},
      {key:"chuvaMm", label:"Chuva (mm)"},
      {key:"tempMax", label:"Temp máx"},
      {key:"vento", label:"Vento"}
    ],
    helpers:{ beforeSave:(obj)=>{ if(!obj.data) obj.data = nowISO(); } }
  });
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

/* ✅ Combustível */
function pageCombustivel(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");
  const options = (arr, emptyLabel) => {
    const empty = emptyLabel ? `<option value="">${escapeHtml(emptyLabel)}</option>` : "";
    return empty + arr.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  };

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Registrar abastecimento</h3>
        <div class="help">Vincule com máquina/operador/talhão para custo operacional.</div>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div><small>Tipo</small><input class="input" name="tipo" placeholder="Diesel S10" /></div>
          <div class="full"><small>Posto/Fornecedor</small><input class="input" name="posto" placeholder="Nome do posto / fornecedor" /></div>

          <div><small>Máquina</small><select class="select" name="maquinaId">${options(maquinas, "(opcional)")}</select></div>
          <div><small>Operador</small><select class="select" name="operadorId">${options(equipe, "(opcional)")}</select></div>

          <div><small>Fazenda</small><select class="select" name="fazendaId" required>${options(fazendas)}</select></div>
          <div><small>Talhão</small><select class="select" name="talhaoId" required>${options(talhoes)}</select></div>

          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.01" placeholder="120" required /></div>
          <div><small>Preço por litro (R$)</small><input class="input" name="precoLitro" type="number" step="0.01" placeholder="6.19" required /></div>

          <div class="full"><small>KM / Horímetro (opcional)</small><input class="input" name="kmOuHora" type="number" step="0.01" placeholder="Ex: 1530 (horímetro) ou 45000 (km)" /></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="obs" placeholder="Ex: tanque cheio, deslocamento, serviço etc."></textarea></div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar</button>
          </div>
        </form>

        <div class="hr"></div>
        <div class="help" id="kpis"></div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Máquina</th><th>Operador</th><th>Tipo</th>
              <th>Litros</th><th>R$/L</th><th>Total (R$)</th><th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.combustivel || []);
    const faz2 = onlyEmpresa(db2.fazendas);
    const tal2 = onlyEmpresa(db2.talhoes);
    const maq2 = onlyEmpresa(db2.maquinas);
    const eq2  = onlyEmpresa(db2.equipe);

    const today = new Date();
    const days30 = new Date(today.getTime() - 30*24*60*60*1000);
    const rows30 = rows.filter(r => {
      const d = new Date((r.data || "").slice(0,10));
      return !isNaN(d) && d >= days30;
    });

    const litros30 = rows30.reduce((s,r)=>s+Number(r.litros||0),0);
    const total30  = rows30.reduce((s,r)=>s+(Number(r.litros||0)*Number(r.precoLitro||0)),0);

    document.getElementById("kpis").innerHTML =
      `Últimos 30 dias: <b>${litros30.toFixed(1)} L</b> • Custo: <b>R$ ${total30.toFixed(2)}</b> • Média: <b>R$ ${(litros30? (total30/litros30):0).toFixed(2)}</b>/L`;

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(r=>{
      const total = Number(r.litros||0) * Number(r.precoLitro||0);
      return `
        <tr>
          <td>${escapeHtml(r.data||"")}</td>
          <td>${escapeHtml(findNameById(faz2, r.fazendaId))}</td>
          <td>${escapeHtml(findNameById(tal2, r.talhaoId))}</td>
          <td>${escapeHtml(r.maquinaId ? findNameById(maq2, r.maquinaId) : "—")}</td>
          <td>${escapeHtml(r.operadorId ? findNameById(eq2, r.operadorId) : "—")}</td>
          <td>${escapeHtml(r.tipo||"")}</td>
          <td>${Number(r.litros||0).toFixed(2)}</td>
          <td>${Number(r.precoLitro||0).toFixed(2)}</td>
          <td><b>R$ ${total.toFixed(2)}</b></td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delC('${r.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="10">Sem registros.</td></tr>`;
  }

  window.__delC = (id)=>{
    if(!confirm("Excluir este abastecimento?")) return;
    const db2 = getDB();
    db2.combustivel = (db2.combustivel||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluído","Abastecimento removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);

    const obj = {
      id: uid("cmb"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      tipo: fd.get("tipo") || "Diesel",
      posto: fd.get("posto") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId"),
      litros: Number(fd.get("litros")||0),
      precoLitro: Number(fd.get("precoLitro")||0),
      kmOuHora: Number(fd.get("kmOuHora")||0),
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.combustivel = db2.combustivel || [];
    db2.combustivel.push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo","Abastecimento registrado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.combustivel||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
}

/* ✅ Aplicações + baixa de estoque + área aplicada */
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

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Registrar aplicação</h3>
        <div class="help">
          ✅ Agora você informa <b>Área aplicada (ha)</b> e o sistema dá baixa no estoque automaticamente (pode ficar negativo).
        </div>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>

          <div>
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>
              ${optionList(fazendas)}
            </select>
          </div>

          <div>
            <small>Talhão</small>
            <select class="select" name="talhaoId" required>
              ${optionList(talhoes)}
            </select>
          </div>

          <div><small>Área aplicada (ha)</small><input class="input" name="areaHa" type="number" step="0.01" placeholder="Ex: 12.5" required /></div>

          <div><small>Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>Alvo</small><input class="input" name="alvo" placeholder="Ferrugem / Lagartas / Daninhas..." /></div>
          <div><small>Operação</small><input class="input" name="operacao" placeholder="Pulverização terrestre / Drone..." /></div>

          <div>
            <small>Máquina</small>
            <select class="select" name="maquinaId">
              <option value="">(opcional)</option>
              ${optionList(maquinas)}
            </select>
          </div>

          <div>
            <small>Operador</small>
            <select class="select" name="operadorId">
              <option value="">(opcional)</option>
              ${optionList(equipe)}
            </select>
          </div>

          <div><small>Calda (L/ha)</small><input class="input" name="caldaLHa" type="number" placeholder="120" /></div>
          <div><small>Velocidade (km/h)</small><input class="input" name="velocidadeKmH" type="number" placeholder="14" /></div>
          <div><small>Bico</small><input class="input" name="bico" placeholder="Leque 11002" /></div>
          <div><small>Pressão (bar)</small><input class="input" name="pressaoBar" type="number" placeholder="3" /></div>

          <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" placeholder="8" /></div>
          <div><small>Temperatura (°C)</small><input class="input" name="temp" type="number" placeholder="30" /></div>
          <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" placeholder="60" /></div>

          <div class="full">
            <small>Produtos (até 3 linhas)</small>
            <div class="help">Preencha nome e dose por hectare.</div>
            <div class="hr"></div>

            <div class="formGrid">
              ${[1,2,3].map(i=>`
                <div class="full" style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:10px;">
                  <select class="select" name="p${i}Nome">
                    <option value="">(produto ${i} - opcional)</option>
                    ${produtos.map(p=>`<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)}</option>`).join("")}
                  </select>
                  <input class="input" name="p${i}Dose" type="number" step="0.01" placeholder="Dose/ha" />
                  <input class="input" name="p${i}Un" placeholder="L/ha ou kg/ha" />
                </div>
              `).join("")}
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
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Fazenda</th>
              <th>Talhão</th>
              <th>Área (ha)</th>
              <th>Cultura</th>
              <th>Alvo</th>
              <th>Produtos</th>
              <th>Condições</th>
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
    const rows = onlyEmpresa(db2.aplicacoes||[]);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(a=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), a.fazendaId);
      const tal = findNameById(onlyEmpresa(db2.talhoes), a.talhaoId);
      const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${p.dosePorHa} ${p.unidade})`).join(" + ");
      const cond = a.condicoes ? `V:${a.condicoes.vento} T:${a.condicoes.temp} U:${a.condicoes.umidade}` : "";
      return `
        <tr>
          <td>${escapeHtml(a.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td>${Number(a.areaHa||0).toFixed(2)}</td>
          <td>${escapeHtml(a.cultura||"")}</td>
          <td>${escapeHtml(a.alvo||"")}</td>
          <td>${escapeHtml(prds||"—")}</td>
          <td>${escapeHtml(cond||"—")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delA('${a.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="9">Sem aplicações.</td></tr>`;
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

    const obj = {
      id: uid("apl"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId"),
      areaHa: Number(fd.get("areaHa")||0), // ✅ área aplicada por operação
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
      obs: fd.get("obs") || ""
    };

    [1,2,3].forEach(i=>{
      const nome = fd.get(`p${i}Nome`);
      const dose = fd.get(`p${i}Dose`);
      const un = fd.get(`p${i}Un`);
      if(nome){
        obj.produtos.push({ produtoNome: nome, dosePorHa: Number(dose||0), unidade: un || "" });
      }
    });

    // ✅ Baixa automática no estoque (pode ficar negativo)
    (function baixarEstoquePorAplicacao(){
      const dbX = getDB();
      const area = Number(obj.areaHa || 0);
      if(!area) return;

      const prods = onlyEmpresa(dbX.produtos);
      dbX.estoque = dbX.estoque || [];
      const estoqueEmpresa = onlyEmpresa(dbX.estoque);

      const logs = [];

      (obj.produtos || []).forEach(p=>{
        if(!p.produtoNome) return;

        const prod = prods.find(pp => (pp.nome||"").trim().toLowerCase() === String(p.produtoNome).trim().toLowerCase());
        const dose = Number(p.dosePorHa || 0);
        if(!dose) return;

        const consumo = dose * area; // dose/ha * ha aplicados

        if(prod){
          let item = estoqueEmpresa.find(s => s.produtoId === prod.id);

          // se não existir item de estoque, cria (e vai negativo)
          if(!item){
            item = {
              id: uid("stk"),
              empresaId: getEmpresaId(),
              produtoId: prod.id,
              deposito: "Padrão",
              lote: "",
              validade: "",
              qtd: 0,
              unidade: (prod.unidade || "").trim() || "L",
              obs: "Criado automaticamente pela baixa de aplicação"
            };
            dbX.estoque.push(item);
          }

          item.qtd = Number(item.qtd || 0) - consumo; // ✅ pode ficar negativo
          logs.push(`${prod.nome}: -${consumo.toFixed(2)} ${item.unidade}`);
        } else {
          logs.push(`${p.produtoNome}: (não baixou — não cadastrado em Produtos)`);
        }
      });

      setDB(dbX);

      if(logs.length){
        toast("Estoque atualizado", logs.join(" • "));
      }
    })();

    // salvar aplicação
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
  const combustivel = onlyEmpresa(db.combustivel || []);
  const estoque = onlyEmpresa(db.estoque || []);
  const prods = onlyEmpresa(db.produtos || []);

  setTopActions(`
    <button class="btn" id="btnCSV">Exportar (Apl) CSV</button>
    <button class="btn primary" id="btnPrint">Imprimir / PDF</button>
  `);

  const totalAreaTalhoes = talhoes.reduce((s,t)=>s+Number(t.areaHa||0),0);
  const totalAreaAplicada = aplicacoes.reduce((s,a)=>s+Number(a.areaHa||0),0);

  const ultApl = aplicacoes.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,12);
  const ultClima = clima.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,12);

  const today = new Date();
  const days30 = new Date(today.getTime() - 30*24*60*60*1000);
  const comb30 = combustivel.filter(r=>{
    const d = new Date((r.data||"").slice(0,10));
    return !isNaN(d) && d >= days30;
  });
  const combTotal30 = comb30.reduce((s,r)=>s+(Number(r.litros||0)*Number(r.precoLitro||0)),0);

  const negativos = estoque.filter(s=>Number(s.qtd||0) < 0).length;

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
        <div class="big">${totalAreaTalhoes.toFixed(1)} ha</div>
        <div class="sub">Somatório cadastrado</div>
      </div>
      <div class="card">
        <h3>Área aplicada (total)</h3>
        <div class="big">${totalAreaAplicada.toFixed(1)} ha</div>
        <div class="sub">Somatório das aplicações</div>
      </div>
      <div class="card">
        <h3>Combustível (30d)</h3>
        <div class="big">R$ ${combTotal30.toFixed(2)}</div>
        <div class="sub"><span class="pill warn">Custo operacional</span></div>
      </div>
      <div class="card">
        <h3>Estoque negativo</h3>
        <div class="big">${negativos}</div>
        <div class="sub"><span class="pill bad">Furo de estoque</span></div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="7">Últimas aplicações</th></tr>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Alvo</th><th>Operação</th><th>Produtos</th>
            </tr>
          </thead>
          <tbody>
            ${
              ultApl.map(a=>{
                const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${p.dosePorHa} ${p.unidade})`).join(" + ");
                return `
                  <tr>
                    <td>${escapeHtml(a.data||"")}</td>
                    <td>${escapeHtml(findNameById(fazendas, a.fazendaId))}</td>
                    <td>${escapeHtml(findNameById(talhoes, a.talhaoId))}</td>
                    <td>${Number(a.areaHa||0).toFixed(2)}</td>
                    <td>${escapeHtml(a.alvo||"")}</td>
                    <td>${escapeHtml(a.operacao||"")}</td>
                    <td>${escapeHtml(prds||"—")}</td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="7">Sem registros.</td></tr>`
            }
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
            ${
              ultClima.map(c=>`
                <tr>
                  <td>${escapeHtml(c.data||"")}</td>
                  <td>${escapeHtml(findNameById(fazendas, c.fazendaId))}</td>
                  <td>${escapeHtml(c.talhaoId ? findNameById(talhoes, c.talhaoId) : "Geral")}</td>
                  <td>${escapeHtml(c.chuvaMm)}</td>
                  <td>${escapeHtml(c.tempMax)}</td>
                  <td>${escapeHtml(c.vento)}</td>
                </tr>
              `).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="5">Estoque (resumo)</th></tr>
            <tr><th>Produto</th><th>Depósito</th><th>Lote</th><th>Qtd</th><th>Unid.</th></tr>
          </thead>
          <tbody>
            ${
              estoque.slice().reverse().slice(0,20).map(s=>{
                const p = prods.find(pp=>pp.id===s.produtoId);
                return `
                  <tr>
                    <td>${escapeHtml(p ? p.nome : "(sem produto)")}</td>
                    <td>${escapeHtml(s.deposito||"")}</td>
                    <td>${escapeHtml(s.lote||"")}</td>
                    <td><b>${Number(s.qtd||0).toFixed(2)}</b></td>
                    <td>${escapeHtml(s.unidade||"")}</td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="5">Sem estoque.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Como interpretar</h3>
        <div class="help">
          • O estoque pode ficar <b>negativo</b> para mostrar “furo”.<br/>
          • A baixa usa: <b>dose/ha × área aplicada</b>.<br/>
          • Para baixar corretamente, o produto da aplicação precisa existir em <b>Produtos</b> (mesmo nome).
        </div>
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
          • Use backup para trocar de aparelho sem perder dados.<br/>
          • Importar substitui o banco local atual.
        </div>
      </div>

      <div class="card">
        <h3>Financeiro (próximo passo)</h3>
        <div class="help">
          • Custo/ha: insumo + combustível + mão de obra<br/>
          • Safras e centro de custos<br/>
          • Supabase: login, multiusuário, auditoria
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
        if(!data.empresas || !data.meta){
          alert("Arquivo inválido.");
          return;
        }
        if(!confirm("Importar vai SUBSTITUIR seus dados locais. Continuar?")) return;
        Storage.save(data);
        toast("Importado","Recarregando…");
        setTimeout(()=>location.reload(), 250);
      }catch(e){
        alert("Não foi possível ler o arquivo JSON.");
      }
    };
    input.click();
  });
}

/* ------------------ Boot ------------------ */
function boot(){
  const pageKey = document.body.getAttribute("data-page") || "dashboard";

  const titles = {
    dashboard:["Dashboard","Visão geral, indicadores e últimos registros"],
    empresas:["Empresas","Cadastre e gerencie organizações (multiempresa)"],
    fazendas:["Fazendas","Unidades produtivas por empresa"],
    talhoes:["Talhões","Área, cultura, safra e informações de campo"],
    produtos:["Produtos","Cadastro de defensivos e insumos"],
    estoque:["Estoque","Controle básico por depósito/lote/validade"],
    aplicacoes:["Aplicações","Rastreabilidade completa e baixa automática"],
    clima:["Clima/Chuva","Histórico manual por fazenda/talhão"],
    equipe:["Equipe","Operadores, agrônomos e times de campo"],
    maquinas:["Máquinas","Equipamentos usados nas operações"],
    combustivel:["Combustível","Abastecimentos, custo e vínculo por talhão/máquina"],
    relatorios:["Relatórios","Resumo + impressão/PDF + exportação"],
    config:["Configurações","Backup/restore e preparação para backend"],
  };

  const [t, s] = titles[pageKey] || ["Agro Pro",""];
  renderShell(pageKey, t, s);

  if(pageKey==="dashboard") pageDashboard();
  else if(pageKey==="empresas") pageEmpresas();
  else if(pageKey==="fazendas") pageFazendas();
  else if(pageKey==="talhoes") pageTalhoes();
  else if(pageKey==="produtos") pageProdutos();
  else if(pageKey==="estoque") pageEstoque();
  else if(pageKey==="aplicacoes") pageAplicacoes();
  else if(pageKey==="clima") pageClima();
  else if(pageKey==="equipe") pageEquipe();
  else if(pageKey==="maquinas") pageMaquinas();
  else if(pageKey==="combustivel") pageCombustivel();
  else if(pageKey==="relatorios") pageRelatorios();
  else if(pageKey==="config") pageConfiguracoes();

  toast("Agro Pro", "Sistema carregado. Dados salvos no navegador.");
}

document.addEventListener("DOMContentLoaded", boot); 
