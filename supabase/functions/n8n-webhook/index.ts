import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('n8n webhook received:', req.method, req.url);
    
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // Validate webhook signature for security - REQUIRED
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
    
    // Fail fast if secret not configured
    if (!webhookSecret) {
      console.error('N8N_WEBHOOK_SECRET not configured - rejecting request');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (signature !== webhookSecret) {
      console.error('Unauthorized: Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    console.log('Webhook payload:', body);

    const { workflowId, executionId, data, status, error } = body;

    if (!workflowId) {
      return new Response('Missing workflowId', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Update execution status
    const { error: updateError } = await supabase
      .from('automation_executions')
      .update({
        status: status || 'success',
        execution_result: data || {},
        completed_at: new Date().toISOString(),
        error_message: error || null
      })
      .eq('id', executionId);

    if (updateError) {
      console.error('Error updating execution:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update execution' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Execution updated successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in n8n-webhook function:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});