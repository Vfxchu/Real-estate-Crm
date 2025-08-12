import { supabase } from "@/integrations/supabase/client";

export async function createSignedUrl(path: string, expiresInSeconds = 60 * 10) {
  const { data, error } = await (supabase as any)
    .storage
    .from('documents')
    .createSignedUrl(path, expiresInSeconds);
  return { data, error } as const;
}

export async function uploadFile(path: string, file: File) {
  const { data, error } = await (supabase as any)
    .storage
    .from('documents')
    .upload(path, file, { upsert: true, contentType: file.type });
  return { data, error } as const;
}

export async function deleteFile(path: string) {
  const { data, error } = await (supabase as any)
    .storage
    .from('documents')
    .remove([path]);
  return { data, error } as const;
}

export async function listFiles(prefix: string) {
  const { data, error } = await (supabase as any)
    .storage
    .from('documents')
    .list(prefix, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
  return { data, error } as const;
}
