import { gatewayRequest } from './gatewayClient'

export async function sendToAI(prompt: string): Promise<string> {
  const result = await gatewayRequest<{ text: string }>('/api/ai/generate', { prompt })
  if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('Empty AI response')
  return result.text
}
