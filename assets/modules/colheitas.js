// ============================================================================
// PÁGINA COLHEITAS — PREMIUM v3.0
// Produção, Classificação Silo, Descontos, Frete Duplo, Dados de Caminhão
// Novos campos v9.7: umidade padrão, impureza, ardidos, esverdeados,
//   quebrados, CPO, taxa armazenagem, peso líquido estimado
// ============================================================================

function pageColheitas() {
  const db       = getDB();
  let talhoes    = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas  = onlySafra(db.fazendas);
  const maquinas  = onlySafra(db.maquinas);
  const colheitas = onlySafra(db.colheitas || []).sort((a, b) => (b.dataColheita || '').localeCompare(a.dataColheita || ''));

  setTopActions(`
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
    <button class="btn" id="btnExportRelatorio" style="background:var(--brand,#2e7d32);color:white;">📄 Relatório</button>
  `);

  // ── Parâmetros ────────────────────────────────────────────────────────────
  const params      = db.parametros || {};
  const pesoPadrao  = Number(params.pesoPadraoSaca || 60);

  // ── KPIs globais ──────────────────────────────────────────────────────────
  const producaoTotalKg = colheitas.reduce((s, c) => {
    const qt = Number(c.producaoTotal || 0);
    return s + (c.unidade === 'sc' ? qt * pesoPadrao : qt);
  }, 0);

  const custoFreteTotal = colheitas.reduce((s, c) => {
    let f = 0;
    (c.fretes || []).forEach(fr => { f += Number(fr.custoFrete || 0); });
    // legado frete1/frete2
    if (c.frete1) f += Number(c.frete1.custoFrete || 0);
    if (c.frete2) f += Number(c.frete2.custoFrete || 0);
    return s + f;
  }, 0);

  const toneladasEntregues = colheitas.reduce((s, c) => {
    let t = 0;
    (c.fretes || []).forEach(fr => { t += Number(fr.toneladas || 0); });
    if (c.frete1) t += Number(c.frete1.toneladas || 0);
    if (c.frete2) t += Number(c.frete2.toneladas || 0);
    return s + t;
  }, 0);

  const totalTon         = toneladasEntregues > 0 ? toneladasEntregues : producaoTotalKg / 1000;
  const custoFretePorTon = totalTon > 0 ? custoFreteTotal / totalTon : 0;
  const totalViagens     = colheitas.reduce((s, c) => s + ((c.fretes || []).length + (c.frete1 ? 1 : 0) + (c.frete2 ? 1 : 0)), 0);
  const mediaUmidade     = colheitas.filter(c => c.umidade).length > 0
    ? (colheitas.reduce((s, c) => s + Number(c.umidade || 0), 0) / colheitas.filter(c => c.umidade).length).toFixed(1)
    : '-';

  // Peso líquido total (após descontos silo)
  const pesoLiquidoTotalKg = colheitas.reduce((s, c) => s + Number(c.pesoLiquidoEstimado || 0), 0);

  // Custo frete por talhão
  const fretePorTalhao = new Map();
  colheitas.forEach(c => {
    let frete = 0;
    (c.fretes || []).forEach(fr => { frete += Number(fr.custoFrete || 0); });
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    fretePorTalhao.set(c.talhaoId, (fretePorTalhao.get(c.talhaoId) || 0) + frete);
  });

  const content = document.getElementById('content');

  content.innerHTML = `
  <style>
    /* ── Premium Harvest Page Styles ── */
    .ch-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .ch-kpi-card {
      background: var(--card-bg, #fff);
      border-radius: 14px;
      padding: 18px 16px;
      border: 1px solid var(--border, #e2e8f0);
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      position: relative;
      overflow: hidden;
    }
    .ch-kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: var(--kpi-color, #f59e0b);
    }
    .ch-kpi-icon  { font-size: 26px; margin-bottom: 6px; }
    .ch-kpi-val   { font-size: 26px; font-weight: 800; color: var(--text, #0f172a); line-height: 1.1; }
    .ch-kpi-sub   { font-size: 11px; color: var(--text-muted, #64748b); margin-top: 4px; }
    .ch-kpi-label { font-size: 12px; font-weight: 600; color: var(--text-muted, #475569); margin-bottom: 2px; text-transform: uppercase; letter-spacing: .4px; }

    /* ── Form card ── */
    .ch-form-card {
      background: var(--card-bg, #fff);
      border-radius: 14px;
      border: 1px solid var(--border, #e2e8f0);
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .ch-form-header {
      background: linear-gradient(135deg, #1e3a5f, #2d6a4f);
      color: white;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ch-form-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .ch-form-header p  { margin: 2px 0 0; font-size: 12px; opacity: .75; }
    .ch-form-body { padding: 22px; }

    /* ── Section headers inside form ── */
    .ch-section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: var(--text-muted, #475569);
      border-bottom: 2px solid var(--border, #e2e8f0);
      padding-bottom: 6px;
      margin: 18px 0 12px;
    }

    /* ── Machine rows ── */
    .ch-maquina-linha {
      display: grid;
      grid-template-columns: 2fr 1fr auto;
      gap: 10px;
      margin-bottom: 8px;
      align-items: center;
    }

    /* ── Frete premium ── */
    .ch-frete-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    @media (max-width: 700px) { .ch-frete-grid { grid-template-columns: 1fr; } }

    .ch-frete-box {
      background: var(--bg, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      overflow: hidden;
    }
    .ch-frete-box-header {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ch-frete-box-header.f1 { background: linear-gradient(135deg,#1d4ed8,#2563eb); color:white; }
    .ch-frete-box-header.f2 { background: linear-gradient(135deg,#7c3aed,#8b5cf6); color:white; }
    .ch-frete-box-body { padding: 14px; display: grid; gap: 8px; }
    .ch-frete-cost {
      background: white;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border, #e2e8f0);
      margin-top: 6px;
    }
    .ch-frete-cost .val { font-size: 18px; font-weight: 800; color: #1d4ed8; }
    .ch-frete-cost.f2 .val { color: #7c3aed; }

    /* ── Frete total bar ── */
    .ch-frete-total {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      border-radius: 12px;
      padding: 18px 22px;
      margin-top: 16px;
      color: white;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: space-between;
      align-items: center;
    }
    .ch-frete-total .big { font-size: 28px; font-weight: 900; color: #fbbf24; }
    .ch-frete-total .lbl { font-size: 11px; opacity: .65; text-transform: uppercase; letter-spacing: .5px; }
    .ch-frete-total .detail { font-size: 12px; opacity: .8; margin-top: 4px; }

    /* ── Truck badge ── */
    .truck-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
    }

    /* ── Table premium ── */
    .ch-table-card {
      background: var(--card-bg, #fff);
      border-radius: 14px;
      border: 1px solid var(--border, #e2e8f0);
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      overflow: hidden;
      margin-bottom: 24px;
    }
    .ch-table-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, #e2e8f0);
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg, #f8fafc);
    }
    .ch-table-header h3 { margin: 0; font-size: 15px; }
    .ch-tag {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    /* ── Frete summary table ── */
    .ch-frete-summary-card {
      background: var(--card-bg, #fff);
      border-radius: 14px;
      border: 1px solid var(--border, #e2e8f0);
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      overflow: hidden;
      margin-bottom: 24px;
    }
    .maquina-linha { display: grid; grid-template-columns: 2fr 1fr 0.5fr; gap: 10px; margin-bottom: 8px; align-items: center; }
    .btn-remove { background:#ef4444; color:white; border:none; border-radius:6px; padding:8px 12px; cursor:pointer; font-size:13px; }
    .colheita-form { background:var(--card-bg,#fff); border-radius:var(--radius); padding:20px; margin-bottom:30px; border:1px solid #e2e8f0; }
  </style>

  <!-- ══════════ KPIs ══════════ -->
  <div class="ch-kpi-grid">
    <div class="ch-kpi-card" style="--kpi-color:#16a34a;">
      <div class="ch-kpi-icon">🌾</div>
      <div class="ch-kpi-label">Produção Total</div>
      <div class="ch-kpi-val">${num(producaoTotalKg / 1000, 2)} t</div>
      <div class="ch-kpi-sub">${num(producaoTotalKg, 0)} kg colhidos</div>
    </div>
    <div class="ch-kpi-card" style="--kpi-color:#f59e0b;">
      <div class="ch-kpi-icon">📋</div>
      <div class="ch-kpi-label">Colheitas</div>
      <div class="ch-kpi-val">${colheitas.length}</div>
      <div class="ch-kpi-sub">${talhoes.length} talhões</div>
    </div>
    <div class="ch-kpi-card" style="--kpi-color:#3b82f6;">
      <div class="ch-kpi-icon">🚛</div>
      <div class="ch-kpi-label">Custo Total Frete</div>
      <div class="ch-kpi-val">${kbrl(custoFreteTotal)}</div>
      <div class="ch-kpi-sub">${kbrl(custoFretePorTon)}/ton | ${totalViagens} viagens</div>
    </div>
    <div class="ch-kpi-card" style="--kpi-color:#8b5cf6;">
      <div class="ch-kpi-icon">🏢</div>
      <div class="ch-kpi-label">Entregue</div>
      <div class="ch-kpi-val">${num(totalTon, 2)} t</div>
      <div class="ch-kpi-sub">em ${colheitas.filter(c => (c.fretes||[]).length > 0 || c.frete1 || c.frete2).length} colheitas</div>
    </div>
    <div class="ch-kpi-card" style="--kpi-color:#ec4899;">
      <div class="ch-kpi-icon">💧</div>
      <div class="ch-kpi-label">Umidade Média</div>
      <div class="ch-kpi-val">${mediaUmidade}${mediaUmidade !== '-' ? '%' : ''}</div>
      <div class="ch-kpi-sub">na colheita</div>
    </div>
    <div class="ch-kpi-card" style="--kpi-color:#16a34a;">
      <div class="ch-kpi-icon">⚖️</div>
      <div class="ch-kpi-label">Peso Líquido Total</div>
      <div class="ch-kpi-val">${pesoLiquidoTotalKg > 0 ? num(pesoLiquidoTotalKg / 1000, 2) + ' t' : '—'}</div>
      <div class="ch-kpi-sub">após descontos silo</div>
    </div>
  </div>

  <!-- ══════════ FORMULÁRIO DE COLHEITA ══════════ -->
  <div class="ch-form-card">
    <div class="ch-form-header">
      <div style="font-size:28px;">🌾</div>
      <div>
        <h3>Registrar Nova Colheita</h3>
        <p>Preencha produção, umidade, máquinas utilizadas e dados de transporte</p>
      </div>
    </div>
    <div class="ch-form-body">
      <form id="frmColheita" class="formGrid">

        <!-- ── Dados básicos ── -->
        <div class="ch-section-title full">📋 Dados da Colheita</div>

        <div><small>📅 Data da Colheita *</small><input class="input" name="dataColheita" type="date" value="${nowISO()}" required></div>
        <div><small>🧭 Talhão *</small>
          <select class="select" name="talhaoId" required>
            <option value="">Selecione...</option>
            ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)} (${t.cultura || 'Sem cultura'}) — ${num(t.areaHa,1)} ha</option>`).join('')}
          </select>
        </div>
        <div><small>📦 Produção Total *</small><input class="input" name="producaoTotal" type="number" step="0.01" required placeholder="Quantidade colhida"></div>
        <div><small>📏 Unidade *</small>
          <select class="select" name="unidade">
            <option value="kg">kg</option>
            <option value="sc">sacas (60kg)</option>
            <option value="t">toneladas</option>
          </select>
        </div>
        <div><small>💧 Umidade (%)</small><input class="input" name="umidade" type="number" step="0.1" min="0" max="100" placeholder="Ex: 13.5" oninput="window.__calcularDescontosSilo()"></div>
        <div><small>🌡 Temperatura (°C)</small><input class="input" name="temperatura" type="number" step="0.1" placeholder="Temperatura na colheita"></div>
        <div><small>📄 Nº Romaneio / NF</small><input class="input" name="romaneio" placeholder="Ex: ROM-001 ou NF-12345"></div>
        <div><small>📝 Observações</small><input class="input" name="obs" placeholder="Condições da lavoura, notas gerais..."></div>

        <!-- ── Classificação / Descontos no Silo ── -->
        <div class="ch-section-title full">🏭 Classificação e Descontos no Silo</div>
        <div style="grid-column:1/-1; background:#fefce8; border:1px solid #fde68a; border-radius:10px; padding:12px 16px; font-size:12px; color:#78350f; margin-bottom:4px;">
          💡 <b>Descontos de recebimento</b> aplicados pelo armazém/silo. O sistema calcula o peso líquido após os descontos e o impacto financeiro estimado.
        </div>
        <div>
          <small>💧 Umidade Padrão (%)</small>
          <input class="input" name="umidadePadrao" type="number" step="0.1" min="0" max="30" placeholder="Ex: 13.0 (padrão soja)" value="13.0" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>🌾 Impureza / Matéria Estranha (%)</small>
          <input class="input" name="impureza" type="number" step="0.01" min="0" max="20" placeholder="Ex: 1.0" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>🔥 Ardidos / Queimados (%)</small>
          <input class="input" name="ardidos" type="number" step="0.01" min="0" max="10" placeholder="Ex: 0.5" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>🌿 Esverdeados / Imaturos (%)</small>
          <input class="input" name="esverdeados" type="number" step="0.01" min="0" max="20" placeholder="Ex: 2.0" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>💔 Quebrados / Avariados (%)</small>
          <input class="input" name="quebrados" type="number" step="0.01" min="0" max="20" placeholder="Ex: 3.0" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>🫙 CPO / Óleo / Grão Duro (%)</small>
          <input class="input" name="cpo" type="number" step="0.01" min="0" max="10" placeholder="Ex: 0.5" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>💰 Preço base (R$/saca 60kg)</small>
          <input class="input" name="precoBaseSaca" type="number" step="0.01" min="0" placeholder="Ex: 120.00" oninput="window.__calcularDescontosSilo()">
        </div>
        <div>
          <small>🏦 Taxa Armazenagem (%/mês)</small>
          <input class="input" name="taxaArmazenagem" type="number" step="0.01" min="0" max="5" placeholder="Ex: 0.35" oninput="window.__calcularDescontosSilo()">
        </div>

        <!-- Painel de resultado dos descontos -->
        <div class="full" id="siloDescontoResultado" style="display:none;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2d6a4f); border-radius:12px; padding:16px 20px; color:white;">
            <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; opacity:.8; margin-bottom:12px;">📊 Resultado da Classificação</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px;">
              <div><div style="font-size:11px;opacity:.7;">Desc. Umidade</div><div id="siloDescUmidade" style="font-size:18px;font-weight:800;color:#fbbf24;">—</div></div>
              <div><div style="font-size:11px;opacity:.7;">Desc. Impurezas</div><div id="siloDescImpureza" style="font-size:18px;font-weight:800;color:#fb923c;">—</div></div>
              <div><div style="font-size:11px;opacity:.7;">Desc. Avarias</div><div id="siloDescAvaria" style="font-size:18px;font-weight:800;color:#f87171;">—</div></div>
              <div><div style="font-size:11px;opacity:.7;">Peso Bruto</div><div id="siloPesoBruto" style="font-size:18px;font-weight:800;color:#86efac;">—</div></div>
              <div><div style="font-size:11px;opacity:.7;">Peso Líquido</div><div id="siloPesoLiquido" style="font-size:18px;font-weight:800;color:#4ade80;">—</div></div>
              <div><div style="font-size:11px;opacity:.7;">Perda Financeira</div><div id="siloPerdaFinanceira" style="font-size:18px;font-weight:800;color:#fca5a5;">—</div></div>
            </div>
          </div>
        </div>

        <!-- ── Máquinas ── -->
        <div class="full">
          <div class="ch-section-title">🚜 Máquinas Utilizadas</div>
          <div id="maquinas-container">
            <div class="maquina-linha">
              <select class="select" name="maquinaId[]">
                <option value="">— Máquina (opcional) —</option>
                ${maquinas.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('')}
              </select>
              <input class="input" name="horas[]" type="number" step="0.5" placeholder="Horas trabalhadas">
              <button type="button" class="btn-remove" onclick="window.__removerMaquina(this)" title="Remover">✕</button>
            </div>
          </div>
          <button type="button" class="btn" id="btnAdicionarMaquina" style="margin-top:8px; font-size:12px;">+ Adicionar máquina</button>
        </div>

        <!-- ════════ SEÇÃO DE FRETE / TRANSPORTE ════════ -->
        <div class="full">
          <div class="ch-section-title">🚛 Transporte e Frete</div>
          <p style="font-size:12px; color:var(--text-muted,#64748b); margin:0 0 12px;">
            Registre até 2 destinos (armazéns) com dados completos do caminhão, motorista e nota fiscal de transporte.
          </p>

          <div class="ch-frete-grid">
            <!-- ── FRETE 1 ── -->
            <div class="ch-frete-box">
              <div class="ch-frete-box-header f1">🚛 Frete 1 — Destino Principal</div>
              <div class="ch-frete-box-body">
                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#1d4ed8;">🏢 Armazém / Destino</small>
                <input class="input" name="frete1_armazem" placeholder="Ex: Armazém Cargill Sorriso">
                <input class="input" name="frete1_cidade" placeholder="📍 Cidade — Ex: Sorriso - MT">

                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#1d4ed8; margin-top:6px; display:block;">🚛 Dados do Caminhão</small>
                <input class="input" name="frete1_placa" placeholder="🚛 Placa do Caminhão — Ex: ABC-1234">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <input class="input" name="frete1_tipo_caminhao" placeholder="Tipo — Ex: Bitrem, Carreta">
                  <input class="input" name="frete1_capacidade" type="number" step="0.1" placeholder="Capacidade (ton)">
                </div>
                <input class="input" name="frete1_motorista" placeholder="👤 Nome do Motorista">
                <input class="input" name="frete1_cnh" placeholder="🪪 CNH do Motorista">

                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#1d4ed8; margin-top:6px; display:block;">🏢 Transportadora</small>
                <input class="input" name="frete1_transportadora" placeholder="Razão social ou nome">
                <input class="input" name="frete1_cnpj_transp" placeholder="CNPJ (opcional)">

                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#1d4ed8; margin-top:6px; display:block;">💰 Valores e NF</small>
                <input class="input" name="frete1_nf_transp" placeholder="📄 Nº NF de Transporte">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <div>
                    <small>Toneladas entregues</small>
                    <input class="input" name="frete1_toneladas" type="number" step="0.01" placeholder="0.00" oninput="window.__calcularFretes()">
                  </div>
                  <div>
                    <small>Preço/ton (R$)</small>
                    <input class="input" name="frete1_precoTon" type="number" step="0.01" placeholder="0.00" oninput="window.__calcularFretes()">
                  </div>
                </div>
                <input class="input" name="frete1_distancia" type="number" step="1" placeholder="📏 Distância (km)">
                <input class="input" name="frete1_data_entrega" type="date" title="Data da entrega no armazém">
                <div class="ch-frete-cost">
                  <div>
                    <div style="font-size:11px; color:var(--text-muted,#64748b); font-weight:600;">CUSTO FRETE 1</div>
                    <div class="val" id="custoFrete1">R$ 0,00</div>
                  </div>
                  <div style="font-size:22px;">🚛</div>
                </div>
              </div>
            </div>

            <!-- ── FRETE 2 ── -->
            <div class="ch-frete-box">
              <div class="ch-frete-box-header f2">🚚 Frete 2 — Destino Secundário</div>
              <div class="ch-frete-box-body">
                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#7c3aed;">🏢 Armazém / Destino</small>
                <input class="input" name="frete2_armazem" placeholder="Ex: Armazém Bunge Lucas">
                <input class="input" name="frete2_cidade" placeholder="📍 Cidade — Ex: Lucas do Rio Verde - MT">

                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#7c3aed; margin-top:6px; display:block;">🚚 Dados do Caminhão</small>
                <input class="input" name="frete2_placa" placeholder="🚚 Placa do Caminhão — Ex: XYZ-5678">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <input class="input" name="frete2_tipo_caminhao" placeholder="Tipo — Ex: Graneleiro, Truck">
                  <input class="input" name="frete2_capacidade" type="number" step="0.1" placeholder="Capacidade (ton)">
                </div>
                <input class="input" name="frete2_motorista" placeholder="👤 Nome do Motorista">
                <input class="input" name="frete2_cnh" placeholder="🪪 CNH do Motorista">

                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#7c3aed; margin-top:6px; display:block;">🏢 Transportadora</small>
                <input class="input" name="frete2_transportadora" placeholder="Razão social ou nome">
                <input class="input" name="frete2_cnpj_transp" placeholder="CNPJ (opcional)">

                <small style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#7c3aed; margin-top:6px; display:block;">💰 Valores e NF</small>
                <input class="input" name="frete2_nf_transp" placeholder="📄 Nº NF de Transporte">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <div>
                    <small>Toneladas entregues</small>
                    <input class="input" name="frete2_toneladas" type="number" step="0.01" placeholder="0.00" oninput="window.__calcularFretes()">
                  </div>
                  <div>
                    <small>Preço/ton (R$)</small>
                    <input class="input" name="frete2_precoTon" type="number" step="0.01" placeholder="0.00" oninput="window.__calcularFretes()">
                  </div>
                </div>
                <input class="input" name="frete2_distancia" type="number" step="1" placeholder="📏 Distância (km)">
                <input class="input" name="frete2_data_entrega" type="date" title="Data da entrega no armazém">
                <div class="ch-frete-cost f2">
                  <div>
                    <div style="font-size:11px; color:var(--text-muted,#64748b); font-weight:600;">CUSTO FRETE 2</div>
                    <div class="val" id="custoFrete2">R$ 0,00</div>
                  </div>
                  <div style="font-size:22px;">🚚</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── TOTAL FRETE ── -->
          <div class="ch-frete-total">
            <div>
              <div class="lbl">Custo Total de Frete</div>
              <div class="big" id="custoFreteTotalForm">R$ 0,00</div>
              <div class="detail" id="detalheFretes">Preencha os dados de frete acima</div>
            </div>
            <div style="text-align:right;">
              <div class="lbl">Total Entregue</div>
              <div class="big" id="totalEntregueForm" style="color:#86efac;">0,00 t</div>
              <div class="detail" id="detalheViagens">—</div>
            </div>
          </div>
        </div>

        <!-- ── Submit ── -->
        <div class="full row" style="justify-content:flex-end; margin-top:16px; gap:10px;">
          <button type="reset" class="btn" style="font-size:14px;">🔄 Limpar</button>
          <button class="btn primary" type="submit" style="font-size:15px; padding:12px 28px; background:var(--brand,#2e7d32); color:white; font-weight:700;">
            ✅ Salvar Colheita
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ══════════ RESUMO FRETES POR TALHÃO ══════════ -->
  <div class="ch-frete-summary-card">
    <div class="ch-table-header">
      <span style="font-size:20px;">🗺️</span>
      <h3>Custo de Frete por Talhão</h3>
      <span class="ch-tag">${talhoes.length} talhões</span>
    </div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Talhão</th>
            <th>Fazenda</th>
            <th>Cultura</th>
            <th>Área (ha)</th>
            <th>Prod. Total</th>
            <th>Custo Frete</th>
            <th>Frete / ha</th>
            <th>Frete / ton</th>
          </tr>
        </thead>
        <tbody>
          ${talhoes.map(t => {
            const frete = fretePorTalhao.get(t.id) || 0;
            const area  = Number(t.areaHa || 0);
            const colhsT = colheitas.filter(c => c.talhaoId === t.id);
            const prodKg = colhsT.reduce((s, c) => {
              const q = Number(c.producaoTotal || 0);
              return s + (c.unidade === 'sc' ? q * pesoPadrao : c.unidade === 't' ? q * 1000 : q);
            }, 0);
            const ton = prodKg / 1000;
            return `<tr>
              <td><b>${escapeHtml(t.nome)}</b></td>
              <td>${escapeHtml(findNameById(fazendas, t.fazendaId))}</td>
              <td>${escapeHtml(t.cultura || '—')}</td>
              <td>${num(area, 1)}</td>
              <td>${num(ton, 2)} t</td>
              <td><b>${kbrl(frete)}</b></td>
              <td>${area > 0 ? kbrl(frete / area) : '—'}</td>
              <td>${ton > 0 ? kbrl(frete / ton) : '—'}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;">Nenhum talhão cadastrado</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══════════ TABELA DE COLHEITAS ══════════ -->
  <div class="ch-table-card">
    <div class="ch-table-header">
      <span style="font-size:20px;">📋</span>
      <h3>Colheitas Registradas</h3>
      <span class="ch-tag">${colheitas.length} registros</span>
    </div>
    <div class="tableWrap">
      <table id="tabelaColheitas">
        <thead>
          <tr>
            <th>Data</th>
            <th>Talhão</th>
            <th>Produção</th>
            <th>Umidade</th>
            <th>Classif./Romaneio</th>
            <th>Frete 1</th>
            <th>Frete 2</th>
            <th>Custo Frete</th>
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbodyColheitas"></tbody>
      </table>
    </div>
  </div>
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULO DESCONTOS SILO (tempo real)
  // ═══════════════════════════════════════════════════════════════════════════
  window.__calcularDescontosSilo = () => {
    const gn = name => { const el = document.querySelector(`[name="${name}"]`); return el ? Number(el.value) || 0 : 0; };
    const producao     = gn('producaoTotal');
    const unidade      = (() => { const el = document.querySelector('select[name="unidade"]'); return el ? el.value : 'kg'; })();
    const pesoPadrao   = 60;

    // Convert to kg
    let pesoBrutoKg = producao;
    if (unidade === 'sc')  pesoBrutoKg = producao * pesoPadrao;
    if (unidade === 't')   pesoBrutoKg = producao * 1000;

    if (pesoBrutoKg <= 0) { document.getElementById('siloDescontoResultado').style.display = 'none'; return; }

    const umidade        = gn('umidade');
    const umidadePadrao  = gn('umidadePadrao') || 13.0;
    const impureza       = gn('impureza');
    const ardidos        = gn('ardidos');
    const esverdeados    = gn('esverdeados');
    const quebrados      = gn('quebrados');
    const cpo            = gn('cpo');
    const precoSaca      = gn('precoBaseSaca');

    // Desconto umidade (fórmula padrão: (umidade - padrao) / (100 - padrao) × peso)
    const descUmidadePct  = umidade > umidadePadrao ? (umidade - umidadePadrao) / (100 - umidadePadrao) : 0;
    const descUmidadeKg   = pesoBrutoKg * descUmidadePct;

    // Desconto impurezas (direto no peso bruto)
    const descImpurezaKg  = pesoBrutoKg * (impureza / 100);

    // Desconto avarias (ardidos + esverdeados + quebrados + CPO) — taxa reduzida padrão MAPA: 50% do %
    const pctAvaria       = Math.min((ardidos + esverdeados + quebrados + cpo), 100);
    const descAvariaKg    = pesoBrutoKg * (pctAvaria / 100) * 0.5;

    const totalDescKg     = descUmidadeKg + descImpurezaKg + descAvariaKg;
    const pesoLiquidoKg   = Math.max(pesoBrutoKg - totalDescKg, 0);

    // Perda financeira
    const perdaKg         = pesoBrutoKg - pesoLiquidoKg;
    const perdaSacas      = perdaKg / pesoPadrao;
    const perdaFinanceira = precoSaca > 0 ? perdaSacas * precoSaca : 0;

    const fmt = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const fmtKg = v => (v / 1000).toFixed(2) + ' t';

    document.getElementById('siloDescontoResultado').style.display = 'block';
    document.getElementById('siloPesoBruto').textContent    = fmtKg(pesoBrutoKg);
    document.getElementById('siloDescUmidade').textContent  = fmtKg(descUmidadeKg) + ` (${(descUmidadePct * 100).toFixed(2)}%)`;
    document.getElementById('siloDescImpureza').textContent = fmtKg(descImpurezaKg) + ` (${impureza.toFixed(2)}%)`;
    document.getElementById('siloDescAvaria').textContent   = fmtKg(descAvariaKg) + ` (${pctAvaria.toFixed(2)}% × 50%)`;
    document.getElementById('siloPesoLiquido').textContent  = fmtKg(pesoLiquidoKg);
    document.getElementById('siloPerdaFinanceira').textContent = perdaFinanceira > 0 ? fmt(perdaFinanceira) : '—';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULO DINÂMICO DE FRETES
  // ═══════════════════════════════════════════════════════════════════════════
  window.__calcularFretes = () => {
    const g = name => {
      const el = document.querySelector(`input[name="${name}"]`);
      return el ? Number(el.value) || 0 : 0;
    };
    const gs = name => {
      const el = document.querySelector(`input[name="${name}"]`);
      return el ? el.value || '' : '';
    };

    const ton1   = g('frete1_toneladas');
    const preco1 = g('frete1_precoTon');
    const custo1 = ton1 * preco1;

    const ton2   = g('frete2_toneladas');
    const preco2 = g('frete2_precoTon');
    const custo2 = ton2 * preco2;

    const total    = custo1 + custo2;
    const totalTon = ton1 + ton2;

    const fmt = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

    document.getElementById('custoFrete1').textContent         = fmt(custo1);
    document.getElementById('custoFrete2').textContent         = fmt(custo2);
    document.getElementById('custoFreteTotalForm').textContent = fmt(total);
    document.getElementById('totalEntregueForm').textContent   = num(totalTon, 2) + ' t';

    const detalhes = [];
    if (ton1 > 0) {
      const arm1 = gs('frete1_armazem') || 'Frete 1';
      const dist1 = g('frete1_distancia');
      detalhes.push(`🚛 ${arm1}: ${num(ton1,2)}t × ${fmt(preco1)}/t = ${fmt(custo1)}${dist1 ? ` (${dist1}km)` : ''}`);
    }
    if (ton2 > 0) {
      const arm2 = gs('frete2_armazem') || 'Frete 2';
      const dist2 = g('frete2_distancia');
      detalhes.push(`🚚 ${arm2}: ${num(ton2,2)}t × ${fmt(preco2)}/t = ${fmt(custo2)}${dist2 ? ` (${dist2}km)` : ''}`);
    }

    document.getElementById('detalheFretes').innerHTML  = detalhes.length ? detalhes.join('<br>') : 'Preencha os dados de frete acima';
    document.getElementById('detalheViagens').textContent = totalTon > 0 ? `${totalTon > 0 ? num(totalTon,2) + ' toneladas transportadas' : ''}` : '—';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MÁQUINAS — adicionar / remover
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('btnAdicionarMaquina').addEventListener('click', () => {
    const container = document.getElementById('maquinas-container');
    const div = document.createElement('div');
    div.className = 'maquina-linha';
    div.innerHTML = `
      <select class="select" name="maquinaId[]">
        <option value="">— Máquina —</option>
        ${maquinas.map(m => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('')}
      </select>
      <input class="input" name="horas[]" type="number" step="0.5" placeholder="Horas trabalhadas">
      <button type="button" class="btn-remove" onclick="window.__removerMaquina(this)" title="Remover">✕</button>`;
    container.appendChild(div);
  });

  window.__removerMaquina = btn => {
    if (document.querySelectorAll('.maquina-linha').length <= 1) {
      toast('Aviso', 'Mantenha ao menos uma linha de máquina.');
      return;
    }
    btn.closest('.maquina-linha').remove();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR TABELA
  // ═══════════════════════════════════════════════════════════════════════════
  function renderTabela() {
    const db2 = getDB();
    let rows = onlySafra(db2.colheitas || []).sort((a, b) => (b.dataColheita || '').localeCompare(a.dataColheita || ''));
    if (fazendaAtual) {
      const tIds = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rows = rows.filter(c => tIds.includes(c.talhaoId));
    }

    const tb = document.getElementById('tbodyColheitas');
    if (!tb) return;

    tb.innerHTML = rows.map(c => {
      const talhaoNome = findNameById(talhoes, c.talhaoId);

      // Montar fretes (suporte a novo modelo + legado)
      const allFretes = [...(c.fretes || [])];
      if (c.frete1) allFretes.push(c.frete1);
      if (c.frete2) allFretes.push(c.frete2);

      const custoFreteCol = allFretes.reduce((s, f) => s + Number(f.custoFrete || 0), 0);

      const buildFreteCell = (f) => {
        if (!f || !f.armazem) return '—';
        const placaBadge = f.placa ? `<span class="truck-badge">🚛 ${f.placa}</span><br>` : '';
        const motorista  = f.motorista ? `👤 ${escapeHtml(f.motorista)}<br>` : '';
        const nf         = f.nfTransp ? `📄 NF: ${f.nfTransp}<br>` : '';
        return `<b>${escapeHtml(f.armazem)}</b><br>
          ${escapeHtml(f.cidade || '')}<br>
          ${placaBadge}${motorista}${nf}
          ${num(f.toneladas || 0, 2)} t × ${kbrl(f.precoTon || 0)}/t<br>
          <b style="color:#1d4ed8;">${kbrl(f.custoFrete || 0)}</b>`;
      };

      const f1Cell = buildFreteCell(allFretes[0]);
      const f2Cell = allFretes[1] ? buildFreteCell(allFretes[1]) : '—';

      const maqStr = (c.maquinas || []).map(m => {
        const maq = maquinas.find(q => q.id === m.maquinaId);
        return maq ? `${maq.nome}${m.horas ? ` (${m.horas}h)` : ''}` : '';
      }).filter(Boolean).join(', ');

      return `<tr>
        <td>${c.dataColheita || '—'}</td>
        <td><b>${escapeHtml(talhaoNome)}</b>${maqStr ? `<br><span style="font-size:11px;color:#64748b;">${escapeHtml(maqStr)}</span>` : ''}</td>
        <td><b>${num(c.producaoTotal || 0, 0)}</b> ${c.unidade || 'kg'}${c.temperatura ? `<br><span style='font-size:11px;'>🌡 ${c.temperatura}°C</span>` : ''}${c.pesoLiquidoEstimado > 0 ? `<br><span style='font-size:11px;color:#16a34a;'>💧 Liq: ${(c.pesoLiquidoEstimado/1000).toFixed(2)}t</span>` : ''}</td>
        <td>${c.umidade ? `<b>${c.umidade}%</b>${c.umidadePadrao && c.umidade > c.umidadePadrao ? `<br><span style="font-size:10px;color:#ef4444;">▲ pad. ${c.umidadePadrao}%</span>` : ''}` : '—'}</td>
        <td style="font-size:11px;">${[
          c.impureza    > 0 ? `Imp: ${c.impureza}%`     : '',
          c.ardidos     > 0 ? `Ard: ${c.ardidos}%`     : '',
          c.esverdeados > 0 ? `Esv: ${c.esverdeados}%` : '',
          c.quebrados   > 0 ? `Qbr: ${c.quebrados}%`   : '',
          c.cpo         > 0 ? `CPO: ${c.cpo}%`         : ''
        ].filter(Boolean).join(' | ') || (c.romaneio ? `📄 ${escapeHtml(c.romaneio)}` : '—')}</td>
        <td style="font-size:12px;">${f1Cell}</td>
        <td style="font-size:12px;">${f2Cell}</td>
        <td><b style="color:#b45309;font-size:15px;">${kbrl(custoFreteCol)}</b></td>
        <td class="noPrint">
          <button class="btn danger" style="font-size:12px; padding:5px 10px;" onclick="window.__delColheita('${c.id}')">Excluir</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" style="text-align:center; padding:30px; color:#94a3b8;">Nenhuma colheita registrada nesta safra</td></tr>';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUIR COLHEITA
  // ═══════════════════════════════════════════════════════════════════════════
  window.__delColheita = id => {
    if (!confirm('Excluir este registro de colheita?')) return;
    const db2 = getDB();
    db2.colheitas = (db2.colheitas || []).filter(x => x.id !== id);
    setDB(db2);
    toast('Excluído', 'Registro de colheita removido');
    pageColheitas();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT DO FORMULÁRIO
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('frmColheita').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const talhaoId = fd.get('talhaoId');
    if (!talhaoId) { toast('Erro', 'Selecione um talhão'); return; }

    const producaoTotal = Number(fd.get('producaoTotal') || 0);
    if (producaoTotal <= 0) { toast('Erro', 'Produção deve ser maior que 0'); return; }

    // Máquinas
    const maqIds   = fd.getAll('maquinaId[]').filter(Boolean);
    const horas    = fd.getAll('horas[]').map(h => Number(h) || 0);
    const maquinasArr = maqIds.map((id, i) => ({ maquinaId: id, horas: horas[i] })).filter(m => m.maquinaId);

    // Helper para extrair frete
    const getFrete = (prefix) => {
      const armazem       = fd.get(`${prefix}_armazem`)?.trim()       || '';
      const cidade        = fd.get(`${prefix}_cidade`)?.trim()        || '';
      const placa         = fd.get(`${prefix}_placa`)?.trim()         || '';
      const tipoCaminhao  = fd.get(`${prefix}_tipo_caminhao`)?.trim() || '';
      const capacidade    = Number(fd.get(`${prefix}_capacidade`) || 0);
      const motorista     = fd.get(`${prefix}_motorista`)?.trim()     || '';
      const cnh           = fd.get(`${prefix}_cnh`)?.trim()           || '';
      const transportadora= fd.get(`${prefix}_transportadora`)?.trim()|| '';
      const cnpjTransp    = fd.get(`${prefix}_cnpj_transp`)?.trim()   || '';
      const nfTransp      = fd.get(`${prefix}_nf_transp`)?.trim()     || '';
      const toneladas     = Number(fd.get(`${prefix}_toneladas`) || 0);
      const precoTon      = Number(fd.get(`${prefix}_precoTon`) || 0);
      const distancia     = Number(fd.get(`${prefix}_distancia`) || 0);
      const dataEntrega   = fd.get(`${prefix}_data_entrega`) || '';

      if (!armazem && toneladas === 0) return null;

      return {
        armazem, cidade, placa, tipoCaminhao, capacidade,
        motorista, cnh, transportadora, cnpjTransp, nfTransp,
        toneladas, precoTon, custoFrete: toneladas * precoTon,
        distancia, dataEntrega
      };
    };

    const frete1 = getFrete('frete1');
    const frete2 = getFrete('frete2');

    // Classificação silo
    const gfn = f => fd.get(f) ? Number(fd.get(f)) : null;
    const umidadeVal      = gfn('umidade');
    const umidadePadrao   = gfn('umidadePadrao') || 13.0;
    const impureza        = gfn('impureza');
    const ardidos         = gfn('ardidos');
    const esverdeados     = gfn('esverdeados');
    const quebrados       = gfn('quebrados');
    const cpo             = gfn('cpo');
    const taxaArmazenagem = gfn('taxaArmazenagem');
    const precoBaseSaca   = gfn('precoBaseSaca');

    // Peso líquido estimado após descontos
    const pesoPadrao2 = 60;
    let pesoBrutoKg2 = producaoTotal;
    if (fd.get('unidade') === 'sc') pesoBrutoKg2 = producaoTotal * pesoPadrao2;
    if (fd.get('unidade') === 't')  pesoBrutoKg2 = producaoTotal * 1000;
    const descUmPct2   = umidadeVal && umidadeVal > umidadePadrao ? (umidadeVal - umidadePadrao) / (100 - umidadePadrao) : 0;
    const pctAv2       = (ardidos||0) + (esverdeados||0) + (quebrados||0) + (cpo||0);
    const pesoLiqEst   = Math.max(pesoBrutoKg2 * (1 - descUmPct2) - pesoBrutoKg2 * ((impureza||0)/100) - pesoBrutoKg2 * (pctAv2/100) * 0.5, 0);

    const obj = {
      id:            uid('col'),
      safraId:       getSafraId(),
      dataColheita:  fd.get('dataColheita') || nowISO(),
      talhaoId,
      producaoTotal,
      unidade:       fd.get('unidade') || 'kg',
      umidade:       umidadeVal,
      temperatura:   gfn('temperatura'),
      romaneio:      fd.get('romaneio')?.trim() || '',
      observacoes:   fd.get('obs')?.trim() || '',
      maquinas:      maquinasArr,
      // Classificação silo
      umidadePadrao,
      impureza,
      ardidos,
      esverdeados,
      quebrados,
      cpo,
      taxaArmazenagem,
      precoBaseSaca,
      pesoLiquidoEstimado: Math.round(pesoLiqEst),
      frete1,
      frete2,
      fretes:        [frete1, frete2].filter(Boolean)
    };

    const db2 = getDB();
    db2.colheitas = db2.colheitas || [];
    db2.colheitas.push(obj);
    setDB(db2);

    const custoTotal = (frete1?.custoFrete || 0) + (frete2?.custoFrete || 0);
    toast('✅ Colheita registrada', `${num(producaoTotal, 0)} ${obj.unidade}${custoTotal > 0 ? ` | Frete: ${kbrl(custoTotal)}` : ''}`);
    pageColheitas();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR CSV
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('btnExportCSV').addEventListener('click', () => {
    const dados = colheitas.map(c => {
      const allFretes = [...(c.fretes || [])];
      if (c.frete1 && !allFretes.includes(c.frete1)) allFretes.push(c.frete1);
      if (c.frete2 && !allFretes.includes(c.frete2)) allFretes.push(c.frete2);
      const f1 = allFretes[0] || {};
      const f2 = allFretes[1] || {};
      return {
        Data:                  c.dataColheita || '',
        Talhão:                findNameById(talhoes, c.talhaoId),
        Produção:              c.producaoTotal,
        Unidade:               c.unidade,
        Umidade_pct:           c.umidade || '',
        Umidade_Padrao_pct:    c.umidadePadrao || '',
        Temperatura_C:         c.temperatura || '',
        Impureza_pct:          c.impureza || '',
        Ardidos_pct:           c.ardidos || '',
        Esverdeados_pct:       c.esverdeados || '',
        Quebrados_pct:         c.quebrados || '',
        CPO_pct:               c.cpo || '',
        Taxa_Armazenagem_pct:  c.taxaArmazenagem || '',
        Preco_Base_Saca:       c.precoBaseSaca || '',
        Peso_Liquido_Estimado_kg: c.pesoLiquidoEstimado || '',
        Romaneio_NF:           c.romaneio || '',
        Frete1_Armazem:        f1.armazem || '',
        Frete1_Cidade:         f1.cidade || '',
        Frete1_Placa:          f1.placa || '',
        Frete1_Motorista:      f1.motorista || '',
        Frete1_Transportadora: f1.transportadora || '',
        Frete1_NF_Transp:      f1.nfTransp || '',
        Frete1_Toneladas:      f1.toneladas || 0,
        Frete1_Preco_Ton:      f1.precoTon || 0,
        Frete1_Custo:          f1.custoFrete || 0,
        Frete1_Distancia_km:   f1.distancia || '',
        Frete1_Data_Entrega:   f1.dataEntrega || '',
        Frete2_Armazem:        f2.armazem || '',
        Frete2_Cidade:         f2.cidade || '',
        Frete2_Placa:          f2.placa || '',
        Frete2_Motorista:      f2.motorista || '',
        Frete2_Transportadora: f2.transportadora || '',
        Frete2_NF_Transp:      f2.nfTransp || '',
        Frete2_Toneladas:      f2.toneladas || 0,
        Frete2_Preco_Ton:      f2.precoTon || 0,
        Frete2_Custo:          f2.custoFrete || 0,
        Frete2_Distancia_km:   f2.distancia || '',
        Frete2_Data_Entrega:   f2.dataEntrega || '',
        Custo_Frete_Total:     (f1.custoFrete || 0) + (f2.custoFrete || 0),
        Observações:           c.observacoes || ''
      };
    });
    downloadText(`colheitas-${nowISO()}.csv`, toCSV(dados));
    toast('📥 Exportado', 'CSV de colheitas baixado');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATÓRIO PREMIUM (janela impressão)
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('btnExportRelatorio').addEventListener('click', () => {
    const linhas = colheitas.map(c => {
      const allFretes = [...(c.fretes || [])];
      if (c.frete1) allFretes.push(c.frete1);
      if (c.frete2) allFretes.push(c.frete2);
      const custo = allFretes.reduce((s, f) => s + Number(f.custoFrete || 0), 0);
      const classif = [
        c.impureza > 0 ? `Imp:${c.impureza}%` : '',
        c.ardidos > 0 ? `Ard:${c.ardidos}%` : '',
        c.esverdeados > 0 ? `Esv:${c.esverdeados}%` : '',
        c.quebrados > 0 ? `Qbr:${c.quebrados}%` : '',
        c.cpo > 0 ? `CPO:${c.cpo}%` : ''
      ].filter(Boolean).join(', ') || '—';
      const pesoLiq = c.pesoLiquidoEstimado > 0 ? `${(c.pesoLiquidoEstimado/1000).toFixed(2)}t` : '—';
      return `<tr>
        <td>${c.dataColheita}</td>
        <td>${escapeHtml(findNameById(talhoes, c.talhaoId))}</td>
        <td>${num(c.producaoTotal,0)} ${c.unidade}</td>
        <td>${c.umidade ? c.umidade + '%' : '—'}${c.umidadePadrao ? ` (pad. ${c.umidadePadrao}%)` : ''}</td>
        <td>${classif}</td>
        <td style="color:#16a34a;font-weight:700;">${pesoLiq}</td>
        <td>${c.romaneio || '—'}</td>
        <td>${allFretes.map(f => f.armazem ? `${escapeHtml(f.armazem)} (${num(f.toneladas||0,2)}t)` : '').filter(Boolean).join(', ') || '—'}</td>
        <td>${kbrl(custo)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Colheitas</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1e3a5f}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;font-size:11px}th{background:#1e3a5f;color:white}tr:nth-child(even){background:#f5f5f5}.total{font-weight:bold;font-size:14px;margin-top:12px}</style>
    </head><body>
    <h1>🌾 Relatório de Colheitas — Agro Pro</h1>
    <p style="color:#666;font-size:12px;">Gerado em ${new Date().toLocaleString('pt-BR')} | Produção: ${num(producaoTotalKg/1000,2)}t | Frete Total: ${kbrl(custoFreteTotal)}</p>
    <table><thead><tr><th>Data</th><th>Talhão</th><th>Produção</th><th>Umidade</th><th>Classificação</th><th>Peso Líq.</th><th>Romaneio/NF</th><th>Armazéns</th><th>Custo Frete</th></tr></thead>
    <tbody>${linhas || '<tr><td colspan="9">Nenhuma colheita</td></tr>'}</tbody></table>
    <div class="total">Total Produção: ${num(producaoTotalKg/1000,2)} toneladas | Total Frete: ${kbrl(custoFreteTotal)}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
  });

  renderTabela();
}
