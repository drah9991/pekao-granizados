/**
 * Offline Sync Utility with Exponential Backoff
 * Handles retry logic for failed network requests with intelligent backoff
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 32000, // 32 seconds
  backoffMultiplier: 2,
};

/**
 * Calculate delay with exponential backoff
 */
function calculateBackoff(attempt: number, config: Required<RetryConfig>): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() - 0.5);

  return Math.floor(delay + jitter);
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  onRetry?: (attempt: number, delay: number, error: Error) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors (4xx client errors except 429)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // If this was the last attempt, throw
      if (attempt === finalConfig.maxRetries - 1) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateBackoff(attempt, finalConfig);

      if (onRetry) {
        onRetry(attempt + 1, delay, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Wait for the browser to be online
 */
export function waitForOnline(timeout: number = 60000): Promise<void> {
  if (isOnline()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      reject(new Error('Timeout waiting for online connection'));
    }, timeout);

    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineHandler);
      resolve();
    };

    window.addEventListener('online', onlineHandler);
  });
}

/**
 * Retry a function when network becomes available
 */
export async function retryWhenOnline<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  if (!isOnline()) {
    console.log('Offline: waiting for connection...');
    await waitForOnline();
    console.log('Online: retrying operation...');
  }

  return retryWithBackoff(fn, config, (attempt, delay, error) => {
    console.log(`Retry attempt ${attempt} after ${delay}ms. Error: ${error.message}`);
  });
}
