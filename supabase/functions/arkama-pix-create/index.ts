import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip",
};

const ARKAMA_BASE_URL = "https://app.arkama.com.br/api/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description } = await req.json();

    if (!amount) {
      return new Response(
        JSON.stringify({ error: "Amount is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating Arkama PIX payment:", { amount, description });

    const apiToken = Deno.env.get("ARKAMA_API_TOKEN");
    if (!apiToken) {
      console.error("ARKAMA_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "API token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate external reference
    const externalRef = `PIX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Get client IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "127.0.0.1";

    // Convert cents to reais (amount comes in cents)
    const valueInReais = (amount / 100).toFixed(2);

    // Arkama API - Create order with PIX payment
    // Arkama requires either `value` or `total_value`.
    // Also requires `shipping.address` and `items[].isDigital`.
    const requestBody = {
      paymentMethod: "pix",
      ip: clientIp,
      externalRef: externalRef,

      value: Number(valueInReais),

      items: [
        {
          title: description || "Pagamento PIX",
          quantity: 1,
          unitPrice: Number(valueInReais),
          isDigital: true,
        },
      ],

      // Required structure (even for digital goods) - Arkama expects strings (not null)
      shipping: {
        address: {
          cep: "00000000",
          city: "Sao Paulo",
          state: "SP",
          street: "Rua Exemplo",
          neighborhood: "Centro",
          number: "0",
          complement: "",
        },
      },

      customer: {
        name: "Cliente",
        email: "cliente@pagamento.com",
        cellphone: null,
        document: null,
      },

      utms: {
        source: "lovable",
      },
    };

    console.log("Arkama request body:", JSON.stringify(requestBody));

    const arkamaResponse = await fetch(`${ARKAMA_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await arkamaResponse.text();
    console.log("Arkama response status:", arkamaResponse.status);
    console.log("Arkama response:", responseText);

    if (!arkamaResponse.ok) {
      console.error("Arkama API error:", responseText);
      return new Response(
        JSON.stringify({ error: `Erro ao criar pagamento: ${responseText}` }),
        { status: arkamaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arkamaData = JSON.parse(responseText);
    console.log("Arkama payment created:", arkamaData);

    // Save transaction to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const transactionId = arkamaData.id || externalRef;

    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: transactionId,
      amount: amount,
      product_name: description || "Pagamento PIX",
      status: "PENDING",
      user_name: arkamaData.customer?.name || "Cliente",
      user_email: arkamaData.customer?.email || "cliente@pagamento.com",
      user_cpf: arkamaData.customer?.document || "00000000000",
      payment_code: arkamaData.pix?.payload,
      page_origin: "arkama",
    });

    if (insertError) {
      console.error("Error saving transaction:", insertError);
    }

    return new Response(
      JSON.stringify({
        id: transactionId,
        pix_code: arkamaData.pix?.payload,
        status: arkamaData.status || "PENDING",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in arkama-pix-create:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
