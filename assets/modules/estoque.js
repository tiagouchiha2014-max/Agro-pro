function pageEstoque() {
  const db = getDB();
  const produtos = onlySafra(db.produtos);

  function encontrarRegistroExistente(db, produtoId, deposito) {
    return db.estoque.find(s => 
      s.safraId === getSafraId() && 
      s.produtoId === produtoId && 
      (s.deposito || "Central") === (deposito || "Central")
    );
  }

  setTopActions(`
    <button class="btn" id="btnExportCSV">Exportar CSV</button>
    <button class="btn primary" id="btnReabastecer">+ Reabastecer produto</button>
  `);

  const content = document.getElementById("content");

  const formHtml = `
    <div class="card">
      <h3>Adicionar produto ao estoque</h3>
      <div class="help">Se o produto já existir no mesmo depósito, a quantidade será somada.</div>
      <div class="hr"></div>
      <form id="frm" class="formGrid">
        <div>
          <small>Produto</small>
          <select class="select" name="produtoId" required>
            <option value="">Selecione...</option>
            ${produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)}</option>`).join('')}
          </select>
        </div>
        <div><small>Depósito</small><input class="input" name="deposito" placeholder="Central" value="Central" /></div>
        <div><small>Lote</small><input class="input" name="lote" placeholder="Opcional" /></div>
        <div><small>Validade</small><input class="input" name="validade" placeholder="YYYY-MM-DD" /></div>
        <div><small>Quantidade</small><input class="input" name="qtd" type="number" step="0.01" required /></div>
        <div><small>Unidade</small><input class="input" name="unidade" placeholder="L / kg" readonly /></div>
        <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
        <div class="full row" style="justify-content:flex-end">
          <button class="btn primary" type="submit">Adicionar ao estoque</button>
        </div>
      </form>
    </div>
  `;

  const modalReabastecer = `
    <div id="modalReabastecer" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; justify-content:center; align-items:center;">
      <div style="background:#1a1a1f; padding:20px; border-radius:12px; width:400px;">
        <h3>Reabastecer produto</h3>
        <div class="hr"></div>
        <select class="select" id="reabastecerProduto" style="width:100%; margin-bottom:10px;">
          <option value="">Selecione um produto...</option>
          ${produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}
        </select>
        <input class="input" id="reabastecerDeposito" placeholder="Depósito" value="Central" style="width:100%; margin-bottom:10px;" />
        <input class="input" id="reabastecerQtd" type="number" step="0.01" placeholder="Quantidade a adicionar" style="width:100%; margin-bottom:10px;" />
        <input class="input" id="reabastecerLote" placeholder="Lote (opcional)" style="width:100%; margin-bottom:10px;" />
        <input class="input" id="reabastecerValidade" placeholder="Validade (opcional)" style="width:100%; margin-bottom:10px;" />
        <textarea class="textarea" id="reabastecerObs" placeholder="Observações" style="width:100%; margin-bottom:10px;"></textarea>
        <div class="row" style="justify-content:flex-end; gap:10px;">
          <button class="btn" onclick="fecharModalReabastecer()">Cancelar</button>
          <button class="btn primary" onclick="confirmarReabastecer()">Reabastecer</button>
        </div>
      </div>
    </div>
  `;

  const tableHtml = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Depósito</th>
            <th>Lote</th>
            <th>Validade</th>
            <th>Qtd</th>
            <th>Unid.</th>
            <th>Obs</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    ${modalReabastecer}
  `;

  content.innerHTML = `<div class="section">${formHtml}${tableHtml}</div>`;

  window.fecharModalReabastecer = () => {
    document.getElementById('modalReabastecer').classList.add('hidden');
  };

  window.confirmarReabastecer = () => {
    const produtoId = document.getElementById('reabastecerProduto').value;
    const deposito = document.getElementById('reabastecerDeposito').value || 'Central';
    const qtd = parseFloat(document.getElementById('reabastecerQtd').value);
    const lote = document.getElementById('reabastecerLote').value;
    const validade = document.getElementById('reabastecerValidade').value;
    const obs = document.getElementById('reabastecerObs').value;

    if (!produtoId || !qtd || qtd <= 0) {
      alert('Selecione um produto e informe uma quantidade válida');
      return;
    }

    const db2 = getDB();
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const existente = db2.estoque.find(s => 
      s.safraId === getSafraId() && 
      s.produtoId === produtoId && 
      s.deposito === deposito
    );

    if (existente) {
      existente.quantidade_atual = Number(existente.quantidade_atual || 0) + qtd;
      existente.obs = obs || existente.obs;
      if (lote) existente.lote = lote;
      if (validade) existente.validade = validade;
      toast("Reabastecido", `${produto.nome} agora tem ${existente.quantidade_atual} ${existente.unidade}`);
    } else {
      db2.estoque.push({
        id: uid("stk"),
        safra_id: getSafraId(),
        produto_id: produtoId,
        deposito,
        lote: lote || "",
        validade: validade || "",
        quantidade_atual: qtd,
        unidade: produto.unidade,
        obs: obs || ""
      });
      toast("Novo produto", `${produto.nome} adicionado ao estoque`);
    }

    setDB(db2);
    fecharModalReabastecer();
    renderTable();
  };

  document.getElementById("btnReabastecer").addEventListener("click", () => {
    document.getElementById('modalReabastecer').classList.remove('hidden');
    document.getElementById('modalReabastecer').classList.add('flex');
  });

  document.querySelector('select[name="produtoId"]').addEventListener('change', (e) => {
    const produto = produtos.find(p => p.id === e.target.value);
    if (produto) {
      document.querySelector('input[name="unidade"]').value = produto.unidade;
    }
  });

  function renderTable() {
    const db2 = getDB();
    const rows = onlySafra(db2.estoque || []);
    const tb = document.getElementById("tbody");

    tb.innerHTML = rows.map(r => {
      const p = produtos.find(p => p.id === r.produtoId);
      const nome = p ? `${p.nome} (${p.tipo})` : "(sem produto)";
      return `
        <tr>
          <td><b>${escapeHtml(nome)}</b></td>
          <td>${escapeHtml(r.deposito || "Central")}</td>
          <td>${escapeHtml(r.lote || "")}</td>
          <td>${escapeHtml(r.validade || "")}</td>
          <td><b>${num(r.quantidade_atual || 0, 2)}</b></td>
          <td>${escapeHtml(r.unidade || "")}</td>
          <td>${escapeHtml(r.obs || "")}</td>
          <td class="noPrint">
            <button class="btn" onclick="reabastecerRapido('${r.id}')" style="margin-right:5px;">➕</button>
            <button class="btn danger" onclick="window.__del('${r.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join("") || '<tr><td colspan="8">Nenhum item no estoque.</td></tr>';
  }

  window.reabastecerRapido = (estoqueId) => {
    const db2 = getDB();
    const item = db2.estoque.find(s => s.id === estoqueId);
    if (!item) return;

    const qtd = prompt(`Quantidade adicional para ${item.produtoNome || 'este produto'}:`, "0");
    if (!qtd) return;

    const qtdNum = parseFloat(qtd);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      alert("Quantidade inválida");
      return;
    }

    item.quantidade_atual = Number(item.quantidade_atual || 0) + qtdNum;
    setDB(db2);
    toast("Reabastecido", `+${qtdNum} ${item.unidade} adicionados`);
    renderTable();
  };

  window.__del = (id) => {
    if (!confirm("Excluir este item do estoque?")) return;
    const db2 = getDB();
    db2.estoque = db2.estoque.filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Item removido do estoque.");
    renderTable();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const produtoId = fd.get("produtoId");
    const deposito = fd.get("deposito") || "Central";
    const qtd = Number(fd.get("qtd") || 0);
    const lote = fd.get("lote") || "";
    const validade = fd.get("validade") || "";
    const unidade = fd.get("unidade") || "";
    const obs = fd.get("obs") || "";

    if (!produtoId || qtd <= 0) {
      alert("Selecione um produto e informe quantidade > 0");
      return;
    }

    const db2 = getDB();
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const existente = db2.estoque.find(s => 
      s.safraId === getSafraId() && 
      s.produtoId === produtoId && 
      s.deposito === deposito
    );

    if (existente) {
      existente.quantidade_atual = Number(existente.quantidade_atual || 0) + qtd;
      existente.obs = obs || existente.obs;
      if (lote) existente.lote = lote;
      if (validade) existente.validade = validade;
      toast("Estoque atualizado", `${produto.nome} agora tem ${existente.quantidade_atual} ${existente.unidade}`);
    } else {
      db2.estoque.push({
        id: uid("stk"),
        safra_id: getSafraId(),
        produto_id: produtoId,
        deposito,
        lote,
        validade,
        quantidade_atual: qtd,
        unidade: produto.unidade,
        obs
      });
      toast("Produto adicionado", `${produto.nome} adicionado ao estoque`);
    }

    setDB(db2);
    e.target.reset();
    document.querySelector('input[name="unidade"]').value = '';
    renderTable();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    const rows = onlySafra(db2.estoque || []).map(r => {
      const p = produtos.find(p => p.id === r.produtoId);
      return {
        Produto: p ? p.nome : "Desconhecido",
        Depósito: r.deposito,
        Lote: r.lote,
        Validade: r.validade,
        Quantidade: r.qtd,
        Unidade: r.unidade,
        Observações: r.obs
      };
    });
    downloadText(`estoque-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  renderTable();
}

