import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderService } from '../server/providers.mjs';

test('rotates Gemini keys and preserves provider fallback', async () => {
  const calls = [];
  const service = createProviderService({
    env: { GEMINI_API_KEY: 'test-a', GEMINI_API_KEY_1: 'test-b', OPENROUTER_API_KEY: 'test-c', GROQ_API_KEY: 'test-d' },
    fetchImpl: async (url, options) => {
      const headers = new Headers(options.headers);
      calls.push([new URL(url).hostname, headers.get('x-goog-api-key') || headers.get('authorization')]);
      if (!url.includes('groq.com')) return new Response('{}', { status: 429 });
      return Response.json({ choices: [{ message: { content: 'answer' } }] });
    },
    sleep: async () => {},
  });
  assert.equal(await service.generate('logistics question'), 'answer');
  assert.deepEqual(calls, [
    ['generativelanguage.googleapis.com', 'test-a'],
    ['generativelanguage.googleapis.com', 'test-b'],
    ['openrouter.ai', 'Bearer test-c'],
    ['api.groq.com', 'Bearer test-d'],
  ]);
});

test('Tavily uses a server-side bearer credential and returns results', async () => {
  const service = createProviderService({
    env: { TAVILY_API_KEY: 'test-search' },
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.tavily.com/search');
      assert.equal(new Headers(options.headers).get('authorization'), 'Bearer test-search');
      const body = JSON.parse(options.body);
      assert.equal(body.query, 'freight');
      assert.equal(body.max_results, 3);
      assert.equal(body.api_key, undefined);
      return Response.json({ results: [{ title: 'Example', url: 'https://example.org', content: 'Result', score: 1 }] });
    },
  });
  assert.equal((await service.search('freight', 3)).results.length, 1);
});

test('provider failures never disclose upstream error contents or keys', async () => {
  const service = createProviderService({
    env: { GROQ_API_KEY: 'test-secret' },
    fetchImpl: async () => Response.json({ error: { message: 'test-secret' } }, { status: 400 }),
    sleep: async () => {},
  });
  await assert.rejects(service.generate('question'), { message: 'All AI providers failed' });
});
