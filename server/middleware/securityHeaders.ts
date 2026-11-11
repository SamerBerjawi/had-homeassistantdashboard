/**
 * Security headers (CSP, HSTS, nosniff, ...) plus scrubbing of ?token= from non-SSE URLs.
 * The CSP connect-src is narrowed to the trusted HA instance once one is configured (SEC-011).
 */
import type express from 'express';

export function securityHeaders(getTrustedHaBase: () => string | null): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=(), interest-cohort=()');
    if (req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    }

    // Content-Security-Policy (CSP) Defense-in-Depth:
    // Restrict script execution to 'self' to minimize XSS blast radius.
    // In dev mode, Vite requires 'unsafe-inline' and 'unsafe-eval' for HMR modules.
    const isProd = process.env.NODE_ENV === 'production';
    // Once a Home Assistant instance is trusted, the browser only needs to reach it and ourselves
    // (SEC-011). Before that (opt-in first-run pinning) the policy has to stay open.
    const trustedHa = getTrustedHaBase();
    let connectSrc = "connect-src 'self' ws: wss: https: http:";
    if (trustedHa) {
      try {
        const u = new URL(trustedHa);
        const wsOrigin = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
        connectSrc = `connect-src 'self' ${u.origin} ${wsOrigin}`;
      } catch {
        // keep the open policy if the configured URL cannot be parsed
      }
    }
    const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      connectSrc,
      "media-src 'self' data: blob: https: http:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    // Defense-in-depth: ensure query-string tokens are scrubbed from non-SSE request URLs
    // to prevent tokens leaking into access logs or downstream handlers
    if (req.url && !req.path.startsWith('/api/config/stream') && !req.originalUrl?.startsWith('/api/config/stream')) {
      if (req.query?.token) {
        delete req.query.token;
      }
      if (req.url.includes('token=')) {
        req.url = req.url.replace(/([?&])token=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
      }
    }

    next();
  };
}
