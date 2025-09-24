import { useEffect } from 'react';

/**
 * Custom hook to handle cross-module synchronization
 * Listens to events dispatched by other components and refreshes data accordingly
 */
export function useSync(options: {
  onLeadsChange?: () => void;
  onContactsChange?: () => void;
  onPropertiesChange?: () => void;
  onActivitiesChange?: () => void;
  onCalendarChange?: () => void;
}) {
  useEffect(() => {
    const handlers: Array<{ event: string; handler: () => void }> = [];

    if (options.onLeadsChange) {
      const handler = () => options.onLeadsChange?.();
      window.addEventListener('leads:changed', handler);
      window.addEventListener('leads:created', handler);
      window.addEventListener('leads:updated', handler);
      handlers.push(
        { event: 'leads:changed', handler },
        { event: 'leads:created', handler },
        { event: 'leads:updated', handler }
      );
    }

    if (options.onContactsChange) {
      const handler = () => options.onContactsChange?.();
      window.addEventListener('contacts:updated', handler);
      window.addEventListener('contacts:created', handler);
      handlers.push(
        { event: 'contacts:updated', handler },
        { event: 'contacts:created', handler }
      );
    }

    if (options.onPropertiesChange) {
      const handler = () => options.onPropertiesChange?.();
      window.addEventListener('properties:refresh', handler);
      window.addEventListener('properties:updated', handler);
      handlers.push(
        { event: 'properties:refresh', handler },
        { event: 'properties:updated', handler }
      );
    }

    if (options.onActivitiesChange) {
      const handler = () => options.onActivitiesChange?.();
      window.addEventListener('activities:refresh', handler);
      handlers.push({ event: 'activities:refresh', handler });
    }

    if (options.onCalendarChange) {
      const handler = () => options.onCalendarChange?.();
      window.addEventListener('calendar:refresh', handler);
      handlers.push({ event: 'calendar:refresh', handler });
    }

    // Cleanup
    return () => {
      handlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [options.onLeadsChange, options.onContactsChange, options.onPropertiesChange, options.onActivitiesChange, options.onCalendarChange]);
}