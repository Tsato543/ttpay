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
      return new Response(
        JSON.stringify({ error: "API token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arkamaResponse = await fetch(`https://api.arkama.app/v1/pix/qrcode/${id}`, {
      method: "GET",
      headers: {
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
    let status = "PENDING";
    if (arkamaData.status === "paid" || arkamaData.status === "PAID" || arkamaData.status === "approved" || arkamaData.status === "APPROVED") {
      status = "APPROVED";
      
      // Update database
      await supabase
        .from("transactions")
        .update({ status: "APPROVED", paid_at: new Date().toISOString() })
        .eq("id_transaction", id);
    } else if (arkamaData.status === "cancelled" || arkamaData.status === "CANCELLED" || arkamaData.status === "expired" || arkamaData.status === "EXPIRED") {
      status = "CANCELLED";
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
