import { useState, useEffect } from 'react';

interface PasscodeModalProps {
  open: boolean;
  onConfirm: (passcode: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export default function PasscodeModal({ open, onConfirm, onCancel, error }: PasscodeModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grape-900/40 px-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="card-in w-full max-w-sm rounded-xl3 bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-black">输入主持人口令</h3>
        <p className="mt-1 text-xs text-grape-800/60">
          AI 生成需要口令,防止别人乱刷。找组局的人要。
        </p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={12}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
          }}
          placeholder="6 位数字"
          className="mt-4 w-full rounded-xl2 border-2 border-grape-800/15 bg-cream-50 px-4 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-plum-500"
        />
        {error && <p className="mt-2 text-center text-xs font-semibold text-plum-500">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-grape-800/15 px-4 py-2.5 text-sm font-semibold text-grape-800/70"
          >
            取消
          </button>
          <button
            onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
            className="flex-1 rounded-full bg-plum-500 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition-transform active:scale-95 disabled:opacity-40"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
