import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const wpUrl = Deno.env.get('WORDPRESS_SITE_URL');
    const wpUser = Deno.env.get('WORDPRESS_API_USERNAME');
    const wpPassword = Deno.env.get('WORDPRESS_API_PASSWORD');

    if (!wpUrl || !wpUser || !wpPassword) {
      throw new Error('WordPress credentials not configured');
    }

    // Fetch all published items from WordPress (supports custom post types)
    const postType = Deno.env.get('WORDPRESS_POST_TYPE') || 'posts'

    const baseHeaders = {
      'Authorization': 'Basic ' + btoa(`${wpUser}:${wpPassword}`),
      'Accept': 'application/json',
      'User-Agent': 'DKV-CRM-WordPressSync/1.0',
    } as const

    const candidates = [
      `${wpUrl}/wp-json/wp/v2/${postType}?status=publish&per_page=100`,
      `${wpUrl}/?rest_route=/wp/v2/${postType}&status=publish&per_page=100`,
    ]

    let wpResponse: Response | null = null
    let lastBody = ''
    for (const url of candidates) {
      const res = await fetch(url, { headers: baseHeaders })
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || !contentType.includes('application/json')) {
        try { lastBody = await res.text() } catch {}
        continue
      }
      wpResponse = res
      break
    }

    if (!wpResponse) {
      throw new Error(`WordPress API error: could not retrieve JSON from endpoints for ${postType}. Sample response: ${lastBody.slice(0,300)}`)
    }

    const wpPosts = await wpResponse.json();
    
    let synced = 0;
    let created = 0;
    let updated = 0;

    for (const post of wpPosts) {
      const wpId = post.id;

      // Check if this property already exists in our CRM
      const { data: existing } = await supabaseClient
        .from('properties')
        .select('id, wp_id')
        .eq('wp_id', wpId)
        .single();

      // Extract property data from WordPress post meta
      const meta = post.meta || {};
      
      const propertyData = {
        wp_id: wpId,
        wp_slug: post.slug,
        wp_permalink: post.link,
        wp_sync_status: 'success',
        wp_last_sync_at: new Date().toISOString(),
        title: post.title?.rendered || 'Untitled Property',
        description: post.content?.rendered?.replace(/<[^>]*>/g, '') || '',
        property_type: meta.property_type || 'apartment',
        offer_type: meta.offer_type || 'sale',
        price: parseFloat(meta.price) || 0,
        bedrooms: parseInt(meta.bedrooms) || null,
        bathrooms: parseInt(meta.bathrooms) || null,
        area_sqft: parseInt(meta.area_sqft) || null,
        address: meta.address || '',
        city: meta.city || 'Unknown',
        state: meta.state || 'Dubai',
        status: 'available',
        featured_image: post.featured_media_url || null,
      };

      if (existing) {
        // Update existing property
        const { error } = await supabaseClient
          .from('properties')
          .update(propertyData)
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating property ${wpId}:`, error);
        } else {
          updated++;
        }
      } else {
        // Create new property
        // We need to assign to a default agent - let's get the first admin
        const { data: admin } = await supabaseClient
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (admin) {
          const { error } = await supabaseClient
            .from('properties')
            .insert({
              ...propertyData,
              agent_id: admin.user_id,
              created_by: admin.user_id,
            });

          if (error) {
            console.error(`Error creating property ${wpId}:`, error);
          } else {
            created++;
          }
        }
      }

      synced++;
    }

    // Log the sync
    await supabaseClient
      .from('portal_sync_logs')
      .insert({
        portal: 'wordpress',
        action: 'bulk_sync',
        status: 'success',
        property_id: '00000000-0000-0000-0000-000000000000', // Use a null UUID for bulk operations
        response_data: { synced, created, updated },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced,
        created,
        updated,
        message: `Synced ${synced} properties (${created} created, ${updated} updated)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing from WordPress:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
