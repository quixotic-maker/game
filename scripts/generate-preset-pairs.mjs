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

/* ---------- AI Prompt(KTV 唱歌版 V3:情绪细节差异) ---------- */
const SYSTEM_PROMPT = `你是「谁是卧底 · KTV 唱歌版」的出题专家。

游戏玩法:每位玩家拿到一个场景,要**用一首歌唱出这个场景**。其他玩家通过他选的歌曲,判断他拿到的是哪个场景,找出卧底。

【三个核心条件,缺一不可】

1. **有歌可唱**:场景必须是大众化的情绪画面,玩家能立刻想到至少 2~3 首具体的华语流行歌。避免琐碎日常(如「在医院挂号排队」)和抽象概念(如「心情不错」)。

2. **两个场景的歌唱池高度重合**:正常玩家和卧底**有可能唱出同一首歌**,这样卧底才不会立刻暴露。例如「和暗恋的人看了最后一场电影」和「和暗恋的人看了第一场电影」,都能唱《小幸运》《晴天》。

3. **但情绪/情感指向有细微差别**:虽然能唱同一首歌,但两个场景在情感细节上有不同的「专属歌」。卧底暴露的线索是「他唱的歌,情绪对不上他的词」。
   - 例如「看了最后一场电影」更可能唱《好久不见》《成全》(遗憾、告别)
   - 而「看了第一场电影」更可能唱《甜甜的》《恋爱ing》(心动、开始)
   - 玩家通过「他为什么唱这首情绪的歌?」来推理卧底

【差异必须是「情感/情绪指向」,不能是「客观物件」】

✅ 好的差异(情绪/情感指向):
- 时间阶段带来的情绪差:「第一场电影 vs 最后一场电影」「初恋 vs 热恋」「刚认识 vs 多年后」
- 关系状态带来的情绪差:「偷偷喜欢 vs 已经在一起」「在一起 vs 已经分手」「暧昧 vs 确定关系」
- 主动/被动带来的情绪差:「主动告别 vs 被离开」「我等他 vs 他等我」
- 释然/遗憾带来的情绪差:「笑着说再见 vs 哭着说再见」「祝福前任 vs 想挽回前任」
- 独处/陪伴带来的情绪差:「一个人看 vs 和某人一起看」

❌ 坏的差异(客观物件,不要):
- 「围巾 vs 毛衣」「便利店 vs 地铁口」「校服 vs 书包」——唱什么歌都一样,无法从选歌判断
- 「在电影院 vs 在火山口」——差距太大,一眼识破
- 「开心 vs 难过」——形容词差异,太空泛

【三个好示例】

示例 1(时间阶段 → 情绪差):
[{"normal":"和暗恋的人一起看了第一场电影","spy":"和暗恋的人一起看了最后一场电影"}]
→ 都能唱《小幸运》《晴天》。但 A 偏心动(《甜甜的》《恋爱ing》),B 偏遗憾(《好久不见》《成全》)。

示例 2(主动/被动 → 情绪差):
[{"normal":"毕业时主动和喜欢的人在走廊告别","spy":"毕业时被喜欢的人在走廊主动告别"}]
→ 都能唱《凤凰花开的路口》《再见》。但 A 偏勇敢(《勇气》《告白气球》),B 偏被动失落(《可惜不是你》《说谎》)。

示例 3(释然/遗憾 → 情绪差):
[{"normal":"深夜想起前任,笑着翻完聊天记录","spy":"深夜想起前任,哭着翻完聊天记录"}]
→ 都能唱《后来》《体面》。但 A 偏释然(《成全》《祝你幸福》),B 偏不甘(《想你的夜》《我怀念的》)。

【三个坏示例,严禁】
- [{"normal":"深夜加班回家路上一个人","spy":"深夜加班回家路上想一个人"}] → 差异太微妙(「一个人 vs 想一个人」),AI 难写,玩家也难演。
- [{"normal":"在电影院吃爆米花","spy":"在电影院喝可乐"}] → 客观物件差异,唱什么歌都一样,无法从选歌判断卧底。
- [{"normal":"在图书馆安静看书","spy":"在篮球场激烈打球"}] → 差距太大,一眼识破。

【输出要求】
严格输出 JSON 数组,不要任何解释:
[{"normal":"...","spy":"..."},...]`;

async function callAI(themeObj, count, retries = 3) {
  const userPrompt = `主题:${themeObj.key}(${themeObj.desc})

请生成 ${count} 对「KTV 唱歌版」场景描述。每对必须满足:
1. 两个场景都能唱出至少 2 首共同的歌(共享歌曲池)
2. 差异必须是「情感/情绪指向」的差异(时间阶段/关系状态/主动被动/释然遗憾),不是客观物件差异
3. 每个场景还有 1~2 首「专属歌」,情绪细节和另一张卡对不上
4. 有画面感和情绪共鸣,避免琐碎日常

直接输出 JSON 数组:[{"normal":"...","spy":"..."},...]`;

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
