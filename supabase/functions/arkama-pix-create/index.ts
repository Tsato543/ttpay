import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARKAMA_BASE_URL = "https://app.arkama.com.br/api/v1";

function digitsOnly(v: string) {
  return (v || "").replace(/\D/g, "");
}

function ensureFullName(name: string) {
  const trimmed = (name || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "Cliente Silva";
  if (trimmed.split(" ").length >= 2) return trimmed;
  return `${trimmed} Silva`;
}

function normalizeTo11Digits(cell: string) {
  let d = digitsOnly(cell);

  // drop country code
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("55")) d = d.slice(2);

  // 10 digits (DD + 8-digit) -> add 9 after DDD
  if (d.length === 10) d = `${d.slice(0, 2)}9${d.slice(2)}`;

  return d;
}

function formatMasked(cell11: string) {
  const d = normalizeTo11Digits(cell11);
  if (d.length !== 11) return null;
  const ddd = d.slice(0, 2);
  const nine = d.slice(2); // 9 digits
  const part1 = nine.slice(0, 5);
  const part2 = nine.slice(5);
  return `(${ddd})${part1}-${part2}`; // no space
}

function buildCellphoneVariants(input: string) {
  const d11 = normalizeTo11Digits(input);
  const masked = formatMasked(d11);

  const variants = [
    masked, // (DD)99999-9999
    d11, // 11 digits
    d11 ? `0${d11}` : null, // 0 + 11 digits
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  // de-duplicate
  return Array.from(new Set(variants));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, customer } = await req.json();

    const apiToken = Deno.env.get("ARKAMA_API_TOKEN");
    if (!apiToken) throw new Error("ARKAMA_API_TOKEN not configured");

    const valueInReais = amount / 100;
    const externalRef = `pix-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ip = forwardedFor.split(",")[0].trim() || "127.0.0.1";

    const baseCustomer = {
      name: ensureFullName(customer?.name || "Cliente"),
      email: (customer?.email || "cliente@pagamento.com").trim(),
      document: digitsOnly(customer?.document || "00000000000"),
    };

    const cellphoneVariants = buildCellphoneVariants(customer?.phone || "");
    const tried: Array<{ cellphone: string; response: unknown }> = [];

    const makeRequestBody = (cellphone: string) => ({
      paymentMethod: "pix",
      value: valueInReais,
      customer: { ...baseCustomer, cellphone },
      items: [
        {
          title: "Taxa PIX",
          quantity: 1,
          unitPrice: valueInReais,
          isDigital: true,
        },
      ],
      shipping: {
        address: {
          cep: "01310100",
          city: "Sao Paulo",
          state: "SP",
          street: "Avenida Paulista",
          neighborhood: "Bela Vista",
          number: "1000",
          complement: "",
        },
      },
      ip,
      externalRef,
    });

    console.log("Creating Arkama PIX payment:", {
      amount,
      valueInReais,
      description,
      customer: { ...baseCustomer, cellphoneVariants },
      ip,
    });

    let responseData: any = null;

    for (const cellphone of cellphoneVariants.length ? cellphoneVariants : ["(11)99999-9999"]) {
      const requestBody = makeRequestBody(String(cellphone));
      console.log("Arkama request body:", JSON.stringify(requestBody));

      const res = await fetch(`${ARKAMA_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      tried.push({ cellphone, response: data });
      console.log("Arkama create PIX response:", JSON.stringify(data));

      const cellphoneError =
        data?.errors?.["customer.cellphone"]?.[0] ||
        data?.errors?.customer?.cellphone?.[0] ||
        (typeof data?.message === "string" && data.message.includes("customer.cellphone") ? data.message : null);

      if (res.ok && !data?.error && data?.success !== false) {
        responseData = data;
        break;
      }

      // retry only when the error is specifically about cellphone
      if (!cellphoneError) {
        responseData = data;
        break;
      }
    }

    if (!responseData) {
      return new Response(
        JSON.stringify({ error: "Erro inesperado: sem resposta da Arkama" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If Arkama returned an error
    if (responseData?.error || responseData?.success === false || responseData?.errors) {
      return new Response(
        JSON.stringify({
          error: responseData.message || responseData.error || "Erro ao criar pagamento",
          tried_cellphones: cellphoneVariants,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = responseData.id || responseData.data?.id;
    const pixCode = responseData.pix?.payload || responseData.data?.pix?.payload;

    if (!orderId || !pixCode) {
      console.error("Missing orderId or pixCode in response:", responseData);
      return new Response(
        JSON.stringify({ error: "Resposta inválida da API" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const usedCellphone = responseData?.customer?.cellphone || responseData?.data?.customer?.cellphone || baseCustomer;

    const { error: insertError } = await supabase.from("transactions").insert({
      id_transaction: orderId,
      amount,
      product_name: description || "Taxa PIX",
      status: "PENDING",
      payment_code: pixCode,
      user_cpf: baseCustomer.document,
      user_email: baseCustomer.email,
      user_name: baseCustomer.name,
      user_phone: String((responseData?.customer?.cellphone as string) || cellphoneVariants[0] || ""),
      page_origin: "index",
    });

    if (insertError) console.error("Error inserting transaction:", insertError);

    return new Response(
      JSON.stringify({
        id: orderId,
        status: "PENDING",
        pix_code: pixCode,
        externalRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in arkama-pix-create:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
