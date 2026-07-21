import { useState } from 'react';
import SpinWheelGame from './components/SpinWheelGame';
import SpyGame from './components/SpyGame';
import { useToast } from './hooks/useToast';
import type { GameTab } from './types';

export default function App() {
  const [tab, setTab] = useState<GameTab>('spy');
  const { toasts, push } = useToast();

  return (
    <div className="min-h-screen bg-cream-100">
      {/* 顶部 tab */}
      <div className="sticky top-0 z-40 border-b border-grape-800/5 bg-cream-100/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 px-5 py-3">
          <TabButton active={tab === 'spin'} onClick={() => setTab('spin')}>
            🎤 唱个答案
          </TabButton>
          <TabButton active={tab === 'spy'} onClick={() => setTab('spy')}>
            🕵️ 谁是卧底
          </TabButton>
        </div>
      </div>

      {/* 内容 */}
      {tab === 'spin' ? <SpinWheelGame /> : <SpyGame onToast={push} />}

      {/* Toast 容器 */}
      <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto rounded-full px-5 py-2.5 text-sm font-semibold shadow-pop ${
              t.kind === 'success'
                ? 'bg-grape-800 text-white'
                : t.kind === 'error'
                  ? 'bg-plum-500 text-white'
                  : 'bg-white text-grape-800'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
        active
          ? 'bg-grape-800 text-white shadow-soft'
          : 'text-grape-800/60 hover:text-grape-800'
      }`}
    >
      {children}
    </button>
  );
}
