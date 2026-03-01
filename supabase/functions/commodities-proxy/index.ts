// supabase/functions/commodities-proxy/index.ts
// Edge Function que busca preços de commodities agrícolas de múltiplas fontes
// Retorna dados normalizados em R$/saca para o frontend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://agropro.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://tiagouchiha2014-max.github.io",
];

function getCorsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Cache em memória — válido por 30 minutos
const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL_MS = 30 * 60 * 1000;

// Tabela de referência CEPEA/Esalq — atualizada mar/2026
const TABELA_REFERENCIA: Record<string, number> = {
  soja: 135.00,
  milho: 62.50,
  algodao: 120.00,
  sorgo: 45.00,
  trigo: 90.00,
  cafe: 1350.00,
  arroz: 65.00,
  feijao: 290.00,
  canola: 145.00,
  girassol: 95.00,
  amendoim: 230.00,
};

serve(async (req: Request) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Ler parâmetros
    const body = await req.json();
    const cultura = (body.cultura || "soja").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Verificar cache
    const cacheKey = `commodity_${cultura}`;
    const cached = cache[cacheKey];
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ ...cached.data, cached: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Buscar de múltiplas fontes (com timeout)
    let preco: number | null = null;
    let fonte = "";
    const erros: string[] = [];

    // Fonte 1: HG Brasil Finance API (chave server-side)
    const hgKey = Deno.env.get("HG_BRASIL_KEY") || "demo";
    try {
      const culturaParam = cultura === "soja" ? "soja" : cultura === "milho" ? "milho" : cultura;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(
        `https://api.hgbrasil.com/finance/commodities?key=${hgKey}&commodities=${culturaParam}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json();
        const item = data?.results?.[culturaParam];
        if (item?.price && item.price > 0) {
          preco = item.price;
          fonte = "HG Brasil (tempo real)";
        }
      }
    } catch (e) {
      erros.push(`HG Brasil: ${(e as Error).message}`);
    }

    // Fonte 2: AwesomeAPI (câmbio USD/BRL para converter CBOT)
    if (!preco) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(
          "https://economia.awesomeapi.com.br/json/last/USD-BRL",
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (resp.ok) {
          const data = await resp.json();
          const usdBrl = parseFloat(data?.USDBRL?.bid || "0");
          if (usdBrl > 0) {
            // Preços CBOT em USD/bushel → converter para R$/saca
            // Soja: 1 bushel = 27.216 kg, saca = 60 kg → fator 2.204
            // Milho: 1 bushel = 25.401 kg, saca = 60 kg → fator 2.362
            const cbotRefUSD: Record<string, number> = {
              soja: 11.50, milho: 4.80, trigo: 6.20,
            };
            const bushelToSaca: Record<string, number> = {
              soja: 2.204, milho: 2.362, trigo: 2.362,
            };
            if (cbotRefUSD[cultura]) {
              preco = Math.round(cbotRefUSD[cultura] * bushelToSaca[cultura] * usdBrl * 100) / 100;
              fonte = `CBOT/AwesomeAPI (USD/BRL: ${usdBrl.toFixed(2)})`;
            }
          }
        }
      } catch (e) {
        erros.push(`AwesomeAPI: ${(e as Error).message}`);
      }
    }

    // Fonte 3: Tabela de referência interna (fallback)
    if (!preco) {
      preco = TABELA_REFERENCIA[cultura] || TABELA_REFERENCIA["soja"];
      fonte = "Tabela CEPEA/Esalq ref. mar/2026";
    }

    const resultado = {
      ok: true,
      cultura: body.cultura || "Soja",
      preco,
      moeda: "R$/sc",
      fonte,
      atualizadoEm: new Date().toISOString(),
      erros: erros.length > 0 ? erros : undefined,
    };

    // Salvar no cache
    cache[cacheKey] = { data: resultado, ts: Date.now() };

    return new Response(
      JSON.stringify(resultado),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
