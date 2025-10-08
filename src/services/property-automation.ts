import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-assign seller/landlord tags to owner contact based on property offer_type
 */
export async function ensureOwnerTag(
  ownerLeadId: string,
  offerType: 'rent' | 'sale'
): Promise<{ success: boolean; error?: string }> {
  try {
    const tag = offerType === 'sale' ? 'seller' : 'landlord';

    // Get current tags
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('interest_tags')
      .eq('id', ownerLeadId)
      .single();

    if (fetchError) {
      console.error('Error fetching owner lead:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const currentTags: string[] = Array.isArray(lead?.interest_tags) ? lead.interest_tags : [];

    // Only update if tag doesn't exist
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];

      const { error: updateError } = await supabase
        .from('leads')
        .update({ interest_tags: newTags })
        .eq('id', ownerLeadId);

      if (updateError) {
        console.error('Error updating owner tags:', updateError);
        return { success: false, error: updateError.message };
      }

      // Log activity
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('activities').insert({
        lead_id: ownerLeadId,
        type: 'note',
        description: `Auto-added tag '${tag}' from property offer_type`,
        created_by: userData.user?.id
      });

      console.log(`Successfully added '${tag}' tag to owner (lead ${ownerLeadId})`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in ensureOwnerTag:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Link property to owner and auto-assign appropriate tag
 */
export async function linkPropertyToOwner(
  propertyId: string,
  ownerLeadId: string,
  offerType: 'rent' | 'sale'
): Promise<void> {
  // Update property with owner
  await supabase
    .from('properties')
    .update({ owner_contact_id: ownerLeadId })
    .eq('id', propertyId);

  // Auto-assign seller/landlord tag
  await ensureOwnerTag(ownerLeadId, offerType);

  // Log activity
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from('activities').insert({
    type: 'note',
    description: `Linked owner contact and assigned ${offerType === 'sale' ? 'seller' : 'landlord'} tag for property ${propertyId}`,
    created_by: userData.user?.id
  });
}
