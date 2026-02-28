function pageRelatorios() {
  const db = getDB();
  const safra = getSafraAtual();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const aplicacoes = onlySafra(db.aplicacoes);
  const clima = onlySafra(db.clima);
  const combustivel = onlySafra(db.combustivel);
  const colheitas = onlySafra(db.colheitas);
  const produtos = onlySafra(db.produtos);
  const manutencoes = onlySafra(db.manutencoes || []);
  const insumosBase = onlySafra(db.insumosBase || []);
  const maquinas = onlySafra(db.maquinas);
  const params = db.parametros || { 
    precoSoja: 120, 
    precoMilho: 60, 
    precoAlgodao: 150,
    produtividadeMinSoja: 65,
    produtividadeMaxSoja: 75,
    produtividadeMinMilho: 100,
    produtividadeMaxMilho: 130,
    produtividadeMinAlgodao: 250,
    produtividadeMaxAlgodao: 300,
    pesoPadraoSaca: 60
  };

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
    <button class="btn primary" id="btnPrint">🖨️ Imprimir</button>
  `);

  // ==================== CÁLCULOS GERAIS ====================

  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoAplicacoes = aplicacoes.reduce((s, a) => s + Number(a.custoTotal || 0), 0);
  const custoCombustivel = combustivel.reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
  const custoManutencao = manutencoes.reduce((s, m) => s + Number(m.custoTotal || 0), 0);
  const custoInsumosBase = insumosBase.reduce((s, i) => s + Number(i.custoTotal || 0), 0);
  const custoFrete = colheitas.reduce((s, c) => {
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    return s + frete;
  }, 0);
  const custoTotal = custoAplicacoes + custoCombustivel + custoManutencao + custoInsumosBase + custoFrete;
  const custoPorHa = areaTotal > 0 ? custoTotal / areaTotal : 0;

  // Produção e receita real
  // colheitaMap: acumula TODAS as colheitas do talhão (não apenas a última)
  let producaoTotalKg = 0;
  let receitaRealTotal = 0;
  const colheitaMap = new Map(); // talhaoId → { producaoKg, receitaReal }
  colheitas.forEach(c => {
    // Converte sacas → kg para produção total
    const qtKg = c.unidade === 'sc'
      ? Number(c.producaoTotal || 0) * params.pesoPadraoSaca
      : Number(c.producaoTotal || 0);
    producaoTotalKg += qtKg;
    const talhao = talhoes.find(t => t.id === c.talhaoId);
    if (talhao) {
      const cultura = talhao.cultura?.toLowerCase() || '';
      let preco = params.precoSoja;
      if (cultura === 'milho') preco = params.precoMilho;
      if (cultura === 'algodao') preco = params.precoAlgodao;
      const sacas = c.unidade === 'kg' ? Number(c.producaoTotal || 0) / params.pesoPadraoSaca : Number(c.producaoTotal || 0);
      const receitaC = sacas * preco;
      receitaRealTotal += receitaC;
      // Acumular por talhão (suporte a múltiplas colheitas no mesmo talhão)
      const prev = colheitaMap.get(c.talhaoId) || { producaoKg: 0, receitaReal: 0 };
      colheitaMap.set(c.talhaoId, {
        producaoKg: prev.producaoKg + qtKg,
        receitaReal: prev.receitaReal + receitaC
      });
    }
  });

  // Receita estimada total
  const produtividadeMedia = {
    soja: (params.produtividadeMinSoja + params.produtividadeMaxSoja) / 2,
    milho: (params.produtividadeMinMilho + params.produtividadeMaxMilho) / 2,
    algodao: (params.produtividadeMinAlgodao + params.produtividadeMaxAlgodao) / 2
  };
  let receitaEstimadaTotal = 0;
  talhoes.forEach(t => {
    const cultura = t.cultura?.toLowerCase() || '';
    let preco = params.precoSoja;
    let prodMedia = produtividadeMedia.soja;
    if (cultura === 'milho') {
      preco = params.precoMilho;
      prodMedia = produtividadeMedia.milho;
    } else if (cultura === 'algodao') {
      preco = params.precoAlgodao;
      prodMedia = produtividadeMedia.algodao;
    }
    receitaEstimadaTotal += (t.areaHa || 0) * prodMedia * preco;
  });

  const lucroEstimadoTotal = receitaEstimadaTotal - custoTotal;
  const lucroRealTotal = receitaRealTotal - custoTotal;

  // ==================== DADOS CLIMÁTICOS ====================

  const totalChuva = clima.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const diasComChuva = clima.filter(c => c.chuvaMm > 0).length;
  const mediaChuva = clima.length ? totalChuva / clima.length : 0;
  const tempMaxMedia = clima.reduce((s, c) => s + Number(c.tempMax || 0), 0) / (clima.length || 1);
  const tempMinMedia = clima.reduce((s, c) => s + Number(c.tempMin || 0), 0) / (clima.length || 1);

  // ==================== DADOS DE COMBUSTÍVEL ====================

  const _dieselEnt = onlySafra(db.dieselEntradas || []);
  const _totalLitrosEnt = _dieselEnt.reduce((s, e) => s + Number(e.litros || 0), 0);
  const totalDieselComprado = _totalLitrosEnt;
  const totalDieselConsumido = combustivel.reduce((s, c) => s + Number(c.litros || 0), 0);
  const dieselPorHa = areaTotal > 0 ? totalDieselConsumido / areaTotal : 0;
  // Média ponderada do preço do diesel (peso = litros de cada entrada)
  const mediaPrecoDiesel = _totalLitrosEnt > 0
    ? _dieselEnt.reduce((s, e) => s + Number(e.precoLitro || 0) * Number(e.litros || 0), 0) / _totalLitrosEnt
    : 0;

  // ==================== DADOS DE APLICAÇÕES ====================

  const totalAplicacoes = aplicacoes.length;
  const areaTotalAplicada = aplicacoes.reduce((s, a) => s + Number(a.areaHaAplicada || 0), 0);
  const mediaCustoPorAplicacao = totalAplicacoes ? custoAplicacoes / totalAplicacoes : 0;

  // Produtos mais usados
  const usoProdutos = {};
  aplicacoes.forEach(a => {
    (a.produtos || []).forEach(p => {
      usoProdutos[p.produtoNome] = (usoProdutos[p.produtoNome] || 0) + 1;
    });
  });
  const topProdutos = Object.entries(usoProdutos).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ==================== DADOS DE MANUTENÇÃO ====================

  const totalManutencoes = manutencoes.length;
  const manutPreventivas = manutencoes.filter(m => m.tipoManutencao === "Preventiva").length;
  const manutCorretivas = manutencoes.filter(m => m.tipoManutencao === "Corretiva").length;
  const manutPreditivas = manutencoes.filter(m => m.tipoManutencao === "Preditiva").length;
  const manutCustoPorHa = areaTotal > 0 ? custoManutencao / areaTotal : 0;

  // Custo manutenção por máquina
  const custoManutPorMaquina = new Map();
  manutencoes.forEach(m => {
    const atual = custoManutPorMaquina.get(m.maquinaId) || { custo: 0, qtd: 0 };
    atual.custo += Number(m.custoTotal || 0);
    atual.qtd += 1;
    custoManutPorMaquina.set(m.maquinaId, atual);
  });

  // ==================== DADOS DE INSUMOS BASE ====================

  const totalInsumosBase = insumosBase.length;
  const insumoCustoPorHa = areaTotal > 0 ? custoInsumosBase / areaTotal : 0;

  // Custo insumos base por tipo
  const custoInsumoPorTipo = {};
  insumosBase.forEach(i => {
    const tipo = i.tipoInsumo || "Outros";
    custoInsumoPorTipo[tipo] = (custoInsumoPorTipo[tipo] || 0) + Number(i.custoTotal || 0);
  });

  // ==================== DADOS DE FRETE ====================

  const toneladasTotal = colheitas.reduce((s, c) => {
    let ton = 0;
    if (c.frete1) ton += Number(c.frete1.toneladas || 0);
    if (c.frete2) ton += Number(c.frete2.toneladas || 0);
    return s + ton;
  }, 0);
  const fretePorTon = toneladasTotal > 0 ? custoFrete / toneladasTotal : 0;
  const fretePorHa = areaTotal > 0 ? custoFrete / areaTotal : 0;

  // ==================== DADOS POR TALHÃO (DETALHADO) ====================

  const dadosTalhoes = talhoes.map(t => {
    const custoApl = aplicacoes.filter(a => a.talhaoId === t.id).reduce((s, a) => s + Number(a.custoTotal || 0), 0);
    const custoComb = combustivel.filter(c => c.talhaoId === t.id).reduce((s, c) => s + (Number(c.litros || 0) * Number(c.precoLitro || 0)), 0);
    const custoInsumo = insumosBase.filter(i => i.talhaoId === t.id).reduce((s, i) => s + Number(i.custoTotal || 0), 0);
    const custoFreteT = colheitas.filter(c => c.talhaoId === t.id).reduce((s, c) => {
      let f = 0;
      if (c.frete1) f += Number(c.frete1.custoFrete || 0);
      if (c.frete2) f += Number(c.frete2.custoFrete || 0);
      return s + f;
    }, 0);
    // Manutenção: rateio proporcional à área (não é por talhão diretamente)
    const custoManutRateio = areaTotal > 0 ? custoManutencao * (Number(t.areaHa || 0) / areaTotal) : 0;
    const custo = custoApl + custoComb + custoInsumo + custoFreteT + custoManutRateio;
    const colheitaAcum = colheitaMap.get(t.id);
    const producaoKg = colheitaAcum ? colheitaAcum.producaoKg : 0;
    const cultura = t.cultura?.toLowerCase() || '';
    let preco = params.precoSoja;
    let prodMedia = produtividadeMedia.soja;
    if (cultura === 'milho') {
      preco = params.precoMilho;
      prodMedia = produtividadeMedia.milho;
    } else if (cultura === 'algodao') {
      preco = params.precoAlgodao;
      prodMedia = produtividadeMedia.algodao;
    }
    const receitaEstimada = (t.areaHa || 0) * prodMedia * preco;
    const receitaReal = colheitaAcum ? colheitaAcum.receitaReal : 0;
    const lucroReal = receitaReal - custo;

    return {
      talhao: t.nome,
      fazenda: findNameById(fazendas, t.fazendaId),
      cultura: t.cultura || '-',
      area: t.areaHa || 0,
      custo,
      custoApl,
      custoComb,
      custoInsumo,
      custoFreteT,
      custoManutRateio,
      producaoKg,
      receitaEstimada,
      receitaReal,
      lucroReal,
      temColheita: !!colheitaAcum
    };
  }).sort((a, b) => b.custo - a.custo);

  // ==================== DADOS MENSAIS PARA GRÁFICOS ====================

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chuvaPorMes = new Array(12).fill(0);
  const custoPorMes = new Array(12).fill(0);
  const consumoDieselPorMes = new Array(12).fill(0);

  clima.forEach(c => {
    if (c.data) {
      const mes = parseInt(c.data.substring(5, 7)) - 1;
      chuvaPorMes[mes] += Number(c.chuvaMm || 0);
    }
  });

  [...aplicacoes, ...combustivel].forEach(item => {
    if (item.data) {
      const mes = parseInt(item.data.substring(5, 7)) - 1;
      const valor = item.custoTotal || (item.litros * item.precoLitro) || 0;
      custoPorMes[mes] += valor;
      if (item.litros) consumoDieselPorMes[mes] += Number(item.litros);
    }
  });

  const maxChuva = Math.max(...chuvaPorMes, 1);
  const maxCusto = Math.max(...custoPorMes, 1);
  const maxConsumo = Math.max(...consumoDieselPorMes, 1);

  // Comparativo com safras passadas: usa safras reais do banco (não simula dados)
  const todasSafras = (db.safras || []).filter(s => s.id !== getSafraId());
  const safrasPassadas = todasSafras.map(s => {
    const talhoesS = (db.talhoes || []).filter(t => t.safraId === s.id);
    const areaS = talhoesS.reduce((sum, t) => sum + Number(t.areaHa || 0), 0);
    const aplS = (db.aplicacoes || []).filter(a => a.safraId === s.id);
    const cmbS = (db.combustivel || []).filter(c => c.safraId === s.id);
    const manutS = (db.manutencoes || []).filter(m => m.safraId === s.id);
    const insuS = (db.insumosBase || []).filter(i => i.safraId === s.id);
    const colhS = (db.colheitas || []).filter(c => c.safraId === s.id);
    const custoS = aplS.reduce((sum, a) => sum + Number(a.custoTotal || 0), 0)
      + cmbS.reduce((sum, c) => sum + Number(c.litros || 0) * Number(c.precoLitro || 0), 0)
      + manutS.reduce((sum, m) => sum + Number(m.custoTotal || 0), 0)
      + insuS.reduce((sum, i) => sum + Number(i.custoTotal || 0), 0)
      + colhS.reduce((sum, c) => {
          let f = 0;
          if (c.frete1) f += Number(c.frete1.custoFrete || 0);
          if (c.frete2) f += Number(c.frete2.custoFrete || 0);
          return sum + f;
        }, 0);
    const receitaS = colhS.reduce((sum, c) => {
      const t2 = talhoesS.find(t => t.id === c.talhaoId);
      if (!t2) return sum;
      const cult2 = (t2.cultura || '').toLowerCase();
      let pr2 = params.precoSoja;
      if (cult2 === 'milho') pr2 = params.precoMilho;
      if (cult2 === 'algodao') pr2 = params.precoAlgodao;
      const sc2 = c.unidade === 'kg' ? Number(c.producaoTotal || 0) / params.pesoPadraoSaca : Number(c.producaoTotal || 0);
      return sum + sc2 * pr2;
    }, 0);
    return { nome: s.nome || s.id, custo: custoS, receita: receitaS, area: areaS };
  }).filter(s => s.area > 0 || s.custo > 0);

  // ==================== LAYOUT DA PÁGINA ====================

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .relatorio-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .relatorio-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .relatorio-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .relatorio-kpi-valor {
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
      }
      .relatorio-kpi-label {
        color: #475569;
        font-size: 12px;
        margin-top: 5px;
      }
      .destaque-positivo { color: #059669; }
      .destaque-negativo { color: #b91c1c; }
      .grafico-barras {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 150px;
        margin: 15px 0;
      }
      .barra {
        flex: 1;
        background: #3b82f6;
        border-radius: 4px 4px 0 0;
        min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label {
        text-align: center;
        font-size: 10px;
        color: #475569;
        margin-top: 5px;
      }
      .secao-titulo {
        margin: 30px 0 15px;
        font-size: 20px;
        font-weight: 600;
        color: #0f172a;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 5px;
      }
      .composicao-custo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      @media (max-width: 768px) {
        .composicao-custo { grid-template-columns: 1fr; }
      }
    </style>

    <!-- ========== CABEÇALHO ========== -->
    <div style="margin-bottom:20px;">
      <h2>📊 Relatório Completo - ${escapeHtml(safra?.nome || 'Safra Atual')}</h2>
      <p style="color:#475569;">Período: ${safra?.dataInicio || 'N/A'} a ${safra?.dataFim || 'N/A'}</p>
    </div>

    <!-- ========== KPIs PRINCIPAIS ========== -->
    <div class="relatorio-kpi-grid">
      <div class="relatorio-kpi-card">
        <h3>📏 Área Total</h3>
        <div class="relatorio-kpi-valor">${num(areaTotal, 1)} ha</div>
      </div>
      ${canSeeFinanceiro() ? `<div class="relatorio-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoTotal)}</div>
        <div class="relatorio-kpi-label">R$ ${num(custoPorHa, 2)}/ha</div>
      </div>` : ''}
      <div class="relatorio-kpi-card">
        <h3>🌾 Produção Total</h3>
        <div class="relatorio-kpi-valor">${num(producaoTotalKg, 0)} kg</div>
      </div>
      ${canSeeFinanceiro() ? `<div class="relatorio-kpi-card">
        <h3>📊 Receita Total</h3>
        <div class="relatorio-kpi-valor ${receitaRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(receitaRealTotal)}</div>
        <div class="relatorio-kpi-label">vs estimado ${kbrl(lucroEstimadoTotal)}</div>
      </div>` : ''}
    </div>

    ${canSeeFinanceiro() ? `<!-- ========== COMPOSIÇÃO DE CUSTOS ========== -->
    <div class="secao-titulo">💰 Composição de Custos da Safra</div>
    <div class="composicao-custo">` : '<!-- Financeiro oculto --><div style="display:none;">'}
      <div class="card">
        <h4>📊 Custos por Categoria</h4>
        <table style="width:100%;">
          <tr><td><b>Aplicações (defensivos)</b></td><td style="text-align:right">${kbrl(custoAplicacoes)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoAplicacoes/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Insumos Base (adubação)</b></td><td style="text-align:right">${kbrl(custoInsumosBase)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoInsumosBase/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Combustível</b></td><td style="text-align:right">${kbrl(custoCombustivel)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoCombustivel/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Manutenção</b></td><td style="text-align:right">${kbrl(custoManutencao)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoManutencao/custoTotal)*100, 1) : 0}%</td></tr>
          <tr><td><b>Frete</b></td><td style="text-align:right">${kbrl(custoFrete)}</td><td style="text-align:right; color:#64748b;">${custoTotal > 0 ? num((custoFrete/custoTotal)*100, 1) : 0}%</td></tr>
          <tr style="border-top:2px solid #e2e8f0; font-weight:bold;"><td><b>TOTAL</b></td><td style="text-align:right"><b>${kbrl(custoTotal)}</b></td><td style="text-align:right">100%</td></tr>
        </table>
      </div>
      <div class="card">
        <h4>📏 Custos por Hectare</h4>
        <table style="width:100%;">
          <tr><td>Aplicações/ha</td><td style="text-align:right">${kbrl(areaTotal > 0 ? custoAplicacoes/areaTotal : 0)}</td></tr>
          <tr><td>Insumos Base/ha</td><td style="text-align:right">${kbrl(areaTotal > 0 ? custoInsumosBase/areaTotal : 0)}</td></tr>
          <tr><td>Combustível/ha</td><td style="text-align:right">${kbrl(areaTotal > 0 ? custoCombustivel/areaTotal : 0)}</td></tr>
          <tr><td>Manutenção/ha</td><td style="text-align:right">${kbrl(manutCustoPorHa)}</td></tr>
          <tr><td>Frete/ha</td><td style="text-align:right">${kbrl(fretePorHa)}</td></tr>
          <tr style="border-top:2px solid #e2e8f0;"><td><b>TOTAL/ha</b></td><td style="text-align:right"><b>${kbrl(custoPorHa)}</b></td></tr>
        </table>
      </div>
    </div>

    ${canSeeFinanceiro() ? '' : '</div><!-- end hidden block -->'}
    ${canSeeFinanceiro() ? `<!-- ========== COMPARATIVO RECEITA ========== -->
    <div class="card" style="margin-bottom:20px;">
      <h3>📈 Comparativo Receita</h3>` : '<div style="display:none;">'}
      <table style="width:100%;">
        <tr>
          <td><b>Receita estimada:</b></td>
          <td style="text-align:right">${kbrl(receitaEstimadaTotal)}</td>
        </tr>
        <tr>
          <td><b>Receita real:</b></td>
          <td style="text-align:right">${kbrl(receitaRealTotal)}</td>
        </tr>
        <tr>
          <td><b>Custo total (com manutenção + insumos + frete):</b></td>
          <td style="text-align:right">${kbrl(custoTotal)}</td>
        </tr>
        <tr style="border-top:2px solid #e2e8f0;">
          <td><b>Lucro real:</b></td>
          <td style="text-align:right"><b class="${lucroRealTotal >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">${kbrl(lucroRealTotal)}</b></td>
        </tr>
        <tr>
          <td><b>Diferença (real vs estimado):</b></td>
          <td style="text-align:right">
            <span class="${(lucroRealTotal - lucroEstimadoTotal) >= 0 ? 'destaque-positivo' : 'destaque-negativo'}">
              ${kbrl(lucroRealTotal - lucroEstimadoTotal)}
            </span>
          </td>
        </tr>
      </table>
    </div>
    ${canSeeFinanceiro() ? '' : '</div>'}

    <!-- ========== GRÁFICOS MENSAIS ========== -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div class="card">
        <h4>🌧️ Chuva Mensal (mm)</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (chuvaPorMes[i] / maxChuva) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(chuvaPorMes[i], 1)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <h4>⛽ Consumo Diesel Mensal (L)</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (consumoDieselPorMes[i] / maxConsumo) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px; background:#f97316;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(consumoDieselPorMes[i], 0)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- ========== SEÇÃO CLIMA ========== -->
    <div class="secao-titulo">🌤️ Resumo Climático</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🌧️ Total de Chuvas</h3>
        <div class="relatorio-kpi-valor">${num(totalChuva, 1)} mm</div>
        <div class="relatorio-kpi-label">${diasComChuva} dias com chuva</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📊 Média por Registro</h3>
        <div class="relatorio-kpi-valor">${num(mediaChuva, 1)} mm</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>🌡️ Temperatura Média</h3>
        <div class="relatorio-kpi-valor">${num((tempMaxMedia + tempMinMedia) / 2, 1)}°C</div>
        <div class="relatorio-kpi-label">Mín ${num(tempMinMedia,1)}°C / Máx ${num(tempMaxMedia,1)}°C</div>
      </div>
    </div>

    <!-- ========== SEÇÃO COMBUSTÍVEL ========== -->
    <div class="secao-titulo">⛽ Resumo de Combustível</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🛢️ Diesel Comprado</h3>
        <div class="relatorio-kpi-valor">${num(totalDieselComprado, 0)} L</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>🚜 Diesel Consumido</h3>
        <div class="relatorio-kpi-valor">${num(totalDieselConsumido, 0)} L</div>
        <div class="relatorio-kpi-label">${num(dieselPorHa, 1)} L/ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Preço Médio</h3>
        <div class="relatorio-kpi-valor">${kbrl(mediaPrecoDiesel)}/L</div>
      </div>
    </div>

    <!-- ========== SEÇÃO MANUTENÇÃO (NOVO) ========== -->
    <div class="secao-titulo">🔧 Resumo de Manutenção</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🔧 Total Manutenções</h3>
        <div class="relatorio-kpi-valor">${totalManutencoes}</div>
        <div class="relatorio-kpi-label">P: ${manutPreventivas} | C: ${manutCorretivas} | Pd: ${manutPreditivas}</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoManutencao)}</div>
        <div class="relatorio-kpi-label">${kbrl(manutCustoPorHa)}/ha</div>
      </div>
    </div>
    ${maquinas.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h4>🚜 Custo de Manutenção por Máquina</h4>
      <table style="width:100%;">
        <thead><tr><th>Máquina</th><th>Manutenções</th><th>Custo Total</th></tr></thead>
        <tbody>
          ${maquinas.map(maq => {
            const info = custoManutPorMaquina.get(maq.id) || { custo: 0, qtd: 0 };
            return `<tr><td><b>${escapeHtml(maq.nome)}</b></td><td>${info.qtd}</td><td>${kbrl(info.custo)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ========== SEÇÃO INSUMOS BASE (NOVO) ========== -->
    <div class="secao-titulo">🌱 Resumo de Insumos Base</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🌱 Total Lançamentos</h3>
        <div class="relatorio-kpi-valor">${totalInsumosBase}</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Total</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoInsumosBase)}</div>
        <div class="relatorio-kpi-label">${kbrl(insumoCustoPorHa)}/ha</div>
      </div>
    </div>
    ${Object.keys(custoInsumoPorTipo).length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h4>📊 Custo por Tipo de Insumo</h4>
      <table style="width:100%;">
        <thead><tr><th>Tipo</th><th>Custo Total</th><th>%</th></tr></thead>
        <tbody>
          ${Object.entries(custoInsumoPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, custo]) => `
            <tr><td><b>${escapeHtml(tipo)}</b></td><td>${kbrl(custo)}</td><td>${custoInsumosBase > 0 ? num((custo/custoInsumosBase)*100, 1) : 0}%</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ========== SEÇÃO FRETE (NOVO) ========== -->
    <div class="secao-titulo">🚛 Resumo de Frete</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>🚛 Custo Total Frete</h3>
        <div class="relatorio-kpi-valor">${kbrl(custoFrete)}</div>
        <div class="relatorio-kpi-label">${kbrl(fretePorHa)}/ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📦 Total Entregue</h3>
        <div class="relatorio-kpi-valor">${num(toneladasTotal, 2)} ton</div>
        <div class="relatorio-kpi-label">${kbrl(fretePorTon)}/ton</div>
      </div>
    </div>

    <!-- ========== SEÇÃO APLICAÇÕES ========== -->
    <div class="secao-titulo">🧪 Resumo de Aplicações</div>
    <div class="relatorio-kpi-grid" style="margin-bottom:20px;">
      <div class="relatorio-kpi-card">
        <h3>📋 Total de Aplicações</h3>
        <div class="relatorio-kpi-valor">${totalAplicacoes}</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>📏 Área Total Aplicada</h3>
        <div class="relatorio-kpi-valor">${num(areaTotalAplicada, 1)} ha</div>
      </div>
      <div class="relatorio-kpi-card">
        <h3>💰 Custo Médio/Aplicação</h3>
        <div class="relatorio-kpi-valor">${kbrl(mediaCustoPorAplicacao)}</div>
      </div>
    </div>

    <!-- Top 5 produtos mais usados -->
    ${topProdutos.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h4>🧪 Top 5 Produtos Mais Utilizados</h4>
      <table style="width:100%;">
        <thead>
          <tr><th>Produto</th><th>Vezes</th><th>%</th></tr>
        </thead>
        <tbody>
          ${topProdutos.map(([nome, qtd]) => `
            <tr>
              <td><b>${escapeHtml(nome)}</b></td>
              <td>${qtd}</td>
              <td>${((qtd / totalAplicacoes) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ========== DETALHAMENTO POR TALHÃO ========== -->
    <div class="secao-titulo">🌱 Detalhamento por Talhão (Custo Completo)</div>
    <div class="tableWrap" style="margin-bottom:30px;">
      <table>
        <thead>
          <tr>
            <th>Talhão</th>
            <th>Fazenda</th>
            <th>Cultura</th>
            <th>Área (ha)</th>
            <th>Apl.</th>
            <th>Insumos</th>
            <th>Comb.</th>
            <th>Manut.</th>
            <th>Frete</th>
            <th>Custo Total</th>
            <th>Prod. (kg)</th>
            <th>Rec. Est.</th>
            <th>Rec. Real</th>
            <th>Receita Líquida</th>
          </tr>
        </thead>
        <tbody>
          ${dadosTalhoes.map(d => {
            const lucroClass = d.lucroReal >= 0 ? 'destaque-positivo' : 'destaque-negativo';
            return `<tr>
              <td><b>${escapeHtml(d.talhao)}</b></td>
              <td>${escapeHtml(d.fazenda)}</td>
              <td>${escapeHtml(d.cultura)}</td>
              <td>${num(d.area, 1)}</td>
              <td>${kbrl(d.custoApl)}</td>
              <td>${kbrl(d.custoInsumo)}</td>
              <td>${kbrl(d.custoComb)}</td>
              <td>${kbrl(d.custoManutRateio)}</td>
              <td>${kbrl(d.custoFreteT)}</td>
              <td><b>${kbrl(d.custo)}</b></td>
              <td>${d.temColheita ? num(d.producaoKg, 0) : '-'}</td>
              <td>${kbrl(d.receitaEstimada)}</td>
              <td>${d.temColheita ? kbrl(d.receitaReal) : '-'}</td>
              <td class="${lucroClass}">${d.temColheita ? kbrl(d.lucroReal) : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- ========== COMPARATIVO COM SAFRAS PASSADAS ========== -->
    <div class="secao-titulo">📈 Comparativo com Safras Anteriores</div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Safra</th>
            <th>Área (ha)</th>
            <th>Custo Total</th>
            <th>Receita</th>
            <th>Lucro</th>
            <th>Variação (custo/ha)</th>
          </tr>
        </thead>
        <tbody>
          ${safrasPassadas.map(s => {
            const custoHaPassado = s.area > 0 ? s.custo / s.area : 0;
            const variacao = custoHaPassado > 0 ? ((custoPorHa - custoHaPassado) / custoHaPassado) * 100 : 0;
            return `<tr>
              <td><b>${s.nome}</b></td>
              <td>${num(s.area, 0)} ha</td>
              <td>${kbrl(s.custo)}</td>
              <td>${kbrl(s.receita)}</td>
              <td>${kbrl(s.receita - s.custo)}</td>
              <td><span class="${variacao > 0 ? 'destaque-negativo' : 'destaque-positivo'}">${variacao > 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(1)}%</span></td>
            </tr>`;
          }).join('')}
          <tr style="border-top:2px solid #e2e8f0;">
            <td><b>${safra?.nome || 'Atual'}</b></td>
            <td>${num(areaTotal, 0)} ha</td>
            <td>${kbrl(custoTotal)}</td>
            <td>${kbrl(receitaRealTotal)}</td>
            <td>${kbrl(lucroRealTotal)}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // ==================== EXPORTAÇÃO E IMPRESSÃO ====================

  document.getElementById("btnPrint").addEventListener("click", () => window.print());

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = dadosTalhoes.map(d => ({
      Talhão: d.talhao,
      Fazenda: d.fazenda,
      Cultura: d.cultura,
      Área_ha: d.area,
      Custo_Aplicações_R$: d.custoApl,
      Custo_Insumos_Base_R$: d.custoInsumo,
      Custo_Combustível_R$: d.custoComb,
      Custo_Manutenção_R$: d.custoManutRateio,
      Custo_Frete_R$: d.custoFreteT,
      Custo_Total_R$: d.custo,
      Produção_kg: d.producaoKg,
      Receita_Estimada_R$: d.receitaEstimada,
      Receita_Real_R$: d.receitaReal,
      Lucro_Real_R$: d.lucroReal
    }));
    downloadText(`relatorio-completo-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado.");
  });
}




// ============================================================================
// NOVA PÁGINA: MANUTENÇÃO DE MÁQUINAS
// ============================================================================

