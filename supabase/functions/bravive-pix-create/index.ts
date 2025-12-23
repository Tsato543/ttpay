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
    const { amount, description } = await req.json();

    const BRAVIVE_TOKEN = Deno.env.get("BRAVIVE_TOKEN");
    if (!BRAVIVE_TOKEN) {
      console.error("BRAVIVE_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Token de pagamento não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating PIX payment:", { amount, description });

    const response = await fetch("https://app.bravive.com/api/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRAVIVE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount, // em centavos
        currency: "BRL",
        method: "PIX",
        description: description || "Taxa de liberação de saque",
        payer_name: "Cliente",
        payer_email: "cliente@exemplo.com",
        payer_phone: "11999999999",
        payer_document: "12345678901",
      }),
    });

    const data = await response.json();
    console.log("Bravive response:", data);

    if (!response.ok) {
      console.error("Bravive API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao criar pagamento" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        status: data.status,
        pix_code: data.pix_code || data.qr_code_text || data.copy_paste,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in bravive-pix-create:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
