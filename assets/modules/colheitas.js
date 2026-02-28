// ============================================================================
// PÁGINA COLHEITAS — ATUALIZADA COM FRETE DUPLO E 2 ARMAZÉNS
// ============================================================================

function pageColheitas() {
  const db = getDB();
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas);
  const maquinas = onlySafra(db.maquinas);
  const colheitas = onlySafra(db.colheitas || []).sort((a, b) => (b.dataColheita || "").localeCompare(a.dataColheita || ""));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  // ==================== CÁLCULOS ====================
  // Produção total: converte sacas → kg quando unidade = 'sc'
  const db0params = getDB().parametros || {};
  const _pesoPadrao = Number(db0params.pesoPadraoSaca || 60);
  const producaoTotalKg = colheitas.reduce((s, c) => {
    const qt = Number(c.producaoTotal || 0);
    return s + (c.unidade === 'sc' ? qt * _pesoPadrao : qt);
  }, 0);
  const custoFreteTotal = colheitas.reduce((s, c) => {
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    return s + frete;
  }, 0);
  // Toneladas entregues: soma das toneladas informadas nos fretes (mais preciso)
  const toneladasEntregues = colheitas.reduce((s, c) => {
    let ton = 0;
    if (c.frete1) ton += Number(c.frete1.toneladas || 0);
    if (c.frete2) ton += Number(c.frete2.toneladas || 0);
    return s + ton;
  }, 0);
  const toneladas = toneladasEntregues > 0 ? toneladasEntregues : producaoTotalKg / 1000;
  const custoFretePorTon = toneladas > 0 ? custoFreteTotal / toneladas : 0;

  // Custo de frete por talhão
  const fretePorTalhao = new Map();
  colheitas.forEach(c => {
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    const atual = fretePorTalhao.get(c.talhaoId) || 0;
    fretePorTalhao.set(c.talhaoId, atual + frete);
  });

  const content = document.getElementById("content");

  content.innerHTML = `
    <style>
      .colheita-form {
        background: #ffffff;
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 30px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .colheita-form h3 {
        margin-top: 0;
        color: #3b82f6;
      }
      .maquina-linha {
        display: grid;
        grid-template-columns: 2fr 1fr 0.5fr;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
      }
      .maquina-linha .btn-remove {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
      }
      .colheita-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .colheita-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #f59e0b;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .colheita-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #f59e0b;
        font-size: 16px;
      }
      .colheita-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .colheita-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .frete-section {
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 10px;
        padding: 16px;
        margin-top: 10px;
      }
      .frete-section h4 {
        margin: 0 0 12px 0;
        color: #b45309;
      }
      .frete-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .frete-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
      }
      .frete-box h5 {
        margin: 0 0 10px 0;
        color: #92400e;
        font-size: 14px;
      }
      .frete-resumo {
        background: linear-gradient(135deg, #78350f, #451a03);
        border-radius: 8px;
        padding: 15px;
        margin-top: 12px;
        color: white;
      }
      .frete-resumo .valor { font-size: 24px; font-weight: bold; color: #fbbf24; }
      @media (max-width: 768px) {
        .frete-grid { grid-template-columns: 1fr; }
      }
    </style>

    <!-- KPIs -->
    <div class="colheita-kpi-grid">
      <div class="colheita-kpi-card">
        <h3>🌾 Produção Total</h3>
        <div class="colheita-kpi-valor">${num(producaoTotalKg, 0)} kg</div>
        <div class="colheita-kpi-label">${num(toneladas, 2)} toneladas</div>
      </div>
      <div class="colheita-kpi-card">
        <h3>📋 Colheitas</h3>
        <div class="colheita-kpi-valor">${colheitas.length}</div>
        <div class="colheita-kpi-label">registros</div>
      </div>
      <div class="colheita-kpi-card">
        <h3>🚛 Custo Total Frete</h3>
        <div class="colheita-kpi-valor">${kbrl(custoFreteTotal)}</div>
        <div class="colheita-kpi-label">${kbrl(custoFretePorTon)}/ton</div>
      </div>
      <div class="colheita-kpi-card">
        <h3>🏢 Entregas</h3>
        <div class="colheita-kpi-valor">${colheitas.filter(c => c.frete1?.armazem || c.frete2?.armazem).length}</div>
        <div class="colheita-kpi-label">colheitas com frete</div>
      </div>
    </div>

    <!-- Formulário de Colheita -->
    <div class="colheita-form">
      <h3>🌾 Registrar Colheita</h3>
      <form id="frmColheita" class="formGrid">
        <div><small>📅 Data</small><input class="input" name="dataColheita" type="date" value="${nowISO()}" required></div>
        <div><small>🧭 Talhão</small>
          <select class="select" name="talhaoId" required>
            <option value="">Selecione...</option>
            ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)} (${t.cultura || 'Sem cultura'}) — ${num(t.areaHa,1)} ha</option>`).join('')}
          </select>
        </div>
        <div><small>📦 Produção Total</small><input class="input" name="producaoTotal" type="number" step="0.01" required placeholder="Quantidade"></div>
        <div><small>📏 Unidade</small>
          <select class="select" name="unidade">
            <option value="kg">kg</option>
            <option value="sc">sacas</option>
          </select>
        </div>
        <div><small>💧 Umidade (%)</small><input class="input" name="umidade" type="number" step="0.1" placeholder="Opcional"></div>
        <div><small>📝 Observações</small><input class="input" name="obs" placeholder="Opcional"></div>

        <!-- Máquinas -->
        <div class="full">
          <h4 style="margin-bottom:10px;">🚜 Máquinas utilizadas (opcional)</h4>
          <div id="maquinas-container">
            <div class="maquina-linha">
              <select class="select" name="maquinaId[]">
                <option value="">Selecione uma máquina</option>
                ${maquinas.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('')}
              </select>
              <input class="input" name="quantidade[]" type="number" step="0.01" placeholder="Quantidade colhida">
              <button type="button" class="btn-remove" onclick="removerLinhaMaquina(this)">✕</button>
            </div>
          </div>
          <button type="button" class="btn primary" id="btnAdicionarMaquina" style="margin-top:10px; font-size:12px;">+ Adicionar máquina</button>
        </div>

        <!-- ========== SEÇÃO DE FRETE ========== -->
        <div class="full">
          <div class="frete-section">
            <h4>🚛 Frete e Entrega em Armazéns</h4>
            <div class="help" style="margin-bottom:12px;">Configure até 2 fretes para armazéns diferentes. Informe a quantidade entregue (em toneladas) e o preço por tonelada de cada frete.</div>

            <div class="frete-grid">
              <!-- FRETE 1 -->
              <div class="frete-box">
                <h5>🚛 Frete 1 — Armazém 1</h5>
                <div style="display:grid; gap:8px;">
                  <div><small>🏢 Nome do Armazém 1</small><input class="input" name="frete1_armazem" placeholder="Ex: Armazém Cargill"></div>
                  <div><small>📍 Cidade/Local</small><input class="input" name="frete1_cidade" placeholder="Ex: Sorriso - MT"></div>
                  <div><small>🚛 Transportadora</small><input class="input" name="frete1_transportadora" placeholder="Ex: Transp. Norte"></div>
                  <div><small>📦 Quantidade entregue (ton)</small><input class="input" name="frete1_toneladas" type="number" step="0.01" placeholder="0" onchange="window.__calcularFretes()"></div>
                  <div><small>💰 Preço por tonelada (R$)</small><input class="input" name="frete1_precoTon" type="number" step="0.01" placeholder="0.00" onchange="window.__calcularFretes()"></div>
                  <div style="text-align:right; font-weight:bold; color:#b45309;">
                    Custo Frete 1: <span id="custoFrete1">R$ 0,00</span>
                  </div>
                </div>
              </div>

              <!-- FRETE 2 -->
              <div class="frete-box">
                <h5>🚛 Frete 2 — Armazém 2</h5>
                <div style="display:grid; gap:8px;">
                  <div><small>🏢 Nome do Armazém 2</small><input class="input" name="frete2_armazem" placeholder="Ex: Armazém Bunge"></div>
                  <div><small>📍 Cidade/Local</small><input class="input" name="frete2_cidade" placeholder="Ex: Lucas do Rio Verde - MT"></div>
                  <div><small>🚛 Transportadora</small><input class="input" name="frete2_transportadora" placeholder="Ex: Transp. Sul"></div>
                  <div><small>📦 Quantidade entregue (ton)</small><input class="input" name="frete2_toneladas" type="number" step="0.01" placeholder="0" onchange="window.__calcularFretes()"></div>
                  <div><small>💰 Preço por tonelada (R$)</small><input class="input" name="frete2_precoTon" type="number" step="0.01" placeholder="0.00" onchange="window.__calcularFretes()"></div>
                  <div style="text-align:right; font-weight:bold; color:#b45309;">
                    Custo Frete 2: <span id="custoFrete2">R$ 0,00</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resumo de frete -->
            <div class="frete-resumo">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-size:12px; opacity:0.7;">CUSTO TOTAL DE FRETE</div>
                  <div class="valor" id="custoFreteTotal">R$ 0,00</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12px; opacity:0.7;">TOTAL ENTREGUE</div>
                  <div class="valor" id="totalEntregue">0 ton</div>
                </div>
              </div>
              <div style="margin-top:8px; font-size:11px; opacity:0.6;" id="detalheFretes">Preencha os dados de frete acima</div>
            </div>
          </div>
        </div>

        <div class="full row" style="justify-content:flex-end; margin-top:20px;">
          <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar Colheita</button>
        </div>
      </form>
    </div>

    <!-- Custo de frete por talhão -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🚛 Custo de Frete por Talhão</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Talhão</th><th>Fazenda</th><th>Cultura</th><th>Área (ha)</th><th>Custo Frete</th><th>Frete/ha</th></tr></thead>
          <tbody>
            ${talhoes.map(t => {
              const frete = fretePorTalhao.get(t.id) || 0;
              const freteHa = Number(t.areaHa || 0) > 0 ? frete / t.areaHa : 0;
              return `<tr>
                <td><b>${escapeHtml(t.nome)}</b></td>
                <td>${escapeHtml(findNameById(fazendas, t.fazendaId))}</td>
                <td>${escapeHtml(t.cultura || '-')}</td>
                <td>${num(t.areaHa, 1)}</td>
                <td><b>${kbrl(frete)}</b></td>
                <td>${kbrl(freteHa)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabela de colheitas -->
    <div class="tableWrap">
      <h3>📋 Colheitas Registradas</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Talhão</th>
            <th>Produção</th>
            <th>Unidade</th>
            <th>Umidade</th>
            <th>Frete 1</th>
            <th>Frete 2</th>
            <th>Custo Frete Total</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbodyColheitas"></tbody>
      </table>
    </div>
  `;

  // ==================== CÁLCULO DE FRETES ====================
  window.__calcularFretes = () => {
    const ton1 = Number(document.querySelector('input[name="frete1_toneladas"]').value) || 0;
    const preco1 = Number(document.querySelector('input[name="frete1_precoTon"]').value) || 0;
    const custo1 = ton1 * preco1;

    const ton2 = Number(document.querySelector('input[name="frete2_toneladas"]').value) || 0;
    const preco2 = Number(document.querySelector('input[name="frete2_precoTon"]').value) || 0;
    const custo2 = ton2 * preco2;

    const total = custo1 + custo2;
    const totalTon = ton1 + ton2;

    document.getElementById("custoFrete1").innerText = kbrl(custo1);
    document.getElementById("custoFrete2").innerText = kbrl(custo2);
    document.getElementById("custoFreteTotal").innerText = kbrl(total);
    document.getElementById("totalEntregue").innerText = `${num(totalTon, 2)} ton`;

    let detalhes = [];
    if (ton1 > 0) {
      const arm1 = document.querySelector('input[name="frete1_armazem"]').value || "Armazém 1";
      detalhes.push(`${arm1}: ${num(ton1, 2)} ton × ${kbrl(preco1)}/ton = ${kbrl(custo1)}`);
    }
    if (ton2 > 0) {
      const arm2 = document.querySelector('input[name="frete2_armazem"]').value || "Armazém 2";
      detalhes.push(`${arm2}: ${num(ton2, 2)} ton × ${kbrl(preco2)}/ton = ${kbrl(custo2)}`);
    }
    document.getElementById("detalheFretes").innerHTML = detalhes.length > 0 ? detalhes.join(' | ') : 'Preencha os dados de frete acima';
  };

  // ==================== MÁQUINAS ====================
  let maquinaCount = 1;
  document.getElementById("btnAdicionarMaquina").addEventListener("click", () => {
    const container = document.getElementById("maquinas-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "maquina-linha";
    novaLinha.innerHTML = `
      <select class="select" name="maquinaId[]">
        <option value="">Selecione uma máquina</option>
        ${maquinas.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('')}
      </select>
      <input class="input" name="quantidade[]" type="number" step="0.01" placeholder="Quantidade colhida">
      <button type="button" class="btn-remove" onclick="removerLinhaMaquina(this)">✕</button>
    `;
    container.appendChild(novaLinha);
    maquinaCount++;
  });

  window.removerLinhaMaquina = (botao) => {
    if (document.querySelectorAll('.maquina-linha').length <= 1) {
      toast("Aviso", "Mantenha pelo menos uma linha");
      return;
    }
    botao.closest('.maquina-linha').remove();
  };

  // ==================== RENDERIZAR TABELA ====================
  function renderTabela() {
    const db2 = getDB();
    let rows = onlySafra(db2.colheitas || []).sort((a, b) => (b.dataColheita || "").localeCompare(a.dataColheita || ""));
    // Filtrar colheitas pelos talhões da fazenda selecionada
    if (fazendaAtual) {
      const talhoesFazenda = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rows = rows.filter(c => talhoesFazenda.includes(c.talhaoId));
    }
    const tb = document.getElementById("tbodyColheitas");
    tb.innerHTML = rows.map(c => {
      const talhao = findNameById(talhoes, c.talhaoId);
      const maquinasStr = (c.maquinas || []).map(m => {
        const maq = maquinas.find(q => q.id === m.maquinaId);
        return maq ? `${maq.nome}: ${num(m.quantidade, 0)}` : '';
      }).filter(s => s).join(', ');

      const f1 = c.frete1 || {};
      const f2 = c.frete2 || {};
      const custoF1 = Number(f1.custoFrete || 0);
      const custoF2 = Number(f2.custoFrete || 0);
      const custoFreteCol = custoF1 + custoF2;

      const frete1Str = f1.armazem ? `${escapeHtml(f1.armazem)}<br>${num(f1.toneladas || 0, 2)} ton × ${kbrl(f1.precoTon || 0)}<br><b>${kbrl(custoF1)}</b>` : '-';
      const frete2Str = f2.armazem ? `${escapeHtml(f2.armazem)}<br>${num(f2.toneladas || 0, 2)} ton × ${kbrl(f2.precoTon || 0)}<br><b>${kbrl(custoF2)}</b>` : '-';

      return `
        <tr>
          <td>${c.dataColheita}</td>
          <td><b>${escapeHtml(talhao)}</b></td>
          <td>${num(c.producaoTotal, 0)}</td>
          <td>${c.unidade}</td>
          <td>${c.umidade ? c.umidade + '%' : '-'}</td>
          <td style="font-size:12px;">${frete1Str}</td>
          <td style="font-size:12px;">${frete2Str}</td>
          <td><b style="color:#b45309;">${kbrl(custoFreteCol)}</b></td>
          <td class="noPrint">
            <button class="btn danger" onclick="window.__delColheita('${c.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="9">Nenhuma colheita registrada</td></tr>';
  }

  // ==================== EXCLUIR ====================
  window.__delColheita = (id) => {
    if (!confirm("Excluir este registro de colheita?")) return;
    const db2 = getDB();
    db2.colheitas = (db2.colheitas || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Registro removido");
    pageColheitas();
  };

  // ==================== SUBMIT ====================
  document.getElementById("frmColheita").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const talhaoId = fd.get("talhaoId");
    if (!talhaoId) { alert("Selecione um talhão"); return; }

    const producaoTotal = Number(fd.get("producaoTotal") || 0);
    if (producaoTotal <= 0) { alert("Produção deve ser > 0"); return; }

    // Coletar máquinas
    const maquinaIds = fd.getAll("maquinaId[]").filter(id => id);
    const quantidades = fd.getAll("quantidade[]").map(q => Number(q) || 0);
    const maquinasArray = [];
    for (let i = 0; i < maquinaIds.length; i++) {
      if (maquinaIds[i] && quantidades[i] > 0) {
        maquinasArray.push({
          maquinaId: maquinaIds[i],
          quantidade: quantidades[i]
        });
      }
    }

    // Coletar dados de frete 1
    const frete1_armazem = fd.get("frete1_armazem") || "";
    const frete1_cidade = fd.get("frete1_cidade") || "";
    const frete1_transportadora = fd.get("frete1_transportadora") || "";
    const frete1_toneladas = Number(fd.get("frete1_toneladas") || 0);
    const frete1_precoTon = Number(fd.get("frete1_precoTon") || 0);
    const frete1_custo = frete1_toneladas * frete1_precoTon;

    // Coletar dados de frete 2
    const frete2_armazem = fd.get("frete2_armazem") || "";
    const frete2_cidade = fd.get("frete2_cidade") || "";
    const frete2_transportadora = fd.get("frete2_transportadora") || "";
    const frete2_toneladas = Number(fd.get("frete2_toneladas") || 0);
    const frete2_precoTon = Number(fd.get("frete2_precoTon") || 0);
    const frete2_custo = frete2_toneladas * frete2_precoTon;

    const obj = {
      id: uid("col"),
      safraId: getSafraId(),
      dataColheita: fd.get("dataColheita") || nowISO(),
      talhaoId,
      producaoTotal,
      unidade: fd.get("unidade") || "kg",
      umidade: fd.get("umidade") ? Number(fd.get("umidade")) : null,
      observacoes: fd.get("obs") || "",
      maquinas: maquinasArray,
      // Frete 1
      frete1: frete1_armazem || frete1_toneladas > 0 ? {
        armazem: frete1_armazem,
        cidade: frete1_cidade,
        transportadora: frete1_transportadora,
        toneladas: frete1_toneladas,
        precoTon: frete1_precoTon,
        custoFrete: frete1_custo
      } : null,
      // Frete 2
      frete2: frete2_armazem || frete2_toneladas > 0 ? {
        armazem: frete2_armazem,
        cidade: frete2_cidade,
        transportadora: frete2_transportadora,
        toneladas: frete2_toneladas,
        precoTon: frete2_precoTon,
        custoFrete: frete2_custo
      } : null
    };

    const db2 = getDB();
    db2.colheitas = db2.colheitas || [];
    db2.colheitas.push(obj);
    setDB(db2);

    toast("Colheita registrada", `Produção: ${num(producaoTotal, 0)} ${obj.unidade}${(frete1_custo + frete2_custo) > 0 ? ` | Frete: ${kbrl(frete1_custo + frete2_custo)}` : ''}`);
    pageColheitas();
  });

  // ==================== EXPORT CSV ====================
  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = colheitas.map(c => {
      const talhao = findNameById(talhoes, c.talhaoId);
      const f1 = c.frete1 || {};
      const f2 = c.frete2 || {};
      return {
        Data: c.dataColheita,
        Talhão: talhao,
        Produção: c.producaoTotal,
        Unidade: c.unidade,
        Umidade: c.umidade || '',
        Frete1_Armazém: f1.armazem || '',
        Frete1_Cidade: f1.cidade || '',
        Frete1_Transportadora: f1.transportadora || '',
        Frete1_Toneladas: f1.toneladas || 0,
        Frete1_Preço_Ton: f1.precoTon || 0,
        Frete1_Custo: f1.custoFrete || 0,
        Frete2_Armazém: f2.armazem || '',
        Frete2_Cidade: f2.cidade || '',
        Frete2_Transportadora: f2.transportadora || '',
        Frete2_Toneladas: f2.toneladas || 0,
        Frete2_Preço_Ton: f2.precoTon || 0,
        Frete2_Custo: f2.custoFrete || 0,
        Custo_Frete_Total: (f1.custoFrete || 0) + (f2.custoFrete || 0),
        Observações: c.observacoes
      };
    });
    downloadText(`colheitas-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado");
  });

  renderTabela();
}



