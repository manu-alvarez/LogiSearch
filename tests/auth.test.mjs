import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAuthenticator } from '../server/auth.mjs';
test('validates bearer session against configured Supabase project', async () => {
  const authenticate = createSupabaseAuthenticator({ url: 'https://example.supabase.co', publicKey: 'test-public', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://example.supabase.co/auth/v1/user');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer test-token');
    assert.equal(new Headers(options.headers).get('apikey'), 'test-public');
    return Response.json({ id: 'verified-user' });
  }});
  assert.equal(await authenticate(new Request('https://example.org', {headers:{authorization:'Bearer test-token'}})), 'verified-user');
  assert.equal(await authenticate(new Request('https://example.org')), null);
});
test('rejects invalid sessions and anonymous key without a user identity', async () => {
  const authenticate = createSupabaseAuthenticator({url:'https://example.supabase.co',publicKey:'test-public',fetchImpl:async()=>new Response('{}',{status:401})});
  assert.equal(await authenticate(new Request('https://example.org',{headers:{authorization:'Bearer test-invalid'}})),null);
});
