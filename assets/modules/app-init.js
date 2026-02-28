function boot() {
  if (!document.getElementById("globalStyles")) {
    const s = document.createElement("style");
    s.id = "globalStyles";
    s.innerHTML = `
      :root {
        --primary: #2e7d32;
        --primary-dark: #1b5e20;
        --bg: #f8fafc;
        --sidebar-bg: #1e293b;
        --text: #334155;
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); overflow-x: hidden; }
      
      .app { display: flex; min-height: 100vh; }
      
      /* Sidebar Responsiva */
      .sidebar { 
        width: 260px; background: var(--sidebar-bg); color: white; display: flex; flex-direction: column; 
        transition: transform 0.3s ease; z-index: 1000;
      }
      .sidebar.hidden { transform: translateX(-260px); position: absolute; height: 100%; }
      
      .brand { padding: 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .logo { width: 32px; height: 32px; background: #4ade80; border-radius: 8px; }
      .brand h1 { font-size: 18px; margin: 0; }
      .brand p { font-size: 11px; margin: 0; opacity: 0.6; }
      
      .nav { flex: 1; padding: 10px; overflow-y: auto; }
      .nav a { 
        display: flex; align-items: center; gap: 10px; padding: 10px 15px; color: #cbd5e1; 
        text-decoration: none; border-radius: 8px; font-size: 14px; margin-bottom: 2px;
      }
      .nav a:hover { background: rgba(255,255,255,0.05); color: white; }
      .nav a.active { background: var(--primary); color: white; font-weight: 600; }
      
      .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .topbar { 
        background: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100;
      }
      .topbar h2 { margin: 0; font-size: 20px; color: #0f172a; }
      
      .content { padding: 25px; max-width: 1400px; margin: 0 auto; width: 100%; }
      
      /* Mobile Menu Button */
      .menu-toggle { display: none; background: none; border: none; font-size: 24px; cursor: pointer; padding: 5px; }
      
      /* Cards e Layout */
      .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; border: 1px solid #e2e8f0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
      
      /* Tabelas Responsivas */
      @media (max-width: 768px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; height: auto; position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
        .sidebar.active { transform: translateX(0); }
        .menu-toggle { display: block; }
        .topbar { padding: 15px; }
        .content { padding: 15px; }
        
        .tableWrap { border: none; }
        table, thead, tbody, th, td, tr { display: block; }
        thead tr { position: absolute; top: -9999px; left: -9999px; }
        tr { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; background: white; padding: 10px; }
        td { border: none; position: relative; padding-left: 50%; text-align: right; min-height: 30px; display: flex; align-items: center; justify-content: flex-end; }
        td:before { content: attr(data-label); position: absolute; left: 10px; width: 45%; padding-right: 10px; white-space: nowrap; text-align: left; font-weight: bold; color: #64748b; }
      }
      
      /* IA Chat Styles */
      .chat-container { height: 500px; display: flex; flex-direction: column; background: #f1f5f9; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
      .msg { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
      .msg.user { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 2px; }
      .msg.bot { align-self: flex-start; background: white; color: var(--text); border-bottom-left-radius: 2px; border: 1px solid #e2e8f0; }
      .chat-input { padding: 15px; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; }
      
      .plan-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
      .plan-free  { background: #e2e8f0; color: #64748b; }
      .plan-basic { background: #e2e8f0; color: #475569; }
      .plan-basico { background: #e2e8f0; color: #475569; }
      .plan-pro { background: #dcfce7; color: #166534; }
      .plan-master { background: #fef9c3; color: #854d0e; }
      .plan-trial { background: #e2e8f0; color: #64748b; }
`;
    document.head.appendChild(s);
  }
  const pageKey = document.body.getAttribute("data-page") || "dashboard";
  const titles = {
    dashboard: ["Dashboard", "Visão geral da safra atual"],
    centralgestao: ["Central de Gestão", "Alertas, custos e IA prescritiva"],
    safras: ["Safras", "Gerenciar safras"],
    fazendas: ["Fazendas", "Unidades produtivas da safra"],
    talhoes: ["Talhões", "Áreas de cultivo da safra"],
    produtos: ["Produtos", "Insumos da safra"],
    estoque: ["Estoque", "Controle de insumos da safra"],
    insumosbase: ["Insumos Base", "Adubação e insumos de base por talhão"],
    aplicacoes: ["Aplicações", "Operações da safra"],
    combustivel: ["Combustível", "Entradas e saídas de diesel"],
    clima: ["Clima/Chuva", "Registros climáticos da safra"],
    colheitas: ["Colheitas", "Produção real e frete da safra"],
    manutencao: ["Manutenção", "Manutenção de máquinas e equipamentos"],
    equipe: ["Equipe", "Colaboradores da safra"],
    maquinas: ["Máquinas", "Equipamentos da safra"],
    relatorios: ["Relatórios", "Exportação de dados da safra"],
    config: ["Configurações", "Parâmetros e backup"],
    copilot: ["Agro-Copilot", "Assistente de IA para sua fazenda"],
    ajuda: ["Ajuda & Suporte", "Centro de Ajuda e Documentação"],
    pagamento: ["Pagamento & Planos", "Assine ou gerencie seu plano"]
  };

  // API Key removida do front-end — IA processada via Edge Function no servidor
  localStorage.removeItem("agro_pro_openai_key");
  sessionStorage.removeItem("agro_pro_openai_key");

  // Verificar Sessão — Online (Supabase) ou Offline (localStorage cache)
  if (pageKey !== "login") {
    if (typeof AuthService !== 'undefined' && typeof isSupabaseReady === 'function' && isSupabaseReady()) {
      // === MODO ONLINE: validar sessão real com Supabase ===
      AuthService.getSession().then(async (session) => {
        if (!session || !session.user) {
          localStorage.removeItem("agro_session");
          pageLogin();
          return;
        }

        // Sincronizar dados da sessão para o localStorage (apenas cache)
        const profile = await AuthService.getUserProfile();

        // ============================================================
        // SEGURANÇA: profile nulo significa conta deletada no Supabase
        // mas JWT ainda vigente → forçar logout imediato
        // ============================================================
        if (!profile) {
          console.warn('[Auth] Sessão ativa mas profile não encontrado — forçando logout por segurança');
          ['agro_session','agro_role','agro_trial','agro_plano'].forEach(k => localStorage.removeItem(k));
          if (isSupabaseReady()) await AuthService.signOut().catch(() => {});
          pageLogin();
          return;
        }

        const planMap = { free: 'Free', trial: 'Free', basico: 'Free', pro: 'Pro', master: 'Master' };

        userSession = {
          user: { id: session.user.id, email: session.user.email, nome: profile?.full_name || '', role: profile?.user_role || 'admin' }
        };
        localStorage.setItem("agro_session", JSON.stringify(userSession));

        userRole = profile?.user_role || 'admin';
        localStorage.setItem("agro_role", userRole);

        if (profile?.plan_type) {
          planoAtual = planMap[profile.plan_type] || 'Free';
          localStorage.setItem("agro_plano", planoAtual);
        }

        // Sem trial: sempre limpar dados de trial
        trialInfo = null;
        localStorage.removeItem("agro_trial");

        _renderPageAfterAuth(pageKey, titles);
      }).catch(() => {
        // Supabase falhou: tentar sessão em cache antes de deslogar
        const cached = localStorage.getItem("agro_session");
        if (cached) {
          try {
            userSession = JSON.parse(cached);
            userRole = userSession?.user?.role || localStorage.getItem("agro_role") || 'admin';
            trialInfo = null;
            planoAtual = localStorage.getItem("agro_plano") || 'Free';
            _renderPageAfterAuth(pageKey, titles);
          } catch (_e) {
            localStorage.removeItem("agro_session");
            pageLogin();
          }
        } else {
          pageLogin();
        }
      });
      return;
    } else {
      // === MODO OFFLINE: Supabase indisponível — usar sessão em cache ===
      const cached = localStorage.getItem("agro_session");
      if (cached) {
        try {
          userSession = JSON.parse(cached);
          userRole = userSession?.user?.role || localStorage.getItem("agro_role") || 'admin';
          trialInfo = null;
          planoAtual = localStorage.getItem("agro_plano") || 'Free';
          // Mostrar aviso de modo offline na tela
          window._offlineMode = true;
          _renderPageAfterAuth(pageKey, titles);
        } catch (_e) {
          pageLogin();
        }
      } else {
        // Sem cache e sem Supabase: forçar login
        pageLogin();
      }
      return;
    }
  }

  // Se estiver na página de login e já tiver sessão, vai para home
  if (pageKey === "login") {
    const sessionRaw = localStorage.getItem("agro_session");
    if (sessionRaw) {
      window.location.href = "index.html";
      return;
    }
    pageLogin();
    return;
  }
}

// Nova função auxiliar para renderizar após a confirmação da autenticação
function _renderPageAfterAuth(pageKey, titles) {
  // ─── Verificar trial e plano (dados já carregados do Supabase ou cache) ───
  trialInfo = getTrialInfo();
  const planoSalvo = localStorage.getItem("agro_plano") || "Trial";
  if (planoSalvo === "Trial") {
    if (trialInfo && trialInfo.expirado) { pageTrialExpirado(); return; }
    planoAtual = "Trial";
  } else {
    planoAtual = planoSalvo;
  }

  const [t, s] = titles[pageKey] || ["Agro Pro", ""];
  renderShell(pageKey, t, s);

  // Banner de trial
  const trialBannerHTML = renderTrialBanner();
  if (trialBannerHTML) {
    const mainEl = document.querySelector('.main');
    if (mainEl) mainEl.insertAdjacentHTML('afterbegin', trialBannerHTML);
  }

  // Banner de modo offline (Supabase indisponível)
  if (window._offlineMode) {
    const mainEl = document.querySelector('.main');
    if (mainEl) {
      mainEl.insertAdjacentHTML('afterbegin', `
        <div id="offlineBanner" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 10px 20px; text-align: center; font-size: 13px; font-weight: 500; position: sticky; top: 0; z-index: 9998;">
          📴 <b>Modo Offline</b> — Sem conexão com o Supabase. Seus dados locais estão disponíveis, mas alterações não serão sincronizadas até a reconexão.
        </div>
      `);
    }
  }

  if (!canAccessPage(pageKey)) {
    document.getElementById('content').innerHTML = `
      <div class="card" style="text-align:center; padding:40px;">
        <h2>🚫 Acesso Restrito</h2>
        <p style="color:#64748b;">Seu perfil de <b>${getRoleLabel()}</b> não tem permissão para acessar esta página.</p>
        <a href="index.html" class="btn primary" style="margin-top:15px;">Voltar ao Dashboard</a>
      </div>
    `;
  } else {
    // Renderizar página específica
    if (pageKey === "dashboard") pageDashboard();
    else if (pageKey === "centralgestao") pageCentralGestao();
    else if (pageKey === "safras") pageSafras();
    else if (pageKey === "fazendas") pageFazendas();
    else if (pageKey === "talhoes") pageTalhoes();
    else if (pageKey === "produtos") pageProdutos();
    else if (pageKey === "estoque") pageEstoque();
    else if (pageKey === "insumosbase") pageInsumosBase();
    else if (pageKey === "aplicacoes") pageAplicacoes();
    else if (pageKey === "combustivel") pageCombustivel();
    else if (pageKey === "clima") pageClima();
    else if (pageKey === "colheitas") pageColheitas();
    else if (pageKey === "manutencao") pageManutencao();
    else if (pageKey === "equipe") pageEquipe();
    else if (pageKey === "maquinas") pageMaquinas();
    else if (pageKey === "relatorios") pageRelatorios();
    else if (pageKey === "copilot") pageCopilot();
    else if (pageKey === "ajuda") pageAjuda();
    else if (pageKey === "config") pageConfiguracoes();
    else if (pageKey === "pagamento") pagePagamento();
  }

  // Status da nuvem
  const sidebarBottom = document.querySelector('.sidebar > div:last-child');
  if (sidebarBottom) {
    sidebarBottom.insertAdjacentHTML('beforeend', `
      <div id="cloudStatusIndicator" style="margin-top: 8px; font-size: 10px; text-align: center;"></div>
    `);
  }
  function updateCloudStatus() {
    var el = document.getElementById('cloudStatusIndicator');
    if (!el) return;
    var ready = window._cloudConnected === true || (typeof isSupabaseReady === 'function' && isSupabaseReady());
    el.textContent = ready ? '☁️ Conectado' : '📴 Offline';
    if (ready) { el.classList.add('text-success'); el.classList.remove('text-warning'); } else { el.classList.add('text-warning'); el.classList.remove('text-success'); }
  }
  updateCloudStatus();
  setInterval(updateCloudStatus, 5000);

  // === CLOUD SYNC / RESTORE (apenas uma vez, sem reload automático) ===
  // Usamos flag de sessionStorage para evitar loop de reload
  if (typeof cloudSync === 'function') {
    if (!window._offlineMode) {
      // Online: tentar restaurar apenas na PRIMEIRA carga da sessão
      const jaRestaurou = sessionStorage.getItem('_cloudRestored');
      if (!jaRestaurou && typeof cloudRestore === 'function') {
        sessionStorage.setItem('_cloudRestored', '1'); // marcar ANTES para evitar loop
        cloudRestore().then(restored => {
          if (restored) {
            // Dados atualizados no localStorage — recarregar UMA única vez
            location.reload();
          } else {
            cloudSync();
          }
        }).catch(() => cloudSync());
      } else {
        cloudSync();
      }
    }
    // Offline: não tentar sync (vai falhar e causar erros)
  }
}

document.addEventListener("DOMContentLoaded", boot);
