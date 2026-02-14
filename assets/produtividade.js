(function(){

  console.log("Produtividade carregando...");

  // pega DB do app principal
  if(typeof getDB !== "function"){
    console.error("getDB não encontrado");
    return;
  }

  const db = getDB();
  const empresaId = db.session?.empresaId;

  const talhoes = (db.talhoes||[]).filter(t=>t.empresaId===empresaId);

  const app = document.getElementById("app");
  if(!app) return;

  // garante estrutura
  db.colheitas = db.colheitas || [];

  const hoje = new Date().toISOString().slice(0,10);

  app.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Produtividade</h1>
          <p class="muted">Controle de produtividade por talhão</p>
        </div>
      </div>

      <div class="card">
        <h3>Novo lançamento</h3>
        <div class="grid cols-4">
          <div class="field">
            <label>Talhão</label>
            <select id="col_talhao">
              ${talhoes.map(t=>`<option value="${t.id}">${t.nome}</option>`).join("")}
            </select>
          </div>

          <div class="field">
            <label>Data</label>
            <input id="col_data" type="date" value="${hoje}">
          </div>

          <div class="field">
            <label>Sacas colhidas</label>
            <input id="col_sacas" type="number">
          </div>

          <div class="field">
            <label>Obs</label>
            <input id="col_obs">
          </div>
        </div>

        <div class="row end" style="margin-top:10px">
          <button class="btn primary" id="salvarCol">Salvar</button>
        </div>
      </div>

      <div class="card">
        <h3>Lançamentos</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Talhão</th>
              <th>Data</th>
              <th>Sacas</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="listaCol"></tbody>
        </table>
      </div>
    </div>
  `;

  function renderLista(){
    const tbody = document.getElementById("listaCol");
    tbody.innerHTML="";

    db.colheitas.forEach(c=>{
      const t = talhoes.find(x=>x.id===c.talhaoId);
      tbody.innerHTML += `
        <tr>
          <td>${t?.nome||"-"}</td>
          <td>${c.data}</td>
          <td>${c.sacas}</td>
          <td><button class="btn danger" data-id="${c.id}">Excluir</button></td>
        </tr>
      `;
    });

    tbody.querySelectorAll("button").forEach(btn=>{
      btn.onclick=()=>{
        db.colheitas = db.colheitas.filter(c=>c.id!==btn.dataset.id);
        setDB(db);
        renderLista();
      }
    });
  }

  renderLista();

  document.getElementById("salvarCol").onclick = ()=>{
    const talhaoId = document.getElementById("col_talhao").value;
    const data = document.getElementById("col_data").value;
    const sacas = Number(document.getElementById("col_sacas").value||0);
    const obs = document.getElementById("col_obs").value||"";

    if(!talhaoId || sacas<=0){
      alert("Informe talhão e sacas.");
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

    setDB(db);
    renderLista();
  };

})();