import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ThankYouEmailRequest {
  userEmail: string;
  submissionType: 'file_upload' | 'url_link';
  fileName?: string;
  videoUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, submissionType, fileName, videoUrl }: ThankYouEmailRequest = await req.json();

    console.log('Sending thank you email to:', userEmail);

    const submissionDetails = submissionType === 'file_upload' 
      ? `arquivo "${fileName}"` 
      : `link: ${videoUrl}`;

    const emailResponse = await resend.emails.send({
      from: "Clippers <onboarding@resend.dev>",
      to: [userEmail],
      subject: "🎬 Obrigado por enviar seu clipe!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Clipe Recebido - Clippers</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎬 Clipe Recebido!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Olá!</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Obrigado por enviar seu clipe para análise! Recebemos com sucesso seu ${submissionDetails}.
            </p>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">📊 Próximos Passos</h3>
              <p style="margin-bottom: 10px;">
                <strong>Em 7 dias</strong>, nossa equipe irá analisar a contagem de visualizações do seu vídeo para avaliar seu desempenho.
              </p>
              <p style="margin-bottom: 0;">
                Até lá, você pode <strong>prosseguir e postar o vídeo</strong> normalmente em suas redes sociais!
              </p>
            </div>
            
            <div style="background: #f1f8e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
              <h3 style="color: #388e3c; margin-top: 0;">✅ O que você pode fazer agora:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Poste seu vídeo nas redes sociais</li>
                <li>Compartilhe com seus seguidores</li>
                <li>Aguarde nossa análise em 7 dias</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6c757d; text-align: center;">
              Dúvidas? Entre em contato conosco respondendo este email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="text-align: center; margin: 0;">
              <strong style="color: #495057;">Equipe Clippers</strong><br>
              <span style="color: #6c757d; font-size: 14px;">Transformando clipes em sucessos</span>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-thank-you-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);