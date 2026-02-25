// supabase/functions/openai-proxy/index.ts
// Edge Function que faz proxy seguro para a OpenAI
// A chave da OpenAI fica como secret no Supabase, nunca no front-end

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Origens permitidas — adicione seu domínio de produção aqui
const ALLOWED_ORIGINS = [
  "https://agropro.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://tiagouchiha2014-max.github.io",
];

function getCorsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // fallback para domínio principal
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req: Request) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

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

    // 4. Verificar plano do usuário + Rate Limiting (máx 20 chamadas/hora)
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

    // Rate Limiting: máx 20 requisições por usuário por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    const MAX_CALLS_PER_HOUR = 20;
    if ((recentCalls ?? 0) >= MAX_CALLS_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: `Limite de ${MAX_CALLS_PER_HOUR} consultas por hora atingido. Tente novamente em instantes.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registrar uso (sem bloquear em caso de erro)
    await supabase.from("ai_usage_log").insert({ user_id: user.id }).catch(() => {});

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
