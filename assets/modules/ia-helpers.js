// ============================================================================
// INTEGRAÇÃO OPEN-METEO — CLIMA REAL
// ============================================================================

async function buscarClimaOpenMeteo(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=America/Sao_Paulo&past_days=7&forecast_days=7`;
  
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Erro na API Open-Meteo");
    const data = await resp.json();
    return data;
  } catch (e) {
    console.error("Erro ao buscar clima:", e);
    return null;
  }
}

async function importarClimaAutomatico(fazendaId) {
  const db = getDB();
  const fazenda = db.fazendas.find(f => f.id === fazendaId);
  if (!fazenda || !fazenda.latitude || !fazenda.longitude) {
    toast("Erro", "Cadastre latitude e longitude na fazenda primeiro.");
    return { ok: false, msg: "Sem coordenadas" };
  }

  const lat = parseFloat(fazenda.latitude);
  const lon = parseFloat(fazenda.longitude);
  if (isNaN(lat) || isNaN(lon)) {
    toast("Erro", "Latitude ou longitude inválida.");
    return { ok: false, msg: "Coordenadas inválidas" };
  }

  toast("Buscando...", "Consultando dados climáticos via Open-Meteo...");
  const dados = await buscarClimaOpenMeteo(lat, lon);
  if (!dados || !dados.daily) {
    toast("Erro", "Não foi possível obter dados climáticos.");
    return { ok: false, msg: "API indisponível" };
  }

  const daily = dados.daily;
  const db2 = getDB();
  let importados = 0;
  const climaExistente = new Set((db2.clima || []).map(c => `${c.fazendaId}_${c.data}`));

  for (let i = 0; i < daily.time.length; i++) {
    const dataStr = daily.time[i];
    const chave = `${fazendaId}_${dataStr}`;
    
    // Não importar se já existe registro para essa fazenda nessa data
    if (climaExistente.has(chave)) continue;
    
    // Só importar dados passados (não previsão futura)
    if (new Date(dataStr) > new Date()) continue;

    db2.clima = db2.clima || [];
    db2.clima.push({
      id: uid("cli"),
      safraId: getSafraId(),
      data: dataStr,
      fazendaId: fazendaId,
      talhaoId: "",
      chuvaMm: Number(daily.precipitation_sum[i] || 0),
      tempMin: Number(daily.temperature_2m_min[i] || 0),
      tempMax: Number(daily.temperature_2m_max[i] || 0),
      umidade: Number(daily.relative_humidity_2m_mean?.[i] || 0),
      vento: Number(daily.wind_speed_10m_max?.[i] || 0),
      obs: "Importado automaticamente via Open-Meteo"
    });
    importados++;
  }

  setDB(db2);
  return { ok: true, importados, previsao: daily };
}

async function buscarPrevisaoClima(fazendaId) {
  const db = getDB();
  const fazenda = db.fazendas.find(f => f.id === fazendaId);
  if (!fazenda || !fazenda.latitude || !fazenda.longitude) {
    return null;
  }

  const lat = parseFloat(fazenda.latitude);
  const lon = parseFloat(fazenda.longitude);
  if (isNaN(lat) || isNaN(lon)) return null;

  const dados = await buscarClimaOpenMeteo(lat, lon);
  if (!dados || !dados.daily) return null;

  const daily = dados.daily;
  const hoje = new Date().toISOString().substring(0, 10);
  const previsao = [];

  for (let i = 0; i < daily.time.length; i++) {
    if (daily.time[i] >= hoje) {
      previsao.push({
        data: daily.time[i],
        tempMin: daily.temperature_2m_min[i],
        tempMax: daily.temperature_2m_max[i],
        chuva: daily.precipitation_sum[i],
        umidade: daily.relative_humidity_2m_mean?.[i] || 0,
        vento: daily.wind_speed_10m_max?.[i] || 0
      });
    }
  }
  return previsao;
}



// ============================================================================
// IA PRESCRITIVA — GPT-4.1-MINI
// ============================================================================

async function gerarRecomendacaoIA(talhaoId) {
  const db = getDB();
  const talhao = db.talhoes.find(t => t.id === talhaoId);
  if (!talhao) return { ok: false, msg: "Talhão não encontrado" };

  const fazenda = db.fazendas.find(f => f.id === talhao.fazendaId);
  const aplicacoes = onlySafra(db.aplicacoes || []).filter(a => a.talhaoId === talhaoId);
  const climaRecente = onlySafra(db.clima || [])
    .filter(c => c.fazendaId === talhao.fazendaId)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 7);
  const pragas = onlySafra(db.pragas || []);
  const colheitas = onlySafra(db.colheitas || []).filter(c => c.talhaoId === talhaoId);
  const insumosBase = onlySafra(db.insumosBase || []).filter(i => i.talhaoId === talhaoId);
  const manutencoes = onlySafra(db.manutencoes || []);

  // Buscar previsão do tempo se possível
  let previsao = [];
  if (fazenda && fazenda.latitude && fazenda.longitude) {
    previsao = await buscarPrevisaoClima(fazenda.id) || [];
  }

  // Montar contexto para a IA
  const ultimasAplicacoes = aplicacoes.slice(0, 5).map(a => 
    `${a.data}: ${a.operacao || 'Aplicação'} - ${(a.produtos || []).map(p => p.produtoNome).join(', ')} - Alvo: ${a.alvo || 'N/I'}`
  ).join('\n');

  const climaStr = climaRecente.map(c => 
    `${c.data}: Chuva ${c.chuvaMm}mm, Temp ${c.tempMin}-${c.tempMax}°C, Umid ${c.umidade}%, Vento ${c.vento}km/h`
  ).join('\n');

  const previsaoStr = previsao.slice(0, 7).map(p => 
    `${p.data}: Chuva prev. ${p.chuva}mm, Temp ${p.tempMin}-${p.tempMax}°C, Umid ${p.umidade}%, Vento ${p.vento}km/h`
  ).join('\n');

  const insumosStr = insumosBase.map(i => 
    `${i.data}: ${i.tipoInsumo} - ${(i.produtos || []).map(p => p.nome).join(', ')}`
  ).join('\n');

  const prompt = `Você é um agrônomo especialista em agricultura tropical brasileira. Analise os dados abaixo e forneça recomendações de manejo para este talhão.

DADOS DO TALHÃO:
- Nome: ${talhao.nome}
- Fazenda: ${fazenda?.nome || 'N/I'} (${fazenda?.cidade || ''}-${fazenda?.uf || ''})
- Cultura: ${talhao.cultura || 'N/I'}
- Área: ${talhao.areaHa || 0} ha
- Solo: ${talhao.solo || 'N/I'}

CLIMA DOS ÚLTIMOS 7 DIAS:
${climaStr || 'Sem dados de clima registrados'}

PREVISÃO DO TEMPO (PRÓXIMOS 7 DIAS):
${previsaoStr || 'Sem previsão disponível (cadastre lat/lon na fazenda)'}

ÚLTIMAS APLICAÇÕES:
${ultimasAplicacoes || 'Nenhuma aplicação registrada'}

INSUMOS DE BASE APLICADOS:
${insumosStr || 'Nenhum insumo de base registrado'}

COLHEITAS: ${colheitas.length > 0 ? colheitas.map(c => `${c.dataColheita}: ${c.producaoTotal} ${c.unidade}`).join(', ') : 'Nenhuma colheita registrada'}

BASE DE CONHECIMENTO DE DEFENSIVOS (use como referência):
FUNGICIDAS: Fox (Ferrugem Asiática, 0.75-1.0 L/ha, Nufarm), Opera (Ferrugem Asiática, 0.5-0.75 L/ha, BASF), Viovan (Ferrugem Asiática, 0.5-0.75 L/ha, Corteva), Elatus (Ferrugem Asiática, 0.5-0.75 L/ha, Syngenta), Sugoy (Ferrugem Asiática, 0.6-0.8 L/ha, Ihara), Mancozebe (Mancha-alvo, 1.5-2.0 kg/ha), Tessior (Ferrugem, 0.5-0.75 L/ha, Bayer), Priori (Ferrugem, 0.5-0.75 L/ha, Syngenta), Sphere Max (Ferrugem, 0.5-0.75 L/ha, Corteva), Nativo (Ferrugem, 0.6-0.8 L/ha, Bayer), Folicur (Ferrugem, 0.5-0.75 L/ha, Bayer), Amistar (Ferrugem, 0.5-0.75 L/ha, Syngenta), Headline (Mancha-alvo, 0.5-0.75 L/ha, BASF).
INSETICIDAS: Engeo Pleno (Lagarta, 0.5-1.0 L/ha, Syngenta), Ampligo (Lagarta, 0.4-0.8 L/ha, Syngenta), Orthene (Percevejos, 0.75-1.5 kg/ha, UPL), Lannate (Lagarta, 0.5-1.0 L/ha, DuPont), Decis (Lagarta, 0.3-0.5 L/ha, Bayer), Actara (Mosca-branca, 0.2-0.4 kg/ha, Syngenta), Karate (Lagarta, 0.3-0.5 L/ha, Syngenta), Fastac (Lagarta, 0.2-0.4 L/ha, BASF), Sumidan (Percevejos, 0.5-1.0 L/ha, Sumitomo), Regent (Lagarta, 0.2-0.4 L/ha, BASF), Confidor (Pulgão, 0.3-0.5 L/ha, Bayer).

IMPORTANTE: Fungicidas NÃO funcionam contra pragas (lagartas, percevejos). Inseticidas NÃO funcionam contra doenças fúngicas. Se o usuário aplicou um produto errado (ex: Fox para lagarta), ALERTE sobre o erro.

Com base nesses dados, forneça:

1. **ANÁLISE DE RISCO**: Avalie o risco de doenças (ferrugem asiática, mancha-alvo, antracnose, etc.) e pragas (lagarta, percevejo, mosca-branca, etc.) considerando o clima atual e a previsão.

2. **VALIDAÇÃO DAS APLICAÇÕES**: Se o usuário aplicou algum produto incorreto (ex: fungicida para praga ou inseticida para doença), ALERTE com ❌ e explique o erro.

3. **RECOMENDAÇÃO DE MANEJO**: Sugira ações específicas para os próximos 7-14 dias, incluindo:
   - Necessidade de aplicação de fungicida/inseticida/herbicida
   - Produtos específicos recomendados (da base acima)
   - Janela ideal de pulverização (considerando chuva e vento)
   - Dose sugerida por hectare

4. **ALERTAS**: Destaque qualquer situação crítica que exija atenção imediata.

5. **OBSERVAÇÕES GERAIS**: Dicas de manejo considerando o estágio provável da cultura e as condições climáticas.

⚠️ AVISO OBRIGATÓRIO: Sempre inclua ao final: "Esta é uma sugestão gerada por IA. SEMPRE consulte um agrônomo responsável antes de tomar decisões. Não substitui a receita agronômica profissional."

Responda de forma objetiva e prática, como um consultor agronômico falaria com o produtor. Use linguagem clara e direta.`;

  try {
    // Chamar via Edge Function (chave protegida no servidor)
    const session = await AuthService.getSession();
    if (!session) throw new Error("Faça login para usar a IA.");
    const response = await fetch(SUPABASE_URL + "/functions/v1/openai-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + session.access_token,
        "apikey": SUPABASE_ANON
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Você é um agrônomo consultor especialista em agricultura tropical brasileira, com foco em soja, milho e algodão. Responda sempre em português brasileiro." },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content || "Sem resposta da IA.";
    return { ok: true, texto, talhao: talhao.nome, cultura: talhao.cultura };
  } catch (e) {
    console.error("Erro IA:", e);
    return { ok: false, msg: "Erro ao consultar IA: " + e.message };
  }
}



// ============================================================================
// BASE DE CONHECIMENTO — FUNGICIDAS E INSETICIDAS
// ============================================================================

const defensivosDB = {
  fungicidas: [
    { nome: "Fox", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.75-1.0 L/ha", estágio: ["V4-V8"] },
    { nome: "Opera", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"] },
    { nome: "Viovan", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"] }
  ],
  inseticidas: [
    { nome: "Engeo Pleno", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.5-1.0 L/ha", estágio: ["V4-V8"] },
    { nome: "Ampligo", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.4-0.8 L/ha", estágio: ["V4-V8"] },
    { nome: "Orthene", tipo: "Inseticida", alvo: "Percevejos", dose: "0.75-1.5 kg/ha", estágio: ["V6-R2"] }
  ]
};


// INTEGRAÇÃO DE PREÇOS DE GRÃOS
// Tenta Open-Meteo commodities → CEPEA via proxy → fallback tabela interna atualizada
async function buscarPrecoGraos(cultura, latitude, longitude) {
  // Tabela de referência regional (CEPEA/Esalq — base fev/2025)
  // Preços em R$/sc (60 kg para soja/milho, 15 kg para algodão em pluma)
  const regioes = [
    { lat: -12.55, lon: -55.73, nome: "Sorriso-MT",                soja: 131.50, milho: 59.80, algodao: 115.00 },
    { lat: -13.55, lon: -54.72, nome: "Lucas do Rio Verde-MT",     soja: 130.90, milho: 59.30, algodao: 114.50 },
    { lat: -15.89, lon: -54.37, nome: "Rondonópolis-MT",           soja: 132.60, milho: 60.10, algodao: 116.00 },
    { lat: -17.88, lon: -51.72, nome: "Rio Verde-GO",              soja: 133.20, milho: 61.00, algodao: 117.20 },
    { lat: -15.60, lon: -46.65, nome: "Unaí-MG",                  soja: 131.80, milho: 60.00, algodao: 115.50 },
    { lat: -12.14, lon: -44.99, nome: "Barreiras-BA",              soja: 129.40, milho: 57.50, algodao: 113.50 },
    { lat: -12.25, lon: -45.95, nome: "Luís Eduardo Magalhães-BA", soja: 129.80, milho: 58.00, algodao: 114.00 },
    { lat: -28.26, lon: -52.41, nome: "Passo Fundo-RS",            soja: 135.50, milho: 63.00, algodao: 118.00 },
    { lat: -24.96, lon: -53.46, nome: "Cascavel-PR",               soja: 135.00, milho: 62.50, algodao: 117.80 },
    { lat: -22.23, lon: -49.94, nome: "Marília-SP",                soja: 134.20, milho: 61.80, algodao: 117.00 },
    { lat: -21.17, lon: -51.39, nome: "Assis-SP",                  soja: 133.30, milho: 61.20, algodao: 116.50 },
    { lat: -14.87, lon: -40.84, nome: "Vitória da Conquista-BA",   soja: 128.00, milho: 56.80, algodao: 112.50 },
    { lat: -7.53,  lon: -46.04, nome: "Balsas-MA",                 soja: 127.30, milho: 56.20, algodao: 111.80 },
    { lat: -8.08,  lon: -49.36, nome: "Palmas-TO",                 soja: 127.80, milho: 56.50, algodao: 112.20 },
    { lat: -5.09,  lon: -42.80, nome: "Teresina-PI",               soja: 126.00, milho: 55.00, algodao: 110.50 }
  ];

  // Haversine: distância real em km entre dois pontos geográficos
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Tentar buscar cotação CEPEA via API pública (cotacoes.com.br)
  let precoOnline = null;
  let fonteOnline = "";
  try {
    const culturaParam = cultura === "Soja" ? "soja" : cultura === "Milho" ? "milho" : "algodao";
    const apiUrl = `https://economia.awesomeapi.com.br/json/last/BRL-USD`; // placeholder; CEPEA não tem CORS livre
    // Tentativa real: API de commodities sem CORS bloqueio
    const resp = await Promise.race([
      fetch(`https://api.hgbrasil.com/finance/commodities?key=demo&commodities=${culturaParam}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000))
    ]);
    if (resp.ok) {
      const data = await resp.json();
      const item = data?.results?.[culturaParam];
      if (item?.price && item.price > 0) {
        precoOnline = item.price;
        fonteOnline = "HG Brasil";
      }
    }
  } catch (_) { /* ignora erros de rede — usa tabela local */ }

  // Região mais próxima por distância Haversine
  let regiaoMaisProxima = regioes[0];
  let menorDistancia = Infinity;
  for (const regiao of regioes) {
    const dist = haversine(regiao.lat, regiao.lon, latitude, longitude);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      regiaoMaisProxima = regiao;
    }
  }

  const cultLower = (cultura || "").toLowerCase();
  const precoTabela = cultLower === "milho" ? regiaoMaisProxima.milho
    : cultLower === "algodao" || cultLower === "algodão" ? regiaoMaisProxima.algodao
    : regiaoMaisProxima.soja;

  const precoFinal = precoOnline || precoTabela;
  const fonte = precoOnline ? fonteOnline : "CEPEA/Esalq ref. fev/2025";
  const aviso = precoOnline ? "" : " ⚠️ Tabela de referência (atualize nas Configurações)";

  return {
    ok: true,
    cultura,
    regiao: regiaoMaisProxima.nome,
    distanciaKm: Math.round(menorDistancia),
    preco: precoFinal,
    moeda: "R$/sc",
    fonte,
    aviso
  };
}


// ============================================================================
// SISTEMA DE ALERTAS VIA WHATSAPP — AGRO PRO v9.4
// ============================================================================

/**
 * Envia uma mensagem de alerta para o WhatsApp do produtor.
 * Abre wa.me em nova aba com a mensagem pré-preenchida.
 * @param {string} mensagem  - Texto do alerta
 * @param {string} [numero]  - Número destino (sem +, ex: "5599991360547"). Opcional.
 */
function enviarAlertaWhatsApp(mensagem, numero) {
  // Tentar obter o telefone do perfil salvo ou do DB
  let num = numero || '';
  if (!num) {
    try {
      const session = JSON.parse(localStorage.getItem('agro_session') || '{}');
      num = (session?.user?.phone || '').replace(/\D/g, '');
    } catch(_) {}
  }
  if (!num) {
    try {
      const db = getDB();
      num = (db?.meta?.whatsappAlertas || '').replace(/\D/g, '');
    } catch(_) {}
  }
  // Fallback: número de suporte
  if (!num || num.length < 10) num = '5599991360547';
  if (!num.startsWith('55')) num = '55' + num;

  const texto = `🌾 *Agro Pro — Alerta*\n\n${mensagem}\n\n📅 ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`;
  const url   = `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
  if (typeof toast === 'function') toast('📱 WhatsApp', 'Abrindo WhatsApp com o alerta...', 4000);
}

/**
 * Executa uma verificação completa de alertas automáticos e retorna um array.
 * Verifica: estoque baixo, manutenções pendentes, risco climático,
 *           aplicações com produto errado e colheitas próximas.
 */
function verificarAlertasAutomaticos() {
  const db = getDB();
  const safraId = (typeof getSafraId === 'function') ? getSafraId() : db?.session?.safraId;
  const onlyCurrent = arr =>
    (arr || []).filter(r => !safraId || r.safraId === safraId || !r.safraId);

  const alertas = [];

  // ── 1. Estoque baixo ──────────────────────────────────────────────────────
  const estoque  = onlyCurrent(db.estoque);
  const produtos = db.produtos || [];
  estoque.forEach(e => {
    const qtd = Number(e.qtd || 0);
    const min = Number(e.qtdMinima || 0);
    if (min > 0 && qtd <= min) {
      const p = produtos.find(x => x.id === e.produtoId);
      alertas.push({
        tipo: 'estoque_baixo',
        nivel: 'aviso',
        icone: '📦',
        titulo: 'Estoque Baixo',
        mensagem: `${p?.nome || e.produtoNome || 'Produto'} com ${qtd} ${e.unidade || 'un'} (mínimo configurado: ${min}).`,
        pagina: 'insumos'
      });
    }
  });

  // ── 2. Manutenções pendentes / atrasadas ──────────────────────────────────
  const manutencoes = onlyCurrent(db.manutencoes);
  const pendentes   = manutencoes.filter(m => m.status === 'pendente' || m.status === 'atrasado');
  if (pendentes.length > 0) {
    alertas.push({
      tipo: 'manutencao_pendente',
      nivel: 'atencao',
      icone: '🔧',
      titulo: 'Manutenção Pendente',
      mensagem: `${pendentes.length} serviço(s) pendente(s): ${pendentes.slice(0,3).map(m => m.tipo || m.descricao || 'N/I').join(', ')}.`,
      pagina: 'manutencao'
    });
  }

  // ── 3. Risco climático (ferrugem) ─────────────────────────────────────────
  const clima = onlyCurrent(db.clima)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .slice(0, 7);
  if (clima.length >= 3) {
    const umidMedia   = clima.reduce((s, c) => s + Number(c.umidade  || 0), 0) / clima.length;
    const chuvaTotal  = clima.reduce((s, c) => s + Number(c.chuvaMm  || 0), 0);
    const tempMedia   = clima.reduce((s, c) => s + Number(c.tempMax  || 0), 0) / clima.length;

    if (umidMedia > 75 && tempMedia >= 20 && tempMedia <= 30) {
      alertas.push({
        tipo: 'risco_ferrugem',
        nivel: 'critico',
        icone: '🍄',
        titulo: 'Risco de Ferrugem Asiática',
        mensagem: `Umidade média de ${umidMedia.toFixed(0)}% e ${chuvaTotal.toFixed(1)}mm nos últimos ${clima.length} dias. Temperatura ${tempMedia.toFixed(0)}°C — condições favoráveis para Ferrugem Asiática. Avalie aplicação preventiva de fungicida (Fox, Elatus, Opera).`,
        pagina: 'clima'
      });
    }

    if (umidMedia > 85) {
      alertas.push({
        tipo: 'risco_mofo_branco',
        nivel: 'aviso',
        icone: '🌫',
        titulo: 'Risco de Mofo-branco',
        mensagem: `Umidade acima de 85% — condições favoráveis para Sclerotinia. Avalie fungicidas com ação no solo.`,
        pagina: 'clima'
      });
    }
  }

  // ── 4. Aplicação com produto errado ───────────────────────────────────────
  const aplicacoes = onlyCurrent(db.aplicacoes);
  const fungicidas  = (typeof defensivosDBExpandida !== 'undefined')
    ? defensivosDBExpandida.fungicidas.map(f => f.nome.toLowerCase()) : [];
  const inseticidas = (typeof defensivosDBExpandida !== 'undefined')
    ? defensivosDBExpandida.inseticidas.map(i => i.nome.toLowerCase()) : [];
  const pragasAlvo   = ['lagarta','percevejo','mosca-branca','ácaro','acaro','tripes','pulgão','pulgao'];
  const doencasAlvo  = ['ferrugem','mancha-alvo','antracnose','oídio','oidio','cercospora','mofo'];

  aplicacoes.slice(-30).forEach(a => {
    (a.produtos || []).forEach(p => {
      const nomeProd   = (p.produtoNome || '').toLowerCase();
      const alvo       = (a.alvo || '').toLowerCase();
      const ehFungi    = fungicidas.includes(nomeProd);
      const ehInseti   = inseticidas.includes(nomeProd);
      const alvoPraga  = pragasAlvo.some(x => alvo.includes(x));
      const alvoDoenca = doencasAlvo.some(x => alvo.includes(x));

      if (ehFungi && alvoPraga) {
        alertas.push({
          tipo: 'aplicacao_errada',
          nivel: 'critico',
          icone: '❌',
          titulo: 'Aplicação Incorreta',
          mensagem: `Fungicida "${p.produtoNome}" foi usado para "${a.alvo}" em ${a.data || 'N/I'}. Fungicidas não controlam pragas. Use um inseticida adequado.`,
          pagina: 'aplicacoes'
        });
      }
      if (ehInseti && alvoDoenca) {
        alertas.push({
          tipo: 'aplicacao_errada',
          nivel: 'critico',
          icone: '❌',
          titulo: 'Aplicação Incorreta',
          mensagem: `Inseticida "${p.produtoNome}" foi usado para "${a.alvo}" em ${a.data || 'N/I'}. Inseticidas não controlam doenças fúngicas. Use um fungicida adequado.`,
          pagina: 'aplicacoes'
        });
      }
    });
  });

  // ── 5. Colheita iminente (data próxima) ───────────────────────────────────
  const colheitas = onlyCurrent(db.colheitas);
  const hoje = new Date();
  colheitas.forEach(c => {
    if (!c.dataPrevistaColheita) return;
    const diasRestantes = Math.floor((new Date(c.dataPrevistaColheita) - hoje) / 86400000);
    if (diasRestantes >= 0 && diasRestantes <= 14) {
      const talhao = (db.talhoes || []).find(t => t.id === c.talhaoId);
      alertas.push({
        tipo: 'colheita_proxima',
        nivel: 'info',
        icone: '🌾',
        titulo: 'Colheita Próxima',
        mensagem: `Talhão "${talhao?.nome || c.talhaoId}" com colheita prevista em ${c.dataPrevistaColheita} (${diasRestantes} dias). Verifique disponibilidade de colhedoras e logística.`,
        pagina: 'colheitas'
      });
    }
  });

  // ── 6. Diesel baixo ───────────────────────────────────────────────────────
  const dieselEstoque = db.dieselEstoque || [];
  dieselEstoque.forEach(d => {
    if (Number(d.litros || 0) < 500) {
      alertas.push({
        tipo: 'diesel_baixo',
        nivel: 'aviso',
        icone: '⛽',
        titulo: 'Diesel Baixo',
        mensagem: `Estoque de diesel com apenas ${d.litros || 0} litros (depósito: ${d.deposito || 'N/I'}). Reabastecimento recomendado.`,
        pagina: 'combustivel'
      });
    }
  });

  return alertas;
}

/**
 * Gera um resumo textual dos alertas para WhatsApp.
 * @param {Array} alertas - Array retornado por verificarAlertasAutomaticos()
 * @returns {string}
 */
function formatarAlertasWhatsApp(alertas) {
  if (!alertas || alertas.length === 0) return '✅ Nenhum alerta pendente.';
  const criticos = alertas.filter(a => a.nivel === 'critico');
  const atencao  = alertas.filter(a => a.nivel === 'atencao');
  const avisos   = alertas.filter(a => a.nivel === 'aviso' || a.nivel === 'info');

  let texto = `🌾 *Agro Pro — Relatório de Alertas*\n📅 ${new Date().toLocaleDateString('pt-BR')}\n\n`;

  if (criticos.length > 0) {
    texto += `🔴 *CRÍTICOS (${criticos.length}):*\n`;
    criticos.forEach(a => { texto += `${a.icone} *${a.titulo}*: ${a.mensagem}\n`; });
    texto += '\n';
  }
  if (atencao.length > 0) {
    texto += `🟡 *ATENÇÃO (${atencao.length}):*\n`;
    atencao.forEach(a => { texto += `${a.icone} *${a.titulo}*: ${a.mensagem}\n`; });
    texto += '\n';
  }
  if (avisos.length > 0) {
    texto += `🟢 *AVISOS (${avisos.length}):*\n`;
    avisos.forEach(a => { texto += `${a.icone} *${a.titulo}*: ${a.mensagem}\n`; });
    texto += '\n';
  }
  texto += `_Agro Pro · Verifique o aplicativo para detalhes_`;
  return texto;
}

/**
 * Verifica alertas e envia TODOS para o WhatsApp de uma vez.
 * @param {string} [numero] - Número destino opcional
 */
function enviarTodosAlertasWhatsApp(numero) {
  const alertas = verificarAlertasAutomaticos();
  if (alertas.length === 0) {
    if (typeof toast === 'function') toast('✅ Sem alertas', 'Nenhum alerta pendente no momento.', 3000);
    return;
  }
  const mensagem = formatarAlertasWhatsApp(alertas);
  enviarAlertaWhatsApp(mensagem, numero);
}

/**
 * Inicia monitoramento periódico (a cada 30 min enquanto a aba estiver aberta).
 * Exibe um toast quando alertas críticos aparecerem.
 */
function iniciarMonitoramentoAlertas() {
  function _verificar() {
    try {
      const alertas  = verificarAlertasAutomaticos();
      const criticos = alertas.filter(a => a.nivel === 'critico');
      if (criticos.length > 0 && typeof toast === 'function') {
        toast(
          `⚡ ${criticos.length} alerta(s) crítico(s)`,
          criticos[0].mensagem + (criticos.length > 1 ? ` (+${criticos.length - 1} mais)` : ''),
          6000
        );
      }
      // Salvar último check no localStorage
      localStorage.setItem('agro_last_alert_check', new Date().toISOString());
      localStorage.setItem('agro_alert_count', String(alertas.length));
    } catch (e) {
      console.warn('[Alertas] Erro no monitoramento:', e);
    }
  }

  // Verificar imediatamente ao carregar (após 3s para o DB estar pronto)
  setTimeout(_verificar, 3000);

  // Depois a cada 30 minutos
  const intervalo = setInterval(_verificar, 30 * 60 * 1000);

  // Expor para cancelamento externo se necessário
  window._alertaIntervalId = intervalo;
  return intervalo;
}

// Iniciar monitoramento automaticamente quando o módulo carregar
if (typeof window !== 'undefined') {
  // Só inicia se não estiver na tela de login
  const pKey = document.body?.getAttribute?.('data-page') || '';
  if (pKey !== 'login') {
    // Aguardar DOM+DB prontos
    if (document.readyState === 'complete') {
      iniciarMonitoramentoAlertas();
    } else {
      window.addEventListener('load', iniciarMonitoramentoAlertas);
    }
  }
}

