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
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("id");

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Transaction ID required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Checking Paradise Pags payment status:", transactionId);

    const apiKey = Deno.env.get("PARADISE_PAGS_API_KEY");
    if (!apiKey) {
      console.error("PARADISE_PAGS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read our DB first to detect stale/duplicate transaction ids
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: txRow, error: txErr } = await supabase
      .from("transactions")
      .select("created_at, status, paid_at")
      .eq("id_transaction", transactionId)
      .maybeSingle();

    if (txErr) console.error("Error reading transaction from DB:", txErr);

    // If this transaction id is old, we consider it stale to prevent false approvals/redirects.
    // (PIX typically expires in minutes; if it's older than this, user should generate a new one.)
    const STALE_MINUTES = 30;
    if (txRow?.created_at) {
      const createdAtMs = Date.parse(txRow.created_at);
      const ageMinutes = (Date.now() - createdAtMs) / 60000;
      if (Number.isFinite(ageMinutes) && ageMinutes > STALE_MINUTES && txRow.paid_at) {
        console.warn("Stale paid transaction id detected; returning PENDING to avoid false redirect", {
          transactionId,
          ageMinutes,
        });
        return new Response(
          JSON.stringify({ status: "PENDING", stale: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response = await fetch(
      `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${transactionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        }
      }
    );

    const data = await response.json();
    console.log("Paradise Pags status response:", JSON.stringify(data));

    // Map Paradise status to our internal status
    let status = "PENDING";
    if (data.status === "approved" || data.status === "APPROVED" || data.status === "paid") {
      status = "APPROVED";

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id_transaction", transactionId);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
      } else {
        console.log("Transaction updated to paid:", transactionId);
      }
    } else if (data.status === "rejected" || data.status === "REJECTED") {
      status = "REJECTED";
    } else if (data.status === "canceled" || data.status === "CANCELED") {
      status = "CANCELED";
    }

    return new Response(
      JSON.stringify({ status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Exception in paradise-pix-status:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
