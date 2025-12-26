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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID do pagamento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking Arkama PIX payment status:", id);

    // First check our local database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: transaction } = await supabase
      .from("transactions")
      .select("status, paid_at")
      .eq("id_transaction", id)
      .single();

    if (transaction && transaction.status === "APPROVED") {
      console.log("Payment found as APPROVED in database");
      return new Response(
        JSON.stringify({
          id: id,
          status: "APPROVED",
          method: "PIX",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check with Arkama API
    const apiToken = Deno.env.get("ARKAMA_API_TOKEN");
    if (!apiToken) {
      console.error("ARKAMA_API_TOKEN not configured");
      // Return DB status or PENDING if no API token
      return new Response(
        JSON.stringify({
          id: id,
          status: transaction?.status || "PENDING",
          method: "PIX",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Arkama API - Get order status
    const arkamaResponse = await fetch(`${ARKAMA_BASE_URL}/orders/${id}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
    });

    const responseText = await arkamaResponse.text();
    console.log("Arkama status response:", arkamaResponse.status, responseText);

    if (!arkamaResponse.ok) {
      // If API check fails, return the DB status or PENDING
      return new Response(
        JSON.stringify({
          id: id,
          status: transaction?.status || "PENDING",
          method: "PIX",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arkamaData = JSON.parse(responseText);
    
    // Map Arkama status to our status
    // Arkama statuses: UNDEFINED, PENDING, PAID, CANCELED, REFUSED, CHARGEDBACK, REFUNDED, IN_ANALYSIS, IN_DISPUTE, PROCESSING, PRE_CHARGEDBACK
    let status = "PENDING";
    if (arkamaData.status === "PAID") {
      status = "APPROVED";
      
      // Update database
      await supabase
        .from("transactions")
        .update({ status: "APPROVED", paid_at: new Date().toISOString() })
        .eq("id_transaction", id);
    } else if (arkamaData.status === "CANCELED" || arkamaData.status === "REFUSED" || arkamaData.status === "CHARGEDBACK" || arkamaData.status === "REFUNDED") {
      status = "CANCELLED";
    } else if (arkamaData.status === "PENDING" || arkamaData.status === "PROCESSING" || arkamaData.status === "IN_ANALYSIS") {
      status = "PENDING";
    }

    return new Response(
      JSON.stringify({
        id: id,
        status: status,
        method: "PIX",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in arkama-pix-status:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
