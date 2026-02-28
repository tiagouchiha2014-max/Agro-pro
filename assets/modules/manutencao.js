function pageManutencao() {
  const db = getDB();
  const maquinas = onlySafra(db.maquinas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const manutencoes = onlySafra(db.manutencoes || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  // ==================== CÁLCULOS ====================
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoTotalManut = manutencoes.reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  const custoPorHa = areaTotal > 0 ? custoTotalManut / areaTotal : 0;
  const totalPreventivas = manutencoes.filter(m => m.tipoManutencao === "Preventiva").length;
  const totalCorretivas = manutencoes.filter(m => m.tipoManutencao === "Corretiva").length;
  const totalPreditivas = manutencoes.filter(m => m.tipoManutencao === "Preditiva").length;
  const custoPreventivas = manutencoes.filter(m => m.tipoManutencao === "Preventiva").reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  const custoCorretivas = manutencoes.filter(m => m.tipoManutencao === "Corretiva").reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  const custoPreditivas = manutencoes.filter(m => m.tipoManutencao === "Preditiva").reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  // Próximas manutenções por data (nos próximos 30 dias)
  const hoje = nowISO();
  const em30dias = new Date(); em30dias.setDate(em30dias.getDate() + 30);
  const proximas30d = manutencoes.filter(m => m.proximaData && m.proximaData >= hoje && new Date(m.proximaData) <= em30dias);

  // Alertas de manutenção vencida por horímetro
  const alertasVencidas = [];
  maquinas.forEach(maq => {
    const ultimaManut = manutencoes
      .filter(m => m.maquinaId === maq.id && m.tipoManutencao === "Preventiva")
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0];

    if (ultimaManut) {
      const horimetroAtual = Number(maq.horimetro || 0);
      const horimetroUltima = Number(ultimaManut.horimetroAtual || 0);
      const intervalo = Number(ultimaManut.intervaloHoras || 500);
      const proximaEm = horimetroUltima + intervalo;

      if (horimetroAtual >= proximaEm) {
        alertasVencidas.push({
          maquina: maq.nome,
          maquinaId: maq.id,
          horimetroAtual,
          proximaEm,
          excedido: horimetroAtual - proximaEm,
          ultimaData: ultimaManut.data
        });
      }
    } else if (Number(maq.horimetro || 0) > 0) {
      alertasVencidas.push({
        maquina: maq.nome,
        maquinaId: maq.id,
        horimetroAtual: Number(maq.horimetro || 0),
        proximaEm: 0,
        excedido: 0,
        ultimaData: "Nunca"
      });
    }
  });

  // Custos por máquina
  const custosPorMaquina = new Map();
  manutencoes.forEach(m => {
    const atual = custosPorMaquina.get(m.maquinaId) || { custo: 0, qtd: 0 };
    atual.custo += Number(m.custoTotal || 0);
    atual.qtd += 1;
    custosPorMaquina.set(m.maquinaId, atual);
  });

  // Custos por mês
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const custoPorMes = new Array(12).fill(0);
  manutencoes.forEach(m => {
    if (m.data) {
      const mes = parseInt(m.data.substring(5, 7)) - 1;
      custoPorMes[mes] += Number(m.custoTotal || 0);
    }
  });
  const maxCustoMes = Math.max(...custoPorMes, 1);

  function optionList(arr) {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join("");
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .manut-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .manut-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .manut-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .manut-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .manut-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .alerta-vencida {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-left: 4px solid #ef4444;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 10px;
      }
      .alerta-vencida b { color: #b91c1c; }
      .peca-linha {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 0.3fr;
        gap: 10px;
        margin-bottom: 8px;
        align-items: center;
      }
      .grafico-barras {
        display: flex; align-items: flex-end; gap: 8px; height: 150px; margin: 15px 0;
      }
      .barra {
        flex: 1; background: #f97316; border-radius: 4px 4px 0 0; min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label { text-align: center; font-size: 10px; color: #475569; margin-top: 5px; }
      .filtro-maquina { margin-bottom: 15px; }
    </style>

    <!-- KPIs -->
    <div class="manut-kpi-grid">
      <div class="manut-kpi-card">
        <h3>🔧 Total Manutenções</h3>
        <div class="manut-kpi-valor">${manutencoes.length}</div>
        <div class="manut-kpi-label">P: ${totalPreventivas} | C: ${totalCorretivas} | Pd: ${totalPreditivas}</div>
      </div>
      <div class="manut-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="manut-kpi-valor">${kbrl(custoTotalManut)}</div>
        <div class="manut-kpi-label">R$ ${num(custoPorHa, 2)}/ha</div>
      </div>
      <div class="manut-kpi-card" style="border-left-color:#ef4444;">
        <h3 style="color:#ef4444;">🔴 Custo Corretivas</h3>
        <div class="manut-kpi-valor">${kbrl(custoCorretivas)}</div>
        <div class="manut-kpi-label">${totalCorretivas} ocorrências</div>
      </div>
      <div class="manut-kpi-card" style="border-left-color:#059669;">
        <h3 style="color:#059669;">🟢 Custo Preventivas</h3>
        <div class="manut-kpi-valor">${kbrl(custoPreventivas)}</div>
        <div class="manut-kpi-label">${totalPreventivas} ocorrências</div>
      </div>
      <div class="manut-kpi-card" style="border-left-color:#f59e0b;">
        <h3 style="color:#f59e0b;">⏰ Próximas (30d)</h3>
        <div class="manut-kpi-valor" style="color:${proximas30d.length > 0 ? '#f59e0b' : '#059669'}">${proximas30d.length}</div>
        <div class="manut-kpi-label">manutenções agendadas</div>
      </div>
      <div class="manut-kpi-card">
        <h3>⚠️ Vencidas (horímetro)</h3>
        <div class="manut-kpi-valor" style="color: ${alertasVencidas.length > 0 ? '#ef4444' : '#059669'}">${alertasVencidas.length}</div>
        <div class="manut-kpi-label">máquinas com manutenção vencida</div>
      </div>
    </div>

    <!-- Alertas de manutenção vencida -->
    ${alertasVencidas.length > 0 ? `
      <div class="card" style="margin-bottom:20px;">
        <h3>⚠️ Alertas de Manutenção Vencida</h3>
        ${alertasVencidas.map(a => `
          <div class="alerta-vencida">
            <b>🚜 ${escapeHtml(a.maquina)}</b> — Horímetro atual: <b>${num(a.horimetroAtual, 0)}h</b>
            ${a.proximaEm > 0 ? `| Próxima prevista em: ${num(a.proximaEm, 0)}h | Excedido: <b style="color:#ef4444">${num(a.excedido, 0)}h</b>` : '| <b>Nenhuma manutenção preventiva registrada</b>'}
            | Última: ${a.ultimaData}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Próximas manutenções (30 dias) -->
    ${proximas30d.length > 0 ? `
      <div class="card" style="margin-bottom:20px; border-left:4px solid #f59e0b;">
        <h3>⏰ Próximas Manutenções (30 dias)</h3>
        ${proximas30d.sort((a, b) => (a.proximaData || "").localeCompare(b.proximaData || "")).map(m => {
          const maq = maquinas.find(q => q.id === m.maquinaId);
          const dias = Math.ceil((new Date(m.proximaData) - new Date(hoje)) / 86400000);
          return `
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:10px 14px; margin-bottom:8px;">
              <b>🚜 ${escapeHtml(maq?.nome || '-')}</b>
              — <span style="color:#b45309;">${escapeHtml(m.tipoManutencao)}</span>
              | Prevista: <b>${m.proximaData}</b>
              | Em: <b style="color:#f59e0b;">${dias} dia${dias !== 1 ? 's' : ''}</b>
              ${m.servico ? `| Serviço: ${escapeHtml(clampStr(m.servico, 40))}` : ''}
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <!-- Gráfico mensal -->
    <div class="card" style="margin-bottom:20px;">
      <h4>📊 Custo de Manutenção por Mês</h4>
      <div class="grafico-barras">
        ${meses.map((mes, i) => {
          const altura = (custoPorMes[i] / maxCustoMes) * 130;
          return `<div style="flex:1;text-align:center;"><div class="barra" style="height:${altura}px;"></div><div class="barra-label">${mes}</div><div style="font-size:9px;color:#475569;">${kbrl(custoPorMes[i])}</div></div>`;
        }).join('')}
      </div>
    </div>

    <!-- Formulário -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🔧 Registrar Manutenção</h3>
      <div class="help">Registre manutenções preventivas, corretivas ou preditivas.</div>
      <div class="hr"></div>
      <form id="frmManut" class="formGrid">
        <div><small>📅 Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
        <div><small>🚜 Máquina</small>
          <select class="select" name="maquinaId" required>
            <option value="">Selecione...</option>
            ${optionList(maquinas)}
          </select>
        </div>
        <div><small>🔧 Tipo de Manutenção</small>
          <select class="select" name="tipoManutencao" required>
            <option value="Preventiva">Preventiva</option>
            <option value="Corretiva">Corretiva</option>
            <option value="Preditiva">Preditiva</option>
          </select>
        </div>
        <div><small>📊 Horímetro Atual</small><input class="input" name="horimetroAtual" type="number" step="0.1" placeholder="Horas atuais"></div>
        <div><small>⏱️ Intervalo Próxima (horas)</small><input class="input" name="intervaloHoras" type="number" step="1" placeholder="Ex: 500" value="500"></div>
        <div><small>📅 Próxima Manutenção (data)</small><input class="input" name="proximaData" type="date"></div>
        <div><small>👤 Mecânico/Responsável</small><input class="input" name="mecanico" type="text" placeholder="Nome do mecânico"></div>
        <div><small>🏢 Oficina/Local</small><input class="input" name="oficina" type="text" placeholder="Oficina ou local"></div>
        <div><small>📋 Serviço Realizado</small><input class="input" name="servico" type="text" placeholder="Descrição do serviço"></div>
        <div><small>⏱️ Tempo de Parada (horas)</small><input class="input" name="tempoParada" type="number" step="0.5" placeholder="Horas parada"></div>

        <div class="full">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0;">🔩 Peças Trocadas</h4>
            <button type="button" class="btn primary" id="btnAdicionarPeca" style="font-size:12px;">+ Adicionar peça</button>
          </div>
          <div id="pecas-container">
            <div class="peca-linha">
              <input class="input" name="pecaNome[]" placeholder="Nome da peça">
              <input class="input" name="pecaQtd[]" type="number" step="1" placeholder="Qtd" value="1">
              <input class="input" name="pecaPreco[]" type="number" step="0.01" placeholder="Preço unit.">
              <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerPeca(this)">✕</button>
            </div>
          </div>
        </div>

        <div><small>💰 Custo Mão de Obra (R$)</small><input class="input" name="custoMaoObra" type="number" step="0.01" placeholder="0.00"></div>
        <div><small>💰 Outros Custos (R$)</small><input class="input" name="outrosCustos" type="number" step="0.01" placeholder="0.00"></div>
        <div class="full"><small>📝 Observações</small><textarea class="textarea" name="obs"></textarea></div>

        <div class="full" style="margin-top:15px;">
          <div style="background: linear-gradient(135deg, #1a2a3a, #0f1a24); padding:20px; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="margin:0; color:#888;">💵 CUSTO TOTAL DA MANUTENÇÃO</h4>
                <div style="font-size:32px; font-weight:bold; color:#f97316;" id="custoManutDisplay">R$ 0,00</div>
              </div>
              <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar Manutenção</button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Custo por máquina -->
    <div class="card" style="margin-bottom:20px;">
      <h3>🚜 Custo de Manutenção por Máquina</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Máquina</th><th>Manutenções</th><th>Custo Total</th><th>Custo/ha</th><th>Horímetro Atual</th></tr></thead>
          <tbody>
            ${maquinas.map(maq => {
              const info = custosPorMaquina.get(maq.id) || { custo: 0, qtd: 0 };
              const custoHaMaq = areaTotal > 0 ? info.custo / areaTotal : 0;
              return `<tr>
                <td><b>${escapeHtml(maq.nome)}</b></td>
                <td>${info.qtd}</td>
                <td>${kbrl(info.custo)}</td>
                <td>${kbrl(custoHaMaq)}</td>
                <td>${num(maq.horimetro || 0, 0)}h</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Filtro e histórico -->
    <div class="card">
      <h3>📋 Histórico de Manutenções</h3>
      <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:15px;">
        <div>
          <small>Filtrar por máquina:</small>
          <select class="select" id="filtroMaquina" style="max-width:260px;">
            <option value="">Todas as máquinas</option>
            ${optionList(maquinas)}
          </select>
        </div>
        <div>
          <small>Filtrar por tipo:</small>
          <select class="select" id="filtroTipo" style="max-width:200px;">
            <option value="">Todos os tipos</option>
            <option value="Preventiva">🟢 Preventiva</option>
            <option value="Corretiva">🔴 Corretiva</option>
            <option value="Preditiva">🟣 Preditiva</option>
          </select>
        </div>
      </div>
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Máquina</th>
              <th>Tipo</th>
              <th>Serviço</th>
              <th>Peças</th>
              <th>Horímetro</th>
              <th>Próxima</th>
              <th>Custo Total</th>
              <th class="noPrint">Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyManut"></tbody>
        </table>
      </div>
    </div>
  `;


  // Adicionar peça
  document.getElementById("btnAdicionarPeca").addEventListener("click", () => {
    const container = document.getElementById("pecas-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "peca-linha";
    novaLinha.innerHTML = `
      <input class="input" name="pecaNome[]" placeholder="Nome da peça">
      <input class="input" name="pecaQtd[]" type="number" step="1" placeholder="Qtd" value="1">
      <input class="input" name="pecaPreco[]" type="number" step="0.01" placeholder="Preço unit.">
      <button type="button" class="btn danger" style="padding:6px;" onclick="window.__removerPeca(this)">✕</button>
    `;
    container.appendChild(novaLinha);
    calcularCustoManut();
  });

  window.__removerPeca = (btn) => {
    if (document.querySelectorAll('.peca-linha').length <= 1) return;
    btn.closest('.peca-linha').remove();
    calcularCustoManut();
  };

  // Calcular custo total
  function calcularCustoManut() {
    let custoPecas = 0;
    const linhas = document.querySelectorAll('.peca-linha');
    linhas.forEach(linha => {
      const qtd = Number(linha.querySelector('input[name="pecaQtd[]"]').value) || 0;
      const preco = Number(linha.querySelector('input[name="pecaPreco[]"]').value) || 0;
      custoPecas += qtd * preco;
    });
    const maoObra = Number(document.querySelector('input[name="custoMaoObra"]').value) || 0;
    const outros = Number(document.querySelector('input[name="outrosCustos"]').value) || 0;
    const total = custoPecas + maoObra + outros;
    document.getElementById("custoManutDisplay").innerText = kbrl(total);
    return total;
  }

  // Listeners para recalcular
  document.querySelectorAll('input[name="pecaQtd[]"], input[name="pecaPreco[]"], input[name="custoMaoObra"], input[name="outrosCustos"]').forEach(el => {
    el.addEventListener("input", calcularCustoManut);
  });

  // Observar novas peças
  const observer = new MutationObserver(() => {
    document.querySelectorAll('input[name="pecaQtd[]"], input[name="pecaPreco[]"]').forEach(el => {
      el.removeEventListener("input", calcularCustoManut);
      el.addEventListener("input", calcularCustoManut);
    });
  });
  observer.observe(document.getElementById("pecas-container"), { childList: true });

  // Renderizar tabela
  function renderTabela(filtroMaqId = "", filtroTipoVal = "") {
    const db2 = getDB();
    let rows = onlySafra(db2.manutencoes || []).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    if (filtroMaqId) rows = rows.filter(m => m.maquinaId === filtroMaqId);
    if (filtroTipoVal) rows = rows.filter(m => m.tipoManutencao === filtroTipoVal);
    const hoje = nowISO();

    const tb = document.getElementById("tbodyManut");
    tb.innerHTML = rows.map(m => {
      const maq = maquinas.find(q => q.id === m.maquinaId);
      const pecasStr = (m.pecas || []).map(p => `${p.nome} (${p.qtd}x)`).join(', ');
      const tipoCor = m.tipoManutencao === 'Corretiva' ? '#ef4444' : m.tipoManutencao === 'Preditiva' ? '#8b5cf6' : '#059669';
      // Status da próxima manutenção por data
      let statusProxima = '';
      if (m.proximaData) {
        const diasFaltam = Math.ceil((new Date(m.proximaData) - new Date(hoje)) / 86400000);
        if (diasFaltam < 0) {
          statusProxima = `<span style="color:#ef4444; font-size:11px;">\u26a0\ufe0f Vencida (${Math.abs(diasFaltam)}d atrás)</span>`;
        } else if (diasFaltam <= 15) {
          statusProxima = `<span style="color:#f59e0b; font-size:11px;">\u23f0 Em ${diasFaltam}d</span>`;
        } else {
          statusProxima = `<span style="color:#059669; font-size:11px;">\u2714 ${m.proximaData}</span>`;
        }
      } else {
        statusProxima = '<span style="color:#94a3b8; font-size:11px;">N\u00e3o definida</span>';
      }
      return `<tr>
        <td>${m.data}</td>
        <td><b>${escapeHtml(maq?.nome || '-')}</b></td>
        <td><span style="color:${tipoCor}; font-weight:600;">${escapeHtml(m.tipoManutencao)}</span></td>
        <td>${escapeHtml(clampStr(m.servico || '-', 40))}</td>
        <td>${escapeHtml(clampStr(pecasStr || '-', 40))}</td>
        <td>${num(m.horimetroAtual || 0, 0)}h</td>
        <td>${statusProxima}</td>
        <td><b>${kbrl(m.custoTotal)}</b></td>
        <td class="noPrint"><button class="btn danger" onclick="window.__delManut('${m.id}')">Excluir</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="9">Nenhuma manutenção registrada.</td></tr>';
  }

  // Filtros
  document.getElementById("filtroMaquina").addEventListener("change", (e) => {
    const tipoVal = document.getElementById("filtroTipo")?.value || "";
    renderTabela(e.target.value, tipoVal);
  });
  document.getElementById("filtroTipo").addEventListener("change", (e) => {
    const maqVal = document.getElementById("filtroMaquina")?.value || "";
    renderTabela(maqVal, e.target.value);
  });

  // Excluir
  window.__delManut = (id) => {
    if (!confirm("Excluir esta manutenção?")) return;
    const db2 = getDB();
    db2.manutencoes = (db2.manutencoes || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Manutenção removida.");
    pageManutencao();
  };

  // Submit
  document.getElementById("frmManut").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const maquinaId = fd.get("maquinaId");
    if (!maquinaId) { alert("Selecione uma máquina"); return; }

    // Coletar peças
    const pecasNomes = fd.getAll("pecaNome[]");
    const pecasQtds = fd.getAll("pecaQtd[]");
    const pecasPrecos = fd.getAll("pecaPreco[]");
    const pecas = [];
    let custoPecas = 0;
    for (let i = 0; i < pecasNomes.length; i++) {
      if (pecasNomes[i]) {
        const qtd = Number(pecasQtds[i]) || 0;
        const preco = Number(pecasPrecos[i]) || 0;
        pecas.push({ nome: pecasNomes[i], qtd, preco });
        custoPecas += qtd * preco;
      }
    }

    const custoMaoObra = Number(fd.get("custoMaoObra") || 0);
    const outrosCustos = Number(fd.get("outrosCustos") || 0);
    const custoTotal = custoPecas + custoMaoObra + outrosCustos;

    const obj = {
      id: uid("man"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      maquinaId,
      tipoManutencao: fd.get("tipoManutencao"),
      horimetroAtual: Number(fd.get("horimetroAtual") || 0),
      intervaloHoras: Number(fd.get("intervaloHoras") || 500),
      proximaData: fd.get("proximaData") || "",
      mecanico: fd.get("mecanico") || "",
      oficina: fd.get("oficina") || "",
      servico: fd.get("servico") || "",
      tempoParada: Number(fd.get("tempoParada") || 0),
      pecas,
      custoPecas,
      custoMaoObra,
      outrosCustos,
      custoTotal,
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.manutencoes = db2.manutencoes || [];
    db2.manutencoes.push(obj);

    // Atualizar horímetro da máquina
    if (obj.horimetroAtual > 0) {
      const maq = db2.maquinas.find(m => m.id === maquinaId);
      if (maq && obj.horimetroAtual > Number(maq.horimetro || 0)) {
        maq.horimetro = obj.horimetroAtual;
      }
    }

    setDB(db2);
    toast("Manutenção registrada", `Custo: ${kbrl(custoTotal)}`);
    pageManutencao();
  });

  // Export CSV
  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = manutencoes.map(m => {
      const maq = maquinas.find(q => q.id === m.maquinaId);
      return {
        Data: m.data,
        Máquina: maq?.nome || '-',
        Tipo: m.tipoManutencao,
        Serviço: m.servico,
        Mecânico: m.mecanico,
        Oficina: m.oficina,
        Horímetro: m.horimetroAtual,
        Peças: (m.pecas || []).map(p => `${p.nome}(${p.qtd}x)`).join('; '),
        Custo_Peças: m.custoPecas,
        Custo_MãoObra: m.custoMaoObra,
        Outros_Custos: m.outrosCustos,
        Custo_Total: m.custoTotal,
        Tempo_Parada_h: m.tempoParada,
        Observações: m.obs
      };
    });
    downloadText(`manutencoes-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado.");
  });

  renderTabela();
}

// ============================================================================
// NOVA PÁGINA: INSUMOS BASE (ADUBAÇÃO POR TALHÃO)
// ============================================================================

