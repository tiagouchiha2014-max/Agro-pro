function pageMaquinas() {
  const db = getDB();
  const maquinas = onlySafra(db.maquinas || []);

  setTopActions(`<button class="btn" id="btnExportMaq">Exportar CSV</button>`);

  const TIPOS_MAQUINA = [
    { grupo: "🚜 Tratores", itens: [
      { nome: "Trator de Pneu 4x2", marca: "John Deere", modelo: "5075E", cap: 0, obs: "75 cv, tração simples" },
      { nome: "Trator de Pneu 4x4", marca: "New Holland", modelo: "TL5.90", cap: 0, obs: "90 cv, tração dupla" },
      { nome: "Trator de Esteira", marca: "Case IH", modelo: "Quadtrac 500", cap: 0, obs: "500 cv, alta tração" },
      { nome: "Trator Compacto / Fruticultura", marca: "Massey Ferguson", modelo: "MF 4275", cap: 0, obs: "75 cv, baixo perfil" }
    ]},
    { grupo: "🌾 Colheitadeiras", itens: [
      { nome: "Colheitadeira de Soja", marca: "John Deere", modelo: "S780", cap: 0, obs: "Plataforma flexível 35 pés" },
      { nome: "Colheitadeira de Milho", marca: "New Holland", modelo: "CR10.90", cap: 0, obs: "Plataforma milho 8 linhas" },
      { nome: "Colheitadeira de Trigo/Arroz", marca: "AGCO", modelo: "Ideal 9T", cap: 0, obs: "Plataforma 30 pés" },
      { nome: "Colheitadeira de Algodão", marca: "Case IH", modelo: "Module Express 635", cap: 0, obs: "Stripper / picker" },
      { nome: "Colheitadeira de Cana", marca: "John Deere", modelo: "CH570", cap: 0, obs: "Colheita inteira/picada" },
      { nome: "Colheitadeira de Café", marca: "JACTO", modelo: "K3 Plus", cap: 0, obs: "Derriçadeira autopropelida" }
    ]},
    { grupo: "💧 Pulverizadores", itens: [
      { nome: "Pulverizador Autopropelido", marca: "JACTO", modelo: "Uniport 4530", cap: 4530, obs: "4530L, barra 30m" },
      { nome: "Pulverizador Autopropelido", marca: "Stara", modelo: "Imperador 3.0", cap: 3000, obs: "3000L, barra 36m" },
      { nome: "Pulverizador de Arrasto", marca: "Vicon", modelo: "VX1000", cap: 1000, obs: "1000L, barra 18m" },
      { nome: "Pulverizador de 3 Pontos", marca: "Jacto", modelo: "AD-13", cap: 400, obs: "400L, barra 13m" },
      { nome: "Drone Pulverizador", marca: "DJI", modelo: "Agras T40", cap: 40, obs: "40L, área 8ha/h" }
    ]},
    { grupo: "🌱 Plantio & Preparo", itens: [
      { nome: "Plantadeira de Soja", marca: "Stara", modelo: "Absoluta 48", cap: 0, obs: "48 linhas, disco duplo" },
      { nome: "Plantadeira de Milho", marca: "Precision Planting", modelo: "vSet2 20 linhas", cap: 0, obs: "20 linhas, dose variável" },
      { nome: "Grade Aradora", marca: "Baldan", modelo: "GAR 28x26", cap: 0, obs: "28 discos 26\"" },
      { nome: "Grade Niveladora", marca: "Baldan", modelo: "GNV 48x22", cap: 0, obs: "48 discos 22\"" },
      { nome: "Subsolador", marca: "Tatu", modelo: "Titan 7 hastes", cap: 0, obs: "7 hastes, prof. 50cm" },
      { nome: "Semeadeira Direta", marca: "Marchesan", modelo: "Presert III 15 linhas", cap: 0, obs: "15 linhas, sulcador haste" }
    ]},
    { grupo: "🚚 Transporte & Logística", itens: [
      { nome: "Caminhão Graneleiro", marca: "Mercedes-Benz", modelo: "Atron 2729", cap: 0, obs: "Carga 15t, graneleiro" },
      { nome: "Traçado / Truck Graneleiro", marca: "Scania", modelo: "R450", cap: 0, obs: "Carga 25t, rodotrem" },
      { nome: "Carreta Graneleira", marca: "Randon", modelo: "SR BA", cap: 0, obs: "34.000L, eixo duplo" },
      { nome: "Vagão Graneleiro (Tracionado)", marca: "Incomagri", modelo: "VG 8000", cap: 8000, obs: "8t, tração p/ trator" },
      { nome: "Toco Boiadeiro", marca: "Volkswagen", modelo: "Constellation 24.280", cap: 0, obs: "Transporte animais" }
    ]},
    { grupo: "⛽ Abastecimento & Infra", itens: [
      { nome: "Tanque Reboque Diesel", marca: "Usina", modelo: "TR 3000L", cap: 3000, obs: "3000L, bomba 50L/min" },
      { nome: "Gerador a Diesel", marca: "Stemac", modelo: "GE50000", cap: 0, obs: "50kVA, trifásico" },
      { nome: "Bomba Hidráulica", marca: "Dancor", modelo: "CVR-7", cap: 0, obs: "7cv, irrigação" },
      { nome: "Pivô Central de Irrigação", marca: "Reinke", modelo: "E2065", cap: 0, obs: "Área 65ha, elétrico" }
    ]},
    { grupo: "🔧 Outros Equipamentos", itens: [
      { nome: "Roçadeira Hidráulica", marca: "Triton", modelo: "TH-2000", cap: 0, obs: "Braço articulado 2m" },
      { nome: "Empilhadeira / Telehandler", marca: "JLG", modelo: "TH644C", cap: 0, obs: "4t, alcance 6m" },
      { nome: "Carregadeira Frontal", marca: "Caterpillar", modelo: "906M", cap: 0, obs: "Bucket 1m³" },
      { nome: "ATV / Quadriciclo", marca: "Yamaha", modelo: "Grizzly 700", cap: 0, obs: "700cc, monitoramento" }
    ]}
  ];

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .maq-kpi { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }
      .maq-kpi .card { text-align:center; padding:14px; }
      .maq-kpi .big { font-size:28px; font-weight:800; color:#3b82f6; }
      .maq-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
      .maq-tab { padding:7px 16px; border-radius:20px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer; font-size:13px; font-weight:500; transition:all .2s; }
      .maq-tab.active { background:#3b82f6; color:white; border-color:#3b82f6; }
      .maq-presets { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; margin-bottom:24px; }
      .maq-preset-card { background:white; border:1px solid #e2e8f0; border-radius:10px; padding:14px; cursor:pointer; transition:all .2s; }
      .maq-preset-card:hover { border-color:#3b82f6; box-shadow:0 4px 12px rgba(59,130,246,.15); transform:translateY(-1px); }
      .maq-preset-card h4 { margin:0 0 4px; font-size:14px; color:#1e293b; }
      .maq-preset-card small { color:#64748b; font-size:12px; }
      .maq-preset-card .maq-badge { display:inline-block; background:#dbeafe; color:#1d4ed8; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:600; margin-bottom:6px; }
      .maq-list-table { width:100%; border-collapse:collapse; }
      .maq-list-table th { background:#f1f5f9; padding:10px 12px; text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; }
      .maq-list-table td { padding:11px 12px; border-top:1px solid #f1f5f9; font-size:13px; }
      .maq-list-table tr:hover td { background:#f8fafc; }
      .status-badge { padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; }
      .status-ativo { background:#dcfce7; color:#166534; }
      .status-manutencao { background:#fef3c7; color:#92400e; }
      .status-inativo { background:#fee2e2; color:#991b1b; }
    </style>

    <!-- KPIs -->
    <div class="maq-kpi">
      <div class="card"><div class="big">${maquinas.length}</div><small>Total cadastrado</small></div>
      <div class="card"><div class="big" style="color:#10b981">${maquinas.filter(m=>!m.status||m.status==='ativo').length}</div><small>Ativas</small></div>
      <div class="card"><div class="big" style="color:#f59e0b">${maquinas.filter(m=>m.status==='manutencao').length}</div><small>Em Manutenção</small></div>
      <div class="card"><div class="big" style="color:#6366f1">${maquinas.reduce((s,m)=>s+Number(m.horimetro||0),0).toLocaleString('pt-BR')}</div><small>Horas Totais</small></div>
    </div>

    <!-- Formulário cadastro -->
    <div class="section">
      <div class="card">
        <h3>➕ Cadastrar Máquina / Equipamento</h3>
        <div class="help">Selecione um modelo pré-carregado ou preencha manualmente.</div>
        <div class="hr"></div>

        <h4 style="margin:0 0 10px; color:#475569;">📋 Modelos Pré-carregados — clique para preencher</h4>
        <div class="maq-tabs" id="maqTabs">
          ${TIPOS_MAQUINA.map((g,i) => `<div class="maq-tab ${i===0?'active':''}" data-grupo="${i}">${g.grupo}</div>`).join('')}
        </div>
        <div id="maqPresets" class="maq-presets">
          ${TIPOS_MAQUINA[0].itens.map(it => `
            <div class="maq-preset-card" onclick="preencherMaquina('${escapeHtml(it.nome)}','${escapeHtml(it.marca)}','${escapeHtml(it.modelo)}',${it.cap},'${escapeHtml(it.obs)}')">
              <div class="maq-badge">${TIPOS_MAQUINA[0].grupo}</div>
              <h4>${escapeHtml(it.nome)}</h4>
              <small>🏷️ ${escapeHtml(it.marca)} ${escapeHtml(it.modelo)}</small><br>
              <small style="color:#94a3b8;">${escapeHtml(it.obs)}</small>
            </div>
          `).join('')}
        </div>

        <div class="hr"></div>
        <form id="frmMaq" class="formGrid">
          <div><small>🏷️ Nome / Tipo *</small><input class="input" id="maqNome" name="nome" required placeholder="Ex: Trator New Holland TL5.90"></div>
          <div><small>🏭 Marca</small><input class="input" id="maqMarca" name="marca" placeholder="John Deere, New Holland..."></div>
          <div><small>📐 Modelo</small><input class="input" id="maqModelo" name="modelo" placeholder="S780, Uniport 4530..."></div>
          <div><small>🔢 Placa / Nº Série / Patrimônio</small><input class="input" id="maqPlaca" name="placa"></div>
          <div><small>📅 Ano de Fabricação</small><input class="input" id="maqAno" name="ano" type="number" min="1980" max="2030" placeholder="${new Date().getFullYear()}"></div>
          <div><small>⏱️ Horímetro Atual (h)</small><input class="input" id="maqHorimetro" name="horimetro" type="number" min="0" placeholder="0"></div>
          <div><small>💧 Capacidade (L) — tanque/pulverizador</small><input class="input" id="maqCap" name="capacidadeL" type="number" min="0" placeholder="0"></div>
          <div><small>🔧 Bicos / Barra / Configuração</small><input class="input" id="maqBicos" name="bicos" placeholder="Barra 30m / Leque 11002..."></div>
          <div><small>📊 Status</small>
            <select class="select" id="maqStatus" name="status">
              <option value="ativo">✅ Ativo</option>
              <option value="manutencao">🔧 Em Manutenção</option>
              <option value="inativo">❌ Inativo</option>
            </select>
          </div>
          <div class="full"><small>📝 Observações</small><textarea class="input" id="maqObs" name="obs" rows="2" placeholder="Detalhes adicionais, histórico, etc."></textarea></div>
          <div class="full row" style="justify-content:flex-end; gap:10px;">
            <button type="button" class="btn" onclick="document.getElementById('frmMaq').reset(); document.getElementById('editMaqId').value='';">Limpar</button>
            <button type="submit" class="btn primary" id="btnSalvarMaq">Salvar Máquina</button>
          </div>
        </form>
        <input type="hidden" id="editMaqId" value="">
      </div>
    </div>

    <!-- Tabela de máquinas cadastradas -->
    <div class="section">
      <div class="card">
        <h3>🚜 Máquinas Cadastradas (${maquinas.length})</h3>
        <div style="overflow-x:auto;">
          <table class="maq-list-table" id="tblMaq">
            <thead><tr>
              <th>Máquina</th><th>Marca / Modelo</th><th>Placa/Série</th>
              <th>Ano</th><th>Horímetro</th><th>Capacidade</th><th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody id="tbodyMaq">
              ${maquinas.length === 0
                ? `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:30px;">Nenhuma máquina cadastrada. Use o formulário acima.</td></tr>`
                : maquinas.map(m => `
                  <tr>
                    <td><b>${escapeHtml(m.nome||'')}</b>${m.bicos?`<br><small style="color:#64748b;">${escapeHtml(m.bicos)}</small>`:''}</td>
                    <td>${escapeHtml(m.marca||'-')} ${escapeHtml(m.modelo||'')}</td>
                    <td>${escapeHtml(m.placa||'-')}</td>
                    <td>${m.ano||'-'}</td>
                    <td>${m.horimetro?num(m.horimetro,0)+' h':'-'}</td>
                    <td>${m.capacidadeL?num(m.capacidadeL,0)+' L':'-'}</td>
                    <td><span class="status-badge status-${m.status||'ativo'}">${m.status==='manutencao'?'Manutenção':m.status==='inativo'?'Inativo':'Ativo'}</span></td>
                    <td style="white-space:nowrap;">
                      <button class="btn" style="padding:4px 10px; font-size:12px;" onclick="editarMaquina('${m.id}')">✏️</button>
                      <button class="btn" style="padding:4px 10px; font-size:12px; background:#fee2e2; color:#991b1b;" onclick="deletarMaquina('${m.id}')">🗑️</button>
                    </td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Pré-carregado: tabs
  const tabsEl = document.getElementById('maqTabs');
  const presetsEl = document.getElementById('maqPresets');
  tabsEl.addEventListener('click', e => {
    const tab = e.target.closest('.maq-tab');
    if (!tab) return;
    tabsEl.querySelectorAll('.maq-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const gi = Number(tab.dataset.grupo);
    const grupo = TIPOS_MAQUINA[gi];
    presetsEl.innerHTML = grupo.itens.map(it => `
      <div class="maq-preset-card" onclick="preencherMaquina('${escapeHtml(it.nome)}','${escapeHtml(it.marca)}','${escapeHtml(it.modelo)}',${it.cap},'${escapeHtml(it.obs)}')">
        <div class="maq-badge">${grupo.grupo}</div>
        <h4>${escapeHtml(it.nome)}</h4>
        <small>🏷️ ${escapeHtml(it.marca)} ${escapeHtml(it.modelo)}</small><br>
        <small style="color:#94a3b8;">${escapeHtml(it.obs)}</small>
      </div>
    `).join('');
  });

  // Preencher form com preset
  window.preencherMaquina = (nome, marca, modelo, cap, obs) => {
    document.getElementById('maqNome').value = nome + (modelo ? ' ' + modelo : '');
    document.getElementById('maqMarca').value = marca;
    document.getElementById('maqModelo').value = modelo;
    document.getElementById('maqCap').value = cap || '';
    document.getElementById('maqObs').value = obs;
    document.getElementById('frmMaq').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Salvar
  document.getElementById('frmMaq').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const editId = document.getElementById('editMaqId').value;
    const db2 = getDB();
    db2.maquinas = db2.maquinas || [];
    const obj = {
      id: editId || uid('maq'),
      safraId: getSafraId(),
      nome: fd.get('nome') || '',
      marca: fd.get('marca') || '',
      modelo: fd.get('modelo') || '',
      placa: fd.get('placa') || '',
      ano: fd.get('ano') ? Number(fd.get('ano')) : null,
      horimetro: Number(fd.get('horimetro') || 0),
      capacidadeL: Number(fd.get('capacidadeL') || 0),
      bicos: fd.get('bicos') || '',
      status: fd.get('status') || 'ativo',
      obs: fd.get('obs') || ''
    };
    if (editId) {
      const idx = db2.maquinas.findIndex(m => m.id === editId);
      if (idx >= 0) db2.maquinas[idx] = obj;
    } else {
      db2.maquinas.push(obj);
    }
    setDB(db2);
    toast('Salvo', `Máquina "${obj.nome}" ${editId?'atualizada':'cadastrada'}.`);
    document.getElementById('editMaqId').value = '';
    pageMaquinas();
  });

  // Editar
  window.editarMaquina = (id) => {
    const db2 = getDB();
    const m = (db2.maquinas || []).find(x => x.id === id);
    if (!m) return;
    document.getElementById('editMaqId').value = id;
    document.getElementById('maqNome').value = m.nome || '';
    document.getElementById('maqMarca').value = m.marca || '';
    document.getElementById('maqModelo').value = m.modelo || '';
    document.getElementById('maqPlaca').value = m.placa || '';
    document.getElementById('maqAno').value = m.ano || '';
    document.getElementById('maqHorimetro').value = m.horimetro || 0;
    document.getElementById('maqCap').value = m.capacidadeL || 0;
    document.getElementById('maqBicos').value = m.bicos || '';
    document.getElementById('maqStatus').value = m.status || 'ativo';
    document.getElementById('maqObs').value = m.obs || '';
    document.getElementById('btnSalvarMaq').textContent = '💾 Atualizar Máquina';
    document.getElementById('frmMaq').scrollIntoView({ behavior: 'smooth' });
  };

  // Deletar
  window.deletarMaquina = (id) => {
    if (!confirm('Remover esta máquina?')) return;
    const db2 = getDB();
    db2.maquinas = (db2.maquinas || []).filter(m => m.id !== id);
    setDB(db2);
    toast('Removido', 'Máquina removida.');
    pageMaquinas();
  };

  // Export CSV
  document.getElementById('btnExportMaq').addEventListener('click', () => {
    const rows = onlySafra(getDB().maquinas || []).map(m => ({
      Nome: m.nome, Marca: m.marca||'', Modelo: m.modelo||'', Placa: m.placa||'',
      Ano: m.ano||'', Horimetro_h: m.horimetro||0, Capacidade_L: m.capacidadeL||0,
      Bicos: m.bicos||'', Status: m.status||'ativo', Obs: m.obs||''
    }));
    downloadText(`maquinas-${nowISO()}.csv`, toCSV(rows));
    toast('Exportado', 'CSV baixado.');
  });
}

