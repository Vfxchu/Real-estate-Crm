import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Check for notifications that should be sent within the next 5 minutes
    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('sent_at', null)
      .lte('scheduled_for', fiveMinutesFromNow.toISOString())
      .gte('scheduled_for', now.toISOString());

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    const results = [];

    // Process each notification
    for (const notification of pendingNotifications || []) {
      try {
        // Mark notification as sent
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ sent_at: now.toISOString() })
          .eq('id', notification.id);

        if (updateError) {
          console.error('Error updating notification:', updateError);
          continue;
        }

        // Here you could integrate with external notification services
        // like email, SMS, push notifications, etc.
        
        console.log(`Notification processed: ${notification.title} for user ${notification.user_id}`);
        results.push({
          id: notification.id,
          status: 'sent',
          title: notification.title
        });

      } catch (notificationError) {
        console.error('Error processing notification:', notificationError);
        results.push({
          id: notification.id,
          status: 'error',
          error: notificationError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});