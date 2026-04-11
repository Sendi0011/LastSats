import { Heart } from 'lucide-react';
import type { VaultStatus } from '@/types/vault';
import { statusColor } from '@/lib/vault';

interface HeartbeatRingProps {
  progress: number;
  status: VaultStatus;
  size?: number;
  strokeWidth?: number;
}

export default function HeartbeatRing({ progress, status, size = 72, strokeWidth = 5 }: HeartbeatRingProps) {
  const color = statusColor(status);
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  const isUrgent = status === 'warning' || status === 'grace';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Heart size={size * 0.25} color={color} fill={isUrgent ? color : 'none'} />
      </div>
    </div>
  );
}
