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

    const trySign = async (bkt: string, pth: string) => {
      return await admin.storage.from(bkt).createSignedUrl(pth, 900, { download: fileRow.name });
    };

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._\/-]/g, '_');

    // 1) Try primary
    let primary = await trySign(bucket, fileRow.path);
    if (!primary.error && primary.data?.signedUrl) {
      return new Response(JSON.stringify({ signedUrl: primary.data.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 2) Try alternate bucket with same path
    const alternateBucket = bucket === 'property-layouts' ? 'property-docs' : 'property-layouts';
    let alternate = await trySign(alternateBucket, fileRow.path);
    if (!alternate.error && alternate.data?.signedUrl) {
      console.warn('Bucket mismatch recovered', { id, userId, expectedBucket: bucket, actualBucket: alternateBucket });
      return new Response(JSON.stringify({ signedUrl: alternate.data.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 3) Try sanitized path in primary
    const sanitizedPath = sanitize(fileRow.path);
    if (sanitizedPath !== fileRow.path) {
      primary = await trySign(bucket, sanitizedPath);
      if (!primary.error && primary.data?.signedUrl) {
        console.warn('Sanitized path recovered (primary)', { id, userId, original: fileRow.path, sanitized: sanitizedPath });
        return new Response(JSON.stringify({ signedUrl: primary.data.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // 4) Try sanitized path in alternate
      alternate = await trySign(alternateBucket, sanitizedPath);
      if (!alternate.error && alternate.data?.signedUrl) {
        console.warn('Sanitized path recovered (alternate)', { id, userId, original: fileRow.path, sanitized: sanitizedPath, bucket: alternateBucket });
        return new Response(JSON.stringify({ signedUrl: alternate.data.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    console.error('Sign error (all strategies failed)', { id, userId, path: fileRow.path, bucket });
    return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    return new Response(JSON.stringify({ signedUrl: signed.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error('docs-signed-url fatal', e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});