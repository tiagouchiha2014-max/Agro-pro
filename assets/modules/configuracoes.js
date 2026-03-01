function pageConfiguracoes() {
  const db = getDB();
  const params = db.parametros || {
    precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75,
    precoMilho: 60, produtividadeMinMilho: 100, produtividadeMaxMilho: 130,
    precoSorgo: 42, produtividadeMinSorgo: 70, produtividadeMaxSorgo: 100,
    precoFeijao: 280, produtividadeMinFeijao: 25, produtividadeMaxFeijao: 40,
    precoTrigo: 85, produtividadeMinTrigo: 40, produtividadeMaxTrigo: 60,
    precoArroz: 60, produtividadeMinArroz: 60, produtividadeMaxArroz: 80,
    precoCafe: 1200, produtividadeMinCafe: 20, produtividadeMaxCafe: 40,
    precoCanola: 140, produtividadeMinCanola: 40, produtividadeMaxCanola: 65,
    precoGirassol: 90, produtividadeMinGirassol: 35, produtividadeMaxGirassol: 55,
    precoAmendoim: 220, produtividadeMinAmendoim: 60, produtividadeMaxAmendoim: 100,
    pesoPadraoSaca: 60
  };

  setTopActions(`
    <button class="btn" id="btnImport">📥 Importar Backup</button>
    <button class="btn primary" id="btnExport">📤 Exportar Backup</button>
  `);

  const content = document.getElementById("content");
  const cloudConnected = (typeof isSupabaseReady === 'function' && isSupabaseReady());

  // ── Seção Planos (apenas admin) ─────────────────────────────────────────────
  const planSection = userRole === 'admin' ? `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">💎</span>
        <div>
          <h3 class="cfg-card-title">Plano &amp; Assinatura</h3>
          <p class="cfg-card-sub">Gerencie seu plano e acesse todos os recursos do Agro Pro</p>
        </div>
      </div>

      <!-- Banner do plano atual -->
      <div class="plan-hero">
        <div>
          <div class="plan-hero-label">Seu plano atual</div>
          <div class="plan-hero-name">
            ${planoAtual}${planoAtual === 'Pro' ? ' ⭐' : planoAtual === 'Master' ? ' 👑' : ''}
          </div>
          <div class="plan-hero-desc">
            ${planoAtual === 'Free'
              ? 'Acesso gratuito limitado — faça upgrade para desbloquear todas as funcionalidades'
              : 'Assinatura ativa — obrigado por confiar no Agro Pro!'}
          </div>
        </div>
        ${planoAtual === 'Free' ? `
          <a href="https://wa.me/5599991360547?text=Ol%C3%A1!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Pro%20R%24199%2Fm%C3%AAs)"
             target="_blank" class="plan-hero-cta">⬆ Fazer Upgrade</a>` : ''}
      </div>

      <!-- Cards dos planos -->
      <div class="plan-grid">

        <!-- FREE -->
        <div class="plan-card ${planoAtual === 'Free' ? 'plan-card--current' : ''}">
          <div class="plan-card-name plan-card-name--free">FREE</div>
          <div class="plan-card-price">R$ 0<small>/mês</small></div>
          <ul class="plan-card-features">
            <li class="feat-ok">1 fazenda e 1 talhão</li>
            <li class="feat-ok">Visualização completa</li>
            <li class="feat-no">Estoque e aplicações</li>
            <li class="feat-no">Relatórios e IA</li>
          </ul>
          <div class="plan-card-badge plan-card-badge--neutral">
            ${planoAtual === 'Free' ? '✓ PLANO ATUAL' : 'GRATUITO'}
          </div>
        </div>

        <!-- PRO -->
        <div class="plan-card plan-card--featured ${planoAtual === 'Pro' ? 'plan-card--active' : ''}">
          <div class="plan-card-popular">⭐ MAIS POPULAR</div>
          <div class="plan-card-name plan-card-name--pro">PRO</div>
          <div class="plan-card-price">R$ 199<small>/mês</small></div>
          <ul class="plan-card-features">
            <li class="feat-ok">5 fazendas · talhões ilimitados</li>
            <li class="feat-ok">Aplicações, estoque, colheitas</li>
            <li class="feat-ok">Equipe (15) e máquinas</li>
            <li class="feat-ok">Relatórios + IA Copilot</li>
          </ul>
          ${planoAtual === 'Pro'
            ? `<div class="plan-card-badge plan-card-badge--success">✓ PLANO ATIVO</div>`
            : `<a href="https://wa.me/5599991360547?text=Ol%C3%A1!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Pro%20R%24199%2Fm%C3%AAs)"
                target="_blank" class="plan-card-cta plan-card-cta--pro">
                💬 Assinar Pro — R$199/mês
               </a>`}
        </div>

        <!-- MASTER -->
        <div class="plan-card plan-card--premium ${planoAtual === 'Master' ? 'plan-card--active-gold' : ''}">
          <div class="plan-card-popular plan-card-popular--gold">👑 ILIMITADO</div>
          <div class="plan-card-name plan-card-name--master">MASTER</div>
          <div class="plan-card-price">R$ 299<small>/mês</small></div>
          <ul class="plan-card-features">
            <li class="feat-ok">Fazendas <b>ilimitadas</b></li>
            <li class="feat-ok">Equipe e admins ilimitados</li>
            <li class="feat-ok">Tudo do Pro incluso</li>
            <li class="feat-ok">Suporte prioritário 24h</li>
          </ul>
          ${planoAtual === 'Master'
            ? `<div class="plan-card-badge plan-card-badge--gold">✓ PLANO ATIVO</div>`
            : `<a href="https://wa.me/5599991360547?text=Ol%C3%A1!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Master%20R%24299%2Fm%C3%AAs)"
                target="_blank" class="plan-card-cta plan-card-cta--master">
                💬 Assinar Master — R$299/mês
               </a>`}
        </div>
      </div>

      <!-- Como ativar — mensagem de ativação profissional -->
      <div class="activation-notice">
        <div class="activation-notice-title">
          <span>📋</span> Como ativar seu plano
        </div>
        <ol class="activation-steps">
          <li>Escolha seu plano acima e clique em <strong>Assinar</strong></li>
          <li>Conclua o pagamento via WhatsApp com nossa equipe de suporte</li>
          <li>
            <strong>Em alguns minutos, seu plano estará ativo</strong> e todas as
            funcionalidades serão liberadas automaticamente — sem necessidade de
            reconfiguração
          </li>
        </ol>
        <div class="activation-contacts">
          <a href="https://wa.me/5599991360547?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20minha%20assinatura%20do%20Agro%20Pro"
             target="_blank" class="activation-btn activation-btn--whatsapp">
            💬 WhatsApp: (99) 99136-0547
          </a>
          <a href="mailto:suporteagropro@gmail.com?subject=Assinatura%20Agro%20Pro"
             class="activation-btn activation-btn--email">
            📧 suporteagropro@gmail.com
          </a>
        </div>
      </div>
    </div>
  ` : '';

  // ── Seção IA ─────────────────────────────────────────────────────────────────
  const iaSection = userRole !== 'funcionario' ? `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">🤖</span>
        <div>
          <h3 class="cfg-card-title">Inteligência Artificial — Agro-Copilot</h3>
          <p class="cfg-card-sub">IA integrada via servidor seguro (Edge Function)</p>
        </div>
      </div>

      <div class="cfg-ia-status" style="margin-bottom:16px;">
        <span class="tag tag-success">🔒 IA protegida no servidor</span>
        <span style="color:var(--text-muted); font-size:13px; margin-left:8px;">Chave OpenAI gerenciada no backend — nunca exposta no navegador.</span>
      </div>

      <div style="padding:12px 14px; background:var(--info-bg,#eff6ff); border-radius:8px; border-left:3px solid var(--info,#3b82f6);">
        <p style="margin:0; font-size:12.5px; color:var(--info-text,#1e40af); line-height:1.7;">
          🛡️ <strong>Segurança:</strong> O Agro-Copilot usa um proxy seguro no servidor (Supabase Edge Function)
          para acessar a OpenAI. Sua chave API nunca é armazenada no navegador.<br>
          📊 <strong>Limite:</strong> 20 consultas por hora por usuário (planos Pro e Master).<br>
          💬 Acesse o <a href="copilot.html" style="color:var(--brand);">Agro-Copilot</a> para conversar com a IA.
        </p>
      </div>
    </div>
  ` : '';

  // ── Parâmetros de Mercado (apenas admin) ───────────────────────────────────
  const cropRow = (icon, label, color, namePreco, nameMin, nameMax, vPreco, vMin, vMax) => `
    <div class="cfg-crop-group">
      <div class="cfg-crop-label" style="color:${color};">${icon} ${label}</div>
      <div class="formGrid" style="grid-template-columns:repeat(3,1fr);">
        <div class="form-group">
          <small>Preço (R$/sc)</small>
          <input class="input" name="${namePreco}" value="${vPreco}">
        </div>
        <div class="form-group">
          <small>Prod. mín. (sc/ha)</small>
          <input class="input" name="${nameMin}" value="${vMin}">
        </div>
        <div class="form-group">
          <small>Prod. máx. (sc/ha)</small>
          <input class="input" name="${nameMax}" value="${vMax}">
        </div>
      </div>
    </div>
  `;

  const paramsSection = userRole === 'admin' ? `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">⚙️</span>
        <div>
          <h3 class="cfg-card-title">Parâmetros de Mercado</h3>
          <p class="cfg-card-sub">Preços e produtividades utilizados nos cálculos de custo e rentabilidade</p>
        </div>
      </div>
      <form id="frmParams">
        ${cropRow('🌱','Soja','var(--brand)','precoSoja','prodMinSoja','prodMaxSoja',params.precoSoja||120,params.produtividadeMinSoja||65,params.produtividadeMaxSoja||75)}
        ${cropRow('🌽','Milho','var(--warning)','precoMilho','prodMinMilho','prodMaxMilho',params.precoMilho||60,params.produtividadeMinMilho||100,params.produtividadeMaxMilho||130)}
        ${cropRow('🌾','Sorgo','var(--neutral)','precoSorgo','prodMinSorgo','prodMaxSorgo',params.precoSorgo||42,params.produtividadeMinSorgo||70,params.produtividadeMaxSorgo||100)}
        ${cropRow('🫘','Feijão','var(--info)','precoFeijao','prodMinFeijao','prodMaxFeijao',params.precoFeijao||280,params.produtividadeMinFeijao||25,params.produtividadeMaxFeijao||40)}
        ${cropRow('🌾','Trigo','var(--text-muted)','precoTrigo','prodMinTrigo','prodMaxTrigo',params.precoTrigo||85,params.produtividadeMinTrigo||40,params.produtividadeMaxTrigo||60)}
        ${cropRow('🍚','Arroz','var(--success)','precoArroz','prodMinArroz','prodMaxArroz',params.precoArroz||60,params.produtividadeMinArroz||60,params.produtividadeMaxArroz||80)}
        ${cropRow('☕','Café','var(--accent)','precoCafe','prodMinCafe','prodMaxCafe',params.precoCafe||1200,params.produtividadeMinCafe||20,params.produtividadeMaxCafe||40)}
        ${cropRow('🌼','Canola','var(--success-light,var(--success))','precoCanola','prodMinCanola','prodMaxCanola',params.precoCanola||140,params.produtividadeMinCanola||40,params.produtividadeMaxCanola||65)}
        ${cropRow('🌻','Girassol','var(--warning)','precoGirassol','prodMinGirassol','prodMaxGirassol',params.precoGirassol||90,params.produtividadeMinGirassol||35,params.produtividadeMaxGirassol||55)}
        ${cropRow('🥜','Amendoim','var(--accent)','precoAmendoim','prodMinAmendoim','prodMaxAmendoim',params.precoAmendoim||220,params.produtividadeMinAmendoim||60,params.produtividadeMaxAmendoim||100)}
        <div class="cfg-crop-group">
          <div class="cfg-crop-label" style="color:var(--text-secondary);">⚙️ Geral</div>
          <div class="formGrid" style="grid-template-columns:repeat(3,1fr);">
            <div class="form-group">
              <small>Peso padrão da saca (kg)</small>
              <input class="input" name="pesoPadraoSaca" value="${params.pesoPadraoSaca||60}">
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:var(--space-4);">
          <button class="btn primary" type="submit">💾 Salvar parâmetros</button>
        </div>
      </form>
    </div>
  ` : '';

  // ── Backup ──────────────────────────────────────────────────────────────────
  const backupSection = userRole === 'admin' ? `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">💾</span>
        <div>
          <h3 class="cfg-card-title">Backup e Restauração</h3>
          <p class="cfg-card-sub">Exporte ou importe todos os dados da conta em formato JSON</p>
        </div>
      </div>
      <div style="display:flex; gap:var(--space-3); flex-wrap:wrap;">
        <button class="btn primary" id="btnExport2">📤 Exportar Backup</button>
        <button class="btn" id="btnImport2">📥 Importar Backup</button>
      </div>
    </div>
  ` : '';

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetSection = userRole === 'admin' ? `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">⚠️</span>
        <div>
          <h3 class="cfg-card-title">Reset de Dados</h3>
          <p class="cfg-card-sub">Operações irreversíveis — use com cautela</p>
        </div>
      </div>
      <div style="display:flex; gap:var(--space-3); flex-wrap:wrap; margin-bottom:var(--space-4);">
        <button class="btn warning" id="btnZerarDados">🧹 Zerar todos os dados</button>
        <button class="btn" id="btnRestaurarDemo">🔄 Restaurar demonstração</button>
      </div>
      <p class="help">
        <strong>Zerar dados:</strong> remove fazendas, talhões, produtos, estoque, etc., mantendo apenas a safra atual.<br>
        <strong>Restaurar demo:</strong> recria o banco com dados de exemplo para testes.
      </p>
    </div>
  ` : '';

  // ── Nuvem ───────────────────────────────────────────────────────────────────
  const cloudSection = `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">☁️</span>
        <div>
          <h3 class="cfg-card-title">Sincronização na Nuvem</h3>
          <p class="cfg-card-sub">Status: <b id="cloudStatusText">${cloudConnected ? '✅ Conectado ao Supabase' : '⚠️ Modo Offline'}</b></p>
        </div>
      </div>
      <p class="help" style="margin-bottom:var(--space-4);">
        Seus dados são sincronizados automaticamente a cada alteração. Use as opções abaixo para forçar sincronização manual.
      </p>
      <div style="display:flex; gap:var(--space-3); flex-wrap:wrap;">
        <button class="btn primary" id="btnForceSync">☁️ Sincronizar Agora</button>
        <button class="btn" id="btnForceRestore">📥 Restaurar da Nuvem</button>
      </div>
    </div>
  `;

  // ── Conta ───────────────────────────────────────────────────────────────────
  const accountSection = `
    <div class="cfg-card page-enter">
      <div class="cfg-card-header">
        <span class="cfg-card-icon">👤</span>
        <div>
          <h3 class="cfg-card-title">Conta</h3>
          <p class="cfg-card-sub">${escapeHtml(userSession?.user?.email || 'Usuário não identificado')}</p>
        </div>
      </div>
      <div style="display:flex; gap:var(--space-3); align-items:center; flex-wrap:wrap;">
        <span class="tag tag-${planoAtual === 'Pro' ? 'success' : planoAtual === 'Master' ? 'warning' : 'neutral'}">${planoAtual}</span>
        <span class="tag tag-info">${getRoleLabel()}</span>
        <button class="btn" id="btnLogout" style="margin-left:auto;">🚪 Sair da Conta</button>
      </div>
    </div>
  `;

  content.innerHTML = `
    <style>
      /* ── Config cards ──────────────────────────────────────── */
      .cfg-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: var(--space-6);
        margin-bottom: var(--space-5);
        box-shadow: var(--shadow-sm);
        transition: box-shadow var(--t-base);
      }
      .cfg-card-header {
        display: flex;
        align-items: flex-start;
        gap: var(--space-4);
        margin-bottom: var(--space-5);
        padding-bottom: var(--space-4);
        border-bottom: 1px solid var(--border);
      }
      .cfg-card-icon {
        font-size: 22px;
        line-height: 1;
        margin-top: 2px;
        flex-shrink: 0;
      }
      .cfg-card-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 3px;
      }
      .cfg-card-sub {
        font-size: 12.5px;
        color: var(--text-muted);
        margin: 0;
      }

      /* ── Plan hero ────────────────────────────────────────── */
      .plan-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-5);
        flex-wrap: wrap;
        background: linear-gradient(135deg, var(--sidebar-bg) 0%, #1e3a1e 100%);
        border-radius: var(--radius);
        padding: var(--space-5) var(--space-6);
        margin-bottom: var(--space-5);
      }
      .plan-hero-label {
        font-size: 11px;
        color: rgba(255,255,255,.5);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .5px;
        margin-bottom: 6px;
      }
      .plan-hero-name {
        font-size: 26px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -.5px;
        line-height: 1;
        margin-bottom: 6px;
      }
      .plan-hero-desc {
        font-size: 12.5px;
        color: rgba(255,255,255,.5);
      }
      .plan-hero-cta {
        background: var(--brand-light);
        color: #fff;
        padding: 11px 22px;
        border-radius: var(--radius-sm);
        font-weight: 700;
        font-size: 13.5px;
        text-decoration: none;
        white-space: nowrap;
        box-shadow: var(--shadow-brand);
        transition: opacity var(--t-fast);
        flex-shrink: 0;
      }
      .plan-hero-cta:hover { opacity: .9; }

      /* ── Plan grid ────────────────────────────────────────── */
      .plan-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-5);
      }
      .plan-card {
        padding: var(--space-5);
        border-radius: var(--radius);
        border: 2px solid var(--border);
        background: var(--surface);
        position: relative;
        transition: transform var(--t-base), box-shadow var(--t-base);
      }
      .plan-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
      }
      .plan-card--current  { border-color: var(--border-medium); background: var(--neutral-bg); }
      .plan-card--featured { border-color: var(--success); }
      .plan-card--active   { background: var(--success-bg); }
      .plan-card--premium  { border-color: var(--warning); }
      .plan-card--active-gold { background: var(--accent-subtle); }

      .plan-card-popular {
        position: absolute;
        top: -11px; left: 50%;
        transform: translateX(-50%);
        background: var(--success);
        color: #fff;
        padding: 2px 14px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        letter-spacing: .5px;
      }
      .plan-card-popular--gold { background: var(--warning); }

      .plan-card-name {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .6px;
        margin-bottom: 10px;
        margin-top: 8px;
      }
      .plan-card-name--free   { color: var(--neutral); }
      .plan-card-name--pro    { color: var(--success); }
      .plan-card-name--master { color: var(--warning); }

      .plan-card-price {
        font-size: 28px;
        font-weight: 800;
        color: var(--text);
        letter-spacing: -1px;
        line-height: 1;
        margin-bottom: 14px;
      }
      .plan-card-price small {
        font-size: 13px;
        font-weight: 400;
        color: var(--text-muted);
      }

      .plan-card-features {
        list-style: none;
        padding: 0; margin: 0 0 16px;
        font-size: 12.5px;
        color: var(--text-secondary);
        line-height: 2;
      }
      .feat-ok::before { content: '✓ '; color: var(--success); font-weight: 700; }
      .feat-no { opacity: .45; }
      .feat-no::before { content: '✗ '; }

      .plan-card-badge {
        padding: 7px;
        border-radius: var(--radius-sm);
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .5px;
      }
      .plan-card-badge--neutral { background: var(--neutral-bg); color: var(--neutral); }
      .plan-card-badge--success { background: var(--success-bg); border: 1px solid var(--success); color: var(--success); }
      .plan-card-badge--gold    { background: var(--accent-subtle); border: 1px solid var(--warning); color: var(--warning); }

      .plan-card-cta {
        display: block;
        padding: 9px;
        border-radius: var(--radius-sm);
        font-weight: 700;
        font-size: 13px;
        text-decoration: none;
        text-align: center;
        transition: opacity var(--t-fast);
      }
      .plan-card-cta:hover { opacity: .88; }
      .plan-card-cta--pro    { background: var(--success); color: #fff; }
      .plan-card-cta--master { background: var(--warning); color: #fff; }

      /* ── Activation notice ───────────────────────────────── */
      .activation-notice {
        background: var(--info-bg);
        border: 1px solid rgba(3,105,161,.18);
        border-left: 3px solid var(--info);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        padding: var(--space-5);
      }
      .activation-notice-title {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--info);
        margin-bottom: var(--space-3);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .activation-steps {
        margin: 0 0 var(--space-4);
        padding-left: 18px;
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 2.1;
      }
      .activation-contacts {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
      }
      .activation-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 18px;
        border-radius: var(--radius-sm);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: opacity var(--t-fast);
      }
      .activation-btn:hover { opacity: .88; }
      .activation-btn--whatsapp { background: #25d366; color: #fff; }
      .activation-btn--email    { background: var(--info); color: #fff; }

      /* ── Crop groups ─────────────────────────────────────── */
      .cfg-crop-group {
        padding: var(--space-3) 0;
        border-bottom: 1px solid var(--border);
      }
      .cfg-crop-group:last-child { border-bottom: none; }
      .cfg-crop-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .7px;
        margin-bottom: var(--space-2);
      }

      /* ── IA status ───────────────────────────────────────── */
      .cfg-ia-status {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        flex-wrap: wrap;
        padding: var(--space-3) var(--space-4);
        background: var(--success-bg);
        border-radius: var(--radius-sm);
        border: 1px solid rgba(16,185,129,.2);
      }
    </style>

    ${planSection}
    ${iaSection}
    ${paramsSection}
    ${backupSection}
    ${resetSection}
    ${cloudSection}
    ${accountSection}
  `;

  // ── Listeners ───────────────────────────────────────────────────────────────

  if (userRole === 'admin') {
    document.getElementById("frmParams").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const db2 = getDB();
      db2.parametros = {
        precoSoja:             Number(fd.get("precoSoja")       || 120),
        produtividadeMinSoja:  Number(fd.get("prodMinSoja")     || 65),
        produtividadeMaxSoja:  Number(fd.get("prodMaxSoja")     || 75),
        precoMilho:            Number(fd.get("precoMilho")      || 60),
        produtividadeMinMilho: Number(fd.get("prodMinMilho")    || 100),
        produtividadeMaxMilho: Number(fd.get("prodMaxMilho")    || 130),
        precoSorgo:            Number(fd.get("precoSorgo")      || 42),
        produtividadeMinSorgo: Number(fd.get("prodMinSorgo")    || 70),
        produtividadeMaxSorgo: Number(fd.get("prodMaxSorgo")    || 100),
        precoFeijao:           Number(fd.get("precoFeijao")     || 280),
        produtividadeMinFeijao:Number(fd.get("prodMinFeijao")   || 25),
        produtividadeMaxFeijao:Number(fd.get("prodMaxFeijao")   || 40),
        precoTrigo:            Number(fd.get("precoTrigo")      || 85),
        produtividadeMinTrigo: Number(fd.get("prodMinTrigo")    || 40),
        produtividadeMaxTrigo: Number(fd.get("prodMaxTrigo")    || 60),
        precoArroz:            Number(fd.get("precoArroz")      || 60),
        produtividadeMinArroz: Number(fd.get("prodMinArroz")    || 60),
        produtividadeMaxArroz: Number(fd.get("prodMaxArroz")    || 80),
        precoCafe:             Number(fd.get("precoCafe")       || 1200),
        produtividadeMinCafe:  Number(fd.get("prodMinCafe")     || 20),
        produtividadeMaxCafe:  Number(fd.get("prodMaxCafe")     || 40),
        precoCanola:           Number(fd.get("precoCanola")     || 140),
        produtividadeMinCanola:Number(fd.get("prodMinCanola")   || 40),
        produtividadeMaxCanola:Number(fd.get("prodMaxCanola")   || 65),
        precoGirassol:         Number(fd.get("precoGirassol")   || 90),
        produtividadeMinGirassol:Number(fd.get("prodMinGirassol")||35),
        produtividadeMaxGirassol:Number(fd.get("prodMaxGirassol")||55),
        precoAmendoim:         Number(fd.get("precoAmendoim")   || 220),
        produtividadeMinAmendoim:Number(fd.get("prodMinAmendoim")||60),
        produtividadeMaxAmendoim:Number(fd.get("prodMaxAmendoim")||100),
        pesoPadraoSaca:        Number(fd.get("pesoPadraoSaca")  || 60)
      };
      setDB(db2);
      if (typeof SupaCRUD !== 'undefined') {
        try { await SupaCRUD.upsertParametros(db2.parametros); } catch (err) { /* silenciado */ }
      }
      toast("Parâmetros salvos", "Valores atualizados com sucesso.");
    });
  }

  const exportBackup = () => {
    downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2));
    toast("Backup exportado", "Arquivo .json baixado com sucesso.");
  };
  document.getElementById("btnExport").addEventListener("click", exportBackup);
  document.getElementById("btnExport2")?.addEventListener("click", exportBackup);

  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.safras) { alert("Arquivo inválido (não contém safras)."); return; }
        if (!confirm("Importar vai SUBSTITUIR todos os dados locais. Deseja continuar?")) return;
        Storage.save(data);
        toast("Importado", "Sincronizando com a nuvem...");
        if (typeof cloudSyncImmediate === 'function') {
          cloudSyncImmediate()
            .then(() => { toast("Sincronizado", "Backup enviado para a nuvem!"); setTimeout(() => location.reload(), 500); })
            .catch(() => { setTimeout(() => location.reload(), 500); });
        } else {
          setTimeout(() => location.reload(), 500);
        }
      } catch (err) { alert("Não foi possível ler o arquivo JSON."); }
    };
    input.click();
  };
  document.getElementById("btnImport").addEventListener("click", importBackup);
  document.getElementById("btnImport2")?.addEventListener("click", importBackup);

  document.getElementById("btnZerarDados")?.addEventListener("click", () => {
    if (!confirm("⚠️ Isso vai APAGAR todas as fazendas, talhões, produtos, estoque, aplicações, colheitas, etc. Deseja continuar?")) return;
    const db2 = getDB();
    const safraAtualId = getSafraId();
    ['fazendas','talhoes','produtos','estoque','equipe','maquinas','clima',
     'dieselEntradas','dieselEstoque','combustivel','aplicacoes','lembretes',
     'pragas','colheitas','manutencoes','insumosBase'].forEach(k => db2[k] = []);
    db2.dieselEstoque.push({ id: uid("dsl"), safraId: safraAtualId, deposito: "Tanque Principal", litros: 0, precoVigente: 0, obs: "Estoque zerado" });
    setDB(db2);
    toast("Dados zerados", "Todos os registros foram removidos.");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnRestaurarDemo")?.addEventListener("click", () => {
    if (!confirm("⚠️ Isso vai SUBSTITUIR todos os dados atuais pelos dados de demonstração. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Demonstração restaurada", "Banco de dados recriado com dados de exemplo.");
    setTimeout(() => location.reload(), 200);
  });

  // (Seção chave OpenAI removida — agora gerenciada no servidor via Edge Function)

  // Cloud Sync Manual
  document.getElementById("btnForceSync")?.addEventListener("click", async () => {
    if (typeof cloudSyncImmediate !== 'function' || typeof isSupabaseReady !== 'function' || !isSupabaseReady()) {
      toast("Offline", "Supabase não configurado. Verifique a conexão.");
      return;
    }
    toast("Sincronizando", "Enviando dados para a nuvem...");
    try {
      // Resetar hash para forçar sync completo
      if (typeof window._lastSyncedHash !== 'undefined') window._lastSyncedHash = null;
      await cloudSyncImmediate();
      toast("Sucesso", "Dados sincronizados com a nuvem!");
    } catch (err) {
      toast("Erro", "Falha ao sincronizar: " + err.message);
    }
  });

  document.getElementById("btnForceRestore")?.addEventListener("click", async () => {
    if (typeof cloudRestore !== 'function' || typeof isSupabaseReady !== 'function' || !isSupabaseReady()) {
      toast("Offline", "Supabase não configurado.");
      return;
    }
    if (!confirm("Isso vai SUBSTITUIR seus dados locais pelos dados da nuvem. Continuar?")) return;
    toast("Restaurando", "Baixando dados da nuvem...");
    try {
      const restored = await cloudRestore();
      if (restored) {
        toast("Restaurado", "Dados da nuvem carregados! Recarregando...");
        setTimeout(() => location.reload(), 500);
      } else {
        toast("Info", "Dados locais já estão atualizados ou nenhum backup encontrado na nuvem.");
      }
    } catch (err) {
      toast("Erro", "Falha ao restaurar: " + err.message);
    }
  });

  // Logout
  document.getElementById("btnLogout").addEventListener("click", async () => {
    if (!confirm("Deseja realmente sair da sua conta?")) return;
    toast("Saindo...", "Salvando dados na nuvem...");
    try { if (typeof cloudSyncImmediate === 'function') await cloudSyncImmediate(); } catch (e) {}
    try { if (typeof AuthService !== 'undefined' && isSupabaseReady()) await AuthService.signOut(); } catch (e) {}
    ['agro_session','agro_role','agro_trial','agro_plano','agro_pro_v10'].forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    toast("Logout realizado", "Você saiu da conta com segurança.");
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  });
}
