import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting delayed email check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Find all pending emails created more than 10 minutes ago
    const { data: pendingEmails, error: emailError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", tenMinutesAgo);

    if (emailError) {
      console.error("Error fetching pending emails:", emailError);
      throw emailError;
    }

    console.log(`Found ${pendingEmails?.length || 0} pending emails older than 10 min`);

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending emails to process", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const emailRecord of pendingEmails) {
      try {
        console.log(`Sending email to ${emailRecord.email}...`);

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TikTok Bonus <contato@saibamaisttk.com>",
            to: [emailRecord.email],
            subject: "Sua conta foi aprovada - acesse agora",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a1a;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);">
                  
                  <div style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 26px; font-weight: 600;">Parabéns, ${emailRecord.nome}!</h1>
                    <p style="color: #E91E63; margin: 0; font-size: 16px; font-weight: 500;">Sua conta foi aprovada</p>
                  </div>
                  
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
        console.log("Email sent:", emailResult);

        // Mark as sent
        await supabase
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", emailRecord.id);

        sentCount++;
      } catch (sendError) {
        console.error(`Error sending email to ${emailRecord.email}:`, sendError);
        
        await supabase
          .from("email_queue")
          .update({ status: "failed" })
          .eq("id", emailRecord.id);

        errorCount++;
      }
    }

    console.log(`Done: ${sentCount} sent, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        failed: errorCount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
