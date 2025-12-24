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
    console.log("ZyroPay webhook received:", JSON.stringify(payload));

    // ZyroPay PIX IN webhook payload:
    // {
    //   "movId": "...",
    //   "paymentId": "...",
    //   "value": "1",
    //   "confirmationDate": "2025-02-24T10:44:37-03:00",
    //   "externalId": "...",
    //   "type": "PixIn",
    //   "e2e": "...",
    //   "status": "CONFIRMED"
    // }

    const { movId, paymentId, value, confirmationDate, externalId, type, status } = payload;

    if (type !== "PixIn") {
      console.log("Ignoring non-PixIn webhook:", type);
      return new Response(
        JSON.stringify({ success: true, message: "Ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status !== "CONFIRMED") {
      console.log("Ignoring non-confirmed webhook:", status);
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
    const { data: transactionData, error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "APPROVED",
        paid_at: confirmationDate || new Date().toISOString(),
      })
      .eq("id_transaction", movId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating transaction:", updateError);
    } else {
      console.log("Transaction updated to APPROVED:", movId);

      // Send Pushcut notification
      const pushcutUrl = Deno.env.get("PUSHCUT_WEBHOOK_URL");
      if (pushcutUrl) {
        try {
          const valorFormatado = (transactionData?.amount / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });
          
          await fetch(pushcutUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "💰 Venda Aprovada!",
              text: `Produto: ${transactionData?.product_name || 'N/A'}\nValor: ${valorFormatado}`,
            }),
          });
          console.log("Pushcut notification sent successfully");
        } catch (pushcutError) {
          console.error("Error sending Pushcut notification:", pushcutError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in zyropay-webhook:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
