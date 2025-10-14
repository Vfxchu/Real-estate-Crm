import { supabase } from "@/integrations/supabase/client";
import { uploadFile, deleteFile } from "./storage";

export interface PropertyFile {
  id: string;
  property_id: string;
  name: string;
  path: string;
  type: 'document' | 'layout';
  size: number;
  created_at: string;
}

export async function listPropertyFiles(propertyId: string) {
  const { data, error } = await supabase
    .from('property_files')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function uploadPropertyFile(
  propertyId: string,
  file: File,
  type: 'document' | 'layout'
) {
  const bucket = type === 'layout' ? 'property-layouts' : 'property-docs';
  const filePath = `${propertyId}/${Date.now()}_${file.name}`;

  // Upload to storage
  const { error: uploadError } = await uploadFile(bucket, filePath, file);
  if (uploadError) return { data: null, error: uploadError };

  // Create DB record
  const { data, error } = await supabase
    .from('property_files')
    .insert({
      property_id: propertyId,
      name: file.name,
      path: filePath,
      type,
      size: file.size
    })
    .select()
    .single();

  if (error) {
    // Cleanup storage if DB insert fails
    await deleteFile(bucket, filePath);
    return { data: null, error };
  }

  // Log activity (activities table doesn't have property_id, so we skip logging or use description only)
  await supabase.from('activities').insert({
    type: 'file_upload',
    description: `Uploaded ${type}: ${file.name} for property ${propertyId}`,
    created_by: (await supabase.auth.getUser()).data.user?.id
  });

  return { data, error: null };
}

export async function deletePropertyFile(fileId: string) {
  // Get file details first
  const { data: file, error: fetchError } = await supabase
    .from('property_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (fetchError || !file) return { error: fetchError || new Error('File not found') };

  const bucket = file.type === 'layout' ? 'property-layouts' : 'property-docs';

  // Delete from storage
  const { error: storageError } = await deleteFile(bucket, file.path);
  if (storageError) return { error: storageError };

  // Delete from DB
  const { error } = await supabase
    .from('property_files')
    .delete()
    .eq('id', fileId);

  if (error) return { error };

  // Log activity (activities table doesn't have property_id, so we skip logging or use description only)
  await supabase.from('activities').insert({
    type: 'file_delete',
    description: `Deleted ${file.type}: ${file.name} from property ${file.property_id}`,
    created_by: (await supabase.auth.getUser()).data.user?.id
  });

  return { error: null };
}

export async function getPropertyFileUrl(file: PropertyFile) {
  try {
    const { data, error } = await supabase.functions.invoke('docs-signed-url', {
      body: { id: file.id }
    });
    if (error) throw new Error(error.message || 'Failed to generate signed URL');
    return (data as any)?.signedUrl || null;
  } catch (err) {
    console.error('getPropertyFileUrl error:', err);
    return null;
  }
}
