/**
 * 共享业务逻辑:口令校验 / 限流 / 调 AI / 二次校验
 * 同时被 Vercel Serverless Function (api/generate-pair.ts) 和本地 dev server (api/dev-server.mjs) 使用
 */

const SYSTEM_PROMPT = `你是「谁是卧底」游戏的出题专家。你需要生成一对高度相似的场景描述。

要求:
1. 两个场景都是 12~25 字的短句,描述一个具体、生活化的情境
2. 字数差不超过 3 字
3. 两个场景共享大部分词汇(至少 60%),只在一两个名词或动词上有差异
4. 差异必须隐蔽,不能一眼看出
5. 避免「在电影院」vs「在火山口」这种巨大差异
6. 避免「开心地吃饭」vs「难过地吃饭」这种形容词/副词差异
7. 严格输出 JSON 对象,格式:{"normal":"...","spy":"..."},不要任何解释

好的示例:
{"normal":"深夜在家追剧时突然停电","spy":"深夜在家打游戏时突然停电"}`;

/* 字符级 Jaccard 相似度 */
function charSet(str) {
  const s = new Set();
  for (const ch of str) if (/[一-鿿]/.test(ch)) s.add(ch);
  return s;
}
function similarity(a, b) {
  const sa = charSet(a);
  const sb = charSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const ch of sa) if (sb.has(ch)) inter++;
  return inter / (sa.size + sb.size - inter);
}

function validPair(normal, spy) {
  if (typeof normal !== 'string' || typeof spy !== 'string') return false;
  const a = normal.trim();
  const b = spy.trim();
  if (a.length < 10 || a.length > 30) return false;
  if (b.length < 10 || b.length > 30) return false;
  if (Math.abs(a.length - b.length) > 4) return false;
  if (a === b) return false;
  const sim = similarity(a, b);
  return sim >= 0.5 && sim <= 0.95;
}

/* 简单内存限流(IP -> 时间戳数组) */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const arr = rateLimitMap.get(ip) || [];
  const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

/* 调 AI(带一次重试) */
async function callAI({ baseUrl, apiKey, model, theme }) {
  const userPrompt = theme
    ? `主题:${theme}\n请生成 1 对「谁是卧底」场景描述。`
    : `主题随机(从日常生活 / 校园 / 职场 / 深夜 / 餐厅 / 旅行 等中选一个)。\n请生成 1 对「谁是卧底」场景描述。`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(18000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI 空响应');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('无法解析 JSON');
    parsed = JSON.parse(m[0]);
  }
  const normal = (parsed.normal || '').trim();
  const spy = (parsed.spy || '').trim();
  if (!validPair(normal, spy)) {
    throw new Error(`生成质量不合格:normal="${normal}" spy="${spy}"`);
  }
  return { normal, spy };
}

/**
 * 主处理器
 * @param {object} opts
 * @param {string} opts.ip
 * @param {string} opts.passcode
 * @param {string|undefined} opts.theme
 * @param {object} opts.env - { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL, PASSCODE }
 * @returns {Promise<{status:number, body:object}>}
 */
export async function handleGeneratePair({ ip, passcode, theme, env }) {
  const expectedPasscode = env.PASSCODE || '';
  if (expectedPasscode && passcode !== expectedPasscode) {
    return { status: 401, body: { ok: false, error: 'passcode_incorrect' } };
  }
  if (!checkRateLimit(ip || 'unknown')) {
    return { status: 429, body: { ok: false, error: 'rate_limited' } };
  }

  const baseUrl = (env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || 'deepseek-chat';
  if (!apiKey) {
    return { status: 500, body: { ok: false, error: 'ai_failed', message: 'missing api key' } };
  }

  // 最多尝试 2 次
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { normal, spy } = await callAI({ baseUrl, apiKey, model, theme });
      return { status: 200, body: { ok: true, normal, spy } };
    } catch (e) {
      console.warn(`[generate-pair] attempt ${attempt + 1} failed:`, e.message);
    }
  }
  return { status: 502, body: { ok: false, error: 'ai_failed' } };
}
