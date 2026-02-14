(function(){
  const AP = window.AgroPro;
  if(!AP || !AP.getDb){
    console.error("AgroPro bridge não encontrado. Verifique se colou o bridge no app.js.");
    return;
  }

  function money(n){
    const v = Number(n||0);
    return `R$ ${v.toFixed(2)}`;
  }

  function getProduto(db, id){ return db.produtos?.find(p=>p.id===id); }
  function getTalhao(db, id){ return db.talhoes?.find(t=>t.id===id); }

  function downloadTextFile(filename, content){
    const blob = new Blob([content], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function ensureMigrations(db){
    db.aplicacoes ||= [];
    db.produtos ||= [];
    db.talhoes ||= [];

    db.produtos.forEach(p=>{ if(p.preco == null) p.preco = 0; });
    db.talhoes.forEach(t=>{ if(t.prodEsperada == null) t.prodEsperada = 0; });
    db.aplicacoes.forEach(a=>{ if(a.custo == null) a.custo = 0; });
  }

  function render(){
    const app = document.querySelector("#app");
    const db = AP.getDb();

    ensureMigrations(db);

    const empresaId = db.empresaAtivaId || (db.empresas?.[0]?.id);

    const aplic = (db.aplicacoes||[]).filter(a => !empresaId || a.empresaId === empresaId);

    let total = 0;
    aplic.forEach(a=> total += Number(a.custo||0));

    // grupo por talhão
    const porTalhao = {};
    aplic.forEach(a=>{
      const k = a.talhaoId || "sem_talhao";
      porTalhao[k] ||= 0;
      porTalhao[k] += Number(a.custo||0);
    });

    const topTalhoes = Object.entries(porTalhao)
      .sort((a,b)=> b[1]-a[1])
      .slice(0,8)
      .map(([talhaoId, v])=>{
        const t = getTalhao(db, talhaoId);
        return `<div class="pill"><b>${t?.nome || "-"}</b> ${money(v)}</div>`;
      }).join("");

    const rows = aplic
      .slice()
      .sort((a,b)=> String(b.data||"").localeCompare(String(a.data||"")))
      .map(a=>{
        const t = getTalhao(db, a.talhaoId);
        const p = getProduto(db, a.produtoId);
        const nomeProd = p?.nome || p?.nomeComercial || a.produtoNome || "-";
        return `
          <tr>
            <td>${t?.nome || "-"}</td>
            <td>${a.data || "-"}</td>
            <td>${nomeProd}</td>
            <td style="text-align:right">${money(a.custo||0)}</td>
          </tr>
        `;
      }).join("");

    app.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <h1>Financeiro</h1>
            <p class="muted">Despesas geradas pelas aplicações (custo automático quando disponível).</p>
          </div>
          <button class="btn" id="btnExportFin">Exportar CSV</button>
        </div>

        <div class="grid cols-3">
          <div class="card">
            <h3>Total em Aplicações</h3>
            <div class="big">${money(total)}</div>
            <div class="muted">Empresa ativa</div>
          </div>

          <div class="card">
            <h3>Top Talhões (custo)</h3>
            <div class="pill-row">${topTalhoes || "<span class='muted'>Sem dados</span>"}</div>
          </div>

          <div class="card">
            <h3>Observação</h3>
            <div class="muted">
              Se alguma aplicação estiver com custo 0, é porque o produto ainda não tem preço
              ou o custo não foi calculado no lançamento.
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Lançamentos</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Talhão</th>
                <th>Data</th>
                <th>Produto</th>
                <th style="text-align:right">Custo</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4" class="muted">Nenhuma aplicação encontrada.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.querySelector("#btnExportFin").onclick = () => {
      const header = ["data","talhao","produto","custo"];
      const lines = aplic.map(a=>{
        const t = getTalhao(db, a.talhaoId);
        const p = getProduto(db, a.produtoId);
        const nomeProd = p?.nome || p?.nomeComercial || a.produtoNome || "";
        return [
          a.data || "",
          (t?.nome || "").replaceAll(";"," "),
          (nomeProd || "").replaceAll(";"," "),
          Number(a.custo||0).toFixed(2)
        ].join(";");
      });

      const csv = [header.join(";"), ...lines].join("\n");
      const d = new Date().toISOString().slice(0,10);
      downloadTextFile(`financeiro_${d}.csv`, csv);
    };
  }

  // renderiza ao carregar
  if(document.body.dataset.page === "financeiro"){
    render();
  }
})();