// BDS OS — Edge Function: Sentry helper
//
// Centralised error reporting for edge functions. Safe to import even if
// Sentry isn't configured (no-ops to console). Each edge function should:
//
//   import { captureError, withSentry } from '../shared/sentry.ts';
//
//   Deno.serve(withSentry(async (req: Request) => {
//     try { ... }
//     catch (err) { captureError(err, { function: 'compute-opi' }); throw err; }
//   }));

import * as Sentry from 'https://deno.land/x/sentry@7.110.0/index.mjs';

const dsn = Deno.env.get('SENTRY_DSN_EDGE');
const environment = Deno.env.get('SUPABASE_PROJECT_REF') ?? 'unknown';

if (dsn) {
  try {
    Sentry.init({
      dsn,
      environment,
      tracesSampleRate: 0.1,
      // Edge functions are short-lived; flush before exit on error.
    });
  } catch (err) {
    console.error('Sentry init failed:', err);
  }
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (dsn) {
    try {
      Sentry.captureException(err, { extra: context });
    } catch (sentryErr) {
      console.error('Sentry capture failed:', sentryErr);
      console.error('Original error:', err);
    }
  } else {
    console.error('captureError (no Sentry):', err, context ?? '');
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (dsn) {
    try {
      Sentry.captureMessage(message, { extra: context });
    } catch (sentryErr) {
      console.error('Sentry capture-message failed:', sentryErr);
      console.error('Message:', message, context ?? '');
    }
  } else {
    console.log('captureMessage (no Sentry):', message, context ?? '');
  }
}

/**
 * Wraps an edge function handler. Catches and reports any uncaught error,
 * then re-throws so Deno.serve returns the appropriate 500.
 */
export function withSentry(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      captureError(err, {
        url: req.url,
        method: req.method,
      });
      // Flush before re-throw so error reaches Sentry even on cold/short-lived runs.
      if (dsn) {
        try {
          await Sentry.flush(2000);
        } catch {
          // best-effort
        }
      }
      throw err;
    }
  };
}
