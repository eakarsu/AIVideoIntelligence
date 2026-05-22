// VIZ 2 — Scene / object detection heatmap
import React, { useEffect, useState } from 'react';

function getToken() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('vigilance_token')) || '';
}

function heatColor(v, max) {
  if (max <= 0) return 'rgba(15,23,42,0.4)';
  const t = Math.min(1, v / max);
  // Cool → warm gradient (blue → yellow → red)
  const r = Math.round(255 * Math.min(1, t * 2));
  const g = Math.round(255 * Math.min(1, (1 - Math.abs(t - 0.5) * 2) + 0.2));
  const b = Math.round(255 * Math.max(0, 1 - t * 2));
  return `rgba(${r},${g},${b},0.85)`;
}

export default function SceneHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cls, setCls] = useState('all');

  const load = async (c) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/custom-views/scene-heatmap?class=${encodeURIComponent(c)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'request failed');
      setData(j);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(cls); /* eslint-disable-next-line */ }, []);

  const grid = (data && data.grid) || [];
  const cellW = 28, cellH = 28;

  return (
    <div data-testid="viz-scene-heatmap" style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
      padding: 16, marginBottom: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16 }}>
          VIZ · Scene / Object Heatmap
        </h3>
        <select value={cls} onChange={(e) => { setCls(e.target.value); load(e.target.value); }}
          style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
            borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 'auto' }}>
          {['all', 'person', 'vehicle', 'package', 'weapon'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <div style={{ color: '#fecaca', fontSize: 13, marginBottom: 8 }}>Error: {error}</div>}
      {loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>}

      {data && (
        <>
          <div style={{ background: '#0f172a', padding: 6, borderRadius: 6, overflowX: 'auto' }}>
            <svg width={data.cols * cellW} height={data.rows * cellH}
              style={{ display: 'block', minWidth: data.cols * cellW }}>
              {grid.map((row, y) => row.map((v, x) => (
                <rect key={`${x}-${y}`} x={x * cellW} y={y * cellH}
                  width={cellW - 1} height={cellH - 1}
                  fill={heatColor(v, data.max_density)}>
                  <title>{`(${x},${y}) ${v}`}</title>
                </rect>
              )))}
              {(data.hotspots || []).map((h, i) => (
                <g key={i}>
                  <circle cx={h.x * cellW + cellW / 2} cy={h.y * cellH + cellH / 2}
                    r={10} fill="none" stroke="#fff" strokeWidth={2} />
                  <text x={h.x * cellW + cellW / 2 + 14} y={h.y * cellH + cellH / 2 + 4}
                    fill="#fff" fontSize="11">{h.label}</text>
                </g>
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
            <span>Max density: <b style={{ color: '#fff' }}>{data.max_density}</b></span>
            <span>Grid: {data.cols}×{data.rows}</span>
            <span style={{ marginLeft: 'auto' }}>Filter: {data.object_class}</span>
          </div>
        </>
      )}
    </div>
  );
}
