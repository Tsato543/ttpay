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
    const { idTransaction } = await req.json();
    
    console.log('Checking status for transaction:', idTransaction);
    
    if (!idTransaction) {
      return new Response(
        JSON.stringify({ error: 'idTransaction is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find transaction by id_transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id_transaction', idTransaction)
      .maybeSingle();

    if (error) {
      console.error('Error fetching transaction:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transaction) {
      console.log('Transaction not found:', idTransaction);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction found:', transaction);

    return new Response(
      JSON.stringify({
        idTransaction: transaction.id_transaction,
        status: transaction.status,
        paidAt: transaction.paid_at,
        amount: transaction.amount, // Already in reais
        productName: transaction.product_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in moneyforpay-status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
