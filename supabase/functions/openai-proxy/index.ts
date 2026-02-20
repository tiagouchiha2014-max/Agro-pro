// supabase/functions/openai-proxy/index.ts
// Edge Function que faz proxy seguro para a OpenAI
// A chave da OpenAI fica como secret no Supabase, nunca no front-end

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado. Faça login primeiro." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Criar cliente Supabase com o token do usuário
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verificar usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verificar plano do usuário (opcional: bloquear trial)
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, trial_ends_at")
      .eq("id", user.id)
      .single();

    if (profile) {
      const planType = profile.plan_type || "trial";
      const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;

      if (planType === "trial" && trialEnds && trialEnds < new Date()) {
        return new Response(
          JSON.stringify({ error: "Seu período de teste expirou. Faça upgrade para o plano Pro para usar a IA." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Ler o body da requisição
    const body = await req.json();
    const { messages, model, max_tokens, temperature } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens inválidas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Chamar a OpenAI com a chave segura do servidor
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da OpenAI não configurada no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        messages: messages,
        max_tokens: Math.min(max_tokens || 2000, 4000), // Limitar tokens
        temperature: temperature ?? 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errData = await openaiResponse.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `OpenAI retornou HTTP ${openaiResponse.status}`;
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: openaiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await openaiResponse.json();

    // 7. Retornar resposta
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
