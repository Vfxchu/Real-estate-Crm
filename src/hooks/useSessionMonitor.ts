import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSessionMonitor = () => {
  const [sessionHealthy, setSessionHealthy] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setSessionHealthy(false);
        toast({
          title: 'Session Warning',
          description: 'Your session may have expired. Please refresh the page.',
          variant: 'destructive'
        });
        return;
      }

      // Check if token expires soon (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = (expiresAt * 1000) - Date.now();
        if (timeUntilExpiry < 5 * 60 * 1000) {
          // Trigger token refresh
          await supabase.auth.refreshSession();
          console.log('Session refreshed proactively');
        }
      }

      setSessionHealthy(true);
    };

    // Check immediately
    checkSession();

    // Check every 2 minutes
    const interval = setInterval(checkSession, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [toast]);

  return { sessionHealthy };
};
