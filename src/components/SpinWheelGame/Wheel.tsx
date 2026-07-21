import { useMemo, useRef, useState } from 'react';
import type { WheelTopic } from '../../types';

interface WheelProps {
  topics: WheelTopic[];
  round: number;
  spinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: (topic: WheelTopic) => void;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 4;

function polarToCartesian(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function sectorPath(startAngle: number, endAngle: number, r: number) {
  const start = polarToCartesian(startAngle, r);
  const end = polarToCartesian(endAngle, r);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function Wheel({ topics, round, spinning, onSpinStart, onSpinEnd }: WheelProps) {
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const anglePer = 360 / topics.length;

  const segments = useMemo(() => {
    return topics.map((t, i) => {
      const start = i * anglePer;
      const end = (i + 1) * anglePer;
      const mid = start + anglePer / 2;
      const labelPos = polarToCartesian(mid, RADIUS * 0.62);
      const emojiPos = polarToCartesian(mid, RADIUS * 0.82);
      return { topic: t, start, end, mid, labelPos, emojiPos };
    });
  }, [topics, anglePer]);

  const handleSpin = () => {
    if (spinning) return;
    onSpinStart();
    // 随机选扇区
    const idx = Math.floor(Math.random() * topics.length);
    // polarToCartesian 中 angleDeg=0 对应正上方(代码坐标系),指针就在 0°
    // 目标:让选中扇区的中心停在 0°(顶部指针)
    const targetSegmentAngle = idx * anglePer + anglePer / 2;
    const jitter = (Math.random() - 0.5) * (anglePer * 0.4); // ±20% 抖动
    // 旋转 R 度后扇区中心位置 = targetSegmentAngle + R,要让其等于 0°(mod 360)
    // 即 R ≡ -targetSegmentAngle (mod 360)
    const baseTarget = -targetSegmentAngle + jitter;
    // 至少多转 5 整圈,且保证单调递增
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const diff = ((baseTarget - currentMod) % 360 + 360) % 360;
    const finalRotation = rotationRef.current + 360 * 5 + diff;
    rotationRef.current = finalRotation;
    setRotation(finalRotation);
  };

  const handleTransitionEnd = () => {
    if (!spinning) return;
    // 指针在代码坐标系的 0°(正上方),求旋转后哪个扇区中心位于 0°
    const normalizedRot = ((rotationRef.current % 360) + 360) % 360;
    // 原角度 = 0 - normalizedRot (mod 360)
    const pointedAngle = (((-normalizedRot) % 360) + 360) % 360;
    const idx = Math.floor(pointedAngle / anglePer) % topics.length;
    onSpinEnd(topics[idx]);
  };

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* 第 N 轮 */}
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        第 {round} 轮
      </div>
      {/* 指针 */}
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
        <div
          className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-white"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        />
      </div>
      {/* 转盘本体 */}
      <div className="relative overflow-hidden rounded-full bg-grape-800 p-2 shadow-soft">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="wheel-spin block h-auto w-full"
          style={{ transform: `rotate(${rotation}deg)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {segments.map(({ topic, start, end, labelPos, emojiPos, mid }) => (
            <g key={topic.id}>
              <path d={sectorPath(start, end, RADIUS)} fill={topic.color} stroke="#1F142E" strokeWidth="2" />
              <text
                x={emojiPos.x}
                y={emojiPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="18"
                transform={`rotate(${mid} ${emojiPos.x} ${emojiPos.y})`}
              >
                {topic.emoji}
              </text>
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="600"
                fill="#fff"
                transform={`rotate(${mid} ${labelPos.x} ${labelPos.y})`}
              >
                {topic.label}
              </text>
            </g>
          ))}
          {/* 中心圆 */}
          <circle cx={CENTER} cy={CENTER} r={52} fill="#fff" stroke="#1F142E" strokeWidth="3" />
        </svg>
        {/* 中心按钮(HTML 覆盖,方便点击) */}
        <button
          onClick={handleSpin}
          disabled={spinning}
          className="absolute left-1/2 top-1/2 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white transition-transform active:scale-95 disabled:opacity-80"
        >
          <span className="text-xl font-black text-plum-500">{spinning ? '转中' : '开转'}</span>
          <span className="text-[10px] font-semibold tracking-widest text-grape-800">SPIN</span>
        </button>
      </div>
    </div>
  );
}
