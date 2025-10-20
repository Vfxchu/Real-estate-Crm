import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

export function useAIContext() {
  const location = useLocation();

  const currentPage = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/properties')) return 'properties';
    if (path.startsWith('/contacts')) return 'contacts';
    if (path.startsWith('/leads')) return 'leads';
    if (path.startsWith('/calendar')) return 'calendar';
    if (path.startsWith('/analytics')) return 'analytics';
    return 'other';
  }, [location.pathname]);

  const contextData = useMemo(() => {
    // Add any additional context data based on the current page
    return {
      pathname: location.pathname,
      search: location.search,
    };
  }, [location]);

  return {
    currentPage,
    contextData,
  };
}
