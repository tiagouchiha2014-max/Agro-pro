function pageCombustivel() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const equipe = onlySafra(db.equipe);
  const maquinas = onlySafra(db.maquinas);
  const tanques = onlySafra(db.dieselEstoque);
  const entradas = onlySafra(db.dieselEntradas || []).sort((a, b) => b.data.localeCompare(a.data));
  const saidas = onlySafra(db.combustivel || []).sort((a, b) => b.data.localeCompare(a.data));

  setTopActions(`<button class="btn" id="btnExportCSV">📥 Exportar CSV</button>`);

  const content = document.getElementById("content");

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const consumoPorMes = new Array(12).fill(0);
  const entradasPorMes = new Array(12).fill(0);

  saidas.forEach(s => {
    if (s.data) {
      const mes = parseInt(s.data.substring(5, 7)) - 1;
      consumoPorMes[mes] += Number(s.litros || 0);
    }
  });

  entradas.forEach(e => {
    if (e.data) {
      const mes = parseInt(e.data.substring(5, 7)) - 1;
      entradasPorMes[mes] += Number(e.litros || 0);
    }
  });

  const maxConsumo = Math.max(...consumoPorMes, 1);
  const maxEntrada = Math.max(...entradasPorMes, 1);
  const estoqueAtual = tanques.reduce((s, t) => s + Number(t.litros || 0), 0);
  const precoVigente = tanques[0]?.precoVigente || 0;

  function optionList(arr, labelKey = "nome") {
    return arr.map(o => `<option value="${o.id}">${escapeHtml(o[labelKey] || "")}</option>`).join("");
  }

  const depositoOptions = tanques.map(t => `<option value="${escapeHtml(t.deposito || "Tanque Principal")}">${escapeHtml(t.deposito || "Tanque Principal")}</option>`).join("");

  content.innerHTML = `
    <style>
      .combustivel-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }
      .combustivel-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .combustivel-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .combustivel-valor {
        font-size: 32px;
        font-weight: bold;
        color: #0f172a;
      }
      .combustivel-label {
        color: #475569;
        font-size: 12px;
      }
      .grafico-barras {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 150px;
        margin: 15px 0;
      }
      .barra {
        flex: 1;
        background: #3b82f6;
        border-radius: 4px 4px 0 0;
        min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label {
        text-align: center;
        font-size: 10px;
        color: #475569;
        margin-top: 5px;
      }
    </style>

    <div class="combustivel-grid">
      <div class="combustivel-card">
        <h3>⛽ Estoque Atual</h3>
        <div class="combustivel-valor">${num(estoqueAtual, 1)} L</div>
        <div class="combustivel-label">${tanques.some(t => t.litros < 0) ? '<span style="color:#f44336;">Negativo</span>' : 'Disponível'}</div>
      </div>
      <div class="combustivel-card">
        <h3>💰 Preço Vigente</h3>
        <div class="combustivel-valor">${kbrl(precoVigente)}/L</div>
        <div class="combustivel-label">Última entrada</div>
      </div>
      <div class="combustivel-card">
        <h3>📊 Total Abastecido</h3>
        <div class="combustivel-valor">${num(saidas.reduce((s, c) => s + Number(c.litros || 0), 0), 1)} L</div>
        <div class="combustivel-label">${saidas.length} operações</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      <div class="card">
        <h4>📉 Consumo Mensal de Diesel</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (consumoPorMes[i] / maxConsumo) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(consumoPorMes[i], 0)} L</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <h4>📈 Entradas de Diesel</h4>
        <div class="grafico-barras">
          ${meses.map((mes, i) => {
            const altura = (entradasPorMes[i] / maxEntrada) * 130;
            return `
              <div style="flex:1; text-align:center;">
                <div class="barra" style="height: ${altura}px; background: #4CAF50;"></div>
                <div class="barra-label">${mes}</div>
                <div style="font-size:9px; color:#475569;">${num(entradasPorMes[i], 0)} L</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h3>⛽ Registrar entrada de diesel</h3>
        <form id="frmEntrada" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div class="full">
            <small>Depósito / Tanque</small>
            <select class="select" name="deposito">${depositoOptions || `<option value="Tanque Principal">Tanque Principal</option>`}</select>
          </div>
          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required /></div>
          <div><small>Preço por litro (R$)</small><input class="input" name="precoLitro" type="number" step="0.01" placeholder="0" required /></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Registrar entrada</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>🚜 Registrar abastecimento (saída)</h3>
        <form id="frmSaida" class="formGrid">
          <div><small>Data</small><input class="input" name="data" placeholder="${nowISO()}" /></div>
          <div class="full">
            <small>Depósito / Tanque</small>
            <select class="select" name="deposito">${depositoOptions || `<option value="Tanque Principal">Tanque Principal</option>`}</select>
          </div>
          <div><small>Fazenda</small><select class="select" name="fazendaId" required>${optionList(fazendas)}</select></div>
          <div><small>Talhão (opcional)</small><select class="select" name="talhaoId"><option value="">(sem talhão)</option>${optionList(talhoes)}</select></div>
          <div><small>Máquina</small><select class="select" name="maquinaId"><option value="">(opcional)</option>${optionList(maquinas)}</select></div>
          <div><small>Operador</small><select class="select" name="operadorId"><option value="">(opcional)</option>${optionList(equipe)}</select></div>
          <div><small>Litros</small><input class="input" name="litros" type="number" step="0.1" placeholder="0" required /></div>
          <div><small>KM ou Horímetro</small><input class="input" name="kmOuHora" type="number" step="0.1" placeholder="0" /></div>
          <div><small>Posto</small><input class="input" name="posto" placeholder="Posto / NF / origem" /></div>
          <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
          <div class="full row" style="justify-content:flex-end">
            <button class="btn primary" type="submit">Registrar saída</button>
          </div>
        </form>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top:20px;">
      <div class="tableWrap">
        <h4>📋 Entradas de diesel</h4>
        <table>
          <thead>
            <tr><th>Data</th><th>Depósito</th><th>Litros</th><th>Preço/L</th><th>Total</th><th>Obs</th></tr>
          </thead>
          <tbody>
            ${entradas.map(e => `
              <tr>
                <td>${e.data}</td>
                <td>${escapeHtml(e.deposito)}</td>
                <td>${num(e.litros, 1)}</td>
                <td>${kbrl(e.precoLitro)}</td>
                <td>${kbrl(e.litros * e.precoLitro)}</td>
                <td>${escapeHtml(e.obs || '')}</td>
              </tr>
            `).join('') || '<tr><td colspan="6">Sem entradas</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="tableWrap">
        <h4>📋 Abastecimentos</h4>
        <table>
          <thead>
            <tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Litros</th><th>Preço/L</th><th>Custo</th></tr>
          </thead>
          <tbody id="tbodySaidas">
            ${saidas.map(c => {
              const faz = findNameById(fazendas, c.fazendaId);
              const tal = c.talhaoId ? findNameById(talhoes, c.talhaoId) : "—";
              return `
                <tr>
                  <td>${c.data}</td>
                  <td>${escapeHtml(faz)}</td>
                  <td>${escapeHtml(tal)}</td>
                  <td>${num(c.litros, 1)}</td>
                  <td>${kbrl(c.precoLitro)}</td>
                  <td>${kbrl(c.litros * c.precoLitro)}</td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6">Sem abastecimentos</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("frmEntrada").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const litros = Number(fd.get("litros") || 0);
    if (litros <= 0) { alert("Litros deve ser > 0"); return; }
    const precoLitro = Number(fd.get("precoLitro") || 0);
    if (precoLitro <= 0) { alert("Preço deve ser > 0"); return; }

    const db2 = getDB();
    registrarEntradaDiesel(
      db2,
      fd.get("deposito") || "Tanque Principal",
      litros,
      precoLitro,
      fd.get("data") || nowISO(),
      fd.get("obs") || ""
    );
    setDB(db2);
    e.target.reset();
    toast("Entrada registrada", "Diesel adicionado ao estoque.");
    pageCombustivel();
  });

  document.getElementById("frmSaida").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const litros = Number(fd.get("litros") || 0);
    if (litros <= 0) { alert("Litros deve ser > 0"); return; }

    const db2 = getDB();
    const deposito = fd.get("deposito") || "Tanque Principal";
    const tank = db2.dieselEstoque.find(t => t.safraId === getSafraId() && t.deposito === deposito);
    if (!tank) { alert("Tanque não encontrado"); return; }

    const res = baixaDiesel(db2, deposito, litros);
    if (!res.ok) { alert(res.msg); return; }

    const obj = {
      id: uid("cmb"),
      safraId: getSafraId(),
      data: fd.get("data") || nowISO(),
      tipo: "Diesel S10",
      deposito,
      posto: fd.get("posto") || "",
      maquinaId: fd.get("maquinaId") || "",
      operadorId: fd.get("operadorId") || "",
      fazendaId: fd.get("fazendaId"),
      talhaoId: fd.get("talhaoId") || "",
      litros,
      precoLitro: res.precoLitro,
      kmOuHora: Number(fd.get("kmOuHora") || 0),
      obs: fd.get("obs") || ""
    };

    db2.combustivel = db2.combustivel || [];
    db2.combustivel.push(obj);
    setDB(db2);
    e.target.reset();
    toast("Saída registrada", "Abastecimento concluído.");
    pageCombustivel();
  });

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const db2 = getDB();
    downloadText(`combustivel-${nowISO()}.csv`, toCSV(onlySafra(db2.combustivel || [])));
    toast("Exportado", "CSV baixado.");
  });
}

