import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createGateway } from './gateway.mjs';
import { createProviderService } from './providers.mjs';
import { createSupabaseAuthenticator } from './auth.mjs';

const origin = new URL(process.env.APP_ORIGIN);
if (!['http:', 'https:'].includes(origin.protocol) || origin.href !== origin.origin + '/') throw new Error('APP_ORIGIN must be an origin');
const port = Number(process.env.PORT || '8787');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const handle = createGateway({
  providers: createProviderService(),
  authenticate: createSupabaseAuthenticator({ url: process.env.SUPABASE_URL, publicKey: process.env.SUPABASE_ANON_KEY }),
  allowedOrigin: origin.origin,
});
const server = createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
  try {
    const path = req.url || '/';
    if (path === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end('{"status":"ok"}'); return;
    }
    if (!path.startsWith('/') || path.startsWith('//')) { res.writeHead(400); res.end(); return; }
    const options = { method: req.method, headers: req.headers };
    if (!['GET', 'HEAD'].includes(req.method)) { options.body = Readable.toWeb(req); options.duplex = 'half'; }
    const result = await handle(new Request(new URL(path, origin), options));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end('{"error":"Invalid request"}');
  }
});
server.maxConnections = 100;
server.listen(port, '127.0.0.1', () => console.log('LogiSearch gateway listening on loopback port ' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
