# 唱个答案 · 谁是卧底

一个 KTV / 聚会场景的小游戏 H5,包含两个模块:

| 模块 | 玩法 |
|---|---|
| **🎤 唱个答案** | 转盘抽命题,每个人想一首最贴题的歌来回答 |
| **🕵️ 谁是卧底** | AI/题库生成一对相似场景(平民词 + 卧底词),主持人复制后私发,卧底自己都不知道自己是卧底 |

## 视觉风格

奶油白底 + 品红点缀 + 大圆角卡片 + 柔和阴影,移动端 H5 优先,桌面端自动居中。

## 快速开始(本地开发)

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`,填入你的 OpenAI 兼容协议配置:

```bash
cp .env.example .env.local
```

```env
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=deepseek-chat
PASSCODE=882156   # 自定义,6 位数字
```

### 3. 启动前后端

```bash
# 终端 1:启动后端 API(端口 3001)
npm run dev:api

# 终端 2:启动前端(端口 5173)
npm run dev
```

打开 http://localhost:5173 即可。

## 「谁是卧底」玩法流程

1. 主持人进入页面,默认在「谁是卧底」tab
2. (可选)输入主题关键词,如「失恋」「毕业」「深夜 emo」
3. 点 **🎲 从题库抽一对**(本地 480+ 对精选场景,秒出)
4. 或点 **✨ AI 现场生成一对**(需输入口令,调 OpenAI 兼容协议生成新场景)
5. 屏幕出现两张场景卡(场景 A / 场景 B),**不标哪张是卧底词**
6. **主持人自己记住哪张是卧底词**,点 📋 复制后私发给对应玩家
7. **每位玩家用一首歌唱出自己拿到的场景**,其他人通过歌猜词,投票选出卧底

> 💡 因为两张卡能唱同一批歌,卧底往往不会立刻暴露;但卧底选的歌在情绪上对不上他的词(比如他拿的是「笑着说再见」却唱了首《想你的夜》),就会被推理出来。

## 题库

`src/data/preset-pairs.json` 内置 **480+ 对**场景短句对(V3 情绪差异版),围绕 KTV 唱歌场景设计,覆盖 16 个情绪主题:

失恋 / 暗恋 / 表白 / 深夜 emo / 加班 / 毕业 / 想家 / 友情 / 青春 / 初恋 / 夏天 / 下雨天 / 旅行 / 酒后 / 重逢 / KTV 场景本身

每对场景都满足三个条件:
- **有歌可唱**:大众化情绪画面,能立刻联想到至少 2~3 首具体华语流行歌
- **共享歌曲池**:两个场景能唱同一批歌,卧底拿错词不会立刻暴露
- **情绪指向有细微差别**:虽然能唱同一首,但每个场景在情感/情绪上有「专属歌」,卧底从选歌情绪里露馅

差异必须是「情感/情绪指向」的差异,而不是「客观物件」的差异:

| 好的差异(情绪指向) | 坏的差异(客观物件) |
|---|---|
| 笑着说了再见 vs 哭着说了再见 | 围巾 vs 毛衣 |
| 最后一次并肩散步 vs 第一次并肩散步 | 便利店 vs 地铁口 |
| 发现彼此都还单身 vs 发现对方已经结婚了 | 校服 vs 书包 |

示例:

| 场景 A | 场景 B | 共同能唱 | A 偏 | B 偏 |
|---|---|---|---|---|
| 分手那天在车站最后一次拥抱,笑着说了再见 | 分手那天在车站最后一次拥抱,哭着说了再见 | 《体面》《分手快乐》 | 《成全》《祝你幸福》(释然) | 《想你的夜》《我怀念的》(不甘) |
| 多年后在同学会上重逢了初恋,发现彼此都还单身 | 多年后在同学会上重逢了初恋,发现对方已经结婚了 | 《好久不见》《十年》 | 《勇气》《再一次》(重燃) | 《成全》《嘉宾》(祝福) |
| 高中时偷偷把情书夹进喜欢的女生的课本里 | 高中时偷偷把喜欢的女生的情书藏进自己书包里 | 《小幸运》《晴天》 | 《勇气》《告白气球》(主动) | 《说谎》《可惜不是你》(珍藏) |

### 扩充题库

如果想生成更多场景对(比如扩到 1000+),运行:

```bash
node scripts/generate-preset-pairs.mjs --per 50 --resume
```

`--per 50` 表示每个主题 50 对,`--resume` 断点续传。生成完自动校验质量(长度、相似度、重复)。

## 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "feat: KTV games initial"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. 在 Vercel 导入项目

- 打开 https://vercel.com/new
- 选择刚推送的仓库
- Framework Preset:**Vite**(应该自动识别)
- Build Command:`npm run build`
- Output Directory:`dist`

### 3. 配置环境变量

在 Vercel 项目 Settings → Environment Variables 添加:

```
OPENAI_BASE_URL = https://api.deepseek.com/v1
OPENAI_API_KEY = sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL = deepseek-chat
PASSCODE = 882156
```

### 4. 部署

点 Deploy,等 1 分钟左右就好了。

Vercel 会自动:
- 把 `api/generate-pair.ts` 部署为 Serverless Function
- 把 `dist/` 部署为静态文件
- 通过 `vercel.json` 的 rewrite 规则把非 API 请求指回 `index.html`

## 项目结构

```
.
├── api/                          # 后端
│   ├── _shared.mjs               # 共享业务逻辑(口令校验/限流/AI 调用/二次校验)
│   ├── generate-pair.ts          # Vercel Serverless Function 入口
│   └── dev-server.mjs            # 本地开发 API 服务(等价于 Serverless)
├── scripts/
│   ├── generate-preset-pairs.mjs # AI 批量生成题库脚本
│   └── validate-pairs.mjs        # 题库质量校验
├── src/
│   ├── components/
│   │   ├── SpinWheelGame/        # 唱个答案(转盘)
│   │   └── SpyGame/              # 谁是卧底
│   ├── data/preset-pairs.json    # 638 对预置题库
│   ├── hooks/                    # useLocalStorage / useToast
│   ├── lib/                      # copy / api 工具
│   └── types/
├── .env.local                    # 本地环境变量(gitignore)
├── .env.example                  # 环境变量模板
├── vercel.json                   # Vercel 配置
└── vite.config.ts
```

## 关键技术细节

### 后端 `/api/generate-pair`

- **口令保护**:请求体里的 `passcode` 必须等于环境变量 `PASSCODE`
- **限流**:同一 IP 1 分钟内最多 5 次
- **二次校验**:AI 返回后做格式 + 长度 + 相似度校验,不合格返回 422 让前端兜底
- **保密**:API Key 只存在服务端,绝不下发到前端

### 前端复制降级

```ts
navigator.clipboard.writeText() // 现代 API(HTTPS/localhost)
  ↓ 失败时
document.execCommand('copy')    // 降级方案(老浏览器/HTTP)
```

### 转盘动画

- 扇区用 SVG `<path>` 画
- 转动用 CSS `transform: rotate()` + `transition: cubic-bezier(0.17, 0.67, 0.12, 0.99)` 缓动
- 至少转 5 整圈 + 精准落点(jitter ±20% 扇区宽度)

## 常见问题

**Q: 本地开发点「AI 现场生成」提示 fetch 失败?**
A: 确认 `npm run dev:api` 已经启动,Vite 通过 `vite.config.ts` 里的 proxy 把 `/api/*` 转发到 3001 端口。

**Q: 部署到 Vercel 后 AI 生成返回 401?**
A: 检查 Vercel 项目环境变量是否配置了 `PASSCODE`,且前端输入的口令是否一致。

**Q: 部署后 AI 生成返回 ai_failed?**
A: 检查 `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` 是否正确,以及 API Key 是否有余额。可以在 Vercel Logs 看具体错误。

**Q: 题库为什么叫「KTV 唱歌版」?**
A: 玩家拿到场景后要用一首歌唱出来,而不是用话描述。所以场景必须满足三个条件:①能唱出歌(大众化情绪画面) ②两个场景共享歌曲池(能唱同一首) ③情绪指向有细微差别(从选歌情绪里露馅)。差异必须是情感/情绪指向(时间阶段/关系状态/主动被动/释然遗憾),而不是客观物件(便利店 vs 地铁口)——物件差异唱什么歌都一样,藏不住卧底也推不出卧底。

**Q: 题库数量为什么不是整数?**
A: 生成脚本会过滤掉质量不佳的对(相似度过低/过高、长度不够、重复),实际接受率 70~85%。如果想更多,改 `--per` 参数重跑即可。

## License

MIT
