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

    // Accept both GET (?id=) and POST ({ id }) for easier frontend integration
    let transactionId = url.searchParams.get("id");
    if (!transactionId && req.method !== 'GET') {
      const body = await req.json().catch(() => null);
      transactionId = body?.id ?? null;
    }

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

    // Get the most recent transaction with this id_transaction (there may be duplicates)
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("id, created_at, status, paid_at")
      .eq("id_transaction", transactionId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (txErr) console.error("Error reading transaction from DB:", txErr);
    
    const txRow = txRows && txRows.length > 0 ? txRows[0] : null;
    console.log("Found transaction row:", txRow ? { id: txRow.id, status: txRow.status, created_at: txRow.created_at } : "none");

    // NOTE: Previously we attempted to flag "stale" transaction ids to prevent false redirects.
    // This caused false "PIX expirado" in real payments when the provider reused transaction ids.
    // We now always return the provider status and let the frontend proceed accordingly.

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

      // Update only the specific transaction row we found (using primary key id)
      if (txRow?.id) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("id", txRow.id);

        if (updateError) {
          console.error("Error updating transaction:", updateError);
        } else {
          console.log("Transaction updated to paid:", transactionId, "row id:", txRow.id);
        }
      } else {
        console.warn("No transaction row found to update for:", transactionId);
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
