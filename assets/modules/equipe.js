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

  // Seção de Gerenciamento de Acessos (desabilitada até migração completa para Supabase)
  if (getUserRole() === 'admin') {
    const content = document.getElementById("content");
    content.insertAdjacentHTML('beforeend', `
      <div class="card" style="margin-top:25px; border: 2px dashed #94a3b8; opacity: 0.8;">
        <div style="text-align:center; padding:20px;">
          <div style="font-size:40px; margin-bottom:10px;">🔐</div>
          <h3 style="margin:0 0 8px; color:#3b82f6;">Gerenciamento de Acessos</h3>
          <p style="color:#64748b; font-size:14px; margin:0 0 5px;">Em breve: convide Gerentes e Funcionários para acessar o sistema com permissões limitadas.</p>
          <p style="color:#94a3b8; font-size:12px; margin:0;">Cada perfil terá acesso personalizado — gerentes sem financeiro, funcionários com acesso restrito.</p>
          <span style="display:inline-block; margin-top:12px; background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600;">EM BREVE</span>
        </div>
      </div>
    `);
  }
}

function renderGerenciamentoAcessos() {
  const content = document.getElementById("content");
  
  // Carregar contas de acesso salvas no localStorage
  const contasAcesso = JSON.parse(localStorage.getItem("agro_team_accounts") || "[]");
  
  const acessoHtml = `
    <div class="card" style="margin-top:25px; border: 2px solid #3b82f6;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <div>
          <h3 style="margin:0; color:#3b82f6;">🔐 Gerenciamento de Acessos</h3>
          <p style="color:#64748b; font-size:13px; margin:5px 0 0;">Crie contas de Gerente ou Funcionário para sua equipe acessar o sistema com permissões limitadas.</p>
        </div>
      </div>
      <div class="hr"></div>
      
      <div style="background:#f8fafc; border-radius:8px; padding:15px; margin:15px 0;">
        <h4 style="margin:0 0 10px;">Criar nova conta de acesso</h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
          <div>
            <small style="display:block; margin-bottom:4px; font-weight:600;">Nome</small>
            <input class="input" id="teamName" placeholder="Nome do colaborador" />
          </div>
          <div>
            <small style="display:block; margin-bottom:4px; font-weight:600;">E-mail (login)</small>
            <input class="input" id="teamEmail" type="email" placeholder="email@exemplo.com" />
          </div>
          <div>
            <small style="display:block; margin-bottom:4px; font-weight:600;">Perfil de Acesso</small>
            <select class="select" id="teamRole">
              <option value="gerente">Gerente</option>
              <option value="funcionario">Funcionário</option>
            </select>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
          <div>
            <small style="display:block; margin-bottom:4px; font-weight:600;">Senha</small>
            <input class="input" id="teamPass" type="password" placeholder="Mínimo 6 caracteres" />
          </div>
          <div style="display:flex; align-items:flex-end;">
            <button class="btn primary" id="btnCriarAcesso" style="width:100%;">+ Criar Conta de Acesso</button>
          </div>
        </div>
      </div>

      <div style="margin-top:15px;">
        <h4>Contas de acesso ativas</h4>
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px; margin-bottom:10px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px; font-size:12px; color:#065f46;">
            <div><b>Perfil: Gerente</b></div>
            <div>Vê tudo, exceto financeiro</div>
            <div>Pode criar e editar registros</div>
          </div>
        </div>
        <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:10px; margin-bottom:15px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px; font-size:12px; color:#92400e;">
            <div><b>Perfil: Funcionário</b></div>
            <div>Dashboard simplificado, sem relatórios</div>
            <div>Registra aplicações, manutenção, combustível</div>
          </div>
        </div>
        <table style="width:100%;">
          <thead>
            <tr>
              <th style="text-align:left;">Nome</th>
              <th style="text-align:left;">E-mail</th>
              <th style="text-align:left;">Perfil</th>
              <th style="text-align:left;">Criado em</th>
              <th style="text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyAcessos">
            ${contasAcesso.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Nenhuma conta de acesso criada ainda.</td></tr>' : 
              contasAcesso.map(c => `
                <tr>
                  <td><b>${escapeHtml(c.nome)}</b></td>
                  <td>${escapeHtml(c.email)}</td>
                  <td><span style="${c.role === 'gerente' ? 'background:#dbeafe; color:#1e40af;' : 'background:#fef3c7; color:#92400e;'} padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${c.role === 'gerente' ? 'Gerente' : 'Funcionário'}</span></td>
                  <td style="color:#64748b; font-size:13px;">${c.criadoEm || '-'}</td>
                  <td style="text-align:center;"><button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="window.__delAcesso('${c.id}')">Remover</button></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  content.insertAdjacentHTML('beforeend', acessoHtml);

  // Handler criar conta de acesso
  document.getElementById("btnCriarAcesso").addEventListener("click", () => {
    const nome = document.getElementById("teamName").value.trim();
    const email = document.getElementById("teamEmail").value.trim();
    const role = document.getElementById("teamRole").value;
    const pass = document.getElementById("teamPass").value;

    if (!nome || !email || !pass) { toast("Erro", "Preencha todos os campos."); return; }
    if (pass.length < 6) { toast("Erro", "Senha deve ter no mínimo 6 caracteres."); return; }

    const contas = JSON.parse(localStorage.getItem("agro_team_accounts") || "[]");
    
    // Verificar se e-mail já existe
    if (contas.find(c => c.email === email)) {
      toast("Erro", "Já existe uma conta com este e-mail.");
      return;
    }

    // Pegar ID do admin atual da sessão
    const session = JSON.parse(localStorage.getItem("agro_session") || "{}");
    const owner_id = session.user?.id || null;

    contas.push({
      id: uid('acc'),
      nome,
      email,
      role,
      senha: pass, // Em produção, usar hash via Supabase Auth
      criadoEm: nowISO(),
      ativo: true,
      owner_id: owner_id // Vincula o funcionário ao admin dono
    });

    localStorage.setItem("agro_team_accounts", JSON.stringify(contas));
    toast("Conta criada", `${nome} agora pode acessar como ${role === 'gerente' ? 'Gerente' : 'Funcionário'}.`);
    
    // Recarregar a página para atualizar a tabela
    pageEquipe();
  });

  // Handler remover conta
  window.__delAcesso = (id) => {
    if (!confirm("Remover esta conta de acesso? O usuário não poderá mais fazer login.")) return;
    let contas = JSON.parse(localStorage.getItem("agro_team_accounts") || "[]");
    contas = contas.filter(c => c.id !== id);
    localStorage.setItem("agro_team_accounts", JSON.stringify(contas));
    toast("Conta removida", "Acesso revogado.");
    pageEquipe();
  };
}

