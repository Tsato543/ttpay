import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, productHash, customer } = await req.json();
    
    console.log("Creating Paradise Pags PIX payment:", { amount, description, productHash });

    const apiKey = Deno.env.get("PARADISE_PAGS_API_KEY");
    if (!apiKey) {
      console.error("PARADISE_PAGS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference with more entropy to prevent reuse
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 10);
    const extraRandom = crypto.randomUUID().split('-')[0];
    const reference = `UP-${timestamp}-${randomPart}-${extraRandom}`;

    const payload = {
      amount,
      description: description || "Upsell",
      reference,
      productHash,
      customer: {
        name: customer?.name || "Cliente",
        email: customer?.email || "cliente@email.com",
        document: customer?.document || "00000000000",
        phone: customer?.phone || "00000000000"
      }
    };

    console.log("Sending request to Paradise Pags:", JSON.stringify(payload));

    const response = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Paradise Pags response:", JSON.stringify(data));

    if (!response.ok || data.error) {
      console.error("Paradise Pags API error:", data);
      return new Response(
        JSON.stringify({ error: data.error || data.message || "Erro ao criar pagamento" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store transaction in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const transactionId = data.transaction_id || data.id;

    // If the gateway returns a transaction id we already have, treat it as stale/duplicate.
    // This prevents reusing an old paid/expired PIX and causing false redirects.
    const { data: existingTx, error: existingErr } = await supabase
      .from("transactions")
      .select("id, status, created_at, paid_at")
      .eq("id_transaction", transactionId)
      .maybeSingle();

    if (existingErr) {
      console.error("Error checking existing transaction:", existingErr);
    }

    if (existingTx) {
      console.warn("Duplicate/stale transaction id returned by gateway; refusing:", transactionId);
      return new Response(
        JSON.stringify({ error: "Transação duplicada detectada. Clique em 'Tentar novamente' para gerar um novo PIX." }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: transactionId,
      product_name: description || "Upsell",
      amount: amount / 100,
      user_name: customer?.name || "Cliente",
      user_email: customer?.email || "cliente@email.com",
      user_cpf: customer?.document || "00000000000",
      user_phone: customer?.phone || null,
      payment_code: data.qr_code,
      status: "waiting_payment",
      page_origin: "paradise-upsell"
    });

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
    } else {
      console.log("Transaction inserted successfully:", transactionId);
    }

    return new Response(
      JSON.stringify({
        id: transactionId,
        qr_code: data.qr_code,
        status: "PENDING"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Exception in paradise-pix-create:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
