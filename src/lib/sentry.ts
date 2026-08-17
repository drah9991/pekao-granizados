import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("[Sentry] No DSN configured — error tracking disabled. Set VITE_SENTRY_DSN in your .env file.");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    enabled: import.meta.env.PROD,      // only send in production
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    ignoreErrors: [
      "Failed to execute 'selectNode' on 'Range'",
      "is not a valid JavaScript MIME type",
      "Failed to fetch dynamically imported module",
      "ChunkLoadError",
      "favorites is not defined",
      "Unexpected token '<'",
      "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
      "Unexpected token '<', \"<html>\"... is not valid JSON",
      "SyntaxError: Unexpected token '<'"
    ],
    // Performance monitoring
    tracesSampleRate: 0.3,  // 30% of transactions
    // Session Replay
    replaysSessionSampleRate: 0.1,  // 10% of sessions
    replaysOnErrorSampleRate: 1.0,  // 100% of sessions with errors
    // Filtering
    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
}

// Helper to capture errors manually
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error("[Sentry Dev]", error, context);
  }
}

// Helper to identify the logged-in user
export function identifyUser(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

// Clear user on logout
export function clearUser() {
  Sentry.setUser(null);
}

export { Sentry };
