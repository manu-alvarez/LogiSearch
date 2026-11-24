import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../server/gateway.mjs';

test('gateway requires verified identity, validates input and limits requests', async () => {
  let calls = 0;
  const app = createGateway({
    providers: { generate: async prompt => { calls++; return prompt; }, search: async () => ({ results: [] }) },
    authenticate: async request => request.headers.get('authorization') === 'Bearer test-session' ? 'user-1' : null,
    allowedOrigin: 'https://example.org',
    requestsPerMinute: 2,
  });
  const request = (body, token = 'test-session') => new Request('https://example.org/api/ai/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://example.org', authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  });
  assert.equal((await app(request({ prompt: 'hello' }, 'invalid'))).status, 401);
  assert.equal((await app(request({ prompt: '' }))).status, 400);
  const response = await app(request({ prompt: 'hello' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: 'hello' });
  assert.equal((await app(request({ prompt: 'again' }))).status, 429);
  assert.equal(calls, 1);
});
test('gateway never reflects provider errors', async () => {
  const app = createGateway({
    providers: { generate: async () => { throw new Error('private upstream data'); } },
    authenticate: async () => 'user-1',
    allowedOrigin: 'https://example.org',
  });
  const response = await app(new Request('https://example.org/api/ai/generate', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.org' },
    body: JSON.stringify({ prompt: 'hello' }),
  }));
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('private upstream data'), false);
});
