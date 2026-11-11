// Pure URL/host helpers used by the image proxy and auth code (SSRF protection).

export function isSameOriginHost(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    const port1 = u1.port || (u1.protocol === 'https:' ? '443' : '80');
    const port2 = u2.port || (u2.protocol === 'https:' ? '443' : '80');
    return u1.hostname.toLowerCase() === u2.hostname.toLowerCase() && port1 === port2;
  } catch {
    return false;
  }
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  // IPv4-mapped IPv6 must be judged by its IPv4 part. The URL parser normalizes
  // [::ffff:10.0.0.1] to the hex form [::ffff:a00:1], so handle both.
  if (host.startsWith('::ffff:') && host.includes('.')) {
    host = host.slice(7);
  } else {
    const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      host = `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
    }
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '::' || host === '0.0.0.0') {
    return true;
  }
  if (host === '169.254.169.254' || host.startsWith('169.254.')) {
    return true;
  }
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10);
    const octet2 = parseInt(ipv4Match[2], 10);
    if (octet1 === 10) return true;
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
    if (octet1 === 192 && octet2 === 168) return true;
    if (octet1 === 127) return true;
    if (octet1 === 0) return true;
    if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return true; // CGNAT / Tailscale
  }
  // Link-local fe80::/10 and unique-local fc00::/7
  if (/^fe[89ab][0-9a-f]:/.test(host) || /^f[cd][0-9a-f]{2}:/.test(host)) {
    return true;
  }
  return false;
}
