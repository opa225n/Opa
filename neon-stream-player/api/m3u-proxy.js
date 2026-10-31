// Server-side relay for M3U playlist URLs that don't send CORS headers.
// Blocks obviously-internal targets to limit SSRF abuse; not a general-purpose proxy.
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const PRIVATE_IP_RE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

module.exports = async function handler(req, res) {
  const target = req.query.url;
  if (!target || typeof target !== 'string') {
    res.status(400).json({ error: 'missing_url' });
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch (e) {
    res.status(400).json({ error: 'invalid_url' });
    return;
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'invalid_protocol' });
    return;
  }
  if (BLOCKED_HOSTS.has(host) || PRIVATE_IP_RE.test(host) || host.endsWith('.local')) {
    res.status(400).json({ error: 'blocked_host' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(target, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream_error', status: upstream.status });
      return;
    }
    const text = await upstream.text();
    if (text.length > 20 * 1024 * 1024) {
      res.status(502).json({ error: 'upstream_too_large' });
      return;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(text);
  } catch (e) {
    clearTimeout(timeout);
    res.status(502).json({ error: 'fetch_failed' });
  }
};
