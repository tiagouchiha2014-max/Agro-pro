function pageCopilot() {
  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="card" style="text-align:center; padding: 60px 30px;">
        <div style="width:80px; height:80px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius:20px; display:flex; align-items:center; justify-content:center; margin: 0 auto 20px; font-size:36px;">
          🤖
        </div>
        <h2 style="margin: 0 0 10px; color: #1e293b;">Agro-Copilot (IA)</h2>
        <div style="display:inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px;">EM BREVE</div>
        <p style="color: #64748b; max-width: 500px; margin: 0 auto 25px; line-height: 1.6;">
          Estamos desenvolvendo o <b>Agro-Copilot</b>, uma inteligência artificial avançada que vai conversar com seus dados e oferecer recomendações personalizadas de manejo, análise de custos e alertas inteligentes.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; max-width: 500px; margin: 0 auto; text-align: left;">
          <h4 style="margin: 0 0 12px; color: #334155;">O que o Copilot vai fazer por você:</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981;">✓</span> Responder perguntas sobre seus dados em linguagem natural</div>
            <div style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981;">✓</span> Sugerir melhores práticas de manejo por cultura</div>
            <div style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981;">✓</span> Analisar custos e identificar oportunidades de economia</div>
            <div style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981;">✓</span> Alertar sobre condições climáticas e pragas</div>
            <div style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981;">✓</span> Gerar relatórios automáticos com insights</div>
          </div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Disponível nos planos <b>Pro</b> e <b>Master</b>. Você será notificado quando estiver disponível.</p>
      </div>
    </div>
  `;
}

