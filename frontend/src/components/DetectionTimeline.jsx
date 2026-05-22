// VIZ 1 — Detection events timeline (sparkline + stacked bars)
import React, { useEffect, useState } from 'react';

function getToken() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('vigilance_token')) || '';
}

const COLORS = {
  person:  '#3b82f6',
  vehicle: '#22c55e',
  package: '#f59e0b',
  weapon:  '#ef4444',
  animal:  '#a855f7',
};

export default function DetectionTimeline() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minutes, setMinutes] = useState(60);

  const load = async (m) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/custom-views/detection-timeline?minutes=${m}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'request failed');
      setData(j);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(minutes); /* eslint-disable-next-line */ }, []);

  const buckets = (data && data.buckets) || [];
  const maxTotal = buckets.reduce((m, b) => Math.max(m, b.total), 0) || 1;

  return (
    <div data-testid="viz-detection-timeline" style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
      padding: 16, marginBottom: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16 }}>
          VIZ · Detection Events Timeline
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {[15, 60, 240].map(m => (
            <button key={m} onClick={() => { setMinutes(m); load(m); }}
              style={{
                background: minutes === m ? '#3b82f6' : '#334155',
                color: '#fff', border: 'none', padding: '4px 10px',
                borderRadius: 6, cursor: 'pointer', fontSize: 12,
              }}>
              {m}m
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ color: '#fecaca', fontSize: 13, marginBottom: 8 }}>Error: {error}</div>}
      {loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.entries(data.summary || {}).map(([cls, n]) => (
              <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS[cls] || '#64748b', borderRadius: 2 }} />
                {cls}: <b style={{ color: '#fff' }}>{n}</b>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
              Total: <b style={{ color: '#fff' }}>{data.total_events}</b>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 1, background: '#0f172a', padding: 6, borderRadius: 6 }}>
            {buckets.map((b, i) => {
              const totalH = Math.max(2, (b.total / maxTotal) * 130);
              return (
                <div key={i} title={`${b.minute} · total ${b.total}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: totalH }}>
                  {Object.keys(COLORS).map(cls => {
                    const v = b[cls] || 0;
                    if (!v) return null;
                    const h = (v / b.total) * totalH;
                    return <div key={cls} style={{ height: h, background: COLORS[cls] }} />;
                  })}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            Window: {data.window_minutes}m · generated {new Date(data.generated_at).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}
