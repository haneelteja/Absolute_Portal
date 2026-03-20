/**
 * Unified error handler — Absolute Portal
 *
 * Classifies every error into a typed category, logs full details for developers
 * via the structured logger, and returns a clean user-facing message for the UI.
 *
 * Usage:
 *   import { handleError } from '@/lib/errorHandler';
 *
 *   catch (err) {
 *     const { userMessage } = handleError(err, 'SalesEntry', 'submitSale', {
 *       layer: 'API',
 *       endpoint: '/rest/v1/sales_transactions',
 *     });
 *     toast({ title: 'Error', description: userMessage, variant: 'destructive' });
 *   }
 */

import { log, type LogContext } from '@/lib/logger';

// ─── Error type classification ────────────────────────────────────────────────

export type ErrorType =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'SUPABASE_RLS'
  | 'COMPONENT'
  | 'RUNTIME';

// ─── User-facing messages — non-technical, safe to display ───────────────────

const USER_MESSAGES: Record<ErrorType, string> = {
  NETWORK:           'Unable to connect. Please check your internet connection and try again.',
  TIMEOUT:           'The request timed out. Please try again.',
  AUTH_UNAUTHORIZED: 'Your session has expired. Please log in again.',
  AUTH_FORBIDDEN:    "You don't have permission to perform this action.",
  NOT_FOUND:         'The requested data could not be found.',
  VALIDATION:        'Invalid request. Please check your input and try again.',
  CONFLICT:          'This record already exists. Please check for duplicates.',
  SERVER_ERROR:      'Something went wrong on our end. Please try again later.',
  SUPABASE_RLS:      "You don't have permission to access this data.",
  COMPONENT:         'Something went wrong displaying this section. Please refresh the page.',
  RUNTIME:           'An unexpected error occurred. Please refresh the page.',
};

// ─── Error classifier ─────────────────────────────────────────────────────────

type LooseError = {
  message?: string;
  name?: string;
  code?: string | number;
  status?: number;
  details?: string;
};

export function classifyError(error: unknown): ErrorType {
  if (!error) return 'RUNTIME';

  const err = error as LooseError;
  const msg = (err.message ?? '').toLowerCase();
  const status = err.status;

  // Network / connectivity
  if (
    err.name === 'TypeError' && msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('unable to connect')
  ) return 'NETWORK';

  // Timeout / abort
  if (err.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out'))
    return 'TIMEOUT';

  // Auth — 401
  if (status === 401 || msg.includes('unauthorized') || msg.includes('jwt expired') || msg.includes('invalid token'))
    return 'AUTH_UNAUTHORIZED';

  // Auth — 403
  if (status === 403 || msg.includes('forbidden'))
    return 'AUTH_FORBIDDEN';

  // Supabase Row Level Security
  if (err.code === '42501' || msg.includes('permission denied') || msg.includes('rls'))
    return 'SUPABASE_RLS';

  // Not found
  if (status === 404 || err.code === 'PGRST116' || msg.includes('not found'))
    return 'NOT_FOUND';

  // Conflict / duplicate
  if (status === 409 || msg.includes('already exists') || msg.includes('duplicate') || msg.includes('unique'))
    return 'CONFLICT';

  // Validation / bad request
  if (status === 400 || status === 422 || msg.includes('invalid') || msg.includes('validation'))
    return 'VALIDATION';

  // Server error
  if (status === 500 || msg.includes('internal server error'))
    return 'SERVER_ERROR';

  return 'RUNTIME';
}

// ─── Result type ─────────────────────────────────────────────────────────────

export interface HandledError {
  /** Error category — useful for conditional UI behaviour */
  type: ErrorType;
  /** Safe, human-readable message for toasts and UI */
  userMessage: string;
  /** Raw error message — for developer reference, never show to users */
  devMessage: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Handle, classify, and log an error.
 *
 * @param error    The caught error (any shape)
 * @param component  Component or module name, e.g. "SalesEntry"
 * @param fn         Function name, e.g. "submitSale"
 * @param context    Additional log context (layer, endpoint, params, metadata)
 */
export function handleError(
  error: unknown,
  component?: string,
  fn?: string,
  context?: Omit<LogContext, 'component' | 'fn'>
): HandledError {
  const type = classifyError(error);
  const userMessage = USER_MESSAGES[type];

  const devMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  log.error(devMessage, { layer: 'Runtime', ...context, component, fn }, error);

  return { type, userMessage, devMessage };
}

/**
 * Extract a user-friendly message from a backend error response.
 * Backend responses may include { status, errorCode, message, details }.
 */
export function parseApiError(response: unknown): HandledError {
  const res = response as {
    status?: string;
    errorCode?: string;
    message?: string;
    details?: string;
  };

  // Map known backend error codes to frontend types
  const codeMap: Partial<Record<string, ErrorType>> = {
    API_UNAUTHORIZED:     'AUTH_UNAUTHORIZED',
    API_FORBIDDEN:        'AUTH_FORBIDDEN',
    API_NOT_FOUND:        'NOT_FOUND',
    API_VALIDATION_ERROR: 'VALIDATION',
    API_CONFLICT:         'CONFLICT',
    API_INTERNAL_ERROR:   'SERVER_ERROR',
    NETWORK_ERROR:        'NETWORK',
    TIMEOUT_ERROR:        'TIMEOUT',
  };

  const type: ErrorType =
    (res.errorCode && codeMap[res.errorCode]) ?? 'SERVER_ERROR';

  const userMessage = USER_MESSAGES[type];
  const devMessage  = res.details ?? res.message ?? 'Unknown API error';

  log.error(`API error [${res.errorCode ?? 'UNKNOWN'}]: ${devMessage}`, {
    layer: 'API',
    errorCode: res.errorCode,
    apiStatus: res.status,
  });

  return { type, userMessage, devMessage };
}
