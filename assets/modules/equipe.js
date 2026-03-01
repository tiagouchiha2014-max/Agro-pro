function pageEquipe() {
  // Se for funcionário, só mostra a tabela (sem form de cadastro, sem gerenciamento de acessos)
  crudPage({
    entityKey: "equipe",
    subtitle: "Equipe de campo da safra atual.",
    fields: [
      { key: "nome", label: "Nome", type: "text" },
      { key: "funcao", label: "Função", type: "text", placeholder: "Tratorista / Encarregado / Agrônomo..." },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "nr", label: "NR/Certificações", type: "text", placeholder: "NR-31 / Treinamentos..." },
      { key: "obs", label: "Observações", type: "textarea", full: true }
    ],
    columns: [
      { key: "nome", label: "Nome" },
      { key: "funcao", label: "Função" },
      { key: "telefone", label: "Telefone" },
      { key: "nr", label: "NR/Cert." },
      { key: "obs", label: "Obs." }
    ]
  });

  // Seção de Gerenciamento de Acessos — ativa para admins (Supabase Auth)
  if (getUserRole() === 'admin') {
    renderGerenciamentoAcessos();
  }
}

// ============================================================================
// GERENCIAMENTO DE ACESSOS — Supabase Auth + profiles.user_role
// O admin cria contas (signUp) e define a role no profile.
// O novo usuário recebe e-mail de confirmação e já entra com a role correta.
// ============================================================================

async function _carregarContasVinculadas() {
  if (typeof AuthService === 'undefined' || !isSupabaseReady()) return [];
  try {
    const session = await AuthService.getSession();
    if (!session?.user?.id) return [];
    const { data } = await _supabaseClient
      .from('profiles')
      .select('id, full_name, email, user_role, phone, created_at')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false });
    return data || [];
  } catch (_) { return []; }
}

async function _criarContaAcesso(nome, email, role, senha) {
  if (typeof AuthService === 'undefined' || !isSupabaseReady()) {
    toast('Erro', 'Supabase não está conectado. Verifique sua conexão.');
    return false;
  }

  const session = await AuthService.getSession();
  if (!session?.user?.id) {
    toast('Erro', 'Sessão inválida. Faça login novamente.');
    return false;
  }

  // Verificar limite do plano
  const limits = getPlanLimits();
  const contas = await _carregarContasVinculadas();
  if (contas.length >= limits.funcionarios) {
    toast('Limite atingido', `Seu plano ${planoAtual} permite no máximo ${limits.funcionarios} conta(s) de acesso.`);
    return false;
  }

  try {
    // 1. Criar usuário no Supabase Auth
    const { data: signUpData, error: signUpError } = await _supabaseClient.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: {
          full_name: nome,
          user_role: role
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        toast('Erro', 'Este e-mail já está cadastrado no sistema.');
      } else {
        toast('Erro', 'Falha ao criar conta: ' + signUpError.message);
      }
      return false;
    }

    const newUserId = signUpData?.user?.id;
    if (!newUserId) {
      toast('Erro', 'Conta criada mas ID não retornado. O usuário precisa confirmar o e-mail.');
      return true; // parcial — precisa confirmar
    }

    // 2. Atualizar profile com role e owner_id (vincula ao admin)
    // O trigger handle_new_user cria o profile; aqui atualizamos
    // Tentativa com retry porque o trigger pode demorar ms
    for (let i = 0; i < 3; i++) {
      const { error: updError } = await _supabaseClient
        .from('profiles')
        .update({
          user_role: role,
          owner_id: session.user.id,
          full_name: nome
        })
        .eq('id', newUserId);

      if (!updError) break;
      await new Promise(r => setTimeout(r, 500));
    }

    toast('Conta criada', `${nome} pode acessar como ${role === 'gerente' ? 'Gerente' : 'Funcionário'}. Um e-mail de confirmação foi enviado.`);
    return true;

  } catch (e) {
    toast('Erro', 'Exceção ao criar conta: ' + (e.message || e));
    return false;
  }
}

async function _alterarRoleAcesso(userId, novaRole) {
  if (typeof _supabaseClient === 'undefined') return false;
  try {
    const { error } = await _supabaseClient
      .from('profiles')
      .update({ user_role: novaRole })
      .eq('id', userId);
    if (error) { toast('Erro', 'Falha ao alterar perfil.'); return false; }
    toast('Perfil alterado', `Perfil atualizado para ${novaRole === 'gerente' ? 'Gerente' : 'Funcionário'}.`);
    return true;
  } catch (_) { return false; }
}

async function _removerAcesso(userId, nome) {
  if (!confirm(`Remover o acesso de ${nome}? O usuário não poderá mais fazer login.`)) return;
  if (typeof _supabaseClient === 'undefined') return;
  try {
    // Desativar: setar role para 'desativado' (soft-delete, mantém dados)
    await _supabaseClient
      .from('profiles')
      .update({ user_role: 'desativado' })
      .eq('id', userId);
    toast('Acesso removido', `${nome} foi desativado.`);
    pageEquipe(); // recarregar
  } catch (_) {
    toast('Erro', 'Falha ao remover acesso.');
  }
}

async function renderGerenciamentoAcessos() {
  const content = document.getElementById("content");

  // Loading state
  content.insertAdjacentHTML('beforeend', `
    <div id="acessosSection" class="card" style="margin-top:25px; border: 2px solid #3b82f6;">
      <div style="text-align:center; padding:30px; color:#64748b;">
        <div style="font-size:24px; margin-bottom:8px;">⏳</div>
        Carregando contas de acesso...
      </div>
    </div>
  `);

  // Carregar contas vinculadas do Supabase
  const contas = await _carregarContasVinculadas();
  const section = document.getElementById('acessosSection');
  if (!section) return;

  const contasAtivas = contas.filter(c => c.user_role !== 'desativado' && c.user_role !== 'admin');

  section.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
      <div>
        <h3 style="margin:0; color:#3b82f6;">🔐 Gerenciamento de Acessos</h3>
        <p style="color:#64748b; font-size:13px; margin:5px 0 0;">Crie contas para sua equipe acessar o sistema com permissões limitadas.</p>
      </div>
      <span style="background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600;">
        ${contasAtivas.length} / ${getPlanLimits().funcionarios} contas
      </span>
    </div>
    <div class="hr"></div>

    <!-- Resumo de perfis -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin:15px 0;">
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:12px;">
        <div style="font-size:12px; color:#065f46;">
          <b>👔 Gerente</b><br>
          Vê tudo (exceto financeiro) • Pode criar e editar registros • Sem acesso a folha salarial e relatórios financeiros
        </div>
      </div>
      <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:10px; padding:12px;">
        <div style="font-size:12px; color:#92400e;">
          <b>👷 Funcionário</b><br>
          Dashboard simplificado • Registra aplicações, manutenção, combustível • Sem acesso a dados financeiros
        </div>
      </div>
    </div>

    <!-- Formulário de criação -->
    <div style="background:var(--bg-card-alt, #f8fafc); border-radius:10px; padding:18px; margin:15px 0; border:1px solid var(--border, #e2e8f0);">
      <h4 style="margin:0 0 12px;">➕ Criar nova conta de acesso</h4>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div>
          <small style="display:block; margin-bottom:4px; font-weight:600;">Nome completo</small>
          <input class="input" id="teamName" placeholder="Nome do colaborador" />
        </div>
        <div>
          <small style="display:block; margin-bottom:4px; font-weight:600;">E-mail (login)</small>
          <input class="input" id="teamEmail" type="email" placeholder="email@exemplo.com" />
        </div>
        <div>
          <small style="display:block; margin-bottom:4px; font-weight:600;">Perfil de Acesso</small>
          <select class="select" id="teamRole">
            <option value="gerente">👔 Gerente</option>
            <option value="funcionario">👷 Funcionário</option>
          </select>
        </div>
        <div>
          <small style="display:block; margin-bottom:4px; font-weight:600;">Senha (mín. 6 caracteres)</small>
          <input class="input" id="teamPass" type="password" placeholder="Senha inicial" />
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:10px; align-items:center;">
        <button class="btn primary" id="btnCriarAcesso" style="padding:10px 24px;">🔑 Criar Conta</button>
        <span style="font-size:11px; color:#94a3b8;">O colaborador receberá um e-mail de confirmação.</span>
      </div>
    </div>

    <!-- Tabela de contas -->
    <div style="margin-top:15px;">
      <h4>Contas de acesso ativas (${contasAtivas.length})</h4>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:var(--bg-card-alt, #f1f5f9);">
              <th style="text-align:left; padding:10px;">Nome</th>
              <th style="text-align:left; padding:10px;">E-mail</th>
              <th style="text-align:left; padding:10px;">Perfil</th>
              <th style="text-align:left; padding:10px;">Desde</th>
              <th style="text-align:center; padding:10px;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${contasAtivas.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:30px;">Nenhuma conta de acesso criada. Use o formulário acima para convidar sua equipe.</td></tr>' :
              contasAtivas.map(c => {
                const isGerente = c.user_role === 'gerente';
                const badgeStyle = isGerente ? 'background:#dbeafe; color:#1e40af;' : 'background:#fef3c7; color:#92400e;';
                const badgeLabel = isGerente ? '👔 Gerente' : '👷 Funcionário';
                const criado = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-';
                return `
                  <tr style="border-bottom:1px solid var(--border, #e2e8f0);">
                    <td style="padding:10px;"><b>${escapeHtml(c.full_name || '-')}</b></td>
                    <td style="padding:10px; font-size:13px;">${escapeHtml(c.email || '-')}</td>
                    <td style="padding:10px;">
                      <span style="${badgeStyle} padding:3px 10px; border-radius:6px; font-size:12px; font-weight:bold;">${badgeLabel}</span>
                    </td>
                    <td style="padding:10px; color:#64748b; font-size:13px;">${criado}</td>
                    <td style="padding:10px; text-align:center;">
                      <button class="btn" style="padding:4px 10px; font-size:11px; margin-right:4px;" onclick="window.__toggleRole('${c.id}','${c.user_role}')">
                        ${isGerente ? '↓ Funcionário' : '↑ Gerente'}
                      </button>
                      <button class="btn danger" style="padding:4px 10px; font-size:11px;" onclick="window.__delAcesso('${c.id}','${escapeHtml(c.full_name || '')}')">Desativar</button>
                    </td>
                  </tr>
                `;
              }).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Handler: Criar conta
  document.getElementById("btnCriarAcesso")?.addEventListener("click", async () => {
    const nome  = document.getElementById("teamName").value.trim();
    const email = document.getElementById("teamEmail").value.trim();
    const role  = document.getElementById("teamRole").value;
    const pass  = document.getElementById("teamPass").value;

    if (!nome || !email || !pass) { toast("Erro", "Preencha todos os campos."); return; }
    if (pass.length < 6) { toast("Erro", "Senha deve ter no mínimo 6 caracteres."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Erro", "E-mail inválido."); return; }

    const btn = document.getElementById("btnCriarAcesso");
    btn.disabled = true;
    btn.textContent = "Criando...";

    const ok = await _criarContaAcesso(nome, email, role, pass);
    if (ok) {
      pageEquipe(); // recarregar tudo
    } else {
      btn.disabled = false;
      btn.textContent = "🔑 Criar Conta";
    }
  });

  // Handler: Alternar role
  window.__toggleRole = async (userId, currentRole) => {
    const novaRole = currentRole === 'gerente' ? 'funcionario' : 'gerente';
    const ok = await _alterarRoleAcesso(userId, novaRole);
    if (ok) pageEquipe();
  };

  // Handler: Remover acesso
  window.__delAcesso = (userId, nome) => _removerAcesso(userId, nome);
}
