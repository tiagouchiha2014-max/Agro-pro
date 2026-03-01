function pageAjuda() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      .ah-hero { background: linear-gradient(135deg, var(--sidebar-bg) 0%, #1e3a5f 50%, #064e3b 100%); border-radius: var(--radius); padding: 36px 28px; color: white; margin-bottom: 22px; position: relative; overflow: hidden; }
      .ah-hero::after { content: '🌱'; position: absolute; right: 24px; top: 50%; transform: translateY(-50%); font-size: 80px; opacity: .12; }
      .ah-hero .ah-badge { display: inline-block; background: var(--brand); color: white; padding: 3px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; text-transform: uppercase; }
      .ah-hero h1 { margin: 0 0 6px; font-size: 24px; font-weight: 800; }
      .ah-hero p { margin: 0; color: rgba(255,255,255,.6); font-size: 14px; }
      .ah-sec { font-size: 17px; font-weight: 700; color: var(--text); margin: 26px 0 14px; padding-bottom: 8px; border-bottom: 2px solid var(--border); }
      .ah-card { background: var(--surface); border-radius: var(--radius); padding: 20px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); margin-bottom: 14px; }
      .ah-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 14px; margin-bottom: 14px; }
      .ah-grid .ah-card h4 { margin: 0 0 10px; font-size: 14px; color: var(--text); }
      .ah-grid .ah-card ul { margin: 0; padding-left: 18px; }
      .ah-grid .ah-card li { font-size: 13px; color: var(--text-secondary); line-height: 1.75; }
      .ah-steps { list-style: none; padding: 0; margin: 0; counter-reset: stp; }
      .ah-steps li { counter-increment: stp; display: flex; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--border); }
      .ah-steps li:last-child { border-bottom: none; }
      .ah-steps li::before { content: counter(stp); min-width: 28px; height: 28px; background: var(--brand); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
      .ah-steps li .ah-step-body b { display: block; font-size: 13px; color: var(--text); margin-bottom: 3px; }
      .ah-steps li .ah-step-body span { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
      .faq-item { border-bottom: 1px solid var(--border); }
      .faq-item:last-child { border-bottom: none; }
      .faq-q { font-weight: 600; font-size: 14px; color: var(--text); cursor: pointer; padding: 14px 0; display: flex; justify-content: space-between; align-items: center; user-select: none; }
      .faq-q:hover { color: var(--brand); }
      .faq-arrow { font-size: 11px; color: var(--text-muted); transition: transform .25s; flex-shrink: 0; margin-left: 10px; }
      .faq-item.open .faq-arrow { transform: rotate(180deg); }
      .faq-a { font-size: 13px; color: var(--text-secondary); line-height: 1.75; padding: 0 0 14px; display: none; }
      .faq-item.open .faq-a { display: block; }
      .ah-contact { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 22px; }
      .ah-contact a { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 18px 14px; text-align: center; text-decoration: none; color: inherit; transition: all .2s; display: block; }
      .ah-contact a:hover { border-color: var(--brand); box-shadow: var(--shadow-md); transform: translateY(-2px); }
      .ah-contact .ah-icon { font-size: 26px; margin-bottom: 8px; }
      .ah-contact h4 { margin: 0 0 4px; font-size: 13px; color: var(--text); font-weight: 700; }
      .ah-contact p { margin: 0; font-size: 12px; color: var(--text-muted); }
      .ah-contact .ah-tag { font-size: 11px; font-weight: 600; margin-top: 4px; }
      .ah-legal { background: var(--accent-subtle); border: 1px solid var(--warning); border-left: 4px solid var(--warning); border-radius: var(--radius); padding: 16px 20px; }
      .ah-legal h4 { margin: 0 0 10px; color: var(--warning); font-size: 14px; }
      .ah-legal li, .ah-legal p { font-size: 12px; color: var(--text-secondary); line-height: 1.75; margin: 0; }
      .ah-legal ul { margin: 8px 0 0; padding-left: 18px; }
      .ah-footer { text-align: center; padding: 28px 0 6px; color: var(--text-muted); font-size: 12px; }
    </style>

    <!-- HERO -->
    <div class="ah-hero">
      <div class="ah-badge">Central de Ajuda</div>
      <h1>📖 Agro Pro — Suporte &amp; Documentação</h1>
      <p>Tudo que você precisa para dominar a gestão agrícola mais completa do Brasil.</p>
    </div>

    <!-- PRIMEIROS PASSOS -->
    <div class="ah-sec">🚀 Primeiros Passos — Configure em 5 minutos</div>
    <div class="ah-card" style="margin-bottom:22px;">
      <ol class="ah-steps">
        <li><div class="ah-step-body"><b>Criar Safra</b><span>Acesse <strong>Minha Propriedade</strong> → aba Safras e crie a safra atual (ex: Safra 2025/26).</span></div></li>
        <li><div class="ah-step-body"><b>Cadastrar Fazenda</b><span>Em <strong>Minha Propriedade</strong> → aba Fazendas, informe nome, cidade, estado, área e coordenadas (lat/lon).</span></div></li>
        <li><div class="ah-step-body"><b>Adicionar Talhões</b><span>Em <strong>Minha Propriedade</strong> → aba Talhões, cadastre cada talhão com área (ha) e cultura.</span></div></li>
        <li><div class="ah-step-body"><b>Registrar Máquinas</b><span>Em Máquinas, use os modelos pré-carregados (tratores, colheitadeiras, pulverizadores etc.) para cadastrar rapidamente.</span></div></li>
        <li><div class="ah-step-body"><b>Cadastrar Produtos no Estoque</b><span>Em <strong>Produtos & Estoque</strong>, registre defensivos, sementes e fertilizantes. O estoque é baixado automaticamente nas aplicações.</span></div></li>
        <li><div class="ah-step-body"><b>Lançar Aplicações</b><span>Em Aplicações, registre cada operação de campo. Custo por hectare calculado automaticamente, com baixa de estoque.</span></div></li>
        <li><div class="ah-step-body"><b>Registrar Colheita</b><span>Em Colheitas, informe produção por talhão, umidade e frete. O sistema calcula custo/saca e margem automaticamente.</span></div></li>
      </ol>
    </div>

    <!-- GUIA POR MÓDULO -->
    <div class="ah-sec">📌 Guia por Módulo</div>
    <div class="ah-grid">
      <div class="ah-card">
        <h4>🏡 Dashboard</h4>
        <ul>
          <li>KPIs em tempo real da safra atual</li>
          <li>Alertas automáticos de pragas e clima</li>
          <li>Próximas aplicações e lembretes</li>
          <li>Gráfico de custos acumulados</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>🌿 Aplicações</h4>
        <ul>
          <li>Registre defensivos, fertilizantes e insumos</li>
          <li>Custo total e por hectare automático</li>
          <li>Baixa automática no estoque de produtos</li>
          <li>IA valida compatibilidade de produtos</li>
          <li>Export CSV para laudos técnicos</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>🌾 Colheitas &amp; Fretes</h4>
        <ul>
          <li>Produção por talhão em kg ou sacas</li>
          <li>Até 2 destinos de frete por colheita</li>
          <li>Custo/tonelada e frete/ton automático</li>
          <li>KPIs: produção total, receita, frete</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>⛽ Combustível</h4>
        <ul>
          <li>Estoque de diesel por depósito</li>
          <li>Entradas com nota fiscal e fornecedor</li>
          <li>Baixa por talhão, máquina e operador</li>
          <li>Preço médio ponderado automático</li>
          <li>Gráfico mensal de consumo</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>🔧 Manutenções</h4>
        <ul>
          <li>Preventiva, corretiva e preditiva</li>
          <li>Alerta automático por horímetro e data</li>
          <li>Lista de peças com custo detalhado</li>
          <li>Próximas manutenções nos 30 dias</li>
          <li>Custo de manutenção por hectare</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>📊 Relatórios</h4>
        <ul>
          <li>Custo total, por hectare e por talhão</li>
          <li>Receita estimada vs real por cultura</li>
          <li>Comparativo com safras anteriores reais</li>
          <li>Gráficos mensais: chuva, custo, diesel</li>
          <li>Export para PDF (imprimir) e CSV</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>🤖 IA Prescritiva</h4>
        <ul>
          <li>Validação de compatibilidade de produtos</li>
          <li>Recomendação de dose por cultura e estágio</li>
          <li>Análise de custo com insights por talhão</li>
          <li>Alertas de pragas por clima e histórico</li>
          <li style="color:#3b82f6;font-style:italic;">Disponível nos planos Pro e Master</li>
        </ul>
      </div>
      <div class="ah-card">
        <h4>☁️ Sincronização</h4>
        <ul>
          <li>Dados salvos automaticamente na nuvem</li>
          <li>Acesso em qualquer dispositivo após login</li>
          <li>Backup JSON manual em Configurações</li>
          <li>Modo offline: edita local, sincroniza depois</li>
          <li>Indicador de status ☁️ / 📴 no topo</li>
        </ul>
      </div>
    </div>

    <!-- FAQ -->
    <div class="ah-sec">❓ Perguntas Frequentes</div>
    <div class="ah-card" style="margin-bottom:22px;" id="faqContainer">
      <div class="faq-item">
        <div class="faq-q">Por que meus talhões não aparecem? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">Verifique se a safra atual está selecionada (menu superior ou Configurações). Talhões e fazendas são vinculados por safra. Se acabou de criar a conta, acesse Configurações → Sincronizar Agora para baixar dados da nuvem.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Como funciona o cálculo de custo por hectare? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">O sistema soma todos os custos (aplicações, combustível, insumos base, manutenção rateada e frete) e divide pela área total dos talhões da safra. O detalhamento completo por talhão está disponível nos Relatórios.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Posso usar offline? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">Sim. O Agro Pro funciona offline usando localStorage do navegador. Todas as edições ficam salvas localmente e são sincronizadas automaticamente com a nuvem assim que a conexão for restabelecida.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Como deletar minha conta corretamente? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">Acesse o Supabase Dashboard → Authentication → Users, localize seu e-mail e clique em "Delete User". Isso remove a conta de autenticação e todos os dados vinculados (ON DELETE CASCADE). Atenção: deletar apenas o registro na tabela "profiles" não é suficiente — o JWT continua ativo até expirar.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">A IA tem acesso a todos meus dados? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">A IA Prescritiva recebe apenas os dados do talhão selecionado para a análise pontual, sem histórico completo. Os dados nunca são armazenados fora do seu banco Supabase e do localStorage do seu dispositivo.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Como fazer backup completo dos dados? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">Acesse Configurações → Backup e Restauração → Exportar Backup. O arquivo .json contém todos os seus dados e pode ser reimportado em qualquer dispositivo.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Os preços de grãos são atualizados automaticamente? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">A busca usa geolocalização da fazenda e tenta consultar a API HG Brasil em tempo real. Se indisponível, usa tabela de referência CEPEA/Esalq atualizada mensalmente. O preço buscado é apenas referência — ajuste os valores em Configurações → Parâmetros de Mercado.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Meus dados ficam seguros no Supabase? <span class="faq-arrow">▼</span></div>
        <div class="faq-a">Sim. Todas as tabelas usam Row Level Security (RLS) com política (SELECT auth.uid()) = user_id, garantindo que cada usuário acesse apenas seus próprios dados. A chave ANON exposta no front-end só permite operações autenticadas — nunca acesso admin.</div>
      </div>
    </div>

    <!-- CONTATO -->
    <div class="ah-sec">📞 Fale Conosco</div>
    <div class="ah-contact">
      <a href="mailto:suporteagropro@gmail.com?subject=Suporte Agro Pro">
        <div class="ah-icon">📧</div>
        <h4>E-mail Suporte</h4>
        <p>suporteagropro@gmail.com</p>
        <p class="ah-tag" style="color:#3b82f6;">Resposta em até 24h úteis</p>
      </a>
      <a href="https://wa.me/5599991360547?text=Ol%C3%A1%21+Preciso+de+suporte+no+Agro+Pro" target="_blank" rel="noopener">
        <div class="ah-icon">💬</div>
        <h4>WhatsApp</h4>
        <p>+55 (99) 99136-0547</p>
        <p class="ah-tag" style="color:#25d366;">Seg–Sex, 8h–18h (BRT)</p>
      </a>
    </div>

    <!-- AVISO LEGAL -->
    <div class="ah-legal">
      <h4>⚖️ Termos de Uso &amp; Avisos Legais</h4>
      <p>O <strong>Agro Pro</strong> é uma plataforma de gestão agrícola para auxílio ao produtor rural. Ao utilizar, você concorda com:</p>
      <ul>
        <li>Recomendações da <strong>IA Prescritiva</strong> são sugestões estatísticas e <strong>não substituem</strong> o diagnóstico de campo nem a orientação de Engenheiro Agrônomo habilitado (CREA/CFTA).</li>
        <li><strong>AVISO OBRIGATÓRIO (Lei 7.802/89):</strong> aplicação de agrotóxicos exige receituário agronômico de profissional habilitado. O Agro Pro não emite receituário.</li>
        <li>Preços de commodities são meramente indicativos (referência CEPEA/Esalq) e não constituem oferta de compra ou venda.</li>
        <li>Dados climáticos fornecidos pela API Open-Meteo podem divergir das condições locais reais.</li>
        <li>O Agro Pro <strong>não se responsabiliza</strong> por perdas ou danos decorrentes de decisões baseadas exclusivamente nos dados da plataforma.</li>
        <li>Dados armazenados no Supabase (terceiro). Consulte: <strong>supabase.com/privacy</strong>.</li>
      </ul>
    </div>

    <div class="ah-footer">
      Agro Pro v9.6 — &copy; ${new Date().getFullYear()} Tiago Santos. Todos os direitos reservados.<br>
      Desenvolvido com ❤️ para o produtor rural brasileiro.
    </div>
  `;

  // FAQ accordion — listener JS separado (sem onclick inline para evitar problemas com aspas/apóstrofos)
  document.getElementById('faqContainer').addEventListener('click', function(e) {
    const q = e.target.closest('.faq-q');
    if (!q) return;
    const item = q.closest('.faq-item');
    if (!item) return;
    const wasOpen = item.classList.contains('open');
    // Fechar todos
    document.querySelectorAll('#faqContainer .faq-item.open').forEach(function(el) {
      el.classList.remove('open');
    });
    // Abrir o clicado (toggle)
    if (!wasOpen) item.classList.add('open');
  });
}


