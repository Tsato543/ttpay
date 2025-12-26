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

      // Send Pushcut notifications to both partners
      const pushcutUrl1 = Deno.env.get("PUSHCUT_WEBHOOK_URL");
      const pushcutUrl2 = Deno.env.get("PUSHCUT_WEBHOOK_URL_2");
      const utmifyUrl = Deno.env.get("UTMIFY_WEBHOOK_URL");
      
      const valorFormatado = (transactionData?.amount / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });

      const notificationPayload = {
        title: "💰 Venda Aprovada!",
        text: valorFormatado,
      };

      const notifications = [];

      if (pushcutUrl1) {
        notifications.push(
          fetch(pushcutUrl1, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(notificationPayload),
          }).then(() => console.log("Pushcut notification 1 sent successfully"))
            .catch((err) => console.error("Error sending Pushcut notification 1:", err))
        );
      }

      if (pushcutUrl2) {
        notifications.push(
          fetch(pushcutUrl2, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(notificationPayload),
          }).then(() => console.log("Pushcut notification 2 sent successfully"))
            .catch((err) => console.error("Error sending Pushcut notification 2:", err))
        );
      }

      // Send data to Utmify for conversion tracking
      if (utmifyUrl) {
        const utmifyPayload = {
          // Transaction data
          transaction_id: transactionData?.id_transaction || movId,
          order_id: transactionData?.id,
          status: "approved",
          payment_method: "pix",
          
          // Customer data
          customer_name: transactionData?.user_name,
          customer_email: transactionData?.user_email,
          customer_phone: transactionData?.user_phone,
          customer_document: transactionData?.user_cpf,
          
          // Product data
          product_name: transactionData?.product_name,
          
          // Value data (in cents and reais)
          amount_cents: transactionData?.amount,
          amount: transactionData?.amount / 100,
          currency: "BRL",
          
          // Timestamps
          created_at: transactionData?.created_at,
          paid_at: confirmationDate || new Date().toISOString(),
          
          // Source
          page_origin: transactionData?.page_origin,
        };

        notifications.push(
          fetch(utmifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(utmifyPayload),
          }).then(() => console.log("Utmify webhook sent successfully:", JSON.stringify(utmifyPayload)))
            .catch((err) => console.error("Error sending Utmify webhook:", err))
        );
      }

      await Promise.all(notifications);
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
