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
    const { amount, description, customer } = await req.json();

    if (!amount) {
      return new Response(
        JSON.stringify({ error: "Amount is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("MANGOFY_API_KEY");
    const storeCode = Deno.env.get("MANGOFY_STORE_CODE");

    if (!apiKey || !storeCode) {
      console.error("Missing Mangofy credentials");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique external code
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const externalCode = `PIX-${timestamp}-${random}`;

    // Prepare customer data
    const customerData = {
      name: customer?.name || "Cliente",
      email: customer?.email || "cliente@pagamento.com",
      document: customer?.document?.replace(/\D/g, "") || "00000000000",
      phone: customer?.phone?.replace(/\D/g, "") || "00000000000",
      ip: "127.0.0.1"
    };

    // Prepare request body
    const requestBody = {
      store_code: storeCode,
      external_code: externalCode,
      payment_method: "pix",
      payment_format: "regular",
      installments: 1,
      payment_amount: Math.round(amount), // Amount in centavos
      customer: customerData,
      pix: {
        expires_in_days: 1
      },
      items: [{
        code: "ITEM-001",
        name: description || "Pagamento PIX",
        quantity: 1,
        amount: Math.round(amount)
      }],
      postback_url: "https://webhook.site/placeholder"
    };

    console.log("Creating Mangofy PIX payment:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://checkout.mangofy.com.br/api/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": apiKey,
        "Store-Code": storeCode
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log("Mangofy API response status:", response.status);
    console.log("Mangofy API response:", responseText);

    if (!response.ok) {
      console.error("Mangofy API error:", responseText);
      return new Response(
        JSON.stringify({ error: `Payment API error: ${response.status}`, details: responseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Mangofy response:", e);
      return new Response(
        JSON.stringify({ error: "Invalid response from payment gateway" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract PIX code from response
    const pixCode = data.pix?.pix_qrcode_text;
    const paymentId = data.payment_code;
    const paymentStatus = data.payment_status;

    if (!pixCode) {
      console.error("PIX code not found in response:", data);
      return new Response(
        JSON.stringify({ error: "PIX code not generated", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store transaction in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from("transactions").insert({
      id_transaction: paymentId,
      product_name: description || "Pagamento PIX",
      amount: amount / 100, // Store in reais
      status: "waiting_payment",
      payment_code: pixCode,
      user_name: customerData.name,
      user_email: customerData.email,
      user_cpf: customerData.document,
      user_phone: customerData.phone,
      page_origin: "mangofy"
    });

    if (dbError) {
      console.error("Database error:", dbError);
      // Continue anyway, payment was created
    }

    console.log("Payment created successfully:", { paymentId, status: paymentStatus });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentId,
        pixCode: pixCode,
        status: paymentStatus
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
