import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeStatus(status: string): string {
  const statusLower = status?.toLowerCase() || "";
  
  if (["paid", "approved", "confirmed"].includes(statusLower)) {
    return "APPROVED";
  }
  
  if (statusLower === "pending") {
    return "PENDING";
  }
  
  return status?.toUpperCase() || "PENDING";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get("id");

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Payment ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking Mangofy payment status for:", paymentId);

    const apiKey = Deno.env.get("MANGOFY_API_KEY");
    const storeCode = Deno.env.get("MANGOFY_STORE_CODE");

    if (!apiKey || !storeCode) {
      console.error("Missing Mangofy credentials");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First check local database for confirmed payment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: transaction } = await supabase
      .from("transactions")
      .select("status, paid_at")
      .eq("id_transaction", paymentId)
      .maybeSingle();

    if (transaction && transaction.status === "APPROVED") {
      console.log("Payment found as APPROVED in database");
      return new Response(
        JSON.stringify({
          id: paymentId,
          status: "APPROVED",
          method: "pix"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Mangofy API for status
    const response = await fetch(`https://checkout.mangofy.com.br/api/v1/payment/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": apiKey,
        "Store-Code": storeCode
      }
    });

    const responseText = await response.text();
    console.log("Mangofy status response:", response.status, responseText);

    if (!response.ok) {
      // If API fails, return pending status
      console.error("Mangofy API error:", responseText);
      return new Response(
        JSON.stringify({
          id: paymentId,
          status: "PENDING",
          method: "pix"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response:", e);
      return new Response(
        JSON.stringify({
          id: paymentId,
          status: "PENDING",
          method: "pix"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mangofy returns { data: { payment_status: "approved" } }
    const rawStatus = data.data?.payment_status || data.payment_status || data.status || "pending";
    const normalizedStatus = normalizeStatus(rawStatus);

    console.log("Raw status:", rawStatus, "Normalized:", normalizedStatus);

    // Update database if payment is approved
    if (normalizedStatus === "APPROVED") {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ 
          status: "APPROVED",
          paid_at: new Date().toISOString()
        })
        .eq("id_transaction", paymentId);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
      } else {
        console.log("Transaction marked as APPROVED in database");
      }
    }

    return new Response(
      JSON.stringify({
        id: paymentId,
        status: normalizedStatus,
        method: "pix"
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
