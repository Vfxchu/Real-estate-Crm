import { createClient } from '@supabase/supabase-js';

const url = (import.meta as any).env?.VITE_SUPABASE_URL?.trim();
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim();

console.log('[SB] URL =', url);
console.log('[SB] KEY loaded =', Boolean(key), 'len:', key?.length ?? 0);

if (!url || !key) {
  throw new Error('[SB] Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.development (root), then restart dev server.');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
