import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { message, context, conversationId, stream = true } = await req.json();

    console.log('[AI Assistant] Request from user:', user.id);
    console.log('[AI Assistant] Context:', context);

    // Get conversation history if conversationId provided
    let conversationHistory: any[] = [];
    if (conversationId) {
      const { data: messages } = await supabase
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);
      
      conversationHistory = messages || [];
    }

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(context, user);

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages,
        stream,
        max_completion_tokens: 1000,
        tools: getAvailableTools(context),
        tool_choice: 'auto',
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('[AI Assistant] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    if (stream) {
      // Return streaming response
      return new Response(openAIResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Return non-streaming response
      const data = await openAIResponse.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('[AI Assistant] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function buildSystemPrompt(context: any, user: any): string {
  const basePrompt = `You are an AI assistant for DKV Real Estate CRM. You help users manage properties, contacts, leads, and automate workflows.

Current user: ${user.email}
Current page: ${context?.page || 'dashboard'}

You can:
- Answer questions about the CRM
- Suggest actions based on current context
- Search and filter data
- Generate summaries and reports
- Help create and update records

Keep responses concise and actionable. Use bullet points when listing multiple items.`;

  // Add context-specific instructions
  if (context?.page === 'properties') {
    return basePrompt + '\n\nYou are currently on the Properties page. Focus on helping with property-related tasks.';
  } else if (context?.page === 'contacts' || context?.page === 'leads') {
    return basePrompt + '\n\nYou are currently on the Contacts/Leads page. Focus on helping with contact management and lead nurturing.';
  } else if (context?.page === 'calendar') {
    return basePrompt + '\n\nYou are currently on the Calendar page. Focus on helping with event scheduling and task management.';
  }

  return basePrompt;
}

function getAvailableTools(context: any): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'search_properties',
        description: 'Search for properties by criteria (location, type, price range, etc.)',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query or criteria' },
            propertyType: { type: 'string', description: 'Property type filter' },
            minPrice: { type: 'number', description: 'Minimum price' },
            maxPrice: { type: 'number', description: 'Maximum price' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_task',
        description: 'Create a new task or reminder',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            dueDate: { type: 'string', description: 'Due date (ISO format)' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'summarize_data',
        description: 'Generate a summary of properties, contacts, or leads',
        parameters: {
          type: 'object',
          properties: {
            dataType: { type: 'string', enum: ['properties', 'contacts', 'leads'] },
            filters: { type: 'object', description: 'Optional filters' },
          },
          required: ['dataType'],
        },
      },
    },
  ];
}
