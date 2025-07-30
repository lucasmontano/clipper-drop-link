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
    const baseUrl = req.headers.get('origin') || 'http://localhost:5173';
    const magicLink = `${baseUrl}/upload?token=${uploadToken}`;
    
    console.log("Tentando enviar email via Resend...");
    console.log("Magic link:", magicLink);
    
    const emailResponse = await resend.emails.send({
      from: "Clipper Upload <onboarding@resend.dev>",
      to: [email],
      subject: "Confirme seu upload de vídeo",
      html: `
        <h1>Confirme seu upload de vídeo</h1>
        <p>Olá! Você solicitou fazer upload do arquivo: <strong>${fileName}</strong></p>
        <p>Para confirmar e autorizar o upload, clique no link abaixo:</p>
        <a href="${magicLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirmar Upload
        </a>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou este upload, pode ignorar este email.</p>
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