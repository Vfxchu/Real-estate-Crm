import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  agentId: string;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  notificationType: 'assignment' | 'reassignment' | 'update';
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agentId, leadId, leadName, leadEmail, leadPhone, notificationType } = await req.json() as NotificationRequest;

    console.log('[NOTIFICATION] Processing notification:', { agentId, leadId, notificationType });

    // Get agent details
    const { data: agent, error: agentError } = await supabaseClient
      .from('profiles')
      .select('name, email')
      .eq('user_id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentError?.message}`);
    }

    // Create in-app notification
    const notificationMessage = notificationType === 'assignment' 
      ? `New lead "${leadName}" has been assigned to you`
      : notificationType === 'reassignment'
      ? `Lead "${leadName}" has been reassigned to you due to SLA breach`
      : `Lead "${leadName}" has been updated`;

    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: agentId,
        title: notificationType === 'assignment' ? 'New Lead Assignment' : 
               notificationType === 'reassignment' ? 'Lead Reassignment' : 'Lead Update',
        message: notificationMessage,
        type: notificationType === 'reassignment' ? 'warning' : 'info',
        priority: notificationType === 'reassignment' ? 'high' : 'medium',
        lead_id: leadId,
      });

    if (notifError) {
      console.error('[NOTIFICATION] Error creating notification:', notifError);
      throw notifError;
    }

    console.log('[NOTIFICATION] In-app notification created successfully');

    // Note: Email sending would require additional setup (Resend API key)
    // For now, we're creating in-app notifications only
    // To enable email notifications, add Resend integration:
    // 1. Add RESEND_API_KEY to Supabase secrets
    // 2. Uncomment the email sending code below

    /*
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && agent.email) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CRM Notifications <notifications@yourdomain.com>',
          to: [agent.email],
          subject: notificationType === 'assignment' ? 'New Lead Assignment' : 'Lead Update',
          html: `
            <h2>${notificationMessage}</h2>
            <p><strong>Lead Details:</strong></p>
            <ul>
              <li>Name: ${leadName}</li>
              ${leadEmail ? `<li>Email: ${leadEmail}</li>` : ''}
              ${leadPhone ? `<li>Phone: ${leadPhone}</li>` : ''}
            </ul>
            <p>Please log in to the CRM to view full details and take action.</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('[NOTIFICATION] Email sending failed:', await emailResponse.text());
      } else {
        console.log('[NOTIFICATION] Email sent successfully');
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification created successfully',
        notificationCreated: true,
        emailSent: false, // Set to true when email integration is enabled
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[NOTIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
