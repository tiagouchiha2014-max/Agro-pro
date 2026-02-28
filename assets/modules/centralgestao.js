function pageCentralGestao() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const estoque = onlySafra(db.estoque || []);
  const diesel = onlySafra(db.dieselEstoque || []);
  const aplicacoes = onlySafra(db.aplicacoes || []);
  const combustivel = onlySafra(db.combustivel || []);
  const colheitas = onlySafra(db.colheitas || []);
  const params = db.parametros || { 
    precoSoja: 120, 
    produtividadeMinSoja: 65, 
    produtividadeMaxSoja: 75,
    precoMilho: 60,
    produtividadeMinMilho: 100,
    produtividadeMaxMilho: 130,
    precoAlgodao: 150,
    produtividadeMinAlgodao: 250,
    produtividadeMaxAlgodao: 300,
    pesoPadraoSaca: 60
  };

  const negEstoque = estoque.filter(s => Number(s.qtd || 0) < 0);
  const negDiesel = diesel.filter(d => Number(d.litros || 0) < 0);
  const custoTal = calcCustosPorTalhao(db);

  // Função para converter kg para sacas
  const kgParaSacas = (kg) => kg / (params.pesoPadraoSaca || 60);

  // Mapa de colheitas por talhão
  const colheitaPorTalhao = new Map();
  colheitas.forEach(c => {
    colheitaPorTalhao.set(c.talhaoId, c);
  });

  // Calcular receita e lucro por talhão (estimado e real)
  const talhoesComLucro = talhoes.map(t => {
    const area = Number(t.areaHa || 0);
    const custo = custoTal.find(ct => ct.talhaoId === t.id)?.custoTotal || 0;
    
    // Receita estimada (baseada na produtividade configurada)
    let receitaEstimada = 0;
    let prodMin = 0, prodMax = 0, preco = 0;
    const cultura = t.cultura?.toLowerCase() || '';

    if (cultura === 'soja') {
      prodMin = params.produtividadeMinSoja;
      prodMax = params.produtividadeMaxSoja;
      preco = params.precoSoja;
    } else if (cultura === 'milho') {
      prodMin = params.produtividadeMinMilho;
      prodMax = params.produtividadeMaxMilho;
      preco = params.precoMilho;
    } else if (cultura === 'algodao') {
      prodMin = params.produtividadeMinAlgodao;
      prodMax = params.produtividadeMaxAlgodao;
      preco = params.precoAlgodao;
    }

    if (prodMin && prodMax && preco) {
      const producaoMedia = (prodMin + prodMax) / 2;
      receitaEstimada = area * producaoMedia * preco;
    }

    // Receita real (baseada na colheita)
    const colheita = colheitaPorTalhao.get(t.id);
    let receitaReal = 0;
    let producaoRealKg = 0;
    if (colheita) {
      if (colheita.unidade === 'kg') {
        producaoRealKg = colheita.producaoTotal;
        receitaReal = kgParaSacas(colheita.producaoTotal) * preco;
      } else {
        // unidade já em sacas
        receitaReal = colheita.producaoTotal * preco;
      }
    }

    return {
      ...t,
      custo,
      receitaEstimada,
      receitaReal,
      lucroEstimado: receitaEstimada - custo,
      lucroReal: receitaReal - custo,
      producaoRealKg,
      colheitaRegistrada: !!colheita
    };
  });

  const receitaEstimadaTotal = talhoesComLucro.reduce((s, t) => s + t.receitaEstimada, 0);
  const receitaRealTotal = talhoesComLucro.reduce((s, t) => s + t.receitaReal, 0);
  const custoTotal = talhoesComLucro.reduce((s, t) => s + t.custo, 0);
  const lucroEstimadoTotal = receitaEstimadaTotal - custoTotal;
  const lucroRealTotal = receitaRealTotal - custoTotal;

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .ops-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .ops-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .ops-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .ops-kpi-valor {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
      }
      .ops-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .dual-table {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 20px;
      }
      .destaque-positivo { color: #059669; }
      .destaque-negativo { color: #b91c1c; }
    </style>

    <div class="ops-kpi-grid">
      <div class="ops-kpi-card">
        <h3>📦 Alertas Estoque</h3>
        <div class="ops-kpi-valor">${negEstoque.length}</div>
        <div class="ops-kpi-label">itens com saldo negativo</div>
      </div>
      <div class="ops-kpi-card">
        <h3>⛽ Alertas Diesel</h3>
        <div class="ops-kpi-valor">${negDiesel.length}</div>
        <div class="ops-kpi-label">tanques negativos</div>
      </div>
      ${canSeeFinanceiro() ? `
      <div class="ops-kpi-card">
        <h3>💰 Receita Total</h3>
        <div class="ops-kpi-valor ${receitaRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(receitaRealTotal)}</div>
        <div class="ops-kpi-label">vs. estimada ${kbrl(receitaEstimadaTotal)}</div>
      </div>
      <div class="ops-kpi-card">
        <h3>📊 Margem Real</h3>
        <div class="ops-kpi-valor">${custoTotal ? ((lucroRealTotal / custoTotal) * 100).toFixed(1) : 0}%</div>
        <div class="ops-kpi-label">sobre o custo</div>
      </div>
      ` : ''}
    </div>

    ${canSeeFinanceiro() ? `
    <div class="card" style="margin-bottom:20px;">
      <h3>📈 Resumo Financeiro</h3>
      <table style="width:100%;">
        <tr>
          <td><b>Custo total:</b></td>
          <td style="text-align:right">${kbrl(custoTotal)}</td>
        </tr>
        <tr>
          <td><b>Receita estimada:</b></td>
          <td style="text-align:right">${kbrl(receitaEstimadaTotal)}</td>
        </tr>
        <tr>
          <td><b>Lucro estimado:</b></td>
          <td style="text-align:right"><span class="${lucroEstimadoTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(lucroEstimadoTotal)}</span></td>
        </tr>
        <tr style="border-top:2px solid #e2e8f0;">
          <td><b>Receita real:</b></td>
          <td style="text-align:right">${kbrl(receitaRealTotal)}</td>
        </tr>
        <tr>
          <td><b>Lucro real:</b></td>
          <td style="text-align:right"><b class="${lucroRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(lucroRealTotal)}</b></td>
        </tr>
        <tr>
          <td><b>Diferença:</b></td>
          <td style="text-align:right">
            <span class="${(lucroRealTotal - lucroEstimadoTotal) >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">
              ${kbrl(lucroRealTotal - lucroEstimadoTotal)}
            </span>
          </td>
        </tr>
      </table>
    </div>
    ` : '<div class="card" style="background:#f8fafc; border: 1px dashed #cbd5e1; text-align:center; padding:15px;"><p style="color:#64748b; margin:0;">🔒 Resumo financeiro oculto para seu perfil.</p></div>'}

    <div class="tableWrap">
      <h3>📋 Custos e Rentabilidade por Talhão</h3>
      <table>
        <thead>
          <tr>
            <th>Talhão</th>
            <th>Cultura</th>
            <th>Área (ha)</th>
            ${canSeeFinanceiro() ? '<th>Custo</th>' : ''}
            <th>Produção (kg)</th>
            ${canSeeFinanceiro() ? '<th>Receita Estimada</th>' : ''}
            ${canSeeFinanceiro() ? '<th>Receita Real</th>' : ''}
            ${canSeeFinanceiro() ? '<th>Receita Líquida</th>' : ''}
            <th class="noPrint">IA Manejo</th>
          </tr>
        </thead>
        <tbody>
          ${talhoesComLucro.map(t => {
            const lucroClass = t.lucroReal >= 0 ? 'destaque-positivo' : 'destaque-negativo';
            return `<tr>
              <td><b>${escapeHtml(t.nome)}</b></td>
              <td>${escapeHtml(t.cultura || '-')}</td>
              <td>${num(t.areaHa, 1)}</td>
              ${canSeeFinanceiro() ? `<td>${kbrl(t.custo)}</td>` : ''}
              <td>${t.colheitaRegistrada ? num(t.producaoRealKg, 0) : '-'}</td>
              ${canSeeFinanceiro() ? `<td>${kbrl(t.receitaEstimada)}</td>` : ''}
              ${canSeeFinanceiro() ? `<td>${t.colheitaRegistrada ? kbrl(t.receitaReal) : '-'}</td>` : ''}
              ${canSeeFinanceiro() ? `<td class="${lucroClass}">${t.colheitaRegistrada ? kbrl(t.lucroReal) : '-'}</td>` : ''}
              <td class="noPrint"><button class="btn primary" style="font-size:11px; padding:6px 10px;" onclick="window.__sugerirManejo('${t.id}')">🤖 Sugerir</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Seção Cotação de Grãos -->
    <div class="card" style="margin-top:20px; background:linear-gradient(135deg, #fef3c7, #fde68a); border:1px solid #f59e0b;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0; color:#b45309;">💰 Cotação de Grãos — Preço por Região</h3>
      </div>
      <div class="help" style="margin-bottom:15px; color:#92400e;">Busque o preço atual da soja ou milho baseado na localização da sua fazenda.</div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <select class="select" id="selectCulturaPreco" style="max-width:200px;">
          <option value="Soja">Soja</option>
          <option value="Milho">Milho</option>
        </select>
        <button class="btn primary" id="btnBuscarPreco" style="font-size:14px; padding:10px 20px; background:#b45309;">
          💰 Buscar Cotação
        </button>
      </div>
      <div id="precoResultado" style="margin-top:15px;"></div>
    </div>

    <!-- Seção IA Prescritiva -->
    <div class="card" style="margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0;">🤖 IA Prescritiva — Assistente de Manejo</h3>
      </div>
      <div class="help" style="margin-bottom:15px;">
        Selecione um talhão e clique em <b>"Sugerir Manejo"</b> para receber recomendações de manejo baseadas em IA, considerando o clima atual, previsão do tempo, histórico de aplicações e dados do talhão.
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <select class="select" id="selectTalhaoIA" style="max-width:300px;">
          <option value="">Selecione um talhão...</option>
          ${talhoes.map(t => '<option value="' + t.id + '">' + escapeHtml(t.nome) + ' (' + (t.cultura || '-') + ') — ' + num(t.areaHa, 1) + ' ha</option>').join('')}
        </select>
        <button class="btn primary" id="btnSugerirManejo" style="font-size:14px; padding:10px 20px;">
          🤖 Sugerir Manejo
        </button>
      </div>
      <div id="iaResultado" style="margin-top:20px;"></div>
    </div>

  `;

  // API Key removida do front-end — IA via Edge Function

  // Botão buscar cotação de grãos
  document.getElementById("btnBuscarPreco").addEventListener("click", async () => {
    const cultura = document.getElementById("selectCulturaPreco").value;
    const db2 = getDB();
    const fazendas2 = onlySafra(db2.fazendas);
    
    if (fazendas2.length === 0) {
      toast("Erro", "Cadastre uma fazenda com coordenadas.");
      return;
    }
    
    const faz = fazendaAtual ? fazendas2.find(f => f.id === fazendaAtual) : fazendas2[0];
    if (!faz || !faz.latitude || !faz.longitude) {
      toast("Erro", "Cadastre latitude/longitude na fazenda.");
      return;
    }
    
    const resultado = await buscarPrecoGraos(cultura, parseFloat(faz.latitude), parseFloat(faz.longitude));
    
    if (resultado.ok) {
      document.getElementById("precoResultado").innerHTML = `
        <div style="background:white; border-radius:8px; padding:15px; border:2px solid #f59e0b;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; color:#64748b;">Cultura: <b>${resultado.cultura}</b></div>
              <div style="font-size:12px; color:#64748b;">Região: <b>${resultado.regiao}</b>${resultado.distanciaKm ? ` (~${resultado.distanciaKm} km)` : ''}</div>
              <div style="font-size:12px; color:#64748b;">Fonte: <b>${resultado.fonte || 'Tabela local'}</b></div>
              <div style="font-size:12px; color:#64748b;">Atualizado: <b>${new Date().toLocaleDateString('pt-BR')}</b></div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:32px; font-weight:700; color:#b45309;">R$ ${resultado.preco.toFixed(2)}</div>
              <div style="font-size:12px; color:#64748b;">${resultado.moeda}</div>
            </div>
          </div>
          <div style="margin-top:10px; font-size:11px; color:#78350f; background:#fef3c7; padding:8px; border-radius:4px;">
            ℹ️ ${resultado.aviso || 'Cotação aproximada baseada na região mais próxima.'}${resultado.aviso ? '' : ' Consulte a bolsa local para valores exatos.'}
          </div>
        </div>
      `;
    } else {
      document.getElementById("precoResultado").innerHTML = `
        <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:10px; color:#991b1b;">
          <b>Erro:</b> Não foi possível buscar a cotação.
        </div>
      `;
    }
  });

  // Botão sugerir manejo (dropdown)
  document.getElementById("btnSugerirManejo").addEventListener("click", async () => {
    const talhaoId = document.getElementById("selectTalhaoIA").value;
    if (!talhaoId) {
      toast("Selecione", "Escolha um talhão para análise.");
      return;
    }
    await executarAnaliseIA(talhaoId);
  });

  // Botão sugerir manejo (inline na tabela)
  window.__sugerirManejo = async (talhaoId) => {
    document.getElementById("selectTalhaoIA").value = talhaoId;
    await executarAnaliseIA(talhaoId);
    // Scroll até o resultado
    document.getElementById("iaResultado").scrollIntoView({ behavior: 'smooth' });
  };

  async function executarAnaliseIA(talhaoId) {
    if (!isSupabaseReady()) {
      toast("Erro", "Conecte-se à internet e faça login para usar a IA.");
      return;
    }

    const resultado = document.getElementById("iaResultado");
    resultado.innerHTML = '<div style="text-align:center; padding:30px;"><div style="font-size:24px;">🤖</div><div style="margin-top:10px; color:#64748b;">Analisando dados e gerando recomendações...<br>Isso pode levar alguns segundos.</div></div>';

    const resp = await gerarRecomendacaoIA(talhaoId);
    
    if (resp.ok) {
      // Converter markdown simples para HTML com proteção XSS
      // Primeiro escapa o texto bruto, depois aplica formatação segura
      function safeMd(text) {
        // 1. Escapar todo HTML do texto original
        let safe = String(text ?? "")
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        // 2. Aplicar markdown sobre texto já seguro
        safe = safe
          .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.+?)\*/g, '<i>$1</i>')
          .replace(/^### (.+)$/gm, '<h4 style="color:#60a5fa; margin:15px 0 8px;">$1</h4>')
          .replace(/^## (.+)$/gm, '<h3 style="color:#93c5fd; margin:20px 0 10px;">$1</h3>')
          .replace(/^# (.+)$/gm, '<h2 style="color:#bfdbfe; margin:20px 0 10px;">$1</h2>')
          .replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
          .replace(/\n/g, '<br>');
        return safe;
      }
      const html = safeMd(resp.texto);

      resultado.innerHTML = `
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); border-radius:12px; padding:20px; color:white;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#60a5fa;">🤖 Recomendação de Manejo — ${escapeHtml(resp.talhao)} (${escapeHtml(resp.cultura || '-')})</h3>
            <span style="font-size:11px; color:#94a3b8;">${new Date().toLocaleString('pt-BR')}</span>
          </div>
          <div style="line-height:1.8; font-size:14px;">${html}</div>
          <div style="margin-top:15px; padding-top:15px; border-top:1px solid #334155; font-size:11px; color:#94a3b8;">
            ⚠️ Esta é uma recomendação gerada por IA e deve ser validada por um agrônomo responsável. Não substitui a receita agronômica.
          </div>
        </div>
      `;
    } else {
      resultado.innerHTML = `
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:15px; color:#991b1b;">
          <b>Erro:</b> ${escapeHtml(resp.msg)}<br>
          <small>Verifique se a chave da API está correta e se há créditos disponíveis.</small>
        </div>
      `;
    }
  }
}

