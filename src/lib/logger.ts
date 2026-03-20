/**
 * Structured logging utility — Absolute Portal
 *
 * Produces grouped, searchable console output so every error is immediately
 * traceable to its source layer, component, function, and endpoint.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.error('Failed to save', { layer: 'API', component: 'SalesEntry', fn: 'submitSale', endpoint: '/sales_transactions' }, err);
 *   log.warn('Stale data detected', { layer: 'Service', component: 'InvoiceService' });
 *   log.info('User authenticated', { layer: 'Auth' });
 *   log.debug('Query params', { layer: 'API', params: { dealer: 'ACME' } });
 */

export type SourceLayer =
  | 'Component'
  | 'API'
  | 'Network'
  | 'Auth'
  | 'Service'
  | 'Edge Function'
  | 'Runtime';

export interface LogContext {
  /** Which architectural layer the error originated from */
  layer?: SourceLayer;
  /** React component or module name, e.g. "SalesEntry" */
  component?: string;
  /** Function or hook name, e.g. "submitSale" */
  fn?: string;
  /** API endpoint or Supabase table, e.g. "/rest/v1/sales_transactions" */
  endpoint?: string;
  /** Request parameters — sanitized before logging */
  params?: Record<string, unknown>;
  /** Any additional debugging metadata */
  [key: string]: unknown;
}

export enum LogLevel {
  ERROR = 0,
  WARN  = 1,
  INFO  = 2,
  DEBUG = 3,
}

// ─── Config ───────────────────────────────────────────────────────────────────

const APP_TAG = 'ABSOLUTE PORTAL';

// DEV: show all levels. PROD: ERROR and WARN only.
const IS_DEV = typeof import.meta !== 'undefined' &&
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

const MAX_LEVEL: LogLevel = IS_DEV ? LogLevel.DEBUG : LogLevel.WARN;

const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'key', 'auth',
  'credential', 'apikey', 'api_key', 'authorization',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? '[REDACTED]' : v,
    ])
  );
}

function levelIcon(level: LogLevel): string {
  if (level === LogLevel.ERROR) return '🔴';
  if (level === LogLevel.WARN)  return '🟡';
  if (level === LogLevel.INFO)  return '🔵';
  return '⚪';
}

// ─── Core ─────────────────────────────────────────────────────────────────────

function logStructured(
  level: LogLevel,
  message: string,
  context: LogContext = {},
  error?: unknown
): void {
  if (level > MAX_LEVEL) return;

  const { layer, component, fn, endpoint, params, ...metadata } = context;
  const levelName = LogLevel[level] as 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

  const labelParts: string[] = [
    `${levelIcon(level)} [${APP_TAG}]`,
    `[${levelName}]`,
    ...(layer     ? [`• ${layer}`]     : []),
    ...(component ? [`<${component}>`] : []),
    ...(fn        ? [`${fn}()`]        : []),
    `— ${message}`,
  ];

  // ERROR/WARN auto-expand; INFO/DEBUG start collapsed
  const groupFn = level <= LogLevel.WARN ? console.group : console.groupCollapsed;
  const logFn   = level === LogLevel.ERROR
    ? console.error
    : level === LogLevel.WARN
      ? console.warn
      : console.log;

  groupFn(labelParts.join(' '));
  logFn('Timestamp :', new Date().toISOString());
  if (layer)                             logFn('Layer     :', layer);
  if (component)                         logFn('Component :', component);
  if (fn)                                logFn('Function  :', `${fn}()`);
  if (endpoint)                          logFn('Endpoint  :', endpoint);
  if (params)                            logFn('Params    :', sanitizeParams(params));
  if (Object.keys(metadata).length > 0)  logFn('Meta      :', metadata);
  if (error != null)                     logFn('Error     :', error);
  if (error instanceof Error && error.stack) logFn('Stack     :', error.stack);
  console.groupEnd();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const log = {
  error: (message: string, context?: LogContext, error?: unknown) =>
    logStructured(LogLevel.ERROR, message, context, error),
  warn:  (message: string, context?: LogContext, error?: unknown) =>
    logStructured(LogLevel.WARN,  message, context, error),
  info:  (message: string, context?: LogContext) =>
    logStructured(LogLevel.INFO,  message, context),
  debug: (message: string, context?: LogContext) =>
    logStructured(LogLevel.DEBUG, message, context),
};

// ─── Backward-compatible logger ───────────────────────────────────────────────
// Existing code uses logger.error(msg, ...args) — still works without changes.

export const logger = {
  error: (message: string, ...args: unknown[]) =>
    logStructured(
      LogLevel.ERROR,
      message,
      {},
      args.find((a) => a instanceof Error) ?? args[0]
    ),
  warn:  (message: string, ...args: unknown[]) =>
    logStructured(LogLevel.WARN,  message, {}, args[0]),
  info:  (message: string, ..._args: unknown[]) =>
    logStructured(LogLevel.INFO,  message, {}),
  debug: (message: string, ..._args: unknown[]) =>
    logStructured(LogLevel.DEBUG, message, {}),
  setLevel: (_level: LogLevel) => {
    // No-op: level is env-driven (DEV vs PROD). Adjust MAX_LEVEL above if needed.
  },
};

// Standalone named exports
export const { error, warn, info, debug } = log;
