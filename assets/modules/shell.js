function renderShell(pageKey, title, subtitle) {
  const db = getDB();
  const safraId = getSafraId();
  const safra = getSafraAtual();

  // Filtrar páginas pela role do usuário
  const allowedPages = PAGES.filter(p => canAccessPage(p.key));
  const nav = allowedPages.map(p => {
    const active = (p.key === pageKey) ? "active" : "";
    const ariaCurrent = (p.key === pageKey) ? ' aria-current="page"' : '';
    return `<a class="${active}" href="${p.href}" role="menuitem"${ariaCurrent}><span class="ico" aria-hidden="true">${p.icon}</span> ${escapeHtml(p.label)}${p.badge ? ` <span style="background:#fbbf24; color:#0f172a; font-size:9px; padding:1px 6px; border-radius:8px; font-weight:800; vertical-align:middle; margin-left:4px;" aria-label="${p.badge}">${p.badge}</span>` : ''}</a>`;
  }).join("");

  const safraOptions = db.safras.length > 0
    ? db.safras.map(s => {
        const sel = s.id === safraId ? "selected" : "";
        return `<option value="${s.id}" ${sel}>${escapeHtml(s.nome)} ${s.ativa ? '✅' : ''}</option>`;
      }).join("")
    : `<option value="" disabled selected>— Nenhuma safra cadastrada —</option>`;

  const root = document.getElementById("app");
  root.innerHTML = `
    <a class="skip-link" href="#content" id="skipLink">Pular para conteúdo principal</a>
    <div class="app" role="application">
      <button class="menu-toggle noPrint" id="menuToggle" aria-label="Abrir menu lateral" aria-expanded="false" aria-controls="sidebar">☰</button>
      <aside class="sidebar" id="sidebar" role="navigation" aria-label="Menu principal">
        <div class="brand">
          <div class="logo" role="img" aria-label="Logo Agro Pro"></div>
          <div>
            <h1>Agro Pro <span class="plan-badge plan-${planoAtual.toLowerCase()}" aria-label="Plano ${planoAtual}">${planoAtual}</span></h1>
            <p>Gestão Agrícola Inteligente</p>
            ${userRole !== 'admin' ? `<span style="${getRoleBadgeColor()} font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: bold;" role="status" aria-label="Perfil ${getRoleLabel()}">${getRoleLabel()}</span>` : ''}
          </div>
        </div>

        <div class="tenant" role="region" aria-label="Filtros de safra e fazenda">
          <div class="row">
            <span class="badge" aria-label="Plano ativo: ${planoAtual}"><span class="dot" aria-hidden="true"></span> ${planoAtual}</span>
            <button class="btn noPrint" id="btnBackup" aria-label="Fazer backup dos dados">Backup</button>
          </div>
          <div class="hr" aria-hidden="true"></div>
          
          <label for="safraSelect" class="sr-only">Safra ativa</label>
          <small aria-hidden="true">🌱 Safra ativa</small>
          <select class="select" id="safraSelect" aria-label="Selecionar safra ativa" ${db.safras.length === 0 ? 'disabled aria-disabled="true" style="opacity:0.5"' : ''}>${safraOptions}</select>
          
          <label for="fazendaSelect" class="sr-only">Filtrar por fazenda</label>
          <small style="margin-top:10px; display:block;" aria-hidden="true">🏡 Filtrar por Fazenda</small>
          <select class="select" id="fazendaSelect" aria-label="Filtrar por fazenda">
            <option value="">Todas as Fazendas</option>
            ${db.fazendas.filter(f => f.safraId === safraId).map(f => `<option value="${f.id}" ${fazendaAtual === f.id ? 'selected' : ''}>${escapeHtml(f.nome)}</option>`).join('')}
          </select>
          
          <div style="margin-top:10px" class="row">
            <button class="btn primary" id="btnNovaSafra" aria-label="Criar nova safra">+ Nova safra</button>
          </div>
        </div>

        <nav class="nav" aria-label="Navegação do sistema">${nav}</nav>

        <div style="margin: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 12px;" role="complementary" aria-label="Informações do plano">
           <b>Plano ${planoAtual}</b>
           ${userRole !== 'admin' ? `<br><span style="color: #fbbf24;">Perfil: ${getRoleLabel()}</span>` : ''}<br>
           ${(planoAtual === 'Free' || planoAtual === 'Trial') ? `<span style="color: rgba(251,191,36,0.85); font-size: 11px;">Acesso limitado — só visualização</span><br>` : ''}
           ${userRole === 'admin' ? `<a href="configuracoes.html" style="color: #4ade80; text-decoration: none;" aria-label="${(planoAtual === 'Free' || planoAtual === 'Trial') ? 'Assinar plano' : 'Gerenciar plano'}">${(planoAtual === 'Free' || planoAtual === 'Trial') ? 'Assinar plano' : 'Gerenciar plano'} →</a>` : `<span style="color: #94a3b8;">Conta vinculada ao admin</span>`}
           
           <button id="btnSairSidebar" aria-label="Sair da conta" style="width: 100%; margin-top: 15px; padding: 8px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">🚪 Sair da conta</button>
           <div style="margin-top:8px; text-align:center;">
             <button id="btnShortcutsHelp" style="background:none; border:none; color:rgba(255,255,255,0.35); font-size:10px; cursor:pointer; padding:2px;" aria-label="Ver atalhos de teclado" title="Atalhos de teclado (?)">
               ⌨ Atalhos <kbd class="kbd" style="font-size:9px; background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15); color:rgba(255,255,255,0.5);">?</kbd>
             </button>
           </div>
        </div>
      </aside>

      <main class="main" role="main">
        <div class="topbar" role="banner">
          <div style="display:flex; align-items:center; gap:15px;">
            <button class="menu-toggle noPrint" id="menuToggleMain" aria-label="Abrir menu lateral" aria-expanded="false" aria-controls="sidebar">☰</button>
            <div class="title">
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(subtitle || (safra ? `Safra: ${safra.nome}` : "Selecione uma safra"))}</p>
            </div>
          </div>
          <div class="actions noPrint" id="topActions">
            <button class="theme-toggle noPrint" id="btnThemeToggle" title="Alternar modo escuro/claro (Ctrl+D)" aria-label="Alternar tema claro e escuro">🌙</button>
          </div>
        </div>

        <div id="content" class="content" role="region" aria-label="Conteúdo principal" tabindex="-1"></div>
      </main>
    </div>
  `;

  // Listeners Mobile — toggle sidebar + sync aria-expanded
  const toggle = () => {
    document.getElementById("sidebar").classList.toggle("active");
    _syncMenuAria();
  };
  document.getElementById("menuToggleMain")?.addEventListener("click", toggle);
  if(document.getElementById("menuToggle")) document.getElementById("menuToggle").addEventListener("click", toggle);

  // Dark mode toggle
  const _applyTheme = (dark) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.textContent = dark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    localStorage.setItem('agro_theme', dark ? 'dark' : 'light');
  };
  // Apply saved theme on render
  const _savedTheme = localStorage.getItem('agro_theme') || 'light';
  _applyTheme(_savedTheme === 'dark');
  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    _applyTheme(!isDark);
  });

  // ═══ KEYBOARD SHORTCUTS ═══
  function _showShortcutsOverlay() {
    if (document.getElementById('shortcutsOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'shortcutsOverlay';
    overlay.className = 'shortcuts-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Atalhos de teclado');
    overlay.innerHTML = `
      <div class="shortcuts-panel">
        <h2>⌨ Atalhos de Teclado</h2>
        <div class="shortcut-row"><span>Dashboard</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">1</kbd></span></div>
        <div class="shortcut-row"><span>Propriedade</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">2</kbd></span></div>
        <div class="shortcut-row"><span>Aplicações</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">3</kbd></span></div>
        <div class="shortcut-row"><span>Colheitas</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">4</kbd></span></div>
        <div class="shortcut-row"><span>Relatórios</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">5</kbd></span></div>
        <div class="shortcut-row"><span>Copilot IA</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">6</kbd></span></div>
        <div class="shortcut-row"><span>Configurações</span><span class="shortcut-keys"><kbd class="kbd">Alt</kbd>+<kbd class="kbd">7</kbd></span></div>
        <div class="shortcut-row"><span>Alternar tema</span><span class="shortcut-keys"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">D</kbd></span></div>
        <div class="shortcut-row"><span>Abrir/fechar menu</span><span class="shortcut-keys"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">M</kbd></span></div>
        <div class="shortcut-row"><span>Busca rápida (foco na safra)</span><span class="shortcut-keys"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">K</kbd></span></div>
        <div class="shortcut-row"><span>Mostrar atalhos</span><span class="shortcut-keys"><kbd class="kbd">?</kbd></span></div>
        <div style="margin-top:var(--space-5); text-align:right;">
          <button class="btn primary" id="closeShortcuts" aria-label="Fechar atalhos">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('closeShortcuts')?.addEventListener('click', () => overlay.remove());
    document.getElementById('closeShortcuts')?.focus();
  }

  const _shortcutPages = {
    '1': 'index.html',
    '2': 'propriedade.html',
    '3': 'aplicacoes.html',
    '4': 'colheitas.html',
    '5': 'relatorios.html',
    '6': 'copilot.html',
    '7': 'configuracoes.html'
  };

  document.addEventListener('keydown', (e) => {
    // Ignore shortcuts when typing in inputs
    const tag = (e.target.tagName || '').toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

    // ? key — show shortcuts
    if (e.key === '?' && !isInput) {
      e.preventDefault();
      _showShortcutsOverlay();
      return;
    }
    // Escape — close shortcuts overlay or sidebar
    if (e.key === 'Escape') {
      const overlay = document.getElementById('shortcutsOverlay');
      if (overlay) { overlay.remove(); return; }
      const sb = document.getElementById('sidebar');
      if (sb && sb.classList.contains('active')) { sb.classList.remove('active'); return; }
    }
    // Alt+N — navigate to pages
    if (e.altKey && _shortcutPages[e.key]) {
      e.preventDefault();
      window.location.href = _shortcutPages[e.key];
      return;
    }
    // Ctrl+D — toggle dark mode
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      _applyTheme(!isDark);
      return;
    }
    // Ctrl+M — toggle mobile menu
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      document.getElementById('sidebar')?.classList.toggle('active');
      return;
    }
    // Ctrl+K — focus safra selector
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      document.getElementById('safraSelect')?.focus();
      return;
    }
  });

  // Shortcuts help button
  document.getElementById('btnShortcutsHelp')?.addEventListener('click', _showShortcutsOverlay);

  // Sidebar toggle aria-expanded sync
  const _syncMenuAria = () => {
    const sb = document.getElementById('sidebar');
    const isOpen = sb?.classList.contains('active') || false;
    document.getElementById('menuToggle')?.setAttribute('aria-expanded', String(isOpen));
    document.getElementById('menuToggleMain')?.setAttribute('aria-expanded', String(isOpen));
  };

  document.getElementById("safraSelect").addEventListener("change", (e) => {
    setSafraId(e.target.value);
    toast("Safra alterada", "Filtrando dados...");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("fazendaSelect").addEventListener("change", (e) => {
    fazendaAtual = e.target.value || null;
    if (fazendaAtual) localStorage.setItem("agro_fazenda_filtro", fazendaAtual);
    else localStorage.removeItem("agro_fazenda_filtro");
    toast("Fazenda filtrada", "Recarregando...");
    setTimeout(() => location.reload(), 300);
  });

  document.getElementById("btnNovaSafra").addEventListener("click", () => {
    const nome = prompt("Nome da nova safra (ex: 2026/27):");
    if (!nome) return;
    const db2 = getDB();
    if (!db2.safras) db2.safras = [];
    const id = uid("saf");
    db2.safras.push({ 
      id, 
      nome, 
      dataInicio: nowISO(),
      dataFim: "",
      ativa: true,
      observacoes: ""
    });
    setDB(db2);
    setSafraId(id);
    toast("Safra criada", "Nova safra ativada!");
    setTimeout(() => location.reload(), 200);
  });

  document.getElementById("btnSairSidebar")?.addEventListener("click", async () => {
    if (confirm("Deseja realmente sair da conta?")) {
      toast("Saindo...", "Salvando dados na nuvem...");
      
      // Fazer sync IMEDIATO antes de sair
      try { if (typeof cloudSyncImmediate === 'function') await cloudSyncImmediate(); } catch (e) {}
      
      // SignOut do Supabase
      try { if (typeof AuthService !== 'undefined' && isSupabaseReady()) await AuthService.signOut(); } catch (e) {}
      
      // Limpar dados locais
      ['agro_session','agro_role','agro_trial','agro_plano','agro_pro_v10'].forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      toast("Saindo...", "Até logo!");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
    }
  });
}

/* ------------------ Helpers ------------------ */
function onlySafra(arr) {
  const sid = getSafraId();
  if (!sid) return arr || [];
  return (arr || []).filter(x => (x.safra_id === sid || x.safraId === sid));
}

function findNameById(arr, id, fallback = "-") {
  const o = (arr || []).find(x => x.id === id);
  return o ? (o.nome ?? fallback) : fallback;
}

const FMT_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function brl(v) { return FMT_BRL.format(Number(v || 0)); }
function num(v, casas = 2) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(Number(v || 0));
}
function kbrl(n) { return brl(n); }

function setTopActions(html) {
  const el = document.getElementById("topActions");
  if (el) el.innerHTML = html || "";
}

function clampStr(s, max = 60) {
  s = String(s ?? "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/* ------------------ Estoque: baixas automáticas ------------------ */
function ensureStockRow(db, produtoId, deposito = "Central", unidade = "") {
  db.estoque = db.estoque || [];
  let row = db.estoque.find(s => s.safraId === getSafraId() && s.produtoId === produtoId && (s.deposito || "Central") === deposito);
  if (!row) {
    const prod = db.produtos.find(p => p.id === produtoId);
    row = { id: uid("stk"), safraId: getSafraId(), produtoId, deposito, lote: "", validade: "", qtd: 0, unidade: unidade || (prod ? prod.unidade : ""), obs: "(auto)" };
    db.estoque.push(row);
  }
  return row;
}

function baixaEstoqueProdutoPorId(db, produtoId, quantidade, unidade = "") {
  if (!produtoId || !quantidade) return { ok: false, msg: "Sem produto/quantidade" };
  const prod = onlySafra(db.produtos).find(p => p.id === produtoId);
  if (!prod) return { ok: false, msg: `Produto não encontrado` };
  const row = ensureStockRow(db, produtoId, "Central", unidade || prod.unidade);
  row.qtd = Number(row.qtd || 0) - Number(quantidade || 0);
  return { ok: true, msg: `Baixa estoque: ${prod.nome} -${num(quantidade, 2)} ${row.unidade}` };
}

/* ------------------ Diesel: entrada e baixa automática ------------------ */
function registrarEntradaDiesel(db, deposito, litros, precoLitro, data, obs = "") {
  const entrada = {
    id: uid("de"),
    safraId: getSafraId(),
    data: data || nowISO(),
    litros,
    precoLitro,
    deposito,
    obs
  };
  db.dieselEntradas = db.dieselEntradas || [];
  db.dieselEntradas.push(entrada);

  let tank = db.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
  if (!tank) {
    tank = { id: uid("dsl"), safraId: getSafraId(), deposito, litros: 0, precoVigente: 0, obs: "" };
    db.dieselEstoque.push(tank);
  }
  tank.litros = Number(tank.litros || 0) + litros;
  tank.precoVigente = precoLitro;
  return tank;
}

function baixaDiesel(db, deposito, litros) {
  const tank = db.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
  if (!tank) return { ok: false, msg: "Tanque não encontrado" };
  const precoVigente = tank.precoVigente || 0;
  tank.litros = Number(tank.litros || 0) - Number(litros || 0);
  return { ok: true, precoLitro: precoVigente };
}

/* ------------------ Custo por talhão ------------------ */
function calcCustosPorTalhao(db) {
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const fazendas = onlySafra(db.fazendas);
  const apl = onlySafra(db.aplicacoes || []);
  const cmb = onlySafra(db.combustivel || []);
  const inb = onlySafra(db.insumosBase || []);
  const col = onlySafra(db.colheitas || []);
  const manut = onlySafra(db.manutencoes || []);
  const areaTotal = talhoes.reduce((s, t) => s + Number(t.areaHa || 0), 0);
  const custoManutTotal = manut.reduce((s, m) => s + Number(m.custoTotal || 0), 0);

  const map = new Map();
  for (const t of talhoes) map.set(t.id, { custo: 0, last: "", ops: 0 });

  for (const a of apl) {
    if (!a.talhaoId) continue;
    const rec = map.get(a.talhaoId) || { custo: 0, last: "", ops: 0 };
    rec.custo += Number(a.custoTotal || 0);
    rec.ops += 1;
    if ((a.data || "") > (rec.last || "")) rec.last = a.data || "";
    map.set(a.talhaoId, rec);
  }

  for (const c of cmb) {
    if (!c.talhaoId) continue;
    const rec = map.get(c.talhaoId) || { custo: 0, last: "", ops: 0 };
    rec.custo += Number(c.litros || 0) * Number(c.precoLitro || 0);
    rec.ops += 1;
    if ((c.data || "") > (rec.last || "")) rec.last = c.data || "";
    map.set(c.talhaoId, rec);
  }

  // Insumos Base por talhão
  for (const i of inb) {
    if (!i.talhaoId) continue;
    const rec = map.get(i.talhaoId) || { custo: 0, last: "", ops: 0 };
    rec.custo += Number(i.custoTotal || 0);
    rec.ops += 1;
    if ((i.data || "") > (rec.last || "")) rec.last = i.data || "";
    map.set(i.talhaoId, rec);
  }

  // Frete por talhão (da colheita)
  for (const c of col) {
    if (!c.talhaoId) continue;
    let frete = 0;
    if (c.frete1) frete += Number(c.frete1.custoFrete || 0);
    if (c.frete2) frete += Number(c.frete2.custoFrete || 0);
    if (frete > 0) {
      const rec = map.get(c.talhaoId) || { custo: 0, last: "", ops: 0 };
      rec.custo += frete;
      map.set(c.talhaoId, rec);
    }
  }

  // Manutenção: rateio proporcional à área
  for (const t of talhoes) {
    if (areaTotal > 0 && custoManutTotal > 0) {
      const rec = map.get(t.id) || { custo: 0, last: "", ops: 0 };
      rec.custo += custoManutTotal * (Number(t.areaHa || 0) / areaTotal);
      map.set(t.id, rec);
    }
  }

  return talhoes.map(t => {
    const info = map.get(t.id) || { custo: 0, last: "", ops: 0 };
    const area = Number(t.areaHa || 0) || 0;
    const custoHa = area > 0 ? (info.custo / area) : 0;
    return {
      talhaoId: t.id,
      talhao: t.nome,
      fazenda: findNameById(fazendas, t.fazendaId),
      areaHa: area,
      custoTotal: info.custo,
      custoHa,
      last: info.last || "-",
      ops: info.ops || 0
    };
  }).sort((a, b) => b.custoTotal - a.custoTotal);
}

/* ------------------ Alertas de pragas baseados no clima ------------------ */
function gerarAlertasPragas(db) {
  const alertas = [];
  const clima = onlySafra(db.clima || []).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const pragas = onlySafra(db.pragas || []);

  for (const t of talhoes) {
    const climaTalhao = clima.filter(c => c.talhaoId === t.id || c.talhaoId === "");
    if (climaTalhao.length === 0) continue;

    const tempMedia = (climaTalhao[0].tempMax + climaTalhao[0].tempMin) / 2;
    const umidade = climaTalhao[0].umidade;

    for (const p of pragas) {
      if (!p.culturas.includes(t.cultura?.toLowerCase())) continue;

      const tempFavoravel = tempMedia >= p.tempMin && tempMedia <= p.tempMax;
      const umidFavoravel = umidade >= p.umidadeMin;

      if (tempFavoravel && umidFavoravel) {
        alertas.push({
          tipo: "praga",
          mensagem: `⚠️ Risco de ${p.nome} no talhão ${t.nome}`,
          detalhe: `Temperatura ${tempMedia.toFixed(1)}°C, Umidade ${umidade}%`,
          data: nowISO(),
          talhaoId: t.id,
          pragaId: p.id
        });
      }
    }
  }
  return alertas;
}

/* ------------------ CRUD genérico ------------------ */
function crudPage({ entityKey, subtitle, fields, columns, helpers }) {
  const db = getDB();
  const sid = getSafraId();

  // Permissões por role
  const _pkMap = { equipe:'equipe', maquinas:'maquinas', safras:'safras', fazendas:'fazendas', talhoes:'talhoes', produtos:'produtos', estoque:'estoque', insumosbase:'insumosbase', aplicacoes:'aplicacoes', combustivel:'combustivel', clima:'clima', colheitas:'colheitas', manutencao:'manutencao' };
  const _cpk = _pkMap[entityKey] || entityKey;
  const _canCr = canCreateOnPage(_cpk);
  const _canDel = canDeleteOnPage(_cpk);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  const formHtml = _canCr ? `
      <div class="card">
      <h3>Novo registro</h3>
      <div class="help">${escapeHtml(subtitle || "")}</div>
      <div class="hr"></div>
      <form id="frm" class="formGrid">
        ${fields.map(f => {
          const full = f.full ? "full" : "";
          if (f.type === "select") {
            const opts = (typeof f.options === "function" ? f.options(getDB()) : (f.options || []))
              .map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
            return `
              <div class="${full}">
                <small>${escapeHtml(f.label)}</small>
                <select class="select" name="${escapeHtml(f.key)}">${opts}</select>
              </div>
            `;
          }
          if (f.type === "textarea") {
            return `
              <div class="${full}">
                <small>${escapeHtml(f.label)}</small>
                <textarea class="textarea" name="${escapeHtml(f.key)}" placeholder="${escapeHtml(f.placeholder || "")}"></textarea>
              </div>
            `;
          }
          return `
            <div class="${full}">
              <small>${escapeHtml(f.label)}</small>
              <input class="input" name="${escapeHtml(f.key)}" type="${escapeHtml(f.type || "text")}" placeholder="${escapeHtml(f.placeholder || "")}" />
            </div>
          `;
        }).join("")}
        <div class="full row" style="justify-content:flex-end; margin-top:6px;">
          <button class="btn primary" type="submit">Salvar</button>
        </div>
      </form>
    </div>
  ` : `<div class="card" style="background:#f8fafc; border: 1px dashed #cbd5e1; text-align:center; padding:15px;"><p style="color:#64748b; margin:0;">🔒 Modo visualização — Seu perfil de <b>${getRoleLabel()}</b> não permite criar registros nesta página.</p></div>`;

  let limit = 30;
  const tableHtml = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            ${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join("")}
            <th class="noPrint">Ações</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    <div id="pagination" class="row" style="justify-content:center; margin-top:15px; display:none;">
      <button class="btn" id="btnCarregarMais">Carregar Mais</button>
    </div>
  `;

  content.innerHTML = `<div class="section">${formHtml}${tableHtml}</div>`;

  function renderTable() {
    const db2 = getDB();
    const rows0 = onlySafra(db2[entityKey] || []);
    const rowsFiltered = helpers?.filter ? helpers.filter(rows0, db2) : rows0;
    const total = rowsFiltered.length;
    
    // Paginação
    const rows = rowsFiltered.slice().reverse().slice(0, limit);

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.map(r => {
      const tds = columns.map(c => {
        const v = c.render ? c.render(r, db2) : r[c.key];
        return `<td data-label="${escapeHtml(c.label)}">${escapeHtml(v ?? "")}</td>`;
      }).join("");
      return `
        <tr>
          ${tds}
          <td class="noPrint" data-label="Ações">
            ${_canDel ? `<button class="btn danger" onclick="window.__del('${r.id}')">Excluir</button>` : '<span style="color:#94a3b8; font-size:12px;">—</span>'}
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="${columns.length + 1}">Sem registros.</td></tr>`;

    const pg = document.getElementById("pagination");
    if (total > limit) {
      pg.style.display = "flex";
      document.getElementById("btnCarregarMais").onclick = () => {
        limit += 30;
        renderTable();
      };
    } else {
      pg.style.display = "none";
    }
  }

  window.__del = (id) => {
    if (!_canDel) { toast("Sem permissão", "Seu perfil não permite excluir registros."); return; }
    if (!confirm("Excluir este registro?")) return;
    const db2 = getDB();
    db2[entityKey] = (db2[entityKey] || []).filter(x => x.id !== id);
    if (helpers?.onDelete) helpers.onDelete(id, db2);
    setDB(db2);
    toast("Excluído", "Registro removido.");
    renderTable();
  };
  if (_canCr && document.getElementById("frm")) {
    document.getElementById("frm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const obj = { id: uid(entityKey.slice(0, 3)), safraId: sid };
      fields.forEach(f => {
        let v = fd.get(f.key);
        if (f.type === "number") v = Number(v || 0);
        obj[f.key] = v;
      });
      const db2 = getDB();
      if (helpers?.beforeSave) helpers.beforeSave(obj, db2);
      db2[entityKey] = db2[entityKey] || [];
      
      // Verificar limites por plano
      const _limits = getPlanLimits();
      if (entityKey === 'fazendas' && db2.fazendas.length >= _limits.fazendas) {
        toast('Limite atingido', `Seu plano ${planoAtual} permite no máximo ${_limits.fazendas} fazenda(s). Faça upgrade para adicionar mais.`);
        return;
      }
      if (entityKey === 'maquinas' && onlySafra(db2.maquinas || []).length >= _limits.maquinas) {
        toast('Limite atingido', `Seu plano ${planoAtual} permite no máximo ${_limits.maquinas} máquina(s). Faça upgrade para adicionar mais.`);
        return;
      }
      if (entityKey === 'equipe' && onlySafra(db2.equipe || []).length >= _limits.funcionarios) {
        toast('Limite atingido', `Seu plano ${planoAtual} permite no máximo ${_limits.funcionarios} funcionário(s). Faça upgrade para adicionar mais.`);
        return;
      }
      
      db2[entityKey].push(obj);
      setDB(db2);
      e.target.reset();
      toast("Salvo", "Registro adicionado com sucesso.");
      renderTable();
    });
  }

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    const rows = onlySafra(db2[entityKey] || []);
    downloadText(`${entityKey}-${nowISO()}.csv`, toCSV(rows));
    toast("Exportado", "CSV baixado.");
  });

  renderTable();
}

// ============================================================================
