/**
 * Helper utilities for sidebar tasks functionality
 * UI-only, no backend changes
 */

export interface TaskWithOutcome {
  id: string;
  title: string;
  description?: string;
  due_at: string;
  status: string;
  type: string;
  lead_id?: string;
  updated_at: string;
  outcome?: string; // Joined from lead_outcomes
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
  status?: string;
  updated_at?: string;
}

export interface DeduplicatedItem {
  id: string;
  title: string;
  due_at: string;
  status: string;
  type: string;
  updated_at: string;
  outcome?: string;
  entityType: 'task' | 'event';
}

/**
 * Local storage key for hidden sidebar tasks (per user)
 */
const HIDDEN_TASKS_KEY = 'dkv_hidden_sidebar_tasks';

/**
 * Get hidden task IDs from local storage
 */
export function getHiddenTaskIds(): Set<string> {
  try {
    const stored = localStorage.getItem(HIDDEN_TASKS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.warn('Failed to load hidden tasks from localStorage:', error);
  }
  return new Set();
}

/**
 * Add a task ID to hidden list
 */
export function hideTaskFromSidebar(taskId: string): void {
  try {
    const hidden = getHiddenTaskIds();
    hidden.add(taskId);
    localStorage.setItem(HIDDEN_TASKS_KEY, JSON.stringify([...hidden]));
  } catch (error) {
    console.warn('Failed to save hidden task to localStorage:', error);
  }
}

/**
 * Remove a task ID from hidden list (unhide)
 */
export function unhideTaskFromSidebar(taskId: string): void {
  try {
    const hidden = getHiddenTaskIds();
    hidden.delete(taskId);
    localStorage.setItem(HIDDEN_TASKS_KEY, JSON.stringify([...hidden]));
  } catch (error) {
    console.warn('Failed to remove hidden task from localStorage:', error);
  }
}

/**
 * Deduplicate tasks and events by ID and updated_at
 * Preference: latest updated_at wins
 */
export function deduplicateTasksAndEvents(
  tasks: TaskWithOutcome[],
  events: CalendarEventItem[]
): DeduplicatedItem[] {
  const itemMap = new Map<string, DeduplicatedItem>();

  // Add tasks
  tasks.forEach(task => {
    itemMap.set(task.id, {
      id: task.id,
      title: task.title,
      due_at: task.due_at,
      status: task.status,
      type: task.type,
      updated_at: task.updated_at,
      outcome: task.outcome,
      entityType: 'task'
    });
  });

  // Add events (only if not already present as task, or if event is newer)
  events.forEach(event => {
    const existing = itemMap.get(event.id);
    const eventUpdatedAt = event.updated_at || event.start_date;
    
    if (!existing || (eventUpdatedAt && eventUpdatedAt > existing.updated_at)) {
      itemMap.set(event.id, {
        id: event.id,
        title: event.title,
        due_at: event.start_date,
        status: event.status || 'scheduled',
        type: event.event_type,
        updated_at: eventUpdatedAt,
        entityType: 'event'
      });
    }
  });

  // Convert to array and sort by updated_at desc
  return Array.from(itemMap.values())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

/**
 * Format task title with outcome appended
 */
export function formatTaskTitleWithOutcome(title: string, outcome?: string): string {
  if (!outcome) return title;
  return `${title} — Outcome: ${outcome}`;
}
