import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://mxfmojbjjehyaisiikea.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Zm1vamJqamVoeWFpc2lpa2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDY2MjgsImV4cCI6MjA2OTUyMjYyOH0.vLAkBLPqa7viQ6kNPBvOZzcg42W_pmw_VXQCikZZoCM";

// Diagnostics
console.log('[SUPABASE] Client initializing...');
console.log('[SUPABASE] URL:', SUPABASE_URL);
console.log('[SUPABASE] Key length:', SUPABASE_PUBLISHABLE_KEY.length);

// Test connectivity on load
fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then(response => {
    console.log('[SUPABASE] Health check:', response.status, response.statusText);
  })
  .catch(error => {
    console.error('[SUPABASE] Health check failed:', error);
  });

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});