(function(){
  if(typeof getDB !== "function"){ console.error("getDB não encontrado"); return; }
  if(typeof setDB !== "function"){ console.error("setDB não encontrado"); return; }

  const app = document.getElementById("app");
  if(!app) return;

  const db = getDB();
  const empresaId = db.session?.empresaId;

  function money(n){
    const v = Number(n||0);
    return `R$ ${v.toFixed(2)}`;
  }

  const fazendas = (db.fazendas||[]).filter(f=>f.empresaId===empresaId);
  const talhoes = (db.talhoes||[]).filter(t=>t.empresaId===empresaId);

  const combust = (db.combustivel||[]).filter(c=>c.empresaId===empresaId);
  const aplic = (db.aplicacoes||[]).filter(a=>a.empresaId===empresaId);

  // === TOTAIS ===
  const totalCombustivel = combust.reduce((s,c)=> s + (Number(c.litros||0)*Number(c.precoLitro||0)), 0);
  const totalAplicacoes  = aplic.reduce((s,a)=> s + Number(a.custoTotal||0), 0);
  const totalGeral = totalCombustivel + totalAplicacoes;

  // === AGRUPAMENTO POR TALHÃO ===
  const porTalhao = {};
  combust.forEach(c=>{
    const k = c.talhaoId || "";
    if(!k) return;
    porTalhao[k] = porTalhao[k] || { combust:0, aplic:0 };
    porTalhao[k].combust += Number(c.litros||0) * Number(c.precoLitro||0);
  });
  aplic.forEach(a=>{
    const k = a.talhaoId || "";
    if(!k) return;
    porTalhao[k] = porTalhao[k] || { combust:0, aplic:0 };
    porTalhao[k].aplic += Number(a.custoTotal||0);
  });

  const topTalhoes = Object.entries(porTalhao)
    .map(([talhaoId, v])=>{
      const t = talhoes.find(x=>x.id===talhaoId);
      const total = (v.combust||0) + (v.aplic||0);
      return { talhaoId, nome: t?.nome||"-", combust:v.combust||0, aplic:v.aplic||0, total };
    })
    .sort((a,b)=> b.total - a.total)
    .slice(0,10);

  // === LISTAS DETALHADAS ===
  const rowsComb = combust
    .slice()
    .sort((a,b)=> String(b.data||"").localeCompare(String(a.data||"")))
    .map(c=>{
      const f = fazendas.find(x=>x.id===c.fazendaId);
      const t = talhoes.find(x=>x.id===c.talhaoId);
      const custo = Number(c.litros||0)*Number(c.precoLitro||0);
      return `
        <tr>
          <td>${c.data||"-"}</td>
          <td>Combustível</td>
          <td>${f?.nome||"-"}</td>
          <td>${t?.nome||"-"}</td>
          <td style="text-align:right">${money(custo)}</td>
        </tr>
      `;
    }).join("");

  const rowsApl = aplic
    .slice()
    .sort((a,b)=> String(b.data||"").localeCompare(String(a.data||"")))
    .map(a=>{
      const f = fazendas.find(x=>x.id===a.fazendaId);
      const t = talhoes.find(x=>x.id===a.talhaoId);
      const custo = Number(a.custoTotal||0);
      return `
        <tr>
          <td>${a.data||"-"}</td>
          <td>Aplicação</td>
          <td>${f?.nome||"-"}</td>
          <td>${t?.nome||"-"}</td>
          <td style="text-align:right">${money(custo)}</td>
        </tr>
      `;
    }).join("");

  const rowsLanc = [rowsApl, rowsComb].join("");

  app.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Financeiro</h1>
          <p class="muted">Resumo completo de despesas (Aplicações + Combustível)</p>
        </div>
        <button class="btn" id="exportFin">Exportar CSV</button>
      </div>

      <div class="grid cols-3">
        <div class="card">
          <h3>Total geral</h3>
          <div class="big">${money(totalGeral)}</div>
          <div class="muted">Empresa ativa</div>
        </div>
        <div class="card">
          <h3>Aplicações</h3>
          <div class="big">${money(totalAplicacoes)}</div>
          <div class="muted">Somando custoTotal</div>
        </div>
        <div class="card">
          <h3>Combustível</h3>
          <div class="big">${money(totalCombustivel)}</div>
          <div class="muted">Litros × preço</div>
        </div>
      </div>

      <div class="card">
        <h3>Top talhões por custo</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Talhão</th>
              <th style="text-align:right">Aplicações</th>
              <th style="text-align:right">Combustível</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              topTalhoes.length ? topTalhoes.map(x=>`
                <tr>
                  <td>${x.nome}</td>
                  <td style="text-align:right">${money(x.aplic)}</td>
                  <td style="text-align:right">${money(x.combust)}</td>
                  <td style="text-align:right"><b>${money(x.total)}</b></td>
                </tr>
              `).join("") : `<tr><td colspan="4" class="muted">Sem dados</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Lançamentos</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Fazenda</th>
              <th>Talhão</th>
              <th style="text-align:right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rowsLanc || `<tr><td colspan="5" class="muted">Nenhum lançamento</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("exportFin").onclick = ()=>{
    // Export simples (lancamentos)
    const rows = [];

    aplic.forEach(a=>{
      const f = fazendas.find(x=>x.id===a.fazendaId);
      const t = talhoes.find(x=>x.id===a.talhaoId);
      rows.push({
        data: a.data||"",
        tipo: "Aplicação",
        fazenda: f?.nome||"",
        talhao: t?.nome||"",
        valor: Number(a.custoTotal||0).toFixed(2)
      });
    });

    combust.forEach(c=>{
      const f = fazendas.find(x=>x.id===c.fazendaId);
      const t = talhoes.find(x=>x.id===c.talhaoId);
      rows.push({
        data: c.data||"",
        tipo: "Combustível",
        fazenda: f?.nome||"",
        talhao: t?.nome||"",
        valor: (Number(c.litros||0)*Number(c.precoLitro||0)).toFixed(2)
      });
    });

    rows.sort((a,b)=> String(b.data).localeCompare(String(a.data)));

    const csv = (function toCSV(rows){
      if(!rows.length) return "";
      const cols = Object.keys(rows[0]);
      const esc = v => `"${String(v ?? "").replaceAll('"','""')}"`;
      const header = cols.map(esc).join(",");
      const lines = rows.map(r => cols.map(c => esc(r[c])).join(","));
      return [header, ...lines].join("\n");
    })(rows);

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

})();