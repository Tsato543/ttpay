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

    // Arkama webhook format:
    // {
    //   "event": "ORDER_STATUS_CHANGED",
    //   "data": {
    //     "id": "OREKNLFMQCTF",
    //     "status": "PAID",
    //     "value": "100.00",
    //     "paymentMethod": "PIX",
    //     ...
    //   }
    // }

    const event = payload.event;
    const data = payload.data || payload;
    
    const orderId = data.id || data.order_id || data.orderId;
    const status = data.status;

    console.log(`Arkama webhook: Event=${event}, Order=${orderId}, Status=${status}`);

    if (!orderId) {
      console.log("No order ID in webhook payload");
      return new Response(
        JSON.stringify({ success: false, message: "No order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only process PAID status from ORDER_STATUS_CHANGED event
    if (event !== "ORDER_STATUS_CHANGED" || status !== "PAID") {
      console.log(`Ignoring webhook: event=${event}, status=${status}`);
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
