// Validate access tokens against the configured Supabase Auth service.
export function createSupabaseAuthenticator({ url, publicKey, fetchImpl = globalThis.fetch } = {}) {
  const base = new URL(url);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !publicKey) throw new Error('Invalid authentication configuration');
  const endpoint = new URL('/auth/v1/user', base).href;
  return async function authenticate(request) {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '');
    if (!match || match[1].length > 8192) return null;
    try {
      const response = await fetchImpl(endpoint, { headers: { apikey: publicKey, authorization: 'Bearer ' + match[1] }, signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!response.ok) return null;
      const user = await response.json();
      return typeof user.id === 'string' && user.id.trim() && user.id.length <= 256 ? user.id : null;
    } catch { return null; }
  };
}
