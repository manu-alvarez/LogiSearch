import { createServer } from 'node:http';
import { Readable } from 'node:stream';

export function createHttpServer({ handle, origin, maxInFlight = 32 }) {
  const base = new URL(origin);
  if (!Number.isInteger(maxInFlight) || maxInFlight < 1) throw new Error('Invalid concurrency limit');
  let active = 0;
  const fail = (res, status) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Connection: 'close' });
    res.end(JSON.stringify({ error: status === 503 ? 'Gateway busy' : 'Invalid request' }));
  };
  const server = createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
    if (active >= maxInFlight) { fail(res, 503); return; }
    active++;
    try {
      const target = req.url || '/';
      if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) { fail(res, 400); return; }
      const url = new URL(target, base);
      if (url.origin !== base.origin) { fail(res, 400); return; }
      if (target === '/healthz' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end('{"status":"ok"}'); return;
      }
      const options = { method: req.method, headers: req.headers };
      if (!['GET','HEAD'].includes(req.method)) {
        if (Number(req.headers['content-length']) > 262144) { fail(res, 413); return; }
        options.body = Readable.toWeb(req);
        options.duplex = 'half';
      }
      const result = await handle(new Request(url, options));
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      if (!res.headersSent) fail(res, 400);
      else res.end();
    } finally { active--; }
  });
  server.maxConnections = 100;
  return server;
}
