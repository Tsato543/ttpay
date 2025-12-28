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

    // Store transaction in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const existsByTransactionId = async (transactionId: string) => {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("id")
        .eq("id_transaction", transactionId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking existing transaction:", error);
        // Fail closed: if we can't verify, treat as existing to avoid reusing a possibly paid/expired PIX.
        return true;
      }

      return !!(rows && rows.length > 0);
    };

    // Paradise pode (às vezes) devolver transaction_id reciclado. Nesse caso o PIX pode aparecer como
    // "expirado"/"já utilizado" no banco do usuário. Então tentamos gerar novamente com outra referência.
    // Aumentamos para 5 tentativas com delay entre elas para maior confiabilidade.
    const MAX_CREATE_ATTEMPTS = 5;
    let data: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
      // Delay entre tentativas (exceto na primeira)
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
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
          phone: customer?.phone || "00000000000",
        },
      };

      console.log(`Sending request to Paradise Pags (attempt ${attempt}/${MAX_CREATE_ATTEMPTS}):`, JSON.stringify(payload));

      const response = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const respJson = await response.json();
      console.log("Paradise Pags response:", JSON.stringify(respJson));

      if (!response.ok || respJson.error) {
        lastError = respJson;
        console.error("Paradise Pags API error:", respJson);
        break;
      }

      const transactionId = String(respJson.transaction_id || respJson.id);

      if (await existsByTransactionId(transactionId)) {
        console.warn(
          "Gateway returned an existing transaction_id (likely reused). Retrying to avoid expired/used PIX:",
          transactionId
        );
        lastError = { error: "duplicate_transaction_id", transactionId };
        continue;
      }

      data = respJson;
      break;
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          error:
            lastError?.message ||
            lastError?.error ||
            "Não foi possível gerar um novo PIX agora. Clique em 'Tentar novamente'.",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = String(data.transaction_id || data.id);

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
      page_origin: "paradise-upsell",
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
        expires_at: data.expires_at || null,
        status: "PENDING",
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
