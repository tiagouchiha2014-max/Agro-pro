/* ============================================================
   AGRO PRO — Pagamento v9.0
   Métodos automáticos: Pix, Cartão de Crédito/Débito
   ============================================================ */

function pagePagamento() {
  renderShell('pagamento', '💳 Pagamento & Assinatura', 'Gerencie seu plano e métodos de pagamento');

  const content = document.getElementById('content');
  const plano = planoAtual;
  const isPaid = (plano === 'Pro' || plano === 'Master');

  const plans = [
    {
      key: 'Free',
      label: 'Free',
      price: 0,
      priceLabel: 'R$ 0',
      period: '/mês',
      color: '#64748b',
      bg: 'var(--neutral-bg)',
      border: 'var(--border)',
      badge: '',
      features: [
        '1 fazenda e 1 talhão',
        'Apenas visualização',
        'Sem máquinas ou estoque',
        'Sem relatórios ou IA',
        'Suporte por e-mail',
      ],
      disabled: true,
      btnLabel: plano === 'Free' ? 'Plano atual' : 'Fazer downgrade',
      btnStyle: 'background:var(--neutral-bg); color:var(--neutral); border:1px solid var(--border); cursor:not-allowed;',
    },
    {
      key: 'Pro',
      label: 'Pro',
      price: 199,
      priceLabel: 'R$ 199',
      period: '/mês',
      color: '#16a34a',
      bg: 'var(--success-bg)',
      border: '#16a34a',
      badge: '⭐ Mais popular',
      features: [
        '5 fazendas, talhões ilimitados',
        'Máquinas e equipe (até 15)',
        'Aplicações, estoque, combustível',
        'Colheitas, clima, manutenções',
        'Relatórios completos',
        'IA Prescritiva (Copilot)',
      ],
      disabled: plano === 'Pro',
      btnLabel: plano === 'Pro' ? 'Plano atual ✓' : 'Assinar Pro',
      btnStyle: plano === 'Pro'
        ? 'background:var(--success-bg); color:var(--success); border:1px solid var(--success); cursor:default;'
        : 'background:#16a34a; color:#fff; border:none; cursor:pointer;',
    },
    {
      key: 'Master',
      label: 'Master',
      price: 299,
      priceLabel: 'R$ 299',
      period: '/mês',
      color: '#d97706',
      bg: 'var(--accent-subtle)',
      border: '#d97706',
      badge: '👑 Ilimitado',
      features: [
        'Fazendas ilimitadas',
        'Equipe e admins ilimitados',
        'Tudo do Pro incluso',
        'Suporte prioritário 24h',
        'Sem nenhum limite',
        'Multiusuários ilimitados',
      ],
      disabled: plano === 'Master',
      btnLabel: plano === 'Master' ? 'Plano atual ✓' : 'Assinar Master',
      btnStyle: plano === 'Master'
        ? 'background:var(--accent-subtle); color:var(--warning); border:1px solid var(--warning); cursor:default;'
        : 'background:#d97706; color:#fff; border:none; cursor:pointer;',
    },
  ];

  const plansHtml = plans.map(p => `
    <div class="card" style="
      border: 2px solid ${p.key === plano ? p.border : 'var(--border)'};
      ${p.key === plano ? `box-shadow: 0 0 0 3px ${p.color}22;` : ''}
      background: ${p.key === plano ? p.bg : 'var(--surface)'};
      position: relative;
      transition: transform var(--t-base), box-shadow var(--t-base);
    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
      ${p.badge ? `<div style="position:absolute; top:-11px; left:50%; transform:translateX(-50%); background:${p.color}; color:#fff; padding:2px 14px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; letter-spacing:.5px;">${p.badge}</div>` : ''}
      <h3 style="color:${p.color}; font-size:13px; font-weight:800; letter-spacing:.5px; border:none; padding:0; margin-bottom:8px;">${p.label}</h3>
      <div style="font-size:30px; font-weight:800; color:var(--text); letter-spacing:-1px; line-height:1;">
        ${p.priceLabel}<small style="font-size:13px; font-weight:400; color:var(--text-muted);">${p.period}</small>
      </div>
      <ul style="margin:16px 0 20px; padding-left:18px; font-size:13px; color:var(--text-secondary); line-height:2; list-style:none; padding:0;">
        ${p.features.map(f => `<li style="padding:3px 0; display:flex; gap:8px; align-items:flex-start;"><span style="color:${p.color}; flex-shrink:0; margin-top:1px;">✓</span> ${escapeHtml(f)}</li>`).join('')}
      </ul>
      <button
        class="btn"
        style="width:100%; padding:11px; font-size:13.5px; font-weight:700; border-radius:var(--radius-sm); ${p.btnStyle}"
        onclick="handlePlanBtn('${p.key}', ${p.price})"
        ${p.disabled ? 'disabled' : ''}
      >${p.btnLabel}</button>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="section">

      <!-- Plano atual banner -->
      <div class="card" style="
        background: linear-gradient(135deg, var(--sidebar-bg) 0%, #243824 100%);
        color: #fff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        padding: var(--space-6) var(--space-8);
      ">
        <div>
          <div style="font-size:13px; opacity:.65; font-weight:500; letter-spacing:.5px; text-transform:uppercase; margin-bottom:6px;">Plano Atual</div>
          <div style="font-size:28px; font-weight:800; letter-spacing:-0.5px;">
            ${plano} ${plano === 'Pro' ? '⭐' : plano === 'Master' ? '👑' : ''}
          </div>
          <div style="font-size:13px; opacity:.65; margin-top:4px;">
            ${plano === 'Free' ? 'Acesso gratuito limitado — faça upgrade para usar tudo' : 'Assinatura ativa — obrigado por assinar o Agro Pro!'}
          </div>
        </div>
        ${!isPaid ? `
        <button class="btn primary" style="font-size:15px; padding:12px 28px;" onclick="handlePlanBtn('Pro', 199)">
          ⬆ Fazer Upgrade
        </button>` : `
        <div style="background:rgba(255,255,255,0.08); border-radius:var(--radius-sm); padding:12px 20px; text-align:center;">
          <div style="font-size:11px; opacity:.6; text-transform:uppercase; letter-spacing:.5px;">Próxima cobrança</div>
          <div style="font-size:16px; font-weight:700; margin-top:4px;">Contate o suporte</div>
        </div>`}
      </div>

      <!-- Grid de planos -->
      <div>
        <h3 class="card" style="padding: var(--space-4) var(--space-6); font-size:16px; font-weight:700; margin-bottom:0; border-bottom: none;">Comparar Planos</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:20px; margin-top:20px;">
          ${plansHtml}
        </div>
      </div>

      <!-- Métodos de pagamento -->
      <div class="card" id="paymentMethods">
        <h3>💳 Métodos de Pagamento</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:24px;">

          <!-- Pix -->
          <div id="payPix" class="pay-method card" style="cursor:pointer; border:2px solid var(--border); padding: var(--space-5); transition: border-color var(--t-base), transform var(--t-base);"
            onclick="selectPayMethod('pix')"
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform=''">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
              <div style="font-size:28px;">⚡</div>
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text);">Pix</div>
                <div style="font-size:12px; color:var(--text-muted);">Aprovação instantânea • Sem taxas</div>
              </div>
            </div>
            <div class="tag tag-success">Recomendado</div>
          </div>

          <!-- Cartão de Crédito -->
          <div id="payCard" class="pay-method card" style="cursor:pointer; border:2px solid var(--border); padding: var(--space-5); transition: border-color var(--t-base), transform var(--t-base);"
            onclick="selectPayMethod('card')"
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform=''">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
              <div style="font-size:28px;">💳</div>
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text);">Cartão de Crédito</div>
                <div style="font-size:12px; color:var(--text-muted);">Visa, Master, Elo • Parcele em até 12x</div>
              </div>
            </div>
            <div class="tag tag-info">Recorrente automático</div>
          </div>

          <!-- Boleto -->
          <div id="payBoleto" class="pay-method card" style="cursor:pointer; border:2px solid var(--border); padding: var(--space-5); transition: border-color var(--t-base), transform var(--t-base);"
            onclick="selectPayMethod('boleto')"
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform=''">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
              <div style="font-size:28px;">📄</div>
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text);">Boleto Bancário</div>
                <div style="font-size:12px; color:var(--text-muted);">Vencimento em 3 dias úteis</div>
              </div>
            </div>
            <div class="tag tag-neutral">Mensal manual</div>
          </div>
        </div>

        <!-- Formulário dinâmico de pagamento -->
        <div id="payForm" style="display:none; margin-top:8px; animation: fadeUp 0.25s ease both;"></div>
      </div>

      <!-- FAQ / Suporte -->
      <div class="card">
        <h3>🤝 Suporte & Dúvidas</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
          <a href="https://wa.me/5599991360547?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20Agro%20Pro" target="_blank" class="btn" style="display:flex; align-items:center; gap:10px; text-decoration:none; padding:14px 20px; justify-content:flex-start;">
            <span style="font-size:20px;">💬</span>
            <div style="text-align:left;">
              <div style="font-weight:700; font-size:13.5px;">WhatsApp</div>
              <div style="font-size:11.5px; color:var(--text-muted);">(99) 99136-0547 — Tiago Santos</div>
            </div>
          </a>
          <a href="mailto:suporteagropro@gmail.com?subject=Dúvida%20sobre%20plano" class="btn" style="display:flex; align-items:center; gap:10px; text-decoration:none; padding:14px 20px; justify-content:flex-start;">
            <span style="font-size:20px;">📧</span>
            <div style="text-align:left;">
              <div style="font-weight:700; font-size:13.5px;">E-mail</div>
              <div style="font-size:11.5px; color:var(--text-muted);">suporteagropro@gmail.com</div>
            </div>
          </a>
        </div>
        <p style="margin-top:16px; font-size:12.5px; color:var(--text-muted); line-height:1.6;">
          Para cancelar ou alterar seu plano, entre em contato pelo WhatsApp ou e-mail. 
          Reembolso garantido em até 7 dias corridos após a contratação.
        </p>
      </div>

    </div>
  `;
}

/* ────────────── helpers de pagamento ────────────── */

function selectPayMethod(method) {
  // Highlight selected card
  ['pix','card','boleto'].forEach(m => {
    const el = document.getElementById(`pay${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (el) el.style.borderColor = m === method ? 'var(--brand)' : 'var(--border)';
  });

  const form = document.getElementById('payForm');
  if (!form) return;
  form.style.display = 'block';

  const selectedPlan = window._selectedPlan || 'Pro';
  const price = selectedPlan === 'Master' ? 299 : 199;

  if (method === 'pix') {
    form.innerHTML = `
      <div class="card" style="background:var(--success-bg); border:1.5px solid var(--success); text-align:center; padding:var(--space-8);">
        <div style="font-size:14px; font-weight:700; color:var(--success); margin-bottom:16px;">Pagamento via Pix — Plano ${escapeHtml(selectedPlan)} (R$ ${price}/mês)</div>
        <div style="background:var(--surface); border-radius:var(--radius); padding:var(--space-6); display:inline-block; margin-bottom:16px; box-shadow:var(--shadow-md);">
          <div style="font-size:80px; line-height:1;">📲</div>
          <div style="font-size:13px; color:var(--text-muted); margin-top:8px;">QR Code será gerado pelo WhatsApp</div>
        </div>
        <p style="font-size:13.5px; color:var(--text-secondary); max-width:380px; margin:0 auto 20px; line-height:1.6;">
          Clique em <strong>Pagar via WhatsApp</strong> para receber a chave Pix e o QR Code diretamente com o suporte.
        </p>
        <a href="https://wa.me/5599991360547?text=Olá!%20Quero%20pagar%20via%20Pix%20o%20plano%20${encodeURIComponent(selectedPlan)}%20(R%24${price}%2Fmês)." target="_blank" class="btn primary" style="font-size:14px; padding:12px 28px;">
          ⚡ Pagar via Pix no WhatsApp
        </a>
      </div>
    `;
  } else if (method === 'card') {
    form.innerHTML = `
      <div class="card" style="max-width:480px;">
        <div style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:20px;">
          💳 Cartão de Crédito — Plano ${escapeHtml(selectedPlan)} (R$ ${price}/mês)
        </div>
        <div style="display:grid; gap:14px;">
          <div class="form-group">
            <small>Número do Cartão</small>
            <input class="input" id="cardNumber" placeholder="0000 0000 0000 0000" maxlength="19" oninput="fmtCard(this)" autocomplete="cc-number">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <small>Validade</small>
              <input class="input" id="cardExpiry" placeholder="MM/AA" maxlength="5" oninput="fmtExpiry(this)" autocomplete="cc-exp">
            </div>
            <div class="form-group">
              <small>CVV</small>
              <input class="input" id="cardCvv" placeholder="123" maxlength="4" autocomplete="cc-csc" type="password">
            </div>
          </div>
          <div class="form-group">
            <small>Nome no Cartão</small>
            <input class="input" id="cardName" placeholder="NOME COMPLETO" style="text-transform:uppercase;" autocomplete="cc-name">
          </div>
          <div class="form-group">
            <small>CPF do Titular</small>
            <input class="input" id="cardCpf" placeholder="000.000.000-00" maxlength="14" oninput="this.value=formatCPF(this.value)">
          </div>
          <div style="background:var(--info-bg); border-radius:var(--radius-sm); padding:12px 14px; font-size:12.5px; color:var(--info); display:flex; gap:8px; align-items:flex-start;">
            <span>🔒</span>
            <span>Seus dados são criptografados com SSL. A cobrança automática mensal será ativada após confirmação.</span>
          </div>
          <button class="btn primary" style="width:100%; padding:13px; font-size:14px;" onclick="submitCardPayment()">
            💳 Confirmar Assinatura Recorrente
          </button>
        </div>
      </div>
    `;
  } else if (method === 'boleto') {
    form.innerHTML = `
      <div class="card" style="background:var(--neutral-bg); border:1.5px solid var(--border); max-width:440px;">
        <div style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:12px;">
          📄 Boleto Bancário — Plano ${escapeHtml(selectedPlan)} (R$ ${price}/mês)
        </div>
        <p style="font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:16px;">
          O boleto tem vencimento em <strong>3 dias úteis</strong>. Após o pagamento, a confirmação ocorre em até 2 dias úteis.
          A renovação é manual — enviaremos um novo boleto por e-mail mensalmente.
        </p>
        <div class="form-group" style="margin-bottom:14px;">
          <small>E-mail para receber o boleto</small>
          <input class="input" id="boletoEmail" type="email" placeholder="seuemail@email.com" value="${escapeHtml(localStorage.getItem('agro_email') || '')}">
        </div>
        <button class="btn primary" style="width:100%; padding:12px;" onclick="submitBoleto()">
          📄 Gerar Boleto via WhatsApp
        </button>
      </div>
    `;
  }
}

function handlePlanBtn(planKey, price) {
  if (planKey === 'Free') return;
  window._selectedPlan = planKey;
  // Scroll to payment methods
  const el = document.getElementById('paymentMethods');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Plano selecionado', `Escolha o método de pagamento para o plano ${planKey} (R$ ${price}/mês).`);
}

function submitCardPayment() {
  const num   = (document.getElementById('cardNumber')?.value || '').replace(/\s/g, '');
  const exp   = document.getElementById('cardExpiry')?.value || '';
  const cvv   = document.getElementById('cardCvv')?.value || '';
  const name  = document.getElementById('cardName')?.value || '';
  const cpf   = (document.getElementById('cardCpf')?.value || '').replace(/\D/g, '');

  if (num.length < 13 || !exp || cvv.length < 3 || !name || cpf.length !== 11) {
    toast('Dados incompletos', 'Preencha todos os campos corretamente.');
    return;
  }
  // In production, integrate with payment gateway (e.g., MercadoPago, Stripe)
  // Here we forward to WhatsApp with masked card info
  const maskedNum = '**** **** **** ' + num.slice(-4);
  const plan = window._selectedPlan || 'Pro';
  const price = plan === 'Master' ? 299 : 199;
  const msg = `Olá! Quero assinar o Agro Pro (Plano ${plan} - R$ ${price}/mês) via cartão de crédito.\nTitular: ${name}\nCartão final: ${maskedNum}\nCPF: ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`;
  window.open(`https://wa.me/5599991360547?text=${encodeURIComponent(msg)}`, '_blank');
  toast('Solicitação enviada!', 'Você será redirecionado para o WhatsApp para finalizar a assinatura.');
}

function submitBoleto() {
  const email = document.getElementById('boletoEmail')?.value || '';
  if (!email.includes('@')) {
    toast('E-mail inválido', 'Informe um e-mail válido para receber o boleto.');
    return;
  }
  const plan = window._selectedPlan || 'Pro';
  const price = plan === 'Master' ? 299 : 199;
  const msg = `Olá! Quero assinar o Agro Pro (Plano ${plan} - R$ ${price}/mês) via boleto bancário.\nE-mail: ${email}`;
  window.open(`https://wa.me/5599991360547?text=${encodeURIComponent(msg)}`, '_blank');
  toast('Boleto solicitado!', 'Você será redirecionado para o WhatsApp para finalizar.');
}

function fmtCard(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function fmtExpiry(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
  input.value = v;
}
