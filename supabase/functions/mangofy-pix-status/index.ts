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
    const paymentCode = url.searchParams.get("id");

    if (!paymentCode) {
      throw new Error("Payment code is required");
    }

    console.log("Checking Mangofy payment status:", paymentCode);

    const apiKey = Deno.env.get("MANGOFY_API_KEY");
    const storeCode = Deno.env.get("MANGOFY_STORE_CODE");

    if (!apiKey || !storeCode) {
      throw new Error("Mangofy credentials not configured");
    }

    // Check payment status via Mangofy API
    // Docs examples show Authorization as raw API key; we also try Bearer for compatibility.
    const callMangofy = async (authorizationValue: string, mode: "raw" | "bearer") => {
      const res = await fetch(`https://checkout.mangofy.com.br/api/v1/payment/${paymentCode}`, {
        method: "GET",
        headers: {
          Authorization: authorizationValue,
          "Store-Code": storeCode,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // ignore
      }

      console.log("Mangofy status response meta:", JSON.stringify({ status: res.status, ok: res.ok, mode }));
      if (json) console.log("Mangofy status response:", JSON.stringify(json));

      return { res, json, mode };
    };

    let attempt = await callMangofy(apiKey, "raw");

    if (!attempt.res.ok && (attempt.res.status === 401 || attempt.res.status === 403 || attempt.json?.error)) {
      const errText = String(attempt.json?.error || attempt.json?.message || "");
      if (errText.toLowerCase().includes("inválid") || errText.toLowerCase().includes("inval") || errText.toLowerCase().includes("autoriza")) {
        attempt = await callMangofy(`Bearer ${apiKey}`, "bearer");
      }
    }

    const data = attempt.json;

    if (!attempt.res.ok) {
      console.error("Mangofy error:", data);
      throw new Error(data?.message || data?.error || "Failed to check payment status");
    }

    // Map Mangofy status to our status format
    // Mangofy statuses: approved, pending, refunded, error
    let status = "PENDING";
    if (data.payment_status === "approved") {
      status = "APPROVED";
    } else if (data.payment_status === "refunded" || data.payment_status === "error") {
      status = "CANCELLED";
    }

    return new Response(
      JSON.stringify({
        id: paymentCode,
        status: status,
        method: "PIX",
        raw_status: data.payment_status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in mangofy-pix-status:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
