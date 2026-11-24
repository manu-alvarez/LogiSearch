import { createHttpServer } from './http.mjs';
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
  globalRequestsPerMinute: Number(process.env.GATEWAY_GLOBAL_REQUESTS_PER_MINUTE || '120'),
});
const host = process.env.GATEWAY_BIND_HOST || '127.0.0.1';
if (!['127.0.0.1', '0.0.0.0'].includes(host)) throw new Error('Invalid GATEWAY_BIND_HOST');
const server = createHttpServer({ handle, origin: origin.origin });
server.listen(port, host, () => console.log('LogiSearch gateway listening on ' + host + ':' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
