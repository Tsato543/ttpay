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
    const payload = await req.json();
    console.log("Arkama webhook received:", JSON.stringify(payload));

    // Arkama webhook payload format 2.0.0:
    // {
    //   "id": "order_id",
    //   "status": "PAID" | "PENDING" | "CANCELED" | "REFUSED",
    //   "externalRef": "...",
    //   "value": 10.00,
    //   ...
    // }

    const orderId = payload.id || payload.order_id || payload.orderId;
    const status = payload.status;
    const externalRef = payload.externalRef || payload.external_ref;

    if (!orderId) {
      console.log("No order ID in webhook payload");
      return new Response(
        JSON.stringify({ success: false, message: "No order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Arkama webhook: Order ${orderId} status: ${status}`);

    // Only process PAID status
    if (status !== "PAID") {
      console.log("Ignoring non-PAID webhook:", status);
      return new Response(
        JSON.stringify({ success: true, message: "Ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update transaction status in database
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "APPROVED",
        paid_at: new Date().toISOString(),
      })
      .eq("id_transaction", orderId);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      // Still return success to webhook sender
    } else {
      console.log("Transaction updated to APPROVED:", orderId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in arkama-webhook:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
