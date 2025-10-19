import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSessionMonitor = () => {
  const [sessionHealthy, setSessionHealthy] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setSessionHealthy(false);
        return;
      }

      // Check if token expires soon (within 10 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = (expiresAt * 1000) - Date.now();
        if (timeUntilExpiry < 10 * 60 * 1000) {
          // Trigger token refresh silently
          await supabase.auth.refreshSession();
          console.log('[SESSION] Token refreshed silently');
        }
      }

      setSessionHealthy(true);
    };

    // Check immediately
    checkSession();

    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { sessionHealthy };
};
