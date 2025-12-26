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
    console.log("Creating Mangofy PIX payment:", { amount, description });

    const apiKey = Deno.env.get("MANGOFY_API_KEY");
    const storeCode = Deno.env.get("MANGOFY_STORE_CODE");

    if (!apiKey || !storeCode) {
      throw new Error("Mangofy credentials not configured");
    }

    // Generate unique external ID
    const externalId = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create PIX payment via Mangofy API
    const response = await fetch("https://checkout.mangofy.com.br/api/v1/payment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        store_code: storeCode,
        amount: amount, // Amount in cents
        payment_method: "pix",
        external_id: externalId,
        description: description || "Pagamento PIX",
        customer: {
          name: "Cliente",
          email: "cliente@email.com",
          document: "00000000000",
        },
      }),
    });

    const data = await response.json();
    console.log("Mangofy response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("Mangofy error:", data);
      throw new Error(data.message || "Failed to create PIX payment");
    }

    // Create Supabase client to save transaction
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save transaction in database
    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: data.payment_code || externalId,
      amount: amount,
      product_name: description || "Pagamento PIX",
      status: "waiting_payment",
      user_name: "Cliente",
      user_email: "cliente@email.com",
      user_cpf: "00000000000",
      page_origin: "mangofy",
      payment_code: data.pix_code || data.qr_code,
    });

    if (insertError) {
      console.error("Error saving transaction:", insertError);
    }

    return new Response(
      JSON.stringify({
        id: data.payment_code || externalId,
        paymentId: data.payment_id,
        status: "PENDING",
        pix_code: data.pix_code || data.qr_code,
        externalId: externalId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in mangofy-pix-create:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
