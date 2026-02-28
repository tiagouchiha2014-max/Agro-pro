// PÁGINAS ESPECÍFICAS
// ============================================================================

function pageSafras() {
  const db = getDB();
  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>Cadastrar nova safra</h3>
        <div class="help">Cada safra tem seus próprios talhões, estoque e aplicações.</div>
        <div class="hr"></div>
        <form id="frm" class="formGrid">
          <div><small>Nome da safra</small><input class="input" name="nome" required placeholder="Ex: Safra 2026/27"></div>
          <div><small>Data início</small><input class="input" name="dataInicio" type="date" value="${nowISO()}"></div>
          <div><small>Data fim</small><input class="input" name="dataFim" type="date"></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="observacoes"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Salvar safra</button>
          </div>
        </form>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Safra</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Status</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function render() {
    const db2 = getDB();
    const tb = document.getElementById("tbody");
    tb.innerHTML = db2.safras.slice().reverse().map(s => `
      <tr>
        <td><b>${escapeHtml(s.nome)}</b></td>
        <td>${s.dataInicio || '-'}</td>
        <td>${s.dataFim || '-'}</td>
        <td><span class="pill ${s.ativa ? 'ok' : ''}">${s.ativa ? 'Ativa' : 'Inativa'}</span></td>
        <td class="noPrint">
          <button class="btn" onclick="window.__usar('${s.id}')">Usar</button>
          <button class="btn danger" onclick="window.__delSafra('${s.id}')">Excluir</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sem safras cadastradas.</td></tr>`;
  }

  window.__usar = (id) => {
    setSafraId(id);
    toast("Safra ativa", "Mudando para a safra selecionada…");
    setTimeout(() => location.reload(), 200);
  };

  window.__delSafra = (id) => {
    const db2 = getDB();
    if (db2.safras.length <= 1) {
      alert("Você precisa ter pelo menos 1 safra.");
      return;
    }
    if (!confirm("Excluir safra e TODOS os dados dela? (fazendas, talhões, aplicações)")) return;

    db2.safras = db2.safras.filter(x => x.id !== id);
    const wipe = key => db2[key] = (db2[key] || []).filter(x => x.safraId !== id);
    ["fazendas", "talhoes", "produtos", "estoque", "equipe", "maquinas", "clima", "aplicacoes", "combustivel", "dieselEntradas", "dieselEstoque", "lembretes", "pragas", "colheitas"].forEach(wipe);

    if (getSafraId() === id) {
      db2.session.safraId = db2.safras[0].id;
    }
    setDB(db2);
    toast("Excluída", "Safra removida com dados associados.");
    setTimeout(() => location.reload(), 200);
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
      id: uid("saf"),
      nome: fd.get("nome"),
      dataInicio: fd.get("dataInicio") || nowISO(),
      dataFim: fd.get("dataFim") || "",
      ativa: true,
      observacoes: fd.get("observacoes") || ""
    };
    const db2 = getDB();
    db2.safras.push(obj);
    setDB(db2);
    setSafraId(obj.id);
    e.target.reset();
    toast("Salvo", "Safra adicionada.");
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`safras-${nowISO()}.csv`, toCSV(db2.safras));
    toast("Exportado", "CSV baixado.");
  });

  render();
}


