/**
 * 批量生成「谁是卧底 · KTV 唱歌版」场景短句对
 *
 * 核心思路:玩家拿到场景后要「用一首歌唱出这个场景」,
 * 所以场景必须满足:
 *   1) 大众化,每个人都能立刻联想到具体歌曲
 *   2) 有情绪/画面感,能唱出来(失恋、暗恋、加班、深夜、毕业、想家、夏天、旅行、青春、友情)
 *   3) 两个场景共享「可以唱的歌曲池」,卧底拿错词也不容易立刻暴露
 *   4) 差异藏在「具体细节」里,需要玩家开口唱/描述时才会暴露
 *
 * 用法:
 *   node scripts/generate-preset-pairs.mjs                # 默认全主题 × 每主题 30 对
 *   node scripts/generate-preset-pairs.mjs --per 10       # 每主题 10 对(试用)
 *   node scripts/generate-preset-pairs.mjs --resume       # 断点续传
 *
 * 环境变量(.env.local):
 *   OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL
 *
 * 输出: src/data/preset-pairs.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ---------- 读取 .env.local ---------- */
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'deepseek-chat';

if (!API_KEY) {
  console.error('[gen] 缺少 OPENAI_API_KEY,请在 .env.local 中配置');
  process.exit(1);
}

/* ---------- 参数 ---------- */
const args = process.argv.slice(2);
const perIdx = args.indexOf('--per');
const PER_THEME = perIdx !== -1 ? parseInt(args[perIdx + 1], 10) : 30;
const BATCH_SIZE = 8; // 每次调用生成 8 对,质量比数量重要
const OUT_PATH = path.join(ROOT, 'src', 'data', 'preset-pairs.json');
const TMP_PATH = OUT_PATH + '.tmp';

/* ---------- KTV 唱歌场景主题(重新设计) ----------
 * 每个主题都是「大家唱过/听过很多歌」的情绪场景
 */
const THEMES = [
  { key: '失恋', desc: '分手、被甩、结束一段感情后的心情和画面' },
  { key: '暗恋', desc: '偷偷喜欢一个人不敢说出口的心情和画面' },
  { key: '表白', desc: '鼓起勇气说出喜欢的那一刻' },
  { key: '深夜 emo', desc: '深夜独自一人胡思乱想、情绪上头' },
  { key: '加班', desc: '深夜下班、一个人走出写字楼' },
  { key: '毕业', desc: '毕业季和同学朋友说再见' },
  { key: '想家', desc: '在外漂泊、想念爸妈和家乡' },
  { key: '友情', desc: '和老朋友重逢、一起回忆过去' },
  { key: '青春', desc: '学生时代的回忆、热血、遗憾' },
  { key: '初恋', desc: '第一次喜欢一个人的青涩感觉' },
  { key: '夏天', desc: '夏天的画面:蝉鸣、西瓜、海风、毕业、操场' },
  { key: '下雨天', desc: '下雨的城市、没带伞、躲雨、想念一个人' },
  { key: '旅行', desc: '一个人上路、看风景、放空' },
  { key: '酒后', desc: '喝了酒之后想说不敢说的话、想起不敢想的人' },
  { key: '重逢', desc: '多年后再次遇见某个特别的人' },
  { key: 'KTV 场景本身', desc: '聚会唱歌时的心情、唱到某首歌想起某个人' },
];

/* ---------- 工具函数 ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function charSet(str) {
  const s = new Set();
  for (const ch of str) {
    if (/[一-鿿]/.test(ch)) s.add(ch);
  }
  return s;
}

/** 字符级 Jaccard 相似度 */
function similarity(a, b) {
  const sa = charSet(a);
  const sb = charSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const ch of sa) if (sb.has(ch)) inter++;
  return inter / (sa.size + sb.size - inter);
}

function validPair(p) {
  if (!p || typeof p !== 'object') return false;
  const { normal, spy } = p;
  if (typeof normal !== 'string' || typeof spy !== 'string') return false;
  const a = normal.trim();
  const b = spy.trim();
  if (a.length < 10 || a.length > 30) return false;
  if (b.length < 10 || b.length > 30) return false;
  if (Math.abs(a.length - b.length) > 4) return false;
  if (a === b) return false;
  const sim = similarity(a, b);
  if (sim < 0.5 || sim > 0.95) return false;
  return true;
}

/* ---------- AI Prompt(针对 KTV 唱歌场景重写) ---------- */
const SYSTEM_PROMPT = `你是「谁是卧底 · KTV 唱歌版」的出题专家。

游戏玩法:每位玩家拿到一个场景,要**用一首歌来唱出这个场景**。其他玩家通过这首歌猜他拿到的是哪个场景,并找出卧底。

所以场景必须满足以下要求:

【核心要求】
1. **能唱出歌**:场景必须是大众化的情绪/画面,让人立刻联想到具体的流行歌曲。例如「深夜一个人吃泡面」能唱《深夜食堂》;「下雨天忘带伞」能唱《下雨天》。
2. **共享歌曲池**:两个场景必须能唱「同一批歌」,卧底拿错词也不会立刻暴露。例如「暗恋一个人不敢表白」和「喜欢一个人被对方察觉」都能唱《勇气》《小幸运》。
3. **差异藏在细节**:差异不能是「在电影院 vs 在火山口」这种一眼识破的差距,也不能是「开心 vs 难过」这种形容词反差。差异应该是一个具体的物件、动作、位置、时间点,需要玩家开口唱/描述时才暴露。
4. **情绪共鸣**:场景要有画面感和情绪,避免琐碎日常(如「在医院排队挂号」)。
5. **字数与结构**:每句 12~25 字,两句字数差 ≤3 字,共享大部分词汇。

【好的示例】
[{"normal":"深夜一个人加班回家路上","spy":"深夜一个人下班吃夜宵路上"}]
→ 都能唱《夜空中最亮的星》《平凡之路》,差异在「回家 vs 吃夜宵」,要唱到「推开家门」或「坐下点菜」才暴露。

[{"normal":"下雨天忘带伞在便利店躲雨","spy":"下雨天忘带伞在地铁口等雨"}]
→ 都能唱《下雨天》《雨天》,差异在「便利店 vs 地铁口」,要描述具体位置才暴露。

[{"normal":"毕业时和室友在宿舍抱头痛哭","spy":"毕业时和室友在校门口挥手告别"}]
→ 都能唱《朋友》《再见》《凤凰花开的路口》,差异在「宿舍 vs 校门口」「抱头痛哭 vs 挥手告别」,唱到具体动作才暴露。

【差的示例,严禁】
- 「在图书馆自习 vs 在篮球场打球」(差异太大,一眼识破)
- 「开心地唱歌 vs 难过地唱歌」(形容词差异,无法藏在细节)
- 「在医院挂号排队 vs 在医院取药排队」(没有歌能唱,琐碎)

【输出要求】
严格输出 JSON 数组,不要任何解释:
[{"normal":"...","spy":"..."},...]`;

async function callAI(themeObj, count, retries = 3) {
  const userPrompt = `主题:${themeObj.key}(${themeObj.desc})

请生成 ${count} 对「KTV 唱歌版」场景描述。要求:
- 每对都能用同一批华语流行歌曲唱出来
- 差异藏在具体物件/动作/位置里
- 有画面感和情绪共鸣
- 直接输出 JSON 数组:[{"normal":"...","spy":"..."},...]`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('空响应');

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const start = content.indexOf('[');
        const end = content.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error('无法解析 JSON');
        parsed = JSON.parse(content.slice(start, end + 1));
      }
      let arr = Array.isArray(parsed) ? parsed : parsed.pairs || parsed.data || parsed.list || [];
      if (!Array.isArray(arr)) arr = [];
      return arr;
    } catch (e) {
      console.warn(`[gen] ${themeObj.key} 第 ${attempt + 1} 次调用失败:${e.message}`);
      if (attempt < retries - 1) await sleep(1500 * (attempt + 1));
    }
  }
  return [];
}

/* ---------- 主流程 ---------- */
async function main() {
  console.log(`[gen] BaseURL: ${BASE_URL}`);
  console.log(`[gen] Model: ${MODEL}`);
  console.log(`[gen] 主题数: ${THEMES.length},每主题 ${PER_THEME} 对,目标 ${THEMES.length * PER_THEME} 对`);

  let allPairs = [];
  const doneThemes = new Set();
  if (args.includes('--resume') && fs.existsSync(TMP_PATH)) {
    try {
      const tmp = JSON.parse(fs.readFileSync(TMP_PATH, 'utf-8'));
      allPairs = tmp.pairs || [];
      for (const t of tmp.doneThemes || []) doneThemes.add(t);
      console.log(`[gen] 断点续传:已有 ${allPairs.length} 对,已完成主题 ${doneThemes.size}/${THEMES.length}`);
    } catch {
      console.warn('[gen] 读取 tmp 失败,从头开始');
    }
  }

  const seen = new Set(allPairs.map((p) => `${p.normal}||${p.spy}`));

  for (const themeObj of THEMES) {
    if (doneThemes.has(themeObj.key)) continue;
    const themePairs = [];
    const needed = PER_THEME;
    const batches = Math.ceil(needed / BATCH_SIZE);
    console.log(`\n[gen] === 主题「${themeObj.key}」 目标 ${needed} 对,分 ${batches} 批 ===`);

    for (let b = 0; b < batches; b++) {
      const batchTarget = Math.min(BATCH_SIZE, needed - themePairs.length);
      if (batchTarget <= 0) break;
      process.stdout.write(`[gen] ${themeObj.key} 批次 ${b + 1}/${batches} ... `);
      const arr = await callAI(themeObj, batchTarget + 2);
      let accepted = 0;
      for (const p of arr) {
        const cleaned = {
          theme: themeObj.key,
          normal: (p.normal || '').trim(),
          spy: (p.spy || '').trim(),
        };
        if (!validPair(cleaned)) continue;
        const key = `${cleaned.normal}||${cleaned.spy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        themePairs.push(cleaned);
        allPairs.push(cleaned);
        accepted++;
        if (themePairs.length >= needed) break;
      }
      console.log(`接受 ${accepted} 对(主题累计 ${themePairs.length}/${needed})`);
      fs.mkdirSync(path.dirname(TMP_PATH), { recursive: true });
      fs.writeFileSync(
        TMP_PATH,
        JSON.stringify({ pairs: allPairs, doneThemes: [...doneThemes] }, null, 2)
      );
      await sleep(500);
    }
    doneThemes.add(themeObj.key);
    fs.writeFileSync(
      TMP_PATH,
      JSON.stringify({ pairs: allPairs, doneThemes: [...doneThemes] }, null, 2)
    );
    console.log(`[gen] 主题「${themeObj.key}」完成,共 ${themePairs.length} 对`);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(allPairs, null, 2));
  console.log(`\n[gen] ✅ 完成!共 ${allPairs.length} 对,已写入 ${OUT_PATH}`);
}

main().catch((e) => {
  console.error('[gen] 失败:', e);
  process.exit(1);
});
