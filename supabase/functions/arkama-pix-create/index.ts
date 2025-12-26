import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Arkama API - Create PIX payment
    const arkamaResponse = await fetch("https://api.arkama.app/v1/pix/qrcode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        amount: amount, // Amount in cents
        external_reference: externalRef,
        description: description || "Pagamento PIX",
      }),
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
      user_name: "Cliente",
      user_email: "cliente@email.com",
      user_cpf: "00000000000",
      payment_code: arkamaData.qr_code || arkamaData.pix_code || arkamaData.emv,
      page_origin: "arkama",
    });

    if (insertError) {
      console.error("Error saving transaction:", insertError);
    }

    return new Response(
      JSON.stringify({
        id: transactionId,
        pix_code: arkamaData.qr_code || arkamaData.pix_code || arkamaData.emv,
        qr_code_base64: arkamaData.qr_code_base64,
        status: "PENDING",
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
