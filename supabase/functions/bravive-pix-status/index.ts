import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID do pagamento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BRAVIVE_TOKEN = Deno.env.get("BRAVIVE_TOKEN");
    if (!BRAVIVE_TOKEN) {
      console.error("BRAVIVE_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Token de pagamento não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking PIX payment status:", id);

    const response = await fetch(`https://app.bravive.com/api/v1/payments/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${BRAVIVE_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Bravive status response:", data);

    if (!response.ok) {
      console.error("Bravive API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao verificar status" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        status: data.status,
        method: data.method,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in bravive-pix-status:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
