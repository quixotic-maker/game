import type { GeneratePairRequest, GeneratePairResponse } from '../types';

export async function generatePairByAI(
  req: GeneratePairRequest,
  timeoutMs = 20000
): Promise<GeneratePairResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/generate-pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (res.status === 401) {
      return { ok: false, error: 'passcode_incorrect' };
    }
    if (res.status === 429) {
      return { ok: false, error: 'rate_limited' };
    }
    if (!res.ok) {
      return { ok: false, error: 'ai_failed' };
    }
    const data = (await res.json()) as GeneratePairResponse;
    return data;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, error: 'ai_failed' };
    }
    return { ok: false, error: 'ai_failed' };
  } finally {
    clearTimeout(timer);
  }
}
