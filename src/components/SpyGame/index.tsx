import { useState, useMemo } from 'react';
import SceneCards from './SceneCards';
import PasscodeModal from './PasscodeModal';
import { generatePairByAI } from '../../lib/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { ScenePair } from '../../types';
import presetPairs from '../../data/preset-pairs.json';

interface HistoryItem {
  id: number;
  pair: ScenePair;
  source: 'preset' | 'ai';
  time: string;
}

interface SpyGameProps {
  onToast: (text: string, kind?: 'success' | 'error' | 'info') => void;
}

const PASSCODE_KEY = 'spy_passcode_v1';

export default function SpyGame({ onToast }: SpyGameProps) {
  const [theme, setTheme] = useState('');
  const [currentPair, setCurrentPair] = useState<ScenePair | null>(null);
  const [currentSource, setCurrentSource] = useState<'preset' | 'ai'>('preset');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [passcodeModal, setPasscodeModal] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcode, setPasscode] = useLocalStorage<string>(PASSCODE_KEY, '');

  const typedPreset = presetPairs as ScenePair[];

  const availableThemes = useMemo(() => {
    const s = new Set<string>();
    for (const p of typedPreset) if (p.theme) s.add(p.theme);
    return [...s];
  }, [typedPreset]);

  const pushHistory = (pair: ScenePair, source: 'preset' | 'ai') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setHistory((prev) => [{ id: Date.now(), pair, source, time }, ...prev].slice(0, 20));
  };

  /* 题库抽一对 */
  const handleDrawFromPreset = () => {
    const pool = theme.trim()
      ? typedPreset.filter((p) => p.theme?.includes(theme.trim()))
      : typedPreset;
    if (pool.length === 0) {
      onToast(`题库中没有「${theme.trim()}」主题,换个关键词试试`, 'error');
      return;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const pair = pool[idx];
    setCurrentPair(pair);
    setCurrentSource('preset');
    pushHistory(pair, 'preset');
  };

  /* AI 生成一对 */
  const handleGenerateByAI = async (code: string) => {
    setAiLoading(true);
    setPasscodeError(null);
    const res = await generatePairByAI({ theme: theme.trim() || undefined, passcode: code });
    setAiLoading(false);

    if (!res.ok) {
      if (res.error === 'passcode_incorrect') {
        setPasscodeError('口令不对,再试一次');
        setPasscode(''); // 清空
        return;
      }
      if (res.error === 'rate_limited') {
        onToast('请求太频繁,歇一会儿再试', 'error');
        setPasscodeModal(false);
        return;
      }
      onToast('AI 走神了,从题库给你抽一对兜底', 'error');
      setPasscodeModal(false);
      handleDrawFromPreset();
      return;
    }

    const pair: ScenePair = {
      theme: theme.trim() || '随机',
      normal: res.normal!,
      spy: res.spy!,
    };
    setCurrentPair(pair);
    setCurrentSource('ai');
    pushHistory(pair, 'ai');
    setPasscodeModal(false);
    setPasscode(code); // 保存口令下次用
    onToast('AI 已生成新场景', 'success');
  };

  const handleAIButtonClick = () => {
    if (passcode) {
      handleGenerateByAI(passcode);
    } else {
      setPasscodeModal(true);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 pb-16">
      {/* Logo */}
      <div className="flex items-center justify-between pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-plum-500 px-4 py-1.5 text-sm font-bold text-white shadow-pop">
          <span className="text-base">🕵️</span>
          <span>谁是卧底</span>
        </div>
        <div className="text-2xl">🎭</div>
      </div>

      {/* 大标题 */}
      <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight">
        描述要够像,
        <br />
        <span className="text-plum-500">
          <span className="underline-scribble">才能活到最后</span>。
        </span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-grape-800/70">
        拿到一个场景,用一首歌唱出来。两张很像的卡,卧底那张只有一个细节不一样——但卧底自己,也不知道自己是卧底。
      </p>

      {/* 生成面板 */}
      <div className="mt-8 rounded-xl3 bg-white p-5 shadow-soft">
        <label className="block text-xs font-bold uppercase tracking-widest text-grape-800/60">
          想要的主题(可选)
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder={`例如:${availableThemes.slice(0, 3).join(' / ')}`}
          maxLength={12}
          className="mt-2 w-full rounded-xl2 border-2 border-grape-800/15 bg-cream-50 px-4 py-3 text-sm font-semibold outline-none focus:border-plum-500"
        />

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            onClick={handleDrawFromPreset}
            disabled={aiLoading}
            className="w-full rounded-full bg-plum-500 px-4 py-3.5 text-base font-black text-white shadow-pop transition-transform active:scale-95 disabled:opacity-50"
          >
            🎲 从题库抽一对
          </button>
          <button
            onClick={handleAIButtonClick}
            disabled={aiLoading}
            className="w-full rounded-full border-2 border-grape-800 bg-white px-4 py-3 text-sm font-bold text-grape-800 transition-transform active:scale-95 disabled:opacity-50"
          >
            {aiLoading ? (
              <span className="dot-pulse">
                AI 正在想题<span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            ) : (
              <>✨ AI 现场生成一对</>
            )}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-grape-800/50">
          题库 {typedPreset.length} 对 · AI 生成需要主持人口令
        </p>
      </div>

      {/* 结果卡 */}
      {currentPair && (
        <SceneCards pair={currentPair} source={currentSource} onToast={onToast} />
      )}

      {/* 历史 */}
      <div className="mt-8 rounded-xl3 bg-white p-5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-black">已生成场景</h2>
          <span className="text-xs font-bold text-grape-800/40">今晚 / HISTORY</span>
        </div>
        {history.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-grape-800/10 py-10 text-center">
            <div className="text-3xl">🎲</div>
            <p className="mt-2 text-xs text-grape-800/50">还没出过题,点上面按钮抽一对</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-xl2 bg-cream-50 px-4 py-3 text-xs leading-relaxed"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-plum-500">
                    {h.source === 'ai' ? '✨ AI' : '🎲 题库'} · {h.pair.theme || '随机'}
                  </span>
                  <span className="text-grape-800/40">{h.time}</span>
                </div>
                <div className="mt-1.5 space-y-0.5 text-grape-800/80">
                  <div>
                    <span className="font-semibold">A:</span> {h.pair.normal}
                  </div>
                  <div>
                    <span className="font-semibold">B:</span> {h.pair.spy}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 底部标签 */}
      <div className="mt-6 rounded-xl3 bg-sunny px-5 py-4 shadow-soft">
        <div className="text-xs font-bold text-grape-800/60">今晚可能会用到</div>
        <div className="mt-1 text-sm font-black text-grape-900">
          {availableThemes.slice(0, 3).join(' · ') || '失恋 · 暗恋 · 深夜 emo'}
        </div>
      </div>

      <PasscodeModal
        open={passcodeModal}
        onConfirm={handleGenerateByAI}
        onCancel={() => {
          setPasscodeModal(false);
          setPasscodeError(null);
        }}
        error={passcodeError}
      />
    </div>
  );
}
