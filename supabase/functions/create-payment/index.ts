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

    // Get user_id from email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (profileError || !profiles) {
      throw new Error(`User not found: ${userEmail}`);
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
      subject: "Payment Request - Provide Your PayPal Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Payment Request</h1>
          
          <p>Hello,</p>
          
          <p>Great news! We're ready to process a payment for your video submissions.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Payment Details:</h2>
            <ul>
              <li><strong>Total Views:</strong> ${totalViews.toLocaleString()}</li>
              <li><strong>Payment Amount:</strong> $${paymentAmount.toFixed(2)}</li>
              <li><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          <h3 style="color: #333;">Next Steps:</h3>
          <ol>
            <li>Provide your PayPal account email address</li>
            <li>Create a simple invoice with your details</li>
            <li>Forward this email along with your PayPal details and invoice to: <strong>comercial@lucasmontano.com</strong></li>
          </ol>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Please include your PayPal email address in your response to ensure we can process your payment quickly.</p>
          </div>
          
          <p>If you have any questions about this payment, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          The Clipper Team</p>
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