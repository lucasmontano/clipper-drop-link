import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatePaymentRequest {
  userEmail: string;
  totalViews: number;
  paymentAmount: number;
  submissionIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userEmail, totalViews, paymentAmount, submissionIds }: CreatePaymentRequest = await req.json();
    
    console.log('Create payment request:', { userEmail, totalViews, paymentAmount, submissionIds });

    // Get user_id from email - this should be the recipient's email, not the admin's
    console.log('Looking up profile for email:', userEmail);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    console.log('Profile lookup result:', { profiles, profileError });

    if (profileError || !profiles) {
      console.error('Profile lookup failed:', profileError);
      throw new Error(`User profile not found for: ${userEmail}. Error: ${profileError?.message || 'No profile data'}`);
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: profiles.id,
        user_email: userEmail,
        total_views: totalViews,
        payment_amount: paymentAmount,
        submission_ids: submissionIds,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Send payment notification email
    const emailResponse = await resend.emails.send({
      from: "Clipper <clipper@clipper.lucasmontano.com>",
      to: [userEmail],
      subject: "Solicitação de Pagamento - Forneça seus Dados do PayPal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Solicitação de Pagamento</h1>
          
          <p>Olá,</p>
          
          <p>Ótimas notícias! Estamos prontos para processar um pagamento pelos seus vídeos enviados.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Detalhes do Pagamento:</h2>
            <ul>
              <li><strong>Total de Visualizações:</strong> ${totalViews.toLocaleString()}</li>
              <li><strong>Valor do Pagamento:</strong> $${paymentAmount.toFixed(2)}</li>
              <li><strong>Data do Pagamento:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
            </ul>
          </div>
          
          <h3 style="color: #333;">Próximos Passos:</h3>
          <ol>
            <li>Forneça o endereço de e-mail da sua conta PayPal</li>
            <li>Crie uma fatura simples com seus dados</li>
            <li>Encaminhe este e-mail junto com seus dados do PayPal e a fatura para: <strong>comercial@lucasmontano.com</strong></li>
          </ol>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Importante:</strong> Inclua seu endereço de e-mail do PayPal na sua resposta para garantir que possamos processar seu pagamento rapidamente.</p>
          </div>
          
          <p>Se você tiver alguma dúvida sobre este pagamento, não hesite em nos contatar.</p>
          
          <p>Atenciosamente,<br>
          Equipe Clipper</p>
        </div>
      `,
    });

    console.log("Payment created and email sent:", { payment, emailResponse });

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment,
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in create-payment function:", error);
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