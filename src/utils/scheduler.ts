/**
 * Yields control back to the browser's event loop if the execution has exceeded the budget.
 * Uses the modern `scheduler.yield()` API if available, with a fallback to `setTimeout`.
 * 
 * @param deadlineRef A reference object tracking the performance.now() expiration timestamp
 * @param budgetMs The execution budget in milliseconds (default 50ms)
 */
export async function yieldIfNeeded(
  deadlineRef: { current: number },
  budgetMs: number = 50
): Promise<void> {
  if (performance.now() > deadlineRef.current) {
    if (globalThis.scheduler?.yield) {
      await globalThis.scheduler.yield();
    } else {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    deadlineRef.current = performance.now() + budgetMs;
  }
}

/**
 * Creates a deadline tracker initialized to `performance.now() + budgetMs`.
 * 
 * @param budgetMs The execution budget in milliseconds (default 50ms)
 */
export function createDeadline(budgetMs: number = 50) {
  return { current: performance.now() + budgetMs };
}
