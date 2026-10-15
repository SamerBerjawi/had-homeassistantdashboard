/**
 * fetch with a deadline. Calls to HAD's own API and to Home Assistant must not hang forever:
 * the callers' fallbacks (cache, snapshot, offline state) only run once the request settles.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}
