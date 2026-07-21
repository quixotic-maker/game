import type { ScenePair } from '../../types';
import { copyText, formatSceneForCopy } from '../../lib/copy';

interface SceneCardsProps {
  pair: ScenePair;
  source: 'preset' | 'ai';
  onToast: (text: string, kind?: 'success' | 'error') => void;
}

export default function SceneCards({ pair, source, onToast }: SceneCardsProps) {
  const handleCopy = async (label: 'A' | 'B') => {
    const scene = label === 'A' ? pair.normal : pair.spy;
    const text = formatSceneForCopy(label, scene);
    const ok = await copyText(text);
    if (ok) {
      onToast(`场景 ${label} 已复制,快发给玩家`, 'success');
    } else {
      onToast('复制失败,请长按文本手动复制', 'error');
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-grape-800/60">
          本轮场景 {pair.theme ? `· ${pair.theme}` : ''}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            source === 'ai' ? 'bg-plum-500/10 text-plum-500' : 'bg-grape-800/5 text-grape-800/60'
          }`}
        >
          {source === 'ai' ? 'AI 生成' : '题库'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['A', 'B'] as const).map((label) => {
          const scene = label === 'A' ? pair.normal : pair.spy;
          return (
            <div
              key={label}
              className="card-in rounded-xl3 border-2 border-grape-800 bg-white p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-plum-500 px-3 py-1 text-xs font-black text-white">
                  场景 {label}
                </span>
              </div>
              <p className="mt-4 min-h-[3.5rem] text-base font-semibold leading-relaxed text-grape-900">
                {scene}
              </p>
              <button
                onClick={() => handleCopy(label)}
                className="mt-4 w-full rounded-full bg-grape-800 px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-95"
              >
                📋 复制场景 {label}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl2 bg-sunny/40 px-4 py-3 text-xs leading-relaxed text-grape-800">
        💡 <span className="font-semibold">主持人记住哪张是卧底词</span>,复制后私发给玩家。
        每人用一首歌唱出自己的场景,卧底往往唱到最后才发现拿错了词。
      </div>
    </div>
  );
}
