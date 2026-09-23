import { supabase } from '@/integrations/supabase/client';

/**
 * Rate Limiting Service for Authentication
 * Protects against brute force attacks
 */

export interface LockoutStatus {
  isLocked: boolean;
  remainingTime?: number; // in milliseconds
  attemptsLeft?: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if an account is locked due to failed login attempts
 */
export async function checkAccountLocked(email: string): Promise<LockoutStatus> {
  try {
    const { data, error } = await supabase.rpc('is_account_locked', {
      user_email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error('Error checking account lock status:', error);
      return { isLocked: false };
    }

    if (data === true) {
      // Get remaining lockout time
      const { data: remainingData, error: timeError } = await supabase.rpc(
        'get_lockout_remaining_time',
        { user_email: email.toLowerCase().trim() }
      );

      if (timeError) {
        console.error('Error getting lockout time:', timeError);
      }

      return {
        isLocked: true,
        remainingTime: remainingData ? parseInterval(remainingData) : LOCKOUT_DURATION_MS,
      };
    }

    return { isLocked: false };
  } catch (error) {
    console.error('Exception in checkAccountLocked:', error);
    return { isLocked: false };
  }
}

/**
 * Record a login attempt (successful or failed)
 */
export async function recordLoginAttempt(
  email: string,
  successful: boolean,
  ipAddress?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_login_attempt', {
      user_email: email.toLowerCase().trim(),
      user_ip: ipAddress || null,
      was_successful: successful,
    });

    if (error) {
      console.error('Error recording login attempt:', error);
    }

    // If successful, clear previous failed attempts
    if (successful) {
      await clearLoginAttempts(email);
    }
  } catch (error) {
    console.error('Exception in recordLoginAttempt:', error);
  }
}

/**
 * Clear recent login attempts for an email
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('clear_login_attempts', {
      user_email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error('Error clearing login attempts:', error);
    }
  } catch (error) {
    console.error('Exception in clearLoginAttempts:', error);
  }
}

/**
 * Get user's IP address (best effort)
 */
export async function getUserIP(): Promise<string | undefined> {
  try {
    // Try to get IP from a public service (fallback)
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    return data.ip;
  } catch {
    return undefined;
  }
}

/**
 * Parse PostgreSQL interval to milliseconds
 */
function parseInterval(interval: string): number {
  // Simple parser for intervals like "00:14:32"
  const match = interval.match(/(\d+):(\d+):(\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  return LOCKOUT_DURATION_MS;
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes === 1) return '1 minuto';
  return `${minutes} minutos`;
}
