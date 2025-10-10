import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate secret for security (since verify_jwt is false for cron jobs)
    const authSecret = Deno.env.get('SLA_MONITOR_SECRET');
    const providedSecret = req.headers.get('x-function-secret');

    if (authSecret && providedSecret !== authSecret) {
      console.error('[SLA Monitor] Unauthorized: Invalid secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log('[SLA Monitor] Starting SLA sweep...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Run the SLA reassignment sweep
    const { data: reassignedCount, error } = await supabase.rpc('reassign_overdue_leads', {
      p_minutes: 30
    });

    if (error) {
      console.error('[SLA Monitor] Error running SLA sweep:', error);
      throw error;
    }

    console.log(`[SLA Monitor] Reassigned ${reassignedCount} overdue leads`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reassignedCount,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err) {
    console.error('[SLA Monitor] Function error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ 
        error: message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});