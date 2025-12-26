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

    // First check local database for cached status
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: transaction } = await supabase
      .from("transactions")
      .select("status, paid_at")
      .eq("id_transaction", id)
      .maybeSingle();

    // If already approved in our database, return immediately
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
      throw new Error("ARKAMA_API_TOKEN not configured");
    }

    const response = await fetch(`${ARKAMA_BASE_URL}/orders/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "User-Agent": "TikTokBonus",
        "accept": "application/json",
      },
    });

    const data = await response.json();
    console.log("Arkama status response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("Arkama API error:", data);
      // Return PENDING if we can't check status
      return new Response(
        JSON.stringify({
          id: id,
          status: "PENDING",
          method: "PIX",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Arkama status to our status
    // Arkama: PENDING, PAID, CANCELED, REFUSED, etc.
    const arkamaStatus = data.status || data.data?.status;
    let mappedStatus = "PENDING";

    if (arkamaStatus === "PAID") {
      mappedStatus = "APPROVED";
      
      // Update our database
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "APPROVED",
          paid_at: new Date().toISOString(),
        })
        .eq("id_transaction", id);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
      } else {
        console.log("Transaction updated to APPROVED:", id);
      }
    } else if (arkamaStatus === "CANCELED" || arkamaStatus === "REFUSED") {
      mappedStatus = "CANCELED";
    }

    return new Response(
      JSON.stringify({
        id: id,
        status: mappedStatus,
        method: "PIX",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in arkama-pix-status:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
