import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  id: string;
  title: string;
  description?: string;
  price: number;
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  address: string;
  city: string;
  state: string;
  images?: string[];
  status: string;
  offer_type: string;
  featured?: boolean;
  segment?: string;
  subtype?: string;
  permit_number?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get WordPress credentials
    const wpSiteUrl = Deno.env.get('WORDPRESS_SITE_URL');
    const wpApiUser = Deno.env.get('WORDPRESS_API_USER');
    const wpApiPassword = Deno.env.get('WORDPRESS_API_PASSWORD');

    if (!wpSiteUrl || !wpApiUser || !wpApiPassword) {
      throw new Error('WordPress credentials not configured');
    }

    const { propertyId, action = 'update', publishStatus = 'publish' } = await req.json();

    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    console.log(`[WordPress Sync] Starting sync for property: ${propertyId}, action: ${action}`);

    // Fetch property data
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      throw new Error(`Failed to fetch property: ${fetchError?.message}`);
    }

    // Transform CRM data to WordPress format
    const wpProperty = transformPropertyForWordPress(property as PropertyData, publishStatus);

    // Create or update WordPress post
    let wpResponse;
    const authHeader = 'Basic ' + btoa(`${wpApiUser}:${wpApiPassword}`);

    if (property.wp_id && action === 'update') {
      // Update existing post
      console.log(`[WordPress Sync] Updating post ${property.wp_id}`);
      wpResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts/${property.wp_id}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wpProperty),
      });
    } else {
      // Create new post
      console.log('[WordPress Sync] Creating new post');
      wpResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wpProperty),
      });
    }

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      throw new Error(`WordPress API error: ${wpResponse.status} - ${errorText}`);
    }

    const wpPost = await wpResponse.json();

    // Update property with WordPress data
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        wp_id: wpPost.id,
        wp_slug: wpPost.slug,
        wp_permalink: wpPost.link,
        wp_sync_status: 'success',
        wp_last_sync_at: new Date().toISOString(),
        wp_sync_error: null,
      })
      .eq('id', propertyId);

    if (updateError) {
      console.error('[WordPress Sync] Failed to update property:', updateError);
    }

    // Log sync
    await supabase.from('portal_sync_logs').insert({
      property_id: propertyId,
      portal: 'wordpress',
      action: property.wp_id ? 'update' : 'create',
      status: 'success',
      request_data: wpProperty,
      response_data: wpPost,
    });

    console.log('[WordPress Sync] Sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        wp_id: wpPost.id,
        wp_slug: wpPost.slug,
        wp_permalink: wpPost.link,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WordPress Sync] Error:', error);

    // Log failed sync
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json().catch(() => ({}));
    const propertyId = requestBody.propertyId;

    if (propertyId) {
      await supabase.from('properties').update({
        wp_sync_status: 'failed',
        wp_sync_error: error.message,
        wp_last_sync_at: new Date().toISOString(),
      }).eq('id', propertyId);

      await supabase.from('portal_sync_logs').insert({
        property_id: propertyId,
        portal: 'wordpress',
        action: requestBody.action || 'update',
        status: 'failed',
        error_message: error.message,
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function transformPropertyForWordPress(property: PropertyData, status: string) {
  // Build content with property details
  let content = `<div class="property-details">`;
  
  if (property.description) {
    content += `<p>${property.description.replace(/\n/g, '<br>')}</p>`;
  }

  content += `<ul class="property-features">`;
  if (property.bedrooms !== null && property.bedrooms !== undefined) {
    content += `<li><strong>Bedrooms:</strong> ${property.bedrooms === 0 ? 'Studio' : property.bedrooms}</li>`;
  }
  if (property.bathrooms) {
    content += `<li><strong>Bathrooms:</strong> ${property.bathrooms}</li>`;
  }
  if (property.area_sqft) {
    content += `<li><strong>Area:</strong> ${property.area_sqft} sqft</li>`;
  }
  content += `<li><strong>Type:</strong> ${property.property_type}</li>`;
  content += `<li><strong>Status:</strong> ${property.status}</li>`;
  content += `<li><strong>Offer:</strong> ${property.offer_type === 'sale' ? 'For Sale' : 'For Rent'}</li>`;
  if (property.permit_number) {
    content += `<li><strong>Permit:</strong> ${property.permit_number}</li>`;
  }
  content += `</ul></div>`;

  return {
    title: property.title,
    content: content,
    status: status,
    meta: {
      property_id: property.id,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area_sqft: property.area_sqft,
      property_type: property.property_type,
      offer_type: property.offer_type,
      address: property.address,
      city: property.city,
      state: property.state,
    },
    // Add categories/tags if needed
    categories: [property.property_type, property.offer_type],
  };
}
