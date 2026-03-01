/* ============================================================
   AGRO PRO — Folha Salarial (v9.6)
   Módulo completo de gestão da folha de pagamento
   ============================================================ */

function pageFolhaSalarial() {
  const db = getDB();
  const safraId = getSafraId();
  let equipe = onlySafra(db.equipe || []);
  if (fazendaAtual) equipe = equipe.filter(e => !e.fazendaId || e.fazendaId === fazendaAtual);

  const folhas = onlySafra(db.folhaSalarial || []).sort((a, b) =>
    (b.competencia || '').localeCompare(a.competencia || '')
  );

  setTopActions(`
    <button class="btn" id="btnExportFolhaCSV">📥 CSV</button>
    <button class="btn primary noPrint" id="btnImprimirFolha">🖨️ Imprimir</button>
  `);

  // ── KPIs ──────────────────────────────────────────────────
  const mesSel = folhas[0]?.competencia?.substring(0, 7) || '';
  const folhasMes = mesSel ? folhas.filter(f => (f.competencia || '').startsWith(mesSel)) : folhas;

  const totalBruto   = folhasMes.reduce((s, f) => s + Number(f.salarioBruto || 0), 0);
  const totalDescontos = folhasMes.reduce((s, f) => s + Number(f.totalDescontos || 0), 0);
  const totalLiquido = folhasMes.reduce((s, f) => s + Number(f.salarioLiquido || 0), 0);
  const totalHorasExtras = folhasMes.reduce((s, f) => s + Number(f.horasExtras || 0), 0);
  const nFuncionarios = new Set(folhasMes.map(f => f.funcionarioId)).size;

  const content = document.getElementById('content');
  content.innerHTML = `
    <style>
      .fs-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }
      .fs-kpi {
        background: white;
        border-radius: 12px;
        padding: 18px 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        border-left: 4px solid #10b981;
      }
      .fs-kpi.vermelho { border-color: #ef4444; }
      .fs-kpi.azul    { border-color: #3b82f6; }
      .fs-kpi.amarelo { border-color: #f59e0b; }
      .fs-kpi.roxo    { border-color: #8b5cf6; }
      .fs-kpi .label  { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
      .fs-kpi .value  { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.1; }
      .fs-kpi .sub    { font-size: 11px; color: #94a3b8; margin-top: 4px; }

      .fs-section { margin-bottom: 28px; }

      .fs-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      .fs-form-grid .full { grid-column: 1 / -1; }

      .fs-table-wrap { overflow-x: auto; }
      .fs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .fs-table th {
        background: #f1f5f9;
        padding: 10px 12px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
        white-space: nowrap;
      }
      .fs-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
        vertical-align: middle;
      }
      .fs-table tr:hover td { background: #f8fafc; }
      .fs-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-pago    { background: #dcfce7; color: #166534; }
      .badge-pendente{ background: #fef3c7; color: #92400e; }
      .badge-adiantamento { background: #dbeafe; color: #1e40af; }

      .desconto-line {
        display: grid;
        grid-template-columns: 2fr 2fr 1fr 0.3fr;
        gap: 10px;
        margin-bottom: 8px;
        align-items: center;
      }
      .valor-destaque { font-weight: 700; color: #10b981; }
      .valor-desconto { font-weight: 700; color: #ef4444; }

      .comp-group { margin-bottom: 20px; }
      .comp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f1f5f9;
        padding: 10px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        font-weight: 600;
        color: #334155;
        font-size: 13px;
      }
      @media print {
        .noPrint, button, .noPrint * { display: none !important; }
        .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        body { font-size: 12px; }
        .fs-kpi .value { font-size: 20px; }
      }
    </style>

    <!-- KPIs -->
    <div class="fs-kpi-grid">
      <div class="fs-kpi">
        <div class="label">👷 Funcionários</div>
        <div class="value">${nFuncionarios || equipe.length}</div>
        <div class="sub">na safra atual</div>
      </div>
      <div class="fs-kpi azul">
        <div class="label">💰 Total Bruto</div>
        <div class="value">${brl(totalBruto)}</div>
        <div class="sub">${mesSel ? 'mês ' + _formatCompetencia(mesSel) : 'geral'}</div>
      </div>
      <div class="fs-kpi vermelho">
        <div class="label">➖ Descontos</div>
        <div class="value">${brl(totalDescontos)}</div>
        <div class="sub">INSS + outros</div>
      </div>
      <div class="fs-kpi">
        <div class="label">✅ Total Líquido</div>
        <div class="value">${brl(totalLiquido)}</div>
        <div class="sub">a pagar</div>
      </div>
      <div class="fs-kpi amarelo">
        <div class="label">⏱️ Horas Extras</div>
        <div class="value">${num(totalHorasExtras)} h</div>
        <div class="sub">no período</div>
      </div>
    </div>

    <!-- FORMULÁRIO -->
    <div class="card fs-section noPrint">
      <h3 style="margin:0 0 18px; font-size:16px; color:#0f172a;">📝 Lançar Folha Salarial</h3>

      <div class="fs-form-grid" style="margin-bottom:12px;">
        <div>
          <small class="form-label">Funcionário *</small>
          <select class="select" id="fsFuncionario">
            <option value="">— Selecione —</option>
            ${equipe.map(e => `<option value="${e.id}">${escapeHtml(e.nome)} — ${escapeHtml(e.funcao || 'Sem função')}</option>`).join('')}
          </select>
        </div>
        <div>
          <small class="form-label">Competência (Mês/Ano) *</small>
          <input class="input" type="month" id="fsCompetencia" value="${_getMesAtual()}" />
        </div>
        <div>
          <small class="form-label">Salário Base (R$) *</small>
          <input class="input" type="number" id="fsSalarioBase" placeholder="1412.00" min="0" step="0.01" />
        </div>
        <div>
          <small class="form-label">Dias Trabalhados</small>
          <input class="input" type="number" id="fsDiasTrabalhados" placeholder="30" min="0" max="31" value="30" />
        </div>
        <div>
          <small class="form-label">Horas Extras (h)</small>
          <input class="input" type="number" id="fsHorasExtras" placeholder="0" min="0" step="0.5" value="0" />
        </div>
        <div>
          <small class="form-label">Valor Hora Extra (R$)</small>
          <input class="input" type="number" id="fsValorHoraExtra" placeholder="0.00" min="0" step="0.01" value="0" />
        </div>
        <div>
          <small class="form-label">Adiantamento (R$)</small>
          <input class="input" type="number" id="fsAdiantamento" placeholder="0.00" min="0" step="0.01" value="0" />
        </div>
        <div>
          <small class="form-label">Vale Transporte (R$)</small>
          <input class="input" type="number" id="fsValeTransporte" placeholder="0.00" min="0" step="0.01" value="0" />
        </div>
        <div>
          <small class="form-label">Vale Alimentação (R$)</small>
          <input class="input" type="number" id="fsValeAlimentacao" placeholder="0.00" min="0" step="0.01" value="0" />
        </div>
        <div>
          <small class="form-label">Outros Benefícios (R$)</small>
          <input class="input" type="number" id="fsOutrosBeneficios" placeholder="0.00" min="0" step="0.01" value="0" />
        </div>
        <div>
          <small class="form-label">Status de Pagamento</small>
          <select class="select" id="fsStatus">
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="adiantamento">Adiantamento</option>
          </select>
        </div>
        <div>
          <small class="form-label">Data de Pagamento</small>
          <input class="input" type="date" id="fsDataPagamento" />
        </div>
      </div>

      <!-- Descontos Extras -->
      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <small class="form-label" style="margin:0; font-size:13px; font-weight:700;">➖ Descontos Extras (INSS calculado automaticamente)</small>
          <button class="btn" style="padding:4px 10px; font-size:12px;" id="btnAddDesconto">+ Adicionar</button>
        </div>
        <div id="descontosContainer"></div>
      </div>

      <!-- Observações -->
      <div style="margin-bottom:16px;">
        <small class="form-label">Observações</small>
        <textarea class="input" id="fsObs" rows="2" placeholder="Ex: pagamento em conta, pix, dinheiro..."></textarea>
      </div>

      <!-- Resumo ao vivo -->
      <div id="fsResumoLive" style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:14px; margin-bottom:16px; display:none;">
        <strong style="font-size:13px; color:#166534;">📊 Resumo calculado:</strong>
        <div id="fsResumoTexto" style="font-size:13px; color:#334155; margin-top:8px;"></div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn primary" id="btnSalvarFolha" style="min-width:160px;">💾 Salvar Folha</button>
        <button class="btn" id="btnLimparFolha">🔄 Limpar</button>
        <button class="btn" id="btnCalcularFolha">🧮 Calcular</button>
      </div>
    </div>

    <!-- TABELA POR COMPETÊNCIA -->
    <div class="card fs-section">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <h3 style="margin:0; font-size:16px; color:#0f172a;">📋 Histórico de Folhas</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input class="input" type="month" id="fsFiltroMes" style="width:160px;" placeholder="Filtrar mês" />
          <select class="select" id="fsFiltroFuncionario" style="width:180px;">
            <option value="">Todos os funcionários</option>
            ${equipe.map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="fsHistoricoContainer"></div>
    </div>

    <!-- RESUMO POR FUNCIONÁRIO -->
    <div class="card fs-section">
      <h3 style="margin:0 0 16px; font-size:16px; color:#0f172a;">👷 Resumo por Funcionário (safra atual)</h3>
      <div id="fsResumoPorFuncionario"></div>
    </div>
  `;

  // ── Descontos dinâmicos ─────────────────────────────────
  let descontoIndex = 0;
  const descontosContainer = document.getElementById('descontosContainer');

  function addDescontoLine(tipo = '', valor = '') {
    const id = descontoIndex++;
    const div = document.createElement('div');
    div.className = 'desconto-line';
    div.id = `descLine${id}`;
    div.innerHTML = `
      <select class="select" id="dTipo${id}" onchange="_fsCalcLive()">
        <option value="falta"${tipo==='falta'?' selected':''}>Falta/Atraso</option>
        <option value="outros"${tipo==='outros'?' selected':''}>Outros Descontos</option>
        <option value="emprestimo"${tipo==='emprestimo'?' selected':''}>Empréstimo</option>
        <option value="multa"${tipo==='multa'?' selected':''}>Multa/Penalidade</option>
      </select>
      <input class="input" type="text" id="dDesc${id}" placeholder="Descrição" style="font-size:12px;" />
      <input class="input" type="number" id="dValor${id}" placeholder="R$" value="${valor}" min="0" step="0.01" oninput="_fsCalcLive()" style="font-size:12px;" />
      <button class="btn" style="padding:4px 8px; font-size:14px; color:#ef4444;" onclick="document.getElementById('descLine${id}').remove(); _fsCalcLive();">✕</button>
    `;
    descontosContainer.appendChild(div);
  }

  document.getElementById('btnAddDesconto').addEventListener('click', () => addDescontoLine());

  // ── Cálculo ao vivo ────────────────────────────────────
  window._fsCalcLive = function () {
    const base = parseFloat(document.getElementById('fsSalarioBase')?.value || 0);
    if (!base) { document.getElementById('fsResumoLive').style.display = 'none'; return; }

    const dias = parseInt(document.getElementById('fsDiasTrabalhados')?.value || 30);
    const hExtra = parseFloat(document.getElementById('fsHorasExtras')?.value || 0);
    const vHExtra = parseFloat(document.getElementById('fsValorHoraExtra')?.value || 0);
    const adiantamento = parseFloat(document.getElementById('fsAdiantamento')?.value || 0);
    const vt = parseFloat(document.getElementById('fsValeTransporte')?.value || 0);
    const va = parseFloat(document.getElementById('fsValeAlimentacao')?.value || 0);
    const extras = parseFloat(document.getElementById('fsOutrosBeneficios')?.value || 0);

    // Proporcional por dias
    const salarioProp = (base / 30) * dias;
    const valorHorasExtras = hExtra * vHExtra;

    // INSS 2025 (tabela progressiva simplificada)
    const inss = _calcINSS(salarioProp + valorHorasExtras);

    // Descontos extras
    let descontosExtras = 0;
    document.querySelectorAll('[id^="dValor"]').forEach(el => {
      descontosExtras += parseFloat(el.value || 0);
    });

    const bruto = salarioProp + valorHorasExtras + vt + va + extras;
    const totalDesc = inss + adiantamento + descontosExtras;
    const liquido = bruto - totalDesc;

    document.getElementById('fsResumoLive').style.display = 'block';
    document.getElementById('fsResumoTexto').innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; font-size:12px;">
        <div><b>Salário Proporcional:</b><br>${brl(salarioProp)}</div>
        <div><b>Horas Extras:</b><br>${brl(valorHorasExtras)} (${num(hExtra)}h)</div>
        <div><b>INSS (desconto):</b><br><span class="valor-desconto">${brl(inss)}</span></div>
        <div><b>VT + VA + Outros:</b><br>${brl(vt + va + extras)}</div>
        <div><b>Adiantamento:</b><br><span class="valor-desconto">${brl(adiantamento)}</span></div>
        <div><b>Outros Descontos:</b><br><span class="valor-desconto">${brl(descontosExtras)}</span></div>
      </div>
      <div style="margin-top:10px; padding-top:10px; border-top:1px solid #86efac; display:flex; gap:20px;">
        <div><b>Salário Bruto:</b> <span style="font-size:16px; font-weight:800; color:#2563eb;">${brl(bruto)}</span></div>
        <div><b>Total Descontos:</b> <span style="font-size:16px; font-weight:800; color:#ef4444;">${brl(totalDesc)}</span></div>
        <div><b>Salário Líquido:</b> <span style="font-size:16px; font-weight:800; color:#10b981;">${brl(liquido)}</span></div>
      </div>
    `;
  };

  // Listeners de cálculo ao vivo
  ['fsSalarioBase','fsDiasTrabalhados','fsHorasExtras','fsValorHoraExtra','fsAdiantamento','fsValeTransporte','fsValeAlimentacao','fsOutrosBeneficios'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', _fsCalcLive);
  });

  document.getElementById('btnCalcularFolha').addEventListener('click', _fsCalcLive);

  // ── Salvar Folha ────────────────────────────────────────
  document.getElementById('btnSalvarFolha').addEventListener('click', () => {
    const funcionarioId = document.getElementById('fsFuncionario').value;
    const competencia = document.getElementById('fsCompetencia').value;
    const base = parseFloat(document.getElementById('fsSalarioBase').value || 0);

    if (!funcionarioId) return toast('❌ Erro', 'Selecione um funcionário');
    if (!competencia)   return toast('Agro Pro', 'Informe a competência (mês/ano)', 'error');
    if (!base || base <= 0) return toast('❌ Erro', 'Informe o salário base');

    const funcionario = equipe.find(e => e.id === funcionarioId);
    const dias = parseInt(document.getElementById('fsDiasTrabalhados').value || 30);
    const hExtra = parseFloat(document.getElementById('fsHorasExtras').value || 0);
    const vHExtra = parseFloat(document.getElementById('fsValorHoraExtra').value || 0);
    const adiantamento = parseFloat(document.getElementById('fsAdiantamento').value || 0);
    const vt = parseFloat(document.getElementById('fsValeTransporte').value || 0);
    const va = parseFloat(document.getElementById('fsValeAlimentacao').value || 0);
    const extras = parseFloat(document.getElementById('fsOutrosBeneficios').value || 0);
    const status = document.getElementById('fsStatus').value;
    const dataPagamento = document.getElementById('fsDataPagamento').value;
    const obs = document.getElementById('fsObs').value.trim();

    const salarioProp = (base / 30) * dias;
    const valorHorasExtras = hExtra * vHExtra;
    const inss = _calcINSS(salarioProp + valorHorasExtras);

    // Coletar descontos extras
    const descontos = [];
    let descontosExtrasTotal = 0;
    document.querySelectorAll('[id^="dValor"]').forEach((el, idx) => {
      const v = parseFloat(el.value || 0);
      if (v > 0) {
        const tipoEl = document.querySelector(`[id^="dTipo"]`);
        const descEl = document.getElementById(el.id.replace('dValor', 'dDesc'));
        descontos.push({ tipo: tipoEl?.value || 'outros', descricao: descEl?.value || '', valor: v });
        descontosExtrasTotal += v;
      }
    });

    const salarioBruto = salarioProp + valorHorasExtras + vt + va + extras;
    const totalDescontos = inss + adiantamento + descontosExtrasTotal;
    const salarioLiquido = salarioBruto - totalDescontos;

    const registro = {
      id: 'fs_' + Date.now(),
      safraId,
      funcionarioId,
      funcionarioNome: funcionario?.nome || '',
      funcionarioFuncao: funcionario?.funcao || '',
      competencia: competencia + '-01',
      salarioBase: base,
      diasTrabalhados: dias,
      horasExtras: hExtra,
      valorHoraExtra: vHExtra,
      valorHorasExtras,
      adiantamento,
      valeTransporte: vt,
      valeAlimentacao: va,
      outrosBeneficios: extras,
      inss,
      descontosExtras: descontos,
      totalDescontos,
      salarioBruto,
      salarioLiquido,
      status,
      dataPagamento,
      obs,
      criadoEm: new Date().toISOString()
    };

    const dbNow = getDB();
    dbNow.folhaSalarial = dbNow.folhaSalarial || [];
    dbNow.folhaSalarial.push(registro);
    setDB(dbNow);
    toast('Agro Pro', `✅ Folha de ${funcionario?.nome} salva! Líquido: ${brl(salarioLiquido)}`, 'success');
    pageFolhaSalarial();
  });

  // ── Limpar ─────────────────────────────────────────────
  document.getElementById('btnLimparFolha').addEventListener('click', () => {
    ['fsFuncionario','fsSalarioBase','fsHorasExtras','fsValorHoraExtra','fsAdiantamento','fsValeTransporte','fsValeAlimentacao','fsOutrosBeneficios','fsObs','fsDataPagamento'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = el.tagName === 'SELECT' ? (el.options[0]?.value || '') : '';
    });
    const dias = document.getElementById('fsDiasTrabalhados');
    if (dias) dias.value = '30';
    const status = document.getElementById('fsStatus');
    if (status) status.value = 'pendente';
    descontosContainer.innerHTML = '';
    document.getElementById('fsResumoLive').style.display = 'none';
  });

  // ── Renderizar histórico ───────────────────────────────
  function renderHistorico() {
    const filtroMes = document.getElementById('fsFiltroMes')?.value || '';
    const filtroFunc = document.getElementById('fsFiltroFuncionario')?.value || '';
    const dbNow = getDB();
    let lista = onlySafra(dbNow.folhaSalarial || []).sort((a, b) =>
      (b.competencia || '').localeCompare(a.competencia || '')
    );
    if (filtroMes) lista = lista.filter(f => (f.competencia || '').startsWith(filtroMes));
    if (filtroFunc) lista = lista.filter(f => f.funcionarioId === filtroFunc);

    const container = document.getElementById('fsHistoricoContainer');
    if (!lista.length) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Nenhum registro encontrado.</div>`;
      return;
    }

    // Agrupar por competência
    const grupos = {};
    lista.forEach(f => {
      const key = (f.competencia || '').substring(0, 7);
      grupos[key] = grupos[key] || [];
      grupos[key].push(f);
    });

    let html = '';
    Object.keys(grupos).sort((a, b) => b.localeCompare(a)).forEach(mes => {
      const itens = grupos[mes];
      const totalLiq = itens.reduce((s, f) => s + Number(f.salarioLiquido || 0), 0);
      const totalBrt = itens.reduce((s, f) => s + Number(f.salarioBruto || 0), 0);

      html += `
        <div class="comp-group">
          <div class="comp-header">
            <span>📅 ${_formatCompetencia(mes)} — ${itens.length} funcionário(s)</span>
            <span>Bruto: ${brl(totalBrt)} | Líquido: <b style="color:#10b981;">${brl(totalLiq)}</b></span>
          </div>
          <div class="fs-table-wrap">
            <table class="fs-table">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Função</th>
                  <th>Dias</th>
                  <th>H. Extras</th>
                  <th>Bruto</th>
                  <th>INSS</th>
                  <th>Descontos</th>
                  <th>Líquido</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${itens.map(f => `
                  <tr>
                    <td data-label="Funcionário"><b>${escapeHtml(f.funcionarioNome || '—')}</b></td>
                    <td data-label="Função">${escapeHtml(f.funcionarioFuncao || '—')}</td>
                    <td data-label="Dias" style="text-align:center;">${f.diasTrabalhados || 30}</td>
                    <td data-label="H. Extras" style="text-align:center;">${num(f.horasExtras || 0)}h</td>
                    <td data-label="Bruto"><b style="color:#2563eb;">${brl(f.salarioBruto)}</b></td>
                    <td data-label="INSS"><span style="color:#ef4444;">${brl(f.inss || 0)}</span></td>
                    <td data-label="Descontos"><span style="color:#ef4444;">${brl(f.totalDescontos || 0)}</span></td>
                    <td data-label="Líquido"><b class="valor-destaque">${brl(f.salarioLiquido)}</b></td>
                    <td data-label="Status"><span class="fs-badge badge-${f.status || 'pendente'}">${_statusLabel(f.status)}</span></td>
                    <td data-label="Ações" style="white-space:nowrap;">
                      <button class="btn" style="padding:3px 8px; font-size:11px;" onclick="_fsPagarFolha('${f.id}')">✅ Pagar</button>
                      <button class="btn" style="padding:3px 8px; font-size:11px; color:#ef4444;" onclick="_fsDeleteFolha('${f.id}')">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // ── Resumo por funcionário ─────────────────────────────
  function renderResumoPorFuncionario() {
    const dbNow = getDB();
    const todasFolhas = onlySafra(dbNow.folhaSalarial || []);
    const container = document.getElementById('fsResumoPorFuncionario');

    if (!equipe.length) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">Nenhum funcionário cadastrado na safra.</div>`;
      return;
    }

    const resumos = equipe.map(e => {
      const minhas = todasFolhas.filter(f => f.funcionarioId === e.id);
      const totalBruto = minhas.reduce((s, f) => s + Number(f.salarioBruto || 0), 0);
      const totalLiquido = minhas.reduce((s, f) => s + Number(f.salarioLiquido || 0), 0);
      const totalHorasExtras = minhas.reduce((s, f) => s + Number(f.horasExtras || 0), 0);
      const pendentes = minhas.filter(f => f.status !== 'pago').reduce((s, f) => s + Number(f.salarioLiquido || 0), 0);
      return { e, minhas, totalBruto, totalLiquido, totalHorasExtras, pendentes };
    });

    container.innerHTML = `
      <div class="fs-table-wrap">
        <table class="fs-table">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Função</th>
              <th>Meses</th>
              <th>Total Bruto</th>
              <th>Total Líquido</th>
              <th>H. Extras</th>
              <th>A Pagar</th>
            </tr>
          </thead>
          <tbody>
            ${resumos.map(r => `
              <tr>
                <td><b>${escapeHtml(r.e.nome)}</b></td>
                <td>${escapeHtml(r.e.funcao || '—')}</td>
                <td style="text-align:center;">${r.minhas.length}</td>
                <td><b style="color:#2563eb;">${brl(r.totalBruto)}</b></td>
                <td><b class="valor-destaque">${brl(r.totalLiquido)}</b></td>
                <td style="text-align:center;">${num(r.totalHorasExtras)}h</td>
                <td><b style="color:${r.pendentes > 0 ? '#f59e0b' : '#10b981'};">${r.pendentes > 0 ? brl(r.pendentes) : '✅ Em dia'}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ── Filtros ────────────────────────────────────────────
  document.getElementById('fsFiltroMes')?.addEventListener('change', renderHistorico);
  document.getElementById('fsFiltroFuncionario')?.addEventListener('change', renderHistorico);

  // ── Ações Globais ──────────────────────────────────────
  window._fsPagarFolha = function (id) {
    const dbNow = getDB();
    const idx = (dbNow.folhaSalarial || []).findIndex(f => f.id === id);
    if (idx < 0) return;
    dbNow.folhaSalarial[idx].status = 'pago';
    dbNow.folhaSalarial[idx].dataPagamento = new Date().toISOString().split('T')[0];
    setDB(dbNow);
    toast('✅ Sucesso', '✅ Marcado como pago!');
    renderHistorico();
    renderResumoPorFuncionario();
  };

  window._fsDeleteFolha = function (id) {
    if (!confirm('Excluir este registro de folha?')) return;
    const dbNow = getDB();
    dbNow.folhaSalarial = (dbNow.folhaSalarial || []).filter(f => f.id !== id);
    setDB(dbNow);
    toast('ℹ️ Info', 'Registro excluído.');
    pageFolhaSalarial();
  };

  // ── Export CSV ─────────────────────────────────────────
  document.getElementById('btnExportFolhaCSV')?.addEventListener('click', () => {
    const dbNow = getDB();
    const lista = onlySafra(dbNow.folhaSalarial || []);
    if (!lista.length) return toast('❌ Erro', 'Nenhum dado para exportar');
    const header = ['Funcionário','Função','Competência','Dias Trab.','H. Extras','Salário Base','Bruto','INSS','Total Descontos','Líquido','VT','VA','Adiantamento','Status','Data Pagamento','Obs'];
    const rows = lista.map(f => [
      f.funcionarioNome, f.funcionarioFuncao,
      _formatCompetencia((f.competencia||'').substring(0,7)),
      f.diasTrabalhados, f.horasExtras,
      f.salarioBase, f.salarioBruto, f.inss, f.totalDescontos, f.salarioLiquido,
      f.valeTransporte, f.valeAlimentacao, f.adiantamento,
      f.status, f.dataPagamento, f.obs
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `folha-salarial-${getSafraAtual()?.nome || 'safra'}.csv`;
    a.click();
  });

  // ── Imprimir ───────────────────────────────────────────
  document.getElementById('btnImprimirFolha')?.addEventListener('click', () => window.print());

  // ── Render inicial ─────────────────────────────────────
  renderHistorico();
  renderResumoPorFuncionario();
}

// ── Helpers privados ─────────────────────────────────────

function _getMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _formatCompetencia(ym) {
  if (!ym || ym.length < 7) return ym || '—';
  const [y, m] = ym.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(m) - 1] || m}/${y}`;
}

function _statusLabel(s) {
  if (s === 'pago') return '✅ Pago';
  if (s === 'adiantamento') return '💳 Adiantamento';
  return '⏳ Pendente';
}

/**
 * Calcula INSS 2025 com tabela progressiva
 */
function _calcINSS(base) {
  if (!base || base <= 0) return 0;
  // Faixas INSS 2025
  const faixas = [
    { limite: 1518.00,  aliq: 0.075 },
    { limite: 2793.88,  aliq: 0.09  },
    { limite: 4190.83,  aliq: 0.12  },
    { limite: 8157.41,  aliq: 0.14  }
  ];
  let inss = 0;
  let baseRestante = Math.min(base, 8157.41);
  let limiteAnterior = 0;
  for (const faixa of faixas) {
    if (baseRestante <= limiteAnterior) break;
    const fatia = Math.min(baseRestante, faixa.limite) - limiteAnterior;
    if (fatia > 0) inss += fatia * faixa.aliq;
    limiteAnterior = faixa.limite;
  }
  return Math.round(inss * 100) / 100;
}
