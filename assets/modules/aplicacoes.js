function pageAplicacoes() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const equipe = onlySafra(db.equipe);
  const maquinas = onlySafra(db.maquinas);
  const produtos = onlySafra(db.produtos);

  setTopActions(`<button class="btn" id="btnExportCSV">Exportar CSV</button>`);

  const content = document.getElementById("content");

  function optionList(arr) { 
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join(""); 
  }

  function produtoOptions() {
    return produtos.map(p => `<option value="${p.id}" data-preco="${p.preco || 0}" data-unidade="${p.unidade}">${escapeHtml(p.nome)} — ${escapeHtml(p.tipo)} (R$ ${p.preco || 0}/${p.unidade})</option>`).join("");
  }

  content.innerHTML = `
    <div class="section">
      <div class="card">
        <h3>📝 Registrar nova aplicação</h3>
        <div class="help">Preencha os dados da aplicação. O custo total é calculado automaticamente.</div>
        <div class="hr"></div>
        
        <form id="frm" class="formGrid">
          <div><small>📅 Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div><small>🏢 Fazenda</small><select class="select" name="fazendaId" required>${optionList(fazendas)}</select></div>
          <div><small>🧭 Talhão</small><select class="select" name="talhaoId" required>${optionList(talhoes)}</select></div>
          <div><small>📏 Área aplicada (ha)</small><input class="input" name="areaHaAplicada" type="number" step="0.1" required /></div>
          <div><small>🌱 Cultura</small><input class="input" name="cultura" placeholder="Soja" /></div>
          <div><small>🎯 Alvo</small><input class="input" name="alvo" placeholder="Praga / Doença" /></div>
          <div><small>🚜 Operação</small><input class="input" name="operacao" placeholder="Pulverização" /></div>
          <div><small>⚙️ Máquina</small><select class="select" name="maquinaId"><option value="">(opcional)</option>${optionList(maquinas)}</select></div>
          <div><small>👤 Operador</small><select class="select" name="operadorId"><option value="">(opcional)</option>${optionList(equipe)}</select></div>
          <div><small>🌬️ Vento (km/h)</small><input class="input" name="vento" type="number" /></div>
          <div><small>🌡️ Temperatura (°C)</small><input class="input" name="temp" type="number" /></div>
          <div><small>💧 Umidade (%)</small><input class="input" name="umidade" type="number" /></div>

          <div class="full">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <h4 style="margin:0;">🧪 Produtos aplicados</h4>
              <button type="button" class="btn primary" id="btnAdicionarProduto" style="font-size:12px;">+ Adicionar produto</button>
            </div>
            <div class="help">Selecione o produto e informe a dose por hectare. O custo será somado automaticamente.</div>
            <div class="hr"></div>
            
            <div id="produtos-container">
              <div class="produto-linha" style="display:grid; grid-template-columns: 3fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px; align-items:center;">
                <select class="select" name="produtoId[]" onchange="window.atualizarPrecoUnit(this, 0)">
                  <option value="">Selecione um produto...</option>
                  ${produtoOptions()}
                </select>
                <input class="input" name="dose[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.calcularCustoTotal()" />
                <span class="badge" id="unidade-0" style="background:#2a2a30; padding:8px; text-align:center;">—</span>
                <span class="badge" id="custo-0" style="background:#2a2a30; color:#4CAF50; padding:8px; text-align:center; font-weight:bold;">R$ 0,00</span>
              </div>
            </div>
          </div>

          <div class="full"><small>📝 Observações</small><textarea class="textarea" name="obs"></textarea></div>

          <div class="full" style="margin-top:20px;">
            <div style="background: linear-gradient(135deg, #1a2a3a, #0f1a24); padding:20px; border-radius:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  ${canSeeFinanceiro() ? `<h4 style="margin:0; color:#888;">💵 CUSTO TOTAL ESTIMADO</h4>
                  <div style="font-size:32px; font-weight:bold; color:#4CAF50;" id="custoTotalDisplay">R$ 0,00</div>` : '<h4 style="margin:0; color:#888;">Registro de Aplicação</h4>'}
                </div>
                <button class="btn primary" type="submit" style="font-size:16px; padding:12px 24px;">✅ Salvar aplicação</button>
              </div>
              <div style="margin-top:10px; font-size:12px; color:#888;" id="detalheCusto">Nenhum produto selecionado</div>
            </div>
          </div>
        </form>
      </div>

      <div class="tableWrap" style="margin-top:20px;">
        <h3>📋 Últimas aplicações</h3>
        <table>
          <thead><tr><th>Data</th><th>Talhão</th><th>Área</th><th>Produtos</th>${canSeeFinanceiro() ? '<th>Custo</th>' : ''}<th style="text-align:center;">Ações</th></tr></thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <div id="pagination" class="row" style="justify-content:center; margin-top:15px; display:none;">
        <button class="btn" id="btnCarregarMais">Carregar Mais</button>
      </div>
    </div>
  `;

  let produtoCount = 1;
  document.getElementById("btnAdicionarProduto").addEventListener("click", () => {
    const container = document.getElementById("produtos-container");
    const novaLinha = document.createElement("div");
    novaLinha.className = "produto-linha";
    novaLinha.classList.add('grid-dynamic-row');

    novaLinha.innerHTML = `
      <select class="select" name="produtoId[]" onchange="window.atualizarPrecoUnit(this, ${produtoCount})">
        <option value="">Selecione um produto...</option>
        ${produtoOptions()}
      </select>
      <input class="input" name="dose[]" type="number" step="0.01" placeholder="Dose/ha" onchange="window.calcularCustoTotal()" />
      <span class="badge" id="unidade-${produtoCount}" style="background:#2a2a30; padding:8px; text-align:center;">—</span>
      <div style="display:flex; gap:5px;">
        <span class="badge" id="custo-${produtoCount}" style="background:#2a2a30; color:#4CAF50; padding:8px; text-align:center; font-weight:bold; flex:1;">R$ 0,00</span>
        <button type="button" class="btn danger" style="padding:8px;" onclick="removerLinhaProduto(this)">✕</button>
      </div>
    `;
    container.appendChild(novaLinha);
    produtoCount++;
  });

  window.removerLinhaProduto = (botao) => {
    if (document.querySelectorAll('.produto-linha').length <= 1) {
      toast("Aviso", "Mantenha pelo menos um produto");
      return;
    }
    botao.closest('.produto-linha').remove();
    window.calcularCustoTotal();
  };

  window.atualizarPrecoUnit = (select, index) => {
    const opt = select.options[select.selectedIndex];
    const unidade = opt.dataset.unidade || '';
    document.getElementById(`unidade-${index}`).innerText = unidade || '—';
    window.calcularCustoTotal();
  };

  window.calcularCustoTotal = () => {
    let total = 0;
    const area = parseFloat(document.querySelector('input[name="areaHaAplicada"]').value) || 0;
    const linhas = document.querySelectorAll('.produto-linha');
    let detalhes = [];

    linhas.forEach((linha, idx) => {
      const select = linha.querySelector('select[name="produtoId[]"]');
      const dose = parseFloat(linha.querySelector('input[name="dose[]"]').value) || 0;

      if (select && select.value && dose > 0) {
        const opt = select.options[select.selectedIndex];
        const precoUnit = parseFloat(opt.dataset.preco) || 0;
        const produtoNome = opt.text.split(' — ')[0];
        const custoLinha = precoUnit * dose * area;

        total += custoLinha;
        linha.querySelector(`#custo-${idx}`).innerText = kbrl(custoLinha);
        linha.querySelector(`#custo-${idx}`).classList.add('text-success');

        detalhes.push(`${produtoNome}: ${num(dose,2)} ${opt.dataset.unidade || ''} × ${num(area,1)} ha = ${kbrl(custoLinha)}`);
      } else {
        const custoEl = linha.querySelector(`#custo-${idx}`);
        if (custoEl) {
          custoEl.innerText = 'R$ 0,00';
          custoEl.classList.add('text-muted');
        }
      }
    });

    document.getElementById('custoTotalDisplay').innerText = kbrl(total);
    document.getElementById('detalheCusto').innerHTML = detalhes.length > 0 ? detalhes.join('<br>') : 'Nenhum produto selecionado';
    return total;
  };

  document.querySelector('input[name="areaHaAplicada"]').addEventListener('input', window.calcularCustoTotal);

  let limit = 30;
  function render() {
    const db2 = getDB();
    let rowsFiltered = onlySafra(db2.aplicacoes || []);
    // Filtrar aplicações pelos talhões da fazenda selecionada
    if (fazendaAtual) {
      const talhoesFazenda = onlySafra(db2.talhoes || []).filter(t => t.fazendaId === fazendaAtual).map(t => t.id);
      rowsFiltered = rowsFiltered.filter(a => talhoesFazenda.includes(a.talhaoId));
    }
    const total = rowsFiltered.length;
    const rows = rowsFiltered.slice().reverse().slice(0, limit);

    const tb = document.getElementById("tbody");
    tb.innerHTML = rows.map(a => {
      const tal = findNameById(talhoes, a.talhaoId);
      const prds = (a.produtos || []).map(p => p.produtoNome).join(' + ');
      return `<tr><td>${a.data}</td><td><b>${escapeHtml(tal)}</b></td><td>${num(a.areaHaAplicada,1)} ha</td><td>${escapeHtml(prds||'—')}</td>${canSeeFinanceiro() ? `<td style="color:#4CAF50;">${kbrl(a.custoTotal)}</td>` : ''}<td style="text-align:center;">${canDeleteOnPage('aplicacoes') ? `<button class="btn danger" style="padding:4px 8px;" onclick="window.__delA('${a.id}')">Excluir</button>` : '—'}</td></tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;">Nenhuma aplicação registrada</td></tr>';

    const pg = document.getElementById("pagination");
    if (total > limit) {
      pg.style.display = "flex";
      document.getElementById("btnCarregarMais").onclick = () => {
        limit += 30;
        render();
      };
    } else {
      pg.style.display = "none";
    }
  }

  window.__delA = (id) => {
    if (!canDeleteOnPage('aplicacoes')) { toast("Sem permissão", "Seu perfil não permite excluir."); return; }
    if (!confirm("Excluir esta aplicação?")) return;
    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes.filter(x => x.id !== id);
    setDB(db2);
    toast("Excluída", "Aplicação removida");
    render();
  };

  document.getElementById("frm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const area = Number(fd.get("areaHaAplicada") || 0);
    if (area <= 0) { alert("Área deve ser > 0"); return; }

    const produtosArray = [];
    const produtoIds = fd.getAll("produtoId[]").filter(id => id);
    const doses = fd.getAll("dose[]").map(d => Number(d) || 0);

    for (let i = 0; i < produtoIds.length; i++) {
      if (produtoIds[i] && doses[i] > 0) {
        const produto = produtos.find(p => p.id === produtoIds[i]);
        if (produto) {
          produtosArray.push({
            produtoId: produto.id,
            produtoNome: produto.nome,
            dosePorHa: doses[i],
            unidade: produto.unidade,
            precoUnit: produto.preco || 0
          });
        }
      }
    }

    if (produtosArray.length === 0) {
      alert("Selecione pelo menos um produto com dose válida");
      return;
    }

    const custoTotal = produtosArray.reduce((acc, p) => acc + (p.precoUnit * p.dosePorHa * area), 0);

    const obj = {
      id: uid("apl"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId"),
      areaHaAplicada: area,
      cultura: fd.get("cultura") || "",
      alvo: fd.get("alvo") || "",
      operacao: fd.get("operacao") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      condicoes: {
        vento: Number(fd.get("vento") || 0),
        temp: Number(fd.get("temp") || 0),
        umidade: Number(fd.get("umidade") || 0)
      },
      produtos: produtosArray,
      custoTotal: custoTotal,
      obs: fd.get("obs") || ""
    };

    const db2 = getDB();
    db2.aplicacoes = db2.aplicacoes || [];
    db2.aplicacoes.push(obj);

    const msgs = [];
    for (const p of produtosArray) {
      const qtd = p.dosePorHa * area;
      const res = baixaEstoqueProdutoPorId(db2, p.produtoId, qtd, p.unidade);
      if (res.ok) msgs.push(res.msg);
    }

    setDB(db2);
    e.target.reset();

    document.querySelectorAll('.produto-linha').forEach((linha, idx) => {
      if (idx > 0) linha.remove();
      else {
        linha.querySelector('select').value = '';
        linha.querySelector('input[name="dose[]"]').value = '';
        document.getElementById(`unidade-0`).innerText = '—';
        document.getElementById(`custo-0`).innerText = 'R$ 0,00';
      }
    });
    produtoCount = 1;
    window.calcularCustoTotal();

    toast("Salvo", "Aplicação registrada. Baixa no estoque.");
    if (msgs.length) toast("Baixas", msgs.slice(0, 3).join(" • "));
    render();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`aplicacoes-${nowISO()}.csv`, toCSV(onlySafra(db2.aplicacoes || [])));
  });

  render();
}

// pageRelatorios stub removido - função real abaixo

window.setPlano = async (p) => {
  // Sempre limpar dados de trial ao trocar de plano
  localStorage.removeItem("agro_trial");
  trialInfo = null;

  localStorage.setItem("agro_plano", p);
  planoAtual = p;

  // Sincronizar plano com o Supabase
  if (typeof AuthService !== 'undefined' && typeof isSupabaseReady === 'function' && isSupabaseReady()) {
    try {
      const planMap = { 'Free': 'free', 'Pro': 'pro', 'Master': 'master' };
      const result = await AuthService.updateProfile({ plan_type: planMap[p] || 'free' });
      if (result?.error) {
        console.warn('[Plano] Erro ao salvar no Supabase:', result.error.message);
      }
    } catch (e) {
      console.warn('[Plano] Exceção ao atualizar plano:', e.message);
    }
  }
  location.reload();
};
