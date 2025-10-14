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
    const { id } = req.method === 'POST' ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing file id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const userId = userData.user.id;

    const { data: fileRow, error: fileErr } = await supabase
      .from('contact_files')
      .select('id, path, type, name, created_by')
      .eq('id', id)
      .single();

    if (fileErr || !fileRow) {
      return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: isAdminData } = await supabase.rpc('is_admin');
    const isAdmin = Boolean(isAdminData);

    const isUploader = fileRow.created_by === userId;

    if (!(isAdmin || isUploader)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const trySign = async (pth: string) => {
      return await admin.storage.from('documents').createSignedUrl(pth, 900, { download: fileRow.name });
    }

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._\/-]/g, '_');

    // 1) Try original path
    let signedRes = await trySign(fileRow.path);
    if (!signedRes.error && signedRes.data?.signedUrl) {
      return new Response(JSON.stringify({ signedUrl: signedRes.data.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 2) Try sanitized path
    const sanitizedPath = sanitize(fileRow.path);
    if (sanitizedPath !== fileRow.path) {
      signedRes = await trySign(sanitizedPath);
      if (!signedRes.error && signedRes.data?.signedUrl) {
        console.warn('Sanitized path recovered (contact)', { id, userId, original: fileRow.path, sanitized: sanitizedPath });
        return new Response(JSON.stringify({ signedUrl: signedRes.data.signedUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    console.error('Sign error (contact) all strategies failed', { id, userId, path: fileRow.path });
    return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error('contact-docs-signed-url fatal', e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
