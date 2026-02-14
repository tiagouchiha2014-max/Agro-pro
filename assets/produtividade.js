(function(){
  const AP = window.AgroPro;
  if(!AP || !AP.getDb){
    console.error("AgroPro bridge não encontrado. Verifique se colou o bridge no app.js.");
    return;
  }

  function uid(prefix="id"){
    // usa o do app se existir
    return (AP.uid ? AP.uid(prefix) : `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`);
  }

  function ensureMigrations(db){
    db.colheitas ||= [];
    db.talhoes ||= [];
    db.talhoes.forEach(t=>{ if(t.prodEsperada == null) t.prodEsperada = 0; });
  }

  function getTalhao(db, id){ return db.talhoes?.find(t=>t.id===id); }

  function todayISO(){
    const d = new Date();
    const pad=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function render(){
    const app = document.querySelector("#app");
    const db = AP.getDb();
    ensureMigrations(db);

    const empresaId = db.empresaAtivaId || (db.empresas?.[0]?.id);

    const talhoes = (db.talhoes||[]).filter(t => !empresaId || t.empresaId === empresaId);
    const colheitas = (db.colheitas||[]).filter(c => !empresaId || c.empresaId === empresaId);

    const optTalhoes = talhoes.map(t=>`<option value="${t.id}">${t.nome}</option>`).join("");

    const cards = talhoes.map(t=>{
      const area = Number(t.area||0);
      const esp = Number(t.prodEsperada||0);
      const esperadoTotal = area * esp;

      const colT = colheitas
        .filter(c=>c.talhaoId===t.id)
        .sort((a,b)=> String(b.data||"").localeCompare(String(a.data||"")));

      const realTotal = colT.reduce((s,c)=> s+Number(c.sacas||0), 0);
      const realScHa = area>0 ? (realTotal/area) : 0;

      return `
        <div class="card">
          <div class="row space">
            <div>
              <h3>${t.nome}</h3>
              <div class="muted">Área: ${area.toFixed(2)} ha</div>
              <div class="muted">Esperado: ${esp.toFixed(1)} sc/ha • Total esperado: ${(esperadoTotal||0).toFixed(0)} sc</div>
              <div class="muted">Real: ${realScHa.toFixed(1)} sc/ha • Total real: ${(realTotal||0).toFixed(0)} sc</div>
            </div>
          </div>

          <div class="muted" style="margin-top:10px">Lançamentos</div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Data</th><th style="text-align:right">Sacas</th><th>Obs.</th><th></th></tr></thead>
              <tbody>
                ${
                  colT.length ? colT.map(c=>`
                    <tr>
                      <td>${c.data||"-"}</td>
                      <td style="text-align:right">${Number(c.sacas||0).toFixed(0)}</td>
                      <td>${(c.obs||"").slice(0,40)}</td>
                      <td style="text-align:right"><button class="btn danger" data-delcol="${c.id}">Excluir</button></td>
                    </tr>
                  `).join("") : `<tr><td colspan="4" class="muted">Sem lançamentos</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join("");

    app.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <h1>Produtividade</h1>
            <p class="muted">Lance colheita real por talhão. O esperado (sc/ha) você define no cadastro do Talhão.</p>
          </div>
        </div>

        <div class="card">
          <h3>Novo lançamento</h3>
          <div class="grid cols-4">
            <div class="field">
              <label>Talhão</label>
              <select id="col_talhao">${optTalhoes}</select>
            </div>
            <div class="field">
              <label>Data</label>
              <input id="col_data" type="date" />
            </div>
            <div class="field">
              <label>Sacas (total do talhão)</label>
              <input id="col_sacas" type="number" step="1" placeholder="Ex: 3200" />
            </div>
            <div class="field">
              <label>Obs.</label>
              <input id="col_obs" type="text" placeholder="Opcional" />
            </div>
          </div>
          <div class="row end" style="margin-top:12px">
            <button class="btn primary" id="btnSalvarCol">Salvar</button>
          </div>
        </div>

        <div class="grid cols-2">
          ${cards || `<div class="muted">Cadastre talhões para começar.</div>`}
        </div>
      </div>
    `;

    const dataEl = document.querySelector("#col_data");
    if(dataEl && !dataEl.value) dataEl.value = todayISO();

    document.querySelector("#btnSalvarCol").onclick = () => {
      const talhaoId = document.querySelector("#col_talhao").value;
      const data = document.querySelector("#col_data").value || todayISO();
      const sacas = Number(document.querySelector("#col_sacas").value || 0);
      const obs = document.querySelector("#col_obs").value || "";

      if(!talhaoId || sacas<=0){
        alert("Selecione o talhão e informe as sacas.");
        return;
      }

      db.colheitas.push({
        id: uid("col"),
        empresaId,
        talhaoId,
        data,
        sacas,
        obs
      });

      AP.saveDb();
      render();
    };

    app.querySelectorAll("[data-delcol]").forEach(btn=>{
      btn.onclick = () => {
        const id = btn.getAttribute("data-delcol");
        db.colheitas = db.colheitas.filter(c=>c.id!==id);
        AP.saveDb();
        render();
      };
    });
  }

  if(document.body.dataset.page === "produtividade"){
    render();
  }
})();