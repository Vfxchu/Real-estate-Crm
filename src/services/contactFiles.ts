import { supabase } from "@/integrations/supabase/client";

export async function getContactFileUrl(id: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('contact-docs-signed-url', {
      body: { id }
    });

    if (error) {
      const status = error.context?.status || 500;
      throw { status, message: error.message || 'Failed to get file URL' };
    }

    if (!data?.signedUrl) {
      throw { status: 500, message: 'No signed URL received' };
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('getContactFileUrl error:', error);
    throw {
      status: error.status || 500,
      message: error.message || 'Failed to generate download URL'
    };
  }
}
