// Helper utilities for sidebar task management (UI-only, non-destructive)

const HIDDEN_TASKS_KEY = 'lead_sidebar_hidden_tasks';

export interface HiddenTasksStore {
  [taskId: string]: boolean;
}

/**
 * Get hidden tasks from local storage
 */
export function getHiddenTasks(): HiddenTasksStore {
  try {
    const stored = localStorage.getItem(HIDDEN_TASKS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Hide a task from sidebar (non-destructive, UI-only)
 */
export function hideTaskFromSidebar(taskId: string): void {
  const hidden = getHiddenTasks();
  hidden[taskId] = true;
  localStorage.setItem(HIDDEN_TASKS_KEY, JSON.stringify(hidden));
}

/**
 * Check if a task is hidden from sidebar
 */
export function isTaskHidden(taskId: string): boolean {
  const hidden = getHiddenTasks();
  return hidden[taskId] === true;
}

/**
 * Clear all hidden tasks (useful for testing/reset)
 */
export function clearHiddenTasks(): void {
  localStorage.removeItem(HIDDEN_TASKS_KEY);
}
