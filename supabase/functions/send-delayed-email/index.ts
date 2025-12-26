import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting delayed email check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find emails that are pending and were created more than 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", tenMinutesAgo)
      .limit(10);

    if (fetchError) {
      console.error("Error fetching pending emails:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingEmails?.length || 0} emails to send`);

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No emails to send", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const emailRecord of pendingEmails) {
      try {
        // Check if user has paid the R$37.37 fee (3737 centavos)
        const { data: paidTransaction, error: txError } = await supabase
          .from("transactions")
          .select("id, status, amount")
          .eq("user_email", emailRecord.email)
          .eq("amount", 37.37)
          .in("status", ["paid", "APPROVED", "approved", "PAID"])
          .limit(1);

        if (txError) {
          console.error(`Error checking payment for ${emailRecord.email}:`, txError);
        }

        // Skip if no payment found
        if (!paidTransaction || paidTransaction.length === 0) {
          console.log(`Skipping ${emailRecord.email} - no payment of R$37.37 found`);
          skippedCount++;
          continue;
        }

        console.log(`Payment verified for ${emailRecord.email}, sending email...`);

        // Send email using Resend API directly
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TikTok Bonus <contato@saibamaisttk.com>",
            to: [emailRecord.email],
            subject: "Lembrete: você tem um processo em andamento",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a1a;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 26px; font-weight: 600;">Parabéns, ${emailRecord.nome}!</h1>
                    <p style="color: #E91E63; margin: 0; font-size: 16px; font-weight: 500;">Sua conta foi aprovada</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 35px 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                      Analisamos seu perfil e temos uma boa notícia: você foi selecionado(a) para acessar nossa plataforma exclusiva.
                    </p>
                    
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                      Clique no botão abaixo para acessar sua conta e começar a aproveitar todos os benefícios.
                    </p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="https://ttpayentreg.lovable.app" 
                         style="display: inline-block; background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%); color: #ffffff; text-decoration: none; padding: 16px 50px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(233, 30, 99, 0.4);">
                        Acessar Minha Conta
                      </a>
                    </div>
                    
                    <p style="color: #888; font-size: 13px; text-align: center; margin-top: 30px; line-height: 1.5;">
                      Guarde este email. Você receberá mais informações em breve.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                      Você recebeu este email porque se cadastrou em nossa plataforma.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        const emailResult = await emailResponse.json();
        console.log("Email sent successfully:", emailResult);

        // Update status to sent
        await supabase
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", emailRecord.id);

        sentCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${emailRecord.email}:`, emailError);
        
        // Mark as failed
        await supabase
          .from("email_queue")
          .update({ status: "failed" })
          .eq("id", emailRecord.id);

        errorCount++;
      }
    }

    console.log(`Completed: ${sentCount} sent, ${errorCount} failed, ${skippedCount} skipped (no payment)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${pendingEmails.length} emails`,
        sent: sentCount,
        failed: errorCount,
        skipped: skippedCount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-delayed-email:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
