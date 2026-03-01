// supabase/functions/commodities-proxy/index.ts
// Edge Function — Scraping CEPEA/Esalq + Cache em cotacoes_diarias
// Busca precos reais de commodities agricolas e salva no banco
//
// DEPLOY: supabase functions deploy commodities-proxy
// CRON (opcional): pg_cron para chamar 1x/dia as 18h

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const ALLOWED_ORIGINS = [
  "https://agropro.vercel.app",
  "https://agro-pro.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://tiagouchiha2014-max.github.io",
];

function getCorsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.some(o => requestOrigin.startsWith(o))
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Cache em memoria — 30 min
const memCache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 30 * 60 * 1000;

// Fallback de referencia CEPEA fev/2026
const FALLBACK: Record<string, { preco: number; unidade: string }> = {
  soja:    { preco: 120.70, unidade: "sc" },
  milho:   { preco: 69.53,  unidade: "sc" },
  cafe:    { preco: 1797.61, unidade: "sc" },
  algodao: { preco: 116.49, unidade: "@" },
  arroz:   { preco: 55.51,  unidade: "sc" },
  trigo:   { preco: 90.00,  unidade: "sc" },
  feijao:  { preco: 290.00, unidade: "sc" },
  sorgo:   { preco: 45.00,  unidade: "sc" },
  boi:     { preco: 353.15, unidade: "@" },
  acucar:  { preco: 98.59,  unidade: "sc" },
};

// Normaliza nome de commodity para chave
function normKey(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

// ─── Scraping CEPEA ──────────────────────────────────────
async function scrapeCepea(): Promise<Record<string, { preco: number; unidade: string }>> {
  const result: Record<string, { preco: number; unidade: string }> = {};

  try {
    const resp = await fetch("https://cepea.org.br/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgroPro/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return result;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return result;

    // Buscar todos os elementos de texto
    const allText = doc.body?.textContent || "";

    // Regex para capturar "CommodityR$ XXX,XX | unit" e "Commodity¢R$ XXX,XX | unit"
    const reNormal = /([A-Za-zçãéêíóúÇÃÉÊÍÓÚ]+)\s*R\$\s*([\d.,]+)\s*\|\s*([a-z@]+)/gi;
    const reCentavos = /([A-Za-zçãéêíóúÇÃÉÊÍÓÚ]+)\s*¢R\$\s*([\d.,]+)\s*\|\s*([a-z@]+)/gi;

    let match;
    while ((match = reNormal.exec(allText)) !== null) {
      const name = normKey(match[1]);
      const priceStr = match[2].replace(/\./g, "").replace(",", ".");
      const price = parseFloat(priceStr);
      const unit = match[3];
      if (price > 0 && name.length > 2) {
        result[name] = { preco: price, unidade: unit };
      }
    }

    while ((match = reCentavos.exec(allText)) !== null) {
      const name = normKey(match[1]);
      const priceStr = match[2].replace(/\./g, "").replace(",", ".");
      const price = parseFloat(priceStr);
      const unit = match[3];
      if (price > 0 && name.length > 2) {
        // Algodao: ¢R$ 352,27/lp -> converter para R$/@ (arroba = 15kg)
        // 1 lp = 0.4536 kg, 1@ = 15kg = 33.07 lp
        // R$/@ = (centavos/100) / 0.4536 * 15
        const reaisLp = price / 100;
        const reaisArroba = Math.round((reaisLp / 0.4536) * 15 * 100) / 100;
        result[name] = { preco: reaisArroba, unidade: "@" };
      }
    }
  } catch (_) {
    // Scraping falhou, retorna vazio
  }

  return result;
}

// ─── Handler principal ───────────────────────────────────
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nao autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validar usuario
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessao invalida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parametros
    const body = await req.json();
    const action = body.action || "get"; // "get" | "scrape" | "all"
    const culturaRaw = body.cultura || "soja";
    const culturaKey = normKey(culturaRaw);

    // Client com service_role para escrita
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─── ACTION: scrape (atualiza precos do CEPEA) ───
    if (action === "scrape") {
      const scraped = await scrapeCepea();
      const today = new Date().toISOString().slice(0, 10);
      let saved = 0;

      for (const [key, val] of Object.entries(scraped)) {
        const { error } = await adminClient
          .from("cotacoes_diarias")
          .upsert(
            { commodity: key, preco: val.preco, unidade: val.unidade, fonte: "CEPEA/Esalq", data: today },
            { onConflict: "commodity,data" }
          );
        if (!error) saved++;
      }

      // Tambem salvar fallbacks para commodities nao encontradas no scraping
      for (const [key, val] of Object.entries(FALLBACK)) {
        if (!scraped[key]) {
          await adminClient
            .from("cotacoes_diarias")
            .upsert(
              { commodity: key, preco: val.preco, unidade: val.unidade, fonte: "CEPEA/Esalq (ref.)", data: today },
              { onConflict: "commodity,data" }
            );
          saved++;
        }
      }

      return new Response(
        JSON.stringify({ ok: true, scraped: Object.keys(scraped).length, saved, date: today }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: all (retorna todas as cotacoes do dia) ───
    if (action === "all") {
      // Verificar cache
      if (memCache["all"] && (Date.now() - memCache["all"].ts) < CACHE_TTL) {
        return new Response(
          JSON.stringify({ ...memCache["all"].data, cached: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar do banco (ultimas cotacoes por commodity)
      const { data: dbData } = await adminClient
        .from("cotacoes_diarias")
        .select("commodity, preco, unidade, fonte, data")
        .order("data", { ascending: false })
        .limit(50);

      // Agrupar por commodity (pegar mais recente)
      const latest: Record<string, any> = {};
      if (dbData) {
        for (const row of dbData) {
          if (!latest[row.commodity]) {
            latest[row.commodity] = row;
          }
        }
      }

      // Se banco vazio, tentar scraping + fallback
      if (Object.keys(latest).length === 0) {
        const scraped = await scrapeCepea();
        for (const [k, v] of Object.entries({ ...FALLBACK, ...scraped })) {
          latest[k] = { commodity: k, preco: v.preco, unidade: v.unidade, fonte: scraped[k] ? "CEPEA/Esalq" : "ref. fev/2026", data: new Date().toISOString().slice(0, 10) };
        }
      }

      const result = { ok: true, cotacoes: latest, atualizadoEm: new Date().toISOString() };
      memCache["all"] = { data: result, ts: Date.now() };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: get (busca cotacao de uma commodity) ───
    // Verificar cache
    const cacheKey = `cot_${culturaKey}`;
    if (memCache[cacheKey] && (Date.now() - memCache[cacheKey].ts) < CACHE_TTL) {
      return new Response(
        JSON.stringify({ ...memCache[cacheKey].data, cached: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar do banco
    const { data: dbRow } = await adminClient
      .from("cotacoes_diarias")
      .select("preco, unidade, fonte, data")
      .eq("commodity", culturaKey)
      .order("data", { ascending: false })
      .limit(1)
      .single();

    let preco: number;
    let fonte: string;
    let dataRef: string;

    if (dbRow && dbRow.preco > 0) {
      preco = dbRow.preco;
      fonte = dbRow.fonte || "CEPEA/Esalq";
      dataRef = dbRow.data;
    } else {
      // Fallback para scraping direto
      const scraped = await scrapeCepea();
      if (scraped[culturaKey]) {
        preco = scraped[culturaKey].preco;
        fonte = "CEPEA/Esalq (scraping)";
      } else {
        preco = FALLBACK[culturaKey]?.preco || FALLBACK["soja"].preco;
        fonte = "CEPEA/Esalq (ref. fev/2026)";
      }
      dataRef = new Date().toISOString().slice(0, 10);
    }

    const resultado = {
      ok: true,
      cultura: culturaRaw,
      preco,
      moeda: "R$/sc",
      fonte,
      data: dataRef,
      atualizadoEm: new Date().toISOString(),
    };

    memCache[cacheKey] = { data: resultado, ts: Date.now() };

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
