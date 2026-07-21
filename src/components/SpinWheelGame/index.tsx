import { useState } from 'react';
import Wheel from './Wheel';
import type { WheelTopic } from '../../types';

const DEFAULT_TOPICS: WheelTopic[] = [
  { id: 'friend', label: '友情暴击', color: '#F97316', emoji: '🧡', prompt: '唱一首献给同桌/室友/老朋友的歌' },
  { id: 'brain', label: '离谱脑洞', color: '#A855F7', emoji: '🧠', prompt: '唱一首歌词里带「飞」的歌' },
  { id: 'heart', label: '心动暗号', color: '#E6336B', emoji: '💗', prompt: '唱一首想分享给某个人的歌' },
  { id: 'youth', label: '青春回忆', color: '#10B981', emoji: '🌿', prompt: '唱一首学生时代单曲循环的歌' },
  { id: 'emo', label: '深夜 emo', color: '#3B82F6', emoji: '🌙', prompt: '唱一首适合深夜一个人听的歌' },
  { id: 'soul', label: '灵魂拷问', color: '#EAB308', emoji: '🔥', prompt: '唱一首能代表你现在状态的歌' },
  { id: 'child', label: '童年杀', color: '#EC4899', emoji: '🎈', prompt: '唱一首小时候放学路上会哼的歌' },
];

interface HistoryItem {
  id: number;
  topic: WheelTopic;
  time: string;
}

export default function SpinWheelGame() {
  const [round, setRound] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelTopic | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleSpinStart = () => {
    setSpinning(true);
    setResult(null);
  };

  const handleSpinEnd = (topic: WheelTopic) => {
    setSpinning(false);
    setResult(topic);
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setHistory((prev) => [{ id: Date.now(), topic, time }, ...prev].slice(0, 30));
    setRound((r) => r + 1);
  };

  const handleReset = () => {
    setRound(1);
    setResult(null);
    setHistory([]);
  };

  return (
    <div className="mx-auto max-w-md px-5 pb-16">
      {/* Logo */}
      <div className="flex items-center justify-between pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-plum-500 px-4 py-1.5 text-sm font-bold text-white shadow-pop">
          <span className="text-base">🎤</span>
          <span>唱个答案</span>
        </div>
        <div className="text-2xl">🎵</div>
      </div>

      {/* 大标题 */}
      <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight">
        别点歌了,
        <br />
        <span className="text-plum-500">
          <span className="underline-scribble">唱个答案</span>。
        </span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-grape-800/70">
        转到什么题,就用一首歌回答。没有标准答案,唱出来就是你的答案。
      </p>

      {/* 转盘 */}
      <div className="mt-8">
        <Wheel
          topics={DEFAULT_TOPICS}
          round={round}
          spinning={spinning}
          onSpinStart={handleSpinStart}
          onSpinEnd={handleSpinEnd}
        />
      </div>

      <p className="mt-4 text-center text-xs text-grape-800/60">
        点击中间按钮,交给命运点歌
      </p>

      {/* 按钮组 */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 rounded-full border-2 border-grape-800 bg-white px-4 py-2.5 text-sm font-semibold text-grape-800 shadow-soft transition-transform active:scale-95"
        >
          ↻ 换一组题
        </button>
        <button
          disabled
          title="即将上线"
          className="flex-1 cursor-not-allowed rounded-full border-2 border-dashed border-grape-800/30 bg-white/50 px-4 py-2.5 text-sm font-semibold text-grape-800/40"
        >
          + 自定义题
        </button>
      </div>

      {/* 结果弹窗(内联) */}
      {result && (
        <div className="card-in mt-6 rounded-xl3 border-2 border-grape-800 bg-white p-5 shadow-soft">
          <div className="text-xs font-bold uppercase tracking-widest text-plum-500">
            第 {round - 1} 轮抽中
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl">{result.emoji}</span>
            <span className="text-xl font-black">{result.label}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-grape-800/80">{result.prompt}</p>
        </div>
      )}

      {/* 玩法说明 */}
      <div className="mt-8 rounded-xl3 bg-white p-5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-black">玩法</h2>
          <span className="text-xs font-bold text-plum-500">/ 01</span>
        </div>
        <p className="mt-1 text-sm text-grape-800/70">一首歌,就是一个回答</p>
        <div className="mt-4 space-y-3">
          {[
            { icon: '转', text: '转动转盘,抽一个命题' },
            { icon: '想', text: '每个人想一首最贴题的歌' },
            { icon: '唱', text: '轮流唱,顺便讲讲为什么' },
          ].map((s) => (
            <div key={s.icon} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-plum-500 text-sm font-bold text-white">
                {s.icon}
              </div>
              <span className="text-sm text-grape-800">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 历史 */}
      <div className="mt-6 rounded-xl3 bg-white p-5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-black">已抽命题</h2>
          <span className="text-xs font-bold text-grape-800/40">今晚 / HISTORY</span>
        </div>
        {history.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-grape-800/10 py-10 text-center">
            <div className="text-3xl">🎼</div>
            <p className="mt-2 text-xs text-grape-800/50">今晚的故事还没开始</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-xl2 bg-cream-50 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span>{h.topic.emoji}</span>
                  <span className="text-sm font-semibold">{h.topic.label}</span>
                </div>
                <span className="text-xs text-grape-800/40">{h.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 底部标签 */}
      <div className="mt-6 rounded-xl3 bg-sunny px-5 py-4 shadow-soft">
        <div className="text-xs font-bold text-grape-800/60">今晚可能会唱到</div>
        <div className="mt-1 text-sm font-black text-grape-900">
          友情暴击 · 离谱脑洞 · 心动暗号
        </div>
      </div>
    </div>
  );
}
