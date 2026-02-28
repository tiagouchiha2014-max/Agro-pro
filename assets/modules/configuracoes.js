function pageConfiguracoes() {
  const db = getDB();
  const params = db.parametros || { precoSoja: 120, produtividadeMinSoja: 65, produtividadeMaxSoja: 75, precoMilho: 60, produtividadeMinMilho: 100, produtividadeMaxMilho: 130, precoSorgo: 42, produtividadeMinSorgo: 70, produtividadeMaxSorgo: 100, precoFeijao: 280, produtividadeMinFeijao: 25, produtividadeMaxFeijao: 40, precoTrigo: 85, produtividadeMinTrigo: 40, produtividadeMaxTrigo: 60, precoArroz: 60, produtividadeMinArroz: 60, produtividadeMaxArroz: 80, precoCafe: 1200, produtividadeMinCafe: 20, produtividadeMaxCafe: 40, precoCanola: 140, produtividadeMinCanola: 40, produtividadeMaxCanola: 65, precoGirassol: 90, produtividadeMinGirassol: 35, produtividadeMaxGirassol: 55, precoAmendoim: 220, produtividadeMinAmendoim: 60, produtividadeMaxAmendoim: 100, pesoPadraoSaca: 60 };

  setTopActions(`
    <button class="btn" id="btnImport">📥 Importar Backup</button>
    <button class="btn primary" id="btnExport">📤 Exportar Backup</button>
  `);

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .config-section { margin-bottom: 30px; }
      .config-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        margin-bottom: 20px;
      }
      .config-card h3 { margin-top: 0; color: #3b82f6; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
      .reset-buttons { display: flex; gap: 15px; margin-top: 15px; flex-wrap: wrap; }
      .btn.warning { background: #f59e0b; color: white; }
    </style>

    <div class="config-section">
      ${userRole === 'admin' ? `<div class="config-card">
        <h3>💎 Plano & Assinatura</h3>

        <!-- Status do plano atual -->
        <div style="
          background: linear-gradient(135deg, var(--sidebar-bg) 0%, #243824 100%);
          border-radius: var(--radius);
          padding: var(--space-5) var(--space-6);
          display: flex; align-items: center; justify-content: space-between;
          gap: var(--space-5); flex-wrap: wrap; margin-bottom: var(--space-5);
        ">
          <div>
            <div style="font-size:11px; color:rgba(255,255,255,.5); font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;">Seu plano atual</div>
            <div style="font-size:26px; font-weight:800; color:#fff; letter-spacing:-0.5px;">
              ${planoAtual} ${planoAtual==='Pro'?'⭐':planoAtual==='Master'?'👑':''}
            </div>
            <div style="font-size:12.5px; color:rgba(255,255,255,.5); margin-top:4px;">
              ${planoAtual==='Free'
                ? 'Acesso gratuito limitado — faça upgrade para usar todas as funcionalidades'
                : 'Assinatura ativa — obrigado por confiar no Agro Pro!'}
            </div>
          </div>
          ${planoAtual==='Free' ? `
            <a href="https://wa.me/5599991360547?text=Olá!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Pro%20R%24199%2Fmês)" target="_blank"
              style="background:var(--brand-light); color:#fff; padding:11px 22px; border-radius:var(--radius-sm); font-weight:700; font-size:13.5px; text-decoration:none; white-space:nowrap; box-shadow:var(--shadow-brand);">
              ⬆ Fazer Upgrade
            </a>` : ''}
        </div>

        <!-- Grid de planos -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:var(--space-4); margin-bottom:var(--space-5);">

          <!-- FREE -->
          <div style="padding:var(--space-5); border-radius:var(--radius); border:2px solid ${planoAtual==='Free'?'var(--border-medium)':'var(--border)'}; background:${planoAtual==='Free'?'var(--neutral-bg)':'var(--surface)'};">
            <div style="font-size:13px; font-weight:800; color:var(--neutral); letter-spacing:.5px; margin-bottom:8px;">FREE</div>
            <div style="font-size:28px; font-weight:800; color:var(--text); letter-spacing:-1px; line-height:1; margin-bottom:12px;">
              R$ 0<small style="font-size:13px; font-weight:400; color:var(--text-muted);">/mês</small>
            </div>
            <ul style="list-style:none; padding:0; margin:0 0 16px; font-size:12.5px; color:var(--text-muted); line-height:2;">
              <li>✓ 1 fazenda e 1 talhão</li>
              <li>✓ Apenas visualização</li>
              <li style="opacity:.5;">✗ Estoque e aplicações</li>
              <li style="opacity:.5;">✗ Relatórios e IA</li>
            </ul>
            <div style="padding:8px; background:var(--neutral-bg); border-radius:var(--radius-sm); text-align:center; color:var(--neutral); font-size:11px; font-weight:700; letter-spacing:.5px;">
              ${planoAtual==='Free'?'PLANO ATUAL':'GRATUITO'}
            </div>
          </div>

          <!-- PRO -->
          <div style="padding:var(--space-5); border-radius:var(--radius); border:2px solid ${planoAtual==='Pro'?'var(--success)':'var(--border)'}; background:${planoAtual==='Pro'?'var(--success-bg)':'var(--surface)'}; position:relative;">
            <div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%); background:var(--success); color:#fff; padding:2px 14px; border-radius:999px; font-size:10px; font-weight:700; white-space:nowrap; letter-spacing:.5px;">⭐ MAIS POPULAR</div>
            <div style="font-size:13px; font-weight:800; color:var(--success); letter-spacing:.5px; margin-bottom:8px;">PRO</div>
            <div style="font-size:28px; font-weight:800; color:var(--text); letter-spacing:-1px; line-height:1; margin-bottom:12px;">
              R$ 199<small style="font-size:13px; font-weight:400; color:var(--text-muted);">/mês</small>
            </div>
            <ul style="list-style:none; padding:0; margin:0 0 16px; font-size:12.5px; color:var(--text-secondary); line-height:2;">
              <li>✓ 5 fazendas · talhões ilimitados</li>
              <li>✓ Aplicações, estoque, colheitas</li>
              <li>✓ Equipe (15) e máquinas</li>
              <li>✓ Relatórios + IA Copilot</li>
            </ul>
            ${planoAtual==='Pro'
              ? `<div style="padding:8px; background:var(--success-bg); border:1px solid var(--success); border-radius:var(--radius-sm); text-align:center; color:var(--success); font-size:11px; font-weight:700; letter-spacing:.5px;">✓ PLANO ATIVO</div>`
              : `<a href="https://wa.me/5599991360547?text=Olá!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Pro%20R%24199%2Fmês)" target="_blank"
                  style="display:block; padding:9px; background:var(--success); color:#fff; border-radius:var(--radius-sm); font-weight:700; font-size:13px; text-decoration:none; text-align:center;">
                  💬 Assinar Pro — R$199/mês
                </a>`}
          </div>

          <!-- MASTER -->
          <div style="padding:var(--space-5); border-radius:var(--radius); border:2px solid ${planoAtual==='Master'?'var(--warning)':'var(--border)'}; background:${planoAtual==='Master'?'var(--accent-subtle)':'var(--surface)'}; position:relative;">
            <div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%); background:var(--warning); color:#fff; padding:2px 14px; border-radius:999px; font-size:10px; font-weight:700; white-space:nowrap; letter-spacing:.5px;">👑 ILIMITADO</div>
            <div style="font-size:13px; font-weight:800; color:var(--warning); letter-spacing:.5px; margin-bottom:8px;">MASTER</div>
            <div style="font-size:28px; font-weight:800; color:var(--text); letter-spacing:-1px; line-height:1; margin-bottom:12px;">
              R$ 299<small style="font-size:13px; font-weight:400; color:var(--text-muted);">/mês</small>
            </div>
            <ul style="list-style:none; padding:0; margin:0 0 16px; font-size:12.5px; color:var(--text-secondary); line-height:2;">
              <li>✓ Fazendas <b>ilimitadas</b></li>
              <li>✓ Equipe e admins ilimitados</li>
              <li>✓ Tudo do Pro incluso</li>
              <li>✓ Suporte prioritário 24h</li>
            </ul>
            ${planoAtual==='Master'
              ? `<div style="padding:8px; background:var(--accent-subtle); border:1px solid var(--warning); border-radius:var(--radius-sm); text-align:center; color:var(--warning); font-size:11px; font-weight:700; letter-spacing:.5px;">✓ PLANO ATIVO</div>`
              : `<a href="https://wa.me/5599991360547?text=Olá!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Master%20R%24299%2Fmês)" target="_blank"
                  style="display:block; padding:9px; background:var(--warning); color:#fff; border-radius:var(--radius-sm); font-weight:700; font-size:13px; text-decoration:none; text-align:center;">
                  💬 Assinar Master — R$299/mês
                </a>`}
          </div>
        </div>

        <!-- Como ativar — mensagem profissional -->
        <div style="
          background: var(--info-bg);
          border: 1px solid rgba(3,105,161,0.2);
          border-left: 3px solid var(--info);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          padding: var(--space-4) var(--space-5);
        ">
          <div style="font-size:13.5px; font-weight:700; color:var(--info); margin-bottom:8px;">📋 Como ativar seu plano</div>
          <ol style="margin:0; padding-left:18px; font-size:13px; color:var(--text-secondary); line-height:2;">
            <li>Escolha seu plano acima e clique em <b>Assinar</b></li>
            <li>Realize o pagamento via WhatsApp com o suporte</li>
            <li>Em <b>poucos minutos</b>, seu plano será ativado e todas as funcionalidades estarão disponíveis automaticamente</li>
          </ol>
          <div style="margin-top:var(--space-3); display:flex; gap:var(--space-3); flex-wrap:wrap;">
            <a href="https://wa.me/5599991360547?text=Olá!%20Preciso%20de%20ajuda%20com%20minha%20assinatura%20do%20Agro%20Pro"
              target="_blank"
              style="display:inline-flex; align-items:center; gap:8px; padding:8px 16px; background:#25d366; color:#fff; border-radius:var(--radius-sm); text-decoration:none; font-size:13px; font-weight:600;">
              💬 WhatsApp: (99) 99136-0547
            </a>
            <a href="mailto:suporteagropro@gmail.com?subject=Assinatura%20Agro%20Pro"
              style="display:inline-flex; align-items:center; gap:8px; padding:8px 16px; background:var(--info); color:#fff; border-radius:var(--radius-sm); text-decoration:none; font-size:13px; font-weight:600;">
              📧 suporteagropro@gmail.com
            </a>
          </div>
        </div>
      </div>` : '<!-- Planos ocultos para não-admin -->'}

      ${userRole !== 'funcionario' ? `<div class="config-card">
        <h3>🤖 Inteligência Artificial</h3>` : '<div style="display:none;">'}
        <p style="color:#64748b; font-size:13px;">A IA do Agro Pro é gerenciada de forma segura pelo servidor. Não é necessário configurar chaves.</p>
        <div style="margin-top:8px; font-size:12px; color:#4ade80;" id="statusKeyConfig">✅ IA disponível — processada no servidor com segurança</div>
       </div>
      ${userRole === 'admin' ? `<div class="config-card">
        <h3>⚙️ Parâmetros de Mercado</h3>` : '<div style="display:none;">'}
        <form id="frmParams" class="formGrid">
          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#10b981; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🌱 Soja</h4></div>
          <div><small>Preço da saca de soja (R$/sc)</small><input class="input" name="precoSoja" value="${params.precoSoja||120}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinSoja" value="${params.produtividadeMinSoja||65}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxSoja" value="${params.produtividadeMaxSoja||75}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#f59e0b; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🌽 Milho</h4></div>
          <div><small>Preço do milho (R$/sc)</small><input class="input" name="precoMilho" value="${params.precoMilho||60}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinMilho" value="${params.produtividadeMinMilho||100}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxMilho" value="${params.produtividadeMaxMilho||130}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#ef4444; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🌾 Sorgo</h4></div>
          <div><small>Preço do sorgo (R$/sc 50kg)</small><input class="input" name="precoSorgo" value="${params.precoSorgo||42}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinSorgo" value="${params.produtividadeMinSorgo||70}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxSorgo" value="${params.produtividadeMaxSorgo||100}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#8b5cf6; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🫘 Feijão</h4></div>
          <div><small>Preço do feijão (R$/sc 60kg)</small><input class="input" name="precoFeijao" value="${params.precoFeijao||280}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinFeijao" value="${params.produtividadeMinFeijao||25}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxFeijao" value="${params.produtividadeMaxFeijao||40}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#64748b; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🌾 Trigo</h4></div>
          <div><small>Preço do trigo (R$/sc 60kg)</small><input class="input" name="precoTrigo" value="${params.precoTrigo||85}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinTrigo" value="${params.produtividadeMinTrigo||40}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxTrigo" value="${params.produtividadeMaxTrigo||60}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#06b6d4; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🍚 Arroz</h4></div>
          <div><small>Preço do arroz (R$/sc 50kg)</small><input class="input" name="precoArroz" value="${params.precoArroz||60}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinArroz" value="${params.produtividadeMinArroz||60}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxArroz" value="${params.produtividadeMaxArroz||80}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#92400e; font-size:13px; text-transform:uppercase; letter-spacing:1px;">☕ Café</h4></div>
          <div><small>Preço do café (R$/sc 60kg)</small><input class="input" name="precoCafe" value="${params.precoCafe||1200}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinCafe" value="${params.produtividadeMinCafe||20}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxCafe" value="${params.produtividadeMaxCafe||40}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#84cc16; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🌼 Canola</h4></div>
          <div><small>Preço da canola (R$/sc 60kg)</small><input class="input" name="precoCanola" value="${params.precoCanola||140}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinCanola" value="${params.produtividadeMinCanola||40}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxCanola" value="${params.produtividadeMaxCanola||65}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#eab308; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🌻 Girassol</h4></div>
          <div><small>Preço do girassol (R$/sc 60kg)</small><input class="input" name="precoGirassol" value="${params.precoGirassol||90}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinGirassol" value="${params.produtividadeMinGirassol||35}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxGirassol" value="${params.produtividadeMaxGirassol||55}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#c2410c; font-size:13px; text-transform:uppercase; letter-spacing:1px;">🥜 Amendoim</h4></div>
          <div><small>Preço do amendoim (R$/sc 25kg)</small><input class="input" name="precoAmendoim" value="${params.precoAmendoim||220}"></div>
          <div><small>Produtividade mínima (sc/ha)</small><input class="input" name="prodMinAmendoim" value="${params.produtividadeMinAmendoim||60}"></div>
          <div><small>Produtividade máxima (sc/ha)</small><input class="input" name="prodMaxAmendoim" value="${params.produtividadeMaxAmendoim||100}"></div>

          <div style="grid-column:1/-1;"><h4 style="margin:8px 0 4px; color:#374151; font-size:13px; text-transform:uppercase; letter-spacing:1px;">⚙️ Geral</h4></div>
          <div><small>Peso padrão da saca (kg)</small><input class="input" name="pesoPadraoSaca" value="${params.pesoPadraoSaca||60}"></div>
          <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar parâmetros</button></div>
        </form>
      </div>
      ${userRole === 'admin' ? `<div class="config-card">
        <h3>💾 Backup e Restauração</h3>` : '<div style="display:none;">'}
        <div class="row" style="gap:10px;"><button class="btn primary" id="btnExport2">📤 Exportar Backup</button><button class="btn" id="btnImport2">📥 Importar Backup</button></div>
      </div>
      ${userRole === 'admin' ? `<div class="config-card">
        <h3>⚠️ Reset de Dados</h3>` : '<div style="display:none;">'}
        <div class="reset-buttons"><button class="btn warning" id="btnZerarDados">🧹 Zerar todos os dados</button><button class="btn primary" id="btnRestaurarDemo">🔄 Restaurar dados de demonstração</button></div>
        <p style="margin-top:15px; color:#64748b; font-size:13px;"><strong>Zerar dados:</strong> remove todas as fazendas, talhões, produtos, estoque, etc., mantendo apenas a safra atual.<br><strong>Restaurar demo:</strong> recria o banco com os dados de exemplo.</p>
      </div>
      <div class="config-card">
        <h3>☁️ Sincronização na Nuvem (Supabase)</h3>
        <div id="cloudSyncStatus" style="margin-bottom:12px;">
          <p style="color:#64748b; font-size:13px;">Status: <b id="cloudStatusText">${(typeof isSupabaseReady === 'function' && isSupabaseReady()) ? '✅ Conectado ao Supabase' : '⚠️ Modo Offline'}</b></p>
        </div>
        <p style="color:#64748b; font-size:13px;">Seus dados são automaticamente sincronizados com a nuvem a cada alteração. Você também pode forçar uma sincronização manual.</p>
        <div class="row" style="gap:10px; margin-top:10px;">
          <button class="btn primary" id="btnForceSync">☁️ Sincronizar Agora</button>
          <button class="btn" id="btnForceRestore">📥 Restaurar da Nuvem</button>
        </div>
      </div>

      <div class="config-card">
        <h3>👤 Conta</h3>
        <p style="color:#64748b; font-size:13px;">Usuário: <b>${escapeHtml(userSession?.user?.email || 'N/A')}</b></p>
        <button class="btn" id="btnLogout" style="margin-top:10px;">🚪 Sair da Conta</button>
      </div>
    </div>
  `;

  document.getElementById("frmParams").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const db2 = getDB();
    db2.parametros = {
      precoSoja: Number(fd.get("precoSoja") || 120),
      produtividadeMinSoja: Number(fd.get("prodMinSoja") || 65),
      produtividadeMaxSoja: Number(fd.get("prodMaxSoja") || 75),
      precoMilho: Number(fd.get("precoMilho") || 60),
      produtividadeMinMilho: Number(fd.get("prodMinMilho") || 100),
      produtividadeMaxMilho: Number(fd.get("prodMaxMilho") || 130),
      precoSorgo: Number(fd.get("precoSorgo") || 42),
      produtividadeMinSorgo: Number(fd.get("prodMinSorgo") || 70),
      produtividadeMaxSorgo: Number(fd.get("prodMaxSorgo") || 100),
      precoFeijao: Number(fd.get("precoFeijao") || 280),
      produtividadeMinFeijao: Number(fd.get("prodMinFeijao") || 25),
      produtividadeMaxFeijao: Number(fd.get("prodMaxFeijao") || 40),
      precoTrigo: Number(fd.get("precoTrigo") || 85),
      produtividadeMinTrigo: Number(fd.get("prodMinTrigo") || 40),
      produtividadeMaxTrigo: Number(fd.get("prodMaxTrigo") || 60),
      precoArroz: Number(fd.get("precoArroz") || 60),
      produtividadeMinArroz: Number(fd.get("prodMinArroz") || 60),
      produtividadeMaxArroz: Number(fd.get("prodMaxArroz") || 80),
      precoCafe: Number(fd.get("precoCafe") || 1200),
      produtividadeMinCafe: Number(fd.get("prodMinCafe") || 20),
      produtividadeMaxCafe: Number(fd.get("prodMaxCafe") || 40),
      precoCanola: Number(fd.get("precoCanola") || 140),
      produtividadeMinCanola: Number(fd.get("prodMinCanola") || 40),
      produtividadeMaxCanola: Number(fd.get("prodMaxCanola") || 65),
      precoGirassol: Number(fd.get("precoGirassol") || 90),
      produtividadeMinGirassol: Number(fd.get("prodMinGirassol") || 35),
      produtividadeMaxGirassol: Number(fd.get("prodMaxGirassol") || 55),
      precoAmendoim: Number(fd.get("precoAmendoim") || 220),
      produtividadeMinAmendoim: Number(fd.get("prodMinAmendoim") || 60),
      produtividadeMaxAmendoim: Number(fd.get("prodMaxAmendoim") || 100),
      pesoPadraoSaca: Number(fd.get("pesoPadraoSaca") || 60)
    };
    setDB(db2);
    // Sync parâmetros diretamente no Supabase
    if (typeof SupaCRUD !== 'undefined') {
      try { await SupaCRUD.upsertParametros(db2.parametros); } catch (e) { console.warn('Sync params:', e.message); }
    }
    toast("Parâmetros salvos", "Valores atualizados.");
  });

  const exportBackup = () => { downloadText(`agro-pro-backup-${nowISO()}.json`, JSON.stringify(getDB(), null, 2)); toast("Backup exportado", "Arquivo .json baixado."); };
  document.getElementById("btnExport").addEventListener("click", exportBackup);
  document.getElementById("btnExport2").addEventListener("click", exportBackup);

  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.safras) { alert("Arquivo inválido (não contém safras)."); return; }
        if (!confirm("Importar vai SUBSTITUIR todos os dados locais. Continuar?")) return;
        Storage.save(data);
        // Sincronizar com a nuvem IMEDIATAMENTE após importação
        toast("Importado", "Sincronizando com a nuvem...");
        if (typeof cloudSyncImmediate === 'function') {
          cloudSyncImmediate().then(() => {
            toast("Sincronizado", "Backup enviado para a nuvem!");
            setTimeout(() => location.reload(), 500);
          }).catch(e => {
            console.warn('Sync após import:', e.message);
            setTimeout(() => location.reload(), 500);
          });
        } else {
          setTimeout(() => location.reload(), 500);
        }
      } catch (e) { alert("Não foi possível ler o arquivo JSON."); }
    };
    input.click();
  };
  document.getElementById("btnImport").addEventListener("click", importBackup);
  document.getElementById("btnImport2").addEventListener("click", importBackup);

  document.getElementById("btnZerarDados").addEventListener("click", () => {
    if (!confirm("⚠️ Isso vai APAGAR todas as fazendas, talhões, produtos, estoque, aplicações, colheitas, etc. Deseja continuar?")) return;
    const db2 = getDB();
    const safraAtualId = getSafraId();
    db2.fazendas = []; db2.talhoes = []; db2.produtos = []; db2.estoque = []; db2.equipe = []; db2.maquinas = []; db2.clima = []; db2.dieselEntradas = []; db2.dieselEstoque = []; db2.combustivel = []; db2.aplicacoes = []; db2.lembretes = []; db2.pragas = []; db2.colheitas = []; db2.manutencoes = []; db2.insumosBase = [];
    db2.dieselEstoque.push({ id: uid("dsl"), safraId: safraAtualId, deposito: "Tanque Principal", litros: 0, precoVigente: 0, obs: "Estoque zerado" });
    setDB(db2);
    toast("Dados zerados", "Todos os registros foram removidos.");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnRestaurarDemo").addEventListener("click", () => {
    if (!confirm("⚠️ Isso vai SUBSTITUIR todos os dados atuais pelos dados de demonstração. Continuar?")) return;
    localStorage.removeItem(Storage.key);
    seedDB();
    toast("Demonstração restaurada", "Banco de dados recriado.");
    setTimeout(() => location.reload(), 200);
  });

  // API Key removida do front-end — IA processada via Edge Function no servidor
  // Limpar chave antiga do localStorage se existir (migração de segurança)
  localStorage.removeItem("agro_pro_openai_key");

  // Cloud Sync Manual
  document.getElementById("btnForceSync")?.addEventListener("click", async () => {
    if (typeof cloudSyncImmediate !== 'function' || typeof isSupabaseReady !== 'function' || !isSupabaseReady()) {
      toast("Offline", "Supabase não configurado. Configure as credenciais no supabase-client.js");
      return;
    }
    toast("Sincronizando", "Enviando dados para a nuvem...");
    try {
      // Resetar hash para forçar sync completo (mesmo dados sem alteração)
      if (typeof window._lastSyncedHash !== 'undefined') window._lastSyncedHash = null;
      await cloudSyncImmediate();
      toast("Sucesso", "Dados sincronizados com a nuvem! Verifique o Supabase.");
    } catch(e) {
      toast("Erro", "Falha ao sincronizar: " + e.message);
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
        toast("Info", "Dados locais já estão atualizados ou nenhum backup encontrado.");
      }
    } catch (e) {
      toast("Erro", "Falha ao restaurar: " + e.message);
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
    toast("Logout", "Você saiu da conta.");
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  });
}

// ============================================================================
// PÁGINA RELATÓRIOS — ATUALIZADA COM MANUTENÇÃO, INSUMOS BASE E FRETE
// ============================================================================

