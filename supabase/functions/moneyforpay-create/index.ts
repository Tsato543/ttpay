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
    const { amount, productName, pageOrigin } = await req.json();
    
    console.log('Request received:', { amount, productName, pageOrigin });
    
    if (!amount || !productName) {
      return new Response(
        JSON.stringify({ error: 'amount and productName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MONEYFORPAY_API_KEY = Deno.env.get('MONEYFORPAY_API_KEY');
    if (!MONEYFORPAY_API_KEY) {
      console.error('MONEYFORPAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fixed customer data
    const customer = {
      name: 'jose aarao quaresma',
      document: '12446759890',
      phone: '85999698083',
      email: 'tsato4539@gmail.com',
    };

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert cents to reais for API + DB comparisons
    const amountInReais = Number((amount / 100).toFixed(2));

    // Check for existing pending transaction for same CPF + productName + amount
    // (prevents reusing an old PIX code with a different value)
    console.log('Checking for existing pending transaction...');
    const { data: existingTransaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_cpf', customer.document)
      .eq('product_name', productName)
      .eq('status', 'waiting_payment')
      .eq('amount', amountInReais)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Error checking existing transaction:', findError);
    }

    if (existingTransaction?.payment_code) {
      console.log('Found existing pending transaction (same amount):', existingTransaction.id_transaction);
      return new Response(
        JSON.stringify({
          idTransaction: existingTransaction.id_transaction,
          paymentCode: existingTransaction.payment_code,
          status: 'waiting_payment',
          reused: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build postback URL
    const postBackUrl = `${supabaseUrl}/functions/v1/moneyforpay-webhook`;

    // amountInReais already computed above (from cents)

    // Create payment with MoneyForPay API
    console.log('Creating payment with MoneyForPay...');
    const payload = {
      amount: amountInReais, // API expects amount in reais
      provider: 'v2',
      method: 'pix',
      installments: 1,
      customer: {
        name: customer.name,
        document: customer.document,
        phone: customer.phone,
        email: customer.email,
      },
      productName: productName,
      postBackUrl: postBackUrl,
    };

    console.log('MoneyForPay payload:', JSON.stringify(payload));

    const response = await fetch('https://api.moneyforpay.com/v2/transactions/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MONEYFORPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('MoneyForPay response status:', response.status);
    console.log('MoneyForPay response:', responseText);

    if (!response.ok) {
      console.error('MoneyForPay API error:', responseText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment', details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = JSON.parse(responseText);
    console.log('Payment created:', paymentData);

    // Extract idTransaction and paymentCode from response
    const idTransaction = paymentData.idTransaction || paymentData.id || paymentData.transactionId;
    const paymentCode = paymentData.paymentCode || paymentData.pix_code || paymentData.pixCode || paymentData.code;

    if (!idTransaction || !paymentCode) {
      console.error('Missing required fields in response:', paymentData);
      return new Response(
        JSON.stringify({ error: 'Invalid response from payment gateway', data: paymentData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save transaction to database (amount already converted above)
    console.log('Saving transaction to database:', { idTransaction, amountInReais });

    const { error: insertError } = await supabase.from('transactions').insert({
      id_transaction: idTransaction,
      user_cpf: customer.document,
      user_email: customer.email,
      user_name: customer.name,
      user_phone: customer.phone,
      amount: amountInReais,
      product_name: productName,
      payment_code: paymentCode,
      status: 'waiting_payment',
      page_origin: pageOrigin || null,
    });

    if (insertError) {
      console.error('Error saving transaction:', insertError);
      // Don't fail the request, payment was already created
    } else {
      console.log('Transaction saved successfully');
    }

    return new Response(
      JSON.stringify({
        idTransaction: idTransaction,
        paymentCode: paymentCode,
        status: 'waiting_payment',
        reused: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in moneyforpay-create:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
