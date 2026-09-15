/**
 * DoseGauge — WHO-ITU H.870 weekly-dose gauge (safety.md): 0–100% horizontal
 * gauge, teal fill, caution zone at 75%, over zone at 100%.
 */

import { GRADE_COLOR, AMBER, DANGER, INK, LINE, TEAL, TEXT } from '../theme';

export function DoseGauge({ percent, width = 240 }: { percent: number; width?: number | '100%' }) {
  const p = Math.min(100, Math.max(0, percent));
  // Fluid mode (`width="100%"`): render at a fixed internal geometry and let
  // the viewBox scale it to the container (mobile safety page, narrow phones).
  const fluid = width === '100%';
  const w = fluid ? 240 : width;
  const h = 12;
  const zoneColor = p >= 100 ? DANGER : p >= 75 ? AMBER : TEAL;
  return (
    <div style={fluid ? { maxWidth: 280 } : undefined}>
      <svg
        width={fluid ? '100%' : w}
        height={fluid ? undefined : h + 18}
        viewBox={fluid ? `0 0 ${w} ${h + 18}` : undefined}
        preserveAspectRatio={fluid ? 'xMidYMid meet' : undefined}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
      >
        <rect x={0} y={0} width={w} height={h} fill={INK[4]} stroke={LINE[1]} />
        {/* caution zone 75–100 */}
        <rect x={w * 0.75} y={0} width={w * 0.25} height={h} fill={`${AMBER}18`} />
        {/* over zone marker */}
        <line x1={w - 1} y1={0} x2={w - 1} y2={h} stroke={DANGER} strokeWidth={2} />
        {/* fill */}
        <rect x={0} y={0} width={(p / 100) * w} height={h} fill={zoneColor} opacity={0.85}>
          <animate attributeName="width" dur="0.3s" fill="freeze" />
        </rect>
        {/* ticks */}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={(t / 100) * w} y1={h} x2={(t / 100) * w} y2={h + 4} stroke={LINE[2]} />
            <text x={(t / 100) * w} y={h + 15} fontSize={9} fill={TEXT[3]} textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
              {t}%
            </text>
          </g>
        ))}
        <line x1={w * 0.75} y1={h} x2={w * 0.75} y2={h + 4} stroke={AMBER} />
      </svg>
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        <span className="t-readout-md" style={{ color: zoneColor }}>
          {p.toFixed(0)}
          <span className="text-3" style={{ fontSize: '0.85em' }}>
            %
          </span>
        </span>
        <span className="t-label" style={{ color: p >= 100 ? GRADE_COLOR.D : 'var(--text-3)' }}>
          {p >= 100 ? 'OVER WEEKLY ALLOWANCE' : p >= 75 ? 'CAUTION ZONE' : 'OF H.870 WEEKLY ALLOWANCE'}
        </span>
      </div>
    </div>
  );
}
