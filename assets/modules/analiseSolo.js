/* ============================================================
   AGRO PRO — Análise de Solo (v9.6)
   Módulo integrado: laudo de solo + insumos base + recomendações IA
   ============================================================ */

function pageAnaliseSolo() {
  const db = getDB();
  const safraId = getSafraId();
  let talhoes = onlySafra(db.talhoes || []);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas || []);
  const insumosBase = onlySafra(db.insumosBase || []);
  const analises = onlySafra(db.analiseSolo || []).sort((a, b) =>
    (b.data || '').localeCompare(a.data || '')
  );

  setTopActions(`
    <button class="btn" id="btnExportAnaliseSoloCSV">📥 CSV</button>
    <button class="btn primary noPrint" id="btnImprimirAnalise">🖨️ Imprimir</button>
  `);

  // ── KPIs ──────────────────────────────────────────────
  const talhaoAnalisado = new Set(analises.map(a => a.talhaoId)).size;
  const totalAnalises = analises.length;
  const phMedio = analises.length
    ? (analises.reduce((s, a) => s + Number(a.ph || 0), 0) / analises.length).toFixed(1)
    : '—';
  const analiseRecente = analises[0];

  const content = document.getElementById('content');
  content.innerHTML = `
    <style>
      .as-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }
      .as-kpi {
        background: white;
        border-radius: 12px;
        padding: 16px 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        border-left: 4px solid #10b981;
      }
      .as-kpi.azul    { border-color: #3b82f6; }
      .as-kpi.amarelo { border-color: #f59e0b; }
      .as-kpi.vermelho{ border-color: #ef4444; }
      .as-kpi.roxo    { border-color: #8b5cf6; }
      .as-kpi .label  { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
      .as-kpi .value  { font-size: 24px; font-weight: 800; color: #0f172a; }
      .as-kpi .sub    { font-size: 11px; color: #94a3b8; margin-top: 3px; }

      .as-section { margin-bottom: 28px; }
      .as-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      .as-form-grid .full { grid-column: 1/-1; }

      .param-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .param-item { display: flex; flex-direction: column; gap: 4px; }
      .param-item small { font-weight: 600; font-size: 11px; color: #64748b; }

      .as-table-wrap { overflow-x: auto; }
      .as-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .as-table th {
        background: #f1f5f9;
        padding: 9px 12px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
        white-space: nowrap;
      }
      .as-table td {
        padding: 9px 12px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
        vertical-align: middle;
      }
      .as-table tr:hover td { background: #f8fafc; }

      .ph-badge {
        display: inline-block;
        padding: 2px 9px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
      }
      .ph-acido   { background: #fee2e2; color: #991b1b; }
      .ph-neutro  { background: #dcfce7; color: #166534; }
      .ph-alcalino{ background: #dbeafe; color: #1e40af; }

      .recom-box {
        background: linear-gradient(135deg, #0f172a, #1e3a2f);
        border-radius: 12px;
        padding: 20px;
        color: white;
        margin-top: 8px;
      }
      .recom-box h4 { margin: 0 0 12px; color: #4ade80; font-size: 15px; }
      .recom-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        font-size: 13px;
        line-height: 1.5;
      }
      .recom-item:last-child { border-bottom: none; }
      .recom-icon { font-size: 20px; flex-shrink: 0; }
      .recom-text b { color: #a3e635; }

      .integracao-card {
        background: #f0fdf4;
        border: 1px solid #86efac;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 12px;
      }
      .integracao-card h4 { margin: 0 0 10px; color: #166534; font-size: 14px; }
      .integracao-card .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #374151;
        padding: 4px 0;
        border-bottom: 1px solid #d1fae5;
      }
      .integracao-card .row:last-child { border-bottom: none; }

      .ai-recom-box {
        background: linear-gradient(135deg, #1e1b4b, #0f172a);
        border-radius: 12px;
        padding: 20px 24px;
        color: white;
        border: 1px solid #4338ca;
      }
      .ai-recom-box h4 { margin: 0 0 12px; color: #a78bfa; }
      .ai-recom-text { font-size: 13px; line-height: 1.8; color: #e2e8f0; white-space: pre-wrap; }

      .tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
      .tab-btn {
        padding: 8px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        color: #64748b;
        transition: all 0.2s;
      }
      .tab-btn.active {
        background: var(--primary, #2e7d32);
        color: white;
        border-color: var(--primary, #2e7d32);
        font-weight: 700;
      }

      @media print {
        .noPrint, button { display: none !important; }
        .card { box-shadow: none !important; border: 1px solid #ddd !important; }
      }
    </style>

    <!-- KPIs -->
    <div class="as-kpi-grid">
      <div class="as-kpi">
        <div class="label">🔬 Análises Registradas</div>
        <div class="value">${totalAnalises}</div>
        <div class="sub">na safra atual</div>
      </div>
      <div class="as-kpi azul">
        <div class="label">🧭 Talhões Analisados</div>
        <div class="value">${talhaoAnalisado} / ${talhoes.length}</div>
        <div class="sub">${talhoes.length - talhaoAnalisado > 0 ? `⚠️ ${talhoes.length - talhaoAnalisado} sem análise` : '✅ todos analisados'}</div>
      </div>
      <div class="as-kpi amarelo">
        <div class="label">⚗️ pH Médio</div>
        <div class="value">${phMedio}</div>
        <div class="sub">${_phInterpret(parseFloat(phMedio))}</div>
      </div>
      <div class="as-kpi roxo">
        <div class="label">📅 Última Análise</div>
        <div class="value" style="font-size:16px;">${analiseRecente ? _fmtData(analiseRecente.data) : '—'}</div>
        <div class="sub">${analiseRecente ? escapeHtml(analiseRecente.talhaoNome || '—') : 'Nenhuma ainda'}</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs noPrint">
      <button class="tab-btn active" onclick="_asTab('form')">📝 Nova Análise</button>
      <button class="tab-btn" onclick="_asTab('historico')">📋 Histórico</button>
      <button class="tab-btn" onclick="_asTab('integracao')">🌱 Integração Insumos</button>
      <button class="tab-btn" onclick="_asTab('recomendacoes')">🤖 Recomendações IA</button>
    </div>

    <!-- TAB: FORMULÁRIO -->
    <div id="tabForm" class="card as-section">
      <h3 style="margin:0 0 18px; font-size:16px; color:#0f172a;">🔬 Registrar Análise de Solo</h3>

      <div class="as-form-grid" style="margin-bottom:14px;">
        <div>
          <small class="form-label">Talhão *</small>
          <select class="select" id="asTalhao" onchange="_asPreencheTalhao()">
            <option value="">— Selecione —</option>
            ${talhoes.map(t => {
              const f = fazendas.find(fa => fa.id === t.fazendaId);
              return `<option value="${t.id}" data-area="${t.areaHa}" data-cultura="${t.cultura||''}" data-fazenda="${f?.nome||''}">${escapeHtml(t.nome)} — ${escapeHtml(f?.nome||'')} (${num(t.areaHa||0,1)} ha)</option>`;
            }).join('')}
          </select>
        </div>
        <div>
          <small class="form-label">Data da Coleta *</small>
          <input class="input" type="date" id="asData" value="${nowISO()}" />
        </div>
        <div>
          <small class="form-label">Laboratório</small>
          <input class="input" type="text" id="asLaboratorio" placeholder="Ex: Embrapa, LabSolo..." />
        </div>
        <div>
          <small class="form-label">Profundidade (cm)</small>
          <select class="select" id="asProfundidade">
            <option value="0-20">0 – 20 cm</option>
            <option value="20-40">20 – 40 cm</option>
            <option value="0-10">0 – 10 cm</option>
            <option value="0-40">0 – 40 cm</option>
            <option value="0-60">0 – 60 cm</option>
          </select>
        </div>
        <div>
          <small class="form-label">Textura do Solo</small>
          <select class="select" id="asTextura">
            <option value="">— Não informado —</option>
            <option value="argiloso">Argiloso</option>
            <option value="muito_argiloso">Muito Argiloso</option>
            <option value="areno_argiloso">Argilo-Arenoso</option>
            <option value="medio">Textura Média</option>
            <option value="arenoso">Arenoso</option>
            <option value="franco">Franco</option>
          </select>
        </div>
        <div>
          <small class="form-label">Nº do Laudo</small>
          <input class="input" type="text" id="asNumeroLaudo" placeholder="Ex: LAB-2025-001" />
        </div>
      </div>

      <h4 style="font-size:14px; color:#334155; margin:16px 0 12px;">⚗️ Parâmetros Químicos</h4>
      <div class="param-grid">
        <div class="param-item">
          <small>pH (H₂O) *</small>
          <input class="input" type="number" id="asPH" placeholder="Ex: 6.2" min="0" max="14" step="0.1" oninput="_asInterpretPH()" />
          <span id="asPhStatus" style="font-size:11px; color:#64748b;"></span>
        </div>
        <div class="param-item">
          <small>M.O. (g/dm³)</small>
          <input class="input" type="number" id="asMO" placeholder="Ex: 28" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>P (mg/dm³)</small>
          <input class="input" type="number" id="asP" placeholder="Ex: 12" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>K (mmolc/dm³)</small>
          <input class="input" type="number" id="asK" placeholder="Ex: 2.8" min="0" step="0.01" />
        </div>
        <div class="param-item">
          <small>Ca (mmolc/dm³)</small>
          <input class="input" type="number" id="asCa" placeholder="Ex: 30" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>Mg (mmolc/dm³)</small>
          <input class="input" type="number" id="asMg" placeholder="Ex: 12" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>Al (mmolc/dm³)</small>
          <input class="input" type="number" id="asAl" placeholder="Ex: 0" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>H+Al (mmolc/dm³)</small>
          <input class="input" type="number" id="asHAl" placeholder="Ex: 40" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>S – Enxofre (mg/dm³)</small>
          <input class="input" type="number" id="asS" placeholder="Ex: 5" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>B – Boro (mg/dm³)</small>
          <input class="input" type="number" id="asB" placeholder="Ex: 0.3" min="0" step="0.01" />
        </div>
        <div class="param-item">
          <small>Cu (mg/dm³)</small>
          <input class="input" type="number" id="asCu" placeholder="Ex: 1.2" min="0" step="0.01" />
        </div>
        <div class="param-item">
          <small>Fe (mg/dm³)</small>
          <input class="input" type="number" id="asFe" placeholder="Ex: 28" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>Mn (mg/dm³)</small>
          <input class="input" type="number" id="asMn" placeholder="Ex: 5" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>Zn (mg/dm³)</small>
          <input class="input" type="number" id="asZn" placeholder="Ex: 1.5" min="0" step="0.01" />
        </div>
      </div>

      <h4 style="font-size:14px; color:#334155; margin:16px 0 12px;">📐 Parâmetros Calculados / Físicos</h4>
      <div class="param-grid">
        <div class="param-item">
          <small>CTC (mmolc/dm³)</small>
          <input class="input" type="number" id="asCTC" placeholder="Calculado ou manual" min="0" step="0.1" />
        </div>
        <div class="param-item">
          <small>V% – Saturação de Bases</small>
          <input class="input" type="number" id="asV" placeholder="Ex: 70" min="0" max="100" step="0.1" />
        </div>
        <div class="param-item">
          <small>m% – Sat. por Alumínio</small>
          <input class="input" type="number" id="asM" placeholder="Ex: 5" min="0" max="100" step="0.1" />
        </div>
        <div class="param-item">
          <small>Areia (%)</small>
          <input class="input" type="number" id="asAreia" placeholder="Ex: 45" min="0" max="100" step="1" />
        </div>
        <div class="param-item">
          <small>Silte (%)</small>
          <input class="input" type="number" id="asSilte" placeholder="Ex: 20" min="0" max="100" step="1" />
        </div>
        <div class="param-item">
          <small>Argila (%)</small>
          <input class="input" type="number" id="asArgila" placeholder="Ex: 35" min="0" max="100" step="1" />
        </div>
      </div>

      <h4 style="font-size:14px; color:#334155; margin:16px 0 12px;">📋 Recomendação do Laboratório</h4>
      <div class="as-form-grid" style="margin-bottom:14px;">
        <div class="full">
          <small class="form-label">Recomendação de Calagem (t/ha)</small>
          <input class="input" type="number" id="asRecomCalagem" placeholder="Ex: 2.5 t/ha" min="0" step="0.1" />
        </div>
        <div class="full">
          <small class="form-label">Recomendação de Gessagem (t/ha)</small>
          <input class="input" type="number" id="asRecomGessagem" placeholder="Ex: 1.0 t/ha" min="0" step="0.1" />
        </div>
        <div class="full">
          <small class="form-label">Adubação Recomendada pelo Lab (livre)</small>
          <textarea class="input" id="asRecomAdubacao" rows="3" placeholder="Ex: 300 kg/ha 08-28-16 na semeadura + 150 kg/ha ureia em cobertura..."></textarea>
        </div>
        <div class="full">
          <small class="form-label">Observações do Laudo</small>
          <textarea class="input" id="asObs" rows="2" placeholder="Informações adicionais do laudo..."></textarea>
        </div>
      </div>

      <!-- Botão calcular V% -->
      <div style="margin-bottom:16px;">
        <button class="btn" id="btnCalcVpct" style="font-size:12px;">🧮 Calcular V% e CTC automaticamente</button>
        <span id="asCalcResult" style="font-size:12px; color:#64748b; margin-left:10px;"></span>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn primary" id="btnSalvarAnalise" style="min-width:160px;">💾 Salvar Análise</button>
        <button class="btn" id="btnLimparAnalise">🔄 Limpar</button>
      </div>
    </div>

    <!-- TAB: HISTÓRICO -->
    <div id="tabHistorico" class="card as-section" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <h3 style="margin:0; font-size:16px; color:#0f172a;">📋 Histórico de Análises</h3>
        <select class="select" id="asHistoricoFiltroTalhao" style="width:200px;">
          <option value="">Todos os talhões</option>
          ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}
        </select>
      </div>
      <div id="asHistoricoContainer"></div>
    </div>

    <!-- TAB: INTEGRAÇÃO COM INSUMOS BASE -->
    <div id="tabIntegracao" class="card as-section" style="display:none;">
      <h3 style="margin:0 0 6px; font-size:16px; color:#0f172a;">🌱 Integração: Análise de Solo + Insumos Base</h3>
      <p style="color:#64748b; font-size:13px; margin:0 0 20px;">Visualize a correlação entre o laudo de solo e os insumos de base aplicados em cada talhão.</p>
      <div id="asIntegracaoContainer"></div>
    </div>

    <!-- TAB: RECOMENDAÇÕES IA -->
    <div id="tabRecomendacoes" class="card as-section" style="display:none;">
      <h3 style="margin:0 0 6px; font-size:16px; color:#0f172a;">🤖 Recomendações da IA por Talhão</h3>
      <p style="color:#64748b; font-size:13px; margin:0 0 16px;">Baseadas nas análises de solo registradas e nos insumos aplicados.</p>

      <div style="margin-bottom:16px;">
        <label style="font-size:13px; font-weight:600; margin-bottom:6px; display:block;">Selecione o talhão para análise:</label>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <select class="select" id="asRecomTalhao" style="min-width:220px;">
            <option value="">— Selecione um talhão —</option>
            ${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}
          </select>
          <button class="btn primary" id="btnGerarRecomIA" style="min-width:160px;">🤖 Gerar Recomendações</button>
          <button class="btn" id="btnAbrirCopilot" style="min-width:160px;">💬 Aprofundar no Copilot</button>
        </div>
      </div>

      <div id="asRecomContainer">
        <div style="text-align:center; padding:40px; color:#94a3b8;">
          <div style="font-size:40px; margin-bottom:10px;">🔬</div>
          <p>Selecione um talhão e clique em "Gerar Recomendações" para obter análise completa da IA.</p>
        </div>
      </div>
    </div>
  `;

  // ── Tabs ──────────────────────────────────────────────
  window._asTab = function (tab) {
    ['tabForm','tabHistorico','tabIntegracao','tabRecomendacoes'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(
        tab === 'form' ? 'nova' : tab === 'historico' ? 'histórico' : tab === 'integracao' ? 'integr' : 'recom'
      ));
    });
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
    if (tab === 'historico') _asRenderHistorico();
    if (tab === 'integracao') _asRenderIntegracao();
    if (tab === 'recomendacoes') {} // handled on button click
  };

  // ── Interpretar pH ao vivo ─────────────────────────────
  window._asInterpretPH = function () {
    const ph = parseFloat(document.getElementById('asPH')?.value || 0);
    const el = document.getElementById('asPhStatus');
    if (!el) return;
    el.textContent = ph ? _phInterpret(ph) : '';
    el.style.color = ph < 5.5 ? '#ef4444' : ph <= 7.0 ? '#10b981' : '#3b82f6';
  };

  // ── Calcular V% e CTC ─────────────────────────────────
  document.getElementById('btnCalcVpct')?.addEventListener('click', () => {
    const ca = parseFloat(document.getElementById('asCa')?.value || 0);
    const mg = parseFloat(document.getElementById('asMg')?.value || 0);
    const k  = parseFloat(document.getElementById('asK')?.value || 0);
    const al = parseFloat(document.getElementById('asAl')?.value || 0);
    const hal= parseFloat(document.getElementById('asHAl')?.value || 0);

    const S = ca + mg + k;
    const CTC = S + hal;
    const V = CTC > 0 ? (S / CTC) * 100 : 0;
    const m = (S + al) > 0 ? (al / (S + al)) * 100 : 0;

    document.getElementById('asCTC').value = CTC.toFixed(1);
    document.getElementById('asV').value   = V.toFixed(1);
    document.getElementById('asM').value   = m.toFixed(1);
    document.getElementById('asCalcResult').textContent =
      `✅ CTC: ${CTC.toFixed(1)} | V%: ${V.toFixed(1)}% | m%: ${m.toFixed(1)}%`;
  });

  // ── Preencher info do talhão ───────────────────────────
  window._asPreencheTalhao = function () {
    const sel = document.getElementById('asTalhao');
    const opt = sel?.options[sel.selectedIndex];
    if (!opt?.value) return;
    const cultura = opt?.dataset?.cultura || '';
    const area = opt?.dataset?.area || '';
    // info apenas visual — o form já tem os campos
  };

  // ── Salvar Análise ─────────────────────────────────────
  document.getElementById('btnSalvarAnalise')?.addEventListener('click', () => {
    const talhaoId = document.getElementById('asTalhao').value;
    const data = document.getElementById('asData').value;
    const ph = document.getElementById('asPH').value;

    if (!talhaoId) return toast('❌ Erro', 'Selecione um talhão');
    if (!data)     return toast('❌ Erro', 'Informe a data da coleta');
    if (!ph)       return toast('❌ Erro', 'Informe o pH do solo');

    const talhao = talhoes.find(t => t.id === talhaoId);
    const fazenda = fazendas.find(f => f.id === talhao?.fazendaId);

    const gV = (id) => parseFloat(document.getElementById(id)?.value || '') || null;
    const gS = (id) => document.getElementById(id)?.value?.trim() || '';

    const registro = {
      id: 'as_' + Date.now(),
      safraId,
      talhaoId,
      talhaoNome: talhao?.nome || '',
      talhaoArea: talhao?.areaHa || 0,
      talhaoCultura: talhao?.cultura || '',
      fazendaNome: fazenda?.nome || '',
      data,
      laboratorio: gS('asLaboratorio'),
      profundidade: gS('asProfundidade'),
      textura: gS('asTextura'),
      numeroLaudo: gS('asNumeroLaudo'),
      // Químicos
      ph: gV('asPH'),
      mo: gV('asMO'),
      p: gV('asP'),
      k: gV('asK'),
      ca: gV('asCa'),
      mg: gV('asMg'),
      al: gV('asAl'),
      hAl: gV('asHAl'),
      s: gV('asS'),
      b: gV('asB'),
      cu: gV('asCu'),
      fe: gV('asFe'),
      mn: gV('asMn'),
      zn: gV('asZn'),
      // Calculados/Físicos
      ctc: gV('asCTC'),
      vPct: gV('asV'),
      mPct: gV('asM'),
      areia: gV('asAreia'),
      silte: gV('asSilte'),
      argila: gV('asArgila'),
      // Recomendações
      recomCalagem: gV('asRecomCalagem'),
      recomGessagem: gV('asRecomGessagem'),
      recomAdubacao: gS('asRecomAdubacao'),
      obs: gS('asObs'),
      criadoEm: new Date().toISOString()
    };

    const dbNow = getDB();
    dbNow.analiseSolo = dbNow.analiseSolo || [];
    dbNow.analiseSolo.push(registro);
    setDB(dbNow);
    toast('Agro Pro', `✅ Análise do talhão "${talhao?.nome}" salva com sucesso!`, 'success');
    pageAnaliseSolo();
  });

  // ── Limpar ─────────────────────────────────────────────
  document.getElementById('btnLimparAnalise')?.addEventListener('click', () => {
    ['asTalhao','asLaboratorio','asProfundidade','asTextura','asNumeroLaudo',
     'asPH','asMO','asP','asK','asCa','asMg','asAl','asHAl','asS','asB','asCu',
     'asFe','asMn','asZn','asCTC','asV','asM','asAreia','asSilte','asArgila',
     'asRecomCalagem','asRecomGessagem','asRecomAdubacao','asObs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = el.tagName === 'SELECT' ? (el.options[0]?.value || '') : '';
    });
    document.getElementById('asData').value = nowISO();
    document.getElementById('asPhStatus').textContent = '';
    document.getElementById('asCalcResult').textContent = '';
  });

  // ── Render Histórico ───────────────────────────────────
  function _asRenderHistorico() {
    const filtroTalhao = document.getElementById('asHistoricoFiltroTalhao')?.value || '';
    const dbNow = getDB();
    let lista = onlySafra(dbNow.analiseSolo || []).sort((a, b) =>
      (b.data || '').localeCompare(a.data || '')
    );
    if (filtroTalhao) lista = lista.filter(a => a.talhaoId === filtroTalhao);
    const container = document.getElementById('asHistoricoContainer');

    if (!lista.length) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Nenhuma análise registrada.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="as-table-wrap">
        <table class="as-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Talhão</th>
              <th>Fazenda</th>
              <th>pH</th>
              <th>M.O.</th>
              <th>P</th>
              <th>K</th>
              <th>V%</th>
              <th>Textura</th>
              <th>Lab</th>
              <th>Rec. Calagem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(a => `
              <tr>
                <td>${_fmtData(a.data)}</td>
                <td><b>${escapeHtml(a.talhaoNome || '—')}</b></td>
                <td>${escapeHtml(a.fazendaNome || '—')}</td>
                <td>${_phBadge(a.ph)}</td>
                <td>${a.mo != null ? a.mo : '—'}</td>
                <td>${a.p != null ? a.p : '—'}</td>
                <td>${a.k != null ? a.k : '—'}</td>
                <td>${a.vPct != null ? `<b>${a.vPct}%</b>` : '—'}</td>
                <td style="text-transform:capitalize;">${a.textura?.replace('_',' ') || '—'}</td>
                <td style="font-size:11px;">${escapeHtml(a.laboratorio || '—')}</td>
                <td>${a.recomCalagem ? `<b>${a.recomCalagem} t/ha</b>` : '—'}</td>
                <td style="white-space:nowrap;">
                  <button class="btn" style="padding:3px 8px; font-size:11px;" onclick="_asVerDetalhes('${a.id}')">🔍</button>
                  <button class="btn" style="padding:3px 8px; font-size:11px; color:#ef4444;" onclick="_asDeleteAnalise('${a.id}')">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  document.getElementById('asHistoricoFiltroTalhao')?.addEventListener('change', _asRenderHistorico);

  // ── Render Integração com Insumos Base ────────────────
  function _asRenderIntegracao() {
    const container = document.getElementById('asIntegracaoContainer');
    const dbNow = getDB();
    const analisesSalvas = onlySafra(dbNow.analiseSolo || []);
    const insumosSalvos  = onlySafra(dbNow.insumosBase || []);

    if (!talhoes.length) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Nenhum talhão cadastrado.</div>`;
      return;
    }

    let html = '';
    talhoes.forEach(t => {
      const minhasAnalises = analisesSalvas.filter(a => a.talhaoId === t.id).sort((a,b) => b.data.localeCompare(a.data));
      const maisRecente = minhasAnalises[0];
      const meusInsumos = insumosSalvos.filter(i => i.talhaoId === t.id);
      const custoInsumos = meusInsumos.reduce((s, i) => s + Number(i.custoTotal || 0), 0);
      const fazenda = fazendas.find(f => f.id === t.fazendaId);

      html += `
        <div class="integracao-card">
          <h4>🧭 ${escapeHtml(t.nome)} — ${escapeHtml(fazenda?.nome || '—')} (${num(t.areaHa || 0, 1)} ha)</h4>
          <div class="row">
            <span>📅 Última análise de solo:</span>
            <span><b>${maisRecente ? _fmtData(maisRecente.data) : '⚠️ Sem análise'}</b></span>
          </div>
          ${maisRecente ? `
          <div class="row">
            <span>⚗️ pH / V% / M.O.:</span>
            <span>${_phBadge(maisRecente.ph)} &nbsp; V%: <b>${maisRecente.vPct ?? '—'}%</b> &nbsp; M.O.: <b>${maisRecente.mo ?? '—'} g/dm³</b></span>
          </div>
          <div class="row">
            <span>📌 Rec. Calagem:</span>
            <span><b>${maisRecente.recomCalagem ? maisRecente.recomCalagem + ' t/ha' : '—'}</b></span>
          </div>
          ` : ''}
          <div class="row">
            <span>🌱 Insumos base aplicados:</span>
            <span><b>${meusInsumos.length} lançamento(s)</b> — ${brl(custoInsumos)}</span>
          </div>
          ${_asAlertaIntegracao(maisRecente, meusInsumos, t)}
          <div style="margin-top:10px;">
            <button class="btn" style="font-size:11px; padding:4px 10px;" onclick="_asTab('recomendacoes'); document.getElementById('asRecomTalhao').value='${t.id}'">🤖 Gerar Recomendação IA</button>
            ${!maisRecente ? `<button class="btn primary" style="font-size:11px; padding:4px 10px; margin-left:6px;" onclick="_asTab('form'); document.getElementById('asTalhao').value='${t.id}'">+ Registrar Análise</button>` : ''}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // ── Recomendações IA ───────────────────────────────────
  document.getElementById('btnGerarRecomIA')?.addEventListener('click', () => {
    const talhaoId = document.getElementById('asRecomTalhao')?.value;
    if (!talhaoId) return toast('❌ Erro', 'Selecione um talhão');

    const talhao = talhoes.find(t => t.id === talhaoId);
    const dbNow = getDB();
    const analisesSalvas = onlySafra(dbNow.analiseSolo || [])
      .filter(a => a.talhaoId === talhaoId)
      .sort((a,b) => b.data.localeCompare(a.data));
    const insumosSalvos = onlySafra(dbNow.insumosBase || []).filter(i => i.talhaoId === talhaoId);
    const container = document.getElementById('asRecomContainer');

    if (!analisesSalvas.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#94a3b8;">
          <div style="font-size:36px; margin-bottom:8px;">⚠️</div>
          <p>Nenhuma análise de solo registrada para o talhão <b>${escapeHtml(talhao?.nome||'')}</b>.</p>
          <button class="btn primary" onclick="_asTab('form'); document.getElementById('asTalhao').value='${talhaoId}'">+ Registrar Análise Agora</button>
        </div>
      `;
      return;
    }

    const analise = analisesSalvas[0];
    const recomLocal = _asGerarRecomLocal(analise, talhao, insumosSalvos);

    // Renderizar recomendações locais imediatamente
    container.innerHTML = `
      <div style="margin-bottom:16px; padding:12px 14px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">
        🔬 <b>Talhão:</b> ${escapeHtml(talhao?.nome||'')} &nbsp;|&nbsp;
        📅 <b>Coleta:</b> ${_fmtData(analise.data)} &nbsp;|&nbsp;
        ⚗️ <b>pH:</b> ${analise.ph ?? '—'} &nbsp;|&nbsp;
        📊 <b>V%:</b> ${analise.vPct ?? '—'}%
      </div>

      <div class="recom-box">
        <h4>📋 Diagnóstico e Recomendações Técnicas</h4>
        ${recomLocal.map(r => `
          <div class="recom-item">
            <span class="recom-icon">${r.icon}</span>
            <div class="recom-text">
              <b>${r.titulo}</b><br>
              ${r.texto}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:16px;" id="asIaBox">
        <div style="text-align:center; padding:20px; color:#94a3b8;">
          <div style="font-size:24px;">🤖</div>
          <p style="font-size:13px;">Consultando IA para recomendações avançadas...</p>
        </div>
      </div>
    `;

    // Tentar IA real (Copilot)
    _asConsultarIAParaTalhao(analise, talhao, insumosSalvos);
  });

  // ── Abrir Copilot com contexto ─────────────────────────
  document.getElementById('btnAbrirCopilot')?.addEventListener('click', () => {
    const talhaoId = document.getElementById('asRecomTalhao')?.value;
    const talhao = talhoes.find(t => t.id === talhaoId);
    if (talhao && typeof pageAnaliseSoloNoCopilot === 'function') {
      pageAnaliseSoloNoCopilot(talhaoId);
    } else {
      window.location.href = 'copilot.html';
    }
  });

  // ── Export CSV ─────────────────────────────────────────
  document.getElementById('btnExportAnaliseSoloCSV')?.addEventListener('click', () => {
    const dbNow = getDB();
    const lista = onlySafra(dbNow.analiseSolo || []);
    if (!lista.length) return toast('❌ Erro', 'Nenhum dado para exportar');
    const header = ['Data','Talhão','Fazenda','Área(ha)','Cultura','pH','M.O.','P','K','Ca','Mg','Al','H+Al','S','B','Cu','Fe','Mn','Zn','CTC','V%','m%','Areia%','Silte%','Argila%','Textura','Profundidade','Rec.Calagem(t/ha)','Rec.Gessagem(t/ha)','Rec.Adubação','Lab','Laudo','Obs'];
    const rows = lista.map(a => [
      a.data, a.talhaoNome, a.fazendaNome, a.talhaoArea, a.talhaoCultura,
      a.ph, a.mo, a.p, a.k, a.ca, a.mg, a.al, a.hAl, a.s, a.b, a.cu, a.fe, a.mn, a.zn,
      a.ctc, a.vPct, a.mPct, a.areia, a.silte, a.argila,
      a.textura, a.profundidade, a.recomCalagem, a.recomGessagem, a.recomAdubacao,
      a.laboratorio, a.numeroLaudo, a.obs
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `analise-solo-${getSafraAtual()?.nome || 'safra'}.csv`;
    a.click();
  });

  document.getElementById('btnImprimirAnalise')?.addEventListener('click', () => window.print());

  // ── Ações Globais ──────────────────────────────────────
  window._asDeleteAnalise = function (id) {
    if (!confirm('Excluir esta análise de solo?')) return;
    const dbNow = getDB();
    dbNow.analiseSolo = (dbNow.analiseSolo || []).filter(a => a.id !== id);
    setDB(dbNow);
    toast('ℹ️ Info', 'Análise excluída.');
    _asRenderHistorico();
  };

  window._asVerDetalhes = function (id) {
    const dbNow = getDB();
    const analise = (dbNow.analiseSolo || []).find(a => a.id === id);
    if (!analise) return;
    const msg = `🔬 Análise: ${escapeHtml(analise.talhaoNome)} — ${_fmtData(analise.data)}\n\n`
      + `pH: ${analise.ph} (${_phInterpret(analise.ph)})\n`
      + `M.O.: ${analise.mo ?? '—'} g/dm³\n`
      + `P: ${analise.p ?? '—'} | K: ${analise.k ?? '—'} | Ca: ${analise.ca ?? '—'} | Mg: ${analise.mg ?? '—'}\n`
      + `V%: ${analise.vPct ?? '—'}% | CTC: ${analise.ctc ?? '—'}\n`
      + `Textura: ${analise.textura || '—'}\n`
      + `Calagem Recomendada: ${analise.recomCalagem ? analise.recomCalagem + ' t/ha' : '—'}\n`
      + `Adubação: ${analise.recomAdubacao || '—'}`;
    alert(msg);
  };
}

// ── Helpers privados ──────────────────────────────────────

function _phInterpret(ph) {
  if (!ph || isNaN(ph)) return '';
  if (ph < 4.5) return '⚠️ Extremamente ácido';
  if (ph < 5.0) return '🔴 Muito ácido';
  if (ph < 5.5) return '🟠 Ácido';
  if (ph < 6.0) return '🟡 Moderadamente ácido';
  if (ph < 6.5) return '🟢 Levemente ácido';
  if (ph <= 7.0) return '✅ Neutro / Ideal';
  if (ph <= 7.5) return '🔵 Alcalino';
  return '⚠️ Muito Alcalino';
}

function _phBadge(ph) {
  if (ph == null) return '—';
  const cls = ph < 5.5 ? 'ph-acido' : ph <= 7.0 ? 'ph-neutro' : 'ph-alcalino';
  return `<span class="ph-badge ${cls}">${ph}</span>`;
}

function _fmtData(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function _asAlertaIntegracao(analise, insumos, talhao) {
  if (!analise) return '';
  const alertas = [];
  // pH baixo e não tem calagem registrada
  if (analise.ph < 5.5 && analise.recomCalagem > 0) {
    const temCalcario = insumos.some(i => i.tipoInsumo === 'Calcário');
    if (!temCalcario) {
      alertas.push(`<div style="background:#fee2e2; color:#991b1b; padding:6px 10px; border-radius:6px; font-size:12px; margin-top:6px;">⚠️ pH ${analise.ph} — Calagem recomendada (${analise.recomCalagem} t/ha) mas <b>nenhum calcário registrado</b> em Insumos Base.</div>`);
    }
  }
  // V% baixo
  if (analise.vPct < 50) {
    alertas.push(`<div style="background:#fef3c7; color:#92400e; padding:6px 10px; border-radius:6px; font-size:12px; margin-top:6px;">⚠️ V% = ${analise.vPct}% — saturação de bases baixa. Pode limitar absorção de nutrientes.</div>`);
  }
  return alertas.join('');
}

function _asGerarRecomLocal(analise, talhao, insumos) {
  const recom = [];
  const ph = Number(analise.ph || 0);
  const vPct = Number(analise.vPct || 0);
  const mo = Number(analise.mo || 0);
  const p = Number(analise.p || 0);
  const k = Number(analise.k || 0);
  const al = Number(analise.al || 0);
  const cultura = (talhao?.cultura || '').toLowerCase();

  // pH
  if (ph < 5.5) {
    recom.push({
      icon: '🔴',
      titulo: 'Correção de pH urgente',
      texto: `pH ${ph} está <b>abaixo do ideal</b> para a maioria das culturas (ideal 5.8–6.5). `
        + (analise.recomCalagem ? `Recomendação do laboratório: <b>${analise.recomCalagem} t/ha</b> de calcário.` : 'Realize calagem conforme recomendação de laboratório.')
        + ` Cultura do talhão: ${talhao?.cultura || 'não informado'}.`
    });
  } else if (ph >= 5.5 && ph <= 6.5) {
    recom.push({ icon: '✅', titulo: 'pH adequado', texto: `pH ${ph} está na faixa ideal para a maioria das culturas tropicais. Manter monitoramento anual.` });
  } else if (ph > 7.0) {
    recom.push({ icon: '🔵', titulo: 'Solo Alcalino', texto: `pH ${ph} pode limitar absorção de micronutrientes (Fe, Mn, Zn, B). Verificar necessidade de acidificação.` });
  }

  // V%
  if (vPct > 0) {
    if (vPct < 50) {
      recom.push({ icon: '⚠️', titulo: 'Saturação de bases baixa', texto: `V% = ${vPct}%. Ideal ≥ 60–70% para culturas comerciais. Aplicar calcário e verificar fontes de Ca e Mg.` });
    } else if (vPct >= 60 && vPct <= 80) {
      recom.push({ icon: '✅', titulo: 'Saturação de bases ideal', texto: `V% = ${vPct}% — faixa excelente para produtividade. Manter com calagem de manutenção.` });
    } else if (vPct > 80) {
      recom.push({ icon: '🔵', titulo: 'Saturação de bases elevada', texto: `V% = ${vPct}% — pode indicar excesso de calcário. Monitorar absorção de micronutrientes.` });
    }
  }

  // M.O.
  if (mo > 0) {
    if (mo < 15) {
      recom.push({ icon: '🟡', titulo: 'Matéria orgânica baixa', texto: `M.O. = ${mo} g/dm³ — abaixo do ideal (>20). Incorporar palhada, adubo verde ou esterco para melhorar estrutura e retenção hídrica.` });
    } else if (mo >= 15 && mo < 30) {
      recom.push({ icon: '🟢', titulo: 'Matéria orgânica adequada', texto: `M.O. = ${mo} g/dm³ — manter com rotação de culturas e preservação de cobertura vegetal.` });
    } else {
      recom.push({ icon: '✅', titulo: 'Matéria orgânica alta', texto: `M.O. = ${mo} g/dm³ — excelente! Solo com boa estrutura, retenção hídrica e biologia ativa.` });
    }
  }

  // P (Fósforo)
  if (p > 0) {
    const pBaixo = p < 12;
    const pAlto  = p > 40;
    if (pBaixo) {
      recom.push({ icon: '🟠', titulo: 'Fósforo baixo', texto: `P = ${p} mg/dm³ — deficiência pode limitar desenvolvimento radicular e produção. Aplicar adubação fosfatada (superfosfato simples, MAP, DAP ou termofosfato).` });
    } else if (pAlto) {
      recom.push({ icon: '🔵', titulo: 'Fósforo elevado', texto: `P = ${p} mg/dm³ — níveis altos. Reduzir aplicação de fósforo por 1–2 safras para evitar fixação e desequilíbrio.` });
    } else {
      recom.push({ icon: '✅', titulo: 'Fósforo adequado', texto: `P = ${p} mg/dm³ — dentro da faixa ideal. Manter adubação de manutenção conforme produtividade esperada.` });
    }
  }

  // K (Potássio)
  if (k > 0) {
    if (k < 1.5) {
      recom.push({ icon: '🟠', titulo: 'Potássio baixo', texto: `K = ${k} mmolc/dm³ — deficiência pode reduzir qualidade dos grãos e resistência a doenças. Aplicar KCl ou K₂SO₄ conforme recomendação.` });
    } else if (k > 5) {
      recom.push({ icon: '🔵', titulo: 'Potássio elevado', texto: `K = ${k} mmolc/dm³ — nível alto. Reduzir aplicação de K e monitorar relação Ca:Mg:K no solo.` });
    }
  }

  // Al (Alumínio tóxico)
  if (al > 0 && al > 3) {
    recom.push({ icon: '🔴', titulo: 'Alumínio tóxico elevado', texto: `Al = ${al} mmolc/dm³ — toxidez pode inibir crescimento radicular. Aplicar calcário para neutralizar Al³⁺ (pH ≥ 5.5 geralmente neutraliza).` });
  }

  // Insumos já aplicados
  if (insumos.length > 0) {
    const tipos = [...new Set(insumos.map(i => i.tipoInsumo))];
    recom.push({ icon: '📦', titulo: 'Insumos base já aplicados neste talhão', texto: `Registros: ${insumos.length} lançamento(s) — tipos: ${tipos.join(', ')}. Verifique se as doses aplicadas estão compatíveis com as recomendações do laudo.` });
  }

  // Recomendação do laboratório
  if (analise.recomAdubacao) {
    recom.push({ icon: '🧪', titulo: 'Recomendação do Laboratório', texto: escapeHtml(analise.recomAdubacao) });
  }

  if (recom.length === 0) {
    recom.push({ icon: '✅', titulo: 'Solo em boas condições', texto: 'Com base nos dados disponíveis, o solo apresenta boas condições. Continue monitorando anualmente.' });
  }

  return recom;
}

async function _asConsultarIAParaTalhao(analise, talhao, insumos) {
  const iaBox = document.getElementById('asIaBox');
  if (!iaBox) return;

  const hasEdgeFunction = typeof SUPABASE_URL !== 'undefined' && typeof AuthService !== 'undefined';
  if (!hasEdgeFunction) {
    iaBox.innerHTML = `
      <div style="background:#f1f5f9; border-radius:10px; padding:16px; font-size:13px; color:#64748b; text-align:center;">
        <b>🤖 Análise aprofundada via IA</b> — Faça login para acessar recomendações avançadas via Agro-Copilot.
      </div>
    `;
    return;
  }

  try {
    const contexto = `
Análise de solo – Talhão: ${talhao?.nome || 'N/A'} | Cultura: ${talhao?.cultura || 'N/A'} | Área: ${talhao?.areaHa || 0} ha
Data coleta: ${analise.data} | Laboratório: ${analise.laboratorio || 'N/A'}
Resultados: pH=${analise.ph}, M.O.=${analise.mo}, P=${analise.p}, K=${analise.k}, Ca=${analise.ca}, Mg=${analise.mg},
Al=${analise.al}, H+Al=${analise.hAl}, V%=${analise.vPct}, m%=${analise.mPct}, CTC=${analise.ctc}
Textura: ${analise.textura || 'N/A'} | Areia: ${analise.areia}%, Silte: ${analise.silte}%, Argila: ${analise.argila}%
Recom. Lab: Calagem ${analise.recomCalagem || 0} t/ha, Gessagem ${analise.recomGessagem || 0} t/ha
Adubação recomendada: ${analise.recomAdubacao || 'Não informado'}
Insumos base já aplicados: ${insumos.length} lançamentos (${insumos.map(i=>i.tipoInsumo).join(', ') || 'nenhum'})
`.trim();

    const prompt = `Como agrônomo especialista, analise este laudo de solo e forneça recomendações técnicas detalhadas:\n\n${contexto}\n\nForneça: 1) Diagnóstico completo do estado nutricional, 2) Programa de calagem/gessagem, 3) Plano de adubação de base (NPK + micronutrientes), 4) Alerta sobre deficiências críticas, 5) Estratégia de manutenção para próximas safras. Seja específico em doses e produtos.`;

    const session = await AuthService.getSession();
    if (!session) throw new Error('Faça login para usar a IA.');

    const response = await fetch(SUPABASE_URL + '/functions/v1/openai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Você é um agrônomo especialista em fertilidade de solo e nutrição de plantas. Forneça recomendações técnicas precisas baseadas nos dados do laudo.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.3
      })
    });

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content || '';

    if (texto && iaBox) {
      iaBox.innerHTML = `
        <div class="ai-recom-box" style="margin-top:16px;">
          <h4>🤖 Análise Avançada — GPT-4o</h4>
          <div class="ai-recom-text">${escapeHtml(texto)}</div>
          <div style="margin-top:12px; text-align:right; font-size:11px; color:#6366f1;">
            Agro-Copilot IA • Análise de Solo • ${escapeHtml(talhao?.nome||'')}
          </div>
        </div>
      `;
    }
  } catch (e) {
    if (iaBox) {
      iaBox.innerHTML = `<div style="color:#ef4444; font-size:12px; padding:10px;">⚠️ Erro ao consultar IA: ${e.message}. Use o Copilot para análise manual.</div>`;
    }
  }
}

/**
 * Abre o Copilot com contexto pré-carregado da análise de solo
 * Chamado pelo botão "Aprofundar no Copilot" ou pelo link de integração
 */
function pageAnaliseSoloNoCopilot(talhaoId) {
  const db = getDB();
  const talhao = (db.talhoes || []).find(t => t.id === talhaoId);
  const analises = onlySafra(db.analiseSolo || []).filter(a => a.talhaoId === talhaoId).sort((a,b)=>b.data.localeCompare(a.data));
  const analise = analises[0];

  let query = talhao
    ? `Analise o solo do talhão "${talhao.nome}" (cultura: ${talhao.cultura || 'N/A'}, área: ${talhao.areaHa} ha).`
    : 'Análise de solo do talhão selecionado.';

  if (analise) {
    query += ` Últimos resultados do laudo: pH=${analise.ph}, V%=${analise.vPct}%, M.O.=${analise.mo} g/dm³, P=${analise.p} mg/dm³, K=${analise.k} mmolc/dm³. `;
    if (analise.recomCalagem) query += `Calagem recomendada: ${analise.recomCalagem} t/ha. `;
    query += 'Quais as principais ações a tomar e qual o impacto esperado na produtividade?';
  }

  // Armazenar query para o Copilot usar
  sessionStorage.setItem('_copilotAutoQuery', query);
  window.location.href = 'copilot.html';
}
