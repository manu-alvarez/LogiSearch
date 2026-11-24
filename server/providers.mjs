// Server-only provider service. Never import this module into the browser.
export function createProviderService({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const geminiKeys = [...new Set([env.GEMINI_API_KEY,
    ...Array.from({ length: 10 }, (_, i) => env['GEMINI_API_KEY_' + (i + 1)])
  ].filter(Boolean))];
  let index = 0;
  const providers = {
    gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(env.GEMINI_MODEL || 'gemini-2.0-flash') + ':generateContent',
      body: prompt => ({ contents: [{ parts: [{ text: prompt }] }] }),
      parse: data => data.candidates?.[0]?.content?.parts?.[0]?.text },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',
      body: prompt => ({ model: env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
      parse: data => data.choices?.[0]?.message?.content },
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions',
      body: prompt => ({ model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 4096, temperature: 0.7 }),
      parse: data => data.choices?.[0]?.message?.content },
  };
  async function attempt(name, key, prompt) {
    const provider = providers[name];
    const headers = { 'Content-Type': 'application/json', ...(name === 'gemini' ? { 'x-goog-api-key': key } : { Authorization: 'Bearer ' + key }) };
    for (let retry = 0; retry <= 2; retry++) {
      try {
        const response = await fetchImpl(provider.url, { method: 'POST', headers, body: JSON.stringify(provider.body(prompt)), signal: AbortSignal.timeout(30000), redirect: 'error' });
        if (response.status === 429 || (response.status >= 400 && response.status < 500 && response.status !== 408)) return null;
        if (!response.ok) throw new Error('Upstream failure');
        const result = provider.parse(await response.json());
        if (typeof result === 'string' && result.trim()) return result;
      } catch {
        // Do not log upstream errors, request bodies or credentials.
      }
      if (retry < 2) await sleep(1000 * 2 ** retry);
    }
    return null;
  }
  async function generate(prompt) {
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 50000) throw new Error('Invalid prompt');
    const start = index;
    for (let i = 0; i < geminiKeys.length; i++) {
      const position = (start + i) % geminiKeys.length;
      const result = await attempt('gemini', geminiKeys[position], prompt);
      if (result !== null) { index = (position + 1) % geminiKeys.length; return result; }
    }
    for (const [name, key] of [['openrouter', env.OPENROUTER_API_KEY], ['groq', env.GROQ_API_KEY]]) {
      if (!key) continue;
      const result = await attempt(name, key, prompt);
      if (result !== null) return result;
    }
    throw new Error('All AI providers failed');
  }
  async function search(query, maxResults = 5) {
    if (typeof query !== 'string' || !query.trim() || query.length > 4000 || !Number.isInteger(maxResults) || maxResults < 1 || maxResults > 20) throw new Error('Invalid search');
    if (!env.TAVILY_API_KEY) throw new Error('Search unavailable');
    try {
      const response = await fetchImpl('https://api.tavily.com/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.TAVILY_API_KEY },
        body: JSON.stringify({ query, max_results: maxResults, include_answer: true, include_raw_content: false, include_images: false }),
        signal: AbortSignal.timeout(30000), redirect: 'error',
      });
      if (!response.ok) throw new Error('Upstream failure');
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error('Invalid response');
      return { results: data.results.map(({ title, url, content, score }) => ({ title, url, content, score })), answer: typeof data.answer === 'string' ? data.answer : undefined, related_queries: Array.isArray(data.related_queries) ? data.related_queries.filter(x => typeof x === 'string') : [] };
    } catch { throw new Error('Search unavailable'); }
  }
  return { generate, search };
}
