import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Verify upload request received:", req.method, req.url);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    console.log("Token extracted:", token);
    
    if (!token) {
      console.log("No token provided");
      return new Response(JSON.stringify({ error: "Token não fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify and update upload session
    console.log("Looking for session with token:", token);
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('upload_token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    console.log("Session query result:", { session, sessionError });

    if (sessionError || !session) {
      console.log("Session not found or expired");
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark session as verified
    const { error: updateError } = await supabase
      .from('upload_sessions')
      .update({ is_verified: true })
      .eq('upload_token', token);

    if (updateError) {
      throw new Error(`Erro ao verificar sessão: ${updateError.message}`);
    }

    // Check if this is a web request (from clicking the magic link)
    const userAgent = req.headers.get('user-agent') || '';
    const isWebRequest = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
    
    if (isWebRequest) {
      // Redirect to success page for web requests
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://04be28f4-ccd4-4ce3-9c85-335f2daa750c.lovableproject.com/upload-success?token=${token}`
        }
      });
    }

    // Return JSON for API requests
    return new Response(JSON.stringify({ 
      success: true, 
      uploadToken: token,
      message: "Upload autorizado! Você pode agora fazer upload do seu vídeo." 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro ao verificar upload:", error);
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