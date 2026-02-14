/* ============================================================
   AGRO PRO — app.js (OFFLINE / MULTIEMPRESA)
   Atualização:
   + OPS CENTER (monitoramento)
   + Combustível com BAIXA automática no estoque de Diesel (saldo pode ficar negativo)
   + Aplicações com:
       - Área aplicada (ha) por operação
       - 10 linhas de produtos
       - BAIXA automática no estoque (saldo pode ficar negativo)
       - Custo por talhão (R$) e Custo/ha (acumulado tipo “chuva por talhão”)
   ============================================================ */

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
  const maqId = uid("maq");
  const opId = uid("peq");

  const prd1 = uid("prd");
  const prd2 = uid("prd");

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
      { id: prd1, empresaId, tipo:"Herbicida", nome:"Glifosato 480", ingrediente:"Glifosato", fabricante:"Genérico", registro:"", carenciaDias: 7, reentradaHoras: 24, unidade:"L", obs:"" },
      { id: prd2, empresaId, tipo:"Fungicida", nome:"Triazol+Estrobilurina", ingrediente:"Mistura", fabricante:"Genérico", registro:"", carenciaDias: 14, reentradaHoras: 24, unidade:"L", obs:"" }
    ],

    // Estoque de insumos (pode ficar negativo)
    estoque: [
      { id: uid("stk"), empresaId, produtoId: prd1, deposito:"Central", lote:"", validade:"", qtd: 1200, unidade:"L", obs:"Demo" },
      { id: uid("stk"), empresaId, produtoId: prd2, deposito:"Central", lote:"", validade:"", qtd: 240, unidade:"L", obs:"Demo" }
    ],

    equipe: [
      { id: opId, empresaId, nome:"Operador 1", funcao:"Tratorista", telefone:"", nr:"", obs:"" }
    ],

    maquinas: [
      { id: maqId, empresaId, nome:"Pulverizador Autopropelido", placa:"", horimetro: 0, capacidadeL: 3000, bicos:"", obs:"" }
    ],

    // Clima: histórico (acumulado por talhão é soma dos lançamentos)
    clima: [
      { id: uid("cli"), empresaId, data: nowISO(), fazendaId, talhaoId, chuvaMm: 12, tempMin: 22, tempMax: 33, umidade: 68, vento: 9, obs:"Chuva isolada à tarde" }
    ],

    // Combustível: estoque de diesel (litros) + abastecimentos (baixa automática)
    dieselEstoque: [
      { id: uid("dsl"), empresaId, deposito:"Tanque Principal", litros: 5000, obs:"Saldo pode ficar negativo (furo de estoque)" }
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

    // Aplicações: com área aplicada (ha), produtos e custoTotal (R$) opcional
    aplicacoes: [
      {
        id: uid("apl"),
        empresaId,
        data: nowISO(),
        fazendaId,
        talhaoId,
        areaHaAplicada: 25, // <= área aplicada nessa operação
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
        custoTotal: 0, // R$ (opcional)
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

  // migração leve para versões antigas
  db.meta = db.meta || { createdAt: new Date().toISOString(), version: 2 };
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
  db.dieselEstoque = db.dieselEstoque || [{ id: uid("dsl"), empresaId: (db.session.empresaId||db.empresas?.[0]?.id||uid("emp")), deposito:"Tanque Principal", litros: 0, obs:"" }];

  // normaliza: talhaoId vazio vira "" (para clima)
  db.clima.forEach(c=>{ if(c.talhaoId==null) c.talhaoId=""; });

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
  { href:"opscenter.html", label:"Ops Center", key:"opscenter", icon:"🛰️" },
  { href:"empresas.html", label:"Empresas", key:"empresas", icon:"🏢" },
  { href:"fazendas.html", label:"Fazendas", key:"fazendas", icon:"🌾" },
  { href:"talhoes.html", label:"Talhões", key:"talhoes", icon:"🧭" },
  { href:"produtos.html", label:"Produtos", key:"produtos", icon:"🧪" },
  { href:"estoque.html", label:"Estoque", key:"estoque", icon:"📦" },
  { href:"aplicacoes.html", label:"Aplicações", key:"aplicacoes", icon:"🚜" },
  { href:"combustivel.html", label:"Combustível", key:"combustivel", icon:"⛽" },
  { href:"clima.html", label:"Clima/Chuva", key:"clima", icon:"🌧️" },
  { href:"equipe.html", label:"Equipe", key:"equipe", icon:"👷" },
  { href:"maquinas.html", label:"Máquinas", key:"maquinas", icon:"🛠️" },
  { href:"relatorios.html", label:"Relatórios", key:"relatorios", icon:"🧾" },
  { href:"custos.html", label:"Custos", key:"custos", icon:"💼" },
  { href:"configuracoes.html", label:"Configurações", key:"config", icon:"⚙️" },
];

function renderShell(pageKey, title, subtitle){

  // Página externa (render por JS próprio)
  if(pageKey === "custos") return;

  const db = getDB();
  ...
}

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
    setTimeout(()=>location.reload(), 200);
  });

  document.getElementById("btnResetDemo").addEventListener("click", ()=>{
    if(!confirm("Isso vai resetar o banco local e voltar para o demo. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Reset concluído", "Banco local restaurado para o demo.");
    setTimeout(()=>location.reload(), 200);
  });

  document.getElementById("btnBackup").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(db2, null, 2));
    toast("Backup gerado", "Arquivo .json baixado.");
  });

  document.getElementById("btnNovaEmpresa").addEventListener("click", ()=>{
    const nome = prompt("Nome da nova empresa:");
    if(!nome) return;
    const db2 = getDB();
    const id = uid("emp");
    db2.empresas.push({ id, nome, cnpj:"", responsavel:"", cidade:"", uf:"", observacoes:"" });
    setDB(db2);
    setEmpresaId(id);
    toast("Empresa criada", "Agora você está nessa empresa.");
    setTimeout(()=>location.reload(), 200);
  });
}

/* ------------------ Helpers ------------------ */
function onlyEmpresa(arr){
  const eid = getEmpresaId();
  return (arr||[]).filter(x => x.empresaId === eid);
}

function findNameById(arr, id, fallback="-"){
  const o = (arr||[]).find(x=>x.id===id);
  return o ? (o.nome ?? fallback) : fallback;
}

// ===== Formatação BR (vírgula / moeda) =====
const FMT_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function brl(v){ return FMT_BRL.format(Number(v || 0)); }
function num(v, casas=2){
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(Number(v || 0));
}
function kmoney(n){ return num(n, 2); }
function kbrl(n){ return brl(n); }

function setTopActions(html){
  const el = document.getElementById("topActions");
  if(el) el.innerHTML = html || "";
}

function clampStr(s, max=60){
  s = String(s ?? "");
  return s.length>max ? s.slice(0,max-1)+"…" : s;
}

function safeNumber(v){ return Number(v||0); }

function talhaoArea(db, talhaoId){
  const t = onlyEmpresa(db.talhoes).find(x=>x.id===talhaoId);
  return t ? Number(t.areaHa||0) : 0;
}

/* ------------------ Estoque: baixas automáticas ------------------ */
function ensureStockRow(db, produtoId, deposito="Central", unidade=""){
  db.estoque = db.estoque || [];
  let row = db.estoque.find(s => s.empresaId===getEmpresaId() && s.produtoId===produtoId && (s.deposito||"Central")===deposito);
  if(!row){
    row = { id: uid("stk"), empresaId: getEmpresaId(), produtoId, deposito, lote:"", validade:"", qtd:0, unidade, obs:"(auto)" };
    db.estoque.push(row);
  }
  return row;
}

function baixaEstoqueProdutoPorNome(db, produtoNome, quantidade, unidadePreferida=""){
  if(!produtoNome || !quantidade) return { ok:false, msg:"Sem produto/quantidade" };
  const prod = onlyEmpresa(db.produtos).find(p => String(p.nome||"").trim().toLowerCase() === String(produtoNome).trim().toLowerCase());
  if(!prod){
    // Não encontrado no cadastro → não dá para linkar em produtoId.
    return { ok:false, msg:`Produto não cadastrado: ${produtoNome}` };
  }
  const unidade = unidadePreferida || prod.unidade || "";
  const row = ensureStockRow(db, prod.id, "Central", unidade);
  row.unidade = row.unidade || unidade;
  row.qtd = Number(row.qtd||0) - Number(quantidade||0); // pode ficar negativo
  return { ok:true, msg:`Baixa estoque: ${produtoNome} -${num(quantidade,2)} ${row.unidade||""}` };
}

/* ------------------ Diesel: baixa automática ------------------ */
function ensureDieselTank(db, deposito="Tanque Principal"){
  db.dieselEstoque = db.dieselEstoque || [];
  let t = db.dieselEstoque.find(x => x.empresaId===getEmpresaId() && (x.deposito||"Tanque Principal")===deposito);
  if(!t){
    t = { id: uid("dsl"), empresaId: getEmpresaId(), deposito, litros: 0, obs:"(auto)" };
    db.dieselEstoque.push(t);
  }
  return t;
}
function baixaDiesel(db, deposito, litros){
  const tank = ensureDieselTank(db, deposito || "Tanque Principal");
  tank.litros = Number(tank.litros||0) - Number(litros||0); // pode ficar negativo
  return tank;
}

/* ------------------ Custo por talhão (acumulado tipo chuva) ------------------ */
function calcCustosPorTalhao(db){
  const talhoes = onlyEmpresa(db.talhoes);
  const fazendas = onlyEmpresa(db.fazendas);

  const apl = onlyEmpresa(db.aplicacoes||[]);
  const cmb = onlyEmpresa(db.combustivel||[]);

  const map = new Map(); // talhaoId -> {custo: number, last: string, ops: number}
  for(const t of talhoes){
    map.set(t.id, { custo:0, last:"", ops:0 });
  }

  for(const a of apl){
    if(!a.talhaoId) continue;
    const rec = map.get(a.talhaoId) || { custo:0, last:"", ops:0 };
    rec.custo += Number(a.custoTotal||0);
    rec.ops += 1;
    if((a.data||"") > (rec.last||"")) rec.last = a.data||"";
    map.set(a.talhaoId, rec);
  }

  for(const c of cmb){
    if(!c.talhaoId) continue;
    const rec = map.get(c.talhaoId) || { custo:0, last:"", ops:0 };
    rec.custo += Number(c.litros||0) * Number(c.precoLitro||0);
    rec.ops += 1;
    if((c.data||"") > (rec.last||"")) rec.last = c.data||"";
    map.set(c.talhaoId, rec);
  }

  return talhoes.map(t=>{
    const info = map.get(t.id) || { custo:0, last:"", ops:0 };
    const area = Number(t.areaHa||0) || 0;
    const custoHa = area>0 ? (info.custo/area) : 0;
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
  }).sort((a,b)=>b.custoTotal - a.custoTotal);
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
        <div class="sub">Área total: ${num(talhoes.reduce((s,t)=>s+Number(t.areaHa||0),0),1)} ha</div>
      </div>
      <div class="card">
        <h3>Aplicações (hoje)</h3>
        <div class="big">${aplHoje}</div>
        <div class="sub"><span class="pill info">Operações registradas</span></div>
      </div>
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big">${num(chuvaHoje,1)} mm</div>
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
          • Registrar aplicação (produto, dose, área aplicada)<br/>
          • Registrar abastecimentos e diesel<br/>
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
              <th>Área aplicada</th>
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
                  <td>${escapeHtml(num(a.areaHaAplicada||0,1))} ha</td>
                  <td>${escapeHtml(a.alvo||"")}</td>
                </tr>
              `).join("") || `<tr><td colspan="6">Sem registros.</td></tr>`
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
        <h3>Ops Center</h3>
        <div class="help">
          Monitoramento de alertas:<br/>
          • Estoque negativo • Diesel baixo/negativo • Custos por talhão<br/>
        </div>
        <div class="hr"></div>
        <a class="btn primary" href="opscenter.html">Abrir Ops Center</a>
      </div>
    </div>
  `;
}

function pageOpsCenter(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);

  const estoque = onlyEmpresa(db.estoque||[]);
  const diesel = onlyEmpresa(db.dieselEstoque||[]);
  const aplicacoes = onlyEmpresa(db.aplicacoes||[]);
  const combustivel = onlyEmpresa(db.combustivel||[]);
  const clima = onlyEmpresa(db.clima||[]);

  const negEstoque = estoque.filter(s => Number(s.qtd||0) < 0);
  const negDiesel = diesel.filter(d => Number(d.litros||0) < 0);
  const custoTal = calcCustosPorTalhao(db);

  // chuva 7d por talhão (simples)
  const chuvaTal = new Map();
  const hoje = new Date();
  const start = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0,0,0,0);
  const min = new Date(start.getTime() - 6*24*60*60*1000);
  function parseISO(d){
    const [y,m,day] = String(d||"").split("-").map(Number);
    if(!y||!m||!day) return null;
    return new Date(y, m-1, day, 0,0,0,0);
  }
  for(const r of clima){
    if(!r.talhaoId) continue;
    const dt = parseISO(r.data);
    if(!dt) continue;
    if(dt < min || dt > start) continue;
    chuvaTal.set(r.talhaoId, (chuvaTal.get(r.talhaoId)||0) + Number(r.chuvaMm||0));
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Alertas de estoque</h3>
        <div class="big">${negEstoque.length}</div>
        <div class="sub">${negEstoque.length?'<span class="pill bad">Saldo negativo</span>':'<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Alertas de diesel</h3>
        <div class="big">${negDiesel.length}</div>
        <div class="sub">${negDiesel.length?'<span class="pill bad">Saldo negativo</span>':'<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Aplicações</h3>
        <div class="big">${aplicacoes.length}</div>
        <div class="sub"><span class="pill info">Rastreabilidade</span></div>
      </div>
      <div class="card">
        <h3>Abastecimentos</h3>
        <div class="big">${combustivel.length}</div>
        <div class="sub"><span class="pill info">Controle diesel</span></div>
      </div>
    </div>

    <div class="section">
      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="6">Estoque com saldo negativo</th></tr>
            <tr>
              <th>Produto</th><th>Depósito</th><th>Qtd</th><th>Unid.</th><th>Obs</th><th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              negEstoque.map(s=>{
                const p = onlyEmpresa(db.produtos).find(p=>p.id===s.produtoId);
                const nome = p ? p.nome : "(sem produto)";
                return `
                  <tr>
                    <td><b>${escapeHtml(nome)}</b></td>
                    <td>${escapeHtml(s.deposito||"")}</td>
                    <td><b>${escapeHtml(num(s.qtd||0,2))}</b></td>
                    <td>${escapeHtml(s.unidade||"")}</td>
                    <td>${escapeHtml(clampStr(s.obs||"",50))}</td>
                    <td><a class="btn" href="estoque.html">Ajustar</a></td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="6">Nenhum.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr><th colspan="5">Diesel (tanques)</th></tr>
            <tr>
              <th>Depósito</th><th>Litros</th><th>Status</th><th>Obs</th><th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              diesel.map(d=>`
                <tr>
                  <td><b>${escapeHtml(d.deposito||"")}</b></td>
                  <td><b>${escapeHtml(num(d.litros||0,1))}</b></td>
                  <td>${Number(d.litros||0)<0?'<span class="pill bad">Negativo</span>':'<span class="pill ok">OK</span>'}</td>
                  <td>${escapeHtml(clampStr(d.obs||"",50))}</td>
                  <td><a class="btn" href="combustivel.html">Ver</a></td>
                </tr>
              `).join("") || `<tr><td colspan="5">Sem tanques.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="tableWrap" style="margin-top:12px">
      <table>
        <thead>
          <tr><th colspan="7">Custo por talhão (acumulado)</th></tr>
          <tr>
            <th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Custo total</th><th>Custo/ha</th><th>Chuva 7d</th><th>Último</th>
          </tr>
        </thead>
        <tbody>
          ${
            custoTal.map(r=>`
              <tr>
                <td><b>${escapeHtml(r.talhao)}</b></td>
                <td>${escapeHtml(r.fazenda)}</td>
                <td>${escapeHtml(num(r.areaHa||0,1))}</td>
                <td><b>${escapeHtml(kbrl(r.custoTotal||0))}</b></td>
                <td>${escapeHtml(kbrl(r.custoHa||0))}</td>
                <td>${escapeHtml(num(chuvaTal.get(r.talhaoId)||0,1))} mm</td>
                <td>${escapeHtml(r.last||"-")}</td>
              </tr>
            `).join("") || `<tr><td colspan="7">Sem talhões.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function crudPage({
  entityKey, subtitle,
  fields,
  columns,
  helpers
}){
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

  content.innerHTML = `<div class="section">${formHtml}${tableHtml}</div>`;

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
        <div class="help">Multiempresa: cada empresa tem seus próprios talhões, estoque, aplicações e combustível.</div>
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
    setTimeout(()=>location.reload(), 200);
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
    ["fazendas","talhoes","produtos","estoque","equipe","maquinas","clima","aplicacoes","combustivel","dieselEstoque"].forEach(wipe);

    if(getEmpresaId()===id){
      db2.session.empresaId = db2.empresas[0].id;
    }
    setDB(db2);
    toast("Excluída", "Empresa removida com dados associados.");
    setTimeout(()=>location.reload(), 200);
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
    subtitle:"Unidades produtivas por empresa.",
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


function pageFazendas(){
  crudPage({
    entityKey:"fazendas",
    subtitle:"Unidades produtivas por empresa.",
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
              ${fazendas.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join("")}
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
          <tr><th colspan="7">Custo por talhão (acumulado) — tipo “chuva por talhão”</th></tr>
          <tr>
            <th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Custo total</th><th>Custo/ha</th><th>Operações</th><th>Último</th>
          </tr>
        </thead>
        <tbody id="tbodyCustos"></tbody>
      </table>
    </div>
  `;

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.talhoes||[]);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().reverse().map(t=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
      return `
        <tr>
          <td><b>${escapeHtml(t.nome||"")}</b></td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(num(t.areaHa||0,1))}</td>
          <td>${escapeHtml(t.cultura||"")}</td>
          <td>${escapeHtml(t.safra||"")}</td>
          <td>${escapeHtml(t.solo||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delTal('${t.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">Sem talhões.</td></tr>`;

    // custos por talhão
    const custos = calcCustosPorTalhao(db2);
    const tbC = document.getElementById("tbodyCustos");
    tbC.innerHTML = custos.map(r=>`
      <tr>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(r.fazenda)}</td>
        <td>${escapeHtml(num(r.areaHa||0,1))}</td>
        <td><b>${escapeHtml(kbrl(r.custoTotal||0))}</b></td>
        <td>${escapeHtml(kbrl(r.custoHa||0))}</td>
        <td>${escapeHtml(String(r.ops||0))}</td>
        <td>${escapeHtml(r.last||"-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="7">Sem dados.</td></tr>`;
  }

  window.__delTal = (id)=>{
    if(!confirm("Excluir este talhão?")) return;
    const db2 = getDB();
    db2.talhoes = (db2.talhoes||[]).filter(x=>x.id!==id);
    // opcional: mantém histórico (aplicações/clima) para auditoria. Se quiser apagar também, você apaga manual.
    setDB(db2);
    toast("Excluído","Talhão removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("tal"),
      empresaId: getEmpresaId(),
      fazendaId: fd.get("fazendaId"),
      nome: fd.get("nome"),
      areaHa: Number(fd.get("areaHa")||0),
      cultura: fd.get("cultura")||"",
      safra: fd.get("safra")||"",
      solo: fd.get("solo")||"",
      coordenadas: fd.get("coordenadas")||"",
      observacoes: fd.get("observacoes")||""
    };
    const db2 = getDB();
    db2.talhoes = db2.talhoes || [];
    db2.talhoes.push(obj);
    setDB(db2);
    e.target.reset();
    toast("Salvo","Talhão adicionado.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.talhoes||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
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

      // ✅ NOVO: preço por unidade (base do cálculo de custos)
      {key:"preco", label:"Preço por unidade (R$)", type:"number", placeholder:"Ex: 45.90"},

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
      {key:"unidade", label:"Unid."},

      // ✅ NOVO: mostrar preço na listagem
      {key:"preco", label:"Preço (R$)", fmt:(v)=> `R$ ${Number(v||0).toFixed(2)}`}
    ],

    // ✅ Normalização: garante que preço/carência/reentrada sejam números
    helpers:{
      onBeforeSave:(obj)=>{
        obj.preco = Number(obj.preco || 0);
        obj.carenciaDias = Number(obj.carenciaDias || 0);
        obj.reentradaHoras = Number(obj.reentradaHoras || 0);
        return obj;
      },
      onDelete:(id,db)=>{
        db.estoque = (db.estoque||[]).filter(s=>s.produtoId!==id);
      }
    }
  });
}

function pageEstoque(){
  const db = getDB();
  const produtos = onlyEmpresa(db.produtos);

  crudPage({
    entityKey:"estoque",
    subtitle:"Controle por depósito, lote e validade. Saldo pode ficar negativo (furo de estoque).",
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
      {key:"qtd", label:"Qtd"},
      {key:"unidade", label:"Unid."}
    ]
  });
}

function pageCombustivel(){
  const db = getDB();
  const fazendas = onlyEmpresa(db.fazendas);
  const talhoes = onlyEmpresa(db.talhoes);
  const equipe = onlyEmpresa(db.equipe);
  const maquinas = onlyEmpresa(db.maquinas);
  const tanques = onlyEmpresa(db.dieselEstoque);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr, labelKey="nome"){
    return arr.map(o=>`<option value="${o.id}">${escapeHtml(o[labelKey]||"")}</option>`).join("");
  }

  const depositoOptions = tanques.map(t=>`<option value="${escapeHtml(t.deposito||"Tanque Principal")}">${escapeHtml(t.deposito||"Tanque Principal")}</option>`).join("");

  content.innerHTML = `
    <div class="kpi">
      <div class="card">
        <h3>Diesel (tanque total)</h3>
        <div class="big">${num(tanques.reduce((s,t)=>s+Number(t.litros||0),0),1)} L</div>
        <div class="sub">${tanques.some(t=>Number(t.litros||0)<0)?'<span class="pill bad">Negativo</span>':'<span class="pill ok">OK</span>'}</div>
      </div>
      <div class="card">
        <h3>Abastecimentos</h3>
        <div class="big">${onlyEmpresa(db.combustivel||[]).length}</div>
        <div class="sub"><span class="pill info">Histórico</span></div>
      </div>
      <div class="card">
        <h3>Custo diesel (R$)</h3>
        <div class="big">${kbrl(onlyEmpresa(db.combustivel||[]).reduce((s,c)=>s+Number(c.litros||0)*Number(c.precoLitro||0),0))}</div>
        <div class="sub"><span class="pill info">Somatório</span></div>
      </div>
      <div class="card">
        <h3>Saldo pode negativo</h3>
        <div class="big">✔</div>
        <div class="sub">Furo de estoque visível</div>
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

          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required/></div>
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

        <div class="hr"></div>
        <div class="help"><b>Tanques:</b> para ajustar saldo manual, edite no próprio backup (ou peça que eu crie a tela de ajuste).</div>
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

  function render(){
    const db2 = getDB();
    const rows = onlyEmpresa(db2.combustivel||[]);
    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(c=>{
      const faz = findNameById(onlyEmpresa(db2.fazendas), c.fazendaId);
      const tal = c.talhaoId ? findNameById(onlyEmpresa(db2.talhoes), c.talhaoId) : "—";
      const custo = Number(c.litros||0) * Number(c.precoLitro||0);
      return `
        <tr>
          <td>${escapeHtml(c.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td><b>${escapeHtml(num(c.litros||0,1))}</b></td>
          <td>${escapeHtml(num(c.precoLitro||0,2))}</td>
          <td><b>${escapeHtml(kbrl(custo||0))}</b></td>
          <td>${escapeHtml(c.deposito||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delCmb('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem abastecimentos.</td></tr>`;

    const tbT = document.getElementById("tbodyTanques");
    const tanks = onlyEmpresa(db2.dieselEstoque||[]);
    tbT.innerHTML = tanks.map(t=>`
      <tr>
        <td><b>${escapeHtml(t.deposito||"")}</b></td>
        <td><b>${escapeHtml(num(t.litros||0,1))}</b></td>
        <td>${Number(t.litros||0)<0?'<span class="pill bad">Negativo</span>':'<span class="pill ok">OK</span>'}</td>
        <td>${escapeHtml(clampStr(t.obs||"",70))}</td>
      </tr>
    `).join("") || `<tr><td colspan="4">Sem tanques.</td></tr>`;
  }

  window.__delCmb = (id)=>{
    if(!confirm("Excluir este abastecimento? (não reverte baixa automaticamente)")) return;
    const db2 = getDB();
    db2.combustivel = (db2.combustivel||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluído","Registro removido.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);

    const litros = Number(fd.get("litros")||0);
    if(litros<=0){
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
      precoLitro: Number(fd.get("precoLitro")||0),
      kmOuHora: Number(fd.get("kmOuHora")||0),
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

  document.getElementById("btnExportCSV").addEventListener("click", ()=>{
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlyEmpresa(db2.combustivel||[])));
    toast("Exportado","CSV baixado.");
  });

  render();
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

  function parseISO(d){
    const [y,m,day] = String(d||"").split("-").map(Number);
    if(!y||!m||!day) return null;
    return new Date(y, m-1, day, 0,0,0,0);
  }

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

    if(elHoje) elHoje.textContent = `${num(chuvaHoje,1)} mm`;
    if(el7) el7.textContent = `${num(chuva7d,1)} mm`;
    if(el30) el30.textContent = `${num(chuva30d,1)} mm`;
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
          <td>${escapeHtml(num(c.chuvaMm||0,1))}</td>
          <td>${escapeHtml(c.tempMax ?? "")}</td>
          <td>${escapeHtml(c.vento ?? "")}</td>
          <td>${escapeHtml(c.obs||"")}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delClima('${c.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8">Sem registros.</td></tr>`;

    // acumulado por talhão
    const byTalhao = new Map();
    for(const r of rows){
      if(!r.talhaoId) continue;
      const cur = byTalhao.get(r.talhaoId) || { mm:0, last:"" };
      cur.mm += Number(r.chuvaMm||0);
      if((r.data||"") > (cur.last||"")) cur.last = r.data||"";
      byTalhao.set(r.talhaoId, cur);
    }

    const tbA = document.getElementById("tbodyAcum");
    const list = talhoes.map(t=>{
      const info = byTalhao.get(t.id) || {mm:0, last:""};
      const faz = findNameById(onlyEmpresa(db2.fazendas), t.fazendaId);
      return { talhao: t.nome, fazenda: faz, areaHa: Number(t.areaHa||0), mm: info.mm, last: info.last || "-" };
    }).sort((a,b)=>b.mm-a.mm);

    tbA.innerHTML = list.map(r=>`
      <tr>
        <td><b>${escapeHtml(r.talhao)}</b></td>
        <td>${escapeHtml(r.fazenda)}</td>
        <td>${escapeHtml(num(r.areaHa||0,1))}</td>
        <td><b>${escapeHtml(num(r.mm||0,1))}</b></td>
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
    return arr.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  const prodOptions = produtos.map(p=>`<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)}</option>`).join("");

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Registrar aplicação</h3>
        <div class="help">
          • Informe <b>Área aplicada (ha)</b> (não precisa ser o talhão inteiro).<br/>
          • Ao salvar, o sistema dá baixa automática no estoque: <b>dose/ha × área aplicada</b>.<br/>
          • Saldo pode ficar negativo para mostrar furo de estoque.
        </div>
        <div class="hr"></div>

        <form id="frm" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>

          <div>
            <small>Fazenda</small>
            <select class="select" name="fazendaId" required>${optionList(fazendas)}</select>
          </div>

          <div>
            <small>Talhão</small>
            <select class="select" name="talhaoId" required>${optionList(talhoes)}</select>
          </div>

          <div><small>Área aplicada (ha)</small><input class="input" name="areaHaAplicada" type="number" step="0.1" placeholder="Ex.: 12,5" required/></div>
          <div><small>Custo total (R$) (opcional)</small><input class="input" name="custoTotal" type="number" step="0.01" placeholder="0"/></div>

          <div><small>Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>Alvo</small><input class="input" name="alvo" placeholder="Ferrugem / Lagartas / Daninhas..." /></div>
          <div><small>Operação</small><input class="input" name="operacao" placeholder="Pulverização terrestre / Drone..." /></div>

          <div>
            <small>Máquina</small>
            <select class="select" name="maquinaId">
              <option value="">(opcional)</option>${optionList(maquinas)}
            </select>
          </div>

          <div>
            <small>Operador</small>
            <select class="select" name="operadorId">
              <option value="">(opcional)</option>${optionList(equipe)}
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
            <small>Produtos (até 10 linhas)</small>
            <div class="help">Dose por hectare. A baixa será calculada automaticamente.</div>
            <div class="hr"></div>

            <div class="formGrid">
              ${Array.from({length:10}).map((_,idx)=>{
                const i = idx+1;
                return `
                  <div class="full" style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:10px;">
                    <select class="select" name="p${i}Nome">
                      <option value="">(produto ${i} - opcional)</option>
                      ${prodOptions}
                    </select>
                    <input class="input" name="p${i}Dose" type="number" step="0.01" placeholder="Dose/ha" />
                    <input class="input" name="p${i}Un" placeholder="L/ha ou kg/ha" />
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <div class="full">
            <small>Observações</small>
            <textarea class="textarea" name="obs" placeholder="Deriva, falhas, reentrada, carência, ocorrências..."></textarea>
          </div>

          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar aplicação e dar baixa</button>
          </div>
        </form>

        <div class="hr"></div>
        <div class="help">
          <b>Obs:</b> Se um produto não estiver cadastrado em “Produtos”, a baixa não consegue linkar no estoque.
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Fazenda</th><th>Talhão</th><th>Área</th><th>Produtos</th><th>Custo</th><th class="noPrint">Ações</th>
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
      const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${num(p.dosePorHa||0,2)} ${p.unidade||""})`).join(" + ");
      return `
        <tr>
          <td>${escapeHtml(a.data||"")}</td>
          <td>${escapeHtml(faz)}</td>
          <td>${escapeHtml(tal)}</td>
          <td><b>${escapeHtml(num(a.areaHaAplicada||0,1))} ha</b></td>
          <td>${escapeHtml(clampStr(prds||"—", 90))}</td>
          <td>${escapeHtml(kbrl(a.custoTotal||0))}</td>
          <td class="noPrint"><button class="btn danger" onclick="window.__delA('${a.id}')">Excluir</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">Sem aplicações.</td></tr>`;
  }

  window.__delA = (id)=>{
    if(!confirm("Excluir esta aplicação? (não reverte baixa automaticamente)")) return;
    const db2 = getDB();
    db2.aplicacoes = (db2.aplicacoes||[]).filter(x=>x.id!==id);
    setDB(db2);
    toast("Excluída","Aplicação removida.");
    render();
  };

  document.getElementById("frm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);

    const area = Number(fd.get("areaHaAplicada")||0);
    if(area<=0){
      alert("Informe Área aplicada (ha) > 0");
      return;
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
        vento: Number(fd.get("vento")||0),
        temp: Number(fd.get("temp")||0),
        umidade: Number(fd.get("umidade")||0)
      },
      caldaLHa: Number(fd.get("caldaLHa")||0),
      velocidadeKmH: Number(fd.get("velocidadeKmH")||0),
      bico: fd.get("bico") || "",
      pressaoBar: Number(fd.get("pressaoBar")||0),
      produtos: [],
      custoTotal: Number(fd.get("custoTotal")||0),
      obs: fd.get("obs") || ""
    };

    for(let i=1;i<=10;i++){
      const nome = fd.get(`p${i}Nome`);
      const dose = Number(fd.get(`p${i}Dose`)||0);
      const un = fd.get(`p${i}Un`) || "";
      if(nome){
        obj.produtos.push({ produtoNome: nome, dosePorHa: dose, unidade: un });
      }
    }

    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes || [];
    db2.aplicacoes.push(obj);

    // ===== BAIXA AUTOMÁTICA NO ESTOQUE =====
    const msgs = [];
    for(const p of (obj.produtos||[])){
      const qty = Number(p.dosePorHa||0) * area; // dose/ha * ha
      if(!qty) continue;
      const unidadePreferida = (p.unidade||"").split("/")[0] || ""; // "L/ha" -> "L"
      const res = baixaEstoqueProdutoPorNome(db2, p.produtoNome, qty, unidadePreferida);
      if(res.ok) msgs.push(res.msg);
      else msgs.push(res.msg);
    }

    setDB(db2);

    e.target.reset();
    toast("Salvo","Aplicação registrada. Baixa no estoque aplicada.");
    if(msgs.length) toast("Baixas", msgs.slice(0,3).join(" • ")+(msgs.length>3?" • ...":""));
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
        <div class="big">${num(totalArea,1)} ha</div>
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
            ${
              ultApl.map(a=>{
                const prds = (a.produtos||[]).filter(p=>p.produtoNome).map(p=>`${p.produtoNome} (${num(p.dosePorHa||0,2)} ${p.unidade||""})`).join(" + ");
                return `
                  <tr>
                    <td>${escapeHtml(a.data||"")}</td>
                    <td>${escapeHtml(findNameById(fazendas, a.fazendaId))}</td>
                    <td>${escapeHtml(findNameById(talhoes, a.talhaoId))}</td>
                    <td>${escapeHtml(num(a.areaHaAplicada||0,1))} ha</td>
                    <td>${escapeHtml(a.operacao||"")}</td>
                    <td>${escapeHtml(prds||"—")}</td>
                    <td>${escapeHtml(kbrl(a.custoTotal||0))}</td>
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
                  <td>${escapeHtml(num(c.chuvaMm||0,1))}</td>
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
        Ao imprimir em PDF, assine manualmente ou utilize assinatura digital.
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
        if(!data.empresas){
          alert("Arquivo inválido.");
          return;
        }
        if(!confirm("Importar vai SUBSTITUIR seus dados locais. Continuar?")) return;
        Storage.save(data);
        toast("Importado","Recarregando…");
        setTimeout(()=>location.reload(), 200);
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
    opscenter:["Ops Center","Alertas, custos por talhão e monitoramento"],
    empresas:["Empresas","Cadastre e gerencie organizações (multiempresa)"],
    fazendas:["Fazendas","Unidades produtivas por empresa"],
    talhoes:["Talhões","Área, cultura, safra e custos por talhão"],
    produtos:["Produtos","Cadastro de defensivos e insumos"],
    estoque:["Estoque","Controle por depósito/lote/validade (saldo pode negativo)"],
    aplicacoes:["Aplicações","Rastreabilidade + baixa automática no estoque"],
    combustivel:["Combustível","Abastecimentos + baixa automática no diesel"],
    clima:["Clima/Chuva","Histórico manual por fazenda/talhão (acumulado)"],
    equipe:["Equipe","Operadores, agrônomos e times de campo"],
    maquinas:["Máquinas","Equipamentos usados nas operações"],
    relatorios:["Relatórios","Resumo + impressão/PDF + exportação"],
    config:["Configurações","Backup/restore e preparação para backend"],
  };

  const [t, s] = titles[pageKey] || ["Agro Pro",""];
  renderShell(pageKey, t, s);

  if(pageKey==="dashboard") pageDashboard();
  else if(pageKey==="opscenter") pageOpsCenter();
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
  else if(pageKey==="config") pageConfiguracoes();

  toast("Agro Pro", "Sistema carregado. Dados salvos no navegador.");
}

document.addEventListener("DOMContentLoaded", boot);
// ===== Agro Pro Bridge (para páginas extras) =====
window.AgroPro = window.AgroPro || {};
try{
  // Ajuste os nomes se no seu app forem diferentes
  window.AgroPro.Storage = Storage;
  window.AgroPro.uid = uid;
  window.AgroPro.nowISO = (typeof nowISO === "function") ? nowISO : null;

  // db pode estar como let db / const db no topo
  // Se estiver acessível aqui, expõe:
  window.AgroPro.getDb = () => db;
  window.AgroPro.saveDb = () => Storage.save(db);

  // helpers opcionais
  window.AgroPro.escapeHtml = (typeof escapeHtml === "function") ? escapeHtml : (s)=>String(s??"");
}catch(e){
  console.warn("Bridge AgroPro não conseguiu exportar tudo:", e);
}