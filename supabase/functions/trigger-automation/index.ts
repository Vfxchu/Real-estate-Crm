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
    console.log('Trigger automation request:', req.method);
    
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { triggerType, data, workflowId } = await req.json();
    console.log('Trigger data:', { triggerType, workflowId, data });

    if (!triggerType) {
      return new Response('Missing triggerType', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get active workflows for this trigger type
    let query = supabase
      .from('automation_workflows')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', triggerType);

    if (workflowId) {
      query = query.eq('id', workflowId);
    }

    const { data: workflows, error: workflowError } = await query;

    if (workflowError) {
      console.error('Error fetching workflows:', workflowError);
      return new Response(JSON.stringify({ error: 'Failed to fetch workflows' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!workflows || workflows.length === 0) {
      console.log('No active workflows found for trigger type:', triggerType);
      return new Response(JSON.stringify({ message: 'No workflows to trigger' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // Execute each workflow
    for (const workflow of workflows) {
      try {
        // Create execution record
        const { data: execution, error: executionError } = await supabase
          .from('automation_executions')
          .insert({
            workflow_id: workflow.id,
            trigger_data: data || {},
            status: 'running'
          })
          .select()
          .single();

        if (executionError) {
          console.error('Error creating execution record:', executionError);
          continue;
        }

        // Trigger n8n workflow if webhook URL exists
        if (workflow.webhook_url) {
          console.log('Triggering n8n workflow:', workflow.webhook_url);
          
          const n8nResponse = await fetch(workflow.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...data,
              executionId: execution.id,
              workflowId: workflow.id,
              triggerType
            }),
          });

          if (!n8nResponse.ok) {
            throw new Error(`n8n webhook failed: ${n8nResponse.statusText}`);
          }

          const n8nResult = await n8nResponse.json();
          
          // Update execution with success
          await supabase
            .from('automation_executions')
            .update({
              status: 'success',
              execution_result: n8nResult,
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);

          results.push({
            workflowId: workflow.id,
            executionId: execution.id,
            status: 'success',
            result: n8nResult
          });
        } else {
          // No webhook URL, mark as failed
          await supabase
            .from('automation_executions')
            .update({
              status: 'failed',
              error_message: 'No webhook URL configured',
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);

          results.push({
            workflowId: workflow.id,
            executionId: execution.id,
            status: 'failed',
            error: 'No webhook URL configured'
          });
        }
      } catch (error) {
        console.error('Error executing workflow:', workflow.id, error);
        
        // Update execution with error
        if (execution?.id) {
          await supabase
            .from('automation_executions')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);
        }

        results.push({
          workflowId: workflow.id,
          status: 'failed', 
          error: error.message
        });
      }
    }

    console.log('Automation results:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      triggeredCount: workflows.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in trigger-automation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});