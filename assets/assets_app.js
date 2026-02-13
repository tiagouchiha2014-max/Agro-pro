/* Agro Pro — Multiempresa / Offline-first (localStorage)
   + Ops Center
   + Preço nos produtos
   + Baixa automática no estoque (por aplicação)
   + Baixa automática de combustível
   + Centro de custos por talhão (tabela + filtro + CSV)

   Dica: depois você pluga Supabase substituindo Storage.* por chamadas da API.
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

/* ------------------ Helpers (datas / números / custos) ------------------ */
function toNumber(v){ return Number(v || 0); }

function parseISO(d){
  const [y,m,day] = String(d||"").split("-").map(Number);
  if(!y||!m||!day) return null;
  return new Date(y, m-1, day, 0,0,0,0);
}

function inRangeISO(dateISO, startISO, endISO){
  const d = parseISO(dateISO);
  const s = startISO ? parseISO(startISO) : null;
  const e = endISO ? parseISO(endISO) : null;
  if(!d) return false;
  if(s && d < s) return false;
  if(e && d > e) return false;
  return true;
}

function getProdutoByNome(db, nome){
  const ps = onlyEmpresa(db.produtos || []);
  return ps.find(p => (p.nome || "").trim().toLowerCase() === (nome || "").trim().toLowerCase()) || null;
}

// Deduz quantidade do estoque por produto (FIFO por validade)
function deduzEstoqueProduto(db, produtoId, qtd){
  let restante = toNumber(qtd);
  if(restante <= 0) return { ok:true, deduzido:0 };

  const itens = onlyEmpresa(db.estoque || [])
    .filter(e => e.produtoId === produtoId)
    .slice()
    .sort((a,b)=> String(a.validade||"").localeCompare(String(b.validade||""))); // FIFO por validade

  let deduzido = 0;
  for(const it of itens){
    if(restante <= 0) break;
    const disp = toNumber(it.qtd);
    if(disp <= 0) continue;
    const take = Math.min(disp, restante);
    it.qtd = disp - take;
    restante -= take;
    deduzido += take;
  }

  return { ok: restante <= 0, deduzido, faltou: restante };
}

function getCombustivelAtivo(db){
  const cs = onlyEmpresa(db.combustivel || []);
  return cs[0] || null; // simples: primeiro tanque cadastrado
}

function deduzCombustivel(db, litros){
  const c = getCombustivelAtivo(db);
  const L = toNumber(litros);
  if(!c || L<=0) return { ok:true, deduzido:0, precoLitro: toNumber(c?.precoLitro||0) };

  const disp = toNumber(c.qtdLitros);
  const take = Math.min(disp, L);
  c.qtdLitros = disp - take;

  return { ok: take >= L, deduzido: take, faltou: Math.max(0, L - take), precoLitro: toNumber(c.precoLitro||0) };
}

function calcCustoAplicacao(db, apl){
  // custo de produtos
  let custoProdutos = 0;
  for(const p of (apl.produtos||[])){
    const prod = getProdutoByNome(db, p.produtoNome);
    const preco = toNumber(prod?.precoUnit || 0);
    const qtdTotal = toNumber(p.qtdTotal || 0);
    custoProdutos += qtdTotal * preco;
  }

  // combustível
  const precoL = toNumber(apl.combustivel?.precoLitro || 0);
  const litros = toNumber(apl.combustivel?.litros || 0);
  const custoComb = litros * precoL;

  // extras
  const maoObra = toNumber(apl.custos?.maoObra || 0);
  const maquina = toNumber(apl.custos?.maquina || 0);
  const outros = toNumber(apl.custos?.outros || 0);

  const total = custoProdutos + custoComb + maoObra + maquina + outros;
  const area = Math.max(1, toNumber(apl.areaHa || 0));
  const porHa = total / area;

  return { custoProdutos, custoComb, maoObra, maquina, outros, total, porHa };
}

/* ------------------ DB / Seed ------------------ */
function seedDB(){
  const empresaId = uid("emp");
  const fazendaId = uid("faz");
  const talhaoId = uid("tal");

  const db = {
    meta: { createdAt: new Date().toISOString(), version: 2 },
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
      { id: uid("prd"), empresaId, tipo:"Herbicida", nome:"Glifosato 480", ingrediente:"Glifosato", fabricante:"Genérico", registro:"", carenciaDias: 7, reentradaHoras: 24, unidade:"L", precoUnit: 22.50, obs:"" },
      { id: uid("prd"), empresaId, tipo:"Fungicida", nome:"Triazol+Estrobilurina", ingrediente:"Mistura", fabricante:"Genérico", registro:"", carenciaDias: 14, reentradaHoras: 24, unidade:"L", precoUnit: 85.00, obs:"" }
    ],
    estoque: [
      { id: uid("stk"), empresaId, produtoId:null, deposito:"Central", lote:"", validade:"", qtd:0, unidade:"", obs:"(preencha via página Estoque)" }
    ],
    equipe: [
      { id: uid("peq"), empresaId, nome:"Operador 1", funcao:"Tratorista", telefone:"", nr:"", obs:"" }
    ],
    maquinas: [
      { id: uid("maq"), empresaId, nome:"Pulverizador Autopropelido", placa:"", horimetro: 0, capacidadeL: 3000, bicos:"", obs:"" }
    ],
    combustivel: [
      { id: uid("cmb"), empresaId, tipo:"Diesel S10", deposito:"Tanque Central", qtdLitros: 5000, precoLitro: 6.20, obs:"" }
    ],
    abastecimentos: [
      // { id, empresaId, data, maquinaId, litros, precoLitro, obs }
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
        cultura:"Soja",
        alvo:"Plantas daninhas",
        operacao:"Pulverização terrestre",
        maquinaId: "",
        operadorId: "",
        condicoes:{ vento: 8, temp: 31, umidade: 60 },
        areaHa: 78.5,
        caldaLHa: 120,
        velocidadeKmH: 14,
        bico:"Leque 11002",
        pressaoBar: 3,
        combustivel: { litros: 120, precoLitro: 6.20 },
        custos: { maoObra: 0, maquina: 0, outros: 0 },
        produtos: [
          { produtoNome:"Glifosato 480", dosePorHa: 2.0, unidade:"L/ha", qtdTotal: 2.0*78.5 }
        ],
        custoCalc: { custoProdutos: 0, custoComb: 0, maoObra:0, maquina:0, outros:0, total:0, porHa:0 },
        obs:"Aplicação padrão (demo)."
      }
    ]
  };

  // normaliza custo demo
  db.aplicacoes[0].custoCalc = calcCustoAplicacao(db, db.aplicacoes[0]);

  Storage.save(db);
  return db;
}

function getDB(){
  let db = Storage.load();
  if(!db) db = seedDB();

  // migração leve (se já tinha banco v1)
  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 2 };
  db.combustivel = db.combustivel || [];
  db.abastecimentos = db.abastecimentos || [];
  db.produtos = db.produtos || [];
  db.aplicacoes = db.aplicacoes || [];

  // garante campos novos
  for(const p of db.produtos){
    if(p.precoUnit === undefined) p.precoUnit = 0;
  }
  for(const a of db.aplicacoes){
    if(a.areaHa === undefined) a.areaHa = 0;
    if(!a.combustivel) a.combustivel = { litros:0, precoLitro:0 };
    if(!a.custos) a.custos = { maoObra:0, maquina:0, outros:0 };
    if(!a.custoCalc) a.custoCalc = calcCustoAplicacao(db, a);
  }

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

/* ------------------ UI shell ------------------ */
const PAGES = [
  { href:"index.html", label:"Dashboard", key:"dashboard", icon:"📊" },
  { href:"opscenter.html", label:"Ops Center", key:"ops", icon:"🎯" },
  { href:"custos.html", label:"Custos por Talhão", key:"custos", icon:"💰" },
  { href:"empresas.html", label:"Empresas", key:"empresas", icon:"🏢" },
  { href:"fazendas.html", label:"Fazendas", key:"fazendas", icon:"🌾" },
  { href:"talhoes.html", label:"Talhões", key:"talhoes", icon:"🧭" },
  { href:"produtos.html", label:"Produtos", key:"produtos", icon:"🧪" },
  { href:"estoque.html", label:"Estoque", key:"estoque", icon:"📦" },
  { href:"aplicacoes.html", label:"Aplicações", key:"aplicacoes", icon:"🚜" },
  { href:"clima.html", label:"Clima/Chuva", key:"clima", icon:"🌧️" },
  { href:"equipe.html", label:"Equipe", key:"equipe", icon:"👷" },
  { href:"maquinas.html", label:"Máquinas", key:"maquinas", icon:"🛠️" },
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

// ===== Formatação BR (vírgula / moeda) =====
const FMT_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function brl(v){
  return FMT_BRL.format(Number(v || 0));
}

function num(v, casas=2){
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  }).format(Number(v || 0));
}

// Compat
function kmoney(n){ return num(n, 2); }
function kbrl(n){ return brl(n); }

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

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a=>a.data===hoje).length;
  const chuvaHoje = clima.filter(c=>c.data===hoje).reduce((s,c)=>s+Number(c.chuvaMm||0),0);

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
        <h3>Chuva (hoje)</h3>
        <div class="big">${chuvaHoje.toFixed(1)} mm</div>
        <div class="sub"><span class="pill ok">Lançamento manual</span></div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Checklist Agro (operacional)</h3>
        <div class="help">
          • Conferir estoque e validade<br/>
          • Registrar chuva/vento do dia<br/>
          • Validar talhão/cultura/safra<br/>
          • Registrar aplicação (produto, dose, calda, máquina, operador)<br/>
          • Anotar ocorrências (deriva, falhas, reentrada, carência)<br/>
          • Emitir relatório e assinar (PDF)
        </div>
        <div class="hr"></div>
        <span class="pill warn">Pronto para auditoria</span>
        <span class="pill info">Rastreabilidade</span>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Últimas aplicações</th>
              <th>Data</th>
              <th>Fazenda</th>
              <th>Talhão</th>
              <th>Alvo</th>
              <th>Operação</th>
              <th>Custo</th>
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
                  <td>${escapeHtml(a.alvo||"")}</td>
                  <td>${escapeHtml(a.operacao||"")}</td>
                  <td><b>${escapeHtml(kbrl(a.custoCalc?.total||0))}</b></td>
                </tr>
              `).join("") || `<tr><td colspan="7">Sem registros.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>Produtos cadastrados</h3>
        <div class="big">${produtos.length}</div>
        <div class="sub">Defensivos, fertilizantes, adjuvantes</div>
        <div class="hr"></div>
        <a class="btn primary" href="produtos.html">Gerenciar produtos</a>
      </div>

      <div class="card">
        <h3>Próximos passos</h3>
        <div class="help">
          Se quiser, eu adapto este sistema para o seu fluxo real:<br/>
          • Multiusuário (login) • Permissões (admin/operador) • Supabase/Postgres<br/>
          • Mapas/Geo (talhão) • Upload de receituário/notas • Painel de custo por ha
        </div>
      </div>
    </div>
  `;
}

function crudPage({
  entityKey, title, subtitle,
  fields,
  columns,
  helpers
}){
  const db = getDB();
  const eid = getEmpresaId();
  const arr = db[entityKey] || [];
  const list = onlyEmpresa(arr);

  setTopActions(`
    <button class="btn" id="btnExportCSV">Exportar CSV</button>
  `);

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

/* --------- Páginas específicas --------- */
function pageEmpresas(){
  const db = getDB();
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
    ["fazendas","talhoes","produtos","estoque","equipe","maquinas","clima","aplicacoes","combustivel","abastecimentos"].forEach(wipe);

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
      {key:"areaHa", label:"Área (ha)", render:(r)=> num(r.areaHa,1)},
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
      {key:"areaHa", label:"Área (ha)", render:(r)=> num(r.areaHa,2)},
      {key:"cultura", label:"Cultura"},
      {key:"safra", label:"Safra"},
      {key:"solo", label:"Solo"}
    ]
  });
}

function pageProdutos(){
  crudPage({
    entityKey:"produtos",
    subtitle:"Cadastre defensivos e insumos com carência, reentrada e preço unitário.",
    fields:[
      {key:"tipo", label:"Tipo", type:"text", placeholder:"Herbicida/Fungicida/Inseticida/Fertilizante/Adjuvante"},
      {key:"nome", label:"Nome comercial", type:"text"},
      {key:"ingrediente", label:"Ingrediente ativo", type:"text"},
      {key:"fabricante", label:"Fabricante", type:"text"},
      {key:"registro", label:"Registro/Mapa", type:"text"},
      {key:"carenciaDias", label:"Carência (dias)", type:"number"},
      {key:"reentradaHoras", label:"Reentrada (horas)", type:"number"},
      {key:"unidade", label:"Unidade padrão", type:"text", placeholder:"L / kg"},
      {key:"precoUnit", label:"Preço unit. (R$/unidade)", type:"number"},
      {key:"obs", label:"Observações", type:"textarea", full:true}
    ],
    columns:[
      {key:"tipo", label:"Tipo"},
      {key:"nome", label:"Produto"},
      {key:"ingrediente", label:"Ingrediente"},
      {key:"carenciaDias", label:"Carência (d)"},
      {key:"reentradaHoras", label:"Reentrada (h)"},
      {key:"unidade", label:"Unid."},
      {key:"precoUnit", label:"Preço", render:(r)=> kbrl(r.precoUnit||0)}
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
    subtitle:"Controle por depósito, lote e validade. (Quantidades são informativas/offline).",
    fields:[
      {key:"produtoId", label:"Produto", type:"select",
        options:(db)=> {
          const ps = onlyEmpresa(db.produtos);
          return [{value:"", label:"(Selecione)"}].concat(ps.map(p=>({value:p.id, label:`${p.nome} — ${p.tipo}`})));
        }
      },
      {key:"deposito", label:"Depósito", type:"text", placeholder:"Central / Galpão / Unidade..."},
      {key:"lote", label:"Lote", type:"text"},
      {key:"validade", label:"Validade (YYYY-MM-DD)", type:"text", placeholder:"2026-12-31"},
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
      {key:"qtd", label:"Qtd", render:(r)=> num(r.qtd,2)},
      {key:"unidade", label:"Unid."}
    ]
  });

  toast("Dica de estoque", "Você pode exportar CSV para enviar ao gestor.");
}

function pageClima(){
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
              ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
            </select>
          </div>

          <div>
            <small>Talhão</small>
            <select class="select" name="talhaoId">
              <option value="">(Geral / sem talhão)</option>
              ${talhoes.map(t=>`<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
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

        <div class="hr"></div>
        <div class="help">
          <b>Dica:</b> Para ver o acumulado por talhão, use a tabela “Acumulado por talhão” ao lado.
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Talhão</th>
              <th>Fazenda</th>
              <th>Área (ha)</th>
              <th>Acumulado (mm)</th>
              <th>Última data</th>
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
            <th>Data</th>
            <th>Fazenda</th>
            <th>Talhão</th>
            <th>Chuva (mm)</th>
            <th>Temp máx</th>
            <th>Vento</th>
            <th>Obs</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  function inLastDays(recDateISO, days){
    const dt = parseISO(recDateISO);
    if(!dt) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const min = new Date(start.getTime() - (days-1)*24*60*60*1000);
    return dt >= min && dt <= start;
  }

  function calcKPIs(rows){
    const hoje = nowISO();
    const chuvaHoje = rows.filter(r=>r.data===hoje).reduce((s,x)=>s+Number(x.chuvaMm||0),0);
    const chuva7d = rows.filter(r=>inLastDays(r.data, 7)).reduce((s,x)=>s+Number(x.chuvaMm||0),0);
    const chuva30d = rows.filter(r=>inLastDays(r.data, 30)).reduce((s,x)=>s+Number(x.chuvaMm||0),0);

    const elHoje = document.getElementById("kpiHoje");
    const el7 = document.getElementById("kpi7d");
    const el30 = document.getElementById("kpi30d");
    const elCnt = document.getElementById("kpiCount");

    if(elHoje) elHoje.textContent = `${Number(chuvaHoje||0).toFixed(1).replace(".", ",")} mm`;
    if(el7) el7.textContent = `${Number(chuva7d||0).toFixed(1).replace(".", ",")} mm`;
    if(el30) el30.textContent = `${Number(chuva30d||0).toFixed(1).replace(".", ",")} mm`;
    if(elCnt) elCnt.textContent = String(rows.length);
  }

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.clima||[]);

    calcKPIs(rows);

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(c=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlyEmpresa(db2.talhoes), c.talhaoId) : "Geral";
      return `
        <tr>
          <td>${escapeHtml(c.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td>${escapeHtml((Number(c.chuvaMm||0)).toFixed(1).replace(".", ","))}</td>
          <td>${escapeHtml(c.tempMax ?? "")}</td>
          <td>${escapeHtml(c.vento ?? "")}</td>
          <td>${escapeHtml(c.obs||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delClima('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem registros.</td></tr>`;

    const talhoes = onlyEmpresa(db2.talhoes);
    const byTalhao = new Map();
    for(const r of rows){
      if(!r.talhaoId) continue;
      const key = r.talhaoId;
      const cur = byTalhao.get(key) || { mm:0, last:"" };
      cur.mm += Number(r.chuvaMm||0);
      if((r.data||"") > (cur.last||"")) cur.last = r.data||"";
      byTalhao.set(key, cur);
    }

    const tbA = document.getElementById("tbodyAcum");
    const list = talhoes.map(t=>{
      const info = byTalhao.get(t.id) || {mm:0, last:""};
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
      return {
        talhao: t.nome,
        fazenda: faz,
        areaHa: Number(t.areaHa||0),
        mm: info.mm,
        last: info.last || "-"
      };
    }).sort((a,b)=>b.mm-a.mm);

    tbA.innerHTML = list.map(r=>`
      <tr>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(r.fazenda)}</td>
        <td>${escapeHtml(r.areaHa ? r.areaHa.toFixed(1).replace(".", ",") : "0,0")}</td>
        <td><b>${escapeHtml(Number(r.mm||0).toFixed(1).replace(".", ","))}</b></td>
        <td>${escapeHtml(r.last)}</td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem talhões.</td></tr>`;
  }

  window.__delClima = (id)=>{
    if(!confirm("Excluir este lançamento de clima/chuva?")) return;
    const db2 = getDB();
    db2.clima = (db2.clima||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluído","Lançamento removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("cli"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId") || "",
      chuvaMm: Number(fd.get("chuvaMm")||0),
      tempMin: Number(fd.get("tempMin")||0),
      tempMax: Number(fd.get("tempMax")||0),
      umidade: Number(fd.get("umidade")||0),
      vento: Number(fd.get("vento")||0),
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.clima = db2.clima || [];
    db2.clima.push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo","Lançamento registrado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`clima-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.clima||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
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
    return (arr||[]).map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Registrar aplicação</h3>
        <div class="help">
          Registro completo: talhão, condições, máquina, operador, produtos e doses.<br/>
          Agora com <b>baixa automática</b> (estoque + combustível) e <b>custo</b> (total e por ha).
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

          <div><small>Área aplicada (ha)</small><input class="input" name="areaHa" type="number" step="0.01" placeholder="Ex.: 78.5" /></div>
          <div><small>Calda (L/ha)</small><input class="input" name="caldaLHa" type="number" placeholder="120" /></div>
          <div><small>Velocidade (km/h)</small><input class="input" name="velocidadeKmH" type="number" placeholder="14" /></div>
          <div><small>Bico</small><input class="input" name="bico" placeholder="Leque 11002" /></div>
          <div><small>Pressão (bar)</small><input class="input" name="pressaoBar" type="number" placeholder="3" /></div>

          <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" placeholder="8" /></div>
          <div><small>Temperatura (°C)</small><input class="input" name="temp" type="number" placeholder="30" /></div>
          <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" placeholder="60" /></div>

          <div><small>Combustível (L)</small><input class="input" name="combLitros" type="number" step="0.1" placeholder="Ex.: 120" /></div>
          <div><small>Custo mão de obra (R$)</small><input class="input" name="custoMaoObra" type="number" step="0.01" placeholder="0" /></div>
          <div><small>Custo máquina/serviço (R$)</small><input class="input" name="custoMaquina" type="number" step="0.01" placeholder="0" /></div>
          <div><small>Outros custos (R$)</small><input class="input" name="custoOutros" type="number" step="0.01" placeholder="0" /></div>

          <div class="full">
            <small>Produtos (até 3 linhas)</small>
            <div class="help">Preencha produto e dose por hectare. O sistema calcula <b>qtd total</b> (= dose * área) e dá baixa no estoque.</div>
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
              <th>Área</th>
              <th>Produtos</th>
              <th>Custo</th>
              <th>Custo/ha</th>
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
      const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${num(p.dosePorHa,2)} ${p.unidade})`).join(" + ");
      const total = toNumber(a.custoCalc?.total||0);
      const porHa = toNumber(a.custoCalc?.porHa||0);
      return `
        <tr>
          <td>${escapeHtml(a.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td>${escapeHtml(num(a.areaHa||0,2))} ha</td>
          <td>${escapeHtml(prds||"—")}</td>
          <td><b>${escapeHtml(kbrl(total))}</b></td>
          <td>${escapeHtml(kbrl(porHa))}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delA('${a.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem aplicações.</td></tr>`;
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

    const areaHa = Number(fd.get("areaHa")||0);

    const obj = {
      id: uid("apl"),
      empresaId: getEmpresaId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId"),
      cultura: fd.get("cultura") || "",
      alvo: fd.get("alvo") || "",
      operacao: fd.get("operacao") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      areaHa: areaHa,
      condicoes: {
        vento: Number(fd.get("vento")||0),
        temp: Number(fd.get("temp")||0),
        umidade: Number(fd.get("umidade")||0)
      },
      caldaLHa: Number(fd.get("caldaLHa")||0),
      velocidadeKmH: Number(fd.get("velocidadeKmH")||0),
      bico: fd.get("bico") || "",
      pressaoBar: Number(fd.get("pressaoBar")||0),
      combustivel: {
        litros: Number(fd.get("combLitros")||0),
        precoLitro: 0
      },
      custos: {
        maoObra: Number(fd.get("custoMaoObra")||0),
        maquina: Number(fd.get("custoMaquina")||0),
        outros: Number(fd.get("custoOutros")||0),
      },
      produtos: [],
      obs: fd.get("obs") || ""
    };

    // produtos: qtdTotal = dose * área
    [1,2,3].forEach(i=>{
      const nome = fd.get(`p${i}Nome`);
      const dose = Number(fd.get(`p${i}Dose`)||0);
      const un = fd.get(`p${i}Un`) || "";
      if(nome){
        obj.produtos.push({
          produtoNome: nome,
          dosePorHa: dose,
          unidade: un,
          qtdTotal: (areaHa>0 ? dose * areaHa : 0)
        });
      }
    });

    const db2 = getDB();
    let avisos = [];

    // 1) baixa automática no estoque
    if(areaHa > 0){
      for(const item of obj.produtos){
        const prd = getProdutoByNome(db2, item.produtoNome);
        if(!prd){
          avisos.push(`Produto não encontrado no cadastro: ${item.produtoNome}`);
          continue;
        }
        const res = deduzEstoqueProduto(db2, prd.id, item.qtdTotal);
        if(!res.ok){
          avisos.push(`Estoque insuficiente: ${item.produtoNome} (faltou ${num(res.faltou,2)} ${prd.unidade||""})`);
        }
      }
    }

    // 2) baixa automática combustível
    const tanque = getCombustivelAtivo(db2);
    obj.combustivel.precoLitro = Number(tanque?.precoLitro || 0);

    if(Number(obj.combustivel.litros||0) > 0){
      const resC = deduzCombustivel(db2, obj.combustivel.litros);
      if(!resC.ok){
        avisos.push(`Combustível insuficiente (faltou ${num(resC.faltou,1)} L)`);
      }
    }

    // 3) custos
    obj.custoCalc = calcCustoAplicacao(db2, obj);

    // salva
    db2.aplicacoes = db2.aplicacoes || [];
    db2.aplicacoes.push(obj);
    setDB(db2);

    e.target.reset();
    toast("Salvo","Aplicação registrada (com baixa e custo).");
    if(avisos.length) toast("Atenção", avisos.slice(0,2).join(" • "));
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

  setTopActions(`
    <button class="btn" id="btnCSV">Exportar (Apl) CSV</button>
    <button class="btn primary" id="btnPrint">Imprimir / PDF</button>
  `);

  const totalArea = talhoes.reduce((s,t)=>s+Number(t.areaHa||0),0);
  const ultApl = aplicacoes.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,12);
  const ultClima = clima.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,12);

  const custoTotal = aplicacoes.reduce((s,a)=>s+toNumber(a.custoCalc?.total||0),0);

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
        <div class="big">${totalArea.toFixed(1)} ha</div>
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
        <h3>Custo acumulado</h3>
        <div class="big">${kbrl(custoTotal)}</div>
        <div class="sub"><span class="pill warn">Total geral</span></div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th colspan="7">Últimas aplicações</th>
            </tr>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Alvo</th><th>Produtos</th><th>Custo</th>
            </tr>
          </thead>
          <tbody>
            ${
              ultApl.map(a=>{
                const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${num(p.dosePorHa,2)} ${p.unidade})`).join(" + ");
                return `
                  <tr>
                    <td>${escapeHtml(a.data||"")}</td>
                    <td>${escapeHtml(findNameById(fazendas, a.fazendaId))}</td>
                    <td>${escapeHtml(findNameById(talhoes, a.talhaoId))}</td>
                    <td>${escapeHtml(num(a.areaHa||0,2))} ha</td>
                    <td>${escapeHtml(a.alvo||"")}</td>
                    <td>${escapeHtml(prds||"—")}</td>
                    <td><b>${escapeHtml(kbrl(a.custoCalc?.total||0))}</b></td>
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
            <tr>
              <th colspan="6">Últimos registros de clima</th>
            </tr>
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

    <div class="card" style="margin-top:12px">
      <h3>Observações e assinatura</h3>
      <div class="help">
        Use este espaço para anotações finais do relatório (auditoria, reentrada, carência, ocorrências).<br/>
        Ao imprimir em PDF, assine manualmente ou utilize assinatura digital no arquivo final.
      </div>
      <div class="hr"></div>
      <div style="height:90px;border:1px dashed rgba(255,255,255,.20); border-radius:16px; padding:12px" class="noPrint">
        (campo livre — versão offline)
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
        <h3>Como evoluir para Supabase</h3>
        <div class="help">
          Próximo upgrade (quando você quiser):<br/>
          • Login por e-mail (Auth) • Multiusuário • Permissões<br/>
          • Postgres com histórico real • API • Logs de auditoria<br/>
          • Upload de imagens/receituários • Exportações avançadas
        </div>
        <div class="hr"></div>
        <span class="pill info">Pronto para backend</span>
        <span class="pill ok">Offline-first</span>
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

/* ------------------ Ops Center ------------------ */
function pageOpsCenter(){
  const db = getDB();
  const hoje = nowISO();

  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const aplicacoes = onlyEmpresa(db.aplicacoes||[]);

  const aplHoje = aplicacoes.filter(a=>a.data===hoje);
  const custoDia = aplHoje.reduce((s,a)=> s + Number(a.custoCalc?.total || 0), 0);

  const estoque = onlyEmpresa(db.estoque||[]);
  const low = estoque.filter(e => Number(e.qtd||0) <= 0).slice(0, 10);

  const tanque = getCombustivelAtivo(db);
  const combDisp = Number(tanque?.qtdLitros || 0);
  const combPreco = Number(tanque?.precoLitro || 0);

  setTopActions(`
    <button class="btn" id="btnRecalc">Recalcular custos</button>
    <button class="btn primary" id="btnPrint">Imprimir / PDF</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Aplicações (hoje)</h3>
        <div class="big">${aplHoje.length}</div>
        <div class="sub">${hoje}</div>
      </div>
      <div class="card">
        <h3>Custo do dia</h3>
        <div class="big">${kbrl(custoDia)}</div>
        <div class="sub">Somatório das aplicações de hoje</div>
      </div>
      <div class="card">
        <h3>Diesel em tanque</h3>
        <div class="big">${num(combDisp,1)} L</div>
        <div class="sub">Preço: ${kbrl(combPreco)}/L</div>
      </div>
      <div class="card">
        <h3>Alertas</h3>
        <div class="big">${low.length}</div>
        <div class="sub">Itens com zero/negativo</div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th colspan="7">Aplicações de hoje</th>
            </tr>
            <tr>
              <th>Fazenda</th><th>Talhão</th><th>Área (ha)</th><th>Produtos</th><th>Comb (L)</th><th>Custo</th><th>Custo/ha</th>
            </tr>
          </thead>
          <tbody>
            ${
              aplHoje.map(a=>{
                const faz = findNameById(fazendas, a.fazendaId);
                const tal = findNameById(talhoes, a.talhaoId);
                const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome}`).join(" + ");
                const total = Number(a.custoCalc?.total||0);
                const porHa = Number(a.custoCalc?.porHa||0);
                return `
                  <tr>
                    <td>${escapeHtml(faz)}</td>
                    <td>${escapeHtml(tal)}</td>
                    <td>${escapeHtml(num(a.areaHa||0,2))}</td>
                    <td>${escapeHtml(prds||"—")}</td>
                    <td>${escapeHtml(num(a.combustivel?.litros||0,1))}</td>
                    <td><b>${escapeHtml(kbrl(total))}</b></td>
                    <td>${escapeHtml(kbrl(porHa))}</td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="7">Sem aplicações hoje.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th colspan="5">Estoque (alertas)</th>
            </tr>
            <tr>
              <th>Produto</th><th>Depósito</th><th>Lote</th><th>Validade</th><th>Qtd</th>
            </tr>
          </thead>
          <tbody>
            ${
              low.map(e=>{
                const p = onlyEmpresa(db.produtos||[]).find(p=>p.id===e.produtoId);
                return `
                  <tr>
                    <td>${escapeHtml(p ? `${p.nome} (${p.tipo})` : "(sem produto)")}</td>
                    <td>${escapeHtml(e.deposito||"")}</td>
                    <td>${escapeHtml(e.lote||"")}</td>
                    <td>${escapeHtml(e.validade||"")}</td>
                    <td><b>${escapeHtml(num(e.qtd||0,2))}</b> ${escapeHtml(e.unidade||"")}</td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="5">Sem alertas.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btnPrint").addEventListener("click", ()=>window.print());

  document.getElementById("btnRecalc").addEventListener("click", ()=>{
    const db2 = getDB();
    const rows = onlyEmpresa(db2.aplicacoes||[]);
    for(const a of rows){
      a.custoCalc = calcCustoAplicacao(db2, a);
    }
    setDB(db2);
    toast("OK", "Custos recalculados.");
    pageOpsCenter();
  });
}

/* ------------------ Centro de custos por talhão ------------------ */
function pageCustosTalhao(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const aplicacoes = onlyEmpresa(db.aplicacoes||[]);

  setTopActions(`
    <button class="btn" id="btnCSV">Exportar CSV</button>
    <button class="btn primary" id="btnPrint">Imprimir / PDF</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="card">
      <h3>Centro de custos por talhão</h3>
      <div class="help">
        Soma automática de custos por talhão no período (produto + combustível + extras).<br/>
        Use filtros para fechar custo por semana/mês/safra.
      </div>
      <div class="hr"></div>
      <form id="frmFilt" class="formGrid">
        <div><small>Data inicial</small><input class="input" name="start" placeholder="2026-01-01" /></div>
        <div><small>Data final</small><input class="input" name="end" placeholder="${nowISO()}" /></div>
        <div class="full row" style="justify-content:flex-end">
          <button class="btn primary" type="submit">Aplicar filtros</button>
        </div>
      </form>
    </div>

    <div class="kpi">
      <div class="card">
        <h3>Aplicações no período</h3>
        <div class="big" id="kpiCount">0</div>
        <div class="sub">Filtradas</div>
      </div>
      <div class="card">
        <h3>Custo total (período)</h3>
        <div class="big" id="kpiTotal">${kbrl(0)}</div>
        <div class="sub">Somatório</div>
      </div>
      <div class="card">
        <h3>Média custo/ha</h3>
        <div class="big" id="kpiMediaHa">${kbrl(0)}</div>
        <div class="sub">Ponderada por área</div>
      </div>
      <div class="card">
        <h3>Talhões com custo</h3>
        <div class="big" id="kpiTalhoes">0</div>
        <div class="sub">No período</div>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr>
            <th>Fazenda</th>
            <th>Talhão</th>
            <th>Área (ha)</th>
            <th>Aplicações</th>
            <th>Área aplicada (ha)</th>
            <th>Custo total</th>
            <th>Custo/ha (período)</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr>
            <th colspan="8">Detalhe (aplicações filtradas)</th>
          </tr>
          <tr>
            <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Produtos</th><th>Comb (L)</th><th>Custo</th><th>Custo/ha</th>
          </tr>
        </thead>
        <tbody id="tbodyDet"></tbody>
      </table>
    </div>
  `;

  function buildRows(startISO, endISO){
    const db2 = getDB();
    const apls = onlyEmpresa(db2.aplicacoes||[])
      .filter(a => inRangeISO(a.data, startISO, endISO));

    // agrega por talhão
    const map = new Map();
    let total = 0;
    let areaAplicadaTotal = 0;

    for(const a of apls){
      const key = a.talhaoId || "";
      const cur = map.get(key) || {
        talhaoId: key,
        fazendaId: a.fazendaId || "",
        aplicacoes: 0,
        areaAplicada: 0,
        custoTotal: 0
      };

      const area = toNumber(a.areaHa||0);
      const custo = toNumber(a.custoCalc?.total||0);

      cur.aplicacoes += 1;
      cur.areaAplicada += area;
      cur.custoTotal += custo;

      total += custo;
      areaAplicadaTotal += area;

      map.set(key, cur);
    }

    const rows = talhoes.map(t=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
      const cur = map.get(t.id) || { aplicacoes:0, areaAplicada:0, custoTotal:0, fazendaId: t.fazendaId, talhaoId: t.id };
      const custoHa = cur.areaAplicada > 0 ? (cur.custoTotal / cur.areaAplicada) : 0;
      return {
        fazenda: faz,
        talhao: t.nome,
        areaTalhao: toNumber(t.areaHa||0),
        aplicacoes: cur.aplicacoes,
        areaAplicada: cur.areaAplicada,
        custoTotal: cur.custoTotal,
        custoHa: custoHa
      };
    }).sort((a,b)=> b.custoTotal - a.custoTotal);

    // detalhe
    const det = apls.slice().sort((a,b)=> (b.data||"").localeCompare(a.data||"")).map(a=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), a.fazendaId);
      const tal = findNameById(onlyEmpresa(db2.talhoes), a.talhaoId);
      const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>p.produtoNome).join(" + ");
      const totalA = toNumber(a.custoCalc?.total||0);
      const porHa = toNumber(a.custoCalc?.porHa||0);
      return {
        data: a.data,
        fazenda: faz,
        talhao: tal,
        areaHa: toNumber(a.areaHa||0),
        produtos: prds || "—",
        combL: toNumber(a.combustivel?.litros||0),
        custo: totalA,
        custoHa: porHa
      };
    });

    return { rows, det, total, areaAplicadaTotal, count: apls.length, talhoesComCusto: [...map.keys()].filter(k=>k).length };
  }

  function render(startISO, endISO){
    const { rows, det, total, areaAplicadaTotal, count, talhoesComCusto } = buildRows(startISO, endISO);

    document.getElementById("kpiCount").textContent = String(count);
    document.getElementById("kpiTotal").textContent = kbrl(total);
    document.getElementById("kpiMediaHa").textContent = kbrl(areaAplicadaTotal > 0 ? (total/areaAplicadaTotal) : 0);
    document.getElementById("kpiTalhoes").textContent = String(talhoesComCusto);

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.map(r=>`
      <tr>
        <td>${escapeHtml(r.fazenda)}</td>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(num(r.areaTalhao,2))}</td>
        <td>${escapeHtml(String(r.aplicacoes))}</td>
        <td>${escapeHtml(num(r.areaAplicada,2))}</td>
        <td><b>${escapeHtml(kbrl(r.custoTotal))}</b></td>
        <td>${escapeHtml(kbrl(r.custoHa))}</td>
      </tr>
    `).join("") || `<tr><td colspan="7">Sem dados.</td></tr>`;

    const tbD = document.getElementById("tbodyDet");
    tbD.innerHTML = det.map(d=>`
      <tr>
        <td>${escapeHtml(d.data||"")}</td>
        <td>${escapeHtml(d.fazenda)}</td>
        <td>${escapeHtml(d.talhao)}</td>
        <td>${escapeHtml(num(d.areaHa,2))}</td>
        <td>${escapeHtml(d.produtos)}</td>
        <td>${escapeHtml(num(d.combL,1))}</td>
        <td><b>${escapeHtml(kbrl(d.custo))}</b></td>
        <td>${escapeHtml(kbrl(d.custoHa))}</td>
      </tr>
    `).join("") || `<tr><td colspan="8">Sem aplicações no período.</td></tr>`;

    // botões
    document.getElementById("btnCSV").onclick = ()=>{
      const out = rows.map(r=>({
        fazenda: r.fazenda,
        talhao: r.talhao,
        areaTalhao_ha: r.areaTalhao,
        aplicacoes: r.aplicacoes,
        areaAplicada_ha: r.areaAplicada,
        custoTotal_R$: r.custoTotal,
        custoPorHa_R$: r.custoHa
      }));
      downloadText(`custos-talhao-${startISO||"inicio"}-a-${endISO||"fim"}.csv`, toCSV(out));
      toast("Exportado","CSV baixado.");
    };

    document.getElementById("btnPrint").onclick = ()=> window.print();
  }

  // padrão: últimos 30 dias
  const end0 = nowISO();
  const nowD = parseISO(end0);
  const startD = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() - 29);
  const pad = n => String(n).padStart(2,"0");
  const start0 = `${startD.getFullYear()}-${pad(startD.getMonth()+1)}-${pad(startD.getDate())}`;

  const frm = document.getElementById("frmFilt");
  frm.start.value = start0;
  frm.end.value = end0;

  frm.addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(frm);
    const s = String(fd.get("start")||"").trim() || "";
    const en = String(fd.get("end")||"").trim() || "";
    render(s, en);
  });

  render(start0, end0);
}

/* ------------------ Boot ------------------ */
function boot(){
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const titles = {
    dashboard:["Dashboard","Visão geral, indicadores e últimos registros"],
    ops:["Ops Center","Operação do dia • baixas automáticas • custos"],
    custos:["Custos por Talhão","Centro de custos por talhão (filtro + CSV)"],
    empresas:["Empresas","Cadastre e gerencie organizações (multiempresa)"],
    fazendas:["Fazendas","Unidades produtivas por empresa"],
    talhoes:["Talhões","Área, cultura, safra e informações de campo"],
    produtos:["Produtos","Cadastro de defensivos e insumos"],
    estoque:["Estoque","Controle básico por depósito/lote/validade"],
    aplicacoes:["Aplicações","Rastreabilidade completa de operações + custos"],
    clima:["Clima/Chuva","Histórico manual por fazenda/talhão"],
    equipe:["Equipe","Operadores, agrônomos e times de campo"],
    maquinas:["Máquinas","Equipamentos usados nas operações"],
    relatorios:["Relatórios","Resumo + impressão/PDF + exportação"],
    config:["Configurações","Backup/restore e preparação para backend"],
  };

  const [t, s] = titles[pageKey] || ["Agro Pro",""];
  renderShell(pageKey, t, s);

  if(pageKey==="dashboard") pageDashboard();
  else if(pageKey==="ops") pageOpsCenter();
  else if(pageKey==="custos") pageCustosTalhao();
  else if(pageKey==="empresas") pageEmpresas();
  else if(pageKey==="fazendas") pageFazendas();
  else if(pageKey==="talhoes") pageTalhoes();
  else if(pageKey==="produtos") pageProdutos();
  else if(pageKey==="estoque") pageEstoque();
  else if(pageKey==="aplicacoes") pageAplicacoes();
  else if(pageKey==="clima") pageClima();
  else if(pageKey==="equipe") pageEquipe();
  else if(pageKey==="maquinas") pageMaquinas();
  else if(pageKey==="relatorios") pageRelatorios();
  else if(pageKey==="config") pageConfiguracoes();

  toast("Agro Pro", "Sistema carregado. Dados salvos no navegador.");
}

document.addEventListener("DOMContentLoaded", boot); 
