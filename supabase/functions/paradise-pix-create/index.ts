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


    // Generate unique reference with more entropy to guarantee a NEW PIX every time
    const makeReference = () => {
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10);
      const extraRandom = crypto.randomUUID().split('-')[0];
      return `UP-${timestamp}-${randomPart}-${extraRandom}`;
    };

    // Use the original productHash - it must match exactly what's configured in Paradise Pags

    const buildPayload = (reference: string) => ({
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
    });

    const createRemotePix = async (payload: Record<string, unknown>) => {
      console.log("Sending request to Paradise Pags:", JSON.stringify(payload));

      const response = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Paradise Pags response:", JSON.stringify(data));

      return { response, data };
    };

    // Try a few times to avoid provider returning a previously used/paid transaction_id
    const MAX_CREATE_TRIES = 3;
    let lastData: any = null;
    let lastResponseOk = false;
    let referenceUsed = makeReference();

    for (let i = 0; i < MAX_CREATE_TRIES; i++) {
      referenceUsed = makeReference();
      const payload = buildPayload(referenceUsed);

      const { response, data } = await createRemotePix(payload);
      lastData = data;
      lastResponseOk = response.ok;

      if (!response.ok || data?.error) {
        // stop early; we'll return the API message below
        break;
      }

      const transactionIdCandidate = String(data.transaction_id || data.id || "");
      if (!transactionIdCandidate) {
        break;
      }

      // If this transaction_id already exists as PAID in our DB, it's likely reused; try again.
      const { data: existing, error: existingErr } = await supabase
        .from("transactions")
        .select("id, status, paid_at, created_at")
        .eq("id_transaction", transactionIdCandidate)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingErr) {
        console.error("Error checking existing transaction id:", existingErr);
        // if we can't verify, accept the candidate
        referenceUsed = payload.reference as string;
        break;
      }

      const existingRow = existing && existing.length ? existing[0] : null;
      if (existingRow?.paid_at || existingRow?.status === 'paid') {
        console.warn("Provider returned an already-paid transaction_id; retrying to force a new PIX", {
          transactionIdCandidate,
          existingRow: { status: existingRow.status, paid_at: existingRow.paid_at, created_at: existingRow.created_at },
        });
        // retry loop
        continue;
      }

      // Good candidate
      break;
    }

    if (!lastResponseOk || lastData?.error) {
      console.error("Paradise Pags API error:", lastData);
      // Return 200 so the client can read the error message from the body
      return new Response(
        JSON.stringify({ error: lastData?.message || lastData?.error || "Erro ao criar PIX" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = String(lastData.transaction_id || lastData.id);

    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: transactionId,
      product_name: description || "Upsell",
      amount: amount / 100,
      user_name: customer?.name || "Cliente",
      user_email: customer?.email || "cliente@email.com",
      user_cpf: customer?.document || "00000000000",
      user_phone: customer?.phone || null,
      payment_code: lastData.qr_code,
      status: "waiting_payment",
      page_origin: "paradise-upsell",
    });

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
    } else {
      console.log("Transaction inserted successfully:", transactionId, "reference:", referenceUsed);
    }

    return new Response(
      JSON.stringify({
        id: transactionId,
        qr_code: lastData.qr_code,
        expires_at: lastData.expires_at || null,
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
