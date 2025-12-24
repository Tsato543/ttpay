import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    const { idTransaction, status } = body;

    if (!idTransaction || !status) {
      console.error('Missing required fields:', { idTransaction, status });
      return new Response(
        JSON.stringify({ error: 'idTransaction and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if status is paid or approved
    const isPaid = status.toLowerCase() === 'paid' || status.toLowerCase() === 'approved';

    if (isPaid) {
      console.log('Payment confirmed, updating transaction:', idTransaction);
      
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id_transaction', idTransaction);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Transaction updated successfully');
    } else {
      console.log('Status is not paid/approved:', status);
      
      // Update status anyway for tracking
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: status.toLowerCase() })
        .eq('id_transaction', idTransaction);

      if (updateError) {
        console.error('Error updating transaction status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: isPaid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in moneyforpay-webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
