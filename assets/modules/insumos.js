/* ============================================================
   AGRO PRO — Insumos v9.3
   Página unificada: Produtos · Estoque em abas visuais
   ============================================================ */

function pageInsumos(tabInicial) {
  renderShell('insumos', '🧪 Insumos', 'Produtos e estoque em um só lugar');

  const content = document.getElementById('content');
  const activeTab = tabInicial || localStorage.getItem('insumos_tab') || 'produtos';

  const tabs = [
    { key: 'produtos', icon: '🧪', label: 'Produtos'  },
    { key: 'estoque',  icon: '📦', label: 'Estoque'   },
  ];

  const tabsHtml = tabs.map(t => `
    <button
      class="prop-tab ${t.key === activeTab ? 'active' : ''}"
      data-tab="${t.key}"
    >${t.icon} <span class="tab-label">${t.label}</span></button>
  `).join('');

  content.innerHTML = `
    <div class="section page-enter">
      <div class="prop-tab-bar">${tabsHtml}</div>
      <div id="insumosContent"></div>
    </div>
  `;

  document.querySelectorAll('.prop-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      localStorage.setItem('insumos_tab', tab);
      pageInsumos(tab);
    });
  });

  if      (activeTab === 'produtos') _renderProdutosTab();
  else if (activeTab === 'estoque')  _renderEstoqueTab();
}

/* ══════════════════════════════════════════════════════
   ABA: PRODUTOS
══════════════════════════════════════════════════════ */
function _renderProdutosTab() {
  const wrap = document.getElementById('insumosContent');
  if (!wrap) return;

  const db = getDB();
  const produtos = onlySafra(db.produtos || []);

  const podeEditar = canCreateOnPage('produtos');

  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns:360px 1fr; gap:var(--space-5); align-items:start;">

      <!-- Formulário -->
      <div class="card ${podeEditar ? '' : 'card--disabled'}" id="formProdCard">
        <h3>🧪 Novo Produto</h3>
        <div class="help">Defensivos, sementes, fertilizantes e outros insumos da safra.</div>
        <form id="frmProduto" class="formGrid" style="margin-top:var(--space-4);">
          <div class="form-group">
            <small>Tipo *</small>
            <input class="input" name="tipo" required placeholder="Herbicida / Fungicida...">
          </div>
          <div class="form-group">
            <small>Nome comercial *</small>
            <input class="input" name="nome" required placeholder="Ex: Roundup WG">
          </div>
          <div class="form-group">
            <small>Ingrediente ativo</small>
            <input class="input" name="ingrediente" placeholder="Ex: Glifosato">
          </div>
          <div class="form-group">
            <small>Fabricante</small>
            <input class="input" name="fabricante" placeholder="Ex: Bayer">
          </div>
          <div class="form-group">
            <small>Registro/MAPA</small>
            <input class="input" name="registro" placeholder="Ex: 01234">
          </div>
          <div class="form-group">
            <small>Preço por unidade (R$)</small>
            <input class="input" name="preco" type="number" step="0.01" placeholder="0,00">
          </div>
          <div class="form-group">
            <small>Unidade padrão</small>
            <input class="input" name="unidade" placeholder="L / kg / sc">
          </div>
          <div class="form-group">
            <small>Carência (dias)</small>
            <input class="input" name="carenciaDias" type="number" placeholder="0">
          </div>
          <div class="form-group">
            <small>Reentrada (horas)</small>
            <input class="input" name="reentradaHoras" type="number" placeholder="0">
          </div>
          <div class="form-group full">
            <small>Pragas alvo (separadas por vírgula)</small>
            <input class="input" name="pragasAlvo" placeholder="ferrugem, lagarta, broca...">
          </div>
          <div class="form-group full">
            <small>Observações</small>
            <textarea class="textarea" name="obs" rows="2"></textarea>
          </div>
          <div class="full" style="display:flex; justify-content:flex-end;">
            <button class="btn primary" type="submit" ${podeEditar ? '' : 'disabled'}>+ Adicionar produto</button>
          </div>
        </form>
      </div>

      <!-- Lista de produtos -->
      <div>
        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap;">
          <h3 style="font-size:14px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.6px; margin:0;">
            Produtos cadastrados
          </h3>
          <input class="input" id="filtroProduto" placeholder="🔍 Filtrar por nome ou tipo..." style="max-width:220px; margin-left:auto; font-size:13px;">
          <button class="btn" id="btnExportProdCSV" style="font-size:12px; padding:7px 14px;">📥 CSV</button>
        </div>
        <div id="produtosGrid"></div>
      </div>
    </div>
  `;

  function renderProdutos() {
    const db2 = getDB();
    const filtro = (document.getElementById('filtroProduto')?.value || '').toLowerCase();
    let rows = onlySafra(db2.produtos || []);
    if (filtro) rows = rows.filter(p =>
      (p.nome || '').toLowerCase().includes(filtro) ||
      (p.tipo || '').toLowerCase().includes(filtro) ||
      (p.ingrediente || '').toLowerCase().includes(filtro)
    );

    const grid = document.getElementById('produtosGrid');
    if (!rows.length) {
      grid.innerHTML = emptyState('🧪', 'Nenhum produto cadastrado',
        podeEditar
          ? 'Cadastre o primeiro produto usando o formulário ao lado.'
          : 'Nenhum produto disponível para esta safra.');
      return;
    }

    // Agrupa por tipo
    const grupos = {};
    rows.forEach(p => {
      const t = p.tipo || 'Sem tipo';
      if (!grupos[t]) grupos[t] = [];
      grupos[t].push(p);
    });

    grid.innerHTML = Object.entries(grupos).map(([tipo, lista]) => `
      <div style="margin-bottom:var(--space-5);">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;
          letter-spacing:.6px; margin-bottom:var(--space-3); display:flex; align-items:center; gap:8px;">
          🧪 ${escapeHtml(tipo)}
          <span class="tag tag-neutral">${lista.length}</span>
        </div>
        <div class="tableWrap" style="margin:0;">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ingrediente</th>
                <th>Preço</th>
                <th>Unid.</th>
                <th>Carência</th>
                <th class="noPrint">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${lista.map(p => `
                <tr>
                  <td>
                    <b>${escapeHtml(p.nome || '—')}</b>
                    ${p.fabricante ? `<br><span style="font-size:11px; color:var(--text-muted);">${escapeHtml(p.fabricante)}</span>` : ''}
                  </td>
                  <td>${escapeHtml(p.ingrediente || '—')}</td>
                  <td class="highlight-value">${p.preco ? kbrl(p.preco) : '—'}</td>
                  <td>${escapeHtml(p.unidade || '—')}</td>
                  <td>${p.carenciaDias ? `${p.carenciaDias}d` : '—'}</td>
                  <td class="noPrint" style="white-space:nowrap;">
                    <button class="btn" style="font-size:11.5px; padding:5px 10px;"
                      onclick="localStorage.setItem('insumos_tab','estoque'); pageInsumos('estoque')">
                      📦 Estoque
                    </button>
                    ${canDeleteOnPage('produtos') ? `
                      <button class="btn danger" onclick="window.__delProd('${p.id}')">Excluir</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  }

  window.__delProd = (id) => {
    if (!confirm('Excluir este produto? O estoque vinculado também será removido.')) return;
    const db2 = getDB();
    db2.produtos  = (db2.produtos  || []).filter(x => x.id !== id);
    db2.estoque   = (db2.estoque   || []).filter(x => x.produtoId !== id);
    setDB(db2);
    toast('Produto excluído', 'Estoque vinculado também removido.');
    renderProdutos();
  };

  document.getElementById('filtroProduto')?.addEventListener('input', renderProdutos);

  if (podeEditar) {
    document.getElementById('frmProduto').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd  = new FormData(e.target);
      const db2 = getDB();
      const obj = {
        id:             uid('prd'),
        safraId:        getSafraId(),
        tipo:           fd.get('tipo').trim(),
        nome:           fd.get('nome').trim(),
        ingrediente:    fd.get('ingrediente') || '',
        fabricante:     fd.get('fabricante')  || '',
        registro:       fd.get('registro')    || '',
        preco:          Number(fd.get('preco') || 0),
        unidade:        fd.get('unidade')      || '',
        carenciaDias:   Number(fd.get('carenciaDias')   || 0),
        reentradaHoras: Number(fd.get('reentradaHoras') || 0),
        pragasAlvo:     (fd.get('pragasAlvo') || '').split(',').map(s => s.trim()).filter(Boolean),
        obs:            fd.get('obs') || ''
      };
      db2.produtos = db2.produtos || [];
      db2.produtos.push(obj);
      setDB(db2);
      e.target.reset();
      toast('🧪 Produto cadastrado', `"${obj.nome}" adicionado.`);
      renderProdutos();
    });
  }

  document.getElementById('btnExportProdCSV')?.addEventListener('click', () => {
    downloadText(`produtos-${nowISO()}.csv`, toCSV(onlySafra(getDB().produtos || [])));
    toast('Exportado', 'CSV de produtos baixado.');
  });

  renderProdutos();
}

/* ══════════════════════════════════════════════════════
   ABA: ESTOQUE
══════════════════════════════════════════════════════ */
function _renderEstoqueTab() {
  const wrap = document.getElementById('insumosContent');
  if (!wrap) return;

  const db       = getDB();
  const produtos = onlySafra(db.produtos || []);

  const podeEditar = canCreateOnPage('estoque');

  const optsProd = produtos.length
    ? produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)}</option>`).join('')
    : '<option value="" disabled>— Cadastre produtos primeiro —</option>';

  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns:360px 1fr; gap:var(--space-5); align-items:start;">

      <!-- Formulário de entrada -->
      <div class="card">
        <h3>📦 Entrada de Estoque</h3>
        <div class="help">Se o produto já existir no mesmo depósito, a quantidade será somada.</div>
        <form id="frmEstoque" class="formGrid" style="margin-top:var(--space-4);">
          <div class="form-group full">
            <small>Produto *</small>
            <select class="select" name="produtoId" id="selProduto" required>
              <option value="">Selecione...</option>
              ${optsProd}
            </select>
          </div>
          <div class="form-group">
            <small>Depósito</small>
            <input class="input" name="deposito" placeholder="Central" value="Central">
          </div>
          <div class="form-group">
            <small>Lote</small>
            <input class="input" name="lote" placeholder="Opcional">
          </div>
          <div class="form-group">
            <small>Validade</small>
            <input class="input" name="validade" type="date">
          </div>
          <div class="form-group">
            <small>Quantidade *</small>
            <input class="input" name="qtd" type="number" step="0.01" required placeholder="0">
          </div>
          <div class="form-group">
            <small>Unidade</small>
            <input class="input" name="unidade" placeholder="Automático" id="unidadeAuto" readonly
              style="background:var(--bg-subtle); color:var(--text-muted);">
          </div>
          <div class="form-group full">
            <small>Observações</small>
            <textarea class="textarea" name="obs" rows="2"></textarea>
          </div>
          <div class="full" style="display:flex; justify-content:flex-end;">
            <button class="btn primary" type="submit" ${podeEditar ? '' : 'disabled'}>+ Adicionar ao estoque</button>
          </div>
        </form>

        <!-- Separador -->
        <div style="border-top:1px solid var(--border); margin:var(--space-4) 0;"></div>

        <!-- Reabastecer rápido -->
        <h3 style="font-size:13.5px; margin-bottom:var(--space-3);">⚡ Reabastecimento Rápido</h3>
        <div class="help">Adicione quantidade a um item já registrado.</div>
        <div style="display:flex; flex-direction:column; gap:var(--space-2); margin-top:var(--space-3);" id="reabList"></div>
      </div>

      <!-- Tabela de estoque -->
      <div>
        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap;">
          <h3 style="font-size:14px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.6px; margin:0;">
            Itens em estoque
          </h3>
          <input class="input" id="filtroEstoque" placeholder="🔍 Filtrar..." style="max-width:200px; margin-left:auto; font-size:13px;">
          <button class="btn" id="btnExportEstCSV" style="font-size:12px; padding:7px 14px;">📥 CSV</button>
        </div>
        <div id="estoqueContent"></div>

        <!-- KPIs de estoque -->
        <div class="kpi" style="margin-top:var(--space-5);" id="estoqueKpis"></div>
      </div>
    </div>
  `;

  // Preencher unidade ao selecionar produto
  document.getElementById('selProduto')?.addEventListener('change', (e) => {
    const p = produtos.find(x => x.id === e.target.value);
    document.getElementById('unidadeAuto').value = p?.unidade || '';
  });

  function renderEstoque() {
    const db2    = getDB();
    const filtro = (document.getElementById('filtroEstoque')?.value || '').toLowerCase();
    let rows     = onlySafra(db2.estoque || []);
    if (filtro) rows = rows.filter(r => {
      const p = produtos.find(x => x.id === r.produtoId);
      return (p?.nome || '').toLowerCase().includes(filtro) ||
             (r.deposito || '').toLowerCase().includes(filtro);
    });

    const ec = document.getElementById('estoqueContent');

    if (!rows.length) {
      ec.innerHTML = emptyState('📦', 'Estoque vazio',
        'Adicione produtos ao estoque usando o formulário ao lado.');
      // KPIs zerados — não mostrar "0" vazio
      document.getElementById('estoqueKpis').innerHTML = '';
      return;
    }

    // Alertas de validade
    const hoje = new Date();
    const alertas = rows.filter(r => {
      if (!r.validade) return false;
      const diff = (new Date(r.validade) - hoje) / 86400000;
      return diff <= 30 && diff >= 0;
    });

    ec.innerHTML = `
      ${alertas.length ? `
        <div class="free-banner" style="margin-bottom:var(--space-4);">
          ⚠️ <strong>${alertas.length} item(ns)</strong> com validade vencendo nos próximos 30 dias.
        </div>` : ''}
      <div class="tableWrap" style="margin:0;">
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
          <tbody>
            ${rows.map(r => {
              const p     = produtos.find(x => x.id === r.produtoId);
              const nome  = p ? `${p.nome} (${p.tipo})` : '(produto removido)';
              const diff  = r.validade ? (new Date(r.validade) - hoje) / 86400000 : null;
              const venc  = diff !== null && diff <= 30 && diff >= 0;
              const qtdNum= Number(r.quantidade_atual || 0);
              return `
                <tr ${venc ? 'style="background:var(--warning-bg);"' : ''}>
                  <td><b>${escapeHtml(nome)}</b></td>
                  <td>${escapeHtml(r.deposito || 'Central')}</td>
                  <td>${escapeHtml(r.lote || '—')}</td>
                  <td ${venc ? 'style="color:var(--warning); font-weight:700;"' : ''}>
                    ${r.validade || '—'}
                  </td>
                  <td><b>${num(qtdNum, 2)}</b></td>
                  <td>${escapeHtml(r.unidade || '—')}</td>
                  <td>${escapeHtml(r.obs || '—')}</td>
                  <td class="noPrint" style="white-space:nowrap;">
                    <button class="btn" style="font-size:11.5px; padding:5px 10px;"
                      onclick="window.__reabRapido('${r.id}')">➕</button>
                    ${canDeleteOnPage('estoque') ? `
                      <button class="btn danger" onclick="window.__delEst('${r.id}')">Excluir</button>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // KPIs
    const totalItens    = rows.length;
    const totalProdutos = new Set(rows.map(r => r.produtoId)).size;
    document.getElementById('estoqueKpis').innerHTML = `
      <div class="kpiCard">
        <div class="kpiLabel">Itens no estoque</div>
        <div class="kpiValue">${totalItens}</div>
      </div>
      <div class="kpiCard">
        <div class="kpiLabel">Produtos distintos</div>
        <div class="kpiValue">${totalProdutos}</div>
      </div>
      ${alertas.length ? `
        <div class="kpiCard">
          <div class="kpiLabel">Vencendo em 30 dias</div>
          <div class="kpiValue" style="color:var(--warning);">${alertas.length}</div>
        </div>` : ''}
    `;

    // Lista reabastecimento rápido (top 5)
    const topRows = rows.slice(0, 5);
    const rl = document.getElementById('reabList');
    if (rl) {
      rl.innerHTML = topRows.map(r => {
        const p = produtos.find(x => x.id === r.produtoId);
        return `
          <div style="display:flex; align-items:center; justify-content:space-between;
            gap:var(--space-2); padding:var(--space-2) var(--space-3);
            background:var(--bg-subtle); border-radius:var(--radius-sm);">
            <span style="font-size:12.5px; color:var(--text); min-width:0; overflow:hidden;
              text-overflow:ellipsis; white-space:nowrap; flex:1;">
              ${escapeHtml(p?.nome || '—')}
            </span>
            <span class="tag tag-neutral" style="flex-shrink:0;">${num(Number(r.quantidade_atual||0),1)} ${r.unidade||''}</span>
            <button class="btn" style="font-size:11.5px; padding:4px 10px; flex-shrink:0;"
              onclick="window.__reabRapido('${r.id}')">+</button>
          </div>
        `;
      }).join('') + (rows.length > 5 ? `<p style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:6px;">e mais ${rows.length - 5} itens na tabela →</p>` : '');
    }
  }

  window.__reabRapido = (estoqueId) => {
    const db2  = getDB();
    const item = db2.estoque.find(s => s.id === estoqueId);
    if (!item) return;
    const p    = produtos.find(x => x.id === item.produtoId);
    const qtd  = prompt(`Quantidade a adicionar para "${p?.nome || 'item'}":`, '');
    if (qtd === null || qtd === '') return;
    const qtdN = parseFloat(qtd);
    if (isNaN(qtdN) || qtdN <= 0) { toast('Quantidade inválida', 'Informe um número positivo.'); return; }
    item.quantidade_atual = Number(item.quantidade_atual || 0) + qtdN;
    setDB(db2);
    toast('Reabastecido', `+${num(qtdN,2)} ${item.unidade || ''} adicionados.`);
    renderEstoque();
  };

  window.__delEst = (id) => {
    if (!confirm('Excluir este item do estoque?')) return;
    const db2 = getDB();
    db2.estoque = db2.estoque.filter(x => x.id !== id);
    setDB(db2);
    toast('Excluído', 'Item removido do estoque.');
    renderEstoque();
  };

  document.getElementById('filtroEstoque')?.addEventListener('input', renderEstoque);

  if (podeEditar) {
    document.getElementById('frmEstoque').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd       = new FormData(e.target);
      const produtoId = fd.get('produtoId');
      const deposito  = fd.get('deposito') || 'Central';
      const qtd       = Number(fd.get('qtd') || 0);
      const lote      = fd.get('lote')     || '';
      const validade  = fd.get('validade') || '';
      const obs       = fd.get('obs')      || '';

      if (!produtoId || qtd <= 0) {
        toast('Atenção', 'Selecione um produto e informe quantidade > 0.');
        return;
      }

      const db2    = getDB();
      const prod   = produtos.find(x => x.id === produtoId);
      if (!prod) return;

      const existente = db2.estoque.find(s =>
        s.safraId === getSafraId() &&
        s.produtoId === produtoId &&
        (s.deposito || 'Central') === deposito
      );

      if (existente) {
        existente.quantidade_atual = Number(existente.quantidade_atual || 0) + qtd;
        existente.obs = obs || existente.obs;
        if (lote)    existente.lote    = lote;
        if (validade) existente.validade = validade;
        toast('Estoque atualizado', `${prod.nome} — ${num(existente.quantidade_atual,2)} ${prod.unidade}`);
      } else {
        db2.estoque.push({
          id:               uid('stk'),
          safraId:          getSafraId(),
          produtoId,
          deposito,
          lote,
          validade,
          quantidade_atual: qtd,
          unidade:          prod.unidade || '',
          obs
        });
        toast('📦 Produto adicionado', `${prod.nome} registrado no estoque.`);
      }

      setDB(db2);
      e.target.reset();
      document.getElementById('unidadeAuto').value = '';
      renderEstoque();
    });
  }

  document.getElementById('btnExportEstCSV')?.addEventListener('click', () => {
    const db2 = getDB();
    const rows = onlySafra(db2.estoque || []).map(r => {
      const p = produtos.find(x => x.id === r.produtoId);
      return {
        Produto:    p ? p.nome : 'Desconhecido',
        Tipo:       p ? p.tipo : '',
        Depósito:   r.deposito || 'Central',
        Lote:       r.lote     || '',
        Validade:   r.validade || '',
        Quantidade: r.quantidade_atual || 0,
        Unidade:    r.unidade  || '',
        Observações:r.obs      || ''
      };
    });
    downloadText(`estoque-${nowISO()}.csv`, toCSV(rows));
    toast('Exportado', 'CSV de estoque baixado.');
  });

  renderEstoque();
}

// Compat: manter as funções originais apontando para a nova página unificada
function pageProdutos() { pageInsumos('produtos'); }
function pageEstoque()  { pageInsumos('estoque');  }
