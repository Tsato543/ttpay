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

    console.log("Checking ZyroPay PIX payment status:", id);

    // Create Supabase client to check our local cache
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have a confirmed payment in our transactions table
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

    // ZyroPay uses webhooks for payment confirmation
    // Since we don't have a direct status endpoint, we return PENDING
    // The actual confirmation will come via webhook
    return new Response(
      JSON.stringify({
        id: id,
        status: "PENDING",
        method: "PIX",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in zyropay-pix-status:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
