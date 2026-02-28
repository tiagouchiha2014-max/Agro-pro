function pageInsumosBase() {
  const db = getDB();
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas);
  const produtos = onlySafra(db.produtos);
  const insumosBase = onlySafra(db.insumosBase || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  // ==================== CÁLCULOS ====================
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoTotalInsumos = insumosBase.reduce((s, i) => s + Number(i.custoTotal || 0), 0);
  const custoPorHa = areaTotal > 0 ? custoTotalInsumos / areaTotal : 0;

  // Custo por talhão
  const custosPorTalhao = new Map();
  insumosBase.forEach(i => {
    const atual = custosPorTalhao.get(i.talhaoId) || { custo: 0, qtd: 0 };
    atual.custo += Number(i.custoTotal || 0);
    atual.qtd += 1;
    custosPorTalhao.set(i.talhaoId, atual);
  });

  // Custo por tipo de insumo
  const custosPorTipo = {};
  insumosBase.forEach(i => {
    const tipo = i.tipoInsumo || "Outros";
    custosPorTipo[tipo] = (custosPorTipo[tipo] || 0) + Number(i.custoTotal || 0);
  });

  function optionList(arr) {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  function produtoOptions() {
    return produtos.map(p => `<option value="${p.id}" data-preco="${p.preco || 0}" data-unidade="${p.unidade}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)} (R$ ${p.preco || 0}/${p.unidade})</option>`).join("");
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .insumo-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .insumo-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #10b981;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .insumo-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #10b981;
        font-size: 16px;
      }
      .insumo-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .insumo-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .insumo-linha {
        display: grid;
        grid-template-columns: 3fr 1fr 1fr 1fr 0.3fr;
        gap: 10px;
        margin-bottom: 8px;
        align-items: center;
      }
    </style>

    <!-- KPIs -->
    <div class="insumo-kpi-grid">
      <div class="insumo-kpi-card">
        <h3>🌱 Total Lançamentos</h3>
        <div class="insumo-kpi-valor">${insumosBase.length}</div>
        <div class="insumo-kpi-label">registros de insumos base</div>
      </div>
      <div class="insumo-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="insumo-kpi-valor">${kbrl(custoTotalInsumos)}</div>
        <div class="insumo-kpi-label">em insumos base</div>
      </div>
      <div class="insumo-kpi-card">
        <h3>📏 Custo/ha</h3>
        <div class="insumo-kpi-valor">${kbrl(custoPorHa)}</div>
        <div class="insumo-kpi-label">sobre ${num(areaTotal, 1)} ha</div>
      </div>
      <div class="insumo-kpi-card">
        <h3>🧭 Talhões Atendidos</h3>
        <div class="insumo-kpi-valor">${custosPorTalhao.size}</div>
        <div class="insumo-kpi-label">de ${talhoes.length} talhões</div>
      </div>
    </div>

    <!-- Formulário -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🌱 Lançar Insumo Base por Talhão</h3>
      <div class="help">Registre adubação, calcário, gesso, sementes e outros insumos de base aplicados por talhão. O custo será somado ao custo total do talhão.</div>
      <div class="hr"></div>
      <form id="frmInsumoBase" class="formGrid">
        <div><small>📅 Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
        <div><small>🧭 Talhão</small>
          <select class="select" name="talhaoId" required>
            <option value="">Selecione...</option>
            ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)} (${t.cultura || '-'}) — ${num(t.areaHa,1)} ha</option>`).join('')}
          </select>
        </div>
        <div><small>📦 Tipo de Insumo</small>
          <select class="select" name="tipoInsumo" required>
            <option value="Adubo">Adubo</option>
            <option value="Calcário">Calcário</option>
            <option value="Gesso">Gesso</option>
            <option value="Semente">Semente</option>
            <option value="Tratamento de Semente">Tratamento de Semente</option>
            <option value="Inoculante">Inoculante</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div><small>📋 Operação</small><input class="input" name="operacao" placeholder="Ex: Adubação de base, Calagem..."></div>

        <div class="full">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0;">🧪 Produtos/Insumos Utilizados</h4>
            <button type="button" class="btn primary" id="btnAdicionarInsumo" style="font-size:12px;">+ Adicionar produto</button>
          </div>
          <div class="help">Selecione o produto do cadastro ou digite manualmente. Informe a dose por hectare.</div>
          <div class="hr"></div>
          <div id="insumos-container">
            <div class="insumo-linha">
              <select class="select" name="produtoId[]" onchange="window.__atualizarInsumo(this, 0)">
                <option value="">Selecione um produto...</option>
                <option value="__manual">Digitar manualmente...</option>
                ${produtoOptions()}
              </select>
              <input class="input" name="doseHa[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.__calcularCustoInsumos()">
              <input class="input" name="precoManual[]" type="number" step="0.01" placeholder="Preço unit." onchange="window.__calcularCustoInsumos()">
              <span class="badge" id="custoInsumo-0" style="background:#2a2a30; color:#10b981; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
              <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerInsumo(this)">✕</button>
            </div>
          </div>
        </div>

        <div class="full"><small>📝 Observações</small><textarea class="textarea" name="obs"></textarea></div>

        <div class="full" style="margin-top:15px;">
          <div style="background: linear-gradient(135deg, #064e3b, #0f1a24); padding:20px; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="margin:0; color:#888;">💵 CUSTO TOTAL DO LANÇAMENTO</h4>
                <div style="font-size:32px; font-weight:bold; color:#10b981;" id="custoInsumoDisplay">R$ 0,00</div>
                <div style="font-size:12px; color:#888; margin-top:5px;" id="detalheInsumo">Nenhum produto selecionado</div>
              </div>
              <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar Lançamento</button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Custo por talhão -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🧭 Custo de Insumos Base por Talhão</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Talhão</th><th>Fazenda</th><th>Cultura</th><th>Área (ha)</th><th>Lançamentos</th><th>Custo Total</th><th>Custo/ha</th></tr></thead>
          <tbody>
            ${talhoes.map(t => {
              const info = custosPorTalhao.get(t.id) || { custo: 0, qtd: 0 };
              const custoHaTal = Number(t.areaHa || 0) > 0 ? info.custo / t.areaHa : 0;
              return `<tr>
                <td><b>${escapeHtml(t.nome)}</b></td>
                <td>${escapeHtml(findNameById(fazendas, t.fazendaId))}</td>
                <td>${escapeHtml(t.cultura || '-')}</td>
                <td>${num(t.areaHa, 1)}</td>
                <td>${info.qtd}</td>
                <td><b>${kbrl(info.custo)}</b></td>
                <td>${kbrl(custoHaTal)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Custo por tipo -->
    <div class="card" style="margin-bottom:20px;">
      <h3>📊 Custo por Tipo de Insumo</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Tipo</th><th>Custo Total</th><th>% do Total</th></tr></thead>
          <tbody>
            ${Object.entries(custosPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, custo]) => `
              <tr>
                <td><b>${escapeHtml(tipo)}</b></td>
                <td>${kbrl(custo)}</td>
                <td>${custoTotalInsumos > 0 ? num((custo / custoTotalInsumos) * 100, 1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Histórico -->
    <div class="card">
      <h3>📋 Histórico de Lançamentos</h3>
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Talhão</th>
              <th>Tipo</th>
              <th>Produtos</th>
              <th>Custo Total</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyInsumos"></tbody>
        </table>
      </div>
    </div>
  `;

  let insumoCount = 1;

  // Adicionar linha de insumo
  document.getElementById("btnAdicionarInsumo").addEventListener("click", () => {
    const container = document.getElementById("insumos-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "insumo-linha";
    novaLinha.innerHTML = `
      <select class="select" name="produtoId[]" onchange="window.__atualizarInsumo(this, ${insumoCount})">
        <option value="">Selecione um produto...</option>
        <option value="__manual">Digitar manualmente...</option>
        ${produtoOptions()}
      </select>
      <input class="input" name="doseHa[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.__calcularCustoInsumos()">
      <input class="input" name="precoManual[]" type="number" step="0.01" placeholder="Preço unit." onchange="window.__calcularCustoInsumos()">
      <span class="badge" id="custoInsumo-${insumoCount}" style="background:#2a2a30; color:#10b981; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
      <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerInsumo(this)">✕</button>
    `;
    container.appendChild(novaLinha);
    insumoCount++;
  });

  window.__removerInsumo = (btn) => {
    if (document.querySelectorAll('.insumo-linha').length <= 1) return;
    btn.closest('.insumo-linha').remove();
    window.__calcularCustoInsumos();
  };

  window.__atualizarInsumo = (select, index) => {
    const opt = select.options[select.selectedIndex];
    const precoInput = select.closest('.insumo-linha').querySelector('input[name="precoManual[]"]');
    if (select.value && select.value !== "__manual") {
      precoInput.value = opt.dataset.preco || 0;
    } else {
      precoInput.value = "";
    }
    window.__calcularCustoInsumos();
  };

  window.__calcularCustoInsumos = () => {
    const talhaoId = document.querySelector('select[name="talhaoId"]').value;
    const talhao = talhoes.find(t => t.id === talhaoId);
    const area = talhao ? Number(talhao.areaHa || 0) : 0;

    let total = 0;
    let detalhes = [];
    const linhas = document.querySelectorAll('.insumo-linha');

    linhas.forEach((linha, idx) => {
      const select = linha.querySelector('select[name="produtoId[]"]');
      const dose = Number(linha.querySelector('input[name="doseHa[]"]').value) || 0;
      const preco = Number(linha.querySelector('input[name="precoManual[]"]').value) || 0;

      if (dose > 0 && preco > 0 && area > 0) {
        const custoLinha = preco * dose * area;
        total += custoLinha;
        const custoEl = linha.querySelector(`#custoInsumo-${idx}`);
        if (custoEl) custoEl.innerText = kbrl(custoLinha);

        const nome = select.value === "__manual" ? "Manual" : (select.options[select.selectedIndex]?.text?.split(' — ')[0] || "Produto");
        detalhes.push(`${nome}: ${num(dose, 2)} × ${num(area, 1)} ha = ${kbrl(custoLinha)}`);
      }
    });

    document.getElementById("custoInsumoDisplay").innerText = kbrl(total);
    document.getElementById("detalheInsumo").innerHTML = detalhes.length > 0 ? detalhes.join('<br>') : 'Nenhum produto selecionado';
    return total;
  };

  // Recalcular ao trocar talhão
  document.querySelector('select[name="talhaoId"]').addEventListener("change", window.__calcularCustoInsumos);

  // Renderizar tabela
  function renderTabela() {
    const db2 = getDB();
    let rows = onlySafra(db2.insumosBase || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    // Filtrar insumos base pelos talhões da fazenda selecionada
    if (fazendaAtual) {
      const talhoesFazenda = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rows = rows.filter(i => talhoesFazenda.includes(i.talhaoId));
    }
    const tb = document.getElementById("tbodyInsumos");
    tb.innerHTML = rows.map(i => {
      const talhao = findNameById(talhoes, i.talhaoId);
      const produtosStr = (i.produtos || []).map(p => p.nome).join(', ');
      return `<tr>
        <td>${i.data}</td>
        <td><b>${escapeHtml(talhao)}</b></td>
        <td>${escapeHtml(i.tipoInsumo)}</td>
        <td>${escapeHtml(clampStr(produtosStr || '-', 50))}</td>
        <td><b>${kbrl(i.custoTotal)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delInsumoBase('${i.id}')">Excluir</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">Nenhum lançamento registrado.</td></tr>';
  }

  window.__delInsumoBase = (id) => {
    if (!confirm("Excluir este lançamento?")) return;
    const db2 = getDB();
    db2.insumosBase = (db2.insumosBase || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Lançamento removido.");
    pageInsumosBase();
  };

  // Submit
  document.getElementById("frmInsumoBase").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const talhaoId = fd.get("talhaoId");
    if (!talhaoId) { alert("Selecione um talhão"); return; }

    const talhao = talhoes.find(t => t.id === talhaoId);
    const area = talhao ? Number(talhao.areaHa || 0) : 0;

    // Coletar produtos
    const produtoIds = fd.getAll("produtoId[]");
    const doses = fd.getAll("doseHa[]");
    const precos = fd.getAll("precoManual[]");
    const produtosArray = [];
    let custoTotal = 0;

    for (let i = 0; i < produtoIds.length; i++) {
      const dose = Number(doses[i]) || 0;
      const preco = Number(precos[i]) || 0;
      if (dose > 0 && preco > 0) {
        let nome = "Manual";
        let unidade = "un";
        if (produtoIds[i] && produtoIds[i] !== "__manual") {
          const prod = produtos.find(p => p.id === produtoIds[i]);
          if (prod) { nome = prod.nome; unidade = prod.unidade; }
        }
        const custoLinha = preco * dose * area;
        custoTotal += custoLinha;
        produtosArray.push({
          produtoId: produtoIds[i] !== "__manual" ? produtoIds[i] : "",
          nome,
          doseHa: dose,
          preco,
          unidade,
          custoLinha
        });
      }
    }

    if (produtosArray.length === 0) {
      alert("Adicione pelo menos um produto com dose e preço válidos");
      return;
    }

    const obj = {
      id: uid("inb"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      talhaoId,
      tipoInsumo: fd.get("tipoInsumo"),
      operacao: fd.get("operacao") || "",
      produtos: produtosArray,
      custoTotal,
      areaHa: area,
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.insumosBase = db2.insumosBase || [];
    db2.insumosBase.push(obj);

    // Baixa no estoque para produtos do cadastro
    for (const p of produtosArray) {
      if (p.produtoId) {
        const qtd = p.doseHa * area;
        baixaEstoqueProdutoPorId(db2, p.produtoId, qtd, p.unidade);
      }
    }

    setDB(db2);
    toast("Insumo Base registrado", `Custo: ${kbrl(custoTotal)}`);
    pageInsumosBase();
  });

  // Export CSV
  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = insumosBase.map(i => {
      const talhao = findNameById(talhoes, i.talhaoId);
      return {
        Data: i.data,
        Talhão: talhao,
        Tipo: i.tipoInsumo,
        Operação: i.operacao,
        Produtos: (i.produtos || []).map(p => p.nome).join('; '),
        Área_ha: i.areaHa,
        Custo_Total: i.custoTotal,
        Observações: i.obs
      };
    });
    downloadText(`insumos-base-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado.");
  });

  renderTabela();
}



