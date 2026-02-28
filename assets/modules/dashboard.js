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
  const totalColhido = colheitas.reduce((s, c) => s + c.producaoTotal, 0);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="kpi">
      <div class="card" style="background: linear-gradient(135deg, #3b82f6, #1e3a8a); color:white;">
        <h3>🌱 Safra Atual</h3>
        <div class="big">${escapeHtml(safra?.nome || 'N/A')}</div>
        <div class="sub">${safra?.dataInicio || ''} a ${safra?.dataFim || ''}</div>
      </div>
      <div class="card">
        <h3>Talhões</h3>
        <div class="big">${talhoes.length}</div>
        <div class="sub">Área total: ${num(areaTotal, 1)} ha</div>
      </div>
      <div class="card">
        <h3>Produção Colhida</h3>
        <div class="big">${num(totalColhido, 0)} kg</div>
        <div class="sub">${colheitas.length} talhões colhidos</div>
      </div>
      <div class="card">
        <h3>Chuva (hoje)</h3>
        <div class="big">${num(chuvaHoje, 1)} mm</div>
        <div class="sub">Lançamento manual</div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>🚨 Alertas de Pragas</h3>
        ${alertasPragas.length ? alertasPragas.map(a => `
          <div style="padding:12px; margin:8px 0; background: rgba(244, 67, 54, 0.1); border-left:4px solid #f44336; border-radius:4px;">
            <b style="color:#f44336;">${escapeHtml(a.mensagem)}</b><br>
            <span style="color:#888; font-size:13px;">${escapeHtml(a.detalhe)}</span>
          </div>
        `).join('') : '<p style="color:#888;">Nenhum alerta no momento.</p>'}
      </div>

      <div class="card">
        <h3>📋 Lembretes Pendentes</h3>
        ${lembretes.length ? lembretes.map(l => `
          <div style="padding:12px; margin:8px 0; background: rgba(59, 130, 246, 0.1); border-left:4px solid #3b82f6; border-radius:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <b style="color:#3b82f6;">${escapeHtml(l.mensagem)}</b><br>
                <span style="color:#888; font-size:13px;">Data: ${l.data}</span>
              </div>
              <button class="btn" style="background:#3b82f6; color:white;" onclick="concluirLembrete('${l.id}')">Concluir</button>
            </div>
          </div>
        `).join('') : '<p style="color:#888;">Nenhum lembrete pendente.</p>'}
      </div>
    </div>

    <div class="tableWrap" style="margin-top:20px;">
      <h3>Últimas aplicações</h3>
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
        <tbody>
          ${aplicacoes.slice().reverse().slice(0, 5).map(a => {
            const talhao = findNameById(talhoes, a.talhaoId);
            const produto = a.produtos?.[0]?.produtoNome || '—';
            return `<tr><td>${a.data}</td><td>${escapeHtml(talhao)}</td><td>${num(a.areaHaAplicada, 1)} ha</td><td>${escapeHtml(produto)}</td>${canSeeFinanceiro() ? `<td>${kbrl(a.custoTotal)}</td>` : ''}</tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${isSimplifiedDashboard() ? `
      <div class="card" style="background:#fffbeb; border-left: 4px solid #f59e0b; margin-top:15px;">
        <p style="color:#92400e; margin:0;">\uD83D\uDD12 <b>Dashboard simplificado</b> \u2014 Seu perfil de ${getRoleLabel()} tem acesso limitado. Para mais detalhes, fale com o administrador.</p>
      </div>
    ` : ''}
  `;

  window.concluirLembrete = (id) => {
    const db = getDB();
    const lembrete = db.lembretes.find(l => l.id === id);
    if (lembrete) lembrete.concluido = true;
    setDB(db);
    toast("Lembrete concluído", "");
    pageDashboard();
  };
}

