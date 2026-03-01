// ============================================================================
// AGRO-COPILOT v2.0 — IA ATIVA COM DADOS COMPLETOS DO SITE
// Assistente agronômico inteligente com alertas via WhatsApp
// ============================================================================

/* ─── Estado global do chat ─── */
let _copilotMessages = []; // histórico de mensagens da sessão
let _copilotTyping   = false;

// ============================================================================
// CONSTRUÇÃO DO CONTEXTO COMPLETO DO BANCO DE DADOS
// ============================================================================

function _buildFullContext() {
  const db  = getDB();
  const now = new Date();

  /* ── Safra ativa ─────────────────────────────────── */
  const safraId = getSafraId ? getSafraId() : (db.session?.safraId || null);
  const safra   = db.safras?.find(s => s.id === safraId);

  /* ── Helpers ─────────────────────────────────────── */
  const onlyCurrent = arr =>
    (arr || []).filter(r => !safraId || r.safraId === safraId || !r.safraId);

  const fmt = v => (v === null || v === undefined || v === '') ? 'N/I' : v;
  const fmtNum = (v, dec = 2) => isNaN(Number(v)) ? 'N/I' : Number(v).toFixed(dec);

  /* ── Dados da safra atual ────────────────────────── */
  const fazendas   = onlyCurrent(db.fazendas);
  const talhoes    = onlyCurrent(db.talhoes);
  const aplicacoes = onlyCurrent(db.aplicacoes);
  const estoque    = onlyCurrent(db.estoque);
  const colheitas  = onlyCurrent(db.colheitas);
  const clima      = onlyCurrent(db.clima).sort((a, b) => b.data?.localeCompare(a.data));
  const combustivel= onlyCurrent(db.combustivel || db.dieselEntradas || []);
  const manutencoes= onlyCurrent(db.manutencoes);
  const equipe     = onlyCurrent(db.equipe);
  const maquinas   = onlyCurrent(db.maquinas);
  const insumosBase= onlyCurrent(db.insumosBase);
  const produtos   = db.produtos || [];
  const params     = db.parametros || {};

  /* ── KPIs financeiros ────────────────────────────── */
  let custoTotalSafra = 0;
  let receitaTotalEstimada = 0;

  const calcCustoTalhao = t => {
    const area = Number(t.areaHa || 0);
    const apls = aplicacoes.filter(a => a.talhaoId === t.id);
    const custo = apls.reduce((acc, a) => {
      const prod = (a.produtos || []).reduce((s, p) =>
        s + (Number(p.quantidade || 0) * Number(p.precoPorUnidade || 0) * area), 0);
      return acc + prod;
    }, 0);
    return custo;
  };

  const talhoesInfo = talhoes.map(t => {
    const fazenda = fazendas.find(f => f.id === t.fazendaId);
    const custo   = calcCustoTalhao(t);
    custoTotalSafra += custo;
    const colheita = colheitas.find(c => c.talhaoId === t.id);
    const area  = Number(t.areaHa || 0);

    // Receita estimada
    const cultura = (t.cultura || '').toLowerCase();
    let preco = 0, prodMin = 0, prodMax = 0;
    if (cultura === 'soja')    { preco = params.precoSoja   || 120; prodMin = params.produtividadeMinSoja   || 65;  prodMax = params.produtividadeMaxSoja   || 75;  }
    else if (cultura === 'milho')  { preco = params.precoMilho  || 60;  prodMin = params.produtividadeMinMilho  || 100; prodMax = params.produtividadeMaxMilho  || 130; }
    else if (cultura === 'sorgo')  { preco = params.precoSorgo  || 42;  prodMin = params.produtividadeMinSorgo  || 70;  prodMax = params.produtividadeMaxSorgo  || 100; }
    else if (cultura === 'feijão' || cultura === 'feijao') { preco = params.precoFeijao || 280; prodMin = params.produtividadeMinFeijao || 25; prodMax = params.produtividadeMaxFeijao || 40; }
    else if (cultura === 'trigo')  { preco = params.precoTrigo  || 85;  prodMin = params.produtividadeMinTrigo  || 40;  prodMax = params.produtividadeMaxTrigo  || 60;  }
    else if (cultura === 'arroz')  { preco = params.precoArroz  || 60;  prodMin = params.produtividadeMinArroz  || 60;  prodMax = params.produtividadeMaxArroz  || 80;  }
    else if (cultura === 'café' || cultura === 'cafe') { preco = params.precoCafe || 1200; prodMin = params.produtividadeMinCafe || 20; prodMax = params.produtividadeMaxCafe || 40; }
    else if (cultura === 'algodão' || cultura === 'algodao') { preco = 150; prodMin = 250; prodMax = 300; }

    const recEstMin = area * prodMin * preco;
    const recEstMax = area * prodMax * preco;
    receitaTotalEstimada += (recEstMin + recEstMax) / 2;

    return {
      nome: t.nome,
      fazenda: fazenda?.nome || 'N/I',
      area,
      cultura: t.cultura,
      solo: t.solo,
      custo,
      receitaMin: recEstMin,
      receitaMax: recEstMax,
      colheita: colheita ? `${colheita.producaoTotal} ${colheita.unidade} em ${colheita.dataColheita}` : null,
      ultimasAplicacoes: aplicacoes.filter(a => a.talhaoId === t.id).slice(-5).map(a =>
        `${a.data}: ${a.operacao || 'Aplicação'} — ${(a.produtos || []).map(p => p.produtoNome).join(', ')} (alvo: ${a.alvo || 'N/I'})`
      )
    };
  });

  /* ── Clima recente (últimos 7 dias) ──────────────── */
  const climaRecente = clima.slice(0, 7);
  const climaStr = climaRecente.length > 0
    ? climaRecente.map(c =>
        `${c.data}: 🌧 ${fmtNum(c.chuvaMm,1)}mm  🌡 ${c.tempMin}-${c.tempMax}°C  💧 ${c.umidade}%  💨 ${c.vento}km/h`
      ).join('\n')
    : 'Nenhum dado climático registrado';

  /* ── Estoque ─────────────────────────────────────── */
  const estoqueStr = estoque.length > 0
    ? estoque.map(e => {
        const p = produtos.find(x => x.id === e.produtoId);
        return `${p?.nome || e.produtoNome || 'Produto'}: ${e.qtd} ${e.unidade} (depósito: ${e.deposito || 'N/I'})`;
      }).join('\n')
    : 'Estoque não cadastrado';

  const estoqueBaixo = estoque.filter(e => Number(e.qtd || 0) <= Number(e.qtdMinima || 0) && Number(e.qtdMinima || 0) > 0);

  /* ── Máquinas e Manutenção ───────────────────────── */
  const maquinasStr = maquinas.length > 0
    ? maquinas.map(m => `${m.nome} (${m.tipo || 'N/I'}): ${m.horasUso || 0}h, próx. manutenção: ${m.proximaManutencao || 'N/A'}`).join('\n')
    : 'Nenhuma máquina cadastrada';

  const manPendentes = manutencoes.filter(m => m.status === 'pendente' || m.status === 'atrasado');

  /* ── Combustível ─────────────────────────────────── */
  const combustivelTotal = combustivel.reduce((acc, c) => acc + Number(c.litros || 0), 0);

  /* ── Equipe ──────────────────────────────────────── */
  const equipeStr = equipe.length > 0
    ? equipe.map(e => `${e.nome} (${e.cargo || e.funcao || 'N/I'})`).join(', ')
    : 'Sem equipe cadastrada';

  /* ── Plano e usuário ─────────────────────────────── */
  const plano = planoAtual || localStorage.getItem('agro_plano') || 'Free';
  const session = (() => { try { return JSON.parse(localStorage.getItem('agro_session') || '{}'); } catch(_) { return {}; } })();
  const nomeUsuario = session?.user?.nome || session?.user?.email || 'Produtor';

  /* ── Construção do prompt de sistema ─────────────── */
  const sistemaPrompt = `Você é o **Agro-Copilot**, assistente de inteligência artificial especializado em agronomia tropical brasileira, integrado ao sistema Agro Pro.

Seu objetivo é ajudar o produtor rural **${nomeUsuario}** a tomar decisões melhores com base nos dados reais da propriedade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DADOS COMPLETOS DA PROPRIEDADE — SAFRA ATUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌾 SAFRA ATIVA:
  ${safra ? `Nome: ${safra.nome} | Início: ${safra.dataInicio || 'N/I'} | Fim: ${safra.dataFim || 'N/I'} | Obs: ${safra.obs || ''}` : 'Nenhuma safra ativa selecionada'}

🏡 FAZENDAS (${fazendas.length}):
${fazendas.map(f => `  • ${f.nome} — ${f.cidade || ''}-${f.uf || ''}, ${f.areaTotal || f.area || '?'}ha, lat/lon: ${f.latitude || 'N/I'}/${f.longitude || 'N/I'}`).join('\n') || '  Nenhuma fazenda cadastrada'}

🌱 TALHÕES E CUSTOS (${talhoes.length} talhões):
${talhoesInfo.map((t, i) => `  Talhão ${i+1}: "${t.nome}" | Fazenda: ${t.fazenda} | Área: ${t.area}ha | Cultura: ${t.cultura || 'N/I'} | Solo: ${t.solo || 'N/I'}
    Custo acumulado: R$${fmtNum(t.custo)} | Receita est.: R$${fmtNum(t.receitaMin)}–R$${fmtNum(t.receitaMax)}
    ${t.colheita ? `Colheita: ${t.colheita}` : 'Sem colheita registrada'}
    Últimas aplicações:\n${t.ultimasAplicacoes.length ? t.ultimasAplicacoes.map(a => `      - ${a}`).join('\n') : '      Nenhuma aplicação'}`).join('\n\n') || '  Nenhum talhão cadastrado'}

📊 RESUMO FINANCEIRO:
  Custo total safra: R$${fmtNum(custoTotalSafra)}
  Receita estimada média: R$${fmtNum(receitaTotalEstimada)}
  Lucro projetado: R$${fmtNum(receitaTotalEstimada - custoTotalSafra)}

🌦 CLIMA RECENTE (últimos 7 dias):
${climaStr}

🧪 ESTOQUE DE INSUMOS:
${estoqueStr}
${estoqueBaixo.length > 0 ? `  ⚠️ ESTOQUE BAIXO: ${estoqueBaixo.map(e => e.produtoNome || e.produtoId).join(', ')}` : '  ✅ Todos os estoques OK'}

🚜 MÁQUINAS E MANUTENÇÕES:
${maquinasStr}
${manPendentes.length > 0 ? `  ⚠️ MANUTENÇÕES PENDENTES: ${manPendentes.map(m => m.descricao || m.tipo).join(', ')}` : '  ✅ Nenhuma manutenção pendente'}

⛽ COMBUSTÍVEL:
  Total abastecido nesta safra: ${fmtNum(combustivelTotal, 1)} litros

👥 EQUIPE:
  ${equipeStr}

💰 PARÂMETROS DE MERCADO:
  Soja: R$${params.precoSoja || 120}/sc | Prod: ${params.produtividadeMinSoja||65}–${params.produtividadeMaxSoja||75} sc/ha
  Milho: R$${params.precoMilho || 60}/sc | Prod: ${params.produtividadeMinMilho||100}–${params.produtividadeMaxMilho||130} sc/ha
  Sorgo: R$${params.precoSorgo || 42}/sc | Feijão: R$${params.precoFeijao || 280}/sc | Trigo: R$${params.precoTrigo || 85}/sc
  Arroz: R$${params.precoArroz || 60}/sc | Café: R$${params.precoCafe || 1200}/sc

📦 PRODUTOS CADASTRADOS (${produtos.length}):
${produtos.slice(0, 20).map(p => `  • ${p.nome} (${p.tipo || 'N/I'}) — R$${p.preco || 'N/I'}/u — Carência: ${p.carenciaDias || '?'}d`).join('\n') || '  Nenhum produto cadastrado'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 BASE DE CONHECIMENTO AGRONÔMICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNGICIDAS SOJA: Fox 0.75-1.0L/ha (Ferrugem, Nufarm R$86), Opera 0.5-0.75L/ha (Ferrugem, BASF R$121), Elatus 0.5-0.75L/ha (Ferrugem, Syngenta R$110), Tessior 0.5-0.75L/ha (Ferrugem, Bayer R$125), Priori 0.5-0.75L/ha (Ferrugem, Syngenta R$105), Mancozebe 1.5-2.0kg/ha (Mancha-alvo R$45), Headline 0.5-0.75L/ha (Mancha-alvo, BASF R$98), Amistar 0.5-0.75L/ha (Ferrugem, Syngenta R$112).
INSETICIDAS: Engeo Pleno 0.5-1.0L/ha (Lagarta, Syngenta R$145), Ampligo 0.4-0.8L/ha (Lagarta, Syngenta R$130), Orthene 0.75-1.5kg/ha (Percevejo, UPL R$35), Decis 0.3-0.5L/ha (Lagarta, Bayer R$65), Actara 0.2-0.4kg/ha (Mosca-branca, Syngenta R$120), Karate 0.3-0.5L/ha (Lagarta, Syngenta R$72), Confidor 0.3-0.5L/ha (Pulgão, Bayer R$88).
HERBICIDAS: Glifosato 2-4L/ha (Pré/Pós-emergência, dessecação), Roundup 2-3L/ha, Verdict 0.6-1.2L/ha (Gramíneas pós), Select 0.5-1.0L/ha (Gramíneas).

REGRAS CRÍTICAS:
❌ Fungicida NÃO controla praga (lagarta, percevejo, ácaro, mosca-branca)
❌ Inseticida NÃO controla doença fúngica (ferrugem, mancha-alvo, antracnose)
⚠️ Não aplicar com vento >12km/h (risco de deriva)
⚠️ Não aplicar com chuva prevista nas próximas 2-4h
⚠️ Respeitar carência antes da colheita

ALERTAS CLIMÁTICOS PARA FERRUGEM ASIÁTICA: risco ALTO quando umidade >70% + temperatura 20-28°C + chuvas frequentes. Janela de aplicação: 90% de infecção ocorre nos estádios R1-R3.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 SUAS RESPONSABILIDADES COMO AGRO-COPILOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Responder perguntas do produtor sobre seus dados reais (custos, produção, clima, estoque).
2. Identificar inconsistências (ex: fungicida usado para praga → gerar alerta ❌).
3. Sugerir ações de manejo com base no clima e histórico de aplicações.
4. Calcular estimativas de receita, custo e retorno por talhão.
5. Alertar sobre estoque baixo, manutenções pendentes e riscos climáticos.
6. Sugerir quando enviar alertas via WhatsApp ao produtor.
7. Sempre indicar no fim da resposta se o alerta deve ser enviado ao WhatsApp (formato JSON: {"whatsapp_alert": true, "mensagem": "..."}).
8. Responder em português brasileiro, de forma clara e direta, como um consultor agronômico experiente.

⚠️ AVISO OBRIGATÓRIO AO FINAL DE RECOMENDAÇÕES DE DEFENSIVOS:
"⚠️ Esta sugestão é gerada por IA. Consulte sempre um agrônomo habilitado antes de aplicar qualquer defensivo. Receita agronômica é obrigatória por lei."

Plano do usuário: ${plano} | Data de hoje: ${now.toISOString().substring(0,10)}`;

  return sistemaPrompt;
}

// ============================================================================
// CHAMADA À IA VIA EDGE FUNCTION (SUPABASE) OU FALLBACK LOCAL
// ============================================================================

async function _callAI(userMessage) {
  const systemPrompt = _buildFullContext();

  // Montar histórico para contexto contínuo (máx. 10 trocas)
  const history = _copilotMessages.slice(-20).map(m => ({
    role: m.role === 'bot' ? 'assistant' : 'user',
    content: m.text
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage }
  ];

  const payload = {
    model: 'gpt-4o',
    messages,
    max_tokens: 2000,
    temperature: 0.7
  };

  // ── 1. Chave OpenAI salva diretamente no dispositivo (Configurações) ──────
  const localKey = localStorage.getItem('agro_openai_key') || '';
  if (localKey && localKey.startsWith('sk-')) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localKey
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || 'Sem resposta.';
        return { ok: true, text };
      }
      const errData = await resp.json().catch(() => ({}));
      // Chave inválida ou expirada → avisar e tentar Edge Function
      if (resp.status === 401) {
        console.warn('[Copilot] Chave OpenAI inválida/expirada. Verifique em Configurações.');
        return { ok: false, msg: 'Chave OpenAI inválida ou expirada. Acesse Configurações → IA e salve uma chave válida (começa com sk-).' };
      }
      throw new Error(errData.error?.message || `HTTP ${resp.status}`);
    } catch (e) {
      console.warn('[Copilot] Erro ao chamar OpenAI diretamente:', e.message);
      // Se for erro de rede, cair no fallback local
      if (e.name === 'TypeError' || e.message.includes('fetch')) {
        return _localFallbackAI(userMessage);
      }
      return { ok: false, msg: 'Erro ao chamar OpenAI: ' + e.message };
    }
  }

  // ── 2. Edge Function do Supabase (quando sem chave local) ─────────────────
  try {
    const session = (typeof AuthService !== 'undefined') ? await AuthService.getSession() : null;
    if (session?.access_token && typeof SUPABASE_URL !== 'undefined') {
      const resp = await fetch(SUPABASE_URL + '/functions/v1/openai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token,
          'apikey': typeof SUPABASE_ANON !== 'undefined' ? SUPABASE_ANON : ''
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || 'Sem resposta.';
        return { ok: true, text };
      }
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${resp.status}`);
    }
  } catch (e) {
    console.warn('[Copilot] Edge Function falhou:', e.message);
  }

  // ── 3. Fallback local (sem nenhuma API) ───────────────────────────────────
  return _localFallbackAI(userMessage);
}

// ============================================================================
// FALLBACK LOCAL — RESPOSTAS BASEADAS EM REGRAS (SEM API EXTERNA)
// ============================================================================

function _localFallbackAI(pergunta) {
  const db  = getDB();
  const q   = pergunta.toLowerCase();
  const safraId = getSafraId ? getSafraId() : db.session?.safraId;
  const onlyCurrent = arr => (arr || []).filter(r => !safraId || r.safraId === safraId || !r.safraId);

  const talhoes    = onlyCurrent(db.talhoes);
  const aplicacoes = onlyCurrent(db.aplicacoes);
  const estoque    = onlyCurrent(db.estoque);
  const clima      = onlyCurrent(db.clima).sort((a,b) => b.data?.localeCompare(a.data)).slice(0,7);
  const colheitas  = onlyCurrent(db.colheitas);
  const manutencoes= onlyCurrent(db.manutencoes);
  const params     = db.parametros || {};

  let resp = '';

  // ─── Custo / financeiro ────────────────────────────
  if (q.includes('custo') || q.includes('gasto') || q.includes('financeiro') || q.includes('lucro') || q.includes('receita')) {
    let custoTotal = 0;
    const linhas = talhoes.map(t => {
      const area = Number(t.areaHa || 0);
      const apls = aplicacoes.filter(a => a.talhaoId === t.id);
      const custo = apls.reduce((acc, a) =>
        acc + (a.produtos||[]).reduce((s,p) => s + Number(p.quantidade||0)*Number(p.precoPorUnidade||0)*area,0), 0);
      custoTotal += custo;
      return `• **${t.nome}** (${t.cultura||'N/I'}, ${area}ha): R$${custo.toFixed(2)}`;
    });
    resp = `## 💰 Análise de Custos\n\n${linhas.join('\n') || '• Nenhum talhão cadastrado'}\n\n**Total safra: R$${custoTotal.toFixed(2)}**\n\n`;
    if (colheitas.length > 0) {
      resp += `### Colheitas registradas:\n${colheitas.map(c => `• Talhão ${c.talhaoId}: ${c.producaoTotal} ${c.unidade}`).join('\n')}`;
    }
  }

  // ─── Clima / ferrugem ─────────────────────────────
  else if (q.includes('clima') || q.includes('chuva') || q.includes('ferrugem') || q.includes('doença') || q.includes('doenca') || q.includes('fungo')) {
    if (clima.length === 0) {
      resp = `📭 Nenhum dado climático registrado. Cadastre as coordenadas da fazenda e importe o clima na página **Clima/Chuva** para receber análises de risco.`;
    } else {
      const umidades = clima.map(c => Number(c.umidade||0));
      const chuvas   = clima.map(c => Number(c.chuvaMm||0));
      const umidMedia = umidades.reduce((a,b)=>a+b,0)/umidades.length;
      const chuvaTotal= chuvas.reduce((a,b)=>a+b,0);
      const riscoFerr = umidMedia > 70 ? '🔴 ALTO' : umidMedia > 55 ? '🟡 MÉDIO' : '🟢 BAIXO';

      resp = `## 🌦 Análise Climática (últimos ${clima.length} dias)\n\n`;
      resp += clima.map(c => `• **${c.data}**: 🌧 ${c.chuvaMm}mm | 🌡 ${c.tempMin}-${c.tempMax}°C | 💧 ${c.umidade}%`).join('\n');
      resp += `\n\n**Chuva total: ${chuvaTotal.toFixed(1)}mm | Umidade média: ${umidMedia.toFixed(1)}%**\n\n`;
      resp += `### 🍄 Risco de Ferrugem Asiática: ${riscoFerr}\n`;
      if (umidMedia > 70) {
        resp += `\n⚠️ **ALERTA**: Umidade acima de 70% — condições favoráveis para ferrugem. Avalie aplicação preventiva de fungicida (Fox, Elatus, Opera).`;
      }
    }
  }

  // ─── Estoque ──────────────────────────────────────
  else if (q.includes('estoque') || q.includes('insumo') || q.includes('produto')) {
    if (estoque.length === 0) {
      resp = `📭 Nenhum estoque cadastrado. Acesse **Produtos & Estoque** para registrar seus insumos.`;
    } else {
      const produtos = db.produtos || [];
      resp = `## 📦 Estoque de Insumos\n\n`;
      resp += estoque.map(e => {
        const p = produtos.find(x => x.id === e.produtoId);
        const nome = p?.nome || e.produtoNome || 'Produto';
        const qtd  = Number(e.qtd || 0);
        const min  = Number(e.qtdMinima || 0);
        const status = (min > 0 && qtd <= min) ? '⚠️ BAIXO' : '✅';
        return `• ${status} **${nome}**: ${qtd} ${e.unidade || 'un'} ${min>0 ? `(mín: ${min})` : ''}`;
      }).join('\n');
    }
  }

  // ─── Manutenção ───────────────────────────────────
  else if (q.includes('manutenção') || q.includes('manutencao') || q.includes('máquina') || q.includes('maquina')) {
    const pendentes = manutencoes.filter(m => m.status === 'pendente' || m.status === 'atrasado');
    if (pendentes.length > 0) {
      resp = `## 🔧 Manutenções Pendentes\n\n`;
      resp += pendentes.map(m => `• ⚠️ **${m.tipo || m.descricao}** — Máquina: ${m.maquinaId || 'N/I'} — Prevista: ${m.dataManutencao || 'N/I'}`).join('\n');
    } else {
      resp = `✅ Nenhuma manutenção pendente no momento.`;
    }
  }

  // ─── Aplicações / defensivos ──────────────────────
  else if (q.includes('aplicaç') || q.includes('aplicacao') || q.includes('defensivo') || q.includes('fungicida') || q.includes('inseticida') || q.includes('herbicida')) {
    resp = `## 🧪 Últimas Aplicações\n\n`;
    const ultimas = aplicacoes.slice(-10).reverse();
    if (ultimas.length === 0) {
      resp += `Nenhuma aplicação registrada nesta safra.`;
    } else {
      resp += ultimas.map(a => {
        const t = talhoes.find(t2 => t2.id === a.talhaoId);
        return `• **${a.data}** — Talhão: ${t?.nome||'N/I'} — ${a.operacao||'Aplicação'} — Produtos: ${(a.produtos||[]).map(p=>p.produtoNome).join(', ')||'N/I'} — Alvo: ${a.alvo||'N/I'}`;
      }).join('\n');
    }
  }

  // ─── Recomendação geral ───────────────────────────
  else if (q.includes('recomendar') || q.includes('recomendação') || q.includes('o que fazer') || q.includes('próximo passo') || q.includes('proximo passo')) {
    resp = `## 🌱 Recomendações Gerais\n\n`;
    const pendMan = manutencoes.filter(m => m.status === 'pendente').length;
    const estBaixo = estoque.filter(e => Number(e.qtd||0) <= Number(e.qtdMinima||0) && Number(e.qtdMinima||0) > 0);
    if (pendMan > 0) resp += `🔧 Há **${pendMan} manutenção(ões) pendente(s)** — verifique em Máquinas.\n`;
    if (estBaixo.length > 0) resp += `📦 Estoque baixo para: **${estBaixo.map(e=>e.produtoNome||'Produto').join(', ')}**.\n`;
    if (clima.length > 0) {
      const umidMedia = clima.reduce((a,c)=>a+Number(c.umidade||0),0)/clima.length;
      if (umidMedia > 70) resp += `⚠️ Umidade média alta (${umidMedia.toFixed(0)}%) — risco de ferrugem asiática.\n`;
    }
    if (talhoes.length === 0) resp += `🌱 Cadastre seus talhões em **Minha Propriedade** para análises detalhadas.\n`;
    if (!resp.includes('•') && !resp.includes('🔧') && !resp.includes('📦')) {
      resp += `✅ Tudo parece estar em ordem! Para análises detalhadas por talhão, pergunte sobre um talhão específico ou sobre custos, clima ou estoque.`;
    }
  }

  // ─── Talhão específico ────────────────────────────
  else if (talhoes.some(t => q.includes(t.nome?.toLowerCase()))) {
    const t = talhoes.find(t2 => q.includes(t2.nome?.toLowerCase()));
    const apls = aplicacoes.filter(a => a.talhaoId === t.id);
    const col  = colheitas.find(c => c.talhaoId === t.id);
    resp = `## 🌱 Talhão: ${t.nome}\n\nCultura: **${t.cultura||'N/I'}** | Área: **${t.areaHa}ha** | Solo: ${t.solo||'N/I'}\n\n`;
    resp += `**${apls.length} aplicações** nesta safra.\n`;
    if (col) resp += `**Colheita**: ${col.producaoTotal} ${col.unidade} em ${col.dataColheita}\n`;
  }

  // ─── Fallback genérico ────────────────────────────
  else {
    resp = `Olá! Sou o **Agro-Copilot** 🤖\n\nPosso ajudar com:\n• 💰 Análise de custos e receita por talhão\n• 🌦 Risco climático e ferrugem\n• 📦 Situação do estoque de insumos\n• 🔧 Manutenções pendentes\n• 🧪 Histórico de aplicações\n• 🌱 Recomendações de manejo\n\nTry: *"Qual o custo do talhão X?"*, *"Tem risco de ferrugem?"*, *"Como está meu estoque?"*\n\n${talhoes.length === 0 ? '⚠️ Cadastre safra, fazenda e talhões para análises completas.' : `Você tem **${talhoes.length} talhão(ões)** cadastrado(s).`}`;
  }

  return { ok: true, text: resp, local: true };
}

// ============================================================================
// PARSER DE ALERTAS WHATSAPP NA RESPOSTA DA IA
// ============================================================================

function _parseWhatsAppAlert(text) {
  try {
    const match = text.match(/\{[\s\S]*"whatsapp_alert"\s*:\s*true[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (obj.whatsapp_alert && obj.mensagem) return obj.mensagem;
    }
  } catch (_) {}
  return null;
}

function _stripJsonBlock(text) {
  return text.replace(/\{[\s\S]*"whatsapp_alert"\s*:\s*true[\s\S]*\}/g, '').trim();
}

// ============================================================================
// ENVIO DE ALERTA VIA WHATSAPP
// ============================================================================

function _sendWhatsAppAlert(mensagem) {
  // Pega o número do WhatsApp do usuário (configurado nas configs ou fallback de suporte)
  const db = getDB();
  const profile = (() => { try { return JSON.parse(localStorage.getItem('agro_session') || '{}'); } catch(_) { return {}; } })();
  const telefone = profile?.user?.phone || db?.meta?.whatsappAlertas || '';

  // Formatar número (remover não-dígitos)
  const numLimpo = telefone.replace(/\D/g, '');
  const num = numLimpo.startsWith('55') ? numLimpo : (numLimpo.length >= 10 ? '55' + numLimpo : '5599991360547');

  const msgCodificada = encodeURIComponent(`🤖 *Agro-Copilot — Alerta Automático*\n\n${mensagem}\n\n_Enviado pelo Agro Pro em ${new Date().toLocaleDateString('pt-BR')}_`);
  const url = `https://wa.me/${num}?text=${msgCodificada}`;

  // Abrir WhatsApp em nova aba
  window.open(url, '_blank');
  toast('📱 WhatsApp', 'Abrindo WhatsApp com o alerta...', 4000);
}

// ============================================================================
// GERAÇÃO DE ALERTAS AUTOMÁTICOS PROATIVOS
// ============================================================================

function _gerarAlertasAutomaticos() {
  const db = getDB();
  const safraId = getSafraId ? getSafraId() : db.session?.safraId;
  const onlyCurrent = arr => (arr || []).filter(r => !safraId || r.safraId === safraId || !r.safraId);

  const alertas = [];

  // Estoque baixo
  const estoque  = onlyCurrent(db.estoque);
  const produtos = db.produtos || [];
  estoque.forEach(e => {
    if (Number(e.qtdMinima||0) > 0 && Number(e.qtd||0) <= Number(e.qtdMinima||0)) {
      const p = produtos.find(x => x.id === e.produtoId);
      alertas.push(`📦 *Estoque baixo*: ${p?.nome || e.produtoNome || 'Produto'} com ${e.qtd} ${e.unidade} (mínimo: ${e.qtdMinima}).`);
    }
  });

  // Manutenções pendentes
  const manutencoes = onlyCurrent(db.manutencoes);
  const pendentes   = manutencoes.filter(m => m.status === 'pendente' || m.status === 'atrasado');
  if (pendentes.length > 0) {
    alertas.push(`🔧 *Manutenções pendentes*: ${pendentes.length} serviço(s) aguardando — ${pendentes.slice(0,3).map(m=>m.tipo||m.descricao).join(', ')}.`);
  }

  // Risco climático
  const clima = onlyCurrent(db.clima).sort((a,b) => b.data?.localeCompare(a.data)).slice(0, 5);
  if (clima.length >= 3) {
    const umidMedia = clima.reduce((s,c)=>s+Number(c.umidade||0),0)/clima.length;
    const chuvaTotal = clima.reduce((s,c)=>s+Number(c.chuvaMm||0),0);
    if (umidMedia > 75 && chuvaTotal > 30) {
      alertas.push(`🌦 *Alerta Climático*: Umidade média ${umidMedia.toFixed(0)}% e ${chuvaTotal.toFixed(1)}mm nos últimos ${clima.length} dias — risco ALTO de Ferrugem Asiática. Avalie aplicação de fungicida.`);
    }
  }

  // Aplicações com produto errado (fungicida para praga ou inseticida para doença)
  const aplicacoes = onlyCurrent(db.aplicacoes);
  const fungicidas  = (typeof defensivosDBExpandida !== 'undefined') ? defensivosDBExpandida.fungicidas.map(f=>f.nome.toLowerCase()) : [];
  const pragasAlvo  = ['lagarta','percevejo','mosca-branca','ácaro','tripes','pulgão','acaro'];
  const doencasAlvo = ['ferrugem','mancha-alvo','antracnose','oídio','oidio','cercospora'];
  aplicacoes.slice(-20).forEach(a => {
    (a.produtos||[]).forEach(p => {
      const nomeProd = (p.produtoNome||'').toLowerCase();
      const alvo     = (a.alvo||'').toLowerCase();
      const ehFungi  = fungicidas.includes(nomeProd);
      const alvoPraga= pragasAlvo.some(x=>alvo.includes(x));
      const alvoDoenca = doencasAlvo.some(x=>alvo.includes(x));
      if (ehFungi && alvoPraga) {
        alertas.push(`❌ *Aplicação incorreta*: Fungicida "${p.produtoNome}" foi aplicado para "${a.alvo}" — fungicidas não controlam pragas!`);
      }
    });
  });

  return alertas;
}

// ============================================================================
// RENDERIZAÇÃO DO CHAT UI
// ============================================================================

function _renderMessage(msg) {
  const isBot  = msg.role === 'bot';
  const avatar = isBot ? '🤖' : '👨‍🌾';
  const cls    = isBot ? 'msg bot' : 'msg user';

  // Converter markdown simples para HTML
  let html = msg.text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^## (.*)/gm, '<h3 style="margin:8px 0 4px;font-size:15px;color:var(--brand,#2e7d32)">$1</h3>')
    .replace(/^### (.*)/gm, '<h4 style="margin:6px 0 3px;font-size:13px;">$1</h4>')
    .replace(/^• (.*)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');

  // Envolver listas
  html = html.replace(/(<li>.*?<\/li>(<br>)?)+/gs, m => `<ul style="margin:4px 0 4px 16px;padding:0;">${m.replace(/<br>/g,'')}</ul>`);

  const time = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  return `
    <div class="${cls}" style="display:flex; gap:10px; align-items:flex-start; max-width:90%;">
      <div style="font-size:24px; flex-shrink:0; line-height:1;">${avatar}</div>
      <div style="flex:1;">
        <div style="background:${isBot ? 'var(--card-bg,white)' : 'var(--brand,#2e7d32)'}; color:${isBot ? 'var(--text,#334155)' : 'white'}; border-radius:${isBot ? '4px 12px 12px 12px' : '12px 4px 12px 12px'}; padding:12px 16px; border:${isBot ? '1px solid var(--border,#e2e8f0)' : 'none'}; font-size:14px; line-height:1.6;">
          ${html}
        </div>
        <div style="font-size:10px; color:var(--text-muted,#94a3b8); margin-top:3px; text-align:${isBot ? 'left' : 'right'};">${time}</div>
      </div>
    </div>`;
}

function _scrollToBottom() {
  const box = document.getElementById('copilotMessages');
  if (box) box.scrollTop = box.scrollHeight;
}

function _addMessage(role, text) {
  const msg = { role, text, ts: Date.now() };
  _copilotMessages.push(msg);
  const box = document.getElementById('copilotMessages');
  if (box) {
    box.insertAdjacentHTML('beforeend', _renderMessage(msg));
    _scrollToBottom();
  }
  return msg;
}

function _setTyping(on) {
  _copilotTyping = on;
  const btn = document.getElementById('copilotSendBtn');
  const inp = document.getElementById('copilotInput');
  if (btn) { btn.disabled = on; btn.textContent = on ? '⌛' : '➤'; }
  if (inp) inp.disabled = on;

  const existing = document.getElementById('copilotTyping');
  if (on && !existing) {
    const box = document.getElementById('copilotMessages');
    if (box) {
      box.insertAdjacentHTML('beforeend', `
        <div id="copilotTyping" style="display:flex; gap:10px; align-items:center; padding:8px 0;">
          <span style="font-size:24px;">🤖</span>
          <div style="background:var(--card-bg,white); border:1px solid var(--border,#e2e8f0); border-radius:4px 12px 12px 12px; padding:12px 16px; font-size:13px; color:var(--text-muted,#94a3b8);">
            <span class="copilot-dot">●</span><span class="copilot-dot">●</span><span class="copilot-dot">●</span>
            <style>
              .copilot-dot { animation: copilotBlink 1.2s infinite; display:inline-block; margin:0 1px; }
              .copilot-dot:nth-child(2) { animation-delay:.3s; }
              .copilot-dot:nth-child(3) { animation-delay:.6s; }
              @keyframes copilotBlink { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
            </style>
          </div>
        </div>`);
      _scrollToBottom();
    }
  } else if (!on && existing) {
    existing.remove();
  }
}

async function _sendMessage() {
  if (_copilotTyping) return;

  const inp = document.getElementById('copilotInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  inp.value = '';
  _addMessage('user', text);
  _setTyping(true);

  try {
    const result = await _callAI(text);

    _setTyping(false);

    if (!result.ok) {
      _addMessage('bot', `❌ Erro ao consultar a IA: ${result.msg || 'Tente novamente.'}\n\n_Modo offline ativo — respostas baseadas em regras locais._`);
      return;
    }

    let responseText = result.text;

    // Verificar se a IA pediu para enviar alerta via WhatsApp
    const waAlert = _parseWhatsAppAlert(responseText);
    responseText   = _stripJsonBlock(responseText);

    _addMessage('bot', responseText);

    // Exibir botão de WhatsApp se houver alerta
    if (waAlert) {
      const box = document.getElementById('copilotMessages');
      if (box) {
        box.insertAdjacentHTML('beforeend', `
          <div style="text-align:center; margin:8px 0;">
            <button onclick="_sendWhatsAppAlert(${JSON.stringify(waAlert).replace(/"/g,'&quot;')})"
              style="background:#25d366; color:white; border:none; border-radius:8px; padding:8px 20px; font-size:13px; cursor:pointer; font-weight:600;">
              📱 Enviar este alerta no WhatsApp
            </button>
          </div>`);
        _scrollToBottom();
      }
    }

    // Se local (sem API), mostrar aviso
    if (result.local) {
      const box = document.getElementById('copilotMessages');
      if (box) {
        box.insertAdjacentHTML('beforeend', `<div style="text-align:center; font-size:11px; color:var(--text-muted,#94a3b8); padding:4px;">📴 Modo offline — resposta baseada em regras locais</div>`);
      }
    }

  } catch (err) {
    _setTyping(false);
    _addMessage('bot', `❌ Erro inesperado: ${err.message}`);
  }
}

// ============================================================================
// PÁGINA PRINCIPAL DO COPILOT
// ============================================================================

function pageCopilot() {
  const db = getDB();
  const plano = planoAtual || localStorage.getItem('agro_plano') || 'Free';

  // Bloquear para plano Free
  if (plano === 'Free') {
    document.getElementById('content').innerHTML = `
      <div class="card" style="text-align:center; padding:50px 30px;">
        <div style="font-size:60px; margin-bottom:16px;">🔒</div>
        <h2 style="margin:0 0 10px;">Agro-Copilot (IA)</h2>
        <p style="color:var(--text-muted,#64748b); max-width:480px; margin:0 auto 24px; line-height:1.6;">
          O <b>Agro-Copilot</b> está disponível nos planos <b>Pro</b> e <b>Master</b>.
          Faça upgrade para conversar com seus dados, receber alertas automáticos e sugestões de manejo personalizadas.
        </p>
        <a href="https://wa.me/5599991360547?text=Olá!%20Quero%20assinar%20o%20Agro%20Pro%20(Plano%20Pro%20R%24199%2Fmês)"
           target="_blank"
           style="display:inline-block; background:#25d366; color:white; padding:12px 28px; border-radius:10px; font-weight:700; text-decoration:none; font-size:15px;">
          💬 Assinar Pro — R$199/mês
        </a>
      </div>`;
    return;
  }

  // Gerar alertas automáticos proativos
  const alertasAuto = _gerarAlertasAutomaticos();

  // Resetar histórico para nova sessão
  _copilotMessages = [];

  // Saudação inicial
  const safraId  = getSafraId ? getSafraId() : db.session?.safraId;
  const safra    = db.safras?.find(s => s.id === safraId);
  const talhoes  = (db.talhoes || []).filter(t => !safraId || t.safraId === safraId);
  const hora     = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const session  = (() => { try { return JSON.parse(localStorage.getItem('agro_session') || '{}'); } catch(_) { return {}; } })();
  const nome     = session?.user?.nome?.split(' ')[0] || 'Produtor';

  document.getElementById('content').innerHTML = `
    <div class="section" style="max-width:860px; margin:0 auto;">

      <!-- Header -->
      <div class="card" style="background:linear-gradient(135deg,#1e3a5f,#2d6a4f); color:white; padding:24px 28px; margin-bottom:0; border-radius:12px 12px 0 0; border:none;">
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <div style="width:52px; height:52px; background:rgba(255,255,255,.15); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0;">🤖</div>
          <div style="flex:1; min-width:200px;">
            <h2 style="margin:0 0 2px; font-size:20px; font-weight:800;">Agro-Copilot</h2>
            <p style="margin:0; opacity:.8; font-size:13px;">Assistente de IA com seus dados completos da safra ${safra ? `"${safra.nome}"` : 'atual'}</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <span style="background:rgba(255,255,255,.2); padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600;">${plano.toUpperCase()}</span>
            <span style="background:${hasKey ? 'rgba(37,211,102,.3)' : 'rgba(245,158,11,.4)'}; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600;">${hasKey ? '● GPT-4o Ativo' : '⚠ Sem Chave OpenAI'}</span>
          </div>
        </div>
      </div>

      <!-- Alertas Automáticos -->
      ${alertasAuto.length > 0 ? `
      <div style="background:#fffbeb; border:1px solid #f59e0b; border-top:none; padding:14px 20px;">
        <div style="font-size:13px; font-weight:700; color:#92400e; margin-bottom:8px;">⚡ Alertas Automáticos Detectados:</div>
        ${alertasAuto.map(a => `<div style="font-size:13px; color:#78350f; margin-bottom:4px;">${a}</div>`).join('')}
        <button onclick="_sendWhatsAppAlerts()" style="margin-top:10px; background:#25d366; color:white; border:none; border-radius:7px; padding:7px 16px; font-size:12px; font-weight:700; cursor:pointer;">
          📱 Enviar todos os alertas via WhatsApp
        </button>
      </div>` : ''}

      <!-- Sugestões Rápidas -->
      <div style="background:var(--card-bg,white); border:1px solid var(--border,#e2e8f0); border-top:none; padding:12px 16px; display:flex; gap:8px; flex-wrap:wrap;">
        <span style="font-size:12px; color:var(--text-muted,#64748b); align-self:center;">Perguntar sobre:</span>
        ${['💰 Custos','🌦 Clima','📦 Estoque','🔧 Manutenção','🌱 Talhões','📊 Financeiro','🧪 Aplicações','⚠️ Alertas'].map(s =>
          `<button onclick="document.getElementById('copilotInput').value='${s.replace(/['"]/g,'')}'; _sendMessage();"
            style="background:var(--bg,#f8fafc); border:1px solid var(--border,#e2e8f0); border-radius:20px; padding:5px 12px; font-size:12px; cursor:pointer; transition:all .2s;"
            onmouseover="this.style.background='var(--brand,#2e7d32)'; this.style.color='white';"
            onmouseout="this.style.background='var(--bg,#f8fafc)'; this.style.color='';"
          >${s}</button>`
        ).join('')}
      </div>

      <!-- Chat Messages -->
      <div id="copilotMessages" style="height:420px; overflow-y:auto; padding:20px; background:var(--bg,#f8fafc); border:1px solid var(--border,#e2e8f0); border-top:none; display:flex; flex-direction:column; gap:14px; scroll-behavior:smooth;">
        <!-- Mensagem de boas-vindas inicial -->
      </div>

      <!-- Input -->
      <div style="background:var(--card-bg,white); border:1px solid var(--border,#e2e8f0); border-top:none; border-radius:0 0 12px 12px; padding:14px 16px; display:flex; gap:10px; align-items:center;">
        <input id="copilotInput" type="text" placeholder="Pergunte sobre custos, clima, estoque, manejo..." 
          style="flex:1; border:1px solid var(--border,#e2e8f0); border-radius:8px; padding:10px 14px; font-size:14px; background:var(--bg,#f8fafc); color:var(--text,#334155); outline:none;"
          onkeydown="if(event.key==='Enter')_sendMessage();" />
        <button id="copilotSendBtn" onclick="_sendMessage()"
          style="background:var(--brand,#2e7d32); color:white; border:none; border-radius:8px; padding:10px 18px; font-size:18px; cursor:pointer; font-weight:700; transition:background .2s;"
          onmouseover="this.style.background='var(--brand-dark,#1b5e20)';"
          onmouseout="this.style.background='var(--brand,#2e7d32)';">➤</button>
        <button onclick="_clearCopilotChat()" title="Limpar conversa"
          style="background:transparent; border:1px solid var(--border,#e2e8f0); color:var(--text-muted,#64748b); border-radius:8px; padding:10px 14px; font-size:14px; cursor:pointer;">🗑</button>
      </div>

      <!-- Rodapé informativo -->
      <div style="text-align:center; font-size:11px; color:var(--text-muted,#94a3b8); margin-top:10px; line-height:1.6;">
        O Agro-Copilot usa seus dados reais e IA para sugestões agronômicas.
        Sempre consulte um agrônomo habilitado antes de aplicar defensivos.<br>
        <b>WhatsApp de suporte:</b> (99) 99136-0547
      </div>
    </div>`;

  const localKey = localStorage.getItem('agro_openai_key') || '';
  const hasKey   = localKey.startsWith('sk-');
  const keyStatus = hasKey
    ? `• 🔑 Chave OpenAI configurada — GPT-4o ativo`
    : `• ⚠️ Sem chave OpenAI — [configurar agora](configuracoes.html) para IA completa`;

  // Mensagem de boas-vindas automática
  const welcomeText = `${saudacao}, **${nome}**! 👋\n\nSou o **Agro-Copilot**, seu assistente agronômico com acesso a todos os dados da sua propriedade.\n\n**Resumo rápido:**\n• 🌾 ${safra ? `Safra ativa: ${safra.nome}` : 'Nenhuma safra selecionada'}\n• 🌱 ${talhoes.length} talhão(ões) cadastrado(s)\n• 📅 Data: ${new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}\n• 🔒 Plano: ${plano}\n${keyStatus}\n${alertasAuto.length > 0 ? `• ⚡ **${alertasAuto.length} alerta(s) automático(s) detectado(s)**` : '• ✅ Nenhum alerta pendente'}\n\nO que você gostaria de saber hoje?`;

  _addMessage('bot', welcomeText);

  // Se não tiver chave, mostrar dica inline
  if (!hasKey) {
    const box = document.getElementById('copilotMessages');
    if (box) {
      box.insertAdjacentHTML('beforeend', `
        <div style="background:#fffbeb; border:1px solid #f59e0b; border-radius:10px; padding:14px 16px; font-size:13px; color:#78350f; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <span style="font-size:22px;">🔑</span>
          <div style="flex:1;">
            <strong>Ative a IA completa em 30 segundos:</strong><br>
            Vá em <strong>Configurações → IA</strong>, cole sua chave OpenAI (<code>sk-proj-...</code>) e toque em <strong>Salvar Chave</strong>. Grátis pelo site: <a href="https://platform.openai.com/api-keys" target="_blank" style="color:#92400e;">platform.openai.com/api-keys</a>
          </div>
          <a href="configuracoes.html" style="background:#f59e0b; color:white; padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700; text-decoration:none; white-space:nowrap;">⚙️ Configurar agora</a>
        </div>`);
      _scrollToBottom();
    }
  }

  // Foco no input
  setTimeout(() => { const inp = document.getElementById('copilotInput'); if (inp) inp.focus(); }, 100);
}

// ============================================================================
// FUNÇÕES AUXILIARES GLOBAIS
// ============================================================================

function _clearCopilotChat() {
  _copilotMessages = [];
  const box = document.getElementById('copilotMessages');
  if (box) {
    box.innerHTML = '';
    _addMessage('bot', 'Conversa reiniciada. Como posso ajudar?');
  }
}

function _sendWhatsAppAlerts() {
  const alertas = _gerarAlertasAutomaticos();
  if (alertas.length === 0) {
    toast('Sem alertas', 'Nenhum alerta automático no momento.', 3000);
    return;
  }
  const mensagem = `🌾 *Agro Pro — Alertas da sua Propriedade*\n\n${alertas.join('\n\n')}\n\n📅 ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`;
  _sendWhatsAppAlert(mensagem);
}

// Atalho para análise rápida de um talhão específico via IA
async function analisarTalhaoIA(talhaoId) {
  if (typeof pageCopilot === 'undefined') return;
  // Navegar para copilot e enviar a pergunta automaticamente
  navigate('copilot');
  setTimeout(async () => {
    const db  = getDB();
    const t   = (db.talhoes || []).find(x => x.id === talhaoId);
    if (!t) return;
    const inp = document.getElementById('copilotInput');
    if (inp) {
      inp.value = `Faça uma análise completa do talhão "${t.nome}" — custos, clima, aplicações, risco de pragas e doenças, e recomendações para os próximos 14 dias.`;
      _sendMessage();
    }
  }, 800);
}
