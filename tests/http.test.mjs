import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHttpServer } from '../server/http.mjs';
import { createGateway } from '../server/gateway.mjs';

test('loopback HTTP adapter routes authenticated JSON and rejects invalid requests', async () => {
  const origin = 'http://localhost:5173';
  const handle = createGateway({ allowedOrigin: origin, authenticate: async r => r.headers.get('authorization') === 'Bearer test-token' ? 'test-user' : null, providers: { generate: async p => 'answer:' + p, search: async () => ({results: [], related_queries: []}) } });
  const server = createHttpServer({ handle, origin });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.deepEqual(await (await fetch(base+'/healthz')).json(), {status:'ok'});
    const post = (path, token, body, requestOrigin = origin) => fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,Origin:requestOrigin},body:JSON.stringify(body)});
    assert.equal((await post('/api/ai/generate','invalid',{prompt:'hello'})).status,401);
    const ok = await post('/api/ai/generate','test-token',{prompt:'hello'});
    assert.equal(ok.status,200);
    assert.deepEqual(await ok.json(),{text:'answer:hello'});
    assert.equal((await post('/api/search','test-token',{query:'freight'})).status,200);
    assert.equal((await post('/api/ai/generate','test-token',{prompt:'hello'},'https://other.example')).status,403);
    assert.equal((await post('/api/ai/generate','test-token',{prompt:'x'.repeat(270000)})).status,413);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
