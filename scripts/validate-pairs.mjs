/**
 * 校验 src/data/preset-pairs.json 的格式与质量
 * 用法: node scripts/validate-pairs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'src', 'data', 'preset-pairs.json');

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

const raw = fs.readFileSync(FILE, 'utf-8');
const pairs = JSON.parse(raw);
if (!Array.isArray(pairs)) {
  console.error('不是数组');
  process.exit(1);
}

let bad = 0;
let tooSimilar = 0;
let tooDiff = 0;
const seen = new Set();
const themeCount = {};
const sims = [];

for (const p of pairs) {
  const key = `${p.normal}||${p.spy}`;
  if (seen.has(key)) bad++;
  seen.add(key);
  const sim = similarity(p.normal, p.spy);
  sims.push(sim);
  if (sim < 0.55) tooDiff++;
  if (sim > 0.95) tooSimilar++;
  themeCount[p.theme || '未分类'] = (themeCount[p.theme || '未分类'] || 0) + 1;
}

sims.sort((a, b) => a - b);
const avg = sims.reduce((s, x) => s + x, 0) / sims.length;
const median = sims[Math.floor(sims.length / 2)];

console.log(`总数: ${pairs.length}`);
console.log(`重复: ${bad}`);
console.log(`相似度 < 0.55: ${tooDiff}`);
console.log(`相似度 > 0.95: ${tooSimilar}`);
console.log(`平均相似度: ${avg.toFixed(3)},中位数: ${median.toFixed(3)}`);
console.log('\n主题分布:');
for (const [t, c] of Object.entries(themeCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${c}`);
}
