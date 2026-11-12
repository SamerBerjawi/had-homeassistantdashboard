// Client helpers for `catch (err: unknown)`: read message/code safely without `any`.
// errorMessage/errorCode mirror server/lib/errors.ts.

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

/** Error code from the error itself or its `cause` (undici wraps network errors in `cause`). */
export function errorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * The error's own `message` field, like `err?.message`: undefined for strings, null/undefined and
 * objects without a string message. Use for `err?.message || 'fallback'` sites.
 */
export function errorMessageField(err: unknown): string | undefined {
  if (err === null || err === undefined || typeof err !== 'object') return undefined;
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}
