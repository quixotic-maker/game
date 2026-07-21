/**
 * Vercel Serverless Function
 * POST /api/generate-pair
 * Body: { theme?: string, passcode: string }
 */
// @ts-ignore - Vercel 在部署时会注入 Node runtime
import { handleGeneratePair } from './_shared.mjs';

export const config = {
  runtime: 'nodejs',
};

interface VercelRequest {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ ok: false, error: 'invalid_json' });
      return;
    }
  }
  const { theme, passcode } = body || {};

  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
    req.socket?.remoteAddress ||
    'unknown';

  const result = await handleGeneratePair({
    ip,
    passcode: String(passcode || ''),
    theme: theme ? String(theme).slice(0, 24) : undefined,
    env: process.env as Record<string, string | undefined>,
  });

  res.status(result.status).json(result.body);
}
