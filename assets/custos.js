(function(){
  if(document.body.dataset.page !== "custos") return;

  if(typeof getDB !== "function"){ console.error("getDB não encontrado"); return; }
  if(typeof setDB !== "function"){ console.error("setDB não encontrado"); return; }

  const app = document.getElementById("app");
  if(!app) return;

  const esc = (typeof escapeHtml === "function")
    ? escapeHtml
    : (s)=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  const money = (n)=>`R$ ${Number(n||0).toFixed(2)}`;
  const num = (n, d=2)=>Number(n||0).toFixed(d);

  // normaliza nomes pra bater produtoNome (aplicação) com produto.nome (cadastro)
  const norm = (s)=>String(s||"")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");

  function todayISO(){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function firstDayOfMonthISO(){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`;
  }

  function ensureMigrations(db){
    db.produtos ||= [];
    db.aplicacoes ||= [];
    db.fazendas ||= [];
    db.talhoes ||= [];

    // garante preco
    db.produtos.forEach(p=>{
      if(p.preco == null) p.preco = 0;
    });
  }

  function findProdutoByNome(db, empresaId, produtoNome){
    const n = norm(produtoNome);
    return (db.produtos||[])
      .filter(p=>p.empresaId===empresaId)
      .find(p => norm(p.nome) === n);
  }

  function inRange(dateISO, minISO, maxISO){
    if(!dateISO) return false;
    if(minISO && dateISO < minISO) return false;
    if(maxISO && dateISO > maxISO) return false;
    return true;
  }

  function calcAplicacaoCost(db, empresaId, apl){
    // custo = soma(dosePorHa * areaHaAplicada * precoProduto)
    const area = Number(apl.areaHaAplicada || 0);
    const itens = Array.isArray(apl.produtos) ? apl.produtos : [];

    let total = 0;
    const itensCalc = [];
    const issues = [];

    if(area <= 0) issues.push("Área aplicada (ha) ausente/zero");

    for(const it of itens){
      const nome = it.produtoNome || it.nome || "";
      const dose = Number(it.dosePorHa || it.dose || 0);

      const prod = findProdutoByNome(db, empresaId, nome);
      if(!prod){
        issues.push(`Produto não encontrado: ${nome || "(vazio)"}`);
        itensCalc.push({ nome, dose, area, preco: 0, custo: 0, status:"SEM CADASTRO" });
        continue;
      }

      const preco = Number(prod.preco || 0);
      if(preco <= 0){
        issues.push(`Sem preço: ${prod.nome}`);
      }
      if(dose <= 0){
        issues.push(`Dose zerada: ${prod.nome}`);
      }

      const custo = (dose > 0 && area > 0 && preco > 0) ? (dose * area * preco) : 0;
      total += custo;

      itensCalc.push({
        produtoId: prod.id,
        nome: prod.nome,
        dose,
        area,
        preco,
        custo,
        status: (preco>0 && dose>0 && area>0) ? "OK" : "INCOMPLETO"
      });
    }

    const custoHa = (area > 0) ? (total / area) : 0;

    return { total, custoHa, itensCalc, issues };
  }

  function build(){
    const db = getDB();
    ensureMigrations(db);

    const empresaId = db.session?.empresaId;
    const fazendas = (db.fazendas||[]).filter(f=>f.empresaId===empresaId);
    const talhoes  = (db.talhoes||[]).filter(t=>t.empresaId===empresaId);
    const aplic    = (db.aplicacoes||[]).filter(a=>a.empresaId===empresaId);

    // defaults filtros
    const defMin = firstDayOfMonthISO();
    const defMax = todayISO();

    app.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <h1>Custos (Enterprise)</h1>
            <p class="muted">Custo por talhão usando: <b>dose/ha × área aplicada × preço do produto</b>.</p>
          </div>
          <div class="row end" style="gap:10px">
            <button class="btn" id="btnExport">Exportar CSV</button>
            <button class="btn primary" id="btnRecalcSave">Recalcular e Gravar</button>
          </div>
        </div>

        <div class="card">
          <h3>Filtros</h3>
          <div class="grid cols-5">
            <div class="field">
              <label>Data inicial</label>
              <input id="fMin" type="date" value="${defMin}">
            </div>
            <div class="field">
              <label>Data final</label>
              <input id="fMax" type="date" value="${defMax}">
            </div>
            <div class="field">
              <label>Fazenda</label>
              <select id="fFaz">
                <option value="">Todas</option>
                ${fazendas.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Talhão</label>
              <select id="fTal">
                <option value="">Todos</option>
                ${talhoes.map(t=>`<option value="${t.id}">${esc(t.nome)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Cultura</label>
              <input id="fCultura" placeholder="Ex: Soja">
            </div>
          </div>

          <div class="grid cols-3" style="margin-top:10px">
            <div class="field">
              <label>Operação</label>
              <input id="fOper" placeholder="Ex: Pulverização">
            </div>
            <div class="field">
              <label>Somente com custo calculável</label>
              <select id="fOnlyOk">
                <option value="0">Não</option>
                <option value="1">Sim</option>
              </select>
            </div>
            <div class="field">
              <label>Ação</label>
              <button class="btn" id="btnApply">Aplicar filtros</button>
            </div>
          </div>
        </div>

        <div class="grid cols-4" id="kpis"></div>

        <div class="grid cols-2">
          <div class="card">
            <h3>Top Talhões por Custo</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Talhão</th>
                  <th style="text-align:right">Área (ha)</th>
                  <th style="text-align:right">Custo</th>
                  <th style="text-align:right">R$/ha</th>
                </tr>
              </thead>
              <tbody id="tbTalhoes"></tbody>
            </table>
          </div>

          <div class="card">
            <h3>Top Produtos por Custo</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style="text-align:right">Custo</th>
                  <th style="text-align:right">% do total</th>
                </tr>
              </thead>
              <tbody id="tbProdutos"></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3>Auditoria</h3>
          <div class="muted" id="auditTxt"></div>
          <table class="table" style="margin-top:10px">
            <thead>
              <tr>
                <th>Data</th>
                <th>Talhão</th>
                <th>Problema</th>
              </tr>
            </thead>
            <tbody id="tbAudit"></tbody>
          </table>
        </div>

        <div class="card">
          <h3>Detalhamento por Aplicação</h3>
          <div class="muted">Clique em uma aplicação para ver itens e custos.</div>
          <table class="table" style="margin-top:10px">
            <thead>
              <tr>
                <th>Data</th>
                <th>Fazenda</th>
                <th>Talhão</th>
                <th>Cultura</th>
                <th>Operação</th>
                <th style="text-align:right">Área (ha)</th>
                <th style="text-align:right">Custo</th>
              </tr>
            </thead>
            <tbody id="tbAplic"></tbody>
          </table>
        </div>

        <div class="card" id="drawer" style="display:none">
          <div class="row space">
            <h3>Itens da Aplicação</h3>
            <button class="btn" id="btnClose">Fechar</button>
          </div>
          <div class="muted" id="drawerInfo"></div>
          <table class="table" style="margin-top:10px">
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align:right">Dose</th>
                <th style="text-align:right">Área</th>
                <th style="text-align:right">Preço</th>
                <th style="text-align:right">Custo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="tbItens"></tbody>
          </table>
        </div>
      </div>
    `;

    const els = {
      fMin: document.getElementById("fMin"),
      fMax: document.getElementById("fMax"),
      fFaz: document.getElementById("fFaz"),
      fTal: document.getElementById("fTal"),
      fCultura: document.getElementById("fCultura"),
      fOper: document.getElementById("fOper"),
      fOnlyOk: document.getElementById("fOnlyOk"),
      btnApply: document.getElementById("btnApply"),
      kpis: document.getElementById("kpis"),
      tbTalhoes: document.getElementById("tbTalhoes"),
      tbProdutos: document.getElementById("tbProdutos"),
      auditTxt: document.getElementById("auditTxt"),
      tbAudit: document.getElementById("tbAudit"),
      tbAplic: document.getElementById("tbAplic"),
      drawer: document.getElementById("drawer"),
      btnClose: document.getElementById("btnClose"),
      drawerInfo: document.getElementById("drawerInfo"),
      tbItens: document.getElementById("tbItens"),
      btnExport: document.getElementById("btnExport"),
      btnRecalcSave: document.getElementById("btnRecalcSave"),
    };

    function getFilters(){
      return {
        min: els.fMin.value,
        max: els.fMax.value,
        fazendaId: els.fFaz.value,
        talhaoId: els.fTal.value,
        cultura: (els.fCultura.value||"").trim(),
        operacao: (els.fOper.value||"").trim(),
        onlyOk: els.fOnlyOk.value === "1",
      };
    }

    function apply(){
      const f = getFilters();

      // filtra aplicações
      let list = aplic.filter(a => inRange(a.data, f.min, f.max));
      if(f.fazendaId) list = list.filter(a=>a.fazendaId===f.fazendaId);
      if(f.talhaoId)  list = list.filter(a=>a.talhaoId===f.talhaoId);
      if(f.cultura)   list = list.filter(a=>String(a.cultura||"").toLowerCase().includes(f.cultura.toLowerCase()));
      if(f.operacao)  list = list.filter(a=>String(a.operacao||"").toLowerCase().includes(f.operacao.toLowerCase()));

      // calcula custos
      const computed = list.map(a=>{
        const calc = calcAplicacaoCost(db, empresaId, a);
        return { apl: a, calc };
      });

      if(f.onlyOk){
        // somente aplicações com custo > 0 e sem issues críticas
        list = computed.filter(x => x.calc.total > 0).map(x=>x.apl);
      }

      const computed2 = (f.onlyOk ? computed.filter(x=>x.calc.total>0) : computed);

      // KPIs
      const totalCusto = computed2.reduce((s,x)=>s + x.calc.total, 0);
      const totalArea  = computed2.reduce((s,x)=>s + Number(x.apl.areaHaAplicada||0), 0);
      const custoHaMedio = totalArea>0 ? totalCusto/totalArea : 0;

      const semPreco = computed2.filter(x=> x.calc.itensCalc.some(it=>it.status!=="OK" && (it.preco<=0))).length;
      const comIssue = computed2.filter(x=> x.calc.issues.length>0).length;

      els.kpis.innerHTML = `
        <div class="card"><h3>Total (R$)</h3><div class="big">${money(totalCusto)}</div><div class="muted">Aplicações filtradas</div></div>
        <div class="card"><h3>Área aplicada</h3><div class="big">${num(totalArea,1)} ha</div><div class="muted">Somatório</div></div>
        <div class="card"><h3>Custo médio</h3><div class="big">${money(custoHaMedio)}/ha</div><div class="muted">Total ÷ Área</div></div>
        <div class="card"><h3>Alertas</h3><div class="big">${semPreco}</div><div class="muted">Aplicações com itens sem preço</div></div>
      `;

      // Agrupa por talhão
      const byTal = {};
      for(const x of computed2){
        const a = x.apl;
        const tId = a.talhaoId || "";
        if(!tId) continue;
        byTal[tId] ||= { area:0, custo:0 };
        byTal[tId].area += Number(a.areaHaAplicada||0);
        byTal[tId].custo += x.calc.total;
      }
      const talRows = Object.entries(byTal)
        .map(([talhaoId, v])=>{
          const t = talhoes.find(tt=>tt.id===talhaoId);
          const custoHa = v.area>0 ? v.custo/v.area : 0;
          return { nome: t?.nome||"-", area:v.area, custo:v.custo, custoHa };
        })
        .sort((a,b)=>b.custo-a.custo)
        .slice(0,15);

      els.tbTalhoes.innerHTML = talRows.length ? talRows.map(r=>`
        <tr>
          <td>${esc(r.nome)}</td>
          <td style="text-align:right">${num(r.area,1)}</td>
          <td style="text-align:right">${money(r.custo)}</td>
          <td style="text-align:right">${money(r.custoHa)}</td>
        </tr>
      `).join("") : `<tr><td colspan="4" class="muted">Sem dados no filtro</td></tr>`;

      // Agrupa por produto
      const byProd = {};
      for(const x of computed2){
        for(const it of x.calc.itensCalc){
          const k = it.nome || it.produtoId || "Sem nome";
          byProd[k] ||= 0;
          byProd[k] += Number(it.custo||0);
        }
      }
      const prodRows = Object.entries(byProd)
        .map(([nome, custo])=>{
          const pct = totalCusto>0 ? (custo/totalCusto)*100 : 0;
          return { nome, custo, pct };
        })
        .sort((a,b)=>b.custo-a.custo)
        .slice(0,15);

      els.tbProdutos.innerHTML = prodRows.length ? prodRows.map(r=>`
        <tr>
          <td>${esc(r.nome)}</td>
          <td style="text-align:right">${money(r.custo)}</td>
          <td style="text-align:right">${num(r.pct,1)}%</td>
        </tr>
      `).join("") : `<tr><td colspan="3" class="muted">Sem custos calculáveis</td></tr>`;

      // Auditoria
      const audit = [];
      for(const x of computed2){
        const a = x.apl;
        const t = talhoes.find(tt=>tt.id===a.talhaoId);
        for(const msg of x.calc.issues){
          audit.push({ data:a.data||"", talhao:t?.nome||"-", problema: msg, aplId: a.id });
        }
      }
      els.auditTxt.innerHTML = `
        <b>${computed2.length}</b> aplicações analisadas •
        <b>${comIssue}</b> com alertas •
        <b>${audit.length}</b> ocorrências
      `;

      els.tbAudit.innerHTML = audit.length ? audit
        .slice(0,50)
        .map(r=>`
          <tr>
            <td>${esc(r.data)}</td>
            <td>${esc(r.talhao)}</td>
            <td>${esc(r.problema)}</td>
          </tr>
        `).join("") : `<tr><td colspan="3" class="muted">Sem alertas</td></tr>`;

      // Tabela aplicações (clicável)
      els.tbAplic.innerHTML = computed2
        .slice()
        .sort((a,b)=> String(b.apl.data||"").localeCompare(String(a.apl.data||"")))
        .map(x=>{
          const a = x.apl;
          const fz = fazendas.find(f=>f.id===a.fazendaId);
          const tl = talhoes.find(t=>t.id===a.talhaoId);
          return `
            <tr data-open="${a.id}">
              <td>${esc(a.data||"-")}</td>
              <td>${esc(fz?.nome||"-")}</td>
              <td>${esc(tl?.nome||"-")}</td>
              <td>${esc(a.cultura||"-")}</td>
              <td>${esc(a.operacao||"-")}</td>
              <td style="text-align:right">${num(a.areaHaAplicada||0,1)}</td>
              <td style="text-align:right"><b>${money(x.calc.total)}</b></td>
            </tr>
          `;
        }).join("");

      // clique abre drawer itens
      els.tbAplic.querySelectorAll("tr[data-open]").forEach(tr=>{
        tr.style.cursor = "pointer";
        tr.onclick = ()=>{
          const id = tr.getAttribute("data-open");
          const x = computed2.find(z=>z.apl.id===id);
          if(!x) return;

          const a = x.apl;
          const fz = fazendas.find(f=>f.id===a.fazendaId);
          const tl = talhoes.find(t=>t.id===a.talhaoId);

          els.drawer.style.display = "";
          els.drawerInfo.innerHTML = `
            <b>${esc(a.data||"-")}</b> • ${esc(fz?.nome||"-")} • ${esc(tl?.nome||"-")} •
            Área: <b>${num(a.areaHaAplicada||0,1)} ha</b> • Custo: <b>${money(x.calc.total)}</b> • R$/ha: <b>${money(x.calc.custoHa)}</b>
          `;

          els.tbItens.innerHTML = x.calc.itensCalc.length ? x.calc.itensCalc.map(it=>`
            <tr>
              <td>${esc(it.nome||"-")}</td>
              <td style="text-align:right">${num(it.dose||0,2)}</td>
              <td style="text-align:right">${num(it.area||0,1)}</td>
              <td style="text-align:right">${money(it.preco||0)}</td>
              <td style="text-align:right"><b>${money(it.custo||0)}</b></td>
              <td>${esc(it.status)}</td>
            </tr>
          `).join("") : `<tr><td colspan="6" class="muted">Sem itens</td></tr>`;
        };
      });

      // export (CSV) do detalhado
      els.btnExport.onclick = ()=>{
        const rows = computed2.flatMap(x=>{
          const a = x.apl;
          const fz = fazendas.find(f=>f.id===a.fazendaId);
          const tl = talhoes.find(t=>t.id===a.talhaoId);

          return (x.calc.itensCalc.length ? x.calc.itensCalc : [{nome:"(sem itens)", dose:0, area:Number(a.areaHaAplicada||0), preco:0, custo:0, status:"INCOMPLETO"}])
            .map(it=>({
              data: a.data||"",
              fazenda: fz?.nome||"",
              talhao: tl?.nome||"",
              cultura: a.cultura||"",
              operacao: a.operacao||"",
              areaHa: Number(a.areaHaAplicada||0),
              produto: it.nome||"",
              dosePorHa: Number(it.dose||0),
              preco: Number(it.preco||0),
              custoItem: Number(it.custo||0),
              custoAplicacao: Number(x.calc.total||0),
              custoHa: Number(x.calc.custoHa||0),
              status: it.status||""
            }));
        });

        const csv = (function toCSV(rows){
          if(!rows.length) return "";
          const cols = Object.keys(rows[0]);
          const escv = v => `"${String(v ?? "").replaceAll('"','""')}"`;
          const header = cols.map(escv).join(",");
          const lines = rows.map(r => cols.map(c => escv(r[c])).join(","));
          return [header, ...lines].join("\n");
        })(rows);

        const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `custos_${todayISO()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      // recalcular e gravar dentro das aplicações (opcional enterprise)
      els.btnRecalcSave.onclick = ()=>{
        const db2 = getDB();
        ensureMigrations(db2);
        const empresaId2 = db2.session?.empresaId;

        let count = 0;
        for(const a of (db2.aplicacoes||[])){
          if(a.empresaId !== empresaId2) continue;
          if(!inRange(a.data, f.min, f.max)) continue;
          if(f.fazendaId && a.fazendaId !== f.fazendaId) continue;
          if(f.talhaoId && a.talhaoId !== f.talhaoId) continue;

          const calc = calcAplicacaoCost(db2, empresaId2, a);
          a.custoTotal = Number(calc.total||0);
          a.custoPorHa = Number(calc.custoHa||0);
          a.itensCalculados = calc.itensCalc;
          a.custosAudit = calc.issues;
          count++;
        }
        setDB(db2);

        if(typeof toast === "function"){
          toast("Custos atualizados", `${count} aplicações recalculadas e gravadas.`);
        }else{
          alert(`${count} aplicações recalculadas e gravadas.`);
        }

        // re-render
        location.reload();
      };

      els.btnClose.onclick = ()=>{
        els.drawer.style.display = "none";
      };
    }

    els.btnApply.onclick = apply;
    apply();
  }

  build();
})();