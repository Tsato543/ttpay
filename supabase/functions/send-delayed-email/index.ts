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

    for (const emailRecord of pendingEmails) {
      try {
        console.log(`Sending email to: ${emailRecord.email}`);

        // Send email using Resend API directly
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Equipe de Suporte <contato@saibamaisttk.com>",
            to: [emailRecord.email],
            subject: "Lembrete: você tem um processo em andamento",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <div style="background: #25d366; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Olá, ${emailRecord.nome}!</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px 25px;">
                    <p style="color: #444; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Passando para lembrar que você começou um cadastro conosco e ainda não finalizou.
                    </p>
                    
                    <p style="color: #444; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Seus dados estão salvos e você pode continuar de onde parou a qualquer momento.
                    </p>
                    
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <p style="color: #666; font-size: 14px; margin: 0 0 10px;">Dados cadastrados:</p>
                      <p style="color: #1a1a1a; font-size: 14px; margin: 5px 0;"><strong>Nome:</strong> ${emailRecord.nome}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://ttpayentreg.lovable.app" 
                         style="display: inline-block; background: #25d366; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 15px; font-weight: 500;">
                        Continuar cadastro
                      </a>
                    </div>
                    
                    <p style="color: #888; font-size: 13px; text-align: center; margin-top: 30px;">
                      Se não foi você, pode ignorar este email.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                      Equipe de Suporte
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

    console.log(`Completed: ${sentCount} sent, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${pendingEmails.length} emails`,
        sent: sentCount,
        failed: errorCount 
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
