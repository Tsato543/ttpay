import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZYROPAY_BASE_URL = "https://gateway-zyropay-api.rancher.codefabrik.dev";

// Cache for auth token
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && tokenExpiry > now + 300000) {
    return cachedToken;
  }

  const clientId = Deno.env.get("ZYROPAY_CLIENT_ID");
  const password = Deno.env.get("ZYROPAY_PASSWORD");

  if (!clientId || !password) {
    throw new Error("ZYROPAY credentials not configured");
  }

  console.log("Authenticating with ZyroPay...");

  const response = await fetch(`${ZYROPAY_BASE_URL}/cli/client/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "*/*",
    },
    body: JSON.stringify({ clientId, password }),
  });

  const data = await response.json();
  console.log("ZyroPay auth response:", data.success ? "success" : "failed");

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to authenticate with ZyroPay");
  }

  cachedToken = data.data.token;
  // Token expires in 8 hours based on JWT, cache for 7 hours
  tokenExpiry = now + 7 * 60 * 60 * 1000;

  return cachedToken!;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description } = await req.json();

    // Convert centavos to reais (ZyroPay expects value in reais with dot)
    const valueInReais = amount / 100;

    console.log("Creating ZyroPay PIX payment:", { amount, valueInReais, description });

    const token = await getAuthToken();

    const externalId = `pix-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const response = await fetch(`${ZYROPAY_BASE_URL}/cli/payment/pix/generate-pix`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "accept": "*/*",
      },
      body: JSON.stringify({
        value: valueInReais,
        expiration: 0, // 24 hours default
        externalId: externalId,
      }),
    });

    const data = await response.json();
    console.log("ZyroPay create PIX response:", data);

    if (!response.ok || !data.success) {
      console.error("ZyroPay API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || data.errors || "Erro ao criar pagamento" }),
        { status: response.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert transaction into database so webhook can update it
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: data.data.movId,
      amount: amount,
      product_name: description || "Taxa PIX",
      status: "PENDING",
      payment_code: data.data.pix,
      user_cpf: "000.000.000-00",
      user_email: "user@example.com",
      user_name: "Usuario",
      page_origin: "index",
    });

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
    } else {
      console.log("Transaction inserted successfully:", data.data.movId);
    }

    // ZyroPay returns: pix, value, clientId, paymentId, movId
    return new Response(
      JSON.stringify({
        id: data.data.movId, // Use movId as our primary ID
        paymentId: data.data.paymentId,
        status: "PENDING",
        pix_code: data.data.pix,
        externalId: externalId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in zyropay-pix-create:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});