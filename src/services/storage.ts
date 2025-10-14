import { supabase } from "@/integrations/supabase/client";
import { validateFileUpload } from "@/lib/sanitizer";

// Secure storage operations with consistent signed URL usage
export async function createSignedUrl(bucket: string, path: string, expiresInSeconds = 60 * 10) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  return { data, error } as const;
}

export async function uploadFile(bucket: string, path: string, file: File) {
  // Validate file before upload
  const validation = validateFileUpload(file);
  if (!validation.isValid) {
    return { data: null, error: new Error(validation.error) };
  }

  // Sanitize filename
  const sanitizedPath = path.replace(/[^a-zA-Z0-9._/-]/g, '_');
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(sanitizedPath, file, { 
      upsert: true, 
      contentType: file.type,
      duplex: 'half'
    });
  return { data, error, path: sanitizedPath } as const;
}

export async function deleteFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  return { data, error } as const;
}

export async function listFiles(bucket: string, prefix: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { 
      limit: 100, 
      offset: 0, 
      sortBy: { column: 'created_at', order: 'desc' } 
    });
  return { data, error } as const;
}

// Helper function to get secure image URL
export async function getSecureImageUrl(bucket: string, path: string) {
  if (!path) return null;
  
  // All buckets are now private, always use signed URLs
  const { data, error } = await createSignedUrl(bucket, path, 3600); // 1 hour expiry
  
  if (error || !data) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}
