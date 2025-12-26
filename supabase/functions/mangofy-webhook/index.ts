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
    console.log("Mangofy webhook received:", JSON.stringify(payload));

    // Mangofy webhook payload structure:
    // {
    //   "payment_code": "...",
    //   "payment_status": "approved",
    //   "amount": 1000,
    //   "external_id": "...",
    //   ...
    // }

    const { payment_code, payment_status, amount, external_id, paid_at } = payload;

    // Only process approved payments
    if (payment_status !== "approved" && payment_status !== "paid") {
      console.log("Ignoring non-approved webhook:", payment_status);
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
        paid_at: paid_at || new Date().toISOString(),
      })
      .eq("id_transaction", payment_code)
      .select()
      .single();

    if (updateError) {
      // Try with external_id if payment_code didn't match
      const { data: txData, error: updateError2 } = await supabase
        .from("transactions")
        .update({
          status: "APPROVED",
          paid_at: paid_at || new Date().toISOString(),
        })
        .eq("id_transaction", external_id)
        .select()
        .single();

      if (updateError2) {
        console.error("Error updating transaction:", updateError2);
      } else {
        console.log("Transaction updated to APPROVED via external_id:", external_id);
        await sendNotifications(txData, paid_at);
      }
    } else {
      console.log("Transaction updated to APPROVED:", payment_code);
      await sendNotifications(transactionData, paid_at);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in mangofy-webhook:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendNotifications(transactionData: any, paidAt: string) {
  const pushcutUrl1 = Deno.env.get("PUSHCUT_WEBHOOK_URL");
  const pushcutUrl2 = Deno.env.get("PUSHCUT_WEBHOOK_URL_2");
  const utmifyUrl = Deno.env.get("UTMIFY_WEBHOOK_URL");

  const valorFormatado = (transactionData?.amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const notificationPayload = {
    title: "💰 Venda Aprovada!",
    text: valorFormatado,
  };

  const notifications = [];

  // Pushcut notifications
  if (pushcutUrl1) {
    notifications.push(
      fetch(pushcutUrl1, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPayload),
      })
        .then(() => console.log("Pushcut notification 1 sent successfully"))
        .catch((err) => console.error("Error sending Pushcut notification 1:", err))
    );
  }

  if (pushcutUrl2) {
    notifications.push(
      fetch(pushcutUrl2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPayload),
      })
        .then(() => console.log("Pushcut notification 2 sent successfully"))
        .catch((err) => console.error("Error sending Pushcut notification 2:", err))
    );
  }

  // Utmify webhook for conversion tracking
  if (utmifyUrl) {
    const utmifyPayload = {
      transaction_id: transactionData?.id_transaction,
      order_id: transactionData?.id,
      status: "approved",
      payment_method: "pix",
      customer_name: transactionData?.user_name,
      customer_email: transactionData?.user_email,
      customer_phone: transactionData?.user_phone,
      customer_document: transactionData?.user_cpf,
      product_name: transactionData?.product_name,
      amount_cents: transactionData?.amount,
      amount: transactionData?.amount / 100,
      currency: "BRL",
      created_at: transactionData?.created_at,
      paid_at: paidAt || new Date().toISOString(),
      page_origin: transactionData?.page_origin,
    };

    notifications.push(
      fetch(utmifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(utmifyPayload),
      })
        .then(() => console.log("Utmify webhook sent successfully"))
        .catch((err) => console.error("Error sending Utmify webhook:", err))
    );
  }

  await Promise.all(notifications);
}
