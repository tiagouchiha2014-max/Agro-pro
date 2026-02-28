/* ============================================================
   AGRO PRO — Propriedade v9.1
   Página unificada: Safras · Fazendas · Talhões em abas visuais
   ============================================================ */

function pagePropriedade(tabInicial) {
  renderShell('propriedade', '🏡 Minha Propriedade', 'Safras, fazendas e talhões em um só lugar');

  const content = document.getElementById('content');
  const activeTab = tabInicial || localStorage.getItem('prop_tab') || 'safras';

  // ── Tabs ──────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'safras',   icon: '🌱', label: 'Safras'   },
    { key: 'fazendas', icon: '🌾', label: 'Fazendas' },
    { key: 'talhoes',  icon: '🧭', label: 'Talhões'  },
  ];

  const tabsHtml = tabs.map(t => `
    <button
      class="prop-tab ${t.key === activeTab ? 'active' : ''}"
      data-tab="${t.key}"
      style="
        flex: 1;
        padding: 11px 16px;
        border: none;
        background: ${t.key === activeTab ? 'var(--brand)' : 'transparent'};
        color: ${t.key === activeTab ? '#fff' : 'var(--text-muted)'};
        font-size: 13.5px;
        font-weight: ${t.key === activeTab ? '700' : '500'};
        font-family: var(--font);
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: background var(--t-fast), color var(--t-fast);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        white-space: nowrap;
      "
    >${t.icon} ${t.label}</button>
  `).join('');

  content.innerHTML = `
    <div class="section page-enter">
      <!-- Tab bar -->
      <div style="
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 4px;
        display: flex;
        gap: 4px;
        box-shadow: var(--shadow-sm);
      ">${tabsHtml}</div>

      <!-- Tab content -->
      <div id="propContent"></div>
    </div>
  `;

  // Listeners de abas
  document.querySelectorAll('.prop-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      localStorage.setItem('prop_tab', tab);
      pagePropriedade(tab);
    });
  });

  // Renderizar aba ativa
  if      (activeTab === 'safras')   _renderSafrasTab();
  else if (activeTab === 'fazendas') _renderFazendasTab();
  else if (activeTab === 'talhoes')  _renderTalhoesTab();
}

/* ══════════════════════════════════════════════════════
   ABA: SAFRAS
══════════════════════════════════════════════════════ */
function _renderSafrasTab() {
  const wrap = document.getElementById('propContent');
  if (!wrap) return;

  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns:340px 1fr; gap:var(--space-5); align-items:start;">

      <!-- Formulário -->
      <div class="card">
        <h3>🌱 Nova Safra</h3>
        <div class="help">Cada safra tem seus próprios talhões, estoque e aplicações.</div>
        <form id="frmSafra" class="formGrid" style="margin-top:var(--space-4);">
          <div class="form-group full">
            <small>Nome da safra *</small>
            <input class="input" name="nome" required placeholder="Ex: Safra 2026/27">
          </div>
          <div class="form-group">
            <small>Data início</small>
            <input class="input" name="dataInicio" type="date" value="${nowISO()}">
          </div>
          <div class="form-group">
            <small>Data fim</small>
            <input class="input" name="dataFim" type="date">
          </div>
          <div class="form-group full">
            <small>Observações</small>
            <textarea class="textarea" name="observacoes" rows="2" placeholder="Opcional"></textarea>
          </div>
          <div class="full" style="display:flex; justify-content:flex-end;">
            <button class="btn primary" type="submit">+ Adicionar safra</button>
          </div>
        </form>
      </div>

      <!-- Lista de safras -->
      <div class="card">
        <h3>📋 Safras cadastradas</h3>
        <div id="safrasList"></div>
      </div>
    </div>

    <!-- Botão CSV -->
    <div style="display:flex; justify-content:flex-end; margin-top:var(--space-2);">
      <button class="btn" id="btnExportSafrasCSV">📥 Exportar CSV</button>
    </div>
  `;

  function renderSafras() {
    const db = getDB();
    const safraId = getSafraId();
    const list = document.getElementById('safrasList');
    if (!db.safras.length) {
      list.innerHTML = emptyState('🌱', 'Nenhuma safra cadastrada', 'Crie sua primeira safra para começar a usar o Agro Pro.');
      return;
    }
    list.innerHTML = db.safras.slice().reverse().map(s => `
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        gap:var(--space-4); padding:var(--space-4);
        border:1px solid ${s.id === safraId ? 'var(--brand)' : 'var(--border)'};
        background:${s.id === safraId ? 'var(--brand-subtle)' : 'var(--surface)'};
        border-radius:var(--radius-sm); margin-bottom:var(--space-2);
        transition: all var(--t-fast);
      ">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:14px; color:var(--text); display:flex; align-items:center; gap:8px;">
            ${escapeHtml(s.nome)}
            ${s.id === safraId ? '<span class="tag tag-success" style="font-size:10px;">Ativa</span>' : ''}
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">
            ${s.dataInicio ? `${s.dataInicio} → ${s.dataFim || 'em andamento'}` : 'Sem datas definidas'}
            ${s.observacoes ? ` · ${clampStr(s.observacoes, 40)}` : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-shrink:0;">
          ${s.id !== safraId ? `<button class="btn" style="font-size:12px; padding:6px 12px;" onclick="window.__usarSafra('${s.id}')">Ativar</button>` : ''}
          ${db.safras.length > 1 ? `<button class="btn danger" onclick="window.__delSafra('${s.id}')">Excluir</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  window.__usarSafra = (id) => {
    setSafraId(id);
    toast('🌱 Safra ativada', 'Filtrando dados para a safra selecionada.');
    setTimeout(() => location.reload(), 300);
  };

  window.__delSafra = (id) => {
    const db = getDB();
    if (db.safras.length <= 1) { toast('Atenção', 'É necessário manter pelo menos 1 safra.'); return; }
    if (!confirm('Excluir safra e TODOS os dados dela? (fazendas, talhões, aplicações)\nEssa ação não pode ser desfeita.')) return;
    db.safras = db.safras.filter(x => x.id !== id);
    ['fazendas','talhoes','produtos','estoque','equipe','maquinas','clima','aplicacoes',
     'combustivel','dieselEntradas','dieselEstoque','lembretes','pragas','colheitas','manutencoes','insumosBase']
      .forEach(k => db[k] = (db[k] || []).filter(x => x.safraId !== id));
    if (getSafraId() === id) db.session.safraId = db.safras[0].id;
    setDB(db);
    toast('Safra excluída', 'Todos os dados foram removidos.');
    setTimeout(() => location.reload(), 300);
  };

  document.getElementById('frmSafra').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const db = getDB();
    const obj = {
      id: uid('saf'), nome: fd.get('nome').trim(),
      dataInicio: fd.get('dataInicio') || nowISO(),
      dataFim: fd.get('dataFim') || '', ativa: true,
      observacoes: fd.get('observacoes') || ''
    };
    db.safras.push(obj);
    setDB(db);
    setSafraId(obj.id);
    e.target.reset();
    document.querySelector('[name="dataInicio"]').value = nowISO();
    toast('🌱 Safra criada', `"${obj.nome}" está ativa agora.`);
    renderSafras();
  });

  document.getElementById('btnExportSafrasCSV').addEventListener('click', () => {
    downloadText(`safras-${nowISO()}.csv`, toCSV(getDB().safras));
    toast('Exportado', 'CSV de safras baixado.');
  });

  renderSafras();
}

/* ══════════════════════════════════════════════════════
   ABA: FAZENDAS
══════════════════════════════════════════════════════ */
function _renderFazendasTab() {
  const wrap = document.getElementById('propContent');
  if (!wrap) return;
  const db = getDB();
  const safraId = getSafraId();

  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns:340px 1fr; gap:var(--space-5); align-items:start;">

      <!-- Formulário -->
      <div class="card">
        <h3>🌾 Nova Fazenda</h3>
        <div class="help">Cadastre as unidades produtivas da safra atual.</div>
        <form id="frmFazenda" class="formGrid" style="margin-top:var(--space-4);">
          <div class="form-group full">
            <small>Nome da fazenda *</small>
            <input class="input" name="nome" required placeholder="Ex: Fazenda Santa Fé">
          </div>
          <div class="form-group">
            <small>Cidade</small>
            <input class="input" name="cidade" placeholder="Ex: Sorriso">
          </div>
          <div class="form-group">
            <small>UF</small>
            <input class="input" name="uf" placeholder="MT" maxlength="2" style="text-transform:uppercase">
          </div>
          <div class="form-group full">
            <small>Área total (ha)</small>
            <input class="input" name="areaHa" type="number" step="0.1" placeholder="0.0">
          </div>
          <div class="form-group">
            <small>Latitude</small>
            <input class="input" name="latitude" placeholder="-12.5489">
          </div>
          <div class="form-group">
            <small>Longitude</small>
            <input class="input" name="longitude" placeholder="-55.7256">
          </div>
          <div class="form-group full">
            <small>Observações</small>
            <textarea class="textarea" name="observacoes" rows="2"></textarea>
          </div>
          <div class="full" style="display:flex; justify-content:flex-end;">
            <button class="btn primary" type="submit">+ Adicionar fazenda</button>
          </div>
        </form>
      </div>

      <!-- Cards de fazendas -->
      <div>
        <h3 style="font-size:14px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.6px; margin-bottom:var(--space-4);">Fazendas cadastradas</h3>
        <div id="fazendasGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:var(--space-4);"></div>
      </div>
    </div>
  `;

  function renderFazendas() {
    const db2 = getDB();
    const rows = onlySafra(db2.fazendas);
    const grid = document.getElementById('fazendasGrid');
    if (!rows.length) {
      grid.innerHTML = emptyState('🌾', 'Nenhuma fazenda cadastrada', 'Adicione a primeira fazenda da safra atual.', canCreateOnPage('fazendas') ? '' : '');
      return;
    }

    // Contar talhões por fazenda
    const talhoesPorFazenda = {};
    onlySafra(db2.talhoes || []).forEach(t => {
      talhoesPorFazenda[t.fazendaId] = (talhoesPorFazenda[t.fazendaId] || 0) + 1;
    });

    grid.innerHTML = rows.map(f => `
      <div class="card" style="padding:var(--space-5); position:relative; overflow:hidden; transition:transform var(--t-base), box-shadow var(--t-base);"
        onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='var(--shadow-md)'"
        onmouseout="this.style.transform=''; this.style.boxShadow=''">
        <div style="position:absolute; right:-8px; top:-8px; font-size:56px; opacity:.05; pointer-events:none;">🌾</div>
        <div style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;">
          ${escapeHtml(f.cidade || '—')}${f.uf ? ` · ${f.uf.toUpperCase()}` : ''}
        </div>
        <div style="font-size:17px; font-weight:800; color:var(--text); margin-bottom:10px; line-height:1.2;">${escapeHtml(f.nome)}</div>
        <div style="display:flex; gap:var(--space-4); flex-wrap:wrap; margin-bottom:var(--space-4);">
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:800; color:var(--brand);">${f.areaHa ? num(f.areaHa, 0) : '—'}</div>
            <div style="font-size:10px; color:var(--text-muted); font-weight:600;">hectares</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:800; color:var(--brand);">${talhoesPorFazenda[f.id] || 0}</div>
            <div style="font-size:10px; color:var(--text-muted); font-weight:600;">talhões</div>
          </div>
        </div>
        ${f.latitude && f.longitude ? `
          <a href="https://www.google.com/maps?q=${f.latitude},${f.longitude}" target="_blank"
            style="font-size:11.5px; color:var(--brand); text-decoration:none; display:flex; align-items:center; gap:4px; margin-bottom:var(--space-3);">
            📍 Ver no mapa
          </a>` : ''}
        ${f.observacoes ? `<p style="font-size:12px; color:var(--text-muted); margin-bottom:var(--space-3); line-height:1.5;">${escapeHtml(clampStr(f.observacoes, 60))}</p>` : ''}
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" style="font-size:12px; padding:6px 12px; flex:1;"
            onclick="localStorage.setItem('prop_tab','talhoes'); localStorage.setItem('prop_faz_filter','${f.id}'); pagePropriedade('talhoes')">
            🧭 Ver talhões
          </button>
          ${canDeleteOnPage('fazendas') ? `<button class="btn danger" onclick="window.__delFaz('${f.id}')">Excluir</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  window.__delFaz = (id) => {
    if (!confirm('Excluir esta fazenda? Os talhões vinculados também serão removidos.')) return;
    const db2 = getDB();
    db2.fazendas = db2.fazendas.filter(x => x.id !== id);
    db2.talhoes  = (db2.talhoes || []).filter(x => x.fazendaId !== id);
    setDB(db2);
    toast('Fazenda excluída', 'E os talhões vinculados.');
    renderFazendas();
  };

  document.getElementById('frmFazenda').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canCreateOnPage('fazendas')) { toast('Acesso restrito', 'Seu perfil não pode cadastrar fazendas.'); return; }
    const fd = new FormData(e.target);
    const db2 = getDB();
    const limites = getPlanLimits();
    const existentes = onlySafra(db2.fazendas).length;
    if (existentes >= limites.fazendas) {
      toast('Limite atingido', `O plano ${planoAtual} permite ${limites.fazendas} fazenda(s). Faça upgrade para continuar.`);
      return;
    }
    const obj = {
      id: uid('faz'), safraId: getSafraId(),
      nome: fd.get('nome').trim(), cidade: fd.get('cidade') || '',
      uf: (fd.get('uf') || '').toUpperCase(),
      areaHa: Number(fd.get('areaHa') || 0),
      latitude: fd.get('latitude') || '', longitude: fd.get('longitude') || '',
      observacoes: fd.get('observacoes') || ''
    };
    db2.fazendas.push(obj);
    setDB(db2);
    e.target.reset();
    toast('🌾 Fazenda adicionada', `"${obj.nome}" cadastrada com sucesso.`);
    renderFazendas();
  });

  renderFazendas();
}

/* ══════════════════════════════════════════════════════
   ABA: TALHÕES
══════════════════════════════════════════════════════ */
function _renderTalhoesTab() {
  const wrap = document.getElementById('propContent');
  if (!wrap) return;
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);

  // Filtro de fazenda guardado da aba Fazendas
  const prefiltro = localStorage.getItem('prop_faz_filter') || '';
  localStorage.removeItem('prop_faz_filter');

  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns:340px 1fr; gap:var(--space-5); align-items:start;">

      <!-- Formulário -->
      <div class="card">
        <h3>🧭 Novo Talhão</h3>
        <div class="help">Área, cultura e dados de campo por talhão.</div>
        <form id="frmTalhao" class="formGrid" style="margin-top:var(--space-4);">
          <div class="form-group full">
            <small>Fazenda *</small>
            <select class="select" name="fazendaId" required>
              ${fazendas.length
                ? fazendas.map(f => `<option value="${f.id}" ${f.id === prefiltro ? 'selected' : ''}>${escapeHtml(f.nome)}</option>`).join('')
                : '<option value="" disabled>— Cadastre uma fazenda primeiro —</option>'}
            </select>
          </div>
          <div class="form-group full">
            <small>Nome do talhão *</small>
            <input class="input" name="nome" required placeholder="Ex: Talhão 01 Norte">
          </div>
          <div class="form-group">
            <small>Área (ha)</small>
            <input class="input" name="areaHa" type="number" step="0.1" placeholder="0.0">
          </div>
          <div class="form-group">
            <small>Cultura</small>
            <input class="input" name="cultura" placeholder="Ex: Soja">
          </div>
          <div class="form-group">
            <small>Solo</small>
            <input class="input" name="solo" placeholder="Ex: Argiloso">
          </div>
          <div class="form-group">
            <small>Safra ref.</small>
            <input class="input" name="safra" placeholder="Ex: 2025/26">
          </div>
          <div class="form-group full">
            <small>Coordenadas</small>
            <input class="input" name="coordenadas" placeholder="Opcional">
          </div>
          <div class="form-group full">
            <small>Observações</small>
            <textarea class="textarea" name="observacoes" rows="2"></textarea>
          </div>
          <div class="full" style="display:flex; justify-content:flex-end;">
            <button class="btn primary" type="submit" ${!fazendas.length ? 'disabled' : ''}>+ Adicionar talhão</button>
          </div>
        </form>
      </div>

      <!-- Lista de talhões agrupados por fazenda -->
      <div>
        <!-- Filtro por fazenda -->
        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap;">
          <h3 style="font-size:14px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.6px; margin:0;">Talhões</h3>
          <select class="select" id="filtroFazendaTalhoes" style="max-width:200px; margin-left:auto;">
            <option value="">Todas as fazendas</option>
            ${fazendas.map(f => `<option value="${f.id}" ${f.id === prefiltro ? 'selected' : ''}>${escapeHtml(f.nome)}</option>`).join('')}
          </select>
          <button class="btn" id="btnExportTalhoesCSV" style="font-size:12px; padding:7px 14px;">📥 CSV</button>
        </div>
        <div id="talhoesContent"></div>

        <!-- Resumo de custos por talhão -->
        <div class="card" style="margin-top:var(--space-5);" id="custosTalhoes">
          <h3>💰 Custo por Talhão</h3>
          <div id="custosTalhoesContent"></div>
        </div>
      </div>
    </div>
  `;

  function renderTalhoes() {
    const db2 = getDB();
    const filtroFaz = document.getElementById('filtroFazendaTalhoes')?.value || '';
    let rows = onlySafra(db2.talhoes || []);
    if (filtroFaz) rows = rows.filter(t => t.fazendaId === filtroFaz);

    const tc = document.getElementById('talhoesContent');
    if (!rows.length) {
      tc.innerHTML = emptyState('🧭', 'Nenhum talhão cadastrado', 'Adicione o primeiro talhão para começar a gerir as áreas da fazenda.',
        canCreateOnPage('talhoes') ? '<p style="font-size:12.5px; color:var(--text-muted); margin-top:8px;">Use o formulário ao lado para cadastrar.</p>' : '');
      return;
    }

    // Agrupar por fazenda
    const grupos = {};
    rows.forEach(t => {
      const fNome = findNameById(onlySafra(db2.fazendas), t.fazendaId);
      if (!grupos[fNome]) grupos[fNome] = [];
      grupos[fNome].push(t);
    });

    tc.innerHTML = Object.entries(grupos).map(([fazNome, tList]) => `
      <div style="margin-bottom:var(--space-5);">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:var(--space-3); display:flex; align-items:center; gap:8px;">
          🌾 ${escapeHtml(fazNome)}
          <span class="tag tag-neutral">${tList.length} talhão${tList.length > 1 ? 'ões' : ''}</span>
          <span class="tag tag-info">${num(tList.reduce((s,t)=>s+Number(t.areaHa||0),0),1)} ha total</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:var(--space-3);">
          ${tList.map(t => `
            <div class="card" style="padding:var(--space-4); border-left:3px solid var(--brand); transition:transform var(--t-fast);"
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform=''">
              <div style="font-weight:700; font-size:14px; color:var(--text); margin-bottom:6px;">${escapeHtml(t.nome || '—')}</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:10px;">
                <div>
                  <div style="font-size:18px; font-weight:800; color:var(--brand);">${t.areaHa ? num(t.areaHa,1) : '—'}</div>
                  <div style="font-size:10px; color:var(--text-muted); font-weight:600;">ha</div>
                </div>
                <div>
                  <div style="font-size:14px; font-weight:700; color:var(--text-secondary);">${escapeHtml(t.cultura || '—')}</div>
                  <div style="font-size:10px; color:var(--text-muted); font-weight:600;">cultura</div>
                </div>
              </div>
              ${t.solo ? `<div class="tag tag-neutral" style="margin-bottom:8px; font-size:10.5px;">${escapeHtml(t.solo)}</div>` : ''}
              ${canDeleteOnPage('talhoes') ? `<button class="btn danger" style="width:100%;" onclick="window.__delTalProp('${t.id}')">Excluir</button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Custos por talhão
    if (canSeeFinanceiro()) {
      const custos = calcCustosPorTalhao(db2);
      const filtered = filtroFaz ? custos.filter(r => findNameById(onlySafra(db2.fazendas),
        (onlySafra(db2.talhoes).find(t=>t.nome===r.talhao)||{}).fazendaId) === document.getElementById('filtroFazendaTalhoes').options[document.getElementById('filtroFazendaTalhoes').selectedIndex]?.text)
        : custos;
      const ccWrap = document.getElementById('custosTalhoesContent');
      if (ccWrap) {
        ccWrap.innerHTML = custos.length
          ? `<div class="tableWrap" style="margin:0; border:none; box-shadow:none;">
              <table>
                <thead><tr><th>Talhão</th><th>Fazenda</th><th>Área (ha)</th><th>Custo Total</th><th>Custo/ha</th><th>Operações</th><th>Último</th></tr></thead>
                <tbody>
                  ${custos.map(r => `<tr>
                    <td><b>${escapeHtml(r.talhao)}</b></td>
                    <td>${escapeHtml(r.fazenda)}</td>
                    <td>${num(r.areaHa||0,1)}</td>
                    <td class="highlight-value">${kbrl(r.custoTotal||0)}</td>
                    <td>${kbrl(r.custoHa||0)}</td>
                    <td>${r.ops||0}</td>
                    <td>${r.last||'—'}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`
          : emptyState('💰', 'Sem dados de custo', 'Registre aplicações e operações para visualizar os custos por talhão.');
      }
    } else {
      const ccWrap = document.getElementById('custosTalhoesContent');
      if (ccWrap) ccWrap.innerHTML = `<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:var(--space-6);">🔒 Dados financeiros disponíveis apenas para administradores.</p>`;
    }
  }

  window.__delTalProp = (id) => {
    if (!confirm('Excluir este talhão?')) return;
    const db2 = getDB();
    db2.talhoes = (db2.talhoes || []).filter(x => x.id !== id);
    setDB(db2);
    toast('Talhão excluído', '');
    renderTalhoes();
  };

  document.getElementById('filtroFazendaTalhoes')?.addEventListener('change', renderTalhoes);

  document.getElementById('frmTalhao').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canCreateOnPage('talhoes')) { toast('Acesso restrito', 'Seu perfil não pode cadastrar talhões.'); return; }
    const fd = new FormData(e.target);
    const db2 = getDB();
    const limites = getPlanLimits();
    if ((onlySafra(db2.talhoes||[]).length) >= limites.talhoes) {
      toast('Limite atingido', `O plano ${planoAtual} permite ${limites.talhoes} talhão(ões). Faça upgrade.`);
      return;
    }
    const obj = {
      id: uid('tal'), safraId: getSafraId(),
      fazendaId: fd.get('fazendaId'),
      nome: fd.get('nome').trim(),
      areaHa: Number(fd.get('areaHa') || 0),
      cultura: fd.get('cultura') || '',
      safra: fd.get('safra') || '',
      solo: fd.get('solo') || '',
      coordenadas: fd.get('coordenadas') || '',
      observacoes: fd.get('observacoes') || ''
    };
    db2.talhoes = db2.talhoes || [];
    db2.talhoes.push(obj);
    setDB(db2);
    e.target.reset();
    toast('🧭 Talhão adicionado', `"${obj.nome}" cadastrado.`);
    renderTalhoes();
  });

  document.getElementById('btnExportTalhoesCSV')?.addEventListener('click', () => {
    downloadText(`talhoes-${nowISO()}.csv`, toCSV(onlySafra(getDB().talhoes || [])));
    toast('Exportado', 'CSV de talhões baixado.');
  });

  renderTalhoes();
}

// Compat: manter as funções originais apontando para a nova página
function pageSafras()   { pagePropriedade('safras');   }
function pageFazendas() { pagePropriedade('fazendas'); }
function pageTalhoes()  { pagePropriedade('talhoes');  }
