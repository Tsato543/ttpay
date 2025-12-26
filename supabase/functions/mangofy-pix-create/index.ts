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
    const externalCode = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create PIX payment via Mangofy API
    // Docs show Authorization as raw API key, but some environments may require "Bearer".
    const baseHeaders: Record<string, string> = {
      "Store-Code": storeCode,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const requestBody = {
      store_code: storeCode,
      external_code: externalCode,
      payment_method: "pix",
      payment_format: "regular",
      installments: 1,
      payment_amount: amount, // Amount in cents
      shipping_amount: 0,
      items: [
        {
          code: "PIX001",
          name: description || "Pagamento PIX",
          amount: amount,
          total: amount,
        },
      ],
      customer: {
        email: "cliente@email.com",
        name: "Cliente",
        document: "00000000000",
        phone: "00000000000",
      },
      pix: {
        expires_in_days: 1,
      },
    };

    const callMangofy = async (authorizationValue: string, mode: "raw" | "bearer") => {
      const res = await fetch("https://checkout.mangofy.com.br/api/v1/payment", {
        method: "POST",
        headers: {
          ...baseHeaders,
          Authorization: authorizationValue,
        },
        body: JSON.stringify(requestBody),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // ignore
      }

      console.log("Mangofy create response meta:", JSON.stringify({ status: res.status, ok: res.ok, mode }));
      if (json) console.log("Mangofy response:", JSON.stringify(json));

      return { res, json, mode };
    };

    // Attempt 1: raw API key (as per docs examples)
    let attempt = await callMangofy(apiKey, "raw");

    // Attempt 2: Bearer API key (some APIs require it even if examples omit)
    if (!attempt.res.ok && (attempt.res.status === 401 || attempt.res.status === 403 || attempt.json?.error)) {
      const errText = String(attempt.json?.error || attempt.json?.message || "");
      if (errText.toLowerCase().includes("inválid") || errText.toLowerCase().includes("inval") || errText.toLowerCase().includes("autoriza")) {
        attempt = await callMangofy(`Bearer ${apiKey}`, "bearer");
      }
    }

    const data = attempt.json;

    if (!attempt.res.ok) {
      console.error("Mangofy error:", data);
      throw new Error(data?.message || data?.error || "Failed to create PIX payment");
    }

    // Create Supabase client to save transaction
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save transaction in database
    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: data.payment_code || externalCode,
      amount: amount,
      product_name: description || "Pagamento PIX",
      status: "waiting_payment",
      user_name: "Cliente",
      user_email: "cliente@email.com",
      user_cpf: "00000000000",
      page_origin: "mangofy",
      payment_code: data.pix?.qr_code || data.qr_code || data.pix_code,
    });

    if (insertError) {
      console.error("Error saving transaction:", insertError);
    }

    return new Response(
      JSON.stringify({
        id: data.payment_code || externalCode,
        paymentId: data.payment_code,
        status: "PENDING",
        pix_code: data.pix?.qr_code || data.qr_code || data.pix_code,
        externalId: externalCode,
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
