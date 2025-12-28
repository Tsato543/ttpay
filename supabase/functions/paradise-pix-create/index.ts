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


    // Generate short unique reference (max 15 chars) to avoid API truncation/dedup issues
    // Provider seems to apply aggressive idempotency; keep this mathematically unique.
    const makeReference = () => {
      const n = Math.floor(Math.random() * 1_000_000);
      return `UP${n}`; // e.g. UP839201 (<= 15 chars)
    };

    // Add timestamp to description to force uniqueness on API side
    const uniqueDescription = () => {
      const baseDesc = description || "Upsell";
      const timeStamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${baseDesc} - ${timeStamp}`;
    };

    // Email aliasing (Gmail-style) to force "new customer" identity on provider side.
    // IMPORTANT: we only send the aliased email to the provider; we keep the original email in our DB.
    const makeAliasedEmail = (email: string | undefined) => {
      const safeEmail = (email || "cliente@email.com").trim();
      const at = safeEmail.indexOf("@");
      if (at <= 0) return safeEmail;
      const local = safeEmail.slice(0, at);
      const domain = safeEmail.slice(at + 1);
      const stamp = Date.now();
      return `${local}+up${stamp}@${domain}`;
    };

    // Use the original productHash - it must match exactly what's configured in Paradise Pags

    const buildPayload = (reference: string) => {
      const originalEmail = customer?.email || "cliente@email.com";
      const aliasedEmail = makeAliasedEmail(originalEmail);

      return {
        amount,
        description: uniqueDescription(),
        reference,
        productHash,
        customer: {
          name: customer?.name || "Cliente",
          email: aliasedEmail,
          document: customer?.document || "00000000000",
          phone: customer?.phone || "00000000000",
        },
      };
    };

    const createRemotePix = async (payload: Record<string, unknown>) => {
      const p: any = payload;
      console.log("Tentando gerar PIX com Reference:", p?.reference, " e Email:", p?.customer?.email);
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

      // SAFETY CHECK: If this transaction_id already exists in our DB (paid OR unpaid), 
      // it's a recycled/zombie ID - we MUST reject it and force a new PIX
      const { data: existing, error: existingErr } = await supabase
        .from("transactions")
        .select("id, status, paid_at, created_at")
        .eq("id_transaction", transactionIdCandidate)
        .limit(1);

      if (existingErr) {
        console.error("Error checking existing transaction id:", existingErr);
        // if we can't verify, accept the candidate (risky but avoids blocking)
        referenceUsed = payload.reference as string;
        break;
      }

      const existingRow = existing && existing.length ? existing[0] : null;
      
      // CRITICAL: Reject ANY existing transaction_id, not just paid ones
      // This prevents monitoring a "zombie" transaction that won't update
      if (existingRow) {
        console.warn("🚨 Provider returned a RECYCLED transaction_id; forcing new PIX attempt", {
          transactionIdCandidate,
          existingRow: { 
            status: existingRow.status, 
            paid_at: existingRow.paid_at, 
            created_at: existingRow.created_at 
          },
          attempt: i + 1,
        });
        // Wait a bit before retry to increase entropy
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        continue;
      }

      // Good candidate - transaction_id is truly new
      console.log("✅ Got a fresh transaction_id:", transactionIdCandidate);
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
