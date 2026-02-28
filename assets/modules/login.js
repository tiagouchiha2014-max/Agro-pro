// ============================================================
// HELPERS DE FORMATAÇÃO DE CPF E TELEFONE
// ============================================================
function formatCPF(v) {
  return v.replace(/\D/g, '').slice(0,11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function formatPhone(v) {
  return v.replace(/\D/g, '').slice(0,11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2');
}
function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== +cpf[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === +cpf[10];
}

// ============================================================
// PÁGINA DE LOGIN / CADASTRO v8.0
// ============================================================
function pageLogin() {
  const root = document.getElementById("app");
  root.innerHTML = `
    <div style="min-height:100vh; background:linear-gradient(135deg,#0f172a,#1e293b); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:440px; width:100%; background:white; border-radius:18px; padding:36px 32px; box-shadow:0 24px 64px rgba(0,0,0,.35);">

        <div style="text-align:center; margin-bottom:26px;">
          <div style="width:52px; height:52px; background:linear-gradient(135deg,#4ade80,#10b981); border-radius:14px; margin:0 auto 14px; display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 4px 14px rgba(16,185,129,.35);">🌱</div>
          <h1 style="color:#1e293b; margin:0 0 4px; font-size:26px; font-weight:800;">Agro Pro</h1>
          <p style="color:#64748b; font-size:13px; margin:0;">Gestão Agrícola Inteligente</p>
        </div>

        <!-- TABS -->
        <div style="display:flex; background:#f1f5f9; border-radius:10px; padding:4px; margin-bottom:24px; gap:4px;">
          <button id="tabLogin" onclick="window._loginTab('login')" style="flex:1; padding:9px; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; background:#10b981; color:white; transition:all .2s;">Entrar</button>
          <button id="tabCadastro" onclick="window._loginTab('cadastro')" style="flex:1; padding:9px; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; background:transparent; color:#64748b; transition:all .2s;">Criar Conta</button>
        </div>

        <!-- FORM LOGIN -->
        <div id="loginForm">
          <div style="margin-bottom:16px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">E-mail</label>
            <input type="email" id="loginEmail" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:15px; box-sizing:border-box; outline:none;" placeholder="seu@email.com">
          </div>
          <div style="margin-bottom:22px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">Senha</label>
            <input type="password" id="loginPass" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:15px; box-sizing:border-box; outline:none;" placeholder="••••••••">
          </div>
          <button id="btnEntrar" style="width:100%; padding:14px; background:#10b981; color:white; border:none; border-radius:9px; font-weight:800; font-size:16px; cursor:pointer; letter-spacing:.3px;">ENTRAR</button>
          <p style="text-align:center; margin-top:16px; font-size:13px; color:#94a3b8;">Não tem conta? <a href="#" onclick="window._loginTab('cadastro')" style="color:#10b981; font-weight:700;">Criar conta grátis</a></p>
        </div>

        <!-- FORM CADASTRO -->
        <div id="signupForm" style="display:none;">
          <div style="background:#fef9c3; border:1px solid #fde047; border-radius:9px; padding:11px 14px; margin-bottom:18px; font-size:12px; color:#713f12; line-height:1.5;">
            ⚠️ <b>Conta gratuita = Plano Free</b><br>
            Apenas 1 fazenda, 1 talhão e <b>somente visualização</b>. Para criar e editar dados, assine Pro (R$199) ou Master (R$299).
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">Nome Completo <span style="color:#ef4444;">*</span></label>
            <input type="text" id="signName" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; box-sizing:border-box; outline:none;" placeholder="Seu nome completo">
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">CPF <span style="color:#ef4444;">*</span></label>
            <input type="text" id="signCPF" maxlength="14" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; box-sizing:border-box; outline:none;" placeholder="000.000.000-00">
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">Telefone / WhatsApp <span style="color:#ef4444;">*</span></label>
            <input type="tel" id="signPhone" maxlength="16" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; box-sizing:border-box; outline:none;" placeholder="(99) 99999-9999">
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">E-mail <span style="color:#ef4444;">*</span></label>
            <input type="email" id="signEmail" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; box-sizing:border-box; outline:none;" placeholder="seu@email.com">
          </div>
          <div style="margin-bottom:20px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:#374151;">Senha <span style="color:#ef4444;">*</span> <small style="color:#94a3b8; font-weight:400;">(mín. 8 chars, letras+números)</small></label>
            <input type="password" id="signPass" style="width:100%; padding:11px 13px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; box-sizing:border-box; outline:none;" placeholder="Mínimo 8 caracteres">
          </div>
          <button id="btnCadastrar" style="width:100%; padding:14px; background:#10b981; color:white; border:none; border-radius:9px; font-weight:800; font-size:15px; cursor:pointer;">CRIAR CONTA (PLANO FREE)</button>
          <p style="text-align:center; margin-top:14px; font-size:12px; color:#94a3b8;">Já tem conta? <a href="#" onclick="window._loginTab('login')" style="color:#10b981; font-weight:700;">Fazer login</a></p>
        </div>

        <p style="text-align:center; margin-top:22px; font-size:11px; color:#cbd5e1;">Tiago Santos — Fundador & Desenvolvedor · Agro Pro v8.0</p>
      </div>
    </div>
  `;

  // Formatar CPF e telefone em tempo real
  document.getElementById('signCPF').addEventListener('input', function() {
    this.value = formatCPF(this.value);
  });
  document.getElementById('signPhone').addEventListener('input', function() {
    this.value = formatPhone(this.value);
  });

  // Alternador de tabs
  window._loginTab = (tab) => {
    const isLogin = tab === 'login';
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
    const tL = document.getElementById('tabLogin');
    const tC = document.getElementById('tabCadastro');
    tL.style.background = isLogin ? '#10b981' : 'transparent';
    tL.style.color = isLogin ? 'white' : '#64748b';
    tC.style.background = isLogin ? 'transparent' : '#10b981';
    tC.style.color = isLogin ? '#64748b' : 'white';
  };

  // ===== LOGIN =====
  document.getElementById("btnEntrar").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const pass  = document.getElementById("loginPass").value;
    if (!email || !pass) return toast("Erro", "Preencha e-mail e senha.");

    toast("Aguarde", "Conectando ao servidor...");

    // Garantir que Supabase está pronto (com retry automático de até 4.5s)
    const ready = typeof _ensureSupabase === 'function' ? await _ensureSupabase() : (typeof isSupabaseReady === 'function' && isSupabaseReady());
    if (!ready) {
      return toast("Erro de conexão", "Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.");
    }

    try {
      const { data, error } = await AuthService.signIn(email, pass);
      if (error) {
        const msg = error.message || '';
        // Tratar erro específico de e-mail não confirmado
        if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
          return toast("E-mail não confirmado", "Verifique sua caixa de entrada e confirme o e-mail antes de entrar. Verifique também o spam.");
        }
        if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
          return toast("Erro", "E-mail ou senha incorretos.");
        }
        return toast("Erro", "Não foi possível entrar: " + msg);
      }

      if (!data?.user) {
        return toast("Erro", "Resposta inválida do servidor. Tente novamente.");
      }

      toast("Aguarde", "Carregando seu perfil...");

      // Buscar perfil com retry (trigger pode levar 1-2s para criar)
      let profile = null;
      for (let i = 0; i < 3; i++) {
        profile = await AuthService.getUserProfile();
        if (profile) break;
        await new Promise(r => setTimeout(r, 800));
      }

      const userName = profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0];
      const role = profile?.user_role || 'admin';

      localStorage.setItem("agro_session", JSON.stringify({
        user: { id: data.user.id, email: data.user.email, nome: userName, role }
      }));
      localStorage.setItem("agro_role", role);

      // Sincronizar plano do banco — mapeia legados para Free
      const planMap = { free: 'Free', trial: 'Free', basico: 'Free', pro: 'Pro', master: 'Master' };
      const planKey = profile?.plan_type?.toLowerCase() || 'free';
      localStorage.setItem("agro_plano", planMap[planKey] || 'Free');
      localStorage.removeItem("agro_trial");

      toast("Sincronizando", "Carregando dados da nuvem...");
      try {
        const restored = await cloudRestore();
        if (!restored && typeof cloudSyncImmediate === 'function') await cloudSyncImmediate();
      } catch (e) { console.warn('Login restore:', e.message); }

      toast("Bem-vindo!", `Olá, ${userName}!`);
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      console.error("Erro no login:", err);
      toast("Erro", "Falha no login: " + (err.message || "tente novamente."));
    }
  };

  // ===== CADASTRO =====
  document.getElementById("btnCadastrar").onclick = async () => {
    const nome  = document.getElementById("signName").value.trim();
    const cpf   = document.getElementById("signCPF").value.trim();
    const phone = document.getElementById("signPhone").value.trim();
    const email = document.getElementById("signEmail").value.trim();
    const pass  = document.getElementById("signPass").value;

    // Validações locais (sem precisar de servidor)
    if (!nome || !cpf || !phone || !email || !pass)
      return toast("Erro", "Preencha todos os campos obrigatórios (*).");
    if (!validateCPF(cpf))
      return toast("Erro", "CPF inválido. Verifique o número digitado.");
    if (phone.replace(/\D/g,'').length < 10)
      return toast("Erro", "Telefone inválido. Informe DDD + número (ex: (99) 99999-9999).");
    if (pass.length < 8)
      return toast("Erro", "A senha deve ter no mínimo 8 caracteres.");
    if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass))
      return toast("Erro", "A senha deve conter letras e números.");

    toast("Aguarde", "Conectando ao servidor...");

    // Garantir que Supabase está pronto (com retry automático de até 4s)
    const ready = typeof _ensureSupabase === 'function' ? await _ensureSupabase() : (typeof isSupabaseReady === 'function' && isSupabaseReady());
    if (!ready) {
      return toast("Erro de conexão", "Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.");
    }

    toast("Aguarde", "Verificando dados e criando conta...");

    try {
      // Verificar CPF duplicado
      const cpfExists = await AuthService.checkCpfExists(cpf.replace(/\D/g,''));
      if (cpfExists) return toast("Erro", "Este CPF já está cadastrado. Faça login ou recupere o acesso.");

      // Verificar telefone duplicado
      const phoneExists = await AuthService.checkPhoneExists(phone.replace(/\D/g,''));
      if (phoneExists) return toast("Erro", "Este telefone já está cadastrado. Faça login ou use outro número.");

      toast("Aguarde", "Criando sua conta...");

      const { data: signUpData, error: signUpError } = await AuthService.signUp(
        email, pass, nome,
        cpf.replace(/\D/g,''),
        phone.replace(/\D/g,'')
      );
      if (signUpError) {
        if (signUpError.message.includes("already registered") || signUpError.message.includes("already been registered"))
          return toast("Erro", "Este e-mail já possui conta. Faça login.");
        return toast("Erro", "Falha ao criar conta: " + signUpError.message);
      }

      // ─── Supabase pode exigir confirmação de e-mail ───────────────────────
      // Se não voltou sessão (email_confirm ON), fazemos signIn imediato
      // pois o usuário acabou de digitar as credenciais corretas.
      // ──────────────────────────────────────────────────────────────────────
      toast("Aguarde", "Finalizando acesso...");

      let userId = signUpData?.user?.id;
      let sessionOk = !!(signUpData?.session);

      if (!sessionOk) {
        // Tenta login imediato para obter sessão
        const { data: loginData, error: loginError } = await AuthService.signIn(email, pass);
        if (!loginError && loginData?.session) {
          sessionOk = true;
          userId = loginData.user?.id || userId;
        }
        // Se ainda falhar (email_confirm bloqueando), salva contexto mínimo e avisa
        if (!sessionOk) {
          toast("Conta criada!", "Verifique seu e-mail para confirmar o cadastro antes de entrar.", 8000);
          return;
        }
      }

      // ─── Sessão ativa: salvar dados locais e entrar ───────────────────────
      iniciarTrial(email, nome); // define Plano Free no localStorage
      localStorage.setItem("agro_session", JSON.stringify({
        user: { id: userId, email, nome, role: 'admin' }
      }));
      localStorage.setItem("agro_role", "admin");

      // Aguardar trigger SQL criar o perfil (max 2s)
      await new Promise(r => setTimeout(r, 1200));

      try {
        if (typeof cloudSyncImmediate === 'function') await cloudSyncImmediate();
      } catch (e) { console.warn('Signup sync:', e.message); }

      toast("Conta criada!", `Bem-vindo ao Agro Pro, ${nome}! Você está no Plano Free.`);
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      console.error("Erro no cadastro:", err);
      toast("Erro", "Não foi possível criar a conta: " + (err.message || "tente novamente."));
    }
  };
}

