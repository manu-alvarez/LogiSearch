import { supabase } from '../lib/supabase'

let pendingSession: Promise<string> | undefined

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error('Unable to restore session')
  if (data.session?.access_token) return data.session.access_token
  if (!pendingSession) {
    pendingSession = (async () => {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error || !data.session?.access_token) throw new Error('Gateway session unavailable')
      return data.session.access_token
    })().finally(() => { pendingSession = undefined })
  }
  return pendingSession
}

export async function gatewayRequest<T>(path: '/api/ai/generate' | '/api/search', body: Record<string, unknown>): Promise<T> {
  const token = await accessToken()
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Gateway request failed: ' + response.status)
  return await response.json() as T
}
