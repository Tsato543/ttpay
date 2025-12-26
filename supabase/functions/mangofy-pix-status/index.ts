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

    if (!apiKey) {
      throw new Error("Mangofy API key not configured");
    }

    // Check payment status via Mangofy API
    const response = await fetch(`https://checkout.mangofy.com.br/api/v1/payment/${paymentCode}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Mangofy status response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("Mangofy error:", data);
      throw new Error(data.message || "Failed to check payment status");
    }

    // Map Mangofy status to our status format
    let status = "PENDING";
    if (data.payment_status === "approved" || data.status === "approved" || data.status === "paid") {
      status = "APPROVED";
    } else if (data.payment_status === "cancelled" || data.status === "cancelled" || data.status === "expired") {
      status = "CANCELLED";
    }

    return new Response(
      JSON.stringify({
        id: paymentCode,
        status: status,
        method: "PIX",
        raw_status: data.payment_status || data.status,
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
