import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

console.log('[SB] CLIENT LOADED v3'); // prove THIS file is active

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const url = envUrl || (projectRef ? `https://${projectRef}.supabase.co` : '');

const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';

console.log('[SB] URL =', url);
console.log('[SB] KEY loaded =', !!key, 'len:', key?.length ?? 0);

if (!url || !key) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL (or VITE_SUPABASE_PROJECT_ID) and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
});