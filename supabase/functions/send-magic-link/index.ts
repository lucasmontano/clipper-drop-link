import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLinkRequest {
  email: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Recebida requisição de magic link");
    const { email, fileName, fileSize, fileType }: MagicLinkRequest = await req.json();
    console.log("Dados recebidos:", { email, fileName, fileSize, fileType });
    
    // Verificar se a chave do Resend está configurada
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }
    console.log("Resend API Key configurada:", resendApiKey ? "Sim" : "Não");
    
    // Generate upload token
    const uploadToken = crypto.randomUUID();
    console.log("Token gerado:", uploadToken);
    
    // Create upload session
    const { error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        email,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        upload_token: uploadToken
      });

    if (sessionError) {
      console.error("Erro ao criar sessão no banco:", sessionError);
      throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
    }
    console.log("Sessão criada com sucesso no banco de dados");

    // Send magic link email
    // Generate magic link pointing to verify-upload function
    const baseUrl = req.headers.get('origin') || 'https://04be28f4-ccd4-4ce3-9c85-335f2daa750c.lovableproject.com';
    const magicLink = `https://qajnfujinlwashzzatbc.supabase.co/functions/v1/verify-upload?token=${uploadToken}`;
    
    console.log("Tentando enviar email via Resend...");
    console.log("Magic link:", magicLink);
    
    const emailResponse = await resend.emails.send({
      from: "Clipper Upload <noreply@clipper.lucasmontano.com>",
      to: [email],
      subject: "🎬 Seu Magic Link - Clipper",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">🎬 Bem-vindo ao Clipper!</h1>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Olá!</p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Você solicitou fazer upload do arquivo: <strong style="color: #007bff;">${fileName}</strong>
            </p>
            
            <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="color: #007bff; margin-top: 0;">📹 O que é o Clipper?</h3>
              <p style="color: #555; margin-bottom: 10px;">O Clipper é uma plataforma onde você pode:</p>
              <ul style="color: #555; margin: 10px 0; padding-left: 20px;">
                <li>Enviar seus vídeos/clips de forma segura</li>
                <li>Ganhar dinheiro com as visualizações</li>
                <li>Acompanhar o desempenho dos seus uploads</li>
                <li>Receber pagamentos automáticos via PayPal</li>
              </ul>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Para confirmar e autorizar o upload do seu clip, clique no botão abaixo:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                🚀 Confirmar Upload
              </a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>⏰ Importante:</strong> Este link expira em 1 hora por segurança.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 14px; text-align: center;">
                Se você não solicitou este upload, pode ignorar este email com segurança.
              </p>
              <p style="color: #888; font-size: 12px; text-align: center; margin-top: 15px;">
                © 2024 Clipper - Transformando seus vídeos em renda
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Resposta do Resend:", JSON.stringify(emailResponse, null, 2));
    
    if (emailResponse.error) {
      console.error("Erro no Resend:", emailResponse.error);
      throw new Error(`Erro no envio: ${emailResponse.error.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Magic link enviado para seu email" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro ao enviar magic link:", error);
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