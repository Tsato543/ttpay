import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARKAMA_BASE_URL = "https://app.arkama.com.br/api/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description } = await req.json();

    const apiToken = Deno.env.get("ARKAMA_API_TOKEN");
    if (!apiToken) {
      throw new Error("ARKAMA_API_TOKEN not configured");
    }

    // Convert centavos to reais
    const valueInReais = amount / 100;

    console.log("Creating Arkama PIX payment:", { amount, valueInReais, description });

    const externalRef = `pix-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create order with Arkama API
    const response = await fetch(`${ARKAMA_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "User-Agent": "TikTokBonus",
        "accept": "application/json",
      },
      body: JSON.stringify({
        value: valueInReais,
        paymentMethod: "pix",
        customer: {
          name: "jose aarao quaresma",
          email: "tsato4539@gmail.com",
          document: "12446759890",
          phone: "85999698083",
        },
        shipping: {
          address: {
            cep: "01001000",
            street: "Rua Exemplo",
            number: "100",
            neighborhood: "Centro",
            city: "São Paulo",
            state: "SP",
            complement: "",
          },
        },
        items: [
          {
            title: description || "Taxa PIX",
            quantity: 1,
            unitPrice: valueInReais,
            isDigital: true,
          },
        ],
        ip: "127.0.0.1",
        externalRef: externalRef,
      }),
    });

    const data = await response.json();
    console.log("Arkama create PIX response:", JSON.stringify(data));

    if (!response.ok || data.error) {
      console.error("Arkama API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || data.error || "Erro ao criar pagamento" }),
        { status: response.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Arkama returns: id, pix (with code), status, etc.
    const orderId = data.id || data.data?.id;
    const pixCode = data.pix?.payload || data.data?.pix?.payload || data.pix?.code || data.data?.pix?.code || data.pix?.qrcode || data.data?.pix?.qrcode;

    if (!orderId || !pixCode) {
      console.error("Missing orderId or pixCode in response:", data);
      return new Response(
        JSON.stringify({ error: "Resposta inválida da API" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert transaction into database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: orderId,
      amount: amount,
      product_name: description || "Taxa PIX",
      status: "PENDING",
      payment_code: pixCode,
      user_cpf: "000.000.000-00",
      user_email: "user@example.com",
      user_name: "Usuario",
      page_origin: "index",
    });

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
    } else {
      console.log("Transaction inserted successfully:", orderId);
    }

    return new Response(
      JSON.stringify({
        id: orderId,
        status: "PENDING",
        pix_code: pixCode,
        externalRef: externalRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in arkama-pix-create:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
