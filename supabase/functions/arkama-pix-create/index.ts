import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARKAMA_BASE_URL = "https://app.arkama.com.br/api/v1";

function normalizeBrazilCellphone(input: string) {
  const digits = (input || "").replace(/\D/g, "");

  // Accept formats:
  // - 10 digits (DD + number) -> add 9
  // - 11 digits (DD + 9-digit) -> add country code 55
  // - 13 digits (55 + DD + 9-digit) -> keep
  if (digits.length === 10) {
    const withNine = `${digits.slice(0, 2)}9${digits.slice(2)}`;
    return `55${withNine}`;
  }

  if (digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, customer } = await req.json();

    const apiToken = Deno.env.get("ARKAMA_API_TOKEN");
    if (!apiToken) {
      throw new Error("ARKAMA_API_TOKEN not configured");
    }

    // Convert centavos to reais (number)
    const valueInReais = amount / 100;

    const externalRef = `pix-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const customerData = {
      name: customer?.name || "Cliente",
      email: customer?.email || "cliente@pagamento.com",
      document: (customer?.document || "00000000000").replace(/\D/g, ""),
      cellphone: normalizeBrazilCellphone(customer?.phone || "11999999999"),
    };

    // IP (Arkama requires)
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ip = forwardedFor.split(",")[0].trim() || "127.0.0.1";

    // Arkama payload that our account validated before:
    // - paymentMethod: "pix"
    // - items.* requires isDigital
    // - shipping.address required
    // - ip required
    const requestBody = {
      paymentMethod: "pix",
      value: valueInReais,
      customer: customerData,
      items: [
        {
          title: "Taxa PIX",
          quantity: 1,
          unitPrice: valueInReais,
          isDigital: true,
        },
      ],
      shipping: {
        address: {
          cep: "01310100",
          city: "Sao Paulo",
          state: "SP",
          street: "Avenida Paulista",
          neighborhood: "Bela Vista",
          number: "1000",
          complement: "",
        },
      },
      ip,
      externalRef,
    };

    console.log("Creating Arkama PIX payment:", {
      amount,
      valueInReais,
      description,
      customer: customerData,
      ip,
    });
    console.log("Arkama request body:", JSON.stringify(requestBody));

    const response = await fetch(`${ARKAMA_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log("Arkama create PIX response:", JSON.stringify(data));

    if (!response.ok || data.error || data.success === false) {
      console.error("Arkama API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || data.error || "Erro ao criar pagamento" }),
        { status: response.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = data.id || data.data?.id;
    const pixCode = data.pix?.payload || data.data?.pix?.payload;

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
      amount,
      product_name: description || "Taxa PIX",
      status: "PENDING",
      payment_code: pixCode,
      user_cpf: customerData.document,
      user_email: customerData.email,
      user_name: customerData.name,
      user_phone: customerData.cellphone,
      page_origin: "index",
    });

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
    }

    return new Response(
      JSON.stringify({
        id: orderId,
        status: "PENDING",
        pix_code: pixCode,
        externalRef,
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
