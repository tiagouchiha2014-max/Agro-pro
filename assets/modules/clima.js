function pageClima() {
  const db = getDB();
  const fazendas = onlySafra(db.fazendas);
  let talhoes = onlySafra(db.talhoes);
  if (fazendaAtual) talhoes = talhoes.filter(t => t.fazendaId === fazendaAtual);
  const clima = onlySafra(db.clima || []).sort((a, b) => b.data.localeCompare(a.data));

  setTopActions(`
    <button class="btn primary" id="btnImportClima">🌤️ Ver Previsão do Tempo</button>
    <button class="btn" id="btnExportCSV">📥 Exportar CSV</button>
  `);

  const totalChuva = clima.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
  const diasComChuva = clima.filter(c => c.chuvaMm > 0).length;
  const mediaChuva = clima.length ? totalChuva / clima.length : 0;
  const tempMaxMedia = clima.reduce((s, c) => s + Number(c.tempMax || 0), 0) / (clima.length || 1);
  const tempMinMedia = clima.reduce((s, c) => s + Number(c.tempMin || 0), 0) / (clima.length || 1);
  const tempMedia = (tempMaxMedia + tempMinMedia) / 2;
  const umidadeMedia = clima.reduce((s, c) => s + Number(c.umidade || 0), 0) / (clima.length || 1);
  const ventoMedio = clima.reduce((s, c) => s + Number(c.vento || 0), 0) / (clima.length || 1);

  const climaPorTalhao = talhoes.map(t => {
    const registros = clima.filter(c => c.talhaoId === t.id);
    const total = registros.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
    const ultimo = registros.sort((a, b) => b.data.localeCompare(a.data))[0];
    return {
      talhao: t.nome,
      fazenda: findNameById(fazendas, t.fazendaId),
      totalChuva: total,
      media: registros.length ? total / registros.length : 0,
      ultimaData: ultimo?.data || '-',
      ultimaChuva: ultimo?.chuvaMm || 0,
      registros: registros.length
    };
  }).sort((a, b) => b.totalChuva - a.totalChuva);

  const climaPorFazenda = fazendas.map(f => {
    const talhoesDaFazenda = talhoes.filter(t => t.fazendaId === f.id);
    let totalChuva = 0, totalRegistros = 0;
    talhoesDaFazenda.forEach(t => {
      const registros = clima.filter(c => c.talhaoId === t.id);
      totalChuva += registros.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
      totalRegistros += registros.length;
    });
    const registrosGeral = clima.filter(c => c.fazendaId === f.id && !c.talhaoId);
    totalChuva += registrosGeral.reduce((s, c) => s + Number(c.chuvaMm || 0), 0);
    totalRegistros += registrosGeral.length;
    return {
      fazenda: f.nome,
      totalChuva,
      media: totalRegistros ? totalChuva / totalRegistros : 0,
      registros: totalRegistros
    };
  }).sort((a, b) => b.totalChuva - a.totalChuva);

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chuvaPorMes = new Array(12).fill(0);
  clima.forEach(c => {
    if (c.data) {
      const mes = parseInt(c.data.substring(5, 7)) - 1;
      chuvaPorMes[mes] += Number(c.chuvaMm || 0);
    }
  });
  const maxChuvaMensal = Math.max(...chuvaPorMes, 1);

  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .clima-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .clima-kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .clima-kpi-card h3 {
        margin: 0 0 10px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .clima-kpi-valor {
        font-size: 36px;
        font-weight: 700;
        color: #0f172a;
      }
      .clima-kpi-unidade {
        font-size: 16px;
        color: #64748b;
        margin-left: 5px;
      }
      .clima-kpi-label {
        color: #475569;
        font-size: 13px;
        margin-top: 8px;
      }
      .form-clima {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 30px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .form-clima h3 { color: #3b82f6; }
      .grafico-barras {
        display: flex; align-items: flex-end; gap: 8px; height: 200px; margin: 20px 0;
      }
      .barra {
        flex: 1; background: #3b82f6; border-radius: 4px 4px 0 0; min-height: 20px;
        transition: height 0.3s;
      }
      .barra-label { text-align: center; font-size: 11px; margin-top: 5px; color: #475569; }
    </style>

    <div class="clima-kpi-grid">
      <div class="clima-kpi-card">
        <h3>🌧️ Total de Chuvas</h3>
        <div><span class="clima-kpi-valor">${num(totalChuva, 1)}</span><span class="clima-kpi-unidade">mm</span></div>
        <div class="clima-kpi-label">${diasComChuva} dia(s) com chuva</div>
      </div>
      <div class="clima-kpi-card">
        <h3>📊 Média por Registro</h3>
        <div><span class="clima-kpi-valor">${num(mediaChuva, 1)}</span><span class="clima-kpi-unidade">mm</span></div>
        <div class="clima-kpi-label">${clima.length} registro(s)</div>
      </div>
      <div class="clima-kpi-card">
        <h3>🌡️ Temperatura Média</h3>
        <div><span class="clima-kpi-valor">${num(tempMedia, 1)}</span><span class="clima-kpi-unidade">°C</span></div>
        <div class="clima-kpi-label">Mín ${num(tempMinMedia,1)}°C / Máx ${num(tempMaxMedia,1)}°C</div>
      </div>
      <div class="clima-kpi-card">
        <h3>💧 Umidade Média</h3>
        <div><span class="clima-kpi-valor">${umidadeMedia ? num(umidadeMedia,0) : '-'}</span><span class="clima-kpi-unidade">%</span></div>
        <div class="clima-kpi-label">Vento médio: ${ventoMedio ? num(ventoMedio,1)+' km/h' : '-'}</div>
      </div>
    </div>

    <div class="form-clima">
      <h3>📝 Novo Registro Climático</h3>
      <form id="frmClima" class="formGrid">
        <div><small>Data</small><input class="input" name="data" type="date" value="${nowISO()}" required></div>
        <div><small>Fazenda</small><select class="select" name="fazendaId" required><option value="">Selecione...</option>${fazendas.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('')}</select></div>
        <div><small>Talhão (opcional)</small><select class="select" name="talhaoId"><option value="">Geral</option>${talhoes.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div>
        <div><small>Chuva (mm)</small><input class="input" name="chuvaMm" type="number" step="0.1" placeholder="0"></div>
        <div><small>Temp Máx (°C)</small><input class="input" name="tempMax" type="number" step="0.1"></div>
        <div><small>Temp Mín (°C)</small><input class="input" name="tempMin" type="number" step="0.1"></div>
        <div><small>Umidade (%)</small><input class="input" name="umidade" type="number" step="1"></div>
        <div><small>Vento (km/h)</small><input class="input" name="vento" type="number" step="0.1"></div>
        <div class="full"><small>Observações</small><textarea class="textarea" name="obs"></textarea></div>
        <div class="full row" style="justify-content:flex-end">
          <button class="btn primary" type="submit">Salvar Registro</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h4>📈 Distribuição Mensal de Chuvas</h4>
      <div class="grafico-barras">
        ${meses.map((mes, i) => {
          const altura = (chuvaPorMes[i] / maxChuvaMensal) * 180;
          return `<div style="flex:1;text-align:center;"><div class="barra" style="height:${altura}px;"></div><div class="barra-label">${mes}</div><div style="font-size:10px;color:#475569;">${num(chuvaPorMes[i],1)} mm</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="secao-tabela">
      <div class="card">
        <h4>📋 Últimos 10 Registros</h4>
        <div class="tableWrap">
          <table>
            <thead><tr><th>Data</th><th>Fazenda</th><th>Talhão</th><th>Chuva (mm)</th><th>Temp (°C)</th><th>Umidade (%)</th><th>Ações</th></tr></thead>
            <tbody>${clima.slice(0,10).map(c => {
              const fazenda = findNameById(fazendas, c.fazendaId);
              const talhao = c.talhaoId ? findNameById(talhoes, c.talhaoId) : 'Geral';
              return `<tr><td>${c.data}</td><td>${escapeHtml(fazenda)}</td><td>${escapeHtml(talhao)}</td><td><span class="valor-com-unidade">${num(c.chuvaMm||0,1)}</span><span class="unidade-tabela">mm</span></td><td>${c.tempMax ? num(c.tempMax,1)+'°C' : '-'}</td><td>${c.umidade ? num(c.umidade,0)+'%' : '-'}</td><td class="noPrint"><button class="btn danger" style="padding:4px 8px;" onclick="window.__delClima('${c.id}')">Excluir</button></td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="secao-tabela">
      <div class="card">
        <h4>🌱 Acumulado por Talhão</h4>
        <div class="tableWrap">
          <table>
            <thead><tr><th>Talhão</th><th>Fazenda</th><th>Total Chuva (mm)</th><th>Média (mm)</th><th>Última Chuva (mm)</th><th>Registros</th></tr></thead>
            <tbody>${climaPorTalhao.map(t => `<tr><td><b>${escapeHtml(t.talhao)}</b></td><td>${escapeHtml(t.fazenda)}</td><td><span class="valor-com-unidade">${num(t.totalChuva,1)}</span><span class="unidade-tabela">mm</span></td><td>${num(t.media,1)} mm</td><td>${t.ultimaChuva > 0 ? num(t.ultimaChuva,1)+' mm' : '-'}</td><td>${t.registros}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="secao-tabela">
      <div class="card">
        <h4>🏢 Acumulado por Fazenda</h4>
        <div class="tableWrap">
          <table>
            <thead><tr><th>Fazenda</th><th>Total Chuva (mm)</th><th>Média (mm)</th><th>Registros</th></tr></thead>
            <tbody>${climaPorFazenda.map(f => `<tr><td><b>${escapeHtml(f.fazenda)}</b></td><td><span class="valor-com-unidade">${num(f.totalChuva,1)}</span><span class="unidade-tabela">mm</span></td><td>${num(f.media,1)} mm</td><td>${f.registros}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById("frmClima").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = fd.get("data");
    const fazendaId = fd.get("fazendaId");
    if (!fazendaId) { alert("Selecione uma fazenda"); return; }
    const obj = {
      id: uid("cli"),
      safraId: getSafraId(),
      data,
      fazendaId,
      talhaoId: fd.get("talhaoId") || "",
      chuvaMm: Number(fd.get("chuvaMm") || 0),
      tempMax: fd.get("tempMax") ? Number(fd.get("tempMax")) : null,
      tempMin: fd.get("tempMin") ? Number(fd.get("tempMin")) : null,
      umidade: fd.get("umidade") ? Number(fd.get("umidade")) : null,
      vento: fd.get("vento") ? Number(fd.get("vento")) : null,
      obs: fd.get("obs") || ""
    };
    const db2 = getDB();
    db2.clima = db2.clima || [];
    db2.clima.push(obj);
    setDB(db2);
    toast("Registro salvo", "Dados climáticos adicionados");
    pageClima();
  });

  window.__delClima = (id) => {
    if (!confirm("Excluir este registro climático?")) return;
    const db2 = getDB();
    db2.clima = (db2.clima || []).filter(x => x.id !== id);
    setDB(db2);
    toast("Excluído", "Registro removido");
    pageClima();
  };

  document.getElementById("btnExportCSV").addEventListener("click", () => {
    const dados = clima.map(c => ({
      Data: c.data,
      Fazenda: findNameById(fazendas, c.fazendaId),
      Talhão: c.talhaoId ? findNameById(talhoes, c.talhaoId) : 'Geral',
      Chuva_mm: c.chuvaMm || 0,
      Temp_Max: c.tempMax || '',
      Temp_Min: c.tempMin || '',
      Umidade: c.umidade || '',
      Vento_kmh: c.vento || '',
      Observacoes: c.obs || ''
    }));
    downloadText(`clima-${nowISO()}.csv`, toCSV(dados));
    toast("Exportado", "CSV baixado");
  });

  // Botão ver previsão do tempo (APENAS INFORMATIVO - não importa dados)
  document.getElementById("btnImportClima").addEventListener("click", async () => {
    const db2 = getDB();
    const fazendas2 = onlySafra(db2.fazendas);
    
    if (fazendas2.length === 0) {
      toast("Erro", "Cadastre pelo menos uma fazenda primeiro.");
      return;
    }

    toast("Carregando...", "Buscando previsão do tempo...");
    let previsaoHtml = '';
    
    for (const faz of fazendas2) {
      if (!faz.latitude || !faz.longitude) {
        continue;
      }
      const previsao = await buscarPrevisaoClima(faz.id);
      if (previsao && previsao.length > 0) {
        previsaoHtml += `<div style="background:#f0f9ff; border:1px solid #0284c7; border-radius:8px; padding:15px; margin-top:15px;">
          <h4 style="margin:0 0 10px 0; color:#0284c7;">🌤️ Previsão do Tempo — ${escapeHtml(faz.nome)}</h4>
          <p style="font-size:11px; color:#64748b; margin:0 0 10px 0;">📍 Lat: ${faz.latitude} | Lon: ${faz.longitude} — Dados: Open-Meteo (apenas consulta)</p>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr style="background:#e0f2fe;">
              <th style="padding:8px; text-align:left;">Data</th>
              <th style="padding:8px; text-align:center;">Temp Min</th>
              <th style="padding:8px; text-align:center;">Temp Max</th>
              <th style="padding:8px; text-align:center;">Chuva</th>
              <th style="padding:8px; text-align:center;">Umidade</th>
              <th style="padding:8px; text-align:center;">Vento</th>
            </tr>`;
        previsao.slice(0, 7).forEach(p => {
          previsaoHtml += `<tr style="border-bottom:1px solid #e0f2fe;">
            <td style="padding:6px 8px;">${p.data}</td>
            <td style="padding:6px 8px; text-align:center;">${p.tempMin?.toFixed(1) || '-'}°C</td>
            <td style="padding:6px 8px; text-align:center;">${p.tempMax?.toFixed(1) || '-'}°C</td>
            <td style="padding:6px 8px; text-align:center;">${p.chuva?.toFixed(1) || '0'}mm</td>
            <td style="padding:6px 8px; text-align:center;">${p.umidade?.toFixed(0) || '-'}%</td>
            <td style="padding:6px 8px; text-align:center;">${p.vento?.toFixed(1) || '-'}km/h</td>
          </tr>`;
        });
        previsaoHtml += `</table>
          <p style="font-size:11px; color:#b45309; margin:10px 0 0 0; background:#fef3c7; padding:6px 10px; border-radius:4px;">⚠️ Dados apenas para consulta. Registre a chuva e temperatura observadas manualmente em cada talhão.</p>
        </div>`;
      }
    }
    
    if (previsaoHtml) {
      // Mostrar previsão em um modal ou área dedicada
      const container = document.createElement('div');
      container.id = 'previsaoContainer';
      container.innerHTML = `<div class="card" style="margin-top:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0;">🌤️ Previsão do Tempo (Próximos 7 dias)</h3>
          <button class="btn" onclick="document.getElementById('previsaoContainer').remove()" style="font-size:12px;">✕ Fechar</button>
        </div>
        ${previsaoHtml}
      </div>`;
      const existente = document.getElementById('previsaoContainer');
      if (existente) existente.remove();
      document.getElementById('content').prepend(container);
      toast("Previsão carregada", "Dados apenas para consulta. Registre manualmente.");
    } else {
      toast("Aviso", "Nenhuma fazenda com coordenadas cadastradas.");
    }
  });
}

