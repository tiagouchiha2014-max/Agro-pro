function pageDashboard() {
  const db = getDB();
  const safra = getSafraAtual();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const produtos = onlySafra(db.produtos);
  const aplicacoes = onlySafra(db.aplicacoes);
  const clima = onlySafra(db.clima);
  const lembretes = onlySafra(db.lembretes).filter(l => !l.concluido).slice(0, 5);
  const alertasPragas = gerarAlertasPragas(db).slice(0, 3);
  const colheitas = onlySafra(db.colheitas);

  const hoje = nowISO();
  const aplHoje = aplicacoes.filter(a => a.data === hoje).length;
  const chuvaHoje = clima.filter(c => c.data === hoje).reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const totalColhido = colheitas.reduce((s, c) => s + Number(c.producaoTotal || 0), 0);
  const recentApl = aplicacoes.slice().reverse().slice(0, 5);

  const content = document.getElementById("content");

  // ── KPI cards ──────────────────────────────────────────────────────────
  const safraCard = `
    <div class="card" style="background: linear-gradient(135deg, var(--brand-dark) 0%, var(--brand) 100%); color:#fff; border:none; overflow:hidden; position:relative;">
      <div style="position:absolute; right:-20px; top:-20px; font-size:90px; opacity:.07; pointer-events:none;">🌾</div>
      <h3 style="color:rgba(255,255,255,.55); border:none; padding:0; margin-bottom:8px; font-size:11px; text-transform:uppercase; letter-spacing:.6px;">Safra Atual</h3>
      <div class="big" style="color:#fff; font-size:22px;">${escapeHtml(safra?.nome || 'Nenhuma safra')}</div>
      <div class="sub" style="color:rgba(255,255,255,.6); margin-top:6px;">
        ${safra ? (safra.dataInicio ? safra.dataInicio + ' → ' + (safra.dataFim || 'em andamento') : 'Datas não definidas') : 'Crie uma safra para começar'}
      </div>
    </div>`;

  const talhoesCard = `
    <div class="card">
      <h3>🧭 Talhões</h3>
      <div class="big">${talhoes.length > 0 ? num(talhoes.length, 0) : '—'}</div>
      <div class="sub">${areaTotal > 0 ? `Área total: ${num(areaTotal, 1)} ha` : 'Nenhum talhão cadastrado'}</div>
    </div>`;

  const colheitasCard = `
    <div class="card">
      <h3>🌾 Produção Colhida</h3>
      <div class="big">
        ${totalColhido > 0
          ? `${num(totalColhido / 1000, 1)} <span style="font-size:16px; font-weight:400;">t</span>`
          : '<span class="text-muted" style="font-size:15px; font-weight:500;">Aguardando colheita</span>'}
      </div>
      <div class="sub">${colheitas.length > 0 ? `${colheitas.length} registro${colheitas.length > 1 ? 's' : ''} de colheita` : 'Nenhuma colheita registrada'}</div>
    </div>`;

  const chuvaCard = `
    <div class="card">
      <h3>🌧️ Chuva Hoje</h3>
      <div class="big">
        ${chuvaHoje > 0
          ? `${num(chuvaHoje, 1)} <span style="font-size:16px; font-weight:400;">mm</span>`
          : '<span class="text-muted" style="font-size:15px; font-weight:500;">Sem registro hoje</span>'}
      </div>
      <div class="sub">${aplHoje > 0 ? `${aplHoje} aplicação(ões) hoje` : 'Nenhuma aplicação hoje'}</div>
    </div>`;

  // ── Alertas de pragas ───────────────────────────────────────────────────
  const alertasHtml = alertasPragas.length
    ? alertasPragas.map(a => `
        <div style="
          padding: var(--space-4);
          background: var(--warning-bg);
          border-left: 3px solid var(--warning);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          margin-bottom: var(--space-3);
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
        ">
          <span style="font-size:18px; flex-shrink:0;">⚠️</span>
          <div>
            <div style="font-weight:700; font-size:13.5px; color:var(--warning);">${escapeHtml(a.mensagem)}</div>
            <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">${escapeHtml(a.detalhe || '')}</div>
          </div>
        </div>
      `).join('')
    : emptyState('🌿', 'Nenhum alerta de praga', 'Condições climáticas e aplicações estão dentro do esperado.', '');

  // ── Lembretes ───────────────────────────────────────────────────────────
  const lembretesHtml = lembretes.length
    ? lembretes.map(l => `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-2);
          background: var(--surface);
          transition: background var(--t-fast);
        " onmouseover="this.style.background='var(--brand-subtle)'" onmouseout="this.style.background='var(--surface)'">
          <div>
            <div style="font-weight:600; font-size:13.5px; color:var(--text);">${escapeHtml(l.mensagem)}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">📅 ${l.data || 'Sem data'}</div>
          </div>
          <button class="btn" style="font-size:12px; padding:6px 14px; flex-shrink:0; background:var(--brand); color:#fff; border:none;" onclick="concluirLembrete('${l.id}')">✓ Concluir</button>
        </div>
      `).join('')
    : emptyState('📋', 'Tudo em dia!', 'Você não tem lembretes pendentes no momento.');

  // ── Últimas aplicações ──────────────────────────────────────────────────
  const aplTableBody = recentApl.length
    ? recentApl.map(a => {
        const talhaoNome = findNameById(talhoes, a.talhaoId);
        const produto = a.produtos?.[0]?.produtoNome || '—';
        return `<tr>
          <td>${a.data}</td>
          <td>${escapeHtml(talhaoNome)}</td>
          <td>${num(a.areaHaAplicada, 1)} ha</td>
          <td>${escapeHtml(produto)}</td>
          ${canSeeFinanceiro() ? `<td class="highlight-value">${kbrl(a.custoTotal)}</td>` : ''}
        </tr>`;
      }).join('')
    : `<tr><td colspan="${canSeeFinanceiro() ? 5 : 4}" style="text-align:center; padding:32px;">
        <div class="empty-state" style="padding:var(--space-6);">
          <div class="empty-icon">🚜</div>
          <h3>Nenhuma aplicação registrada</h3>
          <p>Registre a primeira aplicação da safra para acompanhar aqui.</p>
          ${canCreateOnPage('aplicacoes') ? `<a href="aplicacoes.html" class="btn primary">+ Registrar Aplicação</a>` : ''}
        </div>
      </td></tr>`;

  content.innerHTML = `
    <div class="section page-enter">
      <!-- KPIs -->
      <div class="kpi">
        ${safraCard}
        ${talhoesCard}
        ${colheitasCard}
        ${chuvaCard}
      </div>

      <!-- Alerts + Reminders -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px,1fr)); gap:var(--space-5);">
        <div class="card">
          <h3>⚠️ Alertas de Pragas</h3>
          ${alertasHtml}
        </div>
        <div class="card">
          <h3>📋 Lembretes Pendentes</h3>
          ${lembretesHtml}
        </div>
      </div>

      <!-- Últimas aplicações -->
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:var(--space-4); border-bottom:1px solid var(--border); margin-bottom:var(--space-4);">
          <h3 style="margin:0; border:none; padding:0; font-size:14px; font-weight:700;">🚜 Últimas Aplicações</h3>
          ${canCreateOnPage('aplicacoes') ? `<a href="aplicacoes.html" class="btn" style="font-size:12px; padding:6px 14px;">Ver todas →</a>` : ''}
        </div>
        <div class="tableWrap" style="margin:0; border:none; box-shadow:none;">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Talhão</th>
                <th>Área</th>
                <th>Produto</th>
                ${canSeeFinanceiro() ? '<th>Custo</th>' : ''}
              </tr>
            </thead>
            <tbody>${aplTableBody}</tbody>
          </table>
        </div>
      </div>

      ${isSimplifiedDashboard() ? `
        <div class="card" style="background:var(--accent-subtle); border-left:3px solid var(--accent); padding: var(--space-4) var(--space-5);">
          <p style="margin:0; font-size:13.5px; color:var(--warning);">
            🔒 <b>Dashboard simplificado</b> — Perfil <b>${getRoleLabel()}</b>. Para acesso completo, fale com o administrador.
          </p>
        </div>
      ` : ''}
    </div>
  `;

  window.concluirLembrete = (id) => {
    const db2 = getDB();
    const lembrete = db2.lembretes.find(l => l.id === id);
    if (lembrete) lembrete.concluido = true;
    setDB(db2);
    toast("✓ Concluído", "Lembrete marcado como concluído.");
    pageDashboard();
  };
}
