// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clients call via supabase.functions.invoke with POST { id }
    const { id } = req.method === 'POST' ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing file id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth-bound client to read with user's RLS context
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // Admin client for signing URLs
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Identify requester
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const userId = userData.user.id;

    // Fetch file row
    const { data: fileRow, error: fileErr } = await supabase
      .from('property_files')
      .select('id, path, type, name, created_by, property_id')
      .eq('id', id)
      .single();

    if (fileErr || !fileRow) {
      return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Get property to check agent
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .select('agent_id')
      .eq('id', fileRow.property_id)
      .single();

    if (propErr || !prop) {
      return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Is admin?
    const { data: isAdminData } = await supabase.rpc('is_admin');
    const isAdmin = Boolean(isAdminData);

    // Authorization: admin OR uploader OR property agent
    const isUploader = fileRow.created_by === userId;
    const isAgent = prop.agent_id === userId;

    if (!(isAdmin || isUploader || isAgent)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const bucket = fileRow.type === 'layout' ? 'property-layouts' : 'property-docs';

    const { data: signed, error: signErr } = await admin
      .storage
      .from(bucket)
      .createSignedUrl(fileRow.path, 900, { download: fileRow.name });

    if (signErr || !signed?.signedUrl) {
      console.error('Sign error', { id, userId, error: signErr });
      return new Response(JSON.stringify({ error: "Could not generate download URL" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ signedUrl: signed.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error('docs-signed-url fatal', e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});