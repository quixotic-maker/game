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
        两张卡能唱同一批歌,但情绪指向有细微差别——卧底往往从选歌情绪里露馅。
      </div>
    </div>
  );
}
