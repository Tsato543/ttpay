import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a truly unique reference to avoid ID reuse
function generateUniqueReference(): string {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2, 10);
  const random2 = Math.random().toString(36).substring(2, 10);
  const random3 = crypto.randomUUID().substring(0, 8);
  return `REF-${timestamp}-${random1}-${random2}-${random3}`;
}

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

    // Generate truly unique reference to ensure new transaction each time
    const reference = generateUniqueReference();

    const payload = {
      amount,
      description: description || "Upsell",
      // Paradise Pags parece reutilizar transações quando recebe o mesmo identificador.
      // Enviamos o mesmo valor em múltiplos campos comuns para forçar unicidade.
      reference,
      external_id: reference,
      id: reference,
      productHash,
      customer: {
        name: customer?.name || "Cliente",
        email: customer?.email || "cliente@email.com",
        document: customer?.document || "00000000000",
        phone: customer?.phone || "00000000000"
      }
    };

    console.log("Sending request to Paradise Pags with unique reference:", reference);

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

    const transactionId = data.transaction_id || data.id;
    
    // Check if this transaction ID already exists and is paid (shouldn't happen with unique reference)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("id_transaction", String(transactionId))
      .maybeSingle();

    if (existingTx && (existingTx.status === "paid" || existingTx.status === "APPROVED")) {
      console.error("Transaction ID already exists and is paid! This shouldn't happen:", transactionId);
      return new Response(
        JSON.stringify({ error: "Erro: transação duplicada. Tente novamente." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store new transaction in database
    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: String(transactionId),
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
