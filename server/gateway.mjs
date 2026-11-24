// Framework-independent HTTP gateway. Authentication is mandatory.
export function createGateway({ providers, authenticate, allowedOrigin, requestsPerMinute = 20, globalRequestsPerMinute = 120, maxActive = 4 } = {}) {
  if (typeof authenticate !== 'function' || !providers || !allowedOrigin) throw new Error('Gateway configuration required');
  if (!Number.isInteger(globalRequestsPerMinute) || globalRequestsPerMinute < 1 || !Number.isInteger(requestsPerMinute) || requestsPerMinute < 1 || !Number.isInteger(maxActive) || maxActive < 1) throw new Error('Invalid limits');
  const quotas = new Map();
  let active = 0;
  let globalQuota = { count: 0, until: 0 };
  const json = (status, data, extra = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
  return async function handle(request) {
    const path = new URL(request.url).pathname;
    if (!['/api/ai/generate', '/api/search'].includes(path)) return json(404, { error: 'Not found' });
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' }, { Allow: 'POST' });
    const origin = request.headers.get('origin');
    if (origin && origin !== allowedOrigin) return json(403, { error: 'Forbidden origin' });
    let identity;
    try { identity = await authenticate(request); } catch { return json(401, { error: 'Authentication required' }); }
    if (typeof identity !== 'string' || !identity || identity.length > 256) return json(401, { error: 'Authentication required' });
    const now = Date.now();
    for (const [key, value] of quotas) if (value.until <= now) quotas.delete(key);
    let quota = quotas.get(identity);
    if (!quota) {
      if (quotas.size >= 10000) return json(503, { error: 'Gateway busy' });
      quota = { count: 0, until: now + 60000 };
      quotas.set(identity, quota);
    }
    if (quota.count >= requestsPerMinute) return json(429, { error: 'Rate limit exceeded' }, { 'Retry-After': String(Math.ceil((quota.until - now) / 1000)) });
    quota.count++;
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json(415, { error: 'JSON required' });
    let body;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json(400, { error: 'Body required' });
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let raw = '', bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 262144) { await reader.cancel(); return json(413, { error: 'Body too large' }); }
        raw += decoder.decode(value, { stream: true });
      }
      body = JSON.parse(raw + decoder.decode());
    } catch { return json(400, { error: 'Invalid JSON' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Invalid body' });
    const generate = path === '/api/ai/generate';
    const input = generate ? body.prompt : body.query;
    const count = body.maxResults ?? 5;
    if (typeof input !== 'string' || !input.trim() || input.length > (generate ? 50000 : 4000) || (!generate && (!Number.isInteger(count) || count < 1 || count > 20))) return json(400, { error: 'Invalid input' });
    if (active >= maxActive) return json(503, { error: 'Gateway busy' }, { 'Retry-After': '5' });
    const dispatchTime = Date.now();
    if (globalQuota.until <= dispatchTime) globalQuota = { count: 0, until: dispatchTime + 60000 };
    if (globalQuota.count >= globalRequestsPerMinute) return json(429, { error: 'Rate limit exceeded' }, { 'Retry-After': String(Math.ceil((globalQuota.until - dispatchTime) / 1000)) });
    globalQuota.count++;
    active++;
    try {
      return json(200, generate ? { text: await providers.generate(input) } : await providers.search(input, count));
    } catch { return json(502, { error: 'Provider unavailable' }); }
    finally { active--; }
  };
}
