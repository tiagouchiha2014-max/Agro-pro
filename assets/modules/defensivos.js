// ============================================================================

const defensivosDBExpandida = {
  // ========== 15 FUNGICIDAS ==========
  fungicidas: [
    { nome: "Fox", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.75-1.0 L/ha", estágio: ["V4-V8"], fabricante: "Nufarm", preço: 85.90 },
    { nome: "Opera", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 120.50 },
    { nome: "Viovan", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Corteva", preço: 135.00 },
    { nome: "Elatus", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 110.00 },
    { nome: "Sugoy", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.6-0.8 L/ha", estágio: ["V4-V8"], fabricante: "Ihara", preço: 115.00 },
    { nome: "Mancozebe", tipo: "Fungicida", alvo: "Mancha-alvo", dose: "1.5-2.0 kg/ha", estágio: ["V4-V8"], fabricante: "Vários", preço: 45.00 },
    { nome: "Tessior", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 125.00 },
    { nome: "Priori", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 105.00 },
    { nome: "Sphere Max", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Corteva", preço: 130.00 },
    { nome: "Nativo", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.6-0.8 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 118.00 },
    { nome: "Folicur", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 95.00 },
    { nome: "Embrex", tipo: "Fungicida", alvo: "Mancha-alvo", dose: "1.0-1.5 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 88.00 },
    { nome: "Flint", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.4-0.6 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 140.00 },
    { nome: "Amistar", tipo: "Fungicida", alvo: "Ferrugem Asiática", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 112.00 },
    { nome: "Headline", tipo: "Fungicida", alvo: "Mancha-alvo", dose: "0.5-0.75 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 98.00 }
  ],

  // ========== 15 INSETICIDAS ==========
  inseticidas: [
    { nome: "Engeo Pleno", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.5-1.0 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 145.00 },
    { nome: "Ampligo", tipo: "Inseticida", alvo: "Lagarta-da-soja", dose: "0.4-0.8 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 130.00 },
    { nome: "Orthene", tipo: "Inseticida", alvo: "Percevejos", dose: "0.75-1.5 kg/ha", estágio: ["V6-R2"], fabricante: "UPL", preço: 35.00 },
    { nome: "Lannate", tipo: "Inseticida", alvo: "Lagarta", dose: "0.5-1.0 L/ha", estágio: ["V4-V8"], fabricante: "DuPont", preço: 85.00 },
    { nome: "Decis", tipo: "Inseticida", alvo: "Lagarta", dose: "0.3-0.5 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 65.00 },
    { nome: "Actara", tipo: "Inseticida", alvo: "Mosca-branca", dose: "0.2-0.4 kg/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 120.00 },
    { nome: "Fortenza", tipo: "Inseticida", alvo: "Lagarta-rosca", dose: "0.5-1.0 L/100kg", estágio: ["Tratamento Sementes"], fabricante: "Syngenta", preço: 200.00 },
    { nome: "Cruiser", tipo: "Inseticida", alvo: "Pragas iniciais", dose: "0.5-1.0 L/100kg", estágio: ["Tratamento Sementes"], fabricante: "Syngenta", preço: 180.00 },
    { nome: "Poncho", tipo: "Inseticida", alvo: "Pragas iniciais", dose: "0.5-1.0 L/100kg", estágio: ["Tratamento Sementes"], fabricante: "Bayer", preço: 175.00 },
    { nome: "Karate", tipo: "Inseticida", alvo: "Lagarta", dose: "0.3-0.5 L/ha", estágio: ["V4-V8"], fabricante: "Syngenta", preço: 72.00 },
    { nome: "Fastac", tipo: "Inseticida", alvo: "Lagarta", dose: "0.2-0.4 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 68.00 },
    { nome: "Sumidan", tipo: "Inseticida", alvo: "Percevejos", dose: "0.5-1.0 L/ha", estágio: ["V6-R2"], fabricante: "Sumitomo", preço: 78.00 },
    { nome: "Regent", tipo: "Inseticida", alvo: "Lagarta", dose: "0.2-0.4 L/ha", estágio: ["V4-V8"], fabricante: "BASF", preço: 92.00 },
    { nome: "Confidor", tipo: "Inseticida", alvo: "Pulgão", dose: "0.3-0.5 L/ha", estágio: ["V4-V8"], fabricante: "Bayer", preço: 88.00 },
    { nome: "Imidacloprido", tipo: "Inseticida", alvo: "Mosca-branca", dose: "0.2-0.4 L/ha", estágio: ["V4-V8"], fabricante: "Vários", preço: 55.00 }
  ],

  // ========== VALIDAÇÕES ==========
  validacoes: {
    fungicidaParaPraga: "❌ ERRO: Fungicida não funciona contra pragas (lagartas, percevejos). Use um INSETICIDA.",
    inseticidaParaDoenca: "❌ ERRO: Inseticida não funciona contra doenças fúngicas. Use um FUNGICIDA.",
    doseAlta: "⚠️ AVISO: Dose acima do recomendado. Risco de fitotoxidez.",
    doseBaixa: "⚠️ AVISO: Dose abaixo do recomendado. Risco de ineficácia.",
    ventoForte: "⚠️ AVISO: Vento acima do recomendado. Risco de deriva."
  }
};

// Função de validação
function validarAplicacaoCompleta(aplicacao) {
  const erros = [];
  const avisos = [];
  const sugestoes = [];

  const fungicida = defensivosDBExpandida.fungicidas.find(f => f.nome === aplicacao.produtoNome);
  const inseticida = defensivosDBExpandida.inseticidas.find(i => i.nome === aplicacao.produtoNome);
  const produto = fungicida || inseticida;

  if (!produto) {
    avisos.push("⚠️ Produto não encontrado na base de dados.");
    return { erros, avisos, sugestoes };
  }

  // Validação 1: Fungicida para praga?
  if (fungicida && ["Lagarta", "Lagarta-da-soja", "Percevejo", "Percevejos", "Mosca-branca", "Ácaro", "Tripes", "Pulgão"].includes(aplicacao.alvo)) {
    erros.push(defensivosDBExpandida.validacoes.fungicidaParaPraga);
  }

  // Validação 2: Inseticida para doença?
  if (inseticida && ["Ferrugem", "Ferrugem Asiática", "Mancha-alvo", "Oídio", "Antracnose"].includes(aplicacao.alvo)) {
    erros.push(defensivosDBExpandida.validacoes.inseticidaParaDoenca);
  }

  // Sugestões
  sugestoes.push(`✅ Produto: ${produto.nome}`);
  sugestoes.push(`✅ Fabricante: ${produto.fabricante}`);
  sugestoes.push(`✅ Dose: ${produto.dose}`);
  sugestoes.push(`✅ Melhor estágio: ${produto.estágio.join(", ")}`);

  return { erros, avisos, sugestoes, produto };
}
